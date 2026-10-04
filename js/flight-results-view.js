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

    function buildFeaturedCard(itinerary, selectedPackage) {
      const totalLegs = itinerary.legs.length;
      const expanded = state.featuredExpanded;
      const collapseLabel = expanded
        ? "Hide itinerary &amp; fare details"
        : "Show itinerary &amp; fare details";
      const pillText = expanded ? "Details expanded" : "Details collapsed";
      const activeTab = state.detailTab;

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

    return { filterPanelMarkup, buildFeaturedCard, buildCompactCard };
  }

  window.FlightResultsView = { create };
})();
