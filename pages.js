(function () {
  "use strict";

  // Footer year
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Mobile nav toggle
  const navToggle = document.getElementById("nav-toggle");
  const primaryNav = document.getElementById("primary-nav");
  if (navToggle && primaryNav) {
    navToggle.addEventListener("click", () => {
      const isOpen = primaryNav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      navToggle.classList.toggle("is-open", isOpen);
    });
  }

  // Contact form (no backend — local UI feedback only)
  const form = document.getElementById("contact-form");
  const status = document.getElementById("form-status");
  if (form && status) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const name = form.elements.namedItem("name");
      const email = form.elements.namedItem("email");
      const message = form.elements.namedItem("message");

      const nameVal = name && "value" in name ? String(name.value).trim() : "";
      const emailVal = email && "value" in email ? String(email.value).trim() : "";
      const messageVal =
        message && "value" in message ? String(message.value).trim() : "";

      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal);

      if (!nameVal || !emailOk || !messageVal) {
        status.hidden = false;
        status.className = "form-status is-error";
        status.textContent =
          "Please fill in your name, a valid email, and a message.";
        return;
      }

      status.hidden = false;
      status.className = "form-status is-success";
      status.textContent =
        "Thanks for reaching out! We've received your message and will get back to you soon.";
      form.reset();
    });
  }
})();
