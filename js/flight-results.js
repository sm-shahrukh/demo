/* ============================================================================
   flight-results.js — renders the search results
   Header, filter panel, itinerary cards, fare packages and "more ways to fly",
   matching the one-way / round-trip / multi-city web and mobile designs.
   ========================================================================== */

(() => {
  const {
    CABINS,
    generateItineraries,
    buildSearch,
    formatDuration,
    formatLongDate,
    formatHeaderDate,
    minutesToClock,
    formatPKR,
    CURRENCY,
  } = FlightData;

  // ---------- 1. State ------------------------------------------------------

  const state = {
    search: null,
    itineraries: [],
    sort: "recommended",
    featuredId: null,
    packageId: "standard",
    // Whether the featured card's details are open. Held in state rather than read
    // back off the DOM, because renderList() rebuilds the card on every package
    // change and would otherwise snap it shut again.
    featuredExpanded: false,
    // Which of the three detail sections the open card is showing. Held in state
    // for the same reason as featuredExpanded, so changing fare package rebuilds
    // the card on the tab the traveller was already reading.
    detailTab: "itinerary",
    selectedPackageName: "Sample Standard",
    cabinBaggage: "1 × 8 kg",
    checkedBaggage: "1 × 23 kg",
    filters: {
      stops: [],
      airlines: [],
      baggage: [],
      times: [],
      maxPrice: 0,
      priceMax: 0,
      priceMin: 0,
      maxDuration: 0,
      durationMax: 0,
      hideSelfTransfer: false,
      hideAirportChange: false,
      hideOvernight: false,
    },
  };

  // ---------- 2. Small helpers ---------------------------------------------

  const getEl = (id) => document.getElementById(id);

  // Single conversion point: every figure on the page goes through here, so
  // fares, taxes and fees always move together.
  function money(amount) {
    return formatPKR(amount);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // "1 adult" / "2 adults, 1 child"
  function paxLabel(passengers) {
    const parts = [];
    if (passengers.adults) {
      parts.push(
        `${passengers.adults} adult${passengers.adults > 1 ? "s" : ""}`,
      );
    }
    if (passengers.children) {
      parts.push(
        `${passengers.children} child${passengers.children > 1 ? "ren" : ""}`,
      );
    }
    if (passengers.infants) {
      parts.push(
        `${passengers.infants} infant${passengers.infants > 1 ? "s" : ""}`,
      );
    }
    return parts.join(", ");
  }

  // Total seats travelling — drives "1 adult · all legs included"
  function paxCount(passengers) {
    return passengers.adults + passengers.children + passengers.infants;
  }

  function tripLabel(tripType) {
    if (tripType === "roundtrip") return "round-trip";
    if (tripType === "multicity") return "multi-city";
    return "one-way";
  }

  function legName(index, total) {
    if (total === 1) return `Journey leg ${index}`;
    if (tripLabel(state.search.tripType) === "round-trip") {
      return index === 1
        ? "Journey leg 1 · Outbound"
        : "Journey leg 2 · Return";
    }
    return `Journey leg ${index}`;
  }

  // "15 Oct" — compact cards only need day + month, not the full date
  function shortDate(date) {
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
  }

  // "+1 day" badge when a leg lands on a later calendar day
  function dayOffset(leg) {
    const days = Math.round((leg.arrivalDate - leg.date) / 86400000);
    if (days <= 0) return "";
    return ` +${days} day${days > 1 ? "s" : ""}`;
  }

  function airlineLogo(carrierCode) {
    const airline = FlightData.AIRLINE_BY_CODE[carrierCode];
    const websites = {
      EK: "emirates.com",
      FZ: "flydubai.com",
      QR: "qatarairways.com",
      SV: "saudia.com",
      TK: "turkishairlines.com",
      PC: "flypgs.com",
      PK: "piac.com.pk",
      AZ: "ita-airways.com",
      GF: "gulfair.com",
    };
    const style = airline
      ? `background:${airline.colour};color:${airline.dark ? "#1a1a1a" : "#fff"};`
      : "background:#64748b;color:#fff;";
    const name = airline?.name || carrierCode;
    const logo = websites[carrierCode]
      ? `<img src="https://www.google.com/s2/favicons?domain=${websites[carrierCode]}&amp;sz=128" alt="" onerror="this.hidden=true;this.nextElementSibling.hidden=false">`
      : "";
    return `<span class="fr-logo" style="${style}" role="img" aria-label="${escapeHtml(name)}">${logo}<span${
      logo ? " hidden" : ""
    }>${escapeHtml(carrierCode)}</span></span>`;
  }

  function carrierNames(itinerary) {
    return itinerary.carriers
      .map((code) => (FlightData.AIRLINE_BY_CODE[code] || {}).name || code)
      .join(" + ");
  }

  // ---------- 3. Filtering --------------------------------------------------

  function stopBucket(itinerary) {
    // Figma filters on stops per journey leg, so use the busiest leg
    const busiest = itinerary.legs.reduce(
      (max, leg) => Math.max(max, leg.stops),
      0,
    );
    return String(Math.min(busiest, 2));
  }

  function itineraryMatches(itinerary, filters) {
    if (
      filters.stops.length &&
      !filters.stops.includes(stopBucket(itinerary))
    ) {
      return false;
    }
    if (
      filters.airlines.length &&
      !itinerary.carriers.some((code) => filters.airlines.includes(code))
    ) {
      return false;
    }
    if (filters.baggage.includes("cabin") && !itinerary.includesCabinBag) {
      return false;
    }
    if (filters.baggage.includes("checked") && !itinerary.checkedBag) {
      return false;
    }
    if (
      filters.maxPrice < filters.priceMax &&
      itinerary.price > filters.maxPrice
    ) {
      return false;
    }
    if (
      filters.maxDuration < filters.durationMax &&
      itinerary.totalMin > filters.maxDuration
    ) {
      return false;
    }
    if (filters.hideSelfTransfer && itinerary.selfTransfer) return false;
    if (filters.hideAirportChange && itinerary.airportChange) return false;
    if (filters.hideOvernight && itinerary.overnight) return false;

    // Departure window applies to the first journey leg
    if (filters.times.length) {
      const hour = Math.floor(itinerary.firstDepartMinutes / 60);
      const inside = filters.times.some((window) => {
        if (window.to === 24) return hour >= window.from && hour <= 24;
        return hour >= window.from && hour < window.to;
      });
      if (!inside) return false;
    }

    return true;
  }

  // Recommendation score: price, travel time and connections, balanced.
  function recommendScore(itinerary) {
    return itinerary.price / 6 + itinerary.totalMin / 24 + itinerary.stops * 55;
  }

  function applySort(list) {
    const sorted = [...list];
    if (state.sort === "price") sorted.sort((a, b) => a.price - b.price);
    else if (state.sort === "duration")
      sorted.sort((a, b) => a.totalMin - b.totalMin);
    else sorted.sort((a, b) => recommendScore(a) - recommendScore(b));
    return sorted;
  }

  function visibleItineraries() {
    return applySort(
      state.itineraries.filter((itinerary) =>
        itineraryMatches(itinerary, state.filters),
      ),
    );
  }

  // ---------- 4. Header -----------------------------------------------------

  function renderHeader(total) {
    const search = state.search;

    // The headline is the whole route chained together, so a round trip reads
    // ISB → KHI → ISB and multi-city lists every stop in order. Taking only the
    // first origin avoids repeating the junction between two legs.
    const route = [
      search.legs[0].from.code,
      ...search.legs.map((leg) => leg.to.code),
    ];

    getEl("frDate").textContent = formatHeaderDate(search.legs[0].date);
    getEl("frTitle").innerHTML = route
      .map((code) => escapeHtml(code))
      .join('<span class="fr-arrow"> → </span>');
    getEl("frSub").textContent = `${paxLabel(search.passengers)} · ${
      CABINS[search.cabin].label
    }`;
    getEl("frCount").textContent = `${total} itinerar${
      total === 1 ? "y" : "ies"
    }`;
  }

  // ---------- 5. Filters ----------------------------------------------------

  // Counts for each option, computed against everything that passes the
  // other filters — the same way a real results page behaves.
  function optionCount(name, value) {
    const probe = { ...state.filters };
    probe[name] = [value];
    return state.itineraries.filter((itinerary) =>
      itineraryMatches(itinerary, probe),
    ).length;
  }

  // Both filter containers hold the same markup, so identifiers are classes and
  // every lookup is scoped to its own panel. No duplicate ids.
  const FILTER_CONTAINERS = ["frFilters", "frFiltersMobile"];

  function filterPanelMarkup() {
    const list = visibleItineraries();
    const filters = state.filters;

    const presentAirlines = new Map();
    state.itineraries.forEach((itinerary) => {
      itinerary.carriers.forEach((code) => {
        presentAirlines.set(code, (presentAirlines.get(code) || 0) + 1);
      });
    });
    const airlines = [...presentAirlines.entries()].sort((a, b) =>
      (FlightData.AIRLINE_BY_CODE[a[0]]?.name || a[0]).localeCompare(
        FlightData.AIRLINE_BY_CODE[b[0]]?.name || b[0],
      ),
    );

    const checked = (group, value) =>
      filters[group].includes(value) ? "checked" : "";

    const stopOptions = [
      { value: "0", label: "Nonstop" },
      { value: "1", label: "1 stop" },
      { value: "2", label: "2+ stops" },
    ];
    const bagOptions = [
      { value: "cabin", label: "Cabin bag included" },
      { value: "checked", label: "Checked bag included" },
    ];
    const timeOptions = [
      { from: 0, to: 6, label: "00-06", icon: "bi-sunrise" },
      { from: 6, to: 12, label: "06-12", icon: "bi-brightness-high" },
      { from: 12, to: 18, label: "12-18", icon: "bi-sunset" },
      { from: 18, to: 24, label: "18-24", icon: "bi-moon" },
    ];

    const timeOn = (option) =>
      filters.times.some((w) => w.from === option.from && w.to === option.to)
        ? "on"
        : "";

    const connectionToggles = [
      { key: "hideSelfTransfer", label: "Exclude self-transfer" },
      { key: "hideAirportChange", label: "Exclude airport changes" },
      { key: "hideOvernight", label: "Exclude overnight flights" },
    ];

    return `
      <div class="panel-head">
        <h2><i class="bi bi-sliders"></i> Filters</h2>
        <button type="button" class="link-btn fr-reset">Reset all</button>
      </div>
      <div class="fr-filter-chips d-none d-lg-flex"></div>

      <section>
        <h3>${
          state.search.tripType === "oneway" ? "Stops" : "Stops per journey leg"
        }</h3>
        ${stopOptions
          .map(
            (option) => `
          <label class="ck">
            <input type="checkbox" class="form-check-input" name="frStops"
                   value="${option.value}" data-label="${option.label}"
                   ${checked("stops", option.value)}>
            <span>${option.label}</span>
            <em>${optionCount("stops", option.value)}</em>
          </label>`,
          )
          .join("")}
        <p class="fr-note">All stop options included</p>
      </section>

      <section>
        <h3>Total price · ${escapeHtml(
          paxLabel(state.search.passengers).toLowerCase(),
        )}</h3>
        <div class="price-labels">
          <span>${money(filters.priceMin)}</span>
          <span class="fr-price-max-label">${money(filters.maxPrice)}${
            filters.maxPrice >= filters.priceMax ? "+" : ""
          }</span>
        </div>
        <input type="range" class="form-range fr-price-slider"
               min="${filters.priceMin}" max="${filters.priceMax}"
               step="5" value="${filters.maxPrice}"
               aria-label="Maximum total price">
      </section>

      <section>
        <h3>Departure time · local</h3>
        <div class="time-grid">
          ${timeOptions
            .map(
              (option) => `
            <button type="button" class="time-btn ${timeOn(option)}"
                    data-from="${option.from}" data-to="${option.to}"
                    data-label="${option.label}">
              <i class="bi ${option.icon}"></i>${option.label}
            </button>`,
            )
            .join("")}
        </div>
        <p class="fr-note fr-time-note">${
          filters.times.length
            ? `${filters.times.length} window${filters.times.length > 1 ? "s" : ""} selected`
            : "No time restriction"
        }</p>
      </section>

      <section>
        <h3>Max total travel time</h3>
        <div class="price-labels">
          <span>${formatDuration(filters.durationFloor || 0)}</span>
          <span class="fr-duration-label">${formatDuration(filters.maxDuration)}${
            filters.maxDuration >= filters.durationMax ? "+" : ""
          }</span>
        </div>
        <input type="range" class="form-range fr-duration-slider"
               min="${filters.durationFloor || 0}" max="${filters.durationMax}"
               step="15" value="${filters.maxDuration}"
               aria-label="Maximum total travel time">
      </section>

      <section>
        <h3>Airlines</h3>
        ${airlines
          .map(
            ([code, count]) => `
          <label class="ck">
            <input type="checkbox" class="form-check-input" name="frAirline"
                   value="${escapeHtml(code)}"
                   data-label="${escapeHtml(
                     (FlightData.AIRLINE_BY_CODE[code] || {}).name || code,
                   )}"
                   ${checked("airlines", code)}>
            <span>${escapeHtml(
              (FlightData.AIRLINE_BY_CODE[code] || {}).name || code,
            )}</span>
            <em>${count}</em>
          </label>`,
          )
          .join("")}
        <p class="fr-note">Any airline · operating carriers shown below</p>
      </section>

      <section>
        <h3>Baggage</h3>
        ${bagOptions
          .map(
            (option) => `
          <label class="ck">
            <input type="checkbox" class="form-check-input" name="frBaggage"
                   value="${option.value}" data-label="${option.label}"
                   ${checked("baggage", option.value)}>
            <span>${option.label}</span>
            <em>${optionCount("baggage", option.value)}</em>
          </label>`,
          )
          .join("")}
      </section>

      <section>
        <h3>Connections</h3>
        ${connectionToggles
          .map(
            (option) => `
          <label class="ck">
            <input type="checkbox" class="form-check-input" name="frConnection"
                   value="${option.key}" data-label="${option.label}"
                   ${filters[option.key] ? "checked" : ""}>
            <span>${option.label}</span>
          </label>`,
          )
          .join("")}
      </section>

      <button type="button" class="fr-apply d-lg-none">
        Apply filters · ${list.length} result${list.length === 1 ? "" : "s"}
      </button>
    `;
  }

  function renderFilters() {
    const markup = filterPanelMarkup();
    FILTER_CONTAINERS.forEach((id) => {
      const panel = getEl(id);
      if (panel) panel.innerHTML = markup;
    });
    FILTER_CONTAINERS.forEach(bindFilterEvents);
  }

  function bindFilterEvents(panelId) {
    const panel = getEl(panelId);
    if (!panel) return;

    panel.querySelectorAll("input[type=checkbox]").forEach((input) => {
      input.addEventListener("change", () => {
        if (input.name === "frStops")
          toggleInArray(state.filters.stops, input.value, input.checked);
        if (input.name === "frAirline")
          toggleInArray(state.filters.airlines, input.value, input.checked);
        if (input.name === "frBaggage")
          toggleInArray(state.filters.baggage, input.value, input.checked);
        if (input.name === "frConnection")
          state.filters[input.value] = input.checked;
        refresh();
      });
    });

    panel.querySelectorAll(".time-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const option = {
          from: Number(button.dataset.from),
          to: Number(button.dataset.to),
        };
        const exists = state.filters.times.some(
          (w) => w.from === option.from && w.to === option.to,
        );
        if (exists) {
          state.filters.times = state.filters.times.filter(
            (w) => !(w.from === option.from && w.to === option.to),
          );
        } else {
          state.filters.times.push(option);
        }
        refresh();
      });
    });

    // Sliders update their own panel's label, then re-render results only
    panel.querySelectorAll(".fr-price-slider").forEach((slider) => {
      slider.addEventListener("input", () => {
        state.filters.maxPrice = Number(slider.value);
        refreshFromSlider();
      });
    });

    panel.querySelectorAll(".fr-duration-slider").forEach((slider) => {
      slider.addEventListener("input", () => {
        state.filters.maxDuration = Number(slider.value);
        refreshFromSlider();
      });
    });

    panel.querySelectorAll(".fr-reset").forEach((button) => {
      button.addEventListener("click", () => {
        resetFilters();
        refresh();
      });
    });

    panel.querySelectorAll(".fr-apply").forEach((button) => {
      button.addEventListener("click", () => {
        bootstrap.Offcanvas.getInstance(getEl("frFiltersPanel"))?.hide();
      });
    });
  }

  function toggleInArray(list, value, on) {
    const index = list.indexOf(value);
    if (on && index === -1) list.push(value);
    if (!on && index !== -1) list.splice(index, 1);
  }

  function resetFilters() {
    const filters = state.filters;
    filters.stops = [];
    filters.airlines = [];
    filters.baggage = [];
    filters.times = [];
    filters.maxPrice = filters.priceMax;
    filters.maxDuration = filters.durationMax;
    filters.hideSelfTransfer = false;
    filters.hideAirportChange = false;
    filters.hideOvernight = false;
  }

  // ---------- 6. Chips ------------------------------------------------------

  function renderChips() {
    const filters = state.filters;
    const chips = [];

    filters.stops.forEach((value) => {
      chips.push({
        label: { 0: "Nonstop", 1: "1 stop", 2: "2+ stops" }[value] || value,
        group: "stops",
        value,
      });
    });
    filters.airlines.forEach((code) => {
      chips.push({
        label: (FlightData.AIRLINE_BY_CODE[code] || {}).name || code,
        group: "airlines",
        value: code,
      });
    });
    filters.baggage.forEach((value) => {
      chips.push({
        label: value === "cabin" ? "Cabin bag" : "Checked bag",
        group: "baggage",
        value,
      });
    });
    filters.times.forEach((window) => {
      chips.push({
        label: `${String(window.from).padStart(2, "0")}-${String(
          window.to,
        ).padStart(2, "0")}`,
        group: "times",
        value: window,
      });
    });
    if (filters.maxPrice < filters.priceMax) {
      chips.push({ label: `Up to ${money(filters.maxPrice)}`, group: "price" });
    }
    if (filters.maxDuration < filters.durationMax) {
      chips.push({
        label: `Under ${formatDuration(filters.maxDuration)}`,
        group: "duration",
      });
    }
    ["hideSelfTransfer", "hideAirportChange", "hideOvernight"].forEach(
      (key) => {
        if (filters[key]) {
          const label = {
            hideSelfTransfer: "No self-transfer",
            hideAirportChange: "No airport changes",
            hideOvernight: "No overnight",
          }[key];
          chips.push({ label, group: key });
        }
      },
    );

    const html = chips
      .map(
        (chip, index) => `
      <button type="button" class="chip" data-chip="${index}">
        ${escapeHtml(chip.label)} <i class="bi bi-x"></i>
      </button>`,
      )
      .join("");

    document
      .querySelectorAll(".fr-filter-chips, #frMobileChips")
      .forEach((box) => {
        if (box) box.innerHTML = html;
      });

    const count = chips.length;
    getEl("frFilterCount").textContent = count ? ` · ${count}` : "";
  }

  function removeChip(index) {
    const filters = state.filters;
    const chip = collectChips()[index];
    if (!chip) return;

    // Chip indices are global, but each group's values are a flat list, so the
    // chip must carry the value to drop rather than re-slicing by index.
    if (chip.group === "stops")
      filters.stops = filters.stops.filter((value) => value !== chip.value);
    if (chip.group === "airlines")
      filters.airlines = filters.airlines.filter((code) => code !== chip.value);
    if (chip.group === "baggage")
      filters.baggage = filters.baggage.filter((value) => value !== chip.value);
    if (chip.group === "times")
      filters.times = filters.times.filter(
        (window) =>
          !(window.from === chip.value.from && window.to === chip.value.to),
      );
    if (chip.group === "price") filters.maxPrice = filters.priceMax;
    if (chip.group === "duration") filters.maxDuration = filters.durationMax;
    if (filters[chip.group] === true) filters[chip.group] = false;

    refresh();
  }

  function collectChips() {
    const filters = state.filters;
    const chips = [];
    filters.stops.forEach((value) =>
      chips.push({
        label: { 0: "Nonstop", 1: "1 stop", 2: "2+ stops" }[value] || value,
        group: "stops",
      }),
    );
    filters.airlines.forEach((code) =>
      chips.push({
        label: (FlightData.AIRLINE_BY_CODE[code] || {}).name || code,
        group: "airlines",
      }),
    );
    filters.baggage.forEach((value) =>
      chips.push({
        label: value === "cabin" ? "Cabin bag" : "Checked bag",
        group: "baggage",
      }),
    );
    filters.times.forEach((window) =>
      chips.push({
        label: `${String(window.from).padStart(2, "0")}-${String(
          window.to,
        ).padStart(2, "0")}`,
        group: "times",
      }),
    );
    if (filters.maxPrice < filters.priceMax) chips.push({ group: "price" });
    if (filters.maxDuration < filters.durationMax)
      chips.push({ group: "duration" });
    if (filters.hideSelfTransfer) chips.push({ group: "hideSelfTransfer" });
    if (filters.hideAirportChange) chips.push({ group: "hideAirportChange" });
    if (filters.hideOvernight) chips.push({ group: "hideOvernight" });
    return chips;
  }

  // Bag strings read "1 × 23 kg"; the reference design shows a single combined
  // "Total: 30kg", so add the pieces up rather than printing both strings.
  function totalBagKg(cabin) {
    const sum = (label) => {
      const match = /(\d+)\s*×\s*(\d+)\s*kg/i.exec(label || "");
      return match ? Number(match[1]) * Number(match[2]) : 0;
    };
    return sum(cabin.cabinBag) + sum(cabin.checkedBag);
  }

  // One leg as a horizontal strip: operator logo on the left with the carrier
  // code and flight number beneath it, times and stops in the middle, and the
  // fare on the right behind a vertical rule. Multi-leg itineraries stack one of
  // these per journey leg; the fare cell rides on the first row only, since a
  // trip is priced once however many legs it has.
  function buildCardTopRow(leg, options) {
    const { totalLegs, showFare, itinerary, selectedPackage } = options;

    const stopText =
      leg.stops === 0
        ? "Nonstop"
        : `${leg.stops} stop${leg.stops > 1 ? "s" : ""}`;

    // Later legs are tagged with their day offset, so a round trip's return row
    // is distinguishable from its outbound without needing the journey-leg bar.
    const offset = Math.round((leg.date - options.firstLegDate) / 86400000);
    const dayTag = totalLegs > 1 && offset > 0 ? `${offset}d · ` : "";

    // Operators on this leg only, so a multi-city card doesn't repeat one
    // airline across rows that a different carrier flies.
    const carriers = [...new Set(leg.segments.map((s) => s.carrier))];
    const flightNumbers = leg.segments
      .map((segment) => segment.flightNumber.replace(/ /g, "-"))
      .join(" · ");

    return `
      <div class="fr-row">
        <div class="fr-row-carrier">
          <div class="fr-row-logos">
            ${carriers.map((code) => airlineLogo(code)).join("")}
          </div>
          <b class="fr-row-code">${escapeHtml(
            carriers
              .map(
                (code) => (FlightData.AIRLINE_BY_CODE[code] || {}).name || code,
              )
              .join(" + "),
          )}</b>
          <small class="fr-row-flightno">${escapeHtml(flightNumbers)}</small>
        </div>

        <div class="fr-row-main">
          <div class="fr-row-times">
            <b class="fr-row-time">${escapeHtml(minutesToClock(leg.departAt))}</b>
            <span class="fr-row-duration">${escapeHtml(
              formatDuration(leg.totalMin),
            )}</span>
            <b class="fr-row-time">${escapeHtml(minutesToClock(leg.arriveAt))}</b>
          </div>
          <div class="fr-row-route">
            <span>${escapeHtml(leg.origin.city)} (${escapeHtml(
              leg.origin.code,
            )})</span>
            <span class="fr-row-dash">–</span>
            <span class="fr-row-stops">${escapeHtml(stopText)}</span>
            <span class="fr-row-dash">–</span>
            <span>${escapeHtml(leg.destination.city)} (${escapeHtml(
              leg.destination.code,
            )})</span>
          </div>
          <small class="fr-row-meta">
            ${escapeHtml(dayTag)}<i class="bi bi-luggage"></i> Total: ${escapeHtml(
              totalBagKg(itinerary.cabin),
            )}kg
            <i class="bi bi-cup-hot"></i> Meal
          </small>
        </div>

        ${
          showFare
            ? `<div class="fr-row-fare">
                 ${
                   options.savings > 0
                     ? `<span class="fr-row-save">Save ${escapeHtml(
                         money(options.savings),
                       )} <i class="bi bi-info-circle"></i></span>`
                     : ""
                 }
                 <b class="fr-row-price">${escapeHtml(
                   money(
                     selectedPackage.price +
                       itinerary.taxes +
                       itinerary.serviceFee,
                   ),
                 )}</b>
                 <small class="fr-row-price-note">Total trip price</small>
                 ${options.collapse || ""}
               </div>`
            : ""
        }
      </div>`;
  }

  // All legs of an itinerary as card-top rows. The fare column rides on the
  // first row; the rest are left empty so the price aligns with row one.
  // `options.collapse` is the featured card's show/hide control, tucked under
  // the fare so the bottom of the card carries nothing but the details.
  function buildCardTop(itinerary, selectedPackage, options = {}) {
    const totalLegs = itinerary.legs.length;
    const savings = Math.max(0, itinerary.price - selectedPackage.price);
    const totalFare = money(
      selectedPackage.price + itinerary.taxes + itinerary.serviceFee,
    );

    return `
      <div class="fr-card-top-rows${totalLegs > 1 ? " is-multi" : ""}">
        <div class="fr-mobile-fare">
          ${
            savings > 0
              ? `<span class="fr-row-save">Save ${escapeHtml(
                  money(savings),
                )} <i class="bi bi-info-circle"></i></span>`
              : ""
          }
          <b class="fr-row-price">${escapeHtml(totalFare)}</b>
          <small class="fr-row-price-note">Total trip price</small>
          ${options.collapse || ""}
        </div>
        ${itinerary.legs
          .map((leg, index) =>
            buildCardTopRow(leg, {
              totalLegs,
              showFare: index === 0,
              itinerary,
              selectedPackage,
              firstLegDate: itinerary.legs[0].date,
              savings,
              collapse: options.collapse,
            }),
          )
          .join("")}
      </div>`;
  }

  // ---------- 7. Card building ---------------------------------------------

  // The three detail sections the featured card switches between once expanded.
  // Each label doubles as the heading for its panel, so the panels themselves
  // carry no duplicate h4.
  const DETAIL_TABS = [
    { id: "itinerary", label: "Flight itinerary" },
    { id: "fare", label: "Fare summary" },
    { id: "package", label: "Fare package" },
  ];

  function buildConnectionNote(connection) {
    const icon =
      connection.kind === "overnight"
        ? "bi-moon-stars"
        : connection.airportChange
          ? "bi-exclamation-triangle"
          : "bi-clock";
    return `
      <div class="fr-note-box fr-note-${connection.kind}">
        <i class="bi ${icon}"></i>
        <div>
          <b>${escapeHtml(connection.label)} · ${escapeHtml(
            connection.duration,
          )}</b>
          <span>${escapeHtml(connection.detail)}</span>
        </div>
      </div>`;
  }

  function buildSegment(segment, leg) {
    const airline = FlightData.AIRLINE_BY_CODE[segment.carrier];
    const departDay = FlightData.addDays(leg.date, segment.departDayOffset);
    const arriveDay = FlightData.addDays(leg.date, segment.arriveDayOffset);
    const dayOffset = segment.arriveDayOffset - segment.departDayOffset;

    return `
      <div class="fr-segment">
        <div class="fr-segment-head">
          <span class="fr-eyebrow fr-eyebrow-blue">
            Flight segment ${segment.index} · ${escapeHtml(
              segment.flightNumber,
            )}
          </span>
          <div class="fr-segment-carrier">
            ${airlineLogo(segment.carrier)}
            <div>
              <b>${escapeHtml(airline ? airline.name : segment.carrier)}</b>
              <small>Operated by ${escapeHtml(segment.operatedBy)}</small>
              <small>${escapeHtml(segment.aircraft)} · ${escapeHtml(
                itineraryCabinLabel(),
              )} · ${formatDuration(segment.durationMin)}</small>
            </div>
          </div>
        </div>

        <div class="fr-segment-route">
          <div class="fr-end">
            <b class="fr-end-time">${minutesToClock(segment.departAt)} ${escapeHtml(
              segment.from.code,
            )}</b>
            <small>Departs ${escapeHtml(
              FlightData.formatLongDate(departDay),
            )}</small>
            <b>${escapeHtml(segment.from.name)}</b>
            <small>${escapeHtml(segment.from.code)} · ${escapeHtml(
              segment.fromTerminal,
            )}</small>
          </div>

          <div class="fr-track">
            <span class="fr-track-time">${formatDuration(
              segment.durationMin,
            )}</span>
            <div class="fr-track-line">
              <i class="fr-track-dot"></i>
              <i class="bi bi-airplane fr-track-plane"></i>
              <i class="fr-track-dot"></i>
            </div>
          </div>

          <div class="fr-end fr-end-right">
            <b class="fr-end-time">${minutesToClock(segment.arriveAt)} ${escapeHtml(
              segment.to.code,
            )}<span class="fr-day-offset">${
              dayOffset > 0 ? ` +${dayOffset} day` : ""
            }</span></b>
            <small>Arrives ${escapeHtml(
              FlightData.formatLongDate(arriveDay),
            )}</small>
            <b>${escapeHtml(segment.to.name)}</b>
            <small>${escapeHtml(segment.to.code)} · ${escapeHtml(
              segment.toTerminal,
            )}</small>
          </div>
        </div>

        <div class="fr-baggage-line">
          <i class="bi bi-bag-check"></i>
          <span>Cabin: ${escapeHtml(state.cabinBaggage)} · Checked: ${escapeHtml(
            state.checkedBaggage,
          )} per adult. Selected ${escapeHtml(
            state.selectedPackageName,
          )} allowance.</span>
        </div>
      </div>`;
  }

  function itineraryCabinLabel() {
    return (CABINS[state.search.cabin] || CABINS.Economy).label;
  }

  function buildJourneyLeg(leg, totalLegs) {
    let html = `
      <div class="fr-leg">
        <div class="fr-leg-bar">
          <span class="fr-leg-number">${leg.legIndex}</span>
          <div>
            <b>${escapeHtml(legName(leg.legIndex, totalLegs))} · ${escapeHtml(
              leg.origin.city,
            )} → ${escapeHtml(leg.destination.city)}</b>
            <small>${escapeHtml(leg.dateLabel)}${dayOffset(
              leg,
            )} · ${formatDuration(leg.totalMin)} total · ${
              leg.stops === 0
                ? "Nonstop"
                : `${leg.stops} stop${leg.stops > 1 ? "s" : ""} · ${leg.segments
                    .slice(1)
                    .map((segment) => segment.to.code)
                    .join(", ")}`
            }</small>
          </div>
        </div>`;

    leg.segments.forEach((segment, index) => {
      html += buildSegment(segment, leg);
      if (leg.connections[index])
        html += buildConnectionNote(leg.connections[index]);
    });

    return `${html}</div>`;
  }

  function buildFareSummary(itinerary, selectedPackage) {
    return `
      <div class="fr-fare-summary">
        <div class="fr-fare-head">
          <span class="fr-selected-label">${escapeHtml(
            selectedPackage.name,
          )} selected</span>
        </div>
        <div class="fr-fare-body">
          <div class="fr-fare-left">
            <b>${escapeHtml(paxLabel(state.search.passengers))} · ${escapeHtml(
              itinerary.cabin.label,
            )}</b>
            <small>${itinerary.legs.length} journey leg${
              itinerary.legs.length > 1 ? "s" : ""
            } · all segments included</small>
            <small>Base fare includes ${escapeHtml(
              itinerary.cabin.checkedBag,
            )} checked and ${escapeHtml(
              itinerary.cabin.cabinBag,
            )} cabin bag on every segment.</small>
            <small>Taxes are charged per adult and repeat on every segment.</small>
          </div>
          <div class="fr-fare-right">
            <div class="fr-fare-row">
              <span>Base fare</span><b>${money(itinerary.baseFare)}</b>
            </div>
            <div class="fr-fare-row">
              <span>Taxes &amp; airport charges</span><b>${money(
                itinerary.taxes,
              )}</b>
            </div>
            <div class="fr-fare-row">
              <span>Service fee</span><b>${money(itinerary.serviceFee)}</b>
            </div>
            <div class="fr-fare-total">
              <div>
                <small>Grand total · ${escapeHtml(CURRENCY.code)}</small>
              </div>
              <b>${money(selectedPackage.price + itinerary.taxes + itinerary.serviceFee)}</b>
            </div>
            <small class="fr-fare-fine">${escapeHtml(
              paxCount(state.search.passengers),
            )} adult · incl. taxes &amp; service fee</small>
            <small class="fr-fare-fine">Review traveller details and final fare before payment.</small>
            <button type="button" class="fr-book-btn" data-book="${escapeHtml(
              itinerary.id,
            )}">Book ${tripLabel(state.search.tripType)} <i class="bi bi-arrow-right"></i></button>
          </div>
        </div>
      </div>`;
  }

  function buildPackageCard(pkg, selectedId, itinerary) {
    const selected = pkg.id === selectedId;
    const delta = pkg.uplift
      ? `+${money(pkg.uplift)} vs Starter · total for ${escapeHtml(
          paxCount(state.search.passengers),
        )}`
      : `Base package · +${formatPKR(0)} · total for ${escapeHtml(
          paxCount(state.search.passengers),
        )}`;

    const rows = [
      { label: "Cabin bag", value: pkg.cabinBag },
      { label: "Checked bag", value: pkg.checkedBag },
      { label: "Seat", value: pkg.seat },
      { label: "Meals", value: pkg.meals },
      { label: "Changes", value: pkg.changes },
      { label: "Refunds", value: pkg.refunds },
    ];

    return `
       <div class="fr-package ${selected ? "selected" : ""}"
         data-package-card role="group" tabindex="0"
         aria-label="Select ${escapeHtml(pkg.name)} fare package">
        <label class="fr-package-radio">
          <input type="radio" name="frPackage" value="${escapeHtml(pkg.id)}"
                 data-itinerary="${escapeHtml(itinerary.id)}"
                 ${selected ? "checked" : ""}>
          <span>${selected ? "Selected package" : "Illustrative package"}</span>
        </label>
        <b class="fr-package-name">${escapeHtml(pkg.name)}</b>
        <b class="fr-package-price">${money(pkg.price)}</b>
        <small class="fr-package-delta">${delta}</small>
        <div class="fr-package-rows">
          ${rows
            .map(
              (row) => `
            <div class="fr-package-row">
              <span>${row.label}</span>
              <b>${escapeHtml(row.value)}</b>
            </div>`,
            )
            .join("")}
        </div>
        <button type="button" class="fr-package-btn">
          ${selected ? "Selected" : "Choose package"}
        </button>
      </div>`;
  }

  function buildPackages(itinerary, selectedPackage) {
    const total = paxCount(state.search.passengers);
    const grandTotal =
      selectedPackage.price + itinerary.taxes + itinerary.serviceFee;

    return `
      <div class="fr-packages">
        <div class="fr-packages-head">
          <p>Illustrative comparison only — these are not verified company fare
             names, prices or rules. Benefits apply to all segments and
             ${escapeHtml(
               total,
             )} adult${total > 1 ? "s" : ""}. Confirm each operating
             carrier's conditions before booking.</p>
        </div>
        <div class="fr-package-grid">
          ${itinerary.packages
            .map((pkg) => buildPackageCard(pkg, selectedPackage.id, itinerary))
            .join("")}
        </div>
        <div class="fr-continue">
          <div>
            <b>${escapeHtml(selectedPackage.name)} · ${money(grandTotal)}</b>
            <small>${escapeHtml(paxLabel(state.search.passengers))} · ${escapeHtml(
              tripLabel(state.search.tripType),
            )} · all taxes &amp; service fee included</small>
          </div>
          <button type="button" class="fr-continue-btn" data-book="${escapeHtml(
            itinerary.id,
          )}">Continue to booking <i class="bi bi-arrow-right"></i></button>
        </div>
      </div>`;
  }

  function buildFeaturedCard(itinerary, selectedPackage) {
    const totalLegs = itinerary.legs.length;
    const expanded = state.featuredExpanded;
    const collapseLabel = expanded
      ? "Hide itinerary &amp; fare details"
      : "Show itinerary &amp; fare details";
    const pillText = expanded ? "Details expanded" : "Details collapsed";
    const activeTab = state.detailTab;

    // One panel per tab. Only the active one is rendered visible, so the section
    // a tab names is exactly the markup it had when every section was stacked.
    const panel = (id, content) => `
        <div class="fr-detail-panel" role="tabpanel" id="frPanel-${id}"
             aria-labelledby="frTab-${id}" data-detail="${id}"${
               activeTab === id ? "" : " hidden"
             }>${content}</div>`;

    return `
      <article class="fr-card fr-card-featured${
        expanded ? "" : " collapsed"
      }" data-id="${escapeHtml(itinerary.id)}">
        <div class="fr-card-flags">
          <span class="fr-badge fr-badge-green">Recommended</span>
          <span class="fr-pill">${pillText}</span>
          <small class="fr-card-flags-meta">${escapeHtml(
            paxLabel(state.search.passengers),
          )} · ${escapeHtml(selectedPackage.name)} · ${escapeHtml(
            itinerary.cabin.label,
          )}</small>
        </div>

        ${buildCardTop(itinerary, selectedPackage, {
          collapse: `<button type="button" class="fr-collapse-btn" data-collapse>
              ${collapseLabel} <i class="bi bi-chevron-down"></i>
            </button>`,
        })}

        <div class="fr-detail-tabs" role="tablist" aria-label="Flight details">
          ${DETAIL_TABS.map(
            (tab) => `
            <button type="button" role="tab" class="fr-detail-tab${
              tab.id === activeTab ? " active" : ""
            }" id="frTab-${tab.id}" aria-controls="frPanel-${tab.id}"
                    aria-selected="${tab.id === activeTab}"
                    data-detail-tab="${tab.id}">${escapeHtml(tab.label)}</button>`,
          ).join("")}
        </div>

        ${panel(
          "itinerary",
          `
        <div class="fr-block">
          <div class="fr-block-head">
            <small>All journey legs expanded · local airport times</small>
          </div>
          ${itinerary.legs
            .map((leg) => buildJourneyLeg(leg, totalLegs))
            .join("")}
        </div>`,
        )}

        ${panel("fare", buildFareSummary(itinerary, selectedPackage))}
        ${panel("package", buildPackages(itinerary, selectedPackage))}
      </article>`;
  }

  function buildCompactCard(itinerary, tag, selectedPackage) {
    const packageForRow =
      selectedPackage ||
      itinerary.packages.find((pkg) => pkg.id === "standard") ||
      itinerary.packages[1];
    return `
      <article class="fr-card fr-card-compact" data-id="${escapeHtml(itinerary.id)}">
        ${tag ? `<div class="fr-card-flags"><span class="fr-badge">${escapeHtml(tag)}</span></div>` : ""}

        ${buildCardTop(itinerary, packageForRow)}

        <div class="fr-compact-actions">
          <button type="button" class="fr-link-btn" data-expand="${escapeHtml(
            itinerary.id,
          )}">Show details <i class="bi bi-chevron-down"></i></button>
          <button type="button" class="fr-select-btn" data-featured="${escapeHtml(
            itinerary.id,
          )}">Select itinerary <i class="bi bi-arrow-right"></i></button>
        </div>
      </article>`;
  }

  // ---------- 8. List rendering ---------------------------------------------

  function tagFor(itinerary, pool) {
    const fastest = pool.reduce(
      (best, item) => (item.totalMin < best.totalMin ? item : best),
      pool[0],
    );
    const latest = pool.reduce(
      (best, item) =>
        item.firstDepartMinutes > best.firstDepartMinutes ? item : best,
      pool[0],
    );
    const cheapest = pool.reduce(
      (best, item) => (item.price < best.price ? item : best),
      pool[0],
    );

    if (itinerary === fastest) return "Fastest";
    if (itinerary === latest) return "Later departure";
    if (itinerary === cheapest) return "Lowest fare";
    if (itinerary.stops === 0) return "All legs nonstop";
    if (itinerary.selfTransfer) return "Self transfer";
    return "";
  }

  function renderList() {
    const list = visibleItineraries();
    const container = getEl("frList");

    if (!list.length) {
      container.innerHTML = `
        <div class="fr-empty">
          <i class="bi bi-airplane"></i>
          <b>No itineraries match these filters</b>
          <span>Try widening the price or travel-time range, or removing a
                stop or airline filter.</span>
          <button type="button" class="fr-reset-btn" id="frEmptyReset">Reset filters</button>
        </div>`;
      getEl("frEmptyReset")?.addEventListener("click", () => {
        resetFilters();
        refresh();
      });
      getEl("frMoreWrap").innerHTML = "";
      return;
    }

    const featured =
      list.find((itinerary) => itinerary.id === state.featuredId) || list[0];
    state.featuredId = featured.id;

    const selectedPackage =
      featured.packages.find((pkg) => pkg.id === state.packageId) ||
      featured.packages[1];

    const rest = list.filter((itinerary) => itinerary.id !== featured.id);

    container.innerHTML =
      buildFeaturedCard(featured, selectedPackage) +
      (rest.length
        ? `<h4 class="fr-more-title">More ways to fly</h4>
           <div class="fr-compact-list">
             ${rest
               .slice(0, 2)
               .map((itinerary) =>
                 buildCompactCard(itinerary, tagFor(itinerary, rest)),
               )
               .join("")}
           </div>`
        : "");

    const hidden = Math.max(0, rest.length - 2);
    getEl("frMoreWrap").innerHTML = hidden
      ? `<button type="button" class="more-btn" id="frShowMore">
           Show ${hidden} more itinerar${hidden === 1 ? "y" : "ies"}
           <i class="bi bi-arrow-down"></i>
         </button>`
      : "";

    getEl("frShowMore")?.addEventListener("click", (event) => {
      const moreList = document.createElement("div");
      moreList.className = "fr-compact-list fr-compact-more";
      moreList.innerHTML = rest
        .slice(2)
        .map((itinerary) =>
          buildCompactCard(itinerary, tagFor(itinerary, rest)),
        )
        .join("");
      event.currentTarget.closest("#frMoreWrap").before(moreList);
      getEl("frMoreWrap").innerHTML = "";
    });

    syncPackageContext(featured, selectedPackage);
  }

  // Stash the selected package + baggage allowance on state so the segment
  // builders can show the right wording.
  function syncPackageContext(itinerary, selectedPackage) {
    state.selectedPackageName = selectedPackage.name;
    state.cabinBaggage = itinerary.cabin.cabinBag;
    state.checkedBaggage =
      selectedPackage.checkedBag === "Not included"
        ? "Not included"
        : selectedPackage.checkedBag;
  }

  // ---------- 9. Sort -------------------------------------------------------

  function renderSort() {
    const list = visibleItineraries();
    const note = {
      recommended: "Balanced for price, travel time and connections",
      price: "Sorted by lowest total price",
      duration: "Sorted by shortest total travel time",
    }[state.sort];

    getEl("frSortNote").innerHTML = `<i class="bi bi-stars"></i> ${note}`;
    getEl("frSortTabs")
      .querySelectorAll("[data-sort]")
      .forEach((tab) => {
        tab.classList.toggle("active", tab.dataset.sort === state.sort);
      });
    getEl("frSortCount").textContent = `${list.length} shown`;
  }

  // ---------- 10. Refresh ---------------------------------------------------

  // A slider tick must not rebuild the panel, or the element being dragged is
  // destroyed mid-gesture. Update the labels in place and re-render results.
  function refreshFromSlider() {
    const filters = state.filters;

    document.querySelectorAll(".fr-price-max-label").forEach((label) => {
      label.textContent = `${money(filters.maxPrice)}${
        filters.maxPrice >= filters.priceMax ? "+" : ""
      }`;
    });
    document.querySelectorAll(".fr-duration-label").forEach((label) => {
      label.textContent = `${formatDuration(filters.maxDuration)}${
        filters.maxDuration >= filters.durationMax ? "+" : ""
      }`;
    });
    document.querySelectorAll(".fr-price-slider").forEach((slider) => {
      if (Number(slider.value) !== filters.maxPrice) {
        slider.value = filters.maxPrice;
      }
    });
    document.querySelectorAll(".fr-duration-slider").forEach((slider) => {
      if (Number(slider.value) !== filters.maxDuration) {
        slider.value = filters.maxDuration;
      }
    });
    document.querySelectorAll(".fr-time-note").forEach((note) => {
      note.textContent = filters.times.length
        ? `${filters.times.length} window${
            filters.times.length > 1 ? "s" : ""
          } selected`
        : "No time restriction";
    });

    renderChips();
    renderSort();
    renderList();
  }

  function refresh() {
    renderHeader(state.itineraries.length);
    renderFilters();
    renderChips();
    renderSort();
    renderList();
  }

  // ---------- 11. Public API ------------------------------------------------

  /**
   * Run a search and render the results.
   * options = {
   *   tripType, from, to, departure, return, multiLegs,
   *   adults, children, infants, cabin
   * }
   */
  function search(options) {
    const built = buildSearch(options);

    if (!built.legs.length) {
      getEl("frResults").hidden = true;
      return { ok: false, itineraries: [] };
    }

    // A real result set exists, so swap the "choose a route" prompt for the grid.
    // This only happens on success, so a rejected search cannot reveal a stale grid.
    const results = getEl("frResults");
    results.hidden = false;
    results.classList.remove("fr-awaiting-search");
    state.search = built;
    state.itineraries = generateItineraries(built);
    state.packageId = "standard";
    state.featuredId = null;
    // A fresh search starts from the collapsed card again, as in the design.
    state.featuredExpanded = false;
    state.detailTab = "itinerary";

    // Slider bounds come from the generated set
    const prices = state.itineraries.map((itinerary) => itinerary.price);
    const durations = state.itineraries.map((itinerary) => itinerary.totalMin);
    state.filters.priceMin = Math.floor(Math.min(...prices) / 10) * 10;
    state.filters.priceMax = Math.ceil(Math.max(...prices) / 10) * 10;
    state.filters.maxPrice = state.filters.priceMax;
    state.filters.durationFloor = Math.floor(Math.min(...durations) / 15) * 15;
    state.filters.durationMax = Math.ceil(Math.max(...durations) / 15) * 15;
    state.filters.maxDuration = state.filters.durationMax;
    resetFilters();

    refresh();

    return { ok: true, itineraries: state.itineraries, search: built };
  }

  // ---------- 12. Events ----------------------------------------------------

  document.addEventListener("click", (event) => {
    const target = event.target;

    // Sort tabs
    const sortTab = target.closest("[data-sort]");
    if (sortTab) {
      event.preventDefault();
      state.sort = sortTab.dataset.sort;
      renderSort();
      renderList();
      return;
    }

    // Switch the open card's detail section
    const detailTab = target.closest("[data-detail-tab]");
    if (detailTab) {
      state.detailTab = detailTab.dataset.detailTab;
      const featured = getEl("frList").querySelector(".fr-card-featured");
      if (featured) {
        // Swap the panel in place instead of re-rendering: a re-render would
        // rebuild the card under the pointer and jump the scroll position.
        featured.querySelectorAll("[data-detail-tab]").forEach((button) => {
          const active = button.dataset.detailTab === state.detailTab;
          button.classList.toggle("active", active);
          button.setAttribute("aria-selected", String(active));
        });
        featured.querySelectorAll(".fr-detail-panel").forEach((panel) => {
          panel.hidden = panel.dataset.detail !== state.detailTab;
        });
      }
      return;
    }

    // Remove an active filter chip
    const chip = target.closest(".chip[data-chip]");
    if (chip) {
      removeChip(Number(chip.dataset.chip));
      return;
    }

    // Promote a compact card to the featured card
    const featureButton = target.closest("[data-featured]");
    if (featureButton) {
      state.featuredId = featureButton.dataset.featured;
      state.packageId = "standard";
      renderList();
      getEl("frResults").scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    // Choose a fare package
    const packageButton = target.closest(".fr-package-btn");
    if (packageButton) {
      const card = packageButton.closest(".fr-package");
      const radio = card.querySelector("input[type=radio]");
      radio.checked = true;
      state.packageId = radio.value;
      renderList();
      return;
    }

    const packageCard = target.closest("[data-package-card]");
    if (packageCard && !target.closest("input, label")) {
      const radio = packageCard.querySelector("input[type=radio]");
      if (!radio.checked) radio.click();
      return;
    }

    // Collapse the featured card's details
    if (target.closest("[data-collapse]")) {
      const featured = getEl("frList").querySelector(".fr-card-featured");
      if (featured) {
        const collapsed = featured.classList.toggle("collapsed");
        // Record the state as well as applying it, so a later re-render — changing
        // the fare package, for instance — rebuilds the card in the same open or
        // shut position instead of snapping back to collapsed.
        state.featuredExpanded = !collapsed;
        const buttons = featured.querySelectorAll(".fr-collapse-btn");
        const pill = featured.querySelector(".fr-pill");
        buttons.forEach((button) => {
          button.childNodes[0].nodeValue = collapsed
            ? " Show itinerary & fare details "
            : " Hide itinerary & fare details ";
        });
        if (pill)
          pill.textContent = collapsed
            ? "Details collapsed"
            : "Details expanded";
      }
      return;
    }

    // Expand a compact card inline
    const expandButton = target.closest("[data-expand]");
    if (expandButton) {
      const card = expandButton.closest(".fr-card-compact");
      card.classList.toggle("expanded");
      const icon = expandButton.querySelector("i");
      icon.classList.toggle("bi-chevron-down");
      icon.classList.toggle("bi-chevron-up");
      return;
    }

    // Book buttons
    if (target.closest("[data-book]")) {
      event.preventDefault();
      const itinerary = state.itineraries.find(
        (item) => item.id === target.closest("[data-book]").dataset.book,
      );
      showBookingNotice(itinerary);
    }
  });

  // Package radios are inside a label, so keep state in sync on change too
  document.addEventListener("keydown", (event) => {
    const packageCard = event.target.closest("[data-package-card]");
    if (
      !packageCard ||
      event.target !== packageCard ||
      (event.key !== "Enter" && event.key !== " ")
    ) {
      return;
    }
    event.preventDefault();
    const radio = packageCard.querySelector("input[type=radio]");
    if (!radio.checked) radio.click();
  });

  document.addEventListener("change", (event) => {
    if (event.target.name === "frPackage") {
      state.packageId = event.target.value;
      renderList();
    }
  });

  function showBookingNotice(itinerary) {
    if (!itinerary) return;
    const existing = getEl("frBookingNotice");
    if (existing) existing.remove();

    const selectedPackage =
      itinerary.packages.find((pkg) => pkg.id === state.packageId) ||
      itinerary.packages[1];

    const notice = document.createElement("div");
    notice.id = "frBookingNotice";
    notice.className = "fr-booking-notice";
    notice.innerHTML = `
      <i class="bi bi-check-circle-fill"></i>
      <div>
        <b>${escapeHtml(carrierNames(itinerary))} · ${escapeHtml(
          tripLabel(state.search.tripType),
        )}</b>
        <span>${escapeHtml(paxLabel(state.search.passengers))} · ${escapeHtml(
          selectedPackage.name,
        )} · ${money(
          selectedPackage.price + itinerary.taxes + itinerary.serviceFee,
        )} total</span>
      </div>
      <button type="button" aria-label="Dismiss"><i class="bi bi-x-lg"></i></button>`;
    notice
      .querySelector("button")
      .addEventListener("click", () => notice.remove());
    getEl("frResults").prepend(notice);
    notice.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  window.FlightResults = { search, getState: () => state };
})();
