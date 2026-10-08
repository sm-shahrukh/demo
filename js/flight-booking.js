/* ==========================================================================
   FLIGHT BOOKING FLOW
   --------------------------------------------------------------------------
   Five screens on one page:

     1. details   Traveler details   — contact + 8 traveler accordions
     2. addons    Baggage & seats    — baggage options + seat map
     3. review    Review add-ons     — what was selected, by whom, on which leg
     4. payment   Choose how to pay   — method, channel, totals, consent
     5. pending   Payment pending    — order ids, instructions, NPS

   Each screen renders into #bkScreen, the rail into #bkRail, and the shell
   (back link, title, subtitle, clock, steps) is refreshed by paintChrome().
   Navigation is a small state machine: go(step) re-renders and scrolls up.

   Prices come from FARE/ADDONS below and are formatted through money().
   ========================================================================== */

(function () {
  "use strict";

  var app = document.getElementById("bkApp");
  if (!app) return;

  /* =====================================================================
     DATA — replace with the POST /api/bookings/quote response
     ===================================================================== */

  /* legs stays flat and ordered by travel order, so existing index and .map()
     access keeps working. directions describes how those segments group into
     the two halves of the round trip — each `start` is an offset into legs.
     Nothing here should nest segments inside directions; that would break
     every consumer that walks legs directly. */
  var DEFAULT_FLIGHT = {
    destination: "London",
    tripType: "Round trip",
    cabin: "Economy",
    totalDuration: "23h 50m",
    route: "Islamabad ⇄ London Heathrow",
    legs: [
      {
        airline: "Etihad Airways",
        flightNo: "EY303",
        from: { code: "ISB", city: "Islamabad" },
        to: { code: "AUH", city: "Abu Dhabi" },
        depart: "04:50",
        arrive: "07:10",
        duration: "3h 20m",
        tzFrom: "PKT UTC+5",
        tzTo: "GST UTC+4",
        seatsLeft: 4,
        baggage: "Checked baggage: 0 kg · Not included",
        cabinBag: "Cabin bag allowance: to confirm",
      },
      {
        airline: "Etihad Airways",
        flightNo: "EY63",
        from: { code: "AUH", city: "Abu Dhabi" },
        to: { code: "LHR", city: "London Heathrow" },
        depart: "08:05",
        arrive: "12:45",
        duration: "7h 40m",
        tzFrom: "GST UTC+4",
        tzTo: "BST UTC+1",
        seatsLeft: 4,
        baggage: "Checked baggage: 0 kg · Not included",
        cabinBag: "Aircraft and terminals to confirm with airline",
      },
      {
        airline: "Etihad Airways",
        flightNo: "EY64",
        from: { code: "LHR", city: "London Heathrow" },
        to: { code: "AUH", city: "Abu Dhabi" },
        depart: "09:30",
        arrive: "14:00",
        duration: "6h 30m",
        tzFrom: "BST UTC+1",
        tzTo: "GST UTC+4",
        seatsLeft: 4,
        baggage: "Checked baggage: 0 kg · Not included",
        cabinBag: "Aircraft and terminals to confirm with airline",
      },
      {
        airline: "Etihad Airways",
        flightNo: "EY304",
        from: { code: "AUH", city: "Abu Dhabi" },
        to: { code: "ISB", city: "Islamabad" },
        depart: "15:20",
        arrive: "18:35",
        duration: "3h 15m",
        tzFrom: "GST UTC+4",
        tzTo: "PKT UTC+5",
        seatsLeft: 4,
        baggage: "Checked baggage: 0 kg · Not included",
        cabinBag: "Cabin bag allowance: to confirm",
      },
    ],
    directions: [
      { id: "out", label: "Departing", from: "ISB", to: "LHR", start: 0, count: 2 },
      { id: "ret", label: "Returning", from: "LHR", to: "ISB", start: 2, count: 2 },
    ],
  };

  var bookingSelection = null;
  try {
    var storedSelection = sessionStorage.getItem(
      "smartmoves.bookingSelection",
    );
    if (storedSelection) bookingSelection = JSON.parse(storedSelection);
  } catch (error) {
    console.error("Could not read the selected itinerary.", error);
    window.alert(
      "Your saved flight selection could not be read. The demo itinerary will be shown instead.",
    );
  }

  function clockFromMinutes(minutes) {
    var value = ((minutes % 1440) + 1440) % 1440;
    return ("0" + Math.floor(value / 60)).slice(-2) +
      ":" + ("0" + (value % 60)).slice(-2);
  }

  function durationFromMinutes(minutes) {
    var hours = Math.floor(minutes / 60);
    var remainder = minutes % 60;
    return (hours ? hours + "h " : "") + remainder + "m";
  }

  function flightFromSelection(selection) {
    var sourceLegs = selection &&
      selection.itinerary &&
      selection.itinerary.legs;
    if (!Array.isArray(sourceLegs) || !sourceLegs.length) return null;

    var legs = [];
    var directions = [];
    var totalMinutes = 0;
    sourceLegs.forEach(function (journey, index) {
      if (!journey || !Array.isArray(journey.segments) ||
          !journey.segments.length) {
        throw new Error("The selected itinerary contains an empty flight leg.");
      }
      var start = legs.length;
      journey.segments.forEach(function (segment) {
        totalMinutes += segment.durationMin;
        legs.push({
          airline: segment.airline,
          flightNo: segment.flightNumber,
          from: segment.from,
          to: segment.to,
          depart: clockFromMinutes(segment.departAt),
          arrive: clockFromMinutes(segment.arriveAt),
          duration: durationFromMinutes(segment.durationMin),
          seatsLeft: 4,
          baggage: "Checked baggage: confirm with airline",
          cabinBag: "Cabin baggage allowance: confirm with airline",
        });
      });
      directions.push({
        id: index === 0 ? "out" : "leg-" + (index + 1),
        label: selection.tripType === "roundtrip"
          ? (index === 0 ? "Departing" : "Returning")
          : "Flight " + (index + 1),
        from: journey.origin.code,
        to: journey.destination.code,
        date: journey.date,
        start: start,
        count: legs.length - start,
      });
    });

    var first = sourceLegs[0];
    var last = sourceLegs[sourceLegs.length - 1];
    var cabin = selection.cabin || "Economy";
    return {
      destination: last.destination.city,
      tripType: selection.tripType === "roundtrip"
        ? "Round trip"
        : (selection.tripType === "multicity" ? "Multi-city" : "One way"),
      cabin: cabin.replace(/\b\w/g, function (letter) {
        return letter.toUpperCase();
      }),
      totalDuration: durationFromMinutes(totalMinutes),
      route: sourceLegs.map(function (journey) {
        return journey.origin.city + " → " + journey.destination.city;
      }).join(" · "),
      legs: legs,
      directions: directions,
    };
  }

  var FLIGHT = null;
  try {
    FLIGHT = bookingSelection ? flightFromSelection(bookingSelection) : null;
  } catch (error) {
    console.error("The selected itinerary could not be prepared.", error);
    window.alert(
      "Your selected flight details are invalid. The demo itinerary will be shown instead.",
    );
  }
  FLIGHT = FLIGHT || DEFAULT_FLIGHT;

  function directionOf(dir) {
    return FLIGHT.directions[dir] || FLIGHT.directions[0];
  }

  function dirSegments(dir) {
    var d = directionOf(dir);
    return FLIGHT.legs.slice(d.start, d.start + d.count);
  }

  function flightNos(dir) {
    return dirSegments(dir).map(function (l) { return l.flightNo; }).join(" + ");
  }

  /* The single segment a direction's seat map covers. Airlines sell one seat
     map per flight, not per coupon, so the connection is not mapped here —
     say so in the seat card rather than pretending the choice covers both. */
  function anchorLeg(dir) {
    return FLIGHT.legs[directionOf(dir).start];
  }

  /* Minutes between two "HH:MM" clock times, wrapping past midnight. */
  function minutesApart(from, to) {
    var a = Number(from.slice(0, 2)) * 60 + Number(from.slice(3, 5));
    var b = Number(to.slice(0, 2)) * 60 + Number(to.slice(3, 5));
    return b >= a ? b - a : b + 1440 - a;
  }

  function layoverLabel(mins) {
    var h = Math.floor(mins / 60);
    var m = mins % 60;
    return (h ? h + "h " : "") + m + "m";
  }

  /* Layover into a segment, or 0 when it is the first of its direction —
     derived from the times so it can never disagree with them. */
  function layoverInto(dir, offset) {
    var segs = dirSegments(dir);
    if (!offset) return 0;
    return minutesApart(segs[offset - 1].arrive, segs[offset].depart);
  }

  var DEFAULT_DATE = new Date(2026, 9, 14); // 14 Oct 2026, the demo date.

  function isoDate(d) {
    return d.getFullYear() + "-" +
      ("0" + (d.getMonth() + 1)).slice(-2) + "-" +
      ("0" + d.getDate()).slice(-2);
  }

  /* ?departure=YYYY-MM-DD arrives from js/flight-results.js. Anything
     unparseable falls back to the demo date rather than showing "Invalid". */
  var FLIGHT_DATE = (function () {
    var raw = new URLSearchParams(window.location.search).get("departure");
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw || "");
    if (!m) return DEFAULT_DATE;
    var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[3])) {
      return DEFAULT_DATE;
    }
    return d;
  })();

  var FLIGHT_DATE_ISO = isoDate(FLIGHT_DATE);
  var FLIGHT_DATE_LABEL = FLIGHT_DATE.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  var DEFAULT_RETURN_NIGHTS = 7;

  /* The return leg travels on its own date. js/flight-results.js only forwards
     ?departure= today, so the +7-day fallback is the normal path; an explicit
     ?return= wins when the results page is taught to send one. */
  var RETURN_DATE = (function () {
    var raw = new URLSearchParams(window.location.search).get("return");
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw || "");
    if (m) {
      var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      if (d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3])) {
        return d;
      }
    }
    var f = new Date(FLIGHT_DATE.getTime());
    f.setDate(f.getDate() + DEFAULT_RETURN_NIGHTS);
    return f;
  })();

  var RETURN_DATE_ISO = isoDate(RETURN_DATE);
  var RETURN_DATE_LABEL = RETURN_DATE.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  function dateLabelFor(dir) {
    var direction = FLIGHT.directions[dir];
    if (direction && direction.date) {
      var date = new Date(direction.date + "T00:00:00");
      return date.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }
    return dir === 0 ? FLIGHT_DATE_LABEL : RETURN_DATE_LABEL;
  }

  /* Per-type fare, split the way an airline quote does. The totals shown
     everywhere are summed from this, so changing TRAVELLERS keeps the
     arithmetic honest. */
  var FARE_SHARE = {
    Adult:  { base: 78570, tax: 19470, fee: 2500 },
    Child:  { base: 43830, tax: 10980, fee: 1990 },
    Infant: { base: 21220, tax:  5760, fee:  480 },
  };

  var DEFAULT_ADULT_FARE = FARE_SHARE.Adult.base +
    FARE_SHARE.Adult.tax + FARE_SHARE.Adult.fee;
  var selectedAdultFare = bookingSelection &&
    bookingSelection.fare &&
    Number(bookingSelection.fare.perAdultTotal);
  var fareScale = Number.isFinite(selectedAdultFare) && selectedAdultFare > 0
    ? selectedAdultFare / DEFAULT_ADULT_FARE
    : 1;

  function fareShareFor(type) {
    var share = FARE_SHARE[type];
    var tax = Math.round(share.tax * fareScale);
    var fee = Math.round(share.fee * fareScale);
    var total = Math.round((share.base + share.tax + share.fee) * fareScale);
    return { base: total - tax - fee, tax: tax, fee: fee };
  }

  var selectedFareName = bookingSelection &&
    bookingSelection.fare &&
    typeof bookingSelection.fare.packageName === "string"
    ? bookingSelection.fare.packageName
    : "";

  var TRAVELLERS = (function () {
    var counts = bookingSelection && bookingSelection.passengers;
    if (!counts) {
      return [
        { id: 1, type: "Adult", label: "Adult 1", flag: "🇵🇰", dob: "18 Feb 1998", doc: "4821" },
        { id: 2, type: "Child", label: "Child 1", flag: "🇵🇰", dob: "08 Jan 2018", doc: "4831" },
        { id: 3, type: "Infant", label: "Infant 1", flag: "🇵🇰", dob: "12 Mar 2025", doc: "4841" },
      ];
    }

    var travelers = [];
    [
      { type: "Adult", count: counts.adults, dob: "18 Feb 1998" },
      { type: "Child", count: counts.children, dob: "08 Jan 2018" },
      { type: "Infant", count: counts.infants, dob: "12 Mar 2025" },
    ].forEach(function (group) {
      var count = Number.isInteger(group.count)
        ? Math.min(9, Math.max(0, group.count))
        : 0;
      for (var index = 1; index <= count; index += 1) {
        travelers.push({
          id: travelers.length + 1,
          type: group.type,
          label: group.type + " " + index,
          flag: "🇵🇰",
          dob: group.dob,
          doc: String(4820 + travelers.length + 1),
        });
      }
    });
    return travelers.length ? travelers : [
      { id: 1, type: "Adult", label: "Adult 1", flag: "🇵🇰", dob: "18 Feb 1998", doc: "4821" },
    ];
  })();

  var FARE = (function () {
    var base = 0;
    var taxes = 0;
    var serviceFee = 0;
    TRAVELLERS.forEach(function (t) {
      var share = fareShareFor(t.type);
      base += share.base;
      taxes += share.tax;
      serviceFee += share.fee;
    });
    return { base: base, taxes: taxes, serviceFee: serviceFee };
  })();

  function travellerTotal(t) {
    var share = fareShareFor(t.type);
    return share.base + share.tax + share.fee;
  }

  var ADULT_TRAVELLERS = TRAVELLERS.filter(function (t) {
    return t.type === "Adult";
  });

  function passengerCount(type) {
    return TRAVELLERS.filter(function (traveler) {
      return traveler.type === type;
    }).length;
  }

  function passengerLabel(type, plural) {
    var count = passengerCount(type);
    return count + " " + (count === 1 ? type.toLowerCase() : plural);
  }

  var NATIONALITIES = [
    "Pakistani", "Saudi Arabian", "Emirati", "Qatari", "British",
    "American", "Canadian", "Malaysian", "Bangladeshi", "Indian",
    "Turkish", "Other",
  ];

  var TITLES = ["Mr", "Mrs", "Ms", "Miss", "Dr"];

  var PHONE_CODES = ["+92 PK", "+971 AE", "+966 SA", "+44 UK", "+1 US"];

  /* Priced per traveler, per flight — a round trip charges twice. No `desc`
     here: it is built at render time from the active traveler and direction,
     because a fixed string would keep naming one flight forever.

     `bag0` is a real, selectable card rather than the absence of a choice: an
     adult who wants no extra baggage should be able to leave it alone and
     still see a confirmed answer, instead of leaving the panel looking
     un-answered. It is pre-selected (see DEFAULT_BAG / DEFAULT_MEAL). */
  var BAGGAGE_OPTIONS = [
    { id: "bag0",  name: "Included with this fare", price: 0, free: true,  desc: "No extra checked bag" },
    { id: "bag10", name: "Extra 10 kg",            price: 22710, free: false, desc: "One additional checked bag" },
    { id: "bag15", name: "Extra 15 kg",            price: 33940, free: false, desc: "One additional checked bag" },
    { id: "bag23", name: "Extra 23 kg",            price: 51910, free: false, desc: "One additional checked bag" },
  ];

  /* Standard meals come with the fare; everything else is charged per flight.
     `none` lets a traveler decline a meal entirely — the carrier serves none
     by default, so "Skip meal" is the honest label for that. */
  var MEAL_OPTIONS = [
    { id: "none",   name: "No meal needed",   price: 0,    free: true,  desc: "Skip — nothing is served on this flight" },
    { id: "std",    name: "Standard meal",    price: 0,    free: true,  desc: "Hot main, bread, dessert, drink" },
    { id: "veg",    name: "Vegetarian",       price: 0,    free: true,  desc: "No meat or fish" },
    { id: "gfree",  name: "Gluten-free",      price: 0,    free: true,  desc: "Prepared on request" },
    { id: "halal",  name: "Halal",            price: 2500, free: false, desc: "Special request" },
    { id: "child",  name: "Child meal",       price: 1500, free: false, desc: "Smaller portions, ages 2–11" },
    { id: "lowsod", name: "Low sodium",       price: 2000, free: false, desc: "Reduced salt" },
    { id: "fruit",  name: "Fruit platter",    price: 3200, free: false, desc: "Seasonal fruit and cheese" },
  ];

  /* Baggage and a meal are pre-answered so the user is never blocked on
     something they don't want. A seat is NOT: every traveler has to be
     placed, so it stays empty until someone picks one (see SEAT_REQUIRED). */
  var DEFAULT_BAG = "bag0";
  var DEFAULT_MEAL = "none";

  var PAYMENT_METHODS = [
    {
      id: "card",
      name: "Debit / credit card",
      desc: "Visa, Mastercard and UnionPay accepted",
      icon: "card",
    },
    {
      id: "1bill",
      name: "1Bill bank transfer",
      desc: "Pay from any Pakistani bank or wallet",
      icon: "bank",
    },
    {
      id: "easypaisa",
      name: "Easypaisa",
      desc: "Pay from your Easypaisa wallet",
      icon: "wallet",
    },
    {
      id: "jazzcash",
      name: "JazzCash",
      desc: "Pay from your JazzCash mobile account",
      icon: "wallet",
    },
    {
      id: "bank",
      name: "Bank direct transfer",
      desc: "Transfer to our corporate account",
      icon: "bank",
    },
    {
      id: "gpay",
      name: "Google Pay",
      desc: "Pay with a saved card or bank account",
      icon: "phone",
    },
  ];

  var CONVENIENCE_FEE = { "1bill": 2070 };

  var CHANNELS = [
    { id: "mobile", name: "Mobile / internet banking", icon: "phone" },
    { id: "wallet", name: "Wallet bill payment", icon: "wallet" },
    { id: "atm", name: "ATM / over-counter", icon: "bank" },
  ];

  var STEPS = [
    { id: "details", name: "Booking" },
    { id: "addons", name: "Add-ons" },
    { id: "payment", name: "Payment" },
    { id: "pending", name: "Confirmation" },
  ];

  /* The review screen is a sub-step of add-ons, so it reuses step 2's
     position in the indicator. */
  var STEP_OF_SCREEN = {
    details: 0,
    addons: 1,
    review: 1,
    payment: 2,
    pending: 3,
  };

  function searchResultsHref() {
    var current = new URLSearchParams(window.location.search);
    var params = new URLSearchParams();
    [
      "trip",
      "from",
      "to",
      "departure",
      "return",
      "adults",
      "children",
      "infants",
      "cabin",
      "multiLegs",
    ].forEach(function (key) {
      if (current.has(key)) params.set(key, current.get(key));
    });
    if (!params.has("from") || !params.has("to")) {
      return "/search-flight.html";
    }
    return "/search-flight.html?" + params.toString();
  }

  /* Per-screen header copy. There is no sticky action bar; each screen renders
     its own forward-action button where the user needs it. */
  var SCREENS = {
    details: {
      title: "Traveler details",
      sub: "Save time, and you’re one step closer to " + FLIGHT.destination + ".",
      back: "Back to flight results",
      backHref: searchResultsHref(),
    },
    addons: {
      title: "Baggage & seats",
      sub: "Make the journey yours. Choose flight and flight a seat.",
      back: "Back to traveler details",
    },
    review: {
      title: "Review your selections",
      sub: "Check every extra before you continue to payment.",
      back: "Back to add-ons",
    },
    payment: {
      title: "Choose how to pay",
      sub: "Select a payment method. Your flight is not ticketed until payment clears.",
      back: "Back to review",
    },
    pending: {
      title: "Order created · Payment pending",
      sub: "Your order is ready. Complete payment to request ticket issuance.",
      back: "Manage booking",
    },
  };

  /* =====================================================================
     STATE
     ===================================================================== */

  var state = {
    screen: "details",
    openPax: 1, // first traveler starts expanded
    confirmed: {}, // id -> true once the "before you continue" boxes are ticked
    /* All three add-on maps are keyed "direction:travelerId" — see addonKey.
       Per direction, because a traveler can buy a 10 kg bag out and a 23 kg
       bag home; per traveler, because each one picks their own. */
    bag: {}, // "dir:travellerId" -> baggage option id
    meal: {}, // "dir:travellerId" -> meal option id
    seat: {}, // "dir:travellerId" -> seat code
    /* Every input's live value, keyed by element id. Screens re-render from
       scratch on each interaction, so anything the user typed has to be read
       back out of the DOM and replayed, or collapsing a traveler would empty
       their fields. */
    values: {},
    activeDir: 0, // 0 = Departing, 1 = Returning
    activePax: 1,
    method: "1bill",
    channel: "mobile",
    promo: null,
    rate: null,
  };

  /* Baggage and a meal are answered before the user ever looks at them, so
     those two panels never read as "you still have to do something here" —
     an adult who wants no bag and no meal can leave both alone and go
     straight to the seat. A seat is deliberately NOT seeded: it is the one
     choice the user must actually make (see missingAddons / SEAT_REQUIRED).

     Seeded here rather than defaulted at render time so that every reader of
     state.bag[key] / state.meal[key] — the rail, review, the popup, the
     totals — agrees with what the option grid shows, with no special case. */
  (function seedAddonDefaults() {
    TRAVELLERS.forEach(function (t) {
      FLIGHT.directions.forEach(function (d, di) {
        var key = addonKey(di, t.id);
        state.bag[key] = DEFAULT_BAG;
        state.meal[key] = DEFAULT_MEAL;
      });
    });
  })();

  /* Read every currently-rendered input back into state before we replace the
     markup. Ids are stable across renders, which is what makes this work. */
  function harvest() {
    var scope = document.getElementById("bkScreen");
    if (!scope) return;
    scope.querySelectorAll("input, select, textarea").forEach(function (el) {
      if (!el.id) return;
      if (el.type === "file") return;
      if (el.type === "checkbox" || el.type === "radio") {
        state.values[el.id] = el.checked;
        return;
      }
      state.values[el.id] = el.value;
    });
  }

  /* The value to render for a field: whatever the user last typed, else the
     seeded default. */
  function fieldValue(cfg) {
    return Object.prototype.hasOwnProperty.call(state.values, cfg.id)
      ? state.values[cfg.id]
      : cfg.value;
  }

  /* =====================================================================
     HELPERS
     ===================================================================== */

  var ICON = {
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="11" x2="12" y2="16"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    clockSmall: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    plane: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>',
    swap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
    seat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 11V7a2 2 0 0 1 4 0v4h6V9a2 2 0 0 1 4 0v6a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6v-4z"/><path d="M7 17v4"/></svg>',
    upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v16H4z"/><path d="M4 8l8 5 8-5"/></svg>',
    card: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>',
    bank: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"/><path d="M4 10v8"/><path d="M9 10v8"/><path d="M15 10v8"/><path d="M20 10v8"/><path d="M12 3 2 8h20z"/></svg>',
    wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 12V8H6a2 2 0 1 1 0-4h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    ticket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1a2 2 0 0 0 0 4v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1a2 2 0 0 0 0-4z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>',
    meal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 2v7a3 3 0 0 0 3 3v10"/><path d="M6 2v6"/><path d="M9 2v6"/><path d="M18 2c-1.5 2-2 4-2 6 0 1.7.7 3 2 3s2-1.3 2-3c0-2-.5-4-2-6z"/><path d="M18 11v11"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    planeUp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 20h20"/><path d="M12 17V5"/><path d="m6 11 6-6 6 6"/></svg>',
    planeDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4h20"/><path d="M12 7v12"/><path d="m6 13 6 6 6-6"/></svg>',
  };

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* Take a node out of its parent. Element.remove() does exactly this, but the
     local DOM shim only models removeChild, so go via the parent and no-op on
     a node that is already detached. */
  function detachNode(node) {
    if (!node || !node.parentNode) return;
    node.parentNode.removeChild(node);
  }

  /* =====================================================================
     TEMPLATES
     ---------------------------------------------------------------------
     Static markup lives in flight-booking.html as <template> elements, so
     this file only carries the parts that are generated from data. Clone the
     template, then fill each [data-role] slot; the result is a string because
     render() writes it through innerHTML like every other screen.
     ===================================================================== */

  var templateCache = {};

  function tpl(id) {
    if (!templateCache[id]) {
      var node = document.getElementById(id);
      templateCache[id] = node ? node.innerHTML : "";
    }
    return templateCache[id];
  }

  /* Fill [data-role="name"] inside a markup string. Values are trusted HTML
     built by this file, so they are inserted as-is. */
  function fill(html, slots) {
    return html.replace(/data-role="([\w-]+)"/g, function (whole, name) {
      if (!Object.prototype.hasOwnProperty.call(slots, name)) return whole;
      return "data-role=\"" + name + "\" data-filled>" + slots[name];
    });
  }

  function money(value) {
    return "PKR " + Math.round(value).toLocaleString("en-PK");
  }

  /* 1Bill bills the fee on top of the booking total; every other method is
     free, so the amount due moves as the user switches methods. */
  function convenienceFee() {
    return CONVENIENCE_FEE[state.method] || 0;
  }

  function addonsTotal() {
    var total = 0;
    Object.keys(state.bag).forEach(function (key) {
      var option = findBag(state.bag[key]);
      if (option) total += option.price;
    });
    Object.keys(state.meal).forEach(function (key) {
      total += mealPrice(key);
    });
    Object.keys(state.seat).forEach(function (key) {
      total += seatPrice(key);
    });
    return total;
  }

  function bookingTotal() {
    return FARE.base + FARE.taxes + FARE.serviceFee + addonsTotal();
  }

  function amountDue() {
    return bookingTotal() + convenienceFee();
  }

  function findBag(id) {
    for (var i = 0; i < BAGGAGE_OPTIONS.length; i++) {
      if (BAGGAGE_OPTIONS[i].id === id) return BAGGAGE_OPTIONS[i];
    }
    return null;
  }

  function findMeal(id) {
    for (var i = 0; i < MEAL_OPTIONS.length; i++) {
      if (MEAL_OPTIONS[i].id === id) return MEAL_OPTIONS[i];
    }
    return null;
  }

  function travById(id) {
    for (var i = 0; i < TRAVELLERS.length; i++) {
      if (String(TRAVELLERS[i].id) === String(id)) return TRAVELLERS[i];
    }
    return null;
  }

  /* ---------------------------------------------------------------------
     Add-on keys
     ---------------------------------------------------------------------
     Every add-on is stored under "direction:traveler" — so a traveler can
     hold a 10 kg bag outbound and a 23 kg bag home at the same time. The
     colon separator is load-bearing: the second number is always the
     traveler id, so write it through addonKey() rather than by hand. */

  function addonKey(dir, paxId) {
    return dir + ":" + paxId;
  }

  /* Never assume a key parses. Callers that index FLIGHT.legs on the result
     used to throw outright on a malformed key. */
  function parseKey(key) {
    var m = /^(\d+):(\d+)$/.exec(key || "");
    return m ? { dir: Number(m[1]), pax: Number(m[2]) } : null;
  }

  function currentKey() {
    return addonKey(state.activeDir, state.activePax);
  }

  /* Three add-on kinds per traveler per direction. */
  var ADDONS_PER_DIRECTION = 3;
  var ADDONS_PER_PAX = ADDONS_PER_DIRECTION * FLIGHT.directions.length;

  function paxAddonCount(paxId) {
    var n = 0;
    [state.bag, state.meal, state.seat].forEach(function (map) {
      Object.keys(map).forEach(function (k) {
        var p = parseKey(k);
        if (p && p.pax === Number(paxId) && map[k]) n += 1;
      });
    });
    return n;
  }

  function paxDirectionAddonCount(paxId, dir) {
    var key = addonKey(dir, paxId);
    return [state.bag, state.meal, state.seat].reduce(function (count, map) {
      return count + (map[key] ? 1 : 0);
    }, 0);
  }

  function addonsChosen() {
    var n = 0;
    TRAVELLERS.forEach(function (t) { n += paxAddonCount(t.id); });
    return n;
  }

  function addonsTotalSlots() {
    return TRAVELLERS.length * ADDONS_PER_PAX;
  }

  /* Human-readable gaps, e.g. "Adult 1 return seat". Drives the warn-but-
     allow toast rather than a hard block.

     Baggage and a meal are pre-seeded (see seedAddonDefaults), so in practice
     only seats appear here — but the other two are still checked rather than
     assumed, so a key that somehow loses its default is reported instead of
     silently billed at zero. */
  function missingAddons() {
    var out = [];
    TRAVELLERS.forEach(function (t) {
      FLIGHT.directions.forEach(function (d, di) {
        var k = addonKey(di, t.id);
        var side = directionOf(di).label.toLowerCase();
        if (!state.bag[k]) out.push(t.label + " " + side + " baggage");
        if (!state.meal[k]) out.push(t.label + " " + side + " meal");
        if (!state.seat[k]) out.push(t.label + " " + side + " seat");
      });
    });
    return out;
  }

  /* Seats are the one thing that cannot be left to a default, so these are
     the only gaps that actually block. Returns "Adult 1 · Returning seat" etc. */
  function missingSeats() {
    var out = [];
    TRAVELLERS.forEach(function (t) {
      FLIGHT.directions.forEach(function (d, di) {
        if (!state.seat[addonKey(di, t.id)]) {
          out.push(t.label + " · " + directionOf(di).label + " seat");
        }
      });
    });
    return out;
  }

  /* The same gaps, but as the first raw key — used to jump the screen onto
     the traveler who still owes a seat. null when every seat is chosen. */
  function missingSeatKey() {
    var found = null;
    TRAVELLERS.forEach(function (t) {
      if (found) return;
      FLIGHT.directions.forEach(function (d, di) {
        if (!found && !state.seat[addonKey(di, t.id)]) found = addonKey(di, t.id);
      });
    });
    return found;
  }

  function addonSumFor(paxId) {
    var n = 0;
    FLIGHT.directions.forEach(function (d, di) {
      var key = addonKey(di, paxId);
      n += bagPrice(key) + mealPrice(key) + seatPrice(key);
    });
    return n;
  }

  function bagPrice(key) {
    var option = findBag(state.bag[key]);
    return option ? option.price : 0;
  }

  function mealPrice(key) {
    var option = findMeal(state.meal[key]);
    return option ? option.price : 0;
  }

  /* ---------------------------------------------------------------------
     Seat map
     ---------------------------------------------------------------------
     Rows 10-21 across A-F with an aisle between C and D. Row 15 is an exit
     row with extra legroom. Seats are a deterministic function of the row,
     letter and direction so the map never shifts between renders and the
     two flights show different cabins. */

  var SEAT_ROWS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
  var SEAT_LETTERS = ["A", "B", "C", "D", "E", "F"];
  var EXIT_ROW = 15;
  var WINDOW_PRICE = 2888;
  var MIDDLE_PRICE = 3088;

  function seatCode(row, letter) {
    return row + letter;
  }

  function seatType(letter) {
    if (letter === "A" || letter === "F") return "window";
    if (letter === "C" || letter === "D") return "aisle";
    return "middle";
  }

  function seatPriceFor(row, letter) {
    /* On a 3-3 cabin A/F are window, C/D aisle, B/E middle. Aisle seats are
       priced with the windows; only the middle pair costs more. */
    var base = seatType(letter) === "middle" ? MIDDLE_PRICE : WINDOW_PRICE;
    /* Exit rows carry extra legroom and cost more. */
    return row === EXIT_ROW ? base + 1200 : base;
  }

  /* A stable pseudo-random spread: the same seats are always occupied or
     paid-for, so the map looks the same every time the user comes back. The
     direction shifts the hash so outbound and return are not the same cabin. */
  function seatTaken(row, letter, dir) {
    var code = row * 7 + SEAT_LETTERS.indexOf(letter) * 13 + Number(dir || 0) * 31;
    return code % 5 === 0 || code % 11 === 3;
  }

  function seatPaid(row, letter, dir) {
    var code = row * 5 + SEAT_LETTERS.indexOf(letter) * 17 + Number(dir || 0) * 19;
    return !seatTaken(row, letter, dir) && code % 3 === 0;
  }

  function seatSelectedByOther(code, dir, paxId) {
    return TRAVELLERS.some(function (t) {
      return t.id !== paxId && state.seat[addonKey(dir, t.id)] === code;
    });
  }

  function seatPrice(key) {
    var code = state.seat[key];
    var m = /^(\d+)([A-F])$/.exec(code || "");
    if (!m) return 0;
    return seatPriceFor(Number(m[1]), m[2]);
  }

  /* ---------------------------------------------------------------------
     Validation
     ---------------------------------------------------------------------
     Field errors surface in a .bk-err under the input, matching the
     auth-modal / pages.js pattern. */

  var NAME_RE = /^[A-Za-z][A-Za-z\s'.-]*$/;
  var ALNUM_RE = /^[A-Za-z0-9]{4,15}$/;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function setError(input, message) {
    var field = input.closest(".bk-field");
    var box = field ? field.querySelector(".bk-err") : null;
    input.classList.add("is-invalid");
    input.classList.remove("is-valid");
    if (box) {
      box.classList.add("show");
      box.querySelector("span").textContent = message;
    }
    return false;
  }

  function clearError(input) {
    var field = input.closest(".bk-field");
    var box = field ? field.querySelector(".bk-err") : null;
    input.classList.remove("is-invalid");
    if (input.value.trim()) input.classList.add("is-valid");
    if (box) box.classList.remove("show");
    return true;
  }

  /* Age in whole years on a given date, or null when the value is unparseable. */
  function ageOn(dobValue, on) {
    var born = parseDate(dobValue);
    if (!born) return null;
    var age = on.getFullYear() - born.getFullYear();
    if (
      on.getMonth() < born.getMonth() ||
      (on.getMonth() === born.getMonth() && on.getDate() < born.getDate())
    ) {
      age -= 1;
    }
    return age;
  }

  /* Whole months from `from` to `to`; negative if `to` is in the past. */
  function monthsBetween(from, to) {
    return (
      (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
    );
  }

  /* Parses either YYYY-MM-DD (native date input) or DD MMM YYYY (demo label). */
  function parseDate(value) {
    var MONTHS = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    };
    var day;
    var month;
    var year;

    var iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
    if (iso) {
      year = Number(iso[1]);
      month = Number(iso[2]) - 1;
      day = Number(iso[3]);
    } else {
      var m = /^(\d{2})\s*([A-Za-z]{3})\s*(\d{4})$/.exec(value || "");
      if (!m) return null;
      day = Number(m[1]);
      month = MONTHS[m[2].toLowerCase()];
      year = Number(m[3]);
      if (month === undefined) return null;
    }

    var d = new Date(year, month, day);
    if (d.getDate() !== day || d.getMonth() !== month) return null;
    return d;
  }

  function validateInput(input) {
    var value = (input.value || "").trim();
    var name = input.name;

    if (!value) {
      return input.required ? setError(input, "This field is required.") : clearError(input);
    }

    if (name === "dob") {
      if (ageOn(value, FLIGHT_DATE) === null) {
        return setError(input, "Enter a real date of birth.");
      }
      return clearError(input);
    }

    if (name === "docIssue") {
      if (!parseDate(value)) return setError(input, "Enter a real date.");
      return clearError(input);
    }

    if (name === "docExp") {
      var exp = parseDate(value);
      if (!exp) return setError(input, "Enter a real date.");
      /* Airlines require six months validity beyond the travel date. On a
         round trip that is measured from the return, not the outbound. */
      if (monthsBetween(RETURN_DATE, exp) < 6) {
        return setError(input, "Must be valid for 6 months after travel.");
      }
      return clearError(input);
    }

    if (name === "docNo" && !ALNUM_RE.test(value)) {
      return setError(input, "4-15 letters or digits, no spaces.");
    }

    if ((name === "given" || name === "surname") && !NAME_RE.test(value)) {
      return setError(input, "Use letters only, as shown on the passport.");
    }

    if (name === "email" && !EMAIL_RE.test(value)) {
      return setError(input, "Enter a valid email address.");
    }

    if (name === "phone" && value.replace(/\D/g, "").length < 7) {
      return setError(input, "Enter a valid mobile number.");
    }

    if (name === "reference" && !/^[0-9]{9,16}$/.test(value)) {
      return setError(input, "Copy the 9-16 digit ID from your 1Bill receipt.");
    }

    return clearError(input);
  }

  function validateScope(scope) {
    var ok = true;
    scope.querySelectorAll("input, select").forEach(function (input) {
      if (input.disabled) return;
      if (input.type === "checkbox" || input.type === "radio" || input.type === "file") return;
      if (!input.required && !input.value.trim()) {
        clearError(input);
        return;
      }
      if (!validateInput(input)) ok = false;
    });
    return ok;
  }

  /* =====================================================================
     SHELL — steps and header band
     ===================================================================== */

  function renderSteps() {
    var host = document.getElementById("bkSteps");
    var active = STEP_OF_SCREEN[state.screen];

    var html = "";
    STEPS.forEach(function (step, i) {
      if (i > 0) {
        html += '<li class="bk-step-line' + (i <= active ? " is-done" : "") + '"></li>';
      }
      var cls = "bk-step";
      if (i < active) cls += " is-done";
      if (i === active) cls += " is-active";
      var dot = i < active ? ICON.check : "<span>" + (i + 1) + "</span>";
      html +=
        '<li class="' + cls + '">' +
        '<span class="bk-step-dot">' + dot + "</span>" +
        '<span class="bk-step-name">' + esc(step.name) + "</span>" +
        "</li>";
    });
    host.innerHTML = html;
  }

  function paintChrome() {
    var cfg = SCREENS[state.screen];

    document.querySelector('[data-role="title"]').textContent = cfg.title;
    document.querySelector('[data-role="sub"]').textContent = cfg.sub;
    document.querySelector('[data-role="back-label"]').textContent = cfg.back;

    var back = document.getElementById("bkBack");
    if (cfg.backHref) {
      back.setAttribute("href", cfg.backHref);
      back.removeAttribute("data-back");
    } else {
      back.removeAttribute("href");
      back.setAttribute("data-back", "");
    }

    renderSteps();
  }

  /* =====================================================================
     RAIL
     ===================================================================== */

  function railFlightCard() {
    /* Iterate directions, not the flat segment list. `i > 0` would paint a
       bogus layover at the direction boundary — leg index 2 is the first
       return segment, which is a fresh departure, not a connection. */
    var legs = FLIGHT.directions
      .map(function (d, di) {
        var segs = dirSegments(di).map(function (leg, offset) {
          var mins = layoverInto(di, offset);
          var layover = mins
            ? '<div class="bk-layover">' + ICON.clockSmall +
              layoverLabel(mins) + " layover in " + esc(leg.from.city) +
              " · Connect to " + esc(leg.flightNo) + "</div>"
            : "";
          return (
            '<div class="bk-leg">' +
            '<div class="bk-leg-top">' +
            '<span class="bk-leg-name">' + esc(leg.airline) + " · " + esc(leg.flightNo) + " · " + esc(FLIGHT.cabin) + "</span>" +
            "</div>" +
            '<div class="bk-leg-times">' +
            '<span class="bk-leg-time">' + esc(leg.depart) + " " + esc(leg.from.code) + "</span>" +
            '<span class="bk-leg-mid"><b>' + esc(leg.duration) + "</b><span class=\"bk-leg-line\"></span></span>" +
            '<span class="bk-leg-time">' + esc(leg.arrive) + " " + esc(leg.to.code) + "</span>" +
            "</div>" +
            '<div class="bk-leg-note">' + esc(leg.tzFrom) + " → " + esc(leg.tzTo) + " · All times local</div>" +
            layover +
            "</div>"
          );
        }).join("");

        return (
          '<div class="bk-dir-head"><b>' + esc(d.label) + "</b>" +
          "<span>" + esc(d.from + " → " + d.to) + " · " + esc(dateLabelFor(di)) + "</span></div>" +
          segs
        );
      })
      .join("");

    var notes =
      "<ul style=\"margin:12px 0 0;padding-left:16px;font-size:11px;color:var(--bk-muted);line-height:1.7\">" +
      FLIGHT.legs
        .map(function (leg) {
          return "<li>" + esc(leg.baggage) + "</li><li>" + esc(leg.cabinBag) + "</li>";
        })
        .join("") +
      "</ul>";

    return (
      '<section class="bk-card">' +
      '<div class="bk-card-body">' +
      '<div class="bk-route-chip">' + ICON.plane +
      esc(FLIGHT.tripType) + " · " + esc(FLIGHT.cabin) + "</div>" +
      '<div class="bk-route-line">' + esc(FLIGHT.route) + "</div>" +
      '<div class="bk-route-meta">' + esc(dateLabelFor(state.activeDir)) + " · " +
      esc(FLIGHT.totalDuration) + " total elapsed<br>" +
      TRAVELLERS.length + " travelers · " +
      passengerLabel("Adult", "adults") + ", " +
      passengerLabel("Child", "children") + ", " +
      passengerLabel("Infant", "infants") + "</div>" +
      "</div>" +
      '<div style="padding:0 22px 20px">' + legs + notes + "</div>" +
      "</section>"
    );
  }

  function sumRow(label, value, cls) {
    return '<div class="bk-sum' + (cls ? " " + cls : "") + '"><span>' + esc(label) + "</span><b>" + esc(value) + "</b></div>";
  }

  function railSummaryCard() {
    var extras = addonsTotal();
    var due = amountDue();

    var perTraveller = TRAVELLERS.map(function (t) {
      return sumRow(t.label, money(travellerTotal(t)));
    }).join("");

    var head =
      '<section class="bk-card"><div class="bk-card-body">' +
      '<h2 class="bk-sect-title">Fare summary</h2>' +
      '<p class="bk-sect-note">Illustrative reference booking</p>' +
      '<div style="font-size:12px;color:var(--bk-muted);line-height:1.7;margin-bottom:12px">' +
      "For all " + TRAVELLERS.length + " travelers · PKR. Not a guaranteed fare.<br>" +
      passengerLabel("Adult", "adults") + " · " +
      passengerLabel("Child", "children") + " · " +
      passengerLabel("Infant", "infants") +
      "</div>" +
      (state.screen === "addons" || state.screen === "review"
        ? '<div style="margin-bottom:10px">' + perTraveller + "</div>" +
          sumRow(selectedFareName || "Baseline booking", money(FARE.base + FARE.taxes + FARE.serviceFee), "is-rule is-strong")
        : sumRow("Base fare", money(FARE.base)) +
          sumRow("Taxes", money(FARE.taxes)) +
          sumRow("Service fee", money(FARE.serviceFee)) +
          sumRow(selectedFareName || "Baseline booking", money(FARE.base + FARE.taxes + FARE.serviceFee), "is-rule is-strong")) +
      sumRow("Selected add-ons", money(extras), extras > 0 ? "is-rule" : "") +
      (convenienceFee() > 0
        ? sumRow(paymentLabel() + " convenience fee", money(convenienceFee()))
        : "") +
      "</div>";

    var totalBlock =
      '<div class="bk-total"><div>' +
      '<span class="bk-total-lbl">' +
      (state.screen === "payment" || state.screen === "pending"
        ? "Amount due"
        : "Total for " + TRAVELLERS.length + " travelers") +
      "</span>" +
      '<span class="bk-total-val">' + money(due) + "</span>" +
      '<span class="bk-total-note">Includes taxes and airport fees</span>' +
      "</div></div>";

    var foot = '<p class="bk-fine">Change, cancellation and refund rules: to confirm with airline.</p></div></section>';

    return head + totalBlock + foot;
  }

  function paymentLabel() {
    var method = PAYMENT_METHODS.filter(function (m) { return m.id === state.method; })[0];
    return method ? method.name : "Payment";
  }

  function railSupportCard() {
    return (
      '<section class="bk-card"><div class="bk-card-body bk-support">' +
      '<h2 class="bk-sect-title" style="text-align:left">Need a hand?</h2>' +
      '<p>Our booking team can help with traveler details, fare questions and payment instructions.</p>' +
      '<a class="bk-btn bk-btn-quiet bk-btn-sm" href="/contact-us.html">Contact booking support</a>' +
      "</div></section>"
    );
  }

  function renderRail() {
    /* The add-ons screens get a running subtotal of what has been picked so
       far, in place of the plain fare summary. */
    var summary = state.screen === "addons" ? addonsRailPanel() : railSummaryCard();
    document.getElementById("bkRail").innerHTML =
      railFlightCard() + summary + railSupportCard();
  }

  /* =====================================================================
     SCREEN 1 — TRAVELER DETAILS
     ===================================================================== */

  function errBox() {
    return '<div class="bk-err">' + ICON.alert + "<span></span></div>";
  }

  function field(cfg) {
    var id = cfg.id;
    /* Replay what the user typed last time this screen was drawn, falling back
       to the seeded value only while the field is untouched. */
    var value = fieldValue(cfg);
    var label =
      '<label class="bk-label" for="' + id + '">' + esc(cfg.label) +
      (cfg.required ? '<span class="req">*</span>' : '<span class="opt">optional</span>') +
      "</label>";

    var control;
    if (cfg.type === "select") {
      control =
        '<select class="bk-control" id="' + id + '" name="' + cfg.name + '"' +
        (cfg.required ? " required" : "") + ">" +
        cfg.values
          .map(function (v) {
            return (
              '<option value="' + esc(v) + '"' +
              (String(v) === String(value) ? " selected" : "") + ">" +
              esc(v) + "</option>"
            );
          })
          .join("") +
        "</select>";
    } else {
      control =
        '<input class="bk-control" id="' + id + '" name="' + cfg.name + '"' +
        ' type="' + (cfg.type || "text") + '"' +
        ' placeholder="' + esc(cfg.placeholder || "") + '"' +
        (cfg.required ? " required" : "") +
        (cfg.min ? ' min="' + cfg.min + '"' : "") +
        (cfg.max ? ' max="' + cfg.max + '"' : "") +
        (cfg.autocomplete ? ' autocomplete="' + cfg.autocomplete + '"' : "") +
        ' value="' + esc(value == null ? "" : value) + '" />';
    }

    /* A linked field mirrors its partner on every change, so the duplicate
       date of birth and nationality stay in step no matter which one the user
       edited. Both remain real, clickable controls. */
    if (cfg.sync) {
      control = control.replace(/^<(select|input)/, '<$1 data-sync="' + esc(cfg.sync) + '"');
    }

    return '<div class="bk-field">' + label + control + errBox() + "</div>";
  }

  function paxHeadline(t) {
    var given = document.getElementById("pax" + t.id + "Given");
    var surname = document.getElementById("pax" + t.id + "Surname");
    var g = given ? given.value.trim() : "";
    var s = surname ? surname.value.trim() : "";
    if (!g && !s) return t.label;
    return (g || "—") + " " + s;
  }

  function paxComplete(t) {
    var p = "pax" + t.id;
    var fields = [
      { id: p + "Title", value: "Mr" },
      { id: p + "Gender", value: "Male" },
      { id: p + "Nationality", value: "Pakistani" },
      { id: p + "Given", value: "" },
      { id: p + "Surname", value: "" },
      { id: p + "DocNo", value: t.doc },
      { id: p + "Dob", value: dobToInput(t.dob) },
      { id: p + "DocIssue", value: "" },
      { id: p + "DocExp", value: "" },
    ];

    return fields.every(function (field) {
      var input = document.getElementById(field.id);
      var value;
      if (input) {
        value = input.value;
      } else if (Object.prototype.hasOwnProperty.call(state.values, field.id)) {
        value = state.values[field.id];
      } else {
        value = field.value;
      }
      return String(value || "").trim() !== "";
    });
  }

  function travelerBadge(t) {
    return paxComplete(t)
      ? '<span class="bk-badge bk-badge-done">' + ICON.check + "Complete</span>"
      : '<span class="bk-badge bk-badge-pending">' + ICON.alert + "Incomplete</span>";
  }

  function travelerCard(t) {
    var open = state.openPax === t.id;
    var p = "pax" + t.id;
    var tab = t.type === "Adult" ? "Adult " + t.id : t.label;

    var identity =
      '<div class="bk-block"><div class="bk-block-head">' + ICON.user +
      "<h4>Identity</h4></div>" +
      '<div class="bk-grid bk-grid-3">' +
      field({ id: p + "Title", name: "title", label: "Title", required: true, type: "select", values: TITLES, value: t.type === "Adult" ? "Mr" : "" }) +
      field({ id: p + "Gender", name: "gender", label: "Gender", required: true, type: "select", values: ["Male", "Female", "Unspecified"] }) +
      field({ id: p + "Nationality", name: "nationality", label: "Nationality", required: true, type: "select", values: NATIONALITIES, value: "Pakistani", sync: p + "NatEcho" }) +
      field({ id: p + "DobEcho", name: "dob", label: "Date of birth", type: "date", value: dobToInput(t.dob), sync: p + "Dob" }) +
      "</div>" +
      '<div class="bk-grid bk-grid-2" style="margin-top:14px">' +
      field({ id: p + "Given", name: "given", label: "Given names", required: true, placeholder: "As printed on the passport" }) +
      field({ id: p + "Surname", name: "surname", label: "Surname", required: true, placeholder: "Family name" }) +
      "</div>" +
      "</div>";

    var upload =
      '<div class="bk-block"><div class="bk-block-head">' + ICON.upload +
      "<h4>Passport scan</h4></div>" +
      '<label class="bk-drop" data-drop-for="' + p + '">' +
      '<input type="file" accept="image/*,.pdf" />' +
      '<span class="bk-drop-ico">' + ICON.upload + "</span>" +
      '<span class="bk-drop-txt" data-role="drop-txt">Upload passport to fill details</span>' +
      '<span class="bk-drop-hint">JPG or PDF · the name, date of birth and passport number are read from it</span>' +
      "</label></div>";

    var documents =
      '<div class="bk-block"><div class="bk-block-head">' + ICON.ticket +
      "<h4>Traveler document</h4></div>" +
      '<div class="bk-grid bk-grid-2">' +
      field({ id: p + "DocNo", name: "docNo", label: "Passport number", required: true, value: t.doc, placeholder: "Passport number" }) +
      field({ id: p + "Dob", name: "dob", label: "Date of birth", required: true, type: "date", max: FLIGHT_DATE_ISO, value: dobToInput(t.dob), sync: p + "DobEcho" }) +
      field({ id: p + "DocIssue", name: "docIssue", label: "Passport issue", required: true, type: "date", max: FLIGHT_DATE_ISO }) +
      field({ id: p + "DocExp", name: "docExp", label: "Passport expiry", required: true, type: "date", min: RETURN_DATE_ISO }) +
      field({ id: p + "NatEcho", name: "nationality", label: "Nationality", type: "select", values: NATIONALITIES, value: "Pakistani", sync: p + "Nationality" }) +
      "</div>" +
      '<div class="bk-note bk-note-info" style="margin-top:14px">' + ICON.info +
      "<span>Use names exactly as shown in the passport. Airlines reject tickets when the two do not match. Date of birth and nationality stay linked to the identity section above.</span></div>" +
      "</div>";

    var prefs =
      '<div class="bk-block"><div class="bk-block-head">' + ICON.seat +
      "<h4>Travel preferences · Optional</h4></div>" +
      '<div class="bk-grid bk-grid-3">' +
      field({ id: p + "Ffn", name: "ffn", label: "Frequent flyer", placeholder: "Program number" }) +
      field({ id: p + "Wheel", name: "wheelchair", label: "Wheelchair assistance", type: "select", values: ["No preference", "Aisle seat", "Bulkhead seat", "Lower deck"] }) +
      field({ id: p + "Meal", name: "meal", label: "Meal preference", type: "select", values: ["No preference", "Vegetarian", "Halal", "Child meal", "Low salt"] }) +
      "</div>" +
      '<button type="button" class="bk-btn bk-btn-outline bk-btn-sm" data-save-pax="' + t.id + '" style="margin-top:14px">' +
      ICON.check + "Save traveller details</button>" +
      "</div>";

    var guardian = "";
    if (t.type !== "Adult" && ADULT_TRAVELLERS.length) {
      /* Infants are lap infants with the first adult; children travel with
         the same accompanying adult. */
      var adultLabel = ADULT_TRAVELLERS[0].label;
      guardian =
        '<div class="bk-note bk-note-soft" style="margin-top:14px">' + ICON.user +
        "<span>" +
        (t.type === "Infant" ? "Lap infant" : "Traveling") +
        " with <b>" + esc(adultLabel) + "</b>. The accompanying adult is " +
        "responsible for this traveler's document.</span></div>";
    }

    return (
      '<div class="bk-pax' + (open ? " is-open" : "") + '" id="pax' + t.id + '" data-pax="' + t.id + '">' +
      '<button type="button" class="bk-pax-head" aria-expanded="' + (open ? "true" : "false") + '">' +
      '<span class="bk-pax-caret">' + ICON.chevron + "</span>" +
      '<span class="bk-pax-flag">' + t.flag + "</span>" +
      '<span class="bk-pax-name" data-role="name">' + esc(tab + " ·") + "</span>" +
      '<span data-role="badge">' + travelerBadge(t) + "</span>" +
      "</button>" +
      '<div class="bk-pax-body">' +
      '<div class="bk-note bk-note-info">' + ICON.info +
      "<span>Enter every traveler exactly as printed on the travel document. " +
      "Children and infants each need an accompanying adult.</span></div>" +
      identity +
      upload +
      documents +
      prefs +
      guardian +
      "</div></div>"
    );
  }

  function dobToInput(label) {
    var m = /^(\d{2}) ([A-Za-z]{3}) (\d{4})$/.exec(label || "");
    if (!m) return "";
    var months = {
      jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
      jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
    };
    var mm = months[m[2].toLowerCase()];
    return mm ? m[3] + "-" + mm + "-" + m[1] : "";
  }

  function screenDetails() {
    var checks = [
      'I confirm every traveler’s name, date of birth and passport number matches the travel document.',
      "I understand infant and child fares, baggage allowances and seat charges are confirmed at ticketing.",
      "I accept the fare rules, ticketing terms and the airline’s cancellation policy.",
    ];

    var checkedCount = checks.filter(function (c, i) { return state.confirmed[i]; }).length;

    var contact =
      '<section class="bk-card">' +
      '<div class="bk-card-head"><h2 class="bk-card-title">' + ICON.mail + "Contact details</h2>" +
      '<span class="bk-card-sub">E-ticket and flight updates</span></div>' +
      '<div class="bk-card-body">' +
      '<div class="bk-grid bk-grid-2">' +
      field({ id: "bkEmail", name: "email", label: "Email address", required: true, type: "email", placeholder: "you@example.com", autocomplete: "email" }) +
      "<div>" +
      '<label class="bk-label" for="bkPhone">Mobile number<span class="req">*</span></label>' +
      '<div class="bk-phone">' +
      '<select class="bk-control" id="bkPhoneCode">' +
      PHONE_CODES
        .map(function (c) {
          return (
            '<option value="' + esc(c) + '"' +
            (String(c) === String(fieldValue({ id: "bkPhoneCode" })) ? " selected" : "") +
            ">" + esc(c) + "</option>"
          );
        })
        .join("") +
      "</select>" +
      '<input class="bk-control" id="bkPhone" name="phone" type="tel" placeholder="92xx xxxxxxx" autocomplete="tel" required value="' +
      esc(fieldValue({ id: "bkPhone" }) || "") + '" />' +
      "</div>" + errBox() + "</div>" +
      "</div>" +
      '<div class="bk-note bk-note-soft" style="margin-top:14px">' + ICON.phone +
      "<span>Include your country calling code. We send the e-ticket, itinerary changes and schedule disruption to these details.</span></div>" +
      "</div></section>";

    var travellers =
      '<section class="bk-card">' +
      '<div class="bk-card-head"><h2 class="bk-card-title">' + ICON.user + "Travel details</h2>" +
      '<span class="bk-card-sub">' + TRAVELLERS.length + " travelers on this booking</span></div>" +
      '<div class="bk-card-body">' +
      '<div class="bk-note bk-note-info">' + ICON.info +
      "<span><b>Itinerary and conditions.</b> Confirm all airline terms before payment. " +
      "Baggage and meals are requests until ticketing. A seat is required for every traveler on every selected flight.</span></div>" +
      TRAVELLERS.map(travelerCard).join("") +
      "</div></section>";

    var complete = TRAVELLERS.filter(paxComplete).length;
    var allDone = complete === TRAVELLERS.length && checkedCount === checks.length;

    var continueCard =
      '<section class="bk-card"><div class="bk-card-body">' +
      '<h2 class="bk-sect-title">Before you continue</h2>' +
      '<p class="bk-sect-note">' +
      (allDone
        ? "Everything is complete. No payment is taken yet."
        : "Complete all " + TRAVELLERS.length + " travelers and the checks below. No payment yet.") +
      "</p>" +
      '<div class="bk-checks">' +
      checks
        .map(function (c, i) {
          return (
            '<label class="bk-check"><input type="checkbox" data-confirm="' + i + '"' +
            (state.confirmed[i] ? " checked" : "") + " /><span>" + esc(c) + "</span></label>"
          );
        })
        .join("") +
      "</div>" +
      '<div class="bk-note bk-note-info" style="margin-top:16px">' + ICON.lock +
      "<span>Your details are encrypted in transit and held under our data protection policy.</span></div>" +
      '<button class="bk-btn bk-btn-primary" id="bkContinue" type="button"' +
      (allDone ? "" : " disabled") + ">" +
      "Continue to add-ons" + ICON.check + "</button>" +
      "</div></section>";

    return contact + travellers + continueCard;
  }

  /* =====================================================================
     SCREEN 2 — BAGGAGE & SEATS
     ===================================================================== */

  /* "Who am I configuring, and for which flight?" — the single most-asked
     question on this screen. The tabs and the direction toggle answer it, but
     both sit far from the option grids, so the answer is repeated as a
     banner directly above them. Cheap, and it removes the need to scroll
     back up to check you are editing the right thing. */
  function contextBanner() {
    var pax = travById(state.activePax);
    var d = directionOf(state.activeDir);
    var leg = anchorLeg(state.activeDir);
    var seatKeyHere = addonKey(state.activeDir, state.activePax);
    var gaps = missingSeats().length;

    return (
      '<div class="bk-context">' +
      '<div class="bk-context-who">' +
      '<span class="bk-context-flag">' + esc(pax.flag) + "</span>" +
      "<div><b>" + esc(pax.label) + "</b>" +
      "<span>" + esc(pax.type) + "</span></div>" +
      "</div>" +
      '<div class="bk-context-div"></div>' +
      '<div class="bk-context-where">' +
      "<div><b>" + esc(d.label) + " flight · " + esc(d.from) + " → " + esc(d.to) + "</b>" +
      "<span>" + esc(dateLabelFor(state.activeDir)) + " · " + esc(flightNos(state.activeDir)) +
      "</span></div>" +
      "</div>" +
      '<div class="bk-context-state' + (gaps ? " is-warn" : " is-ok") + '">' +
      (gaps
        ? ICON.info + "<span>A seat is still required</span>"
        : ICON.check + "<span>All three chosen</span>") +
      "</div>" +
      "</div>"
    );
  }

  /* The same sentence, shortened, for the head of each add-on card so the
     card is self-describing even when read on its own. */
  function cardContextLine() {
    var pax = travById(state.activePax);
    var d = directionOf(state.activeDir);
    return (
      '<div class="bk-card-ctx">' +
      '<span class="bk-card-ctx-ico">' + esc(pax.flag) + "</span>" +
      "<span>For <b>" + esc(pax.label) + "</b> on the <b>" + esc(d.label.toLowerCase()) +
      "</b> flight · " + esc(d.from) + " → " + esc(d.to) + "</span>" +
      "</div>"
    );
  }

  /* One tab per traveler, showing how many of their 6 add-on slots are filled.
     These are buttons, not inputs — harvest() only reads input/select/textarea,
     so their state lives purely in state.activePax. */
  function paxTabs() {
    return (
      '<div class="bk-tabs" role="tablist" aria-label="Traveler">' +
      TRAVELLERS.map(function (t) {
        var on = t.id === state.activePax;
        var n = paxAddonCount(t.id);
        var done = n === ADDONS_PER_PAX;
        return (
          '<button type="button" role="tab" class="bk-tab' + (on ? " is-on" : "") + '"' +
          ' aria-selected="' + (on ? "true" : "false") + '" data-pax-tab="' + t.id + '">' +
          '<span class="bk-tab-ico">' + (done ? ICON.check : t.flag) + "</span>" +
          '<span class="bk-tab-txt"><b>' + esc(t.label) + "</b>" +
          "<span>" + esc(t.type) + "</span></span>" +
          '<span class="bk-tab-badge">' + n + "/" + ADDONS_PER_PAX + "</span>" +
          "</button>"
        );
      }).join("") +
      "</div>"
    );
  }

  /* Outbound / return. Two pills, each carrying its own date and route. */
  function dirToggle() {
    return (
      '<div class="bk-seg" role="group" aria-label="Flight direction">' +
      FLIGHT.directions
        .map(function (d, i) {
          var on = i === state.activeDir;
          return (
            '<button type="button" class="bk-seg-btn' + (on ? " is-on" : "") + '"' +
            ' aria-pressed="' + (on ? "true" : "false") + '" data-dir="' + i + '">' +
            "<b>" + esc(d.label) + "</b>" +
            "<span>" + esc(d.from + " → " + d.to) + " · " + esc(dateLabelFor(i)) + "</span>" +
            "</button>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function tripProgress() {
    var done = addonsChosen();
    var total = addonsTotalSlots();
    var pct = total ? Math.round((done / total) * 100) : 0;
    /* The wrapper <div class="bk-prog" role="progressbar"> itself is in the
       footer template; this returns only its innards. */
    return (
      '<div class="bk-prog-txt"><b>' + done + " of " + total + " selected</b>" +
      "<span>" + pct + "%</span></div>" +
      '<div class="bk-prog-bar"><i style="width:' + pct + '%"></i></div>'
    );
  }

  /* "Per passenger, per flight" spelled out with the actual names, since the
     option itself no longer carries a fixed description. */
  function addonDesc(pax, dir) {
    return "Available · " + pax.label + " · " + flightNos(dir);
  }

  function baggageCard() {
    var dir = state.activeDir;
    var pax = travById(state.activePax);
    var key = currentKey();
    var selected = state.bag[key];

    var options = BAGGAGE_OPTIONS.map(function (opt) {
      var on = selected === opt.id;
      return (
        '<div class="bk-opt' + (on ? " is-on" : "") + (opt.free ? " is-default" : "") + '">' +
        '<div class="bk-opt-top"><div><span class="bk-opt-name">' + esc(opt.name) +
        (opt.free ? '<span class="bk-opt-tag">Already set</span>' : "") + "</span>" +
        '<span class="bk-opt-desc">' + esc(opt.free ? opt.desc : addonDesc(pax, dir)) + "</span></div>" +
        '<span class="bk-picked-p">' + (opt.free ? "Free" : money(opt.price)) + "</span></div>" +
        '<button type="button" class="bk-btn ' + (on ? "bk-btn-primary" : "bk-btn-outline") +
        ' bk-btn-sm" data-bag-pick="' + opt.id + '">' +
        (on ? ICON.check + "Selected" : "Add this bag") +
        "</button></div>"
      );
    }).join("");

    return fill(tpl("tplBagCard"), { ctx: cardContextLine(), options: options });
  }

  function mealCard() {
    var pax = travById(state.activePax);
    var key = currentKey();
    var selected = state.meal[key];

    var options = MEAL_OPTIONS.map(function (opt) {
      var on = selected === opt.id;
      var isSkip = opt.id === DEFAULT_MEAL;
      return (
        '<div class="bk-opt' + (on ? " is-on" : "") +
        (isSkip ? " is-default" : "") + '">' +
        '<div class="bk-opt-top"><div><span class="bk-opt-name">' + esc(opt.name) +
        (isSkip ? '<span class="bk-opt-tag">Already set</span>' : "") + "</span>" +
        '<span class="bk-opt-desc">' + esc(opt.desc) + "</span></div>" +
        '<span class="bk-picked-p' + (opt.free ? " bk-meal-free" : "") + '">' +
        (opt.free ? "Included" : money(opt.price)) + "</span></div>" +
        '<button type="button" class="bk-btn ' + (on ? "bk-btn-primary" : "bk-btn-outline") +
        ' bk-btn-sm" data-meal-pick="' + opt.id + '">' +
        (on ? ICON.check + "Selected" : "Choose this meal") +
        "</button></div>"
      );
    }).join("");

    return fill(tpl("tplMealCard"), { ctx: cardContextLine(), options: options });
  }

  function seatMap() {
    var dir = state.activeDir;
    var key = currentKey();
    var leg = anchorLeg(dir);
    var segs = dirSegments(dir);
    var connection = segs[1];
    var pax = travById(state.activePax);
    var current = state.seat[key];

    var head =
      '<div class="bk-seat-head"><span></span>' +
      '<span>A</span><span>B</span><span>C</span><span></span>' +
      '<span>D</span><span>E</span><span>F</span></div>';

    var rows = "";
    SEAT_ROWS.forEach(function (row) {
      if (row === EXIT_ROW + 1) {
        rows +=
          '<div class="bk-seat-exit"><span>← EXIT · extra legroom · EXIT →</span></div>';
      }
      var cells = '<div class="bk-seat-rownum">' + row + "</div>";
      SEAT_LETTERS.forEach(function (letter) {
        var code = seatCode(row, letter);
        var selectedByOther = seatSelectedByOther(code, dir, state.activePax);
        var taken = seatTaken(row, letter, dir) || selectedByOther;
        var paid = seatPaid(row, letter, dir);
        var picked = current === code;
        var cls = "bk-seat";
        if (taken) cls += " is-taken";
        else if (picked) cls += " is-pick";
        else if (paid) cls += " is-paid";
        cells +=
          '<button type="button" class="' + cls + '" data-seat="' + code + '"' +
          (taken ? " disabled" : "") +
          ' aria-label="Seat ' + code +
          (selectedByOther
            ? ", selected for " + esc(TRAVELLERS.filter(function (t) {
                return state.seat[addonKey(dir, t.id)] === code;
              })[0].label)
            : taken ? ", occupied" : paid ? ", paid" : ", free") + '">' +
          (taken ? "×" : code) +
          "</button>";
      });
      rows += '<div class="bk-seat-row">' + cells + '<div class="bk-seat-rownum">' + row + "</div></div>";
    });

    var legend =
      '<div class="bk-legend">' +
      "<span><i></i>Free</span>" +
      '<span><i class="l-paid"></i>Paid ' + money(WINDOW_PRICE) + "</span>" +
      '<span><i class="l-taken"></i>Occupied</span>' +
      '<span><i class="l-pick"></i>Selected</span>' +
      "</div>";

    var picked;
    if (current) {
      var m = /^(\d+)([A-F])$/.exec(current);
      picked =
        '<div class="bk-picked"><div class="bk-picked-top"><div>' +
        '<span class="bk-picked-k">Selected</span>' +
        '<span class="bk-picked-v">' + esc(current) + " · " + seatType(m[2]) + " seat</span>" +
        '<span class="bk-opt-desc">' + esc(pax.label) + " · " + esc(leg.flightNo) + "</span>" +
        "</div>" +
        '<span class="bk-picked-p">' + money(seatPriceFor(Number(m[1]), m[2])) + "</span>" +
        "</div>" +
        '<div class="bk-picked-acts">' +
        '<button type="button" class="bk-link bk-link-danger" data-seat-clear="1">Remove</button>' +
        "</div></div>";
    } else {
      picked =
        '<div class="bk-empty"><b>A seat is required for every traveler.</b> ' +
        "Pick a free or paid seat for " + esc(pax.label) + " on the " +
        esc(directionOf(dir).label.toLowerCase()) + " flight.</div>";
    }

    /* Be honest that the map covers one segment, not the whole direction. */
    var note =
      ICON.info +
      "<span>Free seats show a pass. Paid seats <b>" + money(WINDOW_PRICE) + "–" +
      money(MIDDLE_PRICE) + "</b>. This map covers <b>" + esc(leg.flightNo) + "</b> only — the " +
      esc(connection ? connection.flightNo : "connecting") +
      " seat is assigned at check-in. " +
      "Infant and child seats cannot be booked without an accompanying adult.</span>";

    /* Only offered when a seat is actually held — there is no way to decline,
       because the carrier will not release a booking without a seat. */
    var skip = current
      ? '<div style="margin-top:14px">' +
        '<button type="button" class="bk-btn bk-btn-quiet" id="bkSkipSeat">' +
        "Remove this seat</button></div>"
      : "";

    return fill(tpl("tplSeatCard"), {
      ctx: cardContextLine(),
      sub:
        esc(pax.label) + " · " + esc(leg.flightNo) + " · " +
        esc(leg.from.code) + " → " + esc(leg.to.code) + " · " + esc(dateLabelFor(dir)),
      note: note,
      legend: legend,
      grid: head + rows,
      picked: picked + skip,
    });
  }

  /* Finish each flight for all travelers before moving to the next one. */
  function paxActions() {
    var nextTraveler = null;
    TRAVELLERS.forEach(function (t) {
      if (nextTraveler != null) return;
      if (
        t.id > state.activePax &&
        paxDirectionAddonCount(t.id, state.activeDir) < ADDONS_PER_DIRECTION
      ) {
        nextTraveler = t.id;
      }
    });

    var advance;
    if (nextTraveler != null) {
      advance = '<button type="button" class="bk-btn bk-btn-primary" data-next-pax="' +
        nextTraveler + '">Save &amp; next traveler →</button>';
    } else if (state.activeDir < FLIGHT.directions.length - 1) {
      advance = '<button type="button" class="bk-btn bk-btn-primary" data-next-dir="' +
        (state.activeDir + 1) + '">' +
        "Save &amp; next flight →</button>";
    } else {
      advance = '<button type="button" class="bk-btn bk-btn-primary" data-go-review="1">' +
        ICON.check + "Finish &amp; review add-ons</button>";
    }

    var here = currentKey();
    var bag = state.bag[here] ? money(bagPrice(here)) : "—";
    var meal = state.meal[here] ? money(mealPrice(here)) : "—";
    var seat = state.seat[here] ? money(seatPrice(here)) : "—";

    return fill(tpl("tplAddonsFoot"), {
      flag: travById(state.activePax).flag,
      who:
        esc(travById(state.activePax).label) + " · " +
        esc(directionOf(state.activeDir).label) + " · " +
        esc(flightNos(state.activeDir)),
      meta: "Bag " + bag + " · Meal " + meal + " · Seat " + seat,
      prog: tripProgress(),
      advance: advance,
    });
  }

  /* Grouped by traveler, then by direction — the same shape the review popup
     uses, so the rail and the popup never disagree. Every row is labelled
     from its own parsed key, never from whichever flight is being viewed. */
  function addonsRailPanel() {
    var blocks = TRAVELLERS.map(function (t) {
      var rows = "";
      var sideTotals = [];

      FLIGHT.directions.forEach(function (d, di) {
        var key = addonKey(di, t.id);
        var bag = findBag(state.bag[key]);
        var meal = findMeal(state.meal[key]);
        var seat = state.seat[key];
        if (!bag && !meal && !seat) return;

        var seatLetter = seat ? /^(\d+)([A-F])$/.exec(seat)[2] : "";
        rows +=
          '<p class="bk-sect-note" style="margin:12px 0 4px">' +
          esc(d.label + " · " + flightNos(di) + " · " + dateLabelFor(di)) + "</p>";
        if (bag) {
          rows += sumRow(
            "Baggage " + bag.name.replace("Extra ", "") + " · " + t.label,
            money(bag.price)
          );
        }
        if (meal) {
          rows += sumRow(
            "Meal " + meal.name + " · " + t.label,
            meal.free ? "Included" : money(meal.price)
          );
        }
        if (seat) {
          rows += sumRow(
            "Seat " + seat + " (" + seatType(seatLetter) + ") · " + t.label,
            money(seatPrice(key))
          );
        }
        sideTotals.push(bagPrice(key) + mealPrice(key) + seatPrice(key));
      });

      if (!rows) return "";

      var sideSum = sideTotals.reduce(function (a, b) { return a + b; }, 0);
      return (
        '<div class="bk-rail-pax">' +
        '<div class="bk-rail-pax-head"><span>' + t.flag + "</span>" +
        "<b>" + esc(t.label) + "</b>" +
        '<span class="bk-badge ' +
        (paxAddonCount(t.id) === ADDONS_PER_PAX ? "bk-badge-done" : "bk-badge-pending") +
        '">' + paxAddonCount(t.id) + "/" + ADDONS_PER_PAX + "</span>" +
        '<b class="bk-rail-pax-total">' + money(sideSum) + "</b></div>" +
        rows +
        "</div>"
      );
    }).join("");

    var total = addonsTotal();
    var chosen = addonsChosen();

    return (
      '<section class="bk-card"><div class="bk-card-body">' +
      '<h2 class="bk-sect-title">Add-ons summary</h2>' +
      '<p class="bk-sect-note">' + chosen + " of " + addonsTotalSlots() +
      " selected · " + esc(FLIGHT.tripType.toLowerCase()) + " · " +
      FLIGHT.directions.length + " flight direction" +
      (FLIGHT.directions.length === 1 ? "" : "s") + "</p>" +
      (blocks || '<p class="bk-fine" style="margin:0">No extras selected yet.</p>') +
      (blocks ? sumRow("Add-ons subtotal", money(total), "is-rule is-strong") : "") +
      '<div class="bk-total"><div>' +
      '<span class="bk-total-lbl">Reference price</span>' +
      '<span class="bk-total-val">' + money(bookingTotal()) + "</span>" +
      '<span class="bk-total-note">Selections require airline confirmation</span>' +
      "</div></div>" +
      "</div></section>"
    );
  }

  function screenAddons() {
    var head = fill(tpl("tplAddonsHead"), {
      txt:
        esc(FLIGHT.tripType) + " · " +
        FLIGHT.directions.map(function (direction, index) {
          return esc(direction.label) + " " + esc(dateLabelFor(index));
        }).join(" · ") +
        ". Add-ons are priced per traveler, per flight.",
      tabs: paxTabs(),
      dirs: dirToggle(),
      ctx: contextBanner(),
    });

    return head + baggageCard() + mealCard() + seatMap() + paxActions();
  }

  /* =====================================================================
     SCREEN 3 — REVIEW ADD-ONS
     ===================================================================== */

  /* One item per selection, grouped by traveler then direction, each labelled
     from its own key so it always names the flight it was actually bought on. */
  function screenReview() {
    var blocks = TRAVELLERS.map(function (t) {
      var items = "";
      var any = false;

      FLIGHT.directions.forEach(function (d, di) {
        var key = addonKey(di, t.id);
        var bag = findBag(state.bag[key]);
        var meal = findMeal(state.meal[key]);
        var seat = state.seat[key];
        if (!bag && !meal && !seat) return;
        any = true;

        var where = d.label + " · " + flightNos(di) + " · " + dateLabelFor(di);
        items += '<p class="bk-sect-note" style="margin:12px 0 6px">' + esc(where) + "</p>";

        function row(ico, title, sub, price, actions) {
          return (
            '<div class="bk-item">' +
            '<span class="bk-item-ico">' + ico + "</span>" +
            '<div class="bk-item-txt"><b>' + esc(title) + "</b>" +
            "<span>" + esc(sub) + "</span>" +
            '<div class="bk-item-acts">' + actions + "</div>" +
            "</div>" +
            '<span class="bk-item-price">' + esc(price) + "</span>" +
            "</div>"
          );
        }
        var editBag =
          '<button type="button" class="bk-link" data-edit-bag="' + key + '">Edit</button>' +
          '<button type="button" class="bk-link bk-link-danger" data-drop-bag="' + key + '">Remove</button>';
        var editMeal =
          '<button type="button" class="bk-link" data-edit-meal="' + key + '">Edit</button>' +
          '<button type="button" class="bk-link bk-link-danger" data-drop-meal="' + key + '">Remove</button>';
        var editSeat =
          '<button type="button" class="bk-link" data-edit-seat="' + key + '">Change seat</button>' +
          '<button type="button" class="bk-link bk-link-danger" data-drop-seat="' + key + '">Remove</button>';

        if (bag) {
          items += row(ICON.bag, bag.name, t.label + " · " + where, money(bag.price), editBag);
        }
        if (meal) {
          items += row(
            ICON.meal, meal.name, t.label + " · " + where,
            meal.free ? "Included" : money(meal.price), editMeal
          );
        }
        if (seat) {
          var sm = /^(\d+)([A-F])$/.exec(seat);
          var anchor = anchorLeg(di);
          items += row(
            ICON.seat, "Seat " + seat + " · " + seatType(sm[2]),
            t.label + " · " + where + " · " + anchor.from.code + " → " + anchor.to.code,
            money(seatPrice(key)), editSeat
          );
        }
      });

      if (!any) return "";

      return (
        '<div class="bk-rail-pax">' +
        '<div class="bk-rail-pax-head"><span>' + t.flag + "</span>" +
        "<b>" + esc(t.label) + "</b>" +
        '<span class="bk-badge ' +
        (paxAddonCount(t.id) === ADDONS_PER_PAX ? "bk-badge-done" : "bk-badge-pending") +
        '">' + paxAddonCount(t.id) + "/" + ADDONS_PER_PAX + "</span>" +
        '<b class="bk-rail-pax-total">' + money(addonSumFor(t.id)) + "</b></div>" +
        items +
        "</div>"
      );
    }).join("");

    var items = blocks;
    var selectionCount = addonsChosen();

    var selectedCard =
      '<section class="bk-card">' +
      '<div class="bk-card-head"><h2 class="bk-card-title">' + ICON.check + "Your selected add-ons</h2>" +
      '<span class="bk-card-sub">' + selectionCount + " of " + addonsTotalSlots() +
      " selections · " + esc(FLIGHT.tripType.toLowerCase()) + "</span></div>" +
      '<div class="bk-card-body">' +
      (items || '<div class="bk-empty">You have not added any extras yet. Go back to choose baggage, a meal or a seat.</div>') +
      (items ? sumRow("Add-ons subtotal", money(addonsTotal()), "is-rule is-strong") : "") +
      "</div></section>";

    var coverage = TRAVELLERS.map(function (t) {
      var n = paxAddonCount(t.id);
      var bits = [];
      FLIGHT.directions.forEach(function (d, di) {
        var key = addonKey(di, t.id);
        var bag = findBag(state.bag[key]);
        var seat = state.seat[key];
        var meal = findMeal(state.meal[key]);
        if (bag) bits.push(d.label + " bag");
        if (meal) bits.push(d.label + " meal");
        if (seat) bits.push(d.label + " seat");
      });
      return (
        '<div class="bk-cov' + (n ? " is-on" : "") + '">' +
        '<span class="bk-cov-mark">' + ICON.check + "</span>" +
        '<div class="bk-cov-txt"><b>' + esc(t.label) + "</b>" +
        "<span>" + esc(bits.join(" · ") || "No extras selected") + "</span></div>" +
        '<button type="button" class="bk-link" data-cov-edit="' + addonKey(0, t.id) + '">Add extras</button>' +
        "</div>"
      );
    }).join("");

    var coverageCard =
      '<section class="bk-card">' +
      '<div class="bk-card-head"><h2 class="bk-card-title">' + ICON.user + "Coverage by traveler &amp; flight</h2></div>" +
      '<div class="bk-card-body">' +
      coverage +
      '<button type="button" class="bk-btn bk-btn-outline bk-btn-sm" data-go-addons="1" style="margin-top:14px">' +
      "Choose extras for another traveler or flight</button>" +
      '<div class="bk-note bk-note-info" style="margin-top:14px">' + ICON.info +
      "<span>Every extra is priced per traveler and per flight. " +
      "A seat choice covers the segment shown; the connecting seat is assigned at check-in.</span></div>" +
      "</div></section>";

    var travellerCard =
      '<section class="bk-card">' +
      '<div class="bk-card-head"><h2 class="bk-card-title">' + ICON.ticket + "Traveler &amp; contact review</h2>" +
      '<span class="bk-badge bk-badge-done">' + ICON.check + TRAVELLERS.length + " of " + TRAVELLERS.length + " details checked</span></div>" +
      '<div class="bk-card-body">' +
      TRAVELLERS.map(function (t, i) {
        var infantNote = t.type === "Infant" ? " · Lap infant with " + ADULT_TRAVELLERS[0].label : "";
        return (
          '<div class="bk-trav"><span class="bk-trav-n">' + (i + 1) + "</span>" +
          '<div class="bk-trav-b"><b>' + esc(t.label + " · " + maskedName(t)) + "</b>" +
          "<span>Born " + esc(t.dob) + " · Passport ····" + esc(t.doc) + " · Pakistani" + esc(infantNote) + "</span></div></div>"
        );
      }).join("") +
      '<div class="bk-contact">' +
      '<div class="bk-contact-row"><span>Contact</span><b>···@···example.com</b></div>' +
      '<div class="bk-contact-row"><span>Mobile</span><b>+92 xxx-xxx-4821</b></div>' +
      '<div class="bk-contact-row"><span>Assist</span><b>No wheelchair assistance</b></div>' +
      '<div class="bk-contact-row"><span>Meal</span><b>No meal preference</b></div>' +
      '<div class="bk-contact-row"><span>Loyalty</span><b>Optional loyalty numbers: not provided</b></div>' +
      '<button type="button" class="bk-link" data-go-details="1" style="margin-top:12px">Edit traveler or contact details</button>' +
      "</div></div></section>";

    var fareCard =
      '<section class="bk-card">' +
      '<div class="bk-card-head"><h2 class="bk-card-title">' + ICON.wallet + 'Booking &amp; fare review</h2></div>' +
      '<div class="bk-card-body">' +
      '<div class="bk-route-line" style="margin-top:0">' + esc(FLIGHT.route) + "</div>" +
      '<div class="bk-route-meta">' + esc(dateLabelFor(0)) + " · " +
      esc(FLIGHT.cabin) + "</div>" +
      sumRow("Baseline fare", money(FARE.base + FARE.taxes + FARE.serviceFee), "is-rule") +
      sumRow("Selected add-ons", money(addonsTotal())) +
      sumRow("Booking total", money(bookingTotal()), "is-rule is-strong") +
      '<div class="bk-note bk-note-info" style="margin-top:16px">' + ICON.info +
      "<span>Change, cancellation and refund rules: to confirm with airline. Your card is charged only on the next screen.</span></div>" +
      '<button class="bk-btn bk-btn-primary" data-go-payment="1" style="margin-top:16px">' +
      "Continue to payment" + ICON.check + "</button>" +
      "</div></section>";

    return selectedCard + coverageCard + travellerCard + fareCard;
  }

  /* Review screens show "A*** S****" rather than the entered name, matching
     the design. Falls back to a neutral mask when no name is stored. */
  function maskedName(t) {
    var base = t.label.replace(/^(Adult|Child|Infant)\s+\d+\s*/, "").trim();
    if (!base) return "T···· S····";
    return base
      .split(/\s+/)
      .map(function (p) {
        return p.charAt(0) + "···";
      })
      .join(" ");
  }

  /* =====================================================================
     SCREEN 4 — PAYMENT
     ===================================================================== */

  function screenPayment() {
    var methods =
      '<section class="bk-card">' +
      '<div class="bk-card-head"><h2 class="bk-card-title">' + ICON.card + "Select a payment method</h2></div>" +
      '<div class="bk-card-body"><div class="bk-methods">' +
      PAYMENT_METHODS.map(function (m) {
        return (
          '<label class="bk-method' + (state.method === m.id ? " is-on" : "") + '">' +
          '<input type="radio" name="bkMethod" value="' + m.id + '"' +
          (state.method === m.id ? " checked" : "") + " />" +
          '<span class="bk-method-ico">' + ICON[m.icon] + "</span>" +
          '<span class="bk-method-txt"><b>' + esc(m.name) + "</b><span>" + esc(m.desc) + "</span></span>" +
          "</label>"
        );
      }).join("") +
      "</div></div></section>";

    var detail = paymentDetail();

    var promo =
      '<section class="bk-card">' +
      '<div class="bk-card-head"><h2 class="bk-card-title">' + ICON.ticket + 'Promo code</h2></div>' +
      '<div class="bk-card-body">' +
      '<div class="bk-promo">' +
      '<input class="bk-control" id="bkPromo" type="text" placeholder="Enter promo code" value="' + esc(state.promo || "") + '" />' +
      '<button type="button" class="bk-btn bk-btn-outline bk-btn-sm" id="bkPromoApply">Apply code</button>' +
      "</div>" +
      (state.promo
        ? '<div class="bk-note bk-note-info" style="margin-top:14px">' + ICON.check +
          "<span>Code <b>" + esc(state.promo) + "</b> applied. Discounts are confirmed at ticketing.</span></div>"
        : '<p class="bk-fine">Promo codes are validated at ticketing and never reduce the ticket issuance fee.</p>') +
      "</div></section>";

    var consent =
      '<section class="bk-card">' +
      '<div class="bk-card-head"><h2 class="bk-card-title">' + ICON.shield + 'Review &amp; consent</h2></div>' +
      '<div class="bk-card-body">' +
      '<div class="bk-checks">' +
      '<label class="bk-check"><input type="checkbox" id="bkConsent" />' +
      "<span>I have reviewed the traveler details and add-ons above, and accept the " +
      '<a href="/contact-us.html#faq">fare rules, ticketing terms</a> and ' +
      '<a href="/contact-us.html">privacy policy</a>.</span></label>' +
      "</div>" +
      '<div class="bk-note bk-note-info" style="margin-top:16px">' + ICON.lock +
      "<span>Payment details are entered on our payment provider's secure page. We never store card numbers.</span></div>" +
      '<button class="bk-btn bk-btn-primary" id="bkPay" type="button">Create payment order</button>' +
      "</div></section>";

    return methods + detail + promo + consent;
  }

  function paymentDetail() {
    var fee = convenienceFee();

    var common =
      '<div class="bk-deadline">' + ICON.clock +
      "<span>Complete payment by <b id=\"bkDeadline\">17:30 PKT</b> or this order expires and the fare is re-checked.</span></div>";

    if (state.method === "card") {
      return (
        '<section class="bk-card">' +
        '<div class="bk-card-head"><h2 class="bk-card-title">' + ICON.card + "Pay with debit / credit card</h2></div>" +
        '<div class="bk-card-body">' +
        '<div class="bk-note bk-note-info">' + ICON.info +
        "<span>You will be redirected to our payment provider to enter your card. The 3-D Secure step keeps your bank in control.</span></div>" +
        common +
        '<div class="bk-grid bk-grid-2">' +
        field({ id: "bkCardName", name: "cardName", label: "Name on card", required: true, placeholder: "As printed on the card" }) +
        field({ id: "bkCardRef", name: "cardRef", label: "Consumer / payment reference", placeholder: "Optional" }) +
        "</div>" +
        totalsTable() +
        "</div></section>"
      );
    }

    if (state.method === "1bill") {
      return (
        '<section class="bk-card">' +
        '<div class="bk-card-head"><h2 class="bk-card-title">' + ICON.bank + "Pay with 1Bill bank transfer</h2></div>" +
        '<div class="bk-card-body">' +
        '<div class="bk-note bk-note-info">' + ICON.info +
        "<span><b>How it works</b></span></div>" +
        '<ol class="bk-how">' +
        "<li><div><b>Open bill payments</b><span>Select bill payments, then 1Bill / invoice payment.</span></div></li>" +
        "<li><div><b>Enter the consumer ID</b><span>Use the full 1Bill ID shown on the pending screen, exactly.</span></div></li>" +
        "<li><div><b>Verify before approving</b><span>Check the order reference and amount: " + money(amountDue()) + ". If they do not match, stop and contact booking support.</span></div></li>" +
        "<li><div><b>Pay &amp; keep the receipt</b><span>Authorize in your bank's official service. Save your transaction reference and payment receipt.</span></div></li>" +
        "</ol>" +
        common +
        '<div class="bk-grid bk-grid-2">' +
        field({ id: "bkBilling", name: "billing", label: "Billing contact", required: true, value: "+92 92xx xxxx 4821", placeholder: "Mobile number" }) +
        field({ id: "bkReceipt", name: "receipt", label: "Receipt email", required: true, type: "email", value: "···@···example.com", placeholder: "you@example.com" }) +
        "</div>" +
        '<div style="margin-top:14px">' +
        field({ id: "bkReference", name: "reference", label: "Consumer / payment reference", required: true, placeholder: "9-12 digits from your 1Bill receipt" }) +
        "</div>" +
        totalsTable() +
        "</div></section>"
      );
    }

    if (state.method === "easypaisa" || state.method === "jazzcash") {
      return (
        '<section class="bk-card">' +
        '<div class="bk-card-head"><h2 class="bk-card-title">' +
        ICON.wallet + "Pay with " + paymentLabel() + "</h2></div>" +
        '<div class="bk-card-body">' +
        '<div class="bk-note bk-note-info">' + ICON.info +
        "<span>Enter your registered mobile number and confirm with the OTP sent to that phone.</span></div>" +
        common +
        '<div class="bk-grid bk-grid-2">' +
        field({ id: "bkWalletNo", name: "walletNo", label: "Registered mobile number", required: true, type: "tel", placeholder: "03xx xxxxxxx" }) +
        field({ id: "bkReceipt", name: "receipt", label: "Receipt email", required: true, type: "email", placeholder: "you@example.com" }) +
        "</div>" +
        totalsTable() +
        "</div></section>"
      );
    }

    if (state.method === "gpay") {
      return (
        '<section class="bk-card">' +
        '<div class="bk-card-head"><h2 class="bk-card-title">' + ICON.phone + "Pay with Google Pay</h2></div>" +
        '<div class="bk-card-body">' +
        '<div class="bk-note bk-note-info">' + ICON.info +
        "<span>A sheet opens with your saved cards and bank accounts. Confirm the amount on your device.</span></div>" +
        common +
        totalsTable() +
        "</div></section>"
      );
    }

    /* bank */
    return (
      '<section class="bk-card">' +
      '<div class="bk-card-head"><h2 class="bk-card-title">' + ICON.bank + "Pay by bank direct transfer</h2></div>" +
      '<div class="bk-card-body">' +
      '<div class="bk-note bk-note-info">' + ICON.info +
      "<span>Transfer to our corporate account, then enter the transfer reference so we can match your payment.</span></div>" +
      common +
      '<div class="bk-grid bk-grid-2">' +
      field({ id: "bkBankRef", name: "reference", label: "Transfer reference", required: true, placeholder: "From your bank receipt" }) +
      field({ id: "bkReceipt", name: "receipt", label: "Receipt email", required: true, type: "email", placeholder: "you@example.com" }) +
      "</div>" +
      totalsTable() +
      "</div></section>"
    );
  }

  function totalsTable() {
    return (
      '<div style="margin-top:20px">' +
      sumRow("Booking & add-ons", money(bookingTotal())) +
      (convenienceFee() > 0
        ? sumRow(paymentLabel() + " convenience fee", money(convenienceFee()))
        : "") +
      sumRow("Amount due", money(amountDue()), "is-rule is-strong") +
      "</div>"
    );
  }

  /* =====================================================================
     SCREEN 5 — PAYMENT PENDING
     ===================================================================== */

  function orderIds() {
    return {
      order: "SM-261007-4821",
      reference: "1001234567894821",
    };
  }

  function screenPending() {
    var ids = orderIds();

    var awaiting =
      '<section class="bk-card">' +
      '<div class="bk-card-body">' +
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">' +
      '<span class="bk-item-ico" style="background:var(--bk-amber-bg);color:var(--bk-amber)">' + ICON.clock + "</span>" +
      "<div><h2 class=\"bk-sect-title\" style=\"margin:0\">Awaiting payment</h2>" +
      '<p class="bk-sect-note" style="margin:2px 0 0">Order created · No payment received</p></div>' +
      "</div>" +
      '<div class="bk-deadline">' + ICON.clock +
      "<span>Pay <b>" + money(amountDue()) + "</b> by <b>07 Oct 2026, 17:30 PKT (UTC+5)</b>. " +
      "Your flight is not ticketed. This sample order was created at 17:00 PKT.</span></div>" +
      '<div class="bk-note bk-note-warn">' + ICON.alert +
      "<span><b>Order created - no payment received.</b> The airline fare is only held while this order is open.</span></div>" +
      '<div class="bk-order"><div class="bk-order-txt">' +
      '<span class="bk-order-lbl">Example SmartMoves order ID</span>' +
      '<span class="bk-order-val">' + esc(ids.order) + "</span></div>" +
      '<button type="button" class="bk-copy" data-copy="' + esc(ids.order) + '" aria-label="Copy order ID">' + ICON.copy + "</button></div>" +
      '<div class="bk-order"><div class="bk-order-txt">' +
      '<span class="bk-order-lbl">Example 1Bill consumer / reference ID</span>' +
      '<span class="bk-order-val">' + esc(ids.reference) + "</span></div>" +
      '<button type="button" class="bk-copy" data-copy="' + esc(ids.reference) + '" aria-label="Copy reference ID">' + ICON.copy + "</button></div>" +
      '<p class="bk-fine">Sample identifiers for this mockup only — do not use them to make a real payment.</p>' +
      '<button type="button" class="bk-btn bk-btn-quiet bk-btn-sm" style="margin-top:14px">' +
      ICON.download + "Download order receipt</button>" +
      '<p class="bk-fine">The order receipt is not an e-ticket or a payment receipt.</p>' +
      "</div></section>";

    var channels =
      '<section class="bk-card">' +
      '<div class="bk-card-head"><h2 class="bk-card-title">' + ICON.bank + 'Choose a transfer channel</h2></div>' +
      '<div class="bk-card-body">' +
      '<p class="bk-sect-note">Use the consumer ID above with your own bank or wallet. Channel and bank options below are illustrative.</p>' +
      '<div class="bk-channels">' +
      CHANNELS.map(function (c) {
        return (
          '<label class="bk-channel' + (state.channel === c.id ? " is-on" : "") + '">' +
          '<input type="radio" name="bkChannel" value="' + c.id + '"' +
          (state.channel === c.id ? " checked" : "") + " />" +
          '<span class="bk-channel-ico">' + ICON[c.icon] + "</span>" +
          "<b>" + esc(c.name) + "</b></label>"
        );
      }).join("") +
      "</div>" +
      '<div class="bk-select-row" style="cursor:default">' +
      '<span class="bk-select-txt"><b>Select your bank · illustrative</b>' +
      "<span>Example Bank · " + esc(paymentLabel()) + " · " +
      esc(CHANNELS.filter(function (c) { return c.id === state.channel; })[0].name) +
      "</span></span></div>" +
      '<p class="bk-fine">Other sample bank choices: Example Bank 8 · Example Bank C. Check that your provider supports 1Bill invoice payments.</p>' +
      '<div class="bk-block" style="margin-top:22px">' +
      '<h3 class="bk-sect-title">' + esc(paymentLabel()) + " instructions</h3>" +
      '<ol class="bk-how">' +
      "<li><div><b>Open bill payments</b><span>Sign in to the banking app or internet banking. Select bill payments, then 1Bill / invoice payment.</span></div></li>" +
      "<li><div><b>Enter the consumer ID</b><span>Copy " + esc(ids.reference) + " into the consumer / reference field. Use the full ID exactly as shown.</span></div></li>" +
      "<li><div><b>Verify before approving</b><span>Check the order reference and amount: " + money(amountDue()) + ". If the details do not match, stop and contact booking support.</span></div></li>" +
      "<li><div><b>Pay &amp; keep the receipt</b><span>Authorize in your bank's official service. Save your transaction reference and payment receipt.</span></div></li>" +
      "</ol>" +
      '<div class="bk-note bk-note-info">' + ICON.wallet +
      "<span>Wallets: use the wallet bill-payment / 1Bill option, then enter the consumer ID, ATM / counter: choose 1Bill invoice payment where supported or ask the bank to help.</span></div>" +
      "</div>" +
      "</div></section>";

    var next =
      '<section class="bk-card">' +
      '<div class="bk-card-head"><h2 class="bk-card-title">' + ICON.info + 'What happens next?</h2></div>' +
      '<div class="bk-card-body">' +
      "<p>After your transfer, SmartMoves checks payment confirmation. Once confirmed, ticket issuance is requested from the airline and your e-ticket is emailed to <b>···@···example.com</b>.</p>" +
      '<div class="bk-deadline" style="margin-top:14px">' + ICON.alert +
      "<span>Payment is pending. If payment is not received before the deadline, the order may expire and the fare must be re-checked. Do not transfer after expiry — contact support first.</span></div>" +
      '<button type="button" class="bk-btn bk-btn-quiet" id="bkCheckStatus">Check payment status</button>' +
      '<button type="button" class="bk-btn bk-btn-outline" style="margin-top:10px">' +
      ICON.ticket + "E-ticket unavailable · Payment pending</button>" +
      '<p class="bk-fine">No e-ticket has been issued. Download becomes available only after payment confirmation and ticket issuance.</p>' +
      "</div></section>";

    var travellerReview =
      '<section class="bk-card">' +
      '<div class="bk-card-head"><h2 class="bk-card-title">' + ICON.ticket + "Traveler &amp; contact review</h2>" +
      '<span class="bk-badge bk-badge-done">' + ICON.check + TRAVELLERS.length + " of " + TRAVELLERS.length + ' details checked</span></div>' +
      '<div class="bk-card-body">' +
      TRAVELLERS.map(function (t, i) {
        var infantNote = t.type === "Infant" ? " · Lap infant with " + ADULT_TRAVELLERS[0].label : "";
        return (
          '<div class="bk-trav"><span class="bk-trav-n">' + (i + 1) + "</span>" +
          '<div class="bk-trav-b"><b>' + esc(t.label + " · " + maskedName(t)) + "</b>" +
          "<span>Born " + esc(t.dob) + " · Passport ····" + esc(t.doc) + " · Pakistani" + esc(infantNote) + "</span></div></div>"
        );
      }).join("") +
      '<div class="bk-contact">' +
      '<div class="bk-contact-row"><span>Contact</span><b>···@···example.com</b></div>' +
      '<div class="bk-contact-row"><span>Mobile</span><b>+92 xxx-xxx-4821</b></div>' +
      '<div class="bk-contact-row"><span>Assist</span><b>No wheelchair assistance</b></div>' +
      '<div class="bk-contact-row"><span>Meal</span><b>No meal preference</b></div>' +
      '<div class="bk-contact-row"><span>Loyalty</span><b>Optional loyalty numbers: not provided</b></div>' +
      '<div class="bk-btn-row" style="margin-top:12px">' +
      '<button type="button" class="bk-link" data-go-details="1">Edit traveler or contact details</button>' +
      '<a class="bk-link" href="/contact-us.html">Contact booking support</a>' +
      "</div>" +
      "</div></div></section>";

    var journey =
      '<section class="bk-card">' +
      '<div class="bk-card-head"><h2 class="bk-card-title">' + ICON.plane + 'Journey &amp; extras summary</h2></div>' +
      '<div class="bk-card-body">' +
      '<div class="bk-route-line" style="margin-top:0">' + esc(FLIGHT.route) + "</div>" +
      '<div class="bk-route-meta">' +
      FLIGHT.directions.map(function (d, di) {
        var segs = dirSegments(di);
        return esc(
          d.label + " " + dateLabelFor(di) + " · " + flightNos(di) + " · " +
          segs.map(function (l) {
            return l.depart + " " + l.from.code + " → " + l.arrive + " " + l.to.code;
          }).join(" + " + layoverLabel(layoverInto(di, 1)) + " connection → ") +
          " · " + FLIGHT.cabin
        ) + "<br>";
      }).join("") +
      passengerLabel("Adult", "adults") + " + " +
      passengerLabel("Child", "children") + " + " +
      passengerLabel("Infant", "infants") + " = " +
      TRAVELLERS.length + " travelers · " +
      esc(FLIGHT.totalDuration) + " total</div>" +
      '<div style="margin-top:16px">' +
      TRAVELLERS.map(function (t) {
        var hasAny = false;
        var rows = "";
        FLIGHT.directions.forEach(function (d, di) {
          var key = addonKey(di, t.id);
          var bag = findBag(state.bag[key]);
          var meal = findMeal(state.meal[key]);
          var seat = state.seat[key];
          if (!bag && !meal && !seat) return;
          hasAny = true;
          var bits = [];
          if (bag) bits.push(bag.name);
          if (meal) bits.push(meal.name + (meal.free ? " (included)" : ""));
          if (seat) bits.push("seat " + seat);
          rows += sumRow(
            t.label + " · " + d.label + ": " + bits.join(", "),
            money(bagPrice(key) + mealPrice(key) + seatPrice(key))
          );
        });
        return hasAny ? rows : "";
      }).join("") +
      (addonsTotal() === 0
        ? '<p class="bk-fine">No extras were selected. Airline confirmation required.</p>'
        : "") +
      "</div>" +
      '<div class="bk-btn-row" style="margin-top:16px">' +
      '<button type="button" class="bk-link" data-manage="1">Manage booking</button>' +
      '<a class="bk-link" href="/contact-us.html">Contact booking support</a>' +
      "</div>" +
      "</div></section>";

    var feedback =
      '<section class="bk-card">' +
      '<div class="bk-card-head"><h2 class="bk-card-title">' + ICON.shield + 'How was your booking experience?</h2></div>' +
      '<div class="bk-card-body">' +
      "<p>How likely are you to recommend SmartMoves? Optional feedback, 0-10.</p>" +
      '<div class="bk-feedback">' +
      Array.apply(null, { length: 11 }).map(function (_, i) {
        return (
          '<button type="button" class="bk-rate' + (state.rate === i ? " is-on" : "") +
          '" data-rate="' + i + '">' + i + "</button>"
        );
      }).join("") +
      "</div>" +
      '<p class="bk-fine">0 = Not at all likely · 10 = Extremely likely</p>' +
      '<button type="button" class="bk-btn bk-btn-quiet" id="bkRateSubmit" style="margin-top:14px">Submit feedback</button>' +
      "</div></section>";

    var manage =
      '<button class="bk-btn bk-btn-primary" data-manage="1">Manage booking</button>' +
      '<p class="bk-fine" style="text-align:center">Payment is still pending. Tickets will be available only after payment confirmation.</p>';

    return awaiting + channels + next + travellerReview + journey + feedback + manage;
  }

  /* =====================================================================
     RENDER + NAVIGATION
     ===================================================================== */

  var RENDER = {
    details: screenDetails,
    addons: screenAddons,
    review: screenReview,
    payment: screenPayment,
    pending: screenPending,
  };

  function render() {
    paintChrome();
    paintClock();
    harvest();
    document.getElementById("bkScreen").innerHTML = RENDER[state.screen]();
    renderRail();
  }

  function go(screen, opts) {
    if (!RENDER[screen]) return;
    state.screen = screen;
    render();
    if (!opts || !opts.keepScroll) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  /* =====================================================================
     REVIEW EVERYONE'S CHOICES — POPUP
     ---------------------------------------------------------------------
     Three travelers x two flights x three add-ons is 18 decisions. The
     add-ons screen shows one traveler at a time, so this is the only place
     the whole set is visible at once.

     Appended to document.body, not into #bkScreen: render() rewrites
     #bkScreen wholesale, and a body-level overlay survives that for free.
     ===================================================================== */

  var summaryOverlay = null;
  var summaryBody = null;
  var summaryTrigger = null;

  function sumLine(ico, title, sub, price, key, kind) {
    var jump =
    '<button type="button" class="bk-link" data-summary-jump="' + key +
    '" data-summary-kind="' + kind + '">Change</button>';
    return (
      '<div class="bk-sumline">' + ico +
      "<span><b>" + esc(title) + "</b>" + (sub ? " · " + esc(sub) : "") + "</span>" +
      '<span class="bk-sumline-p' + (price === "Included" ? " is-free" : "") + '">' +
      esc(price) + "</span>" +
      jump +
      "</div>"
    );
  }

  function summaryMarkup() {
    var blocks = TRAVELLERS.map(function (t) {
      var sides = "";

      FLIGHT.directions.forEach(function (d, di) {
        var key = addonKey(di, t.id);
        var bag = findBag(state.bag[key]);
        var meal = findMeal(state.meal[key]);
        var seat = state.seat[key];

        var rows = "";
        if (bag) {
          rows += sumLine(ICON.bag, bag.name, t.label, money(bag.price), key, "bag");
        }
        if (meal) {
          rows += sumLine(
            ICON.meal, meal.name, t.label,
            meal.free ? "Included" : money(meal.price), key, "meal"
          );
        }
        if (seat) {
          var sm = /^(\d+)([A-F])$/.exec(seat);
          rows += sumLine(
            ICON.seat, "Seat " + seat + " · " + seatType(sm[2]), t.label,
            money(seatPrice(key)), key, "seat"
          );
        }
        if (!rows) rows = '<div class="bk-sum-empty">Nothing selected on this flight.</div>';

        var sidePrice = bagPrice(key) + mealPrice(key) + seatPrice(key);

        sides +=
          '<div class="bk-side">' +
          '<div class="bk-side-head">' +
          "<b>" + esc(d.label) + "</b>" +
          "<span>" + esc(flightNos(di)) + " · " + esc(dateLabelFor(di)) + "</span>" +
          '<span class="bk-side-price">' + (sidePrice ? money(sidePrice) : "—") + "</span>" +
          "</div>" +
          rows +
          "</div>";
      });

      return (
        '<div class="bk-mv">' +
        '<div class="bk-mv-head">' +
        "<span class=\"bk-addons-flag\">" + t.flag + "</span>" +
        "<b>" + esc(t.label) + "</b>" +
        '<span class="bk-badge ' +
        (paxAddonCount(t.id) === ADDONS_PER_PAX ? "bk-badge-done" : "bk-badge-pending") +
        '">' + paxAddonCount(t.id) + "/" + ADDONS_PER_PAX + "</span>" +
        '<span class="bk-mv-total">' + money(addonSumFor(t.id)) + "</span>" +
        "</div>" +
        '<div class="bk-mv-sides">' + sides + "</div>" +
        "</div>"
      );
    }).join("");

    var gaps = missingAddons();

    return fill(tpl("tplSummaryModal"), {
      sub:
        esc(FLIGHT.tripType) + " · " +
        FLIGHT.directions.map(function (direction, index) {
          return esc(direction.label) + " " + esc(dateLabelFor(index));
        }).join(" · ") + " · " +
        addonsChosen() + " of " + addonsTotalSlots() + " selections made",
      body: blocks,
      status: gaps.length
        ? '<span class="bk-badge bk-badge-pending">' + gaps.length + " still to choose</span>"
        : '<span class="bk-badge bk-badge-done">' + ICON.check + "All choices made</span>",
      total: "Add-ons " + money(addonsTotal()),
    });
  }

  function openSummary(trigger) {
    summaryTrigger = trigger || null;

    closeSummary();
    var holder = document.createElement("div");
    holder.innerHTML = summaryMarkup();
    /* childNodes[0] rather than firstElementChild: both are correct in a
       browser, but the local DOM shim only models the former. */
    summaryOverlay = holder.childNodes[0];
    document.body.appendChild(summaryOverlay);

    summaryBody = summaryOverlay.querySelector("#bkSummaryBody");
    summaryOverlay.classList.add("show");
    document.body.style.overflow = "hidden";
    if (summaryTrigger) summaryTrigger.setAttribute("aria-expanded", "true");

    var x = summaryOverlay.querySelector(".bk-modal-x");
    if (x) x.focus();
  }

  function closeSummary() {
    if (!summaryOverlay) return;
    /* detachNode() rather than Element.remove() — same effect in a browser,
       and the local DOM shim only models removeChild. */
    detachNode(summaryOverlay);
    summaryOverlay = null;
    summaryBody = null;
    document.body.style.overflow = "";
    if (summaryTrigger && document.contains(summaryTrigger)) {
      summaryTrigger.setAttribute("aria-expanded", "false");
      summaryTrigger.focus();
    }
    summaryTrigger = null;
  }

  function summaryIsOpen() {
    return !!(summaryOverlay && summaryOverlay.classList.contains("show"));
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && summaryIsOpen()) closeSummary();
  });

  /* =====================================================================
     RESERVATION CLOCK
     ---------------------------------------------------------------------
     The design shows a countdown pill. It starts at 20:00 and only ticks
     while the user is on a step that has not yet created an order. */

  var clockLeft = 20 * 60;
  var clockId = null;

  function paintClock() {
    var out = document.getElementById("bkClockValue");
    var box = document.getElementById("bkClock");
    if (!out) return;
    var mm = ("0" + Math.floor(clockLeft / 60)).slice(-2);
    var ss = ("0" + (clockLeft % 60)).slice(-2);
    out.textContent = state.screen === "pending" ? "17:30 PKT" : mm + ":" + ss;
    if (box) box.classList.toggle("is-live", clockLeft <= 5 * 60 && state.screen !== "pending");
  }

  function startClock() {
    if (clockId) return;
    clockId = setInterval(function () {
      if (state.screen === "pending") return;
      if (clockLeft > 0) clockLeft -= 1;
      paintClock();
    }, 1000);
  }

  /* =====================================================================
     TOAST
     ===================================================================== */

  var toastId = null;
  function toast(message) {
    var box = document.getElementById("bkToast");
    if (!box) return;
    box.textContent = message;
    box.hidden = false;
    clearTimeout(toastId);
    toastId = setTimeout(function () {
      box.hidden = true;
    }, 2600);
  }

  /* =====================================================================
     EVENTS
     ===================================================================== */

  var CONFIRM_COUNT = 3;

  /* The continue button unlocks only when every traveler is complete AND all
     three "before you continue" boxes are ticked. */
  function detailsReady() {
    var checked = 0;
    for (var i = 0; i < CONFIRM_COUNT; i++) {
      if (state.confirmed[i]) checked += 1;
    }
    return TRAVELLERS.every(paxComplete) && checked === CONFIRM_COUNT;
  }

  function openPax(id, opts) {
    state.openPax = state.openPax === id && !(opts && opts.force) ? null : id;
    render();
    if (state.openPax === id) {
      var card = document.getElementById("pax" + id);
      if (card && !(opts && opts.noScroll)) {
        card.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }

  document.addEventListener("click", function (event) {
    var target = event.target;
    if (!target || !target.closest) return;

    /* --- Back link: in-flow steps go to the previous screen --- */
    var back = target.closest("#bkBack");
    if (back) {
      event.preventDefault();
      var prev = { addons: "details", review: "addons", payment: "review", pending: "details" }[state.screen];
      if (prev) go(prev);
      else window.location.href = back.getAttribute("href") || "/search-flight.html";
      return;
    }

    /* --- Traveler accordion --- */
    var head = target.closest(".bk-pax-head");
    if (head) {
      var card = head.closest(".bk-pax");
      openPax(Number(card.dataset.pax));
      return;
    }

    /* --- Save traveler --- */
    var savePax = target.closest("[data-save-pax]");
    if (savePax) {
      var scope = document.getElementById("pax" + savePax.dataset.savePax);
      if (scope && validateScope(scope)) {
        toast("Traveller details saved");
        state.openPax = null;
        render();
      } else if (scope) {
        scope.querySelector(".is-invalid").focus();
      }
      return;
    }

    /* --- Confirmation checkboxes gate the continue button --- */
    var confirm = target.closest("[data-confirm]");
    if (confirm) {
      state.confirmed[confirm.dataset.confirm] = confirm.checked;
      var btn = document.getElementById("bkContinue");
      if (btn) btn.disabled = !detailsReady();
      return;
    }

    var cont = target.closest("#bkContinue");
    if (cont) {
      var main = document.getElementById("bkScreen");
      if (!detailsReady()) {
        toast("Complete every traveler and tick all three boxes");
        return;
      }
      if (validateScope(main)) go("addons");
      else toast("Check the highlighted fields");
      return;
    }

    /* --- Add-ons: which traveler / which flight are we editing? ---
       These run before any selection is written, so state.activePax and
       state.activeDir already name the target when the branches below
       resolve currentKey(). */
    var paxTab = target.closest("[data-pax-tab]");
    if (paxTab) {
      state.activePax = Number(paxTab.dataset.paxTab);
      render();
      return;
    }

    var dirBtn = target.closest("[data-dir]");
    if (dirBtn) {
      state.activeDir = Math.min(
        FLIGHT.directions.length - 1,
        Math.max(0, Number(dirBtn.dataset.dir) || 0),
      );
      render();
      return;
    }

    /* --- Add-ons: baggage --- */
    var bagPick = target.closest("[data-bag-pick]");
    if (bagPick) {
      var bagKey = currentKey();
      var id = bagPick.dataset.bagPick;
      /* Clicking the active option clears it, so a second click removes. */
      if (state.bag[bagKey] === id) delete state.bag[bagKey];
      else state.bag[bagKey] = id;
      render();
      return;
    }

    var bagRemove = target.closest("[data-drop-bag]");
    if (bagRemove) {
      delete state.bag[bagRemove.dataset.dropBag];
      render();
      toast("Baggage removed");
      return;
    }

    var bagEdit = target.closest("[data-edit-bag]");
    if (bagEdit) {
      var bagJump = parseKey(bagEdit.dataset.editBag);
      if (!bagJump) return;
      state.activeDir = bagJump.dir;
      state.activePax = bagJump.pax;
      go("addons");
      var sec = document.getElementById("bkBagSec");
      if (sec) sec.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    /* --- Add-ons: meals --- */
    var mealPick = target.closest("[data-meal-pick]");
    if (mealPick) {
      var mealKey = currentKey();
      var mealId = mealPick.dataset.mealPick;
      if (state.meal[mealKey] === mealId) delete state.meal[mealKey];
      else state.meal[mealKey] = mealId;
      render();
      return;
    }

    var mealDrop = target.closest("[data-drop-meal]");
    if (mealDrop) {
      delete state.meal[mealDrop.dataset.dropMeal];
      render();
      toast("Meal removed");
      return;
    }

    var mealEdit = target.closest("[data-edit-meal]");
    if (mealEdit) {
      var mealJump = parseKey(mealEdit.dataset.editMeal);
      if (!mealJump) return;
      state.activeDir = mealJump.dir;
      state.activePax = mealJump.pax;
      go("addons");
      var msec = document.getElementById("bkMealSec");
      if (msec) msec.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    var covEdit = target.closest("[data-cov-edit]");
    if (covEdit) {
      var covJump = parseKey(covEdit.dataset.covEdit);
      if (!covJump) return;
      state.activeDir = covJump.dir;
      state.activePax = covJump.pax;
      go("addons");
      return;
    }

    /* --- Add-ons: seats --- */
    var seat = target.closest("[data-seat]");
    if (seat && !seat.disabled) {
      var seatKeyNow = currentKey();
      var code2 = seat.dataset.seat;
      if (state.seat[seatKeyNow] === code2) delete state.seat[seatKeyNow];
      else state.seat[seatKeyNow] = code2;
      render();
      return;
    }

    var seatClear = target.closest("[data-seat-clear]");
    if (seatClear) {
      delete state.seat[currentKey()];
      render();
      toast("Seat removed");
      return;
    }

    /* Clearing a seat you already picked is fine; the button only appears
       once one is held. Declining is not — a seat is required, so this can
       only ever take a selection back off. */
    if (target.closest("#bkSkipSeat")) {
      if (!state.seat[currentKey()]) return;
      delete state.seat[currentKey()];
      render();
      toast("Seat selection removed");
      return;
    }

    var seatEdit = target.closest("[data-edit-seat]");
    if (seatEdit) {
      var seatJump = parseKey(seatEdit.dataset.editSeat);
      if (!seatJump) return;
      state.activeDir = seatJump.dir;
      state.activePax = seatJump.pax;
      go("addons");
      var map = document.querySelector(".bk-seat-wrap");
      if (map) map.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    var seatDrop = target.closest("[data-drop-seat]");
    if (seatDrop) {
      delete state.seat[seatDrop.dataset.dropSeat];
      render();
      toast("Seat removed");
      return;
    }

    /* --- Add-ons: advancing --- */
    var nextPax = target.closest("[data-next-pax]");
    if (nextPax) {
      state.activePax = Number(nextPax.dataset.nextPax);
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    var nextDir = target.closest("[data-next-dir]");
    if (nextDir) {
      state.activeDir = Math.min(
        FLIGHT.directions.length - 1,
        Math.max(0, Number(nextDir.dataset.nextDir) || 0),
      );
      state.activePax = TRAVELLERS[0].id;
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (target.closest("[data-go-review]")) {
      /* Seats are required, so this is the one hard stop in the add-ons flow.
         Land on the first one that's missing rather than just naming it, so
         the user is looking at the seat they still owe. */
      var noSeat = missingSeats();
      if (noSeat.length) {
        var first = parseKey(missingSeatKey());
        if (first) {
          state.activeDir = first.dir;
          state.activePax = first.pax;
          render();
        }
        toast(noSeat.length === 1
          ? "Seat required: " + noSeat[0]
          : noSeat.length + " seats still to choose — starting with " + noSeat[0]);
        return;
      }
      go("review");
      return;
    }

    /* --- Review-everyone's-choices popup --- */
    if (target.closest("[data-summary]")) {
      openSummary(target.closest("[data-summary]"));
      return;
    }

    /* Any Change link inside the popup closes it and drops the screen
       behind it onto that traveler + flight. */
    var jump = target.closest("[data-summary-jump]");
    if (jump) {
      var to = parseKey(jump.dataset.summaryJump);
      var kind = jump.dataset.summaryKind;
      closeSummary();
      if (!to) return;
      state.activeDir = to.dir;
      state.activePax = to.pax;
      go("addons", { keepScroll: true });
      var targetSelector = {
        bag: "#bkBagSec",
        meal: "#bkMealSec",
        seat: ".bk-seat-wrap",
      }[kind];
      var section = targetSelector ? document.querySelector(targetSelector) : null;
      if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (target.closest("[data-summary-next]")) {
      /* Same seat requirement as the footer button — the popup is just
         another way of reaching review, so it must not become a way around
         the gate. */
      var noSeat2 = missingSeats();
      closeSummary();
      if (noSeat2.length) {
        var first2 = parseKey(missingSeatKey());
        if (first2) {
          state.activeDir = first2.dir;
          state.activePax = first2.pax;
          render();
        }
        toast(noSeat2.length === 1
          ? "Seat required: " + noSeat2[0]
          : noSeat2.length + " seats still to choose — starting with " + noSeat2[0]);
        return;
      }
      go("review");
      return;
    }

    /* The close attribute sits on the outer element, so a backdrop click and
       the X button both arrive here. */
    if (target.closest("[data-summary-close]") && summaryIsOpen()) {
      closeSummary();
      return;
    }

    /* --- Cross-screen links --- */
    if (target.closest("[data-go-addons]")) {
      go("addons");
      return;
    }
    if (target.closest("[data-go-details]")) {
      go("details");
      return;
    }
    if (target.closest("[data-go-payment]")) {
      /* Re-checked here as well as on the add-ons screen: review has its own
         forward button, and a seat removed via a Change link has to be caught
         on the way out too. */
      var noSeat3 = missingSeats();
      if (noSeat3.length) {
        go("addons");
        var first3 = parseKey(missingSeatKey());
        if (first3) {
          state.activeDir = first3.dir;
          state.activePax = first3.pax;
          render();
        }
        toast("Pick a seat before payment: " + noSeat3[0] +
          (noSeat3.length > 1 ? " and " + (noSeat3.length - 1) + " more" : ""));
        return;
      }
      go("payment");
      return;
    }
    if (target.closest("[data-manage]")) {
      go("details");
      return;
    }

    /* --- Payment method switch --- */
    var method = target.closest('input[name="bkMethod"]');
    if (method) {
      state.method = method.value;
      render();
      return;
    }

    var channel = target.closest('input[name="bkChannel"]');
    if (channel) {
      state.channel = channel.value;
      render();
      return;
    }

    /* --- Promo --- */
    if (target.closest("#bkPromoApply")) {
      var input = document.getElementById("bkPromo");
      var code = input ? input.value.trim() : "";
      if (!code) {
        toast("Enter a promo code first");
        return;
      }
      state.promo = code.toUpperCase();
      render();
      toast("Code " + state.promo + " applied");
      return;
    }

    /* --- Create payment order --- */
    if (target.closest("#bkPay")) {
      var consent = document.getElementById("bkConsent");
      if (consent && !consent.checked) {
        toast("Please accept the terms to continue");
        if (consent) consent.focus();
        return;
      }
      var detailCard = consent.closest(".bk-card").parentElement;
      var inputs = detailCard.querySelectorAll("input[required]");
      var ok = true;
      inputs.forEach(function (el) {
        if (!validateInput(el)) ok = false;
      });
      if (!ok) {
        toast("Check the highlighted fields");
        return;
      }
      clockLeft = 0;
      go("pending");
      toast("Order created");
      return;
    }

    /* --- Copy ids --- */
    var copy = target.closest("[data-copy]");
    if (copy) {
      var value = copy.dataset.copy;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value).then(
          function () { toast("Copied " + value); },
          function () { toast(value); }
        );
      } else {
        toast(value);
      }
      return;
    }

    /* --- Pending screen actions --- */
    if (target.closest("#bkCheckStatus")) {
      toast("Payment still pending");
      return;
    }

    var rate = target.closest("[data-rate]");
    if (rate) {
      state.rate = Number(rate.dataset.rate);
      render();
      return;
    }

    if (target.closest("#bkRateSubmit")) {
      if (state.rate === null) {
        toast("Pick a score first");
        return;
      }
      toast("Thanks for your feedback");
      return;
    }
  });

  /* Passenger upload — just confirms the file, the real OCR is server-side. */
  document.addEventListener("change", function (event) {
    var file = event.target;
    if (!file || file.type !== "file") return;
    var label = file.closest(".bk-drop");
    if (!label || !file.files || !file.files.length) return;
    var txt = label.querySelector('[data-role="drop-txt"]');
    var hint = label.querySelector(".bk-drop-hint");
    label.classList.add("has-file");
    if (txt) txt.textContent = file.files[0].name;
    if (hint) hint.textContent = "Ready to read — details fill in after upload.";
    toast("Passport attached");
  });

  /* Live validation, once the user leaves a field or types into it. */
  document.addEventListener(
    "blur",
    function (event) {
      var el = event.target;
      if (el && el.classList && el.classList.contains("bk-control")) {
        validateInput(el);
      }
    },
    true
  );

  /* Every keystroke is written back to state immediately, so the screen can be
     redrawn at any point — collapsing a traveler card, switching tabs,
     stepping forward and back — and the values come back. Fields linked by
     data-sync copy across to their partner so the two date of birth and
     nationality inputs never disagree. */
  function remember(el) {
    if (!el || !el.id) return;
    state.values[el.id] =
      el.type === "checkbox" || el.type === "radio" ? el.checked : el.value;

    var twinId = el.dataset && el.dataset.sync;
    if (!twinId) return;
    var twin = document.getElementById(twinId);
    if (!twin || twin.value === el.value) return;
    twin.value = el.value;
    state.values[twinId] = twin.value;
    clearError(twin);
  }

  document.addEventListener("input", function (event) {
    var el = event.target;
    if (!el || !el.classList || !el.classList.contains("bk-control")) return;
    remember(el);
    if (el.classList.contains("is-invalid")) validateInput(el);

    /* Keep the accordion headline and badge in sync while typing. */
    var field = el.closest(".bk-pax");
    if (field && (el.name === "given" || el.name === "surname")) {
      var t = travById(field.dataset.pax);
      var nameEl = field.querySelector('[data-role="name"]');
      if (t && nameEl) nameEl.textContent = paxHeadline(t);
    }
  });

  /* Mirror every typed control into state.values. The traveler tabs and the
     direction toggle are id-less buttons, so this sees only real inputs —
     their state lives in state.activePax / state.activeDir. */
  document.addEventListener("change", function (event) {
    var el = event.target;
    if (!el || !el.id) return;
    remember(el);
  });

  /* =====================================================================
     BOOT
     ===================================================================== */

  startClock();
  paintClock();
  render();
})();
