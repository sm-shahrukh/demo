(function () {
  "use strict";

  /* ---------------- Back to top ---------------- */
  window.addEventListener("scroll", function () {
    var btn = document.getElementById("backToTop");
    if (!btn) return;
    btn.classList.toggle("show", window.scrollY > 400);
  });

  /* ---------------- Password reveal toggles ---------------- */
  document.addEventListener("click", function (e) {
    var btn = e.target.closest(".password-toggle");
    if (!btn) return;
    var input = document.getElementById(btn.dataset.target);
    if (!input) return;
    var hidden = input.type === "password";
    input.type = hidden ? "text" : "password";
    btn.setAttribute("aria-label", hidden ? "Hide password" : "Show password");
    btn.innerHTML = hidden
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  });

  /* ---------------- Password strength meter ---------------- */
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
    { label: "Good — add a symbol", color: "var(--primary-blue)" },
    { label: "Strong password", color: "#10b981" },
  ];

  document.addEventListener("input", function (e) {
    var input = e.target;
    if (!input.matches("[data-strength]")) return;
    var fill = document.getElementById("pwFill");
    var text = document.getElementById("pwText");
    if (!fill || !text) return;

    var score = scorePassword(input.value);
    var meta = STRENGTH[score];
    fill.style.width = input.value ? (score / 5) * 100 + "%" : "0";
    fill.style.backgroundColor = meta.color;
    text.textContent = meta.label;
    text.style.color = meta.color || "";
  });

  /* ---------------- Inline field validation ---------------- */
  function setFieldState(input, message) {
    var wrap = input.closest(".form-field");
    if (!wrap) return !message;
    var error = wrap.querySelector(".field-error span");
    if (message) {
      input.classList.add("is-invalid");
      input.classList.remove("is-valid");
      if (error) error.textContent = message;
      var box = wrap.querySelector(".field-error");
      if (box) box.classList.add("show");
      return false;
    }
    input.classList.remove("is-invalid");
    if (input.value.trim()) input.classList.add("is-valid");
    var box = wrap.querySelector(".field-error");
    if (box) box.classList.remove("show");
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
    if (
      input.type === "email" &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)
    ) {
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

  /* Validate a whole form. Returns { valid, firstBad }. */
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

    /* Password confirmation pairs: [data-require-match="idOfOther"] */
    form.querySelectorAll("[data-require-match]").forEach(function (field) {
      var other = document.getElementById(field.dataset.requireMatch);
      if (!other || !field.value) return;
      if (field.value !== other.value) {
        setFieldState(field, "Passwords do not match.");
        valid = false;
        if (!firstBad) firstBad = field;
      }
    });

    /* Required checkboxes (terms, etc.) */
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

  /* Generic validated forms (login, signup) */
  document.addEventListener("submit", function (e) {
    var form = e.target;
    if (!form.matches("[data-validate]")) return;
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

  /* Does this field belong to one of our forms? */
  function isFormField(field) {
    if (!field || !field.matches) return false;
    if (!field.matches("input, select, textarea")) return false;
    var form = field.closest("form");
    return !!(form && form.matches("[data-validate], [data-contact-form]"));
  }

  /* Re-validate once the user has left a field, and as they fix errors */
  document.addEventListener(
    "blur",
    function (e) {
      if (isFormField(e.target)) validateInput(e.target);
    },
    true,
  );

  document.addEventListener("input", function (e) {
    var field = e.target;
    if (field.classList && field.classList.contains("is-invalid")) {
      validateInput(field);
    }
  });

  /* ---------------- FAQ accordion ---------------- */
  document.addEventListener("click", function (e) {
    var q = e.target.closest(".faq-q");
    if (!q) return;
    var item = q.parentElement;
    var group = item.parentElement;
    var isOpen = item.classList.contains("open");

    /* Single-open behaviour */
    group.querySelectorAll(".faq-item.open").forEach(function (other) {
      if (other !== item) other.classList.remove("open");
    });

    item.classList.toggle("open", !isOpen);
    q.setAttribute("aria-expanded", String(!isOpen));
  });

  /* ---------------- Contact form (mailto fallback) ---------------- */
  document.addEventListener("submit", function (e) {
    var form = e.target;
    if (!form.matches("[data-contact-form]")) return;
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

    var data = new FormData(form);
    var name = (data.get("name") || "").toString().trim();
    var email = (data.get("email") || "").toString().trim();
    var subject = (data.get("subject") || "").toString().trim();
    var message = (data.get("message") || "").toString().trim();

    showAlert(
      form,
      "success",
      "Thanks " +
        (name.split(" ")[0] || "there") +
        "! Your message is ready to send — we've opened your email client. " +
        "You can also reach us at support@smartmoves.com.",
    );

    var body = "Name: " + name + "\nEmail: " + email + "\n\n" + message;
    window.location.href =
      "mailto:support@smartmoves.com?subject=" +
      encodeURIComponent("[" + subject + "] " + name) +
      "&body=" +
      encodeURIComponent(body);

    form.reset();
    setTimeout(function () {
      var box = form.querySelector(".auth-alert");
      if (box) box.className = "auth-alert";
    }, 12000);
  });
})();

/* =============================================================
   ABOUT US — animated stat counters
   ============================================================= */
(function () {
  "use strict";

  function formatNumber(value) {
    return value.toLocaleString("en-US");
  }

  function animate(el) {
    var target = parseInt(el.dataset.count, 10) || 0;
    var suffix = el.dataset.suffix || "";
    var duration = 1400;
    var start = null;

    function frame(now) {
      if (start === null) start = now;
      var progress = Math.min((now - start) / duration, 1);
      /* easeOutCubic so the number settles instead of stopping dead */
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = formatNumber(Math.round(target * eased)) + suffix;
      if (progress < 1) requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  var counters = document.querySelectorAll("[data-count]");
  if (!counters.length) return;

  if (!("IntersectionObserver" in window)) {
    counters.forEach(animate);
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        animate(entry.target);
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.4 },
  );

  counters.forEach(function (el) {
    observer.observe(el);
  });
})();

/* =============================================================
   MY BOOKINGS — list rendering, tabs, filters, actions
   ============================================================= */
(function () {
  "use strict";

  var root = document.getElementById("bookingsApp");
  if (!root || typeof getBookings !== "function") return;

  var list = document.getElementById("bookingList");
  var emptyState = document.getElementById("bookingsEmpty");
  var searchInput = document.getElementById("bookingSearch");
  var tabs = Array.prototype.slice.call(
    root.querySelectorAll(".btab[data-filter]"),
  );

  var activeFilter = "all";

  var STATUS_LABEL = {
    upcoming: "Upcoming",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  var STEP_LABELS = ["Booked", "Ticketed", "Boarded", "Flown"];

  function esc(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDate(iso) {
    var parts = String(iso).split("-");
    var months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear();
  }

  function carrierColor(code) {
    var palette = [
      "var(--primary-blue)",
      "var(--accent-teal)",
      "#7c3aed",
      "#e11d48",
      "#ea580c",
      "#0891b2",
      "#4f46e5",
      "#059669",
    ];
    var sum = 0;
    for (var i = 0; i < code.length; i++) sum += code.charCodeAt(i);
    return palette[sum % palette.length];
  }

  function renderSteps(progress, status) {
    if (status !== "upcoming") return "";
    var html = '<div class="bc-track">';
    for (var i = 0; i < STEP_LABELS.length; i++) {
      var state = "";
      if (progress === 0) state = "";
      else if (i + 1 < progress) state = " done";
      else if (i + 1 === progress) state = " now";
      html +=
        '<div class="bc-step' +
        state +
        '">' +
        '<div class="bc-step-dot">' +
        (i + 1) +
        "</div>" +
        (i < STEP_LABELS.length - 1 ? '<div class="bc-step-bar"></div>' : "") +
        "</div>";
    }
    html += "</div>";
    html += '<div class="bc-step-labels">';
    STEP_LABELS.forEach(function (label, index) {
      var on = progress > 0 && index + 1 === progress ? " on" : "";
      html += '<span class="' + on.trim() + '">' + label + "</span>";
    });
    html += "</div>";
    return html;
  }

  function renderCard(b) {
    var canCancel = b.status === "upcoming";
    var color = carrierColor(b.airlineCode);

    var html =
      '<article class="booking-card' +
      (b.status === "cancelled" ? " cancelled" : "") +
      '" data-ref="' +
      esc(b.ref) +
      '">';

    /* Header: reference + status */
    html +=
      '<div class="bc-top">' +
      '<div class="bc-ref">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
      '<path d="M4 4h16v4H4zM4 12h16v8H4z"/><path d="M8 8h.01M8 16h.01"/></svg>' +
      "<span>Booking Ref <strong>" +
      esc(b.ref) +
      "</strong></span>" +
      "</div>" +
      '<span class="bc-status ' +
      b.status +
      '">' +
      '<span class="dot"></span>' +
      STATUS_LABEL[b.status] +
      "</span>" +
      "</div>";

    /* Airline */
    html +=
      '<div class="bc-airline">' +
      '<div class="bc-carrier">' +
      '<div class="bc-logo" style="background:' +
      color +
      '">' +
      esc(b.airlineCode) +
      "</div>" +
      '<div class="bc-carrier-text">' +
      '<div class="bc-carrier-name">' +
      esc(b.airline) +
      "</div>" +
      '<div class="bc-carrier-meta">' +
      esc(b.flightNo) +
      " · " +
      esc(b.cabin) +
      "</div>" +
      "</div></div>" +
      '<span class="bc-class">' +
      esc(b.cabin) +
      "</span>" +
      "</div>";

    /* Route */
    html +=
      '<div class="bc-route">' +
      '<div class="bc-end">' +
      '<div class="bc-time">' +
      esc(b.departTime) +
      "</div>" +
      '<div class="bc-airport">' +
      esc(b.from.code) +
      "</div>" +
      '<div class="bc-city">' +
      esc(b.from.city) +
      "</div>" +
      "</div>" +
      '<div class="bc-mid">' +
      '<div class="bc-duration">' +
      esc(b.duration) +
      "</div>" +
      '<div class="bc-line"><i></i><span class="bc-plane">✈</span><i></i></div>' +
      '<div class="bc-stops">' +
      esc(b.stops) +
      "</div>" +
      "</div>" +
      '<div class="bc-end right">' +
      '<div class="bc-time">' +
      esc(b.arriveTime) +
      "</div>" +
      '<div class="bc-airport">' +
      esc(b.to.code) +
      "</div>" +
      '<div class="bc-city">' +
      esc(b.to.city) +
      "</div>" +
      "</div>" +
      "</div>";

    html += renderSteps(b.progress, b.status);

    /* Detail grid */
    html +=
      '<div class="bc-details">' +
      '<div class="bc-detail"><div class="bc-detail-label">Travel Date</div>' +
      '<div class="bc-detail-value">' +
      formatDate(b.departDate) +
      "</div></div>" +
      '<div class="bc-detail"><div class="bc-detail-label">Booked On</div>' +
      '<div class="bc-detail-value">' +
      formatDate(b.bookedOn) +
      "</div></div>" +
      '<div class="bc-detail"><div class="bc-detail-label">Passengers</div>' +
      '<div class="bc-detail-value">' +
      b.pax.length +
      " · " +
      esc(b.pax[0].type) +
      (b.pax.length > 1 ? " +" + (b.pax.length - 1) : "") +
      "</div></div>" +
      '<div class="bc-detail"><div class="bc-detail-label">Seat</div>' +
      '<div class="bc-detail-value">' +
      esc(b.pax[0].seat) +
      "</div></div>" +
      "</div>";

    /* Passengers */
    var paxText = b.pax
      .map(function (p) {
        return (
          "<strong>" +
          esc(p.name) +
          "</strong> (" +
          esc(p.type) +
          ", Seat " +
          esc(p.seat) +
          ")"
        );
      })
      .join(" · ");
    html +=
      '<div class="bc-pax">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
      '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
      '<span class="bc-pax-text">' +
      paxText +
      "</span>" +
      "</div>";

    /* Fare + actions */
    html +=
      '<div class="bc-bottom">' +
      '<div class="bc-fare">' +
      '<div class="bc-fare-label">Total paid</div>' +
      '<div class="bc-fare-amount">' +
      esc(b.fare) +
      "</div>" +
      '<div class="bc-fare-note">' +
      esc(b.fareNote) +
      "</div>" +
      "</div>" +
      '<div class="bc-actions">' +
      '<button class="bc-btn" data-click="viewBooking(\'' +
      b.ref +
      "')\">" +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
      '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' +
      "View Details</button>" +
      '<button class="bc-btn" data-click="printBooking(\'' +
      b.ref +
      "')\">" +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
      '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>' +
      '<rect x="6" y="14" width="12" height="8"/></svg>' +
      "Print</button>" +
      '<button class="bc-btn primary" data-click="downloadTicket(\'' +
      b.ref +
      "')\">" +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
      '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/>' +
      '<line x1="12" y1="15" x2="12" y2="3"/></svg>' +
      "E-Ticket</button>" +
      (canCancel
        ? '<button class="bc-btn danger" data-click="askCancelBooking(\'' +
          b.ref +
          "')\">" +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
          '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
          "Cancel</button>"
        : "") +
      "</div></div>";

    html += "</article>";
    return html;
  }

  function matchesFilter(b, filter, query) {
    if (filter !== "all" && b.status !== filter) return false;
    if (!query) return true;
    var haystack = [
      b.ref,
      b.airline,
      b.flightNo,
      b.from.code,
      b.to.code,
      b.from.city,
      b.to.city,
      b.cabin,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.indexOf(query) !== -1;
  }

  function render() {
    var query = (searchInput ? searchInput.value : "").trim().toLowerCase();
    var all = getBookings();
    var visible = all.filter(function (b) {
      return matchesFilter(b, activeFilter, query);
    });

    function countBy(status) {
      return all.filter(function (b) {
        return b.status === status;
      }).length;
    }

    /* Refresh the per-tab counters from the full list */
    tabs.forEach(function (tab) {
      var key = tab.dataset.filter;
      var count =
        key === "all"
          ? all.length
          : all.filter(function (b) {
              return b.status === key;
            }).length;
      var badge = tab.querySelector(".btab-count");
      if (badge) badge.textContent = count;
    });

    /* Summary cards at the top of the page */
    function setStat(id, value) {
      var el = document.getElementById(id);
      if (el) el.textContent = value;
    }
    setStat("statUpcoming", countBy("upcoming"));
    setStat("statCompleted", countBy("completed"));
    setStat("statCancelled", countBy("cancelled"));
    setStat("statTotal", all.length);

    list.innerHTML = visible.map(renderCard).join("");

    if (emptyState) {
      emptyState.classList.toggle("show", visible.length === 0);
      var text = emptyState.querySelector("p");
      if (text && visible.length === 0) {
        text.textContent = query
          ? "No bookings match “" +
            query +
            "”. Try a different reference, airline or city."
          : "You don't have any bookings here yet. Browse flights and make your first booking.";
      }
    }
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      tabs.forEach(function (t) {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");
      activeFilter = tab.dataset.filter;
      render();
    });
  });

  if (searchInput) searchInput.addEventListener("input", render);

  /* ---------------- Modal ---------------- */
  var modal = document.getElementById("bkModal");
  var modalTitle = document.getElementById("bkModalTitle");
  var modalText = document.getElementById("bkModalText");
  var modalRef = document.getElementById("bkModalRef");
  var modalIcon = document.getElementById("bkModalIcon");
  var modalActions = document.getElementById("bkModalActions");
  var pendingRef = null;

  function openModal(opts) {
    modalTitle.textContent = opts.title;
    modalText.innerHTML = opts.text;
    modalIcon.className = "bk-modal-icon" + (opts.danger ? "" : " info");
    modalIcon.innerHTML = opts.icon;
    modalRef.style.display = opts.ref ? "block" : "none";
    if (opts.ref) modalRef.textContent = "Booking reference: " + opts.ref;
    modalActions.innerHTML = opts.actions
      .map(function (a) {
        return (
          '<button class="bc-btn ' +
          (a.cls || "") +
          '" data-click="' +
          a.fn +
          '">' +
          a.label +
          "</button>"
        );
      })
      .join("");
    modal.classList.add("show");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    modal.classList.remove("show");
    document.body.style.overflow = "";
    pendingRef = null;
  }

  window.closeBookingModal = closeModal;

  if (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) closeModal();
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && modal && modal.classList.contains("show")) {
      closeModal();
    }
  });

  /* ---------------- Public actions ---------------- */
  function findBooking(ref) {
    return (
      getBookings().filter(function (b) {
        return b.ref === ref;
      })[0] || null
    );
  }

  var WARN_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
    '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>' +
    '<line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';

  var INFO_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
    '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/>' +
    '<line x1="12" y1="8" x2="12.01" y2="8"/></svg>';

  window.askCancelBooking = function (ref) {
    pendingRef = ref;
    openModal({
      title: "Cancel this booking?",
      text:
        "Cancellations within 24 hours of departure are non-refundable. " +
        "Cancelling now may reduce your refund to the airline's fare rules.",
      ref: ref,
      icon: WARN_ICON,
      danger: true,
      actions: [
        {
          label: "Keep booking",
          cls: "primary",
          fn: "closeBookingModal()",
        },
        {
          label: "Yes, cancel it",
          cls: "danger",
          fn: "confirmCancelBooking()",
        },
      ],
    });
  };

  window.confirmCancelBooking = function () {
    if (!pendingRef) return;
    var ref = pendingRef;
    setBookingStatus(ref, { status: "cancelled", progress: 0 });
    closeModal();
    render();

    openModal({
      title: "Booking cancelled",
      text:
        "Your booking has been cancelled and the refund has been initiated. " +
        "It typically reaches your account within 7–10 working days.",
      ref: ref,
      icon: INFO_ICON,
      actions: [{ label: "Done", cls: "primary", fn: "closeBookingModal()" }],
    });
  };

  /* ---------------- Print / download sheet ---------------- */
  function buildTicket(b) {
    return (
      '<div class="ticket-sheet">' +
      "<h3>e-Ticket · " +
      esc(b.ref) +
      "</h3>" +
      '<div class="ticket-grid">' +
      "<div><b>Passenger</b><span>" +
      esc(b.pax[0].name) +
      "</span></div>" +
      "<div><b>Airline</b><span>" +
      esc(b.airline) +
      " " +
      esc(b.flightNo) +
      "</span></div>" +
      "<div><b>Class</b><span>" +
      esc(b.cabin) +
      "</span></div>" +
      "<div><b>Seat</b><span>" +
      esc(b.pax[0].seat) +
      "</span></div>" +
      "<div><b>Date</b><span>" +
      formatDate(b.departDate) +
      "</span></div>" +
      "<div><b>From</b><span>" +
      esc(b.from.code) +
      " · " +
      esc(b.from.city) +
      "</span></div>" +
      "<div><b>To</b><span>" +
      esc(b.to.code) +
      " · " +
      esc(b.to.city) +
      "</span></div>" +
      "<div><b>Departure</b><span>" +
      esc(b.departTime) +
      " → " +
      esc(b.arriveTime) +
      "</span></div>" +
      "</div>" +
      '<div class="ticket-foot">' +
      esc(b.duration) +
      " · " +
      esc(b.stops) +
      " · Total " +
      esc(b.fare) +
      "<br/>Issued by Smart Moves · This is a sample itinerary." +
      "</div></div>"
    );
  }

  window.viewBooking = function (ref) {
    var b = findBooking(ref);
    if (!b) return;
    openModal({
      title: "Booking Details",
      text: buildTicket(b),
      ref: ref,
      icon: INFO_ICON,
      actions: [
        { label: "Close", cls: "primary", fn: "closeBookingModal()" },
        {
          label: "Print",
          cls: "",
          fn: "printBooking('" + ref + "')",
        },
      ],
    });
  };

  window.printBooking = function (ref) {
    var b = findBooking(ref);
    if (!b) return;
    var area = document.getElementById("printArea");
    area.innerHTML = buildTicket(b);
    window.print();
  };

  window.downloadTicket = function (ref) {
    var b = findBooking(ref);
    if (!b) return;
    /* No server here, so hand the traveller a plain-text itinerary. */
    var lines = [
      "SMART MOVES — E-TICKET",
      "========================",
      "Booking Ref : " + b.ref,
      "Status      : " + STATUS_LABEL[b.status],
      "",
      "Passenger   : " + b.pax[0].name + " (" + b.pax[0].type + ")",
      "Seat        : " + b.pax[0].seat,
      "Class       : " + b.cabin,
      "",
      "Airline     : " + b.airline + "  " + b.flightNo,
      "Date        : " + formatDate(b.departDate),
      "Departure   : " +
        b.departTime +
        "  " +
        b.from.code +
        " · " +
        b.from.city,
      "Arrival     : " + b.arriveTime + "  " + b.to.code + " · " + b.to.city,
      "Duration    : " + b.duration + " (" + b.stops + ")",
      "",
      "Total paid  : " + b.fare,
      "            " + b.fareNote,
      "",
      "Sample itinerary generated by Smart Moves.",
    ];
    var blob = new Blob([lines.join("\n")], {
      type: "text/plain;charset=utf-8",
    });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "smart-moves-ticket-" + b.ref + ".txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /* ---------------- Boot ---------------- */
  document.addEventListener("DOMContentLoaded", render);
  if (document.readyState !== "loading") render();
})();
