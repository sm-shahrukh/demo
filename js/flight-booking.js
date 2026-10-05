

(function () {
  "use strict";

  var app = document.getElementById("fbApp");
  if (!app) return;

  /* =============================================================
     MOCK DATA — replace with the POST /api/bookings/quote response
     ============================================================= */
  var FLIGHT = {
    destination: "London",
    tripType: "One way",
    cabin: "Economy",
    dateLabel: "Mon, 16 Nov 2026",
    totalDuration: "7h 30m",
    legs: [
      {
        airline: "Etihad Airways",
        code: "EY",
        flightNo: "EY 431",
        badge: "30 Min",
        from: { code: "ISB", city: "Islamabad", terminal: "Terminal 1 · Gate C14" },
        to: { code: "AUH", city: "Abu Dhabi", terminal: "Terminal to arrivals" },
        depart: "04:50",
        arrive: "07:10",
        note: "Checked baggage 7kg · Not included",
        meta: [
          ["Terminal", "Terminal 1 · Gate C14"],
          ["Cabin baggage", "Economy · 35kg"],
          ["Seats", "32A, 32B, 32C, 32D"],
          ["Check-in closes", "04:30"],
        ],
      },
      {
        airline: "Etihad Airways",
        code: "EY",
        flightNo: "EY 431",
        badge: "1h 55m layover",
        layover: true,
        from: { code: "AUH", city: "Abu Dhabi", terminal: "Terminal to arrivals" },
        to: { code: "LHR", city: "London Heathrow", terminal: "Terminal to arrivals" },
        depart: "08:05",
        arrive: "12:45",
        note: "30 min transfer to Terminal 5",
        meta: [
          ["Transfer", "30 min to Terminal 5"],
          ["Cabin baggage", "Economy · 35kg"],
          ["Seats", "22D, 22E, 22F, 22G"],
          ["Carbon tax", "Allowance verified"],
        ],
      },
    ],
  };

  function selectedDepartureDateLabel() {
    var departure = new URLSearchParams(window.location.search).get("departure");
    if (departure === null) return null;

    var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(departure);
    if (!match) {
      console.error("Ignoring invalid flight departure date in booking URL.");
      return null;
    }

    var date = new Date(Date.UTC(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3])
    ));
    if (
      date.getUTCFullYear() !== Number(match[1]) ||
      date.getUTCMonth() !== Number(match[2]) - 1 ||
      date.getUTCDate() !== Number(match[3])
    ) {
      console.error("Ignoring invalid flight departure date in booking URL.");
      return null;
    }

    return date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  }

  FLIGHT.dateLabel = selectedDepartureDateLabel() || FLIGHT.dateLabel;

  /* The travel date, kept as a real Date so the calendar, the age check and
     the passport-validity check all measure against the same day. Falls back
     to the default 16 Nov 2026 when the URL has no usable departure date. */
  var FLIGHT_DATE = (function () {
    var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      new URLSearchParams(window.location.search).get("departure") || ""
    );
    if (!match) return new Date(2026, 10, 16);

    var d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (d.getMonth() !== Number(match[2]) - 1 || d.getDate() !== Number(match[3])) {
      return new Date(2026, 10, 16);
    }
    return d;
  })();

  var FLIGHT_DATE_ISO = FLIGHT_DATE.getFullYear() + "-" +
    ("0" + (FLIGHT_DATE.getMonth() + 1)).slice(-2) + "-" +
    ("0" + FLIGHT_DATE.getDate()).slice(-2);

  /* Per-traveller-type pricing. Child fares carry a discount off the
     adult base; infants are a flat seat-occupancy fee. */
  var FARE = {
    adult: { base: 106840, tax: 19470 },
    child: { base: 60320, tax: 10980 },
    infant: { base: 16880, tax: 3020 },
  };

  /* One of each, per the demo brief. */
  var TRAVELLERS = [
    { id: 1, type: "Adult", label: "Adult 1", needsGuardian: false },
    { id: 2, type: "Adult", label: "Adult 2", needsGuardian: false },
    { id: 3, type: "Child", label: "Child 1", needsGuardian: true },
    { id: 4, type: "Infant", label: "Infant 1", needsGuardian: true },
  ];

  var COUNTRIES = [
    "Pakistan", "Saudi Arabia", "United Arab Emirates", "Qatar",
    "United Kingdom", "United States", "Canada", "Malaysia",
    "Bangladesh", "India", "Turkey", "Other",
  ];

  var GUARDIANS = TRAVELLERS.filter(function (t) {
    return t.type === "Adult";
  });

  /* =============================================================
     Helpers
     ============================================================= */
  function esc(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function money(value) {
    return "PKR " + Math.round(value).toLocaleString("en-US");
  }

  function options(list, selected) {
    return list
      .map(function (item) {
        return (
          '<option value="' + esc(item) + '"' +
          (item === selected ? " selected" : "") +
          ">" + esc(item) + "</option>"
        );
      })
      .join("");
  }

  var ICON_ALERT =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
    '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>' +
    '<line x1="12" y1="16" x2="12.01" y2="16"/></svg>';

  var ICON_CAL =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
    '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>' +
    '<line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';

  /* =============================================================
     Itinerary
     ============================================================= */
  function renderItinerary() {
    /* Origin once, then every leg's destination: ISB → AUH → LHR */
    var origin = FLIGHT.legs[0].from;
    var cities = [origin.code]
      .concat(
        FLIGHT.legs.map(function (leg) {
          return leg.to.code;
        })
      )
      .map(function (code) {
        return "<span>" + esc(code) + "</span>";
      })
      .join(' <span aria-hidden="true">→</span> ');

    var legs = FLIGHT.legs
      .map(function (leg) {
        return (
          '<div class="fb-leg">' +
          '<div class="fb-leg-top">' +
          '<div class="fb-carrier">' +
          '<div class="fb-carrier-logo">' + esc(leg.code) + "</div>" +
          '<div><div class="fb-carrier-name">' + esc(leg.airline) + "</div>" +
          '<div class="fb-carrier-no">' + esc(leg.flightNo) + "</div></div>" +
          "</div>" +
          '<span class="fb-leg-badge' + (leg.layover ? " layover" : "") + '">' +
          (leg.layover
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
              '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
            : "") +
          esc(leg.badge) +
          "</span>" +
          "</div>" +

          '<div class="fb-leg-route">' +
          '<div class="fb-leg-end">' +
          '<div class="fb-leg-time">' + esc(leg.depart) + "</div>" +
          '<div class="fb-leg-date">Departs ' + esc(FLIGHT.dateLabel) + "</div>" +
          '<div class="fb-leg-airport">' + esc(leg.from.code) + "</div>" +
          '<div class="fb-leg-city">' + esc(leg.from.city) + "</div>" +
          "</div>" +
          '<div class="fb-leg-mid">' +
          '<div class="fb-leg-line"><i></i><span class="fb-leg-plane" >✈</span><i></i></div>' +
          "</div>" +
          '<div class="fb-leg-end right">' +
          '<div class="fb-leg-time">' + esc(leg.arrive) + "</div>" +
          '<div class="fb-leg-date">Arrives ' + esc(FLIGHT.dateLabel) + "</div>" +
          '<div class="fb-leg-airport">' + esc(leg.to.code) + "</div>" +
          '<div class="fb-leg-city">' + esc(leg.to.city) + "</div>" +
          "</div>" +
          "</div>" +

          '<dl class="fb-leg-meta">' +
          leg.meta
            .map(function (pair) {
              return (
                "<div><dt>" + esc(pair[0]) + "</dt><dd>" + esc(pair[1]) + "</dd></div>"
              );
            })
            .join("") +
          "</dl>" +
          "</div>"
        );
      })
      .join("");

    return (
      '<section class="fb-card">' +
      '<div class="fb-card-head">' +
      '<h2 class="fb-card-title">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
      '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>' +
      "</svg>" +
      "Your flight to " + esc(FLIGHT.destination) +
      "</h2>" +
      '<span class="fb-link">' + esc(FLIGHT.tripType) + " · " + esc(FLIGHT.cabin) + "</span>" +
      "</div>" +

      '<div class="fb-route-head">' +
      '<div class="fb-route-cities">' + cities + "</div>" +
      '<div class="fb-route-meta">' +
      esc(FLIGHT.dateLabel) + " · " + esc(FLIGHT.totalDuration) + " total · " +
      esc(FLIGHT.legs.length > 1 ? FLIGHT.legs[1].badge : "Non-stop") +
      "</div>" +
      "</div>" +

      '<div class="fb-legs">' + legs + "</div>" +

      '<div class="fb-note-group">' +
      '<div class="fb-note muted">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
      '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>' +
      esc(FLIGHT.legs[0].note) +
      "</div>" +
      '<div class="fb-note muted">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
      '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>' +
      esc(FLIGHT.legs[1] ? FLIGHT.legs[1].note : "Carbon tax allowance verified") +
      "</div>" +
      "</div>" +

      '<div class="fb-note info">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
      '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/>' +
      '<line x1="12" y1="8" x2="12.01" y2="8"/></svg>' +
      "All times are local. Terminal, aircraft and cabin baggage must be confirmed with the airline before travel." +
      "</div>" +
      "</section>"
    );
  }

  /* =============================================================
     Traveller accordions
     ============================================================= */
  function fieldHtml(cfg) {
    return (
      '<div class="fb-field">' +
      '<label class="fb-label" for="' + cfg.id + '">' + esc(cfg.label) +
      (cfg.required ? '<span class="req">*</span>' : ' <span class="opt">(Optional)</span>') +
      "</label>" +
      (cfg.type === "select"
        ? '<select class="fb-select" id="' + cfg.id + '" name="' + cfg.name + '"' +
          (cfg.required ? " required" : "") + '>' +
          '<option value="">' + esc(cfg.placeholder || "Select") + "</option>" +
          options(cfg.values || [], cfg.value || "") +
          "</select>"
        : cfg.type === "date"
        ? '<div class="fb-date" data-max="' + esc(cfg.max || "") + '"' +
          (cfg.minYear ? ' data-min-year="' + cfg.minYear + '"' : "") + ">" +
          '<input class="fb-input" type="text" id="' + cfg.id + '" name="' + cfg.name + '"' +
          ' placeholder="DD / MM / YYYY" inputmode="numeric" autocomplete="off"' +
          (cfg.required ? " required" : "") +
          (cfg.readonly ? ' readonly tabindex="-1"' : "") + " />" +
          '<button type="button" class="fb-date-btn" aria-label="Open date picker"' +
          ' tabindex="-1" aria-expanded="false">' + ICON_CAL +
          "</button>" +
          '<div class="fb-cal" role="dialog" aria-label="Choose a date" hidden>' +
          '<div class="fb-cal-head">' +
          '<button type="button" class="fb-cal-nav" data-cal="prev" aria-label="Previous month">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
          '<polyline points="15 18 9 12 15 6"/></svg></button>' +
          '<div class="fb-cal-picks">' +
          '<select class="fb-cal-month" aria-label="Month"></select>' +
          '<select class="fb-cal-year" aria-label="Year"></select>' +
          "</div>" +
          '<button type="button" class="fb-cal-nav" data-cal="next" aria-label="Next month">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
          '<polyline points="9 18 15 12 9 6"/></svg></button>' +
          "</div>" +
          '<div class="fb-cal-dows" aria-hidden="true">' +
          ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]
            .map(function (d) {
              return "<span>" + d + "</span>";
            })
            .join("") +
          "</div>" +
          '<div class="fb-cal-grid" role="grid"></div>' +
          '<div class="fb-cal-foot">' +
          '<button type="button" class="fb-cal-clear" data-cal="clear">Clear</button>' +
          "</div>" +
          "</div>" +
          "</div>"
        : '<input class="fb-input" type="' + (cfg.type || "text") + '" id="' + cfg.id +
          '" name="' + cfg.name + '" placeholder="' + esc(cfg.placeholder || "") + '"' +
          (cfg.readonly ? ' readonly tabindex="-1"' : "") +
          (cfg.required ? " required" : "") + " />") +
      '<div class="fb-error">' + ICON_ALERT + "<span></span></div>" +
      "</div>"
    );
  }

  function travellerHtml(t) {
    var p = "pax" + t.id;
    var open = t.id === 1;

    var identity = [
      fieldHtml({ id: p + "Title", name: "title", label: "Title", required: true, type: "select", values: ["Mr", "Mrs", "Ms", "Miss", "Dr"] }),
      fieldHtml({ id: p + "Gender", name: "gender", label: "Gender", required: true, type: "select", values: ["Male", "Female", "Unspecified"] }),
      fieldHtml({ id: p + "Given", name: "given", label: "Given names", required: true, placeholder: "First and middle names" }),
      fieldHtml({ id: p + "Surname", name: "surname", label: "Surname", required: true, placeholder: "Family name" }),
      fieldHtml({ id: p + "Nationality", name: "nationality", label: "Nationality", required: true, type: "select", values: COUNTRIES }),
      fieldHtml({ id: p + "Dob", name: "dob", label: "Date of birth", required: true, type: "date", max: FLIGHT_DATE_ISO, minYear: 1900 }),
    ].join("");

    var guardian = t.needsGuardian
      ? fieldHtml({
          id: p + "Guardian",
          name: "guardian",
          label: "Accompanying adult",
          required: true,
          type: "select",
          values: GUARDIANS.map(function (g) {
            return g.label;
          }),
          placeholder: "Select adult",
        })
      : "";

    var passport = [
      fieldHtml({
        id: p + "DocType",
        name: "doctype",
        label: "Travel document type",
        required: true,
        type: "select",
        values: ["Passport", "National ID", "Travel document"],
      }),
      fieldHtml({ id: p + "DocNo", name: "docno", label: "Document number", required: true, placeholder: "Passport or ID number" }),
      fieldHtml({ id: p + "DocExp", name: "docexp", label: "Document expiry date", required: true, type: "date", minYear: FLIGHT_DATE.getFullYear() }),
    ].join("");

    var prefs = [
      fieldHtml({ id: p + "FFN", name: "ffn", label: "Frequent flyer number" }),
      fieldHtml({
        id: p + "Wheel",
        name: "wheel",
        label: "Wheelchair assistance",
        type: "select",
        values: ["Select if required", "Not required", "Wheelchair on board", "Airport only"],
      }),
      fieldHtml({
        id: p + "Meal",
        name: "meal",
        label: "Meal preference",
        type: "select",
        values: ["Select meal required", "No preference", "Vegetarian", "Halal", "Special diet"],
      }),
    ].join("");

    return (
      '<div class="fb-pax' + (open ? " open" : "") + '" id="' + p + '" data-type="' + t.type + '">' +
      '<button type="button" class="fb-pax-head" aria-expanded="' + open + '" aria-controls="' + p + 'Body">' +
      '<span class="fb-pax-avatar">' + t.id + "</span>" +
      '<span class="fb-pax-info">' +
      '<span class="fb-pax-name" data-role="name">' + esc(t.label) + "</span>" +
      '<span class="fb-pax-status" data-role="hint">Enter pax details</span>' +
      "</span>" +
      '<span class="fb-pax-flag incomplete" data-role="flag">Incomplete</span>' +
      '<svg class="fb-pax-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
      '<polyline points="6 9 12 15 18 9"/></svg>' +
      "</button>" +

      '<div class="fb-pax-body" id="' + p + 'Body">' +

      '<p class="fb-pax-note">' +
      (t.type === "Infant"
        ? "An infant's ticket is tied to an accompanying adult. The date of birth must match the accompanying adult's declaration."
        : t.type === "Child"
        ? "Not a specific age — this traveller needs a passport and travel preferences completed."
        : "Use names exactly as they appear in the passport, including all given names. Do not use nicknames.") +
      "</p>" +

      fieldHtml({
        id: p + "Together",
        name: "together",
        label: "Travelled together",
        type: "select",
        values: TRAVELLERS.filter(function (o) {
          return o.id !== t.id;
        }).map(function (o) {
          return o.label;
        }),
        placeholder: "Select a saved traveller",
      }) +
      '<p class="fb-hint">Use names exactly as they appear in the passport, including all given names. Do not use nicknames.</p>' +

      '<div class="fb-grid two">' + identity + "</div>" +

      '<p class="fb-hint">' +
      (t.type === "Infant"
        ? "An infant must be under 1 year old on the date of travel and must have an accompanying adult."
        : "An adult must be 12 or older on the date of travel. Each child must have an accompanying adult.") +
      "</p>" +

      (guardian
        ? '<div class="fb-subsection"><div class="fb-grid two">' + guardian + "</div></div>"
        : "") +

      '<div class="fb-subsection">' +
      '<div class="fb-subsection-title">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
      '<path d="M4 4h16v16H4z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>' +
      "Passport details" +
      "</div>" +
      '<div class="fb-grid two">' + passport + "</div>" +
      '<p class="fb-hint">Passport is required for this international journey. Check all entry, transit and passport validity requirements before booking.</p>' +
      "</div>" +

      '<div class="fb-subsection">' +
      '<div class="fb-subsection-title">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
      '<circle cx="12" cy="12" r="10"/><path d="M12 6v12M9 9h6"/></svg>' +
      "Travel preferences" +
      "</div>" +
      '<div class="fb-grid two">' + prefs + "</div>" +
      '<p class="fb-hint">Meal and blanket requests are subject to airline confirmation.</p>' +
      "</div>" +

      "</div></div>"
    );
  }

  /* =============================================================
     Date picker
     A month grid driven by the input's value. Closes on outside click
     and Escape; the typed mask keeps working so both paths agree.
     ============================================================= */
  var MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  var openCalendar = null;

  function today() {
    var d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  /* Parse the field into a Date, or null when the value is not a real date. */
  function readDate(input) {
    var m = DATE_RE.exec((input.value || "").trim());
    if (!m) return null;
    var d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    if (d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[1])) return null;
    return d;
  }

  function writeDate(input, d) {
    input.value =
      ("0" + d.getDate()).slice(-2) + " / " +
      ("0" + (d.getMonth() + 1)).slice(-2) + " / " + d.getFullYear();
  }

  /* Shared rules for what a given date field may hold. */
  function dateLimits(wrap) {
    var maxRaw = wrap.getAttribute("data-max");
    var max = /^\d{4}-\d{2}-\d{2}$/.test(maxRaw || "")
      ? (function () {
          var p = maxRaw.split("-");
          return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
        })()
      : null;
    var minYear = Number(wrap.getAttribute("data-min-year")) || 1900;
    var min = max ? new Date(minYear, max.getMonth(), max.getDate()) : new Date(minYear, 0, 1);
    return { min: min, max: max, minYear: minYear, hasMax: !!max };
  }

  /* The month/year dropdowns are how a user jumps across decades, so they
     span every year the field accepts rather than only the visible month. */
  function syncCalPicks(wrap, cursor, limits) {
    var monthSel = wrap.querySelector(".fb-cal-month");
    var yearSel = wrap.querySelector(".fb-cal-year");
    if (!monthSel || !yearSel) return;

    var firstYear = limits.min.getFullYear();
    var lastYear = limits.hasMax
      ? limits.max.getFullYear()
      : Math.max(today().getFullYear() + 15, firstYear);

    if (!monthSel.options.length) {
      monthSel.innerHTML = MONTHS.map(function (name, index) {
        return '<option value="' + index + '">' + name.slice(0, 3) + "</option>";
      }).join("");
    }
    if (yearSel.options.length !== lastYear - firstYear + 1) {
      var years = [];
      for (var y = firstYear; y <= lastYear; y++) years.push(y);
      yearSel.innerHTML = years
        .map(function (y) {
          return '<option value="' + y + '">' + y + "</option>";
        })
        .join("");
    }

    monthSel.value = String(cursor.getMonth());
    yearSel.value = String(cursor.getFullYear());
  }

  function paintCalendar(wrap) {
    var input = wrap.querySelector("input");
    var grid = wrap.querySelector(".fb-cal-grid");
    var cal = wrap.querySelector(".fb-cal");
    var limits = dateLimits(wrap);

    var selected = readDate(input);
    var cursor;
    if (selected) {
      cursor = new Date(selected.getFullYear(), selected.getMonth(), 1);
    } else if (cal.dataset.y !== undefined) {
      cursor = new Date(Number(cal.dataset.y), Number(cal.dataset.m), 1);
    } else {
      /* No value yet: for a DOB show the month before travel, otherwise today. */
      var base = limits.hasMax ? new Date(limits.max.getFullYear(), limits.max.getMonth(), 1) : today();
      cursor = new Date(base.getFullYear(), base.getMonth(), 1);
    }

    /* Keep navigation inside the years the field actually accepts. */
    if (cursor.getFullYear() < limits.minYear) {
      cursor = new Date(limits.minYear, 0, 1);
    }
    if (limits.hasMax && cursor.getFullYear() > limits.max.getFullYear()) {
      cursor = new Date(limits.max.getFullYear(), limits.max.getMonth(), 1);
    }
    if (limits.hasMax && cursor.getFullYear() === limits.max.getFullYear() &&
        cursor.getMonth() > limits.max.getMonth()) {
      cursor = new Date(limits.max.getFullYear(), limits.max.getMonth(), 1);
    }

    cal.dataset.y = String(cursor.getFullYear());
    cal.dataset.m = String(cursor.getMonth());
    syncCalPicks(wrap, cursor, limits);

    /* Monday-first grid, padded with the neighbouring months' days. */
    var first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    var lead = (first.getDay() + 6) % 7;
    var start = new Date(first);
    start.setDate(1 - lead);

    var cells = [];
    for (var i = 0; i < 42; i++) {
      var day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      var outside = day.getMonth() !== cursor.getMonth();

      var disabled = day < limits.min;
      if (limits.hasMax && day > limits.max) disabled = true;

      var classes = ["fb-cal-day"];
      if (outside) classes.push("outside");
      if (selected &&
          day.getFullYear() === selected.getFullYear() &&
          day.getMonth() === selected.getMonth() &&
          day.getDate() === selected.getDate()) {
        classes.push("selected");
      }
      if (today().getTime() === day.getTime() && !outside) classes.push("today");

      cells.push(
        '<button type="button" class="' + classes.join(" ") + '" role="gridcell"' +
        ' data-d="' + day.getDate() + '"' +
        ' data-m="' + (day.getMonth() + 1) + '"' +
        ' data-y="' + day.getFullYear() + '"' +
        ' aria-label="' + day.getDate() + " " + MONTHS[day.getMonth()] + " " + day.getFullYear() + '"' +
        (selected && classes.indexOf("selected") > -1 ? ' aria-selected="true"' : "") +
        (disabled ? " disabled" : "") + ">" + day.getDate() + "</button>"
      );
      /* Stop after a full final week so short months do not render a dead row. */
      if (!outside && day.getDay() === 0 && i >= 27) break;
    }

    grid.innerHTML = cells.join("");

    var atMin = cursor.getFullYear() === limits.min.getFullYear() &&
      cursor.getMonth() === limits.min.getMonth();
    var atMax = limits.hasMax &&
      cursor.getFullYear() === limits.max.getFullYear() &&
      cursor.getMonth() === limits.max.getMonth();

    wrap.querySelector('[data-cal="prev"]').disabled = atMin;
    wrap.querySelector('[data-cal="next"]').disabled = atMax;
  }

  /* The popup is position:fixed, so it needs real coordinates. Prefer the space
     below the field, flip above when that is too tight, and keep it inside
     the viewport horizontally. */
  function placeCalendar(wrap) {
    var cal = wrap.querySelector(".fb-cal");
    if (!cal) return;

    var anchor = wrap.getBoundingClientRect();
    var gap = 6;
    var height = cal.offsetHeight;
    var width = cal.offsetWidth;
    var vh = window.innerHeight;
    var vw = window.innerWidth;

    var below = vh - anchor.bottom - gap;
    var above = anchor.top - gap;
    var flip = height > below && above > below;

    var top = flip ? anchor.top - height - gap : anchor.bottom + gap;
    /* If neither side fully fits, pin it to whichever edge has more room. */
    if (height > below && height > above) {
      top = Math.max(gap, Math.min(anchor.bottom + gap, vh - height - gap));
    }

    var left = anchor.left;
    if (left + width > vw - gap) left = vw - width - gap;
    if (left < gap) left = gap;

    cal.style.top = Math.round(Math.max(gap, top)) + "px";
    cal.style.left = Math.round(left) + "px";
  }

  function closeCalendar() {
    if (!openCalendar) return;
    var wrap = openCalendar;
    var cal = wrap.querySelector(".fb-cal");
    var btn = wrap.querySelector(".fb-date-btn");
    cal.hidden = true;
    if (btn) btn.setAttribute("aria-expanded", "false");
    wrap.classList.remove("open");
    openCalendar = null;
  }

  function openCalFor(wrap) {
    if (openCalendar && openCalendar !== wrap) closeCalendar();
    if (openCalendar === wrap) return;

    openCalendar = wrap;
    var cal = wrap.querySelector(".fb-cal");
    cal.hidden = false;
    cal.removeAttribute("data-y");
    cal.removeAttribute("data-m");
    var btn = wrap.querySelector(".fb-date-btn");
    if (btn) btn.setAttribute("aria-expanded", "true");
    wrap.classList.add("open");
    paintCalendar(wrap);
    placeCalendar(wrap);

    var day = cal.querySelector(".fb-cal-day.selected") ||
      cal.querySelector(".fb-cal-day:not(.outside):not([disabled])");
    if (day) day.focus();
  }

  function closeAndSettle(input) {
    var card = input.closest(".fb-pax");
    var ok = validateInput(input);
    if (card) updateTravellerState(card);
    return ok;
  }

  /* =============================================================
     Validation
     ============================================================= */
  var NAME_RE = /^[A-Za-z][A-Za-z\s'.-]*$/;
  var DATE_RE = /^(\d{2})\s*\/\s*(\d{2})\s*\/\s*(\d{4})$/;
  var ALNUM_RE = /^[A-Za-z0-9]{5,15}$/;

  function setError(input, message) {
    var wrap = input.closest(".fb-field");
    var box = wrap ? wrap.querySelector(".fb-error") : null;
    input.classList.add("is-invalid");
    input.classList.remove("is-valid");
    if (box) {
      box.classList.add("show");
      box.querySelector("span").textContent = message;
    }
    return false;
  }

  function clearError(input) {
    var wrap = input.closest(".fb-field");
    var box = wrap ? wrap.querySelector(".fb-error") : null;
    input.classList.remove("is-invalid");
    if (input.value.trim()) input.classList.add("is-valid");
    if (box) box.classList.remove("show");
    return true;
  }

  function ageFromDob(value) {
    var m = DATE_RE.exec(value.trim());
    if (!m) return null;
    var day = Number(m[1]);
    var month = Number(m[2]);
    var year = Number(m[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    var dob = new Date(year, month - 1, day);
    if (dob.getMonth() !== month - 1 || dob.getDate() !== day) return null;
    var flightDate = FLIGHT_DATE;
    var age = flightDate.getFullYear() - year;
    if (
      flightDate.getMonth() < month - 1 ||
      (flightDate.getMonth() === month - 1 && flightDate.getDate() < day)
    ) {
      age -= 1;
    }
    return age;
  }

  function validateInput(input) {
    var value = (input.value || "").trim();
    var name = input.name;

    if (!value) {
      return input.required
        ? setError(input, "This field is required.")
        : clearError(input);
    }

    if (name === "dob") {
      if (!DATE_RE.test(value)) {
        return setError(input, "Use the format DD / MM / YYYY.");
      }
      if (ageFromDob(value) === null) {
        return setError(input, "That date does not exist.");
      }
      return clearError(input);
    }

    if (name === "docexp") {
      if (!DATE_RE.test(value)) {
        return setError(input, "Use the format DD / MM / YYYY.");
      }
      var m = DATE_RE.exec(value);
      var exp = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
      var flight = FLIGHT_DATE;
      var monthsLeft =
        (exp.getFullYear() - flight.getFullYear()) * 12 +
        (exp.getMonth() - flight.getMonth());
      if (monthsLeft < 6) {
        return setError(
          input,
          "Must be valid for at least 6 months after travel."
        );
      }
      return clearError(input);
    }

    if (name === "docno" && !ALNUM_RE.test(value)) {
      return setError(input, "Enter a valid document number.");
    }

    if ((name === "given" || name === "surname") && !NAME_RE.test(value)) {
      return setError(input, "Use letters only, as shown on the passport.");
    }

    if (name === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      return setError(input, "Enter a valid email address.");
    }

    if (name === "phone" && value.replace(/\D/g, "").length < 7) {
      return setError(input, "Enter a valid mobile number.");
    }

    return clearError(input);
  }

  /* Calendar controls live inside the traveller card but are not part of the
     form, so every selector that walks the fields has to step over them. */
  function isFormField(el) {
    return !el.closest(".fb-cal");
  }

  function validateTraveller(card) {
    var ok = true;
    card.querySelectorAll(".fb-pax-body input, .fb-pax-body select").forEach(
      function (input) {
        if (!isFormField(input)) return;
        if (!input.required && !input.value.trim()) {
          clearError(input);
          return;
        }
        if (!validateInput(input)) ok = false;
      }
    );
    return ok;
  }

  function updateTravellerState(card) {
    var nameEl = card.querySelector('[data-role="name"]');
    var hintEl = card.querySelector('[data-role="hint"]');
    var flagEl = card.querySelector('[data-role="flag"]');

    var given = card.querySelector('[name="given"]');
    var surname = card.querySelector('[name="surname"]');
    var dob = card.querySelector('[name="dob"]');
    var title = card.querySelector('[name="title"]');
    var fallback = card.querySelector(".fb-pax-name").textContent.trim();
    var type = card.dataset.type;

    var nameParts = [];
    if (title && title.value) nameParts.push(title.value + ".");
    if (given && given.value.trim()) nameParts.push(given.value.trim());
    if (surname && surname.value.trim()) nameParts.push(surname.value.trim());

    var fullName = nameParts.join(" ");
    nameEl.textContent = fullName || fallback;

    var required = Array.prototype.slice
      .call(card.querySelectorAll(".fb-pax-body [required]"))
      .filter(function (el) {
        return el.value.trim() !== "";
      }).length;
    var total = card.querySelectorAll(".fb-pax-body [required]").length;
    var filled = required === total && total > 0;

    if (type === "Infant") {
      hintEl.textContent = "Infant · Born " + (dob && dob.value.trim() ? dob.value.trim() : "—");
    } else {
      hintEl.textContent = fullName
        ? required + " of " + total + " fields · " + type
        : "Enter pax details";
    }

    flagEl.className = "fb-pax-flag " + (filled ? "complete" : "incomplete");
    flagEl.textContent = filled ? "Complete" : "Incomplete";
    return filled;
  }

  /* =============================================================
     Fare summary
     ============================================================= */
  function renderFare() {
    var counts = { Adult: 0, Child: 0, Infant: 0 };
    TRAVELLERS.forEach(function (t) {
      counts[t.type] += 1;
    });

    var baseTotal = 0;
    var taxTotal = 0;
    var adultSubtotal = 0;

    var rows = TRAVELLERS.map(function (t) {
      var fare = FARE[t.type.toLowerCase()];
      var line = fare.base + fare.tax;
      baseTotal += fare.base;
      taxTotal += fare.tax;
      if (t.type === "Adult") adultSubtotal += line;

      return (
        '<div class="fb-brk-row">' +
        '<span class="fb-brk-name"><b>' + esc(t.label) + "</b>" +
        '<span class="fb-brk-sub">Base ' + money(fare.base) +
        " · Tax " + money(fare.tax) + "</span></span>" +
        '<span class="fb-brk-amt">' + money(line) + "</span>" +
        "</div>"
      );
    }).join("");

    var grand = baseTotal + taxTotal;
    var totalTravellers = TRAVELLERS.length;

    var summary =
      '<div class="fb-card">' +
      '<div class="fb-card-body">' +
      '<h2 class="fb-side-title">Fare summary</h2>' +
      '<p class="fb-side-sub">' +
      esc(FLIGHT.tripType) + " · " + esc(FLIGHT.cabin) + " · all prices in PKR" +
      "</p>" +

      '<div class="fb-selected">' +
      '<div class="fb-selected-label">Selected travellers · ' + totalTravellers + "</div>" +
      '<div class="fb-selected-text">' +
      counts.Adult + " adult" + (counts.Adult === 1 ? "" : "s") +
      (counts.Child ? ", " + counts.Child + " child" + (counts.Child === 1 ? "" : "ren") : "") +
      (counts.Infant ? ", " + counts.Infant + " infant" + (counts.Infant === 1 ? "" : "s") : "") +
      " · refundable up to 24 hours before departure" +
      "</div></div>" +

      '<div class="fb-breakdown-head">Per traveller breakdown</div>' +
      rows +

      '<div class="fb-brk-row sub">' +
      '<span class="fb-brk-name">Adult subtotal</span>' +
      '<span class="fb-brk-amt">' + money(adultSubtotal) + "</span>" +
      "</div>" +

      '<div class="fb-breakdown-head" style="margin-top:16px">Booking total · all ' +
      totalTravellers + " travellers</div>" +
      '<div class="fb-brk-row"><span class="fb-brk-name">Base fares</span>' +
      '<span class="fb-brk-amt">' + money(baseTotal) + "</span></div>" +
      '<div class="fb-brk-row"><span class="fb-brk-name">Taxes and fees</span>' +
      '<span class="fb-brk-amt">' + money(taxTotal) + "</span></div>" +

      '<div class="fb-grand">' +
      '<div class="fb-grand-total">' + money(grand) + "</div>" +
      '<div class="fb-grand-note">Taxes and fees included · payable now · ' +
      '<a href="/contact-us.html#faq">fare rules</a></div>' +
      "</div>" +

      '<p class="fb-hint-block">' +
      "Infants travel on an accompanying adult's ticket and do not receive a seat." +
      "</p>" +

      "</div></div>";

    return { html: summary, grand: grand, totalTravellers: totalTravellers };
  }

  /* =============================================================
     Boot
     ============================================================= */
  var itineraryHost = document.getElementById("fbItinerary");
  var paxHost = document.getElementById("fbTravellers");
  var sideHost = document.getElementById("fbSide");
  var stickyTotal = document.getElementById("fbStickyTotal");
  var continueBtn = document.getElementById("fbConfirm");
  var reviewNote = document.getElementById("fbReviewNote");

  itineraryHost.innerHTML = renderItinerary();
  paxHost.innerHTML = TRAVELLERS.map(travellerHtml).join("");

  function paintFare() {
    var fare = renderFare();
    sideHost.innerHTML = fare.html + renderHandCard();
    stickyTotal.textContent = money(fare.grand);
    continueBtn.innerHTML =
      "Confirm and review · " + fare.totalTravellers;
    reviewNote.textContent =
      "Complete all " + fare.totalTravellers +
      " traveller" + (fare.totalTravellers === 1 ? "" : "s") +
      " to continue. Review itinerary details and price.";
  }

  function renderHandCard() {
    return (
      '<div class="fb-card"><div class="fb-card-body">' +
      '<div class="fb-hand">' +
      '<div class="fb-hand-icon">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
      '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
      "</div>" +
      "<div><h4>Need a hand?</h4>" +
      "<p>Our booking team can help with traveller details and ticket issues.</p></div>" +
      "</div>" +
      '<a class="fb-btn" href="/contact-us.html">' +
      "Contact booking support" +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
      '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>' +
      "</a>" +
      "</div></div>"
    );
  }

  paintFare();

  /* Sticky bar appears once the continue card scrolls into view */
  var stickyBar = document.getElementById("fbSticky");
  if (stickyBar && "IntersectionObserver" in window) {
    var sentinel = document.getElementById("fbContinue");
    new IntersectionObserver(
      function (entries) {
        /* The review screen hides the form, so the sentinel reports
           "not intersecting" there; the bar must stay down regardless. */
        if (review && review.classList.contains("show")) {
          stickyBar.classList.remove("show");
          return;
        }
        entries.forEach(function (entry) {
          /* Hide the sticky bar while the real button is on screen */
          stickyBar.classList.toggle("show", !entry.isIntersecting);
        });
      },
      { threshold: 0 }
    ).observe(sentinel);
  } else if (stickyBar) {
    stickyBar.classList.add("show");
  }

  /* ---------------- Accordion ---------------- */
  paxHost.addEventListener("click", function (e) {
    var head = e.target.closest(".fb-pax-head");
    if (!head) return;
    var card = head.parentElement;
    var open = !card.classList.contains("open");
    card.classList.toggle("open", open);
    head.setAttribute("aria-expanded", String(open));
    if (open) {
      var first = card.querySelector(".fb-pax-body input");
      if (first) first.focus();
    }
  });

  /* ---------------- Date masks (DD / MM / YYYY) ---------------- */
  paxHost.addEventListener("input", function (e) {
    var input = e.target;
    if (!input.matches('input[name="dob"], input[name="docexp"]')) return;

    /* Remember where the caret sat, measured in digits, so the added
       separators do not drag it out of position. */
    var before = input.value.slice(0, input.selectionStart || 0);
    var caretDigits = before.replace(/\D/g, "").length;

    var digits = input.value.replace(/\D/g, "").slice(0, 8);
    var out = digits;
    if (digits.length > 4) {
      out = digits.slice(0, 2) + " / " + digits.slice(2, 4) + " / " + digits.slice(4);
    } else if (digits.length > 2) {
      out = digits.slice(0, 2) + " / " + digits.slice(2);
    }
    input.value = out;

    /* Put the caret after the same digit it was on. */
    var seen = 0;
    var pos = out.length;
    for (var i = 0; i < out.length; i++) {
      if (/\d/.test(out[i])) {
        seen += 1;
        if (seen > caretDigits) {
          pos = i;
          break;
        }
      }
    }
    input.setSelectionRange(pos, pos);

    /* Refresh the grid so it tracks what is being typed. */
    if (openCalendar === input.closest(".fb-date")) paintCalendar(openCalendar);
  });

  /* Enter in a date field commits the value and closes the grid. */
  paxHost.addEventListener("keydown", function (e) {
    var input = e.target;
    if (!input.matches('input[name="dob"], input[name="docexp"]')) return;
    if (e.key === "Enter") {
      e.preventDefault();
      closeAndSettle(input);
      closeCalendar();
    }
  });

  /* ---------------- Calendar: open, navigate, pick ---------------- */
  paxHost.addEventListener("change", function (e) {
    var pick = e.target.closest(".fb-cal-month, .fb-cal-year");
    if (!pick) return;
    var wrap = pick.closest(".fb-date");
    var cal = wrap.querySelector(".fb-cal");
    var year = pick.classList.contains("fb-cal-year")
      ? Number(pick.value)
      : Number(cal.dataset.y);
    var month = pick.classList.contains("fb-cal-month")
      ? Number(pick.value)
      : Number(cal.dataset.m);
    cal.dataset.y = String(year);
    cal.dataset.m = String(month);
    paintCalendar(wrap);
    placeCalendar(wrap);
  });

  paxHost.addEventListener("click", function (e) {
    var btn = e.target.closest(".fb-date-btn");
    if (btn) {
      var wrap = btn.closest(".fb-date");
      if (openCalendar === wrap) {
        closeCalendar();
      } else {
        openCalFor(wrap);
      }
      return;
    }

    var nav = e.target.closest(".fb-cal-nav");
    if (nav) {
      var navWrap = nav.closest(".fb-date");
      var cal = navWrap.querySelector(".fb-cal");
      var y = Number(cal.dataset.y);
      var m = Number(cal.dataset.m) + (nav.dataset.cal === "next" ? 1 : -1);
      var shifted = new Date(y, m, 1);
      cal.dataset.y = String(shifted.getFullYear());
      cal.dataset.m = String(shifted.getMonth());
      paintCalendar(navWrap);
      placeCalendar(navWrap);
      /* Keep focus inside the grid after the month rolls over. */
      var landed = navWrap.querySelector(
        '[data-cal="' + nav.dataset.cal + '"]:not([disabled])'
      ) || nav;
      landed.focus();
      return;
    }

    var clear = e.target.closest('[data-cal="clear"]');
    if (clear) {
      var clearWrap = clear.closest(".fb-date");
      var clearInput = clearWrap.querySelector("input");
      clearInput.value = "";
      clearError(clearInput);
      updateTravellerState(clearInput.closest(".fb-pax"));
      paintCalendar(clearWrap);
      clearInput.focus();
      return;
    }

    var day = e.target.closest(".fb-cal-day");
    if (day && !day.disabled) {
      var dayWrap = day.closest(".fb-date");
      var dayInput = dayWrap.querySelector("input");
      writeDate(
        dayInput,
        new Date(Number(day.dataset.y), Number(day.dataset.m) - 1, Number(day.dataset.d))
      );
      closeCalendar();
      dayInput.focus();
      closeAndSettle(dayInput);
    }
  });

  /* Arrow keys page through the grid when a day has focus. */
  paxHost.addEventListener("keydown", function (e) {
    var day = e.target.closest(".fb-cal-day");
    if (!day) return;

    var step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (step === undefined) {
      if (e.key === "Escape") {
        var owner = openCalendar && openCalendar.querySelector("input");
        closeCalendar();
        if (owner) owner.focus();
      }
      return;
    }

    e.preventDefault();
    var grid = day.parentElement;
    var all = Array.prototype.slice.call(grid.querySelectorAll(".fb-cal-day"));
    var index = all.indexOf(day);
    var next = all[index + step];
    if (next && !next.disabled) {
      next.focus();
    }
  });

  /* Close on outside click and on Escape. */
  document.addEventListener("click", function (e) {
    if (openCalendar && !openCalendar.contains(e.target)) closeCalendar();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && openCalendar) {
      closeCalendar();
    }
  });

  /* A collapsed accordion must not leave its calendar hanging open. */
  paxHost.addEventListener("click", function (e) {
    var head = e.target.closest(".fb-pax-head");
    if (!head) return;
    var closing = head.parentElement.classList.contains("open");
    if (closing && openCalendar && head.parentElement.contains(openCalendar)) {
      closeCalendar();
    }
  });

  /* Scroll or resize can strand the popup; close rather than misplace it. */
  window.addEventListener("resize", function () {
    if (openCalendar) closeCalendar();
  });

  /* ---------------- Copy a saved traveller ---------------- */
  paxHost.addEventListener("change", function (e) {
    var select = e.target;
    if (select.name !== "together") return;

    var card = select.closest(".fb-pax");
    var targetLabel = select.value;
    if (!targetLabel) return;

    var source = null;
    TRAVELLERS.forEach(function (t) {
      if (t.label === targetLabel) {
        source = document.getElementById("pax" + t.id);
      }
    });
    if (!source) return;

    ["Title", "Gender", "Given", "Surname", "Nationality"].forEach(function (key) {
      var from = source.querySelector('[name="' + key.toLowerCase() + '"]');
      var to = card.querySelector('[name="' + key.toLowerCase() + '"]');
      if (from && to && from.value) {
        to.value = from.value;
        clearError(to);
      }
    });

    var dobFrom = source.querySelector('[name="dob"]');
    var dobTo = card.querySelector('[name="dob"]');
    if (dobFrom && dobTo && dobFrom.value) {
      dobTo.value = dobFrom.value;
      clearError(dobTo);
    }

    updateTravellerState(card);
    select.value = "";
  });

  /* ---------------- Live state + validation ---------------- */
  function onFieldEvent(e) {
    var input = e.target;
    if (!input.matches("input, select")) return;
    if (!isFormField(input)) return;

    if (input.matches(".fb-pax-body input, .fb-pax-body select")) {
      if (input.classList.contains("is-invalid") || e.type === "blur") {
        validateInput(input);
      }
      var card = input.closest(".fb-pax");
      if (card) updateTravellerState(card);
    }

    if (input.name === "email" || input.name === "phone") {
      if (e.type === "blur" || input.classList.contains("is-invalid")) {
        validateInput(input);
      }
    }
  }

  paxHost.addEventListener("input", onFieldEvent);
  paxHost.addEventListener("blur", onFieldEvent, true);
  paxHost.addEventListener("change", onFieldEvent);

  /* ---------------- Contact details ---------------- */
  var phoneSelect = document.getElementById("fbPhoneCode");
  var phoneInput = document.getElementById("fbPhone");
  var emailInput = document.getElementById("fbEmail");

  if (phoneSelect) {
    phoneSelect.addEventListener("change", function () {
      phoneInput.placeholder = "Mobile number (" + phoneSelect.value + ")";
      if (phoneInput.value.trim()) validateInput(phoneInput);
    });
  }

  [emailInput, phoneInput].forEach(function (input) {
    if (!input) return;
    input.addEventListener("blur", function () {
      validateInput(input);
    });
    input.addEventListener("input", function () {
      if (input.classList.contains("is-invalid")) validateInput(input);
    });
  });

  /* Contact-card toggle chips (SMS updates, insurance) */
  app.addEventListener("click", function (e) {
    var chip = e.target.closest(".fb-chip");
    if (!chip) return;
    chip.classList.toggle("active");
    chip.setAttribute("aria-pressed", String(chip.classList.contains("active")));
  });

  /* ---------------- Confirm ---------------- */
  function collectTravellers() {
    return TRAVELLERS.map(function (t) {
      var card = document.getElementById("pax" + t.id);
      var get = function (name) {
        var el = card.querySelector('[name="' + name + '"]');
        return el ? el.value.trim() : "";
      };
      var dob = get("dob");
      var age = ageFromDob(dob);
      return {
        id: t.id,
        label: t.label,
        type: t.type,
        title: get("title"),
        given: get("given"),
        surname: get("surname"),
        fullName: [get("title"), get("given"), get("surname")]
          .filter(Boolean)
          .join(" "),
        gender: get("gender"),
        nationality: get("nationality"),
        dob: dob,
        age: age,
        docType: get("doctype"),
        docNo: get("docno"),
        docExp: get("docexp"),
        guardian: get("guardian"),
        meal: get("meal"),
        card: card,
      };
    });
  }

  /* ---------------- Review & pay ---------------- */
  var review = document.getElementById("fbReview");
  var reviewBody = document.getElementById("fbReviewBody");
  var reviewTotal = document.getElementById("fbReviewTotal");
  var reviewTerms = document.getElementById("fbReviewTerms");
  var payNow = document.getElementById("fbPayNow");

  /* One line per traveller, grouped so a mismatch is easy to spot. */
  function reviewTravellerHtml(p) {
    var ageLine = p.age === null ? "" : " · " + p.age + " yrs";
    return (
      '<div class="fb-rev-pax">' +
      '<div class="fb-rev-pax-head">' +
      '<span class="fb-rev-avatar">' + p.id + "</span>" +
      "<div>" +
      '<div class="fb-rev-name">' + esc(p.fullName || p.label) + "</div>" +
      '<div class="fb-rev-sub">' + esc(p.type) + esc(ageLine) + "</div>" +
      "</div>" +
      '<button type="button" class="fb-rev-edit" data-edit-pax="' + p.id + '">Edit</button>' +
      "</div>" +
      '<dl class="fb-rev-grid">' +
      row("Date of birth", p.dob || "—") +
      row("Gender", p.gender || "—") +
      row("Nationality", p.nationality || "—") +
      row("Travel document", p.docType || "—") +
      row("Document number", p.docNo || "—") +
      row("Document expiry", p.docExp || "—") +
      (p.guardian ? row("Accompanying adult", p.guardian) : "") +
      (p.meal && p.meal.indexOf("Select") !== 0 ? row("Meal preference", p.meal) : "") +
      "</dl>" +
      "</div>"
    );
  }

  function row(label, value) {
    return (
      "<div><dt>" + esc(label) + "</dt><dd>" + esc(value) + "</dd></div>"
    );
  }

  function reviewItineraryHtml() {
    var legs = FLIGHT.legs
      .map(function (leg, index) {
        return (
          '<div class="fb-rev-leg">' +
          '<div class="fb-rev-leg-no">' + (index + 1) + "</div>" +
          "<div>" +
          '<div class="fb-rev-leg-route">' +
          esc(leg.from.code) + " → " + esc(leg.to.code) +
          "</div>" +
          '<div class="fb-rev-leg-sub">' +
          esc(leg.from.city) + " → " + esc(leg.to.city) + " · " +
          esc(leg.depart) + " – " + esc(leg.arrive) +
          "</div>" +
          '<div class="fb-rev-leg-sub">' +
          esc(leg.flightNo) + " · " + esc(leg.airline) +
          (leg.layover ? " · " + esc(leg.badge) : "") +
          "</div>" +
          "</div>" +
          "</div>"
        );
      })
      .join("");

    return (
      '<section class="fb-card">' +
      '<div class="fb-card-head">' +
      '<h2 class="fb-card-title">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
      '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>' +
      "</svg>" +
      "Your itinerary" +
      "</h2>" +
      '<span class="fb-link">' + esc(FLIGHT.tripType) + " · " + esc(FLIGHT.cabin) + "</span>" +
      "</div>" +
      '<div class="fb-card-body">' +
      '<div class="fb-rev-route">' +
      FLIGHT.legs
        .map(function (leg) {
          return esc(leg.from.code);
        })
        .concat([esc(FLIGHT.legs[FLIGHT.legs.length - 1].to.code)])
        .join(' <span aria-hidden="true">→</span> ') +
      "</div>" +
      '<p class="fb-rev-when">' + esc(FLIGHT.dateLabel) + " · " +
      esc(FLIGHT.totalDuration) + " total</p>" +
      legs +
      "</div>" +
      "</section>"
    );
  }

  function renderReview(list, fare) {
    var email = document.getElementById("fbEmail").value.trim();

    reviewBody.innerHTML =
      '<section class="fb-card">' +
      '<div class="fb-card-head">' +
      '<h2 class="fb-card-title">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
      '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>' +
      '<circle cx="9" cy="7" r="4"/>' +
      '<path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>' +
      "</svg>" +
      "Traveller details" +
      "</h2>" +
      '<button type="button" class="fb-link" id="fbEditAll">Edit all</button>' +
      "</div>" +
      '<div class="fb-card-body">' +
      '<div class="fb-rev-pax-list">' +
      list.map(reviewTravellerHtml).join("") +
      "</div>" +
      '<div class="fb-rev-contact">' +
      row("Email", email || "—") +
      row("Mobile", (document.getElementById("fbPhoneCode").value + " " +
        document.getElementById("fbPhone").value.trim()).trim() || "—") +
      "</div>" +
      "</div>" +
      "</section>" +
      reviewItineraryHtml();

    reviewTotal.innerHTML =
      '<div class="fb-grand">' +
      '<div class="fb-grand-total">' + money(fare.grand) + "</div>" +
      '<div class="fb-grand-note">' + fare.totalTravellers +
      " travellers · taxes and fees included</div>" +
      "</div>";

    var editAll = document.getElementById("fbEditAll");
    if (editAll) editAll.addEventListener("click", backToForm);
  }

  function showReview(list, fare) {
    closeCalendar();
    renderReview(list, fare);
    app.style.display = "none";
    review.classList.add("show");
    /* The sticky bar belongs to the form step; leaving it up would put a
       second "Confirm and review" over the review screen. */
    if (stickyBar) stickyBar.classList.remove("show");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function backToForm() {
    closeCalendar();
    review.classList.remove("show");
    app.style.display = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* Delegated on document: #fbStickyConfirm lives outside #fbApp */
  document.addEventListener("click", function (e) {
    var button = e.target.closest("#fbConfirm, #fbStickyConfirm");
    if (!button) return;

    var firstBad = null;

    /* Validate every traveller so all errors show at once, then jump
       to the first thing that needs attention. */
    collectTravellers().forEach(function (p) {
      var ok = validateTraveller(p.card);
      var complete = updateTravellerState(p.card);
      if (!ok && !firstBad) {
        firstBad = p.card.querySelector(".is-invalid");
      }
      if (firstBad === null && !complete) {
        firstBad = p.card.querySelector(".fb-pax-body [required]");
      }
    });

    var email = document.getElementById("fbEmail");
    var phone = phoneInput;
    var emailOk = validateInput(email);
    var phoneOk = validateInput(phone);
    if (!emailOk && !firstBad) firstBad = email;
    if (!phoneOk && !firstBad) firstBad = phone;

    var terms = document.getElementById("fbTerms");
    var termsBox = terms.closest(".fb-check").parentElement;
    var termsError = termsBox.querySelector(".fb-error");
    if (!terms.checked) {
      if (termsError) {
        termsError.classList.add("show");
        termsError.querySelector("span").textContent =
          "Please confirm the traveller details before continuing.";
      }
      if (!firstBad) firstBad = terms;
    } else if (termsError) {
      termsError.classList.remove("show");
    }

    if (firstBad) {
      var card = firstBad.closest(".fb-pax");
      if (card && !card.classList.contains("open")) {
        card.classList.add("open");
        card.querySelector(".fb-pax-head").setAttribute("aria-expanded", "true");
      }
      firstBad.focus();
      firstBad.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    showReview(collectTravellers(), renderFare());
  });

  /* ---------------- Save traveller ---------------- */
  var saveBtn = document.getElementById("fbSave");
  if (saveBtn) {
    saveBtn.addEventListener("click", function () {
      saveBtn.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
        '<polyline points="20 6 9 17 4 12"/></svg> Saved to your account';
      saveBtn.setAttribute("disabled", "disabled");
    });
  }

  /* ---------------- Back out of the review screen ---------------- */
  [document.getElementById("fbReviewBack"),
   document.getElementById("fbReviewEdit")].forEach(function (btn) {
    if (!btn) return;
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      backToForm();
    });
  });

  /* Per-traveller Edit sends the user back and opens that accordion. */
  review.addEventListener("click", function (e) {
    var edit = e.target.closest("[data-edit-pax]");
    if (!edit) return;
    var id = edit.dataset.editPax;
    backToForm();
    var card = document.getElementById("pax" + id);
    if (card) {
      card.classList.add("open");
      card.querySelector(".fb-pax-head").setAttribute("aria-expanded", "true");
      card.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });

  /* ---------------- Booking held modal ---------------- */
  var modal = document.getElementById("fbModal");
  var timerId = null;

  function bookingRef() {
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    var out = "";
    for (var i = 0; i < 6; i++) {
      out += chars[Math.floor(Math.random() * chars.length)];
    }
    return "SM" + out;
  }

  function openModal() {
    document.getElementById("fbModalRef").textContent = bookingRef();
    document.getElementById("fbModalEmail").textContent =
      document.getElementById("fbEmail").value.trim() || "you";

    modal.hidden = false;
    document.body.classList.add("fb-modal-open");

    var back = document.getElementById("fbModalBack");
    if (back) back.focus();

    /* The fare is held for 20 minutes; count it down from the moment the
       popup opens so the number the user reads is the real one. */
    var remaining = 20 * 60;
    var out = document.getElementById("fbModalTimer");
    clearInterval(timerId);
    out.textContent = "20:00";
    timerId = setInterval(function () {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(timerId);
        out.textContent = "Expired";
        return;
      }
      var mm = ("0" + Math.floor(remaining / 60)).slice(-2);
      var ss = ("0" + (remaining % 60)).slice(-2);
      out.textContent = mm + ":" + ss;
    }, 1000);
  }

  function closeModal() {
    modal.hidden = true;
    document.body.classList.remove("fb-modal-open");
    clearInterval(timerId);
    timerId = null;
    if (payNow) payNow.focus();
  }

  if (payNow) {
    payNow.addEventListener("click", function () {
      var box = reviewTerms.closest(".fb-check").parentElement;
      var error = box.querySelector(".fb-error");
      if (!reviewTerms.checked) {
        if (error) {
          error.classList.add("show");
          error.querySelector("span").textContent =
            "Please accept the fare rules before paying.";
        }
        reviewTerms.focus();
        return;
      }
      if (error) error.classList.remove("show");
      openModal();
    });
  }

  /* Backdrop, close button and Escape all dismiss. */
  modal.addEventListener("click", function (e) {
    if (e.target.closest("[data-modal-close]")) closeModal();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (!modal.hidden) {
      closeModal();
      return;
    }
    if (openCalendar) closeCalendar();
  });

  /* Keep the keyboard inside the dialog while it is open. */
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Tab" || modal.hidden) return;
    var focusable = modal.querySelectorAll(
      "a[href], button:not([disabled])"
    );
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  var modalBack = document.getElementById("fbModalBack");
  if (modalBack) {
    modalBack.addEventListener("click", function () {
      closeModal();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
})();