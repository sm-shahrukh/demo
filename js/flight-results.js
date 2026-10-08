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

    featuredExpanded: false,

    detailTab: "itinerary",
    // Desktop-only: the wide filter panel starts collapsed, so the page
    // lands on just the chip row and "More filters" opens the full set.
    wideFiltersOpen: false,
    selectedPackageName: "Sample Standard",
    cabinBaggage: "1 × 8 kg",
    checkedBaggage: "1 × 23 kg",
    filters: {
      stops: [],
      airlines: [],
      baggage: [],
      times: [],
      arrivalTimes: [],
      refundable: false,
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

  // Nested controls keep their own behavior instead of triggering the card.
  const CLICK_GUARD =
    "a, button, input, label, select, textarea, summary, [contenteditable], " +
    "[role='button'], [role='group'], [data-book], [data-featured], " +
    "[data-expand], [data-collapse], [data-detail-tab], [data-package-card], " +
    "[data-sort], [data-chip], [data-day], [data-filters-toggle], .chip, " +
    ".more-btn, .fr-reset, .fr-price-clear, .fr-apply";

  const getEl = (id) => document.getElementById(id);

  function money(amount) {
    return formatPKR(amount);
  }


  function eurToPkr(amountInEur) {
    return Math.round(amountInEur * FlightData.CURRENCY.eurToPkr);
  }

  function pkrToEur(amountInPkr) {
    return Math.round(amountInPkr / FlightData.CURRENCY.eurToPkr);
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

  function shortDate(date) {
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  }

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

    
    if (filters.arrivalTimes.length) {
      const firstLeg = itinerary.legs[0];
      const arriveMinutes = firstLeg ? (firstLeg.arriveAt % 1440 + 1440) % 1440 : 0;
      const hour = Math.floor(arriveMinutes / 60);
      const inside = filters.arrivalTimes.some((window) => {
        if (window.to === 24) return hour >= window.from && hour <= 24;
        return hour >= window.from && hour < window.to;
      });
      if (!inside) return false;
    }

    // Matches when any package on the itinerary is refundable.
    if (filters.refundable) {
      const refundable = itinerary.packages.some((pkg) => pkg.refundable);
      if (!refundable) return false;
    }

    return true;
  }

  function recommendScore(itinerary) {
    return itinerary.price / 6 + itinerary.totalMin / 24 + itinerary.stops * 55;
  }

  function applySort(list) {
    const sorted = [...list];
    if (state.sort === "price") sorted.sort((a, b) => a.price - b.price);
    else if (state.sort === "duration")
      sorted.sort((a, b) => a.totalMin - b.totalMin);
    else if (state.sort === "departure")
      sorted.sort((a, b) => a.firstDepartMinutes - b.firstDepartMinutes);
    else if (state.sort === "arrival")
      sorted.sort((a, b) => a.arriveAt - b.arriveAt);
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

  function optionCount(name, value) {
    const probe = { ...state.filters };
    probe[name] = [value];
    return state.itineraries.filter((itinerary) =>
      itineraryMatches(itinerary, probe),
    ).length;
  }

  const view = FlightResultsView.create({
    state,
    escapeHtml,
    money,
    eurToPkr,
    paxLabel,
    tripLabel,
    formatDuration,
    visibleItineraries,
    optionCount,
    buildCardTop,
    buildJourneyLeg,
    buildFareSummary,
    buildPackages,
  });

  
  function renderFilters() {
    const desktop = getEl("frFilters");
    if (desktop) desktop.innerHTML = view.desktopFilterPanelMarkup();

    const mobile = getEl("frFiltersMobile");
    if (mobile) mobile.innerHTML = view.filterPanelMarkup();

    syncFiltersToggle();
    bindFilterEvents("frFilters");
    bindFilterEvents("frFiltersMobile");
  }

  function toggleTimeWindow(list, from, to, on) {
    const index = list.findIndex((w) => w.from === from && w.to === to);
    if (on && index === -1) list.push({ from, to });
    if (!on && index !== -1) list.splice(index, 1);
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

        // Desktop panel: arrival/departure windows and the refundable toggle.
        if (input.name === "frArrivalTime" || input.name === "frDepartTime") {
          const list =
            input.name === "frArrivalTime"
              ? state.filters.arrivalTimes
              : state.filters.times;
          toggleTimeWindow(
            list,
            Number(input.dataset.from),
            Number(input.dataset.to),
            input.checked,
          );
        }
        if (input.name === "frRefundable")
          state.filters.refundable = input.checked;

        refresh();
      });
    });

    panel.querySelectorAll(".time-btn").forEach((button) => {
      button.addEventListener("click", () => {
      
        toggleTimeWindow(
          state.filters.times,
          Number(button.dataset.from),
          Number(button.dataset.to),
          !button.classList.contains("on"),
        );
        refresh();
      });
    });

    panel.querySelectorAll("[data-stop-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        toggleInArray(
          state.filters.stops,
          button.dataset.stopFilter,
          !state.filters.stops.includes(button.dataset.stopFilter),
        );
        refresh();
      });
    });


    panel.querySelectorAll(".fr-sort-trigger").forEach((trigger) => {
      trigger.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleSortMenu(trigger.closest(".fr-sort-select-wrap"));
      });

      trigger.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          const wrap = trigger.closest(".fr-sort-select-wrap");
          if (wrap.classList.contains("is-open")) {
            stepSortMenu(wrap, event.key === "ArrowDown" ? 1 : -1);
          } else {
            openSortMenu(wrap);
          }
        }
      });
    });

    panel.querySelectorAll(".fr-price-slider").forEach((slider) => {
      slider.addEventListener("input", () => {
        state.filters.maxPrice = Number(slider.value);
        refreshFromSlider();
      });
    });

    panel.querySelectorAll('input[name="frPriceMax"]').forEach((input) => {
      input.addEventListener("change", () => {
        const filters = state.filters;
        const typed = Number(input.value);
        if (!Number.isFinite(typed)) {
          input.value = eurToPkr(filters.maxPrice);
          return;
        }
        const minPkr = eurToPkr(filters.priceMin);
        const maxPkr = eurToPkr(filters.priceMax);
        const clampedPkr = Math.min(maxPkr, Math.max(minPkr, typed));
        input.value = clampedPkr;
        filters.maxPrice = pkrToEur(clampedPkr);
        refresh();
      });
    });

    panel.querySelectorAll(".fr-duration-slider").forEach((slider) => {
      slider.addEventListener("input", () => {
        state.filters.maxDuration = Number(slider.value);
        refreshFromSlider();
      });
    });

    panel.querySelectorAll(".fr-price-clear").forEach((button) => {
      button.addEventListener("click", () => {
        state.filters.maxPrice = state.filters.priceMax;
        refresh();
      });
    });

    panel.querySelectorAll(".fr-reset").forEach((button) => {
      button.addEventListener("click", () => {
        resetFilters();
        refresh();
      });
    });

 
    panel.querySelectorAll("[data-filters-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        state.wideFiltersOpen = !state.wideFiltersOpen;
        syncFiltersToggle();
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
    filters.arrivalTimes = [];
    filters.refundable = false;
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

  function totalBagKg(cabin) {
    const sum = (label) => {
      const match = /(\d+)\s*×\s*(\d+)\s*kg/i.exec(label || "");
      return match ? Number(match[1]) * Number(match[2]) : 0;
    };
    return sum(cabin.cabinBag) + sum(cabin.checkedBag);
  }

  function buildCardTopRow(leg, options) {
    const { totalLegs, showFare, itinerary, selectedPackage } = options;

    const stopText =
      leg.stops === 0
        ? "Nonstop"
        : `${leg.stops} stop${leg.stops > 1 ? "s" : ""}`;

    const offset = Math.round((leg.date - options.firstLegDate) / 86400000);
    const dayTag = totalLegs > 1 && offset > 0 ? `${offset}d · ` : "";

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
            <div class="fr-row-time-group">
              <b class="fr-row-time">${escapeHtml(minutesToClock(leg.departAt))}</b>
              <small class="fr-row-date">Departs ${escapeHtml(shortDate(leg.date))}</small>
            </div>
            <span class="fr-row-duration">${escapeHtml(
              formatDuration(leg.totalMin),
            )}</span>
            <div class="fr-row-time-group fr-row-time-arrival">
              <b class="fr-row-time">${escapeHtml(minutesToClock(leg.arriveAt))}</b>
              <small class="fr-row-date">Arrives ${escapeHtml(shortDate(leg.arrivalDate))}</small>
            </div>
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
                 <small class="fr-row-price-note">Per-adult trip price</small>
                 ${options.collapse || ""}
               </div>`
            : ""
        }
      </div>`;
  }

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
          <small class="fr-row-price-note">Per-adult trip price</small>
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
            } · all segments included · price shown per adult</small>
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
            <small class="fr-fare-fine">Illustrative per-adult price · incl. taxes &amp; service fee</small>
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
      ? `+${money(pkg.uplift)} vs Starter · per adult`
      : `Base package · +${formatPKR(0)} · per adult`;

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
    const grandTotal =
      selectedPackage.price + itinerary.taxes + itinerary.serviceFee;

    return `
      <div class="fr-packages">
        <div class="fr-packages-head">
          <p>Illustrative comparison only these are not verified company fare
             names, prices or rules. Benefits apply to all segments and
             the selected passengers. Prices are shown per adult. Confirm each operating
             carrier's conditions before booking.</p>
        </div>
        <div class="fr-package-grid">
          ${itinerary.packages
            .map((pkg) => buildPackageCard(pkg, selectedPackage.id, itinerary))
            .join("")}
        </div>
        <div class="fr-continue">
          <div>
            <b>${escapeHtml(selectedPackage.name)} · ${money(grandTotal)} per adult</b>
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

  function openCardFromBody(card) {
    const id = card.dataset.id;
    if (!id) return;

    if (card.classList.contains("fr-card-featured")) {
      toggleFeaturedCollapse();
      return;
    }

    state.featuredId = id;
    state.packageId = "standard";
    state.featuredExpanded = true;
    state.detailTab = "itinerary";
    renderList();

    const promoted = getEl("frList")?.querySelector(".fr-card-featured");
    if (promoted) {
      promoted.scrollIntoView({ behavior: "smooth", block: "nearest" });
      promoted
        .querySelector(".fr-collapse-btn")
        ?.focus({ preventScroll: true });
    }
  }

  // ---------- 8b. Featured-card expansion ---------------------------------

  // Keep the featured card's collapse labels and aria state in sync.
  function toggleFeaturedCollapse(forceOpen) {
    const featured = getEl("frList")?.querySelector(".fr-card-featured");
    if (!featured) return;

    const willExpand =
      forceOpen === true ? true : featured.classList.contains("collapsed");

    featured.classList.toggle("collapsed", !willExpand);
    state.featuredExpanded = willExpand;

    // Opening details always lands on the Fare package tab, per the new design.
    if (willExpand) {
      state.detailTab = "package";
      featured.querySelectorAll(".fr-detail-tab").forEach((button) => {
        const active = button.dataset.detailTab === "package";
        button.classList.toggle("active", active);
        button.setAttribute("aria-selected", String(active));
      });
      featured.querySelectorAll(".fr-detail-panel").forEach((panel) => {
        panel.hidden = panel.dataset.detail !== "package";
      });
    }

    featured.querySelectorAll(".fr-collapse-btn").forEach((button) => {
      const label = button.querySelector(".fr-collapse-label");
      if (label)
        label.textContent = willExpand
          ? "Hide itinerary & fare details"
          : "Show itinerary & fare details";
      button.setAttribute("aria-expanded", String(willExpand));
    });

    const pill = featured.querySelector(".fr-pill");
    if (pill)
      pill.textContent = willExpand ? "Details expanded" : "Details collapsed";
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
      view.buildFeaturedCard(featured, selectedPackage) +
      (rest.length
        ? `<h4 class="fr-more-title">More ways to fly</h4>
           <div class="fr-compact-list">
             ${rest
               .slice(0, 2)
               .map((itinerary) =>
                 view.buildCompactCard(itinerary, tagFor(itinerary, rest)),
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
          view.buildCompactCard(itinerary, tagFor(itinerary, rest)),
        )
        .join("");
      event.currentTarget.closest("#frMoreWrap").before(moreList);
      getEl("frMoreWrap").innerHTML = "";
    });

    syncPackageContext(featured, selectedPackage);
  }


  function syncPackageContext(itinerary, selectedPackage) {
    state.selectedPackageName = selectedPackage.name;
    state.cabinBaggage = itinerary.cabin.cabinBag;
    state.checkedBaggage =
      selectedPackage.checkedBag === "Not included"
        ? "Not included"
        : selectedPackage.checkedBag;
  }

  // ---------- 9. Sort -------------------------------------------------------

  const SORT_LABELS = {
    recommended: "Recommended",
    price: "Cheapest",
    duration: "Shortest",
    departure: "Departure flight",
    arrival: "Arrival flight",
  };

  function openSortMenu(wrap) {
    if (!wrap) return;
    const menu = wrap.querySelector(".fr-sort-menu");
    if (!menu) return;
    menu.hidden = false;
    wrap.classList.add("is-open");
    wrap.querySelector(".fr-sort-trigger")?.setAttribute("aria-expanded", "true");
    wrap
      .querySelector(".fr-sort-option.is-active")
      ?.scrollIntoView({ block: "nearest" });
  }

  function closeSortMenu(wrap) {
    if (!wrap) return;
    const menu = wrap.querySelector(".fr-sort-menu");
    if (menu) menu.hidden = true;
    wrap.classList.remove("is-open");
    wrap.querySelector(".fr-sort-trigger")?.setAttribute("aria-expanded", "false");
  }

  function toggleSortMenu(wrap) {
    if (!wrap) return;
    if (wrap.classList.contains("is-open")) closeSortMenu(wrap);
    else openSortMenu(wrap);
  }


  function stepSortMenu(wrap, delta) {
    const options = [...wrap.querySelectorAll(".fr-sort-option")];
    if (!options.length) return;
    const current = options.findIndex((option) => option === document.activeElement);
    const next = options[(current + delta + options.length) % options.length];
    next.focus();
  }

  function renderSort() {
    const list = visibleItineraries();
    const note = {
      recommended: "Balanced for price, travel time and connections",
      price: "Sorted by lowest total price",
      duration: "Sorted by shortest total travel time",
      departure: "Sorted by earliest departure",
      arrival: "Sorted by earliest arrival",
    }[state.sort];

    getEl("frSortNote").innerHTML = `<i class="bi bi-stars"></i> ${note}`;

    // Mobile segmented control.
    getEl("frSortTabs")
      .querySelectorAll("[data-sort]")
      .forEach((tab) => {
        tab.classList.toggle("active", tab.dataset.sort === state.sort);
      });

    // Desktop segmented control.
    getEl("frDeskToolbar")
      ?.querySelectorAll(".fr-segment")
      .forEach((tab) => {
        tab.classList.toggle("is-active", tab.dataset.sort === state.sort);
      });

    const wrap = getEl("frDeskToolbar")?.querySelector(".fr-sort-select-wrap");
    if (wrap) {
      const value = wrap.querySelector(".fr-sort-value");
      const label = SORT_LABELS[state.sort];
      if (value && label) value.textContent = label;
      wrap.querySelectorAll(".fr-sort-option").forEach((option) => {
        const active = option.dataset.sort === state.sort;
        option.classList.toggle("is-active", active);
        option.setAttribute("aria-selected", String(active));
      });
    }

    getEl("frSortCount").textContent = `${list.length} shown`;
  }

  // ---------- 9b. Desktop-only: date strip, filter toggle, share -----------


  function cloneSearchWithDate(date) {
    const source = state.search;
    const base = source.legs[0].date;
    return {
      ...source,
      legs: source.legs.map((leg, index) => {
        if (index === 0) return { ...leg, date };
        const offset = Math.round((leg.date - base) / 86400000);
        return { ...leg, date: FlightData.addDays(date, offset) };
      }),
    };
  }

  function formatStripDate(date) {
    return date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
  }

  function renderDateStrip() {
    const box = getEl("frDateStrip");
    if (!box) return;


    if (!state.search || state.search.tripType === "multicity") {
      box.innerHTML = "";
      return;
    }

    const base = state.search.legs[0].date;
    const selectedKey = FlightData.toISODate(base);

    const cards = [];
    for (let i = 0; i < 7; i += 1) {
      const date = FlightData.addDays(base, i);
      const key = FlightData.toISODate(date);
      const list = FlightData.generateItineraries(cloneSearchWithDate(date));
      const cheapest = list.length
        ? Math.min(...list.map((itinerary) => itinerary.price))
        : null;
      const selected = key === selectedKey;

      cards.push(`
        <button type="button" class="fr-day${selected ? " is-active" : ""}"
                data-day="${key}" aria-pressed="${selected}">
          <b>${escapeHtml(formatStripDate(date))}</b>
          <small>${cheapest == null ? "—" : escapeHtml(money(cheapest))}</small>
        </button>`);
    }

    box.innerHTML = cards.join("");
  }


  function syncFiltersToggle() {
    const open = state.wideFiltersOpen;
    const sidebar = document.querySelector(".fr-filters-wide");
    if (sidebar) sidebar.classList.toggle("is-collapsed", !open);

    document.querySelectorAll("[data-filters-toggle]").forEach((button) => {
      button.setAttribute("aria-expanded", String(open));
      const label = button.querySelector(".fr-toggle-label");
      if (label) label.textContent = open ? "Less filters" : "More filters";
      const icon = button.querySelector("i");
      if (icon) {
        icon.classList.toggle("bi-x-lg", open);
        icon.classList.toggle("bi-chevron-up", false);
        icon.classList.toggle("bi-chevron-down", !open);
      }
    });
  }

  function flashShare(text) {
    const label = document.querySelector(".fr-share-label");
    if (!label) return;
    const original = label.textContent;
    label.textContent = text;
    window.setTimeout(() => {
      label.textContent = original;
    }, 2000);
  }

  async function shareSearchResults() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: document.title,
          text: "Flight search results",
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      flashShare("Link copied");
    } catch (error) {
      // AbortError means the user dismissed the share sheet — nothing to do.
      if (error && error.name !== "AbortError")
        flashShare("Copy the URL from your address bar");
    }
  }


  function initDeskToolbar() {
    getEl("frShareBtn")?.addEventListener("click", shareSearchResults);
  }

  // ---------- 10. Refresh ---------------------------------------------------

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
    // Keep the typed max price box in step with the slider.
    document.querySelectorAll('input[name="frPriceMax"]').forEach((input) => {
      const inPkr = eurToPkr(filters.maxPrice);
      if (Number(input.value) !== inPkr) {
        input.value = inPkr;
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


  function adoptSearch(built) {
    state.search = built;
    state.itineraries = generateItineraries(built);
    state.packageId = "standard";
    state.featuredId = null;

    state.featuredExpanded = false;
    state.detailTab = "itinerary";

    const prices = state.itineraries.map((itinerary) => itinerary.price);
    const durations = state.itineraries.map((itinerary) => itinerary.totalMin);
    state.filters.priceMin = Math.floor(Math.min(...prices) / 10) * 10;
    state.filters.priceMax = Math.ceil(Math.max(...prices) / 10) * 10;
    state.filters.durationFloor = Math.floor(Math.min(...durations) / 15) * 15;
    state.filters.durationMax = Math.ceil(Math.max(...durations) / 15) * 15;
    // resetFilters() normalises maxPrice/maxDuration to the new bounds.
    resetFilters();

    refresh();
  }

  function search(options) {
    const built = buildSearch(options);

    if (!built.legs.length) {
      getEl("frResults").hidden = true;
      return { ok: false, itineraries: [] };
    }

    const results = getEl("frResults");
    results.hidden = false;
    results.classList.remove("fr-awaiting-search");

    adoptSearch(built);
    renderDateStrip();
    syncFiltersToggle();

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
  
      const wrap = sortTab.closest(".fr-sort-select-wrap");
      if (wrap) {
        closeSortMenu(wrap);
        wrap.querySelector(".fr-sort-trigger")?.focus();
      }
      renderSort();
      renderList();
      return;
    }

    const detailTab = target.closest("[data-detail-tab]");
    if (detailTab) {
      state.detailTab = detailTab.dataset.detailTab;
      const featured = getEl("frList").querySelector(".fr-card-featured");
      if (featured) {
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

    const chip = target.closest(".chip[data-chip]");
    if (chip) {
      removeChip(Number(chip.dataset.chip));
      return;
    }

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
      toggleFeaturedCollapse();
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

    // Continue to the traveller-details page for the selected itinerary.
    const continueButton = target.closest(".fr-continue-btn, .fr-book-btn");
    if (continueButton) {
      const itinerary = state.itineraries.find(
        (item) => item.id === continueButton.dataset.book,
      );
      if (!itinerary) return;
      const selectedPackage =
        itinerary.packages.find((pkg) => pkg.id === state.packageId) ||
        itinerary.packages[1];
      const departure = FlightData.toISODate(itinerary.legs[0].date);
      const selection = {
        tripType: state.search.tripType,
        cabin: state.search.cabin,
        passengers: state.search.passengers,
        fare: {
          packageId: selectedPackage.id,
          packageName: selectedPackage.name,
          perAdultTotal: Math.round(
            (selectedPackage.price + itinerary.taxes + itinerary.serviceFee) *
              FlightData.CURRENCY.eurToPkr,
          ),
        },
        itinerary: {
          legs: itinerary.legs.map((leg) => ({
            origin: { code: leg.origin.code, city: leg.origin.city },
            destination: {
              code: leg.destination.code,
              city: leg.destination.city,
            },
            date: FlightData.toISODate(leg.date),
            segments: leg.segments.map((segment) => ({
              airline: segment.airline.name,
              flightNumber: segment.flightNumber,
              from: { code: segment.from.code, city: segment.from.city },
              to: { code: segment.to.code, city: segment.to.city },
              departAt: segment.departAt,
              arriveAt: segment.arriveAt,
              durationMin: segment.durationMin,
            })),
          })),
        },
      };
      try {
        sessionStorage.setItem(
          "smartmoves.bookingSelection",
          JSON.stringify(selection),
        );
      } catch (error) {
        console.error("Could not save the selected itinerary.", error);
        window.alert(
          "Your selected flight could not be saved. Please check your browser storage settings and try again.",
        );
        return;
      }
      const params = new URLSearchParams({
        departure,
        trip: state.search.tripType,
        from: itinerary.legs[0].origin.code,
        to: itinerary.legs[0].destination.code,
        adults: String(state.search.passengers.adults),
        children: String(state.search.passengers.children),
        infants: String(state.search.passengers.infants),
        cabin: state.search.cabin,
      });
      if (state.search.tripType === "roundtrip" && itinerary.legs[1]) {
        params.set("return", FlightData.toISODate(itinerary.legs[1].date));
      }
      if (state.search.tripType === "multicity") {
        params.set(
          "multiLegs",
          JSON.stringify(
            itinerary.legs.map((leg) => ({
              from: leg.origin.code,
              to: leg.destination.code,
              date: FlightData.toISODate(leg.date),
            })),
          ),
        );
      }
      window.location.href = `/flight-booking.html?${params.toString()}`;
      return;
    }

    // Other book buttons show the selected itinerary notice.
    if (target.closest("[data-book]")) {
      event.preventDefault();
      const itinerary = state.itineraries.find(
        (item) => item.id === target.closest("[data-book]").dataset.book,
      );
      showBookingNotice(itinerary);
      return;
    }

    // Date strip: pick a departure day and re-run the search.
    const dayButton = target.closest("[data-day]");
    if (dayButton) {
      const picked = FlightData.parseISODate(dayButton.dataset.day);
      if (picked && state.search) {
        adoptSearch(cloneSearchWithDate(picked));
        renderDateStrip();
      }
      return;
    }

    if (target.closest(CLICK_GUARD)) return;
    const card = target.closest(".fr-card");
    if (card) openCardFromBody(card);
  });

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
        <span>${escapeHtml(selectedPackage.name)} · ${money(
          selectedPackage.price + itinerary.taxes + itinerary.serviceFee,
        )} per adult</span>
      </div>
      <button type="button" aria-label="Dismiss"><i class="bi bi-x-lg"></i></button>`;
    notice
      .querySelector("button")
      .addEventListener("click", () => notice.remove());
    getEl("frResults").prepend(notice);
    notice.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }


  initDeskToolbar();

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".fr-sort-select-wrap")) {
      document
        .querySelectorAll(".fr-sort-select-wrap.is-open")
        .forEach(closeSortMenu);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const wrap = event.target.closest?.(".fr-sort-select-wrap.is-open");
    if (!wrap) return;
    closeSortMenu(wrap);
    wrap.querySelector(".fr-sort-trigger")?.focus();
  });

  window.FlightResults = { search, getState: () => state };
})();
