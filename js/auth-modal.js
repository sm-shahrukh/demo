
(function () {
  "use strict";

  /* ---------------- shared snippets ---------------- */

  var INFO_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
    '<circle cx="12" cy="12" r="10" />' +
    '<line x1="12" y1="8" x2="12" y2="12" />' +
    '<line x1="12" y1="16" x2="12.01" y2="16" />' +
    "</svg>";

  var EYE_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
    '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />' +
    '<circle cx="12" cy="12" r="3" />' +
    "</svg>";

  /* pages.js reads the success copy off .auth-alert */
  function alertBlock(successMessage) {
    return (
      '<div class="auth-alert" data-success="' +
      successMessage +
      '">' +
      INFO_ICON +
      "<span></span></div>"
    );
  }

  function errorBlock() {
    return '<div class="field-error">' + INFO_ICON + "<span></span></div>";
  }

  var SOCIAL_ROWS =
    '<div class="social-auth">' +
    '<button type="button" class="social-btn">' +
    '<svg viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true">' +
    '<path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.12 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/>' +
    "</svg>Facebook</button>" +
    '<button type="button" class="social-btn">' +
    '<svg viewBox="0 0 24 24" aria-hidden="true">' +
    '<path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3.01h3.88c2.27-2.09 3.58-5.17 3.58-8.82z"/>' +
    '<path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3.01c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.1A12 12 0 0 0 12 24z"/>' +
    '<path fill="#FBBC05" d="M5.29 14.28A7.2 7.2 0 0 1 4.91 12c0-.79.14-1.56.38-2.28v-3.1H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.38l4.01-3.1z"/>' +
    '<path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.23 0 12 0A12 12 0 0 0 1.28 6.62l4.01 3.1C6.23 6.88 8.88 4.77 12 4.77z"/>' +
    "</svg>Google</button>" +
    "</div>";

  /* ---------------- the two forms ---------------- */

  function loginForm() {
    return (
      '<div class="auth-card">' +
      '<div class="auth-head"><h1 class="auth-title">LOGIN</h1></div>' +
      '<form data-auth-form novalidate>' +
      alertBlock("Signed in. Taking you to your bookings…") +
      /* Email */
      '<div class="form-field">' +
      '<label class="form-label" for="loginEmail">Email address<span class="req">*</span></label>' +
      '<input type="email" id="loginEmail" name="email" class="form-control-custom" placeholder="you@example.com" autocomplete="email" required data-msg-required="Please enter your email address." />' +
      errorBlock() +
      "</div>" +
      /* Password */
      '<div class="form-field">' +
      '<label class="form-label" for="loginPassword">Password<span class="req">*</span></label>' +
      '<div class="password-wrap">' +
      '<input type="password" id="loginPassword" name="password" class="form-control-custom" placeholder="Enter your password" autocomplete="current-password" required data-msg-required="Please enter your password." />' +
      '<button type="button" class="password-toggle" data-target="loginPassword" aria-label="Show password">' +
      EYE_ICON +
      "</button>" +
      "</div>" +
      errorBlock() +
      "</div>" +
      /* Remember + forgot */
      '<div class="form-check-row">' +
      '<label class="check-inline"><input type="checkbox" name="remember" checked /> Keep me signed in</label>' +
      '<a href="/contact-us.html" class="link-soft">Forgot password?</a>' +
      "</div>" +
      /* Submit */
      '<button type="submit" class="auth-submit">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
      '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />' +
      '<polyline points="10 17 15 12 10 7" />' +
      '<line x1="15" y1="12" x2="3" y2="12" />' +
      "</svg>Sign In</button>" +
      "</form>" +
      '<div class="auth-divider">or continue with</div>' +
      SOCIAL_ROWS +
      '<p class="auth-foot">Don\'t have an account? ' +
      '<button type="button" class="link-soft" data-auth-switch="signup">Create one free</button>' +
      "</p>" +
      "</div>"
    );
  }

  function signupForm() {
    return (
      '<div class="auth-card wide">' +
      '<div class="auth-head"><h1 class="auth-title">REGISTER</h1></div>' +
      '<form data-auth-form novalidate>' +
      alertBlock("Account created. Taking you to sign in…") +
      /* Name */
      '<div class="form-field">' +
      '<label class="form-label" for="suName">Full name<span class="req">*</span></label>' +
      '<input type="text" id="suName" name="name" class="form-control-custom" placeholder="Ahmed Shah" autocomplete="name" required data-minlength="3" data-msg-required="Please enter your full name." />' +
      errorBlock() +
      "</div>" +
      /* Email */
      '<div class="form-field">' +
      '<label class="form-label" for="suEmail">Email address<span class="req">*</span></label>' +
      '<input type="email" id="suEmail" name="email" class="form-control-custom" placeholder="you@gmail.com" autocomplete="email" required data-msg-required="Please enter your email address." />' +
      errorBlock() +
      "</div>" +
      /* Phone */
      '<div class="form-field">' +
      '<label class="form-label" for="suPhone">Phone number<span class="req">*</span></label>' +
      '<input type="tel" id="suPhone" name="phone" class="form-control-custom" placeholder="+92 300 1234567" autocomplete="tel" required data-msg-required="Please enter your phone number." />' +
      errorBlock() +
      "</div>" +
      /* Password */
      '<div class="form-field">' +
      '<label class="form-label" for="suPassword">Password<span class="req">*</span></label>' +
      '<div class="password-wrap">' +
      '<input type="password" id="suPassword" name="password" class="form-control-custom" placeholder="At least 8 characters" autocomplete="new-password" required data-strength data-minlength="8" data-msg-required="Please choose a password." />' +
      '<button type="button" class="password-toggle" data-target="suPassword" aria-label="Show password">' +
      EYE_ICON +
      "</button>" +
      "</div>" +
      '<div class="pw-meter"><div class="pw-meter-bar"><div class="pw-meter-fill" id="pwFill"></div></div><div class="pw-meter-text" id="pwText"></div></div>' +
      errorBlock() +
      "</div>" +
      /* Confirm password */
      '<div class="form-field">' +
      '<label class="form-label" for="suConfirm">Confirm password<span class="req">*</span></label>' +
      '<div class="password-wrap">' +
      '<input type="password" id="suConfirm" name="confirm" class="form-control-custom" placeholder="Re-enter your password" autocomplete="new-password" required data-require-match="suPassword" data-msg-required="Please confirm your password." />' +
      '<button type="button" class="password-toggle" data-target="suConfirm" aria-label="Show password">' +
      EYE_ICON +
      "</button>" +
      "</div>" +
      errorBlock() +
      "</div>" +
      /* Terms */
      '<div class="form-field">' +
      '<label class="terms-check">' +
      '<input type="checkbox" name="terms" required />' +
      "<span>I agree to the <a href=\"/contact-us.html\">Terms of Service</a> and <a href=\"/contact-us.html\">Privacy Policy</a>, and consent to Smart Moves contacting me about my bookings.</span>" +
      "</label>" +
      errorBlock() +
      "</div>" +
      /* Submit */
      '<button type="submit" class="auth-submit">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
      '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />' +
      '<circle cx="9" cy="7" r="4" />' +
      '<path d="M19 8v6M22 11h-6" />' +
      "</svg>Create Account</button>" +
      "</form>" +
      '<div class="auth-divider">or sign up with</div>' +
      SOCIAL_ROWS +
      '<p class="auth-foot">Already have an account? ' +
      '<button type="button" class="link-soft" data-auth-switch="login">Sign in instead</button>' +
      "</p>" +
      "</div>"
    );
  }

  var FORMS = { login: loginForm, signup: signupForm };

  function setFieldState(input, message) {
    var wrap = input.closest(".form-field");
    if (!wrap) return !message;
    var error = wrap.querySelector(".field-error span");
    if (message) {
      input.classList.add("is-invalid");
      input.classList.remove("is-valid");
      if (error) error.textContent = message;
      var shown = wrap.querySelector(".field-error");
      if (shown) shown.classList.add("show");
      return false;
    }
    input.classList.remove("is-invalid");
    if (input.value.trim()) input.classList.add("is-valid");
    var hidden = wrap.querySelector(".field-error");
    if (hidden) hidden.classList.remove("show");
    return true;
  }

  function validateInput(input) {
    var value = (input.value || "").trim();

    if (input.hasAttribute("required") && !value) {
      return setFieldState(
        input,
        input.dataset.msgRequired || "This field is required.",
      );
    }
    if (!value) {
      setFieldState(input, "");
      return true;
    }
    if (input.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      return setFieldState(input, "Enter a valid email address.");
    }
    if (input.type === "tel" && !/^[+\d][\d\s()-]{6,19}$/.test(value)) {
      return setFieldState(input, "Enter a valid phone number.");
    }
    if (input.dataset.minlength) {
      var min = parseInt(input.dataset.minlength, 10);
      if (value.length < min) {
        return setFieldState(input, "Must be at least " + min + " characters.");
      }
    }
    setFieldState(input, "");
    return true;
  }

  function runValidation(form) {
    var firstBad = null;
    var valid = true;

    form.querySelectorAll("input, select, textarea").forEach(function (field) {
      if (field.type === "checkbox") return;
      if (!validateInput(field)) {
        valid = false;
        if (!firstBad) firstBad = field;
      }
    });

    form.querySelectorAll("[data-require-match]").forEach(function (field) {
      var other = document.getElementById(field.dataset.requireMatch);
      if (!other || !field.value) return;
      if (field.value !== other.value) {
        setFieldState(field, "Passwords do not match.");
        valid = false;
        if (!firstBad) firstBad = field;
      }
    });

    form
      .querySelectorAll('input[type="checkbox"][required]')
      .forEach(function (box) {
        var wrap = box.closest(".terms-check") || box.closest(".form-field");
        var errorBox = wrap ? wrap.querySelector(".field-error") : null;
        if (box.checked) {
          if (errorBox) errorBox.classList.remove("show");
          return;
        }
        if (errorBox) {
          errorBox.classList.add("show");
          var span = errorBox.querySelector("span");
          if (span) span.textContent = "You must accept to continue.";
        }
        valid = false;
        if (!firstBad) firstBad = box;
      });

    return { valid: valid, firstBad: firstBad };
  }

  function showAlert(form, kind, message) {
    var box = form.querySelector(".auth-alert");
    if (!box) return;
    box.className = "auth-alert " + kind + " show";
    var span = box.querySelector("span");
    if (span) span.textContent = message;
  }

  /* ---------------- password strength meter ---------------- */

  function scorePassword(value) {
    var score = 0;
    if (value.length >= 8) score++;
    if (value.length >= 12) score++;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
    if (/\d/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;
    return Math.min(score, 5);
  }

  var STRENGTH = [
    { label: "", color: "" },
    { label: "Weak — add more characters", color: "#ef4444" },
    { label: "Weak — mix upper and lower case", color: "#ef4444" },
    { label: "Fair — add a number", color: "#f59e0b" },
    { label: "Good — add a symbol", color: "#0284c7" },
    { label: "Strong password", color: "#10b981" },
  ];

  function paintStrength(input) {
    var fill = document.getElementById("pwFill");
    var text = document.getElementById("pwText");
    if (!fill || !text) return;

    var meta = STRENGTH[scorePassword(input.value)];
    fill.style.width = input.value ? (scorePassword(input.value) / 5) * 100 + "%" : "0";
    fill.style.backgroundColor = meta.color;
    text.textContent = meta.label;
    text.style.color = meta.color || "";
  }

  /* ---------------- overlay ---------------- */

  var overlay = null;
  var box = null;
  var body = null;
  var lastTrigger = null;

  function build() {
    overlay = document.createElement("div");
    overlay.className = "auth-modal";
    overlay.id = "authModal";

    box = document.createElement("div");
    box.className = "auth-modal-box";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");

    var close = document.createElement("button");
    close.type = "button";
    close.className = "auth-close";
    close.setAttribute("aria-label", "Close");
    close.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
      '<line x1="18" y1="6" x2="6" y2="18" />' +
      '<line x1="6" y1="6" x2="18" y2="18" />' +
      "</svg>";

    body = document.createElement("div");
    body.className = "auth-modal-scroll";

    box.appendChild(close);
    box.appendChild(body);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  /* The mobile drawer sits above the page; tuck it away first. */
  function closeMobileNav() {
    var menu = document.getElementById("navbarMenu");
    if (menu) menu.classList.remove("open");
    var toggle = document.querySelector(".mobile-toggle");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
  }

  function open(type, trigger) {
    var render = FORMS[type];
    if (!render) return;
    if (!overlay) build();

    /* Keep the original trigger so focus returns there on close,
       even when the visitor switches between the two forms. */
    if (trigger) lastTrigger = trigger;
    closeMobileNav();

    /* Fresh markup each time, so no leftover validation state */
    body.innerHTML = render();
    box.classList.toggle("wide", type === "signup");

    overlay.classList.add("show");
    document.body.style.overflow = "hidden";

    var first = body.querySelector("input:not([type=checkbox])");
    if (first) first.focus();
  }

  function close() {
    if (!overlay) return;
    overlay.classList.remove("show");
    document.body.style.overflow = "";

    /* Drop the form so nothing is left mounted behind the overlay */
    body.innerHTML = "";

    if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus();
    lastTrigger = null;
  }

  function isOpen() {
    return !!(overlay && overlay.classList.contains("show"));
  }

  /* ---------------- wiring ---------------- */


  document.addEventListener("submit", function (e) {
    var form = e.target;
    if (!form.matches("[data-auth-form]")) return;
    e.preventDefault();

    var result = runValidation(form);

    if (!result.valid) {
      showAlert(
        form,
        "error",
        "Please fix the highlighted fields and try again.",
      );
      if (result.firstBad) result.firstBad.focus();
      return;
    }

    var alertBox = form.querySelector(".auth-alert");
    showAlert(
      form,
      "success",
      (alertBox && alertBox.dataset.success) || "Done.",
    );

    var btn = form.querySelector(".auth-submit");
    if (btn) btn.setAttribute("disabled", "disabled");
  });

  /* Re-check a field once it loses focus */
  document.addEventListener(
    "blur",
    function (e) {
      var field = e.target;
      if (!field.matches || !field.matches("input, select, textarea")) return;
      if (!field.closest(".auth-modal")) return;
      validateInput(field);
    },
    true,
  );

  /* Clear errors and drive the strength meter as the user types */
  document.addEventListener("input", function (e) {
    var field = e.target;
    if (!field.matches || !field.matches("input, select, textarea")) return;
    if (!field.closest(".auth-modal")) return;

    if (field.matches("[data-strength]")) paintStrength(field);
    if (field.classList && field.classList.contains("is-invalid")) {
      validateInput(field);
    }
  });

  document.addEventListener("click", function (e) {
    /* Any [data-auth] button opens the matching form */
    var opener = e.target.closest("[data-auth]");
    if (opener) {
      e.preventDefault();
      open(opener.dataset.auth, opener);
      return;
    }


    var eye = e.target.closest(".password-toggle");
    if (eye) {
      var input = document.getElementById(eye.dataset.target);
      if (input) {
        var hidden = input.type === "password";
        input.type = hidden ? "text" : "password";
        eye.setAttribute("aria-label", hidden ? "Hide password" : "Show password");
        eye.innerHTML = hidden
          ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
          : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
      }
      return;
    }

    /* Cross button and the .link-soft switch inside the form */
    var closer = e.target.closest(".auth-close");
    if (closer) {
      close();
      return;
    }

    var switcher = e.target.closest("[data-auth-switch]");
    if (switcher) {
      e.preventDefault();
      open(switcher.dataset.authSwitch);
      return;
    }

    /* A click anywhere on the backdrop dismisses the popup */
    if (e.target === overlay) close();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isOpen()) close();
  });

  /* Exposed for any inline trigger */
  window.openAuthModal = function (type) {
    open(type || "login", null);
  };
  window.closeAuthModal = close;
})();
