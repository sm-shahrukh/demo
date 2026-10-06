(() => {
  const DETAIL_TABS = [
    { id: "itinerary", label: "Flight itinerary" },
    { id: "fare", label: "Fare summary" },
    { id: "package", label: "Fare package" },
  ];

  function create(context) {
    const {
      state,
      escapeHtml,
      money,
      paxLabel,
      tripLabel,
      formatDuration,
      eurToPkr,
      visibleItineraries,
      optionCount,
      buildCardTop,
      buildJourneyLeg,
      buildFareSummary,
      buildPackages,
    } = context;

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
        filters.times.some(
          (window) => window.from === option.from && window.to === option.to,
        )
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
        <h3>Total price · ${escapeHtml(paxLabel(state.search.passengers).toLowerCase())}</h3>
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

    // Desktop-only filter panel. Deliberately a separate function from
    // filterPanelMarkup() so the mobile offcanvas markup stays byte-identical.
    function desktopFilterPanelMarkup() {
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

      const windows = [
        { from: 0, to: 6, label: "12:00 AM – 06:00 AM" },
        { from: 6, to: 12, label: "06:00 AM – 12:00 PM" },
        { from: 12, to: 18, label: "12:00 PM – 06:00 PM" },
        { from: 18, to: 24, label: "06:00 PM – 12:00 AM" },
      ];
      const windowOn = (list, option) =>
        list.some((w) => w.from === option.from && w.to === option.to)
          ? "checked"
          : "";

      const timeColumn = (name, heading, list) => `
        <section class="fr-wide-col">
          <h3>${heading}</h3>
          ${windows
            .map(
              (option) => `
            <label class="ck">
              <input type="checkbox" class="form-check-input" name="${name}"
                     data-from="${option.from}" data-to="${option.to}"
                     data-label="${escapeHtml(option.label)}"
                     ${windowOn(list, option)}>
              <span>${escapeHtml(option.label)}</span>
            </label>`,
            )
            .join("")}
        </section>`;

      return `
      <div class="fr-desk-toolbar" id="frDeskToolbar">
        <div class="fr-desk-sort">
          ${[
            { id: "recommended", label: "Recommended" },
            { id: "price", label: "Cheapest" },
            { id: "duration", label: "Shortest" },
          ]
            .map(
              (tab) => `
            <button
              type="button"
              class="fr-segment ${state.sort === tab.id ? "is-active" : ""}"
              data-sort="${tab.id}"
            >
              ${tab.label}
            </button>`,
            )
            .join("")}
        </div>
        <div class="fr-quick-stops" aria-label="Filter by stops">
          ${[
            { value: "0", label: "Nonstop" },
            { value: "1", label: "1 Stop" },
            { value: "2", label: "2+ Stops" },
          ]
            .map(
              (option) => `
            <button type="button"
                    class="fr-stop-chip${filters.stops.includes(option.value) ? " is-active" : ""}"
                    data-stop-filter="${option.value}"
                    aria-pressed="${filters.stops.includes(option.value)}">
              ${option.label}
            </button>`,
            )
            .join("")}
        </div>
        <div class="fr-desk-right">
          <label class="fr-sort-select-wrap">
            <span>Sort by</span>
            <span class="fr-sort-value">${
              {
                recommended: "Recommended",
                price: "Cheapest",
                duration: "Shortest",
                departure: "Departure flight",
                arrival: "Arrival flight",
              }[state.sort]
            }</span>
            <select class="fr-sort-select" aria-label="Sort by">
              <option value="recommended"${state.sort === "recommended" ? " selected" : ""}>Recommended</option>
              <option value="price"${state.sort === "price" ? " selected" : ""}>Cheapest</option>
              <option value="duration"${state.sort === "duration" ? " selected" : ""}>Shortest</option>
              <option value="departure"${state.sort === "departure" ? " selected" : ""}>Departure flight</option>
              <option value="arrival"${state.sort === "arrival" ? " selected" : ""}>Arrival flight</option>
            </select>
            <i class="bi bi-chevron-down" aria-hidden="true"></i>
          </label>
          <button
            type="button"
            class="fr-toggle-btn"
            data-filters-toggle
            aria-expanded="${state.wideFiltersOpen}"
            aria-controls="frWideBody"
          >
            <span class="fr-toggle-label">${
              state.wideFiltersOpen ? "Less filters" : "More filters"
            }</span>
            <i class="bi ${state.wideFiltersOpen ? "bi-x-lg" : "bi-chevron-down"}"></i>
          </button>
        </div>
      </div>

      <div class="fr-filter-chips"></div>

      <div class="fr-wide-body" id="frWideBody">
        ${timeColumn("frArrivalTime", "Arrival time", filters.arrivalTimes)}
        ${timeColumn("frDepartTime", "Departure time", filters.times)}

        <section class="fr-wide-col">
          <h3>Airlines</h3>
          ${airlines
            .map(
              ([code]) => `
            <label class="ck">
              <input type="checkbox" class="form-check-input" name="frAirline"
                     value="${escapeHtml(code)}"
                     data-label="${escapeHtml(
                       (FlightData.AIRLINE_BY_CODE[code] || {}).name || code,
                     )}"
                     ${filters.airlines.includes(code) ? "checked" : ""}>
              <span>${escapeHtml(
                (FlightData.AIRLINE_BY_CODE[code] || {}).name || code,
              )}</span>
            </label>`,
            )
            .join("")}
        </section>

        <section class="fr-wide-col">
          <div class="fr-wide-col-head">
            <h3>Price Range</h3>
            <button type="button" class="fr-price-clear">Clear</button>
          </div>
          <div class="fr-price-inputs">
            <input type="number" class="fr-price-num" name="frPriceMax"
                   min="${eurToPkr(filters.priceMin)}" max="${eurToPkr(filters.priceMax)}"
                   step="1000" value="${eurToPkr(filters.maxPrice)}"
                   aria-label="Maximum total price in PKR">
          </div>
          <input type="range" class="form-range fr-price-slider"
                 min="${filters.priceMin}" max="${filters.priceMax}"
                 step="5" value="${filters.maxPrice}"
                 aria-label="Maximum total price slider">
          <label class="ck">
            <input type="checkbox" class="form-check-input" name="frRefundable"
                   ${filters.refundable ? "checked" : ""}>
            <span>Refundable</span>
          </label>
        </section>
      </div>
    `;
    }

    function buildFeaturedCard(itinerary, selectedPackage) {
      const totalLegs = itinerary.legs.length;
      const expanded = state.featuredExpanded;
      const collapseLabel = expanded ? "Hide" : "Show";
      const pillText = expanded ? "Details expanded" : "Details collapsed";
      const activeTab = state.detailTab;
      // Tab/panel ids are namespaced per itinerary so they stay unique even
      // if a second featured card is ever rendered alongside the first.
      const idSuffix = (tabId) => `${tabId}-${itinerary.id}`;

      const panel = (id, content) => `
        <div class="fr-detail-panel" role="tabpanel" id="frPanel-${idSuffix(id)}"
             aria-labelledby="frTab-${idSuffix(id)}" data-detail="${id}"${
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
          collapse: `<button type="button" class="fr-collapse-btn" data-collapse
              aria-expanded="${expanded}" aria-controls="frDetail-${escapeHtml(itinerary.id)}">
              <span class="fr-collapse-label">${collapseLabel} itinerary &amp; fare details</span>
              <i class="bi bi-chevron-down"></i>
            </button>`,
        })}

        <div class="fr-detail-region" id="frDetail-${escapeHtml(itinerary.id)}">
          <div class="fr-detail-tabs" role="tablist" aria-label="Flight details">
            ${DETAIL_TABS.map(
              (tab) => `
            <button type="button" role="tab" class="fr-detail-tab${
              tab.id === activeTab ? " active" : ""
            }" id="frTab-${idSuffix(tab.id)}" aria-controls="frPanel-${idSuffix(tab.id)}"
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
        </div>
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

    return {
      filterPanelMarkup,
      desktopFilterPanelMarkup,
      buildFeaturedCard,
      buildCompactCard,
    };
  }

  window.FlightResultsView = { create };
})();
