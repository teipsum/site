// teipsum.com holding page: language switch and the contact form.
(function () {
  "use strict";

  var TEXT = {
    en: {
      headline: "Coming soon.",
      title: "Contact us",
      lede: "Leave a note and we will write back.",
      name: "Name",
      email: "Work email",
      organization: "Organization",
      message: "Message",
      consent: "Teipsum may keep these details to reply to me.",
      privacy: "We use them only to answer you. Ask us to delete them at any time, in your message or in a reply.",
      send: "Send message",
      sending: "Sending…",
      thanksTitle: "Thank you.",
      thanksBody: "Your message reached us. We will reply by email.",
      noscript: "This form needs JavaScript to send.",
      err: {
        name: "Enter your name.",
        email: "Enter an email address like name@company.com.",
        organization: "Enter your organization.",
        message: "Write a short message.",
        consent: "Tick the box so we can keep your details to reply.",
        fix: "Check the fields marked above.",
        busy: "Too many messages right now. Try again in a minute.",
        failed: "Your message did not send. Check your connection and try again."
      }
    },
    es: {
      headline: "Muy pronto.",
      title: "Contáctanos",
      lede: "Déjanos una nota y te responderemos.",
      name: "Nombre",
      email: "Correo de trabajo",
      organization: "Organización",
      message: "Mensaje",
      consent: "Teipsum puede guardar estos datos para responderme.",
      privacy: "Los usamos solo para responderte. Pídenos borrarlos cuando quieras, en tu mensaje o al respondernos.",
      send: "Enviar mensaje",
      sending: "Enviando…",
      thanksTitle: "Gracias.",
      thanksBody: "Recibimos tu mensaje. Te responderemos por correo.",
      noscript: "Este formulario necesita JavaScript para enviarse.",
      err: {
        name: "Escribe tu nombre.",
        email: "Escribe un correo como nombre@empresa.com.",
        organization: "Escribe el nombre de tu organización.",
        message: "Escribe un mensaje breve.",
        consent: "Marca la casilla para que podamos guardar tus datos y responderte.",
        fix: "Revisa los campos marcados arriba.",
        busy: "Demasiados mensajes en este momento. Inténtalo en un minuto.",
        failed: "Tu mensaje no se envió. Revisa tu conexión e inténtalo de nuevo."
      }
    }
  };

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var TIMEOUT_MS = 15000;
  var lang = "en";

  function pickLanguage() {
    var q = new URLSearchParams(window.location.search).get("lang");
    if (q === "es" || q === "en") return q;
    try {
      var saved = window.localStorage.getItem("teipsum-lang");
      if (saved === "es" || saved === "en") return saved;
    } catch (_) { /* storage blocked: fall through */ }
    var langs = navigator.languages || [navigator.language || "en"];
    for (var i = 0; i < langs.length; i++) {
      if (/^es\b/i.test(langs[i])) return "es";
      if (/^en\b/i.test(langs[i])) return "en";
    }
    return "en";
  }

  function applyLanguage(next) {
    lang = next;
    var t = TEXT[lang];
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (typeof t[key] === "string") el.textContent = t[key];
    });
    document.querySelectorAll(".lang button").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-lang") === lang));
    });
    // Re-word any error already on screen.
    document.querySelectorAll(".field__error:not([hidden])").forEach(function (el) {
      var key = el.getAttribute("data-key");
      if (key && t.err[key]) el.textContent = t.err[key];
    });
    var status = document.querySelector(".form .status");
    if (status && status.getAttribute("data-key")) {
      status.textContent = t.err[status.getAttribute("data-key")] || "";
    }
  }

  function setError(name, key) {
    var input = document.querySelector('[name="' + name + '"]');
    var box = document.getElementById("e-" + name);
    if (!input || !box) return;
    if (key) {
      input.setAttribute("aria-invalid", "true");
      box.setAttribute("data-key", key);
      box.textContent = TEXT[lang].err[key];
      box.hidden = false;
    } else {
      input.removeAttribute("aria-invalid");
      box.removeAttribute("data-key");
      box.textContent = "";
      box.hidden = true;
    }
  }

  function setStatus(key, tone) {
    var status = document.querySelector(".form .status");
    if (!status) return;
    if (key) {
      status.setAttribute("data-key", key);
      status.textContent = TEXT[lang].err[key];
    } else {
      status.removeAttribute("data-key");
      status.textContent = "";
    }
    if (tone) status.setAttribute("data-tone", tone); else status.removeAttribute("data-tone");
  }

  function validate(form) {
    var v = function (n) { return String(form.elements[n].value || "").trim(); };
    var checks = [
      ["name", v("name") ? null : "name"],
      ["email", EMAIL_RE.test(v("email")) ? null : "email"],
      ["organization", v("organization") ? null : "organization"],
      ["message", v("message") ? null : "message"],
      ["consent", form.elements.consent.checked ? null : "consent"]
    ];
    var first = null;
    checks.forEach(function (c) {
      setError(c[0], c[1]);
      if (c[1] && !first) first = form.elements[c[0]];
    });
    return first;
  }

  function init() {
    applyLanguage(pickLanguage());

    document.querySelectorAll(".lang button").forEach(function (b) {
      b.addEventListener("click", function () {
        var next = b.getAttribute("data-lang");
        applyLanguage(next);
        try { window.localStorage.setItem("teipsum-lang", next); } catch (_) { /* ignore */ }
      });
    });

    var form = document.getElementById("contact");
    if (!form) return;
    var endpoint = form.getAttribute("data-endpoint") || "";
    var message = form.elements.message;
    var counter = form.querySelector("[data-count]");
    var send = form.querySelector(".send");
    var thanks = document.querySelector(".thanks");
    var busy = false;

    message.addEventListener("input", function () {
      counter.textContent = String(message.value.length);
    });

    ["name", "email", "organization", "message"].forEach(function (n) {
      form.elements[n].addEventListener("input", function () {
        if (form.elements[n].getAttribute("aria-invalid") === "true") setError(n, null);
      });
    });
    form.elements.consent.addEventListener("change", function () { setError("consent", null); });

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (busy) return;
      setStatus(null);
      var firstBad = validate(form);
      if (firstBad) {
        setStatus("fix", "error");
        firstBad.focus();
        return;
      }

      var val = function (n) { return String(form.elements[n].value || "").trim(); };
      var payload = {
        email: val("email").toLowerCase(),
        name: val("name"),
        organization: val("organization"),
        role: "contact-form",
        size: "not-asked",
        firstUse: val("message"),
        consent: true,
        website: val("website")
      };

      busy = true;
      send.disabled = true;
      send.textContent = TEXT[lang].sending;

      var controller = typeof AbortController === "function" ? new AbortController() : null;
      var timer = controller ? window.setTimeout(function () { controller.abort(); }, TIMEOUT_MS) : null;

      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        mode: "cors",
        credentials: "omit",
        signal: controller ? controller.signal : undefined
      }).then(function (res) {
        if (res.ok) {
          form.hidden = true;
          thanks.hidden = false;
          thanks.focus();
          return null;
        }
        if (res.status === 429) { setStatus("busy", "error"); return null; }
        if (res.status === 400) {
          return res.json().catch(function () { return {}; }).then(function (body) {
            var field = body && body.field;
            var map = { firstUse: "message", name: "name", email: "email", organization: "organization", consent: "consent" };
            if (field && map[field]) {
              setError(map[field], map[field]);
              setStatus("fix", "error");
              form.elements[map[field]].focus();
            } else {
              setStatus("failed", "error");
            }
          });
        }
        setStatus("failed", "error");
        return null;
      }).catch(function () {
        setStatus("failed", "error");
      }).then(function () {
        if (timer) window.clearTimeout(timer);
        busy = false;
        send.disabled = false;
        send.textContent = TEXT[lang].send;
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
