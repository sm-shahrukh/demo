// ============================================================
// FLIGHT RESULTS PAGE
// Flow:  data (data.js) -> filter -> sort -> build HTML -> show on page
// ============================================================

// ---------- 1. Page elements we need ----------
const flightList = document.getElementById("flightList");
const filtersPanel = document.getElementById("filters");
const priceSlider = document.getElementById("priceSlider");
const priceMaxLabel = document.getElementById("priceMaxLabel");
const sortLabel = document.getElementById("sortLabel");
const filterCount = document.getElementById("filterCount");
const resetBtn = document.getElementById("resetBtn");

let currentSort = "recommended"; // recommended | price | duration
let currentRouteFlights = flights;

// ---------- 2. Helpers ----------
function formatPrice(number) {
  return number.toLocaleString("en-US"); // 58500 -> "58,500"
}

// ---------- 3. Build the HTML for one flight ----------

// One leg of the trip (e.g. ISB -> DXB) shown inside "Flight details"
function buildSegment(seg) {
  let html = `
    <div class="leg">
      <b class="leg-time">${seg.departTime}</b>
      <i class="leg-dot"></i>
      <div class="leg-place"><b>${seg.fromCity}</b><small>${seg.fromInfo}</small></div>

      <i class="bi bi-airplane-fill leg-plane"></i>
      <div class="leg-flight">
        <span>${seg.flightNumber}</span><span>${seg.aircraft}</span><span>${seg.duration}</span>
      </div>

      <b class="leg-time">${seg.arriveTime}</b>
      <i class="leg-dot"></i>
      <div class="leg-place"><b>${seg.toCity}</b><small>${seg.toInfo}</small></div>
    </div>`;

  // Optional note between legs, e.g. layover time
  if (seg.noteAfter) {
    html += `<div class="note"><i class="bi bi-clock"></i> ${seg.noteAfter}</div>`;
  }
  return html;
}

// The "fare includes" box (only for flights that have an `includes` list)
function buildIncludes(flight) {
  if (!flight.includes) return "";

  const rows = flight.includes
    .map((item) => {
      const icon = item.yes ? "check2" : "dash";
      const cls = item.yes ? "yes" : "no";
      return `<div class="${cls}"><i class="bi bi-${icon}"></i> <span>${item.text}</span></div>`;
    })
    .join("");

  return `<div class="fare-box"><p>${flight.fare} fare includes</p>${rows}</div>`;
}

// The expandable details area
function buildDetails(flight) {
  const title =
    flight.stops === 0
      ? "Your nonstop itinerary"
      : "Your itinerary with 1 stop";
  const onTime = flight.onTime
    ? `<span class="pill">${flight.onTime}</span>`
    : "";
  const legs = flight.segments.map(buildSegment).join("");

  return `
    <div class="details-head">
      <div><h4>${title}</h4><p>Thursday, 15 October · local times</p></div>
      ${onTime}
    </div>
    <div class="details-body">
      <div class="details-main">${legs}</div>
      ${buildIncludes(flight)}
    </div>`;
}

// One full flight card
function buildCard(flight) {
  const detailsId = "details-" + flight.id;
  const isOpen = flight.open === true;
  const badge = flight.badge
    ? `<span class="tag tag-${flight.badge.color}">${flight.badge.text}</span>`
    : "";
  const stopClass = flight.stops > 0 ? "has-stop" : "";

  return `
    <article class="flight-card ${isOpen ? "open" : ""}">

      <div class="fc-airline">
        <span class="logo logo-${flight.code.toLowerCase()}">${flight.code}</span>
        <div><b>${flight.airline}</b><small>${flight.number}</small></div>
      </div>

      <div class="fc-route">
        <div><b>${flight.departs}</b><small>${ROUTE.from}</small></div>
        <div class="route-line">
          <span>${flight.duration}</span>
          <i class="bi bi-airplane-fill"></i>
          <em class="${stopClass}">${flight.stopsText}</em>
        </div>
        <div class="route-end"><b>${flight.arrives}</b><small>${ROUTE.to}</small></div>
      </div>

      <div class="fc-price">
        ${badge}
        <div class="amount"><small>from PKR</small><b>${formatPrice(flight.price)}</b></div>
        <small class="per">per traveller · taxes included</small>
      </div>

      <a href="#" class="btn btn-primary fc-select">Select flight <i class="bi bi-arrow-right"></i></a>

      <div class="fc-footer">
        <div class="meta">
          <span><i class="bi bi-ticket-perforated"></i>${flight.fare}</span>
          <span><i class="bi bi-briefcase"></i>${flight.baggage}</span>
          <span class="co2"><i class="bi bi-leaf"></i>${flight.co2}</span>
        </div>
        <button type="button" class="details-btn" data-bs-toggle="collapse"
                data-bs-target="#${detailsId}" aria-expanded="${isOpen}" aria-controls="${detailsId}">
          <span>${isOpen ? "Hide details" : "Flight details"}</span> <i class="bi bi-chevron-down"></i>
        </button>
      </div>

      <div class="collapse ${isOpen ? "show" : ""} fc-details" id="${detailsId}">
        ${buildDetails(flight)}
      </div>
    </article>`;
}

// Put a list of flights on the page
function showFlights(list) {
  if (list.length === 0) {
    flightList.innerHTML =
      '<p class="empty">No sample flights match this route and filters.</p>';
    return;
  }
  flightList.innerHTML = list.map(buildCard).join("");
}

// ---------- 4. Filters ----------

// Values of all ticked checkboxes with a given name, e.g. getChecked('stops') -> ['0', '1']
function getChecked(name) {
  const boxes = filtersPanel.querySelectorAll(`input[name="${name}"]:checked`);
  return [...boxes].map((box) => box.value);
}

// Read everything the user has chosen in the filter panel
function getFilters() {
  const timeButtons = filtersPanel.querySelectorAll(".time-btn.on");
  return {
    stops: getChecked("stops"),
    airlines: getChecked("airline"),
    baggage: getChecked("baggage"),
    times: [...timeButtons].map((btn) => ({
      from: +btn.dataset.from,
      to: +btn.dataset.to,
    })),
    maxPrice: +priceSlider.value,
  };
}

// Does one flight pass all the filters? (An empty filter means "don't care")
function flightMatches(flight, filters) {
  // Stops: 0, 1 or 2+ (anything above 2 counts as "2+")
  const stopsValue = String(Math.min(flight.stops, 2));
  if (filters.stops.length > 0 && !filters.stops.includes(stopsValue))
    return false;

  // Airline
  if (filters.airlines.length > 0 && !filters.airlines.includes(flight.code))
    return false;

  // Baggage
  if (filters.baggage.includes("cabin") && !flight.cabinBag) return false;
  if (filters.baggage.includes("checked") && !flight.checkedBag) return false;

  // Price (slider at its maximum means "no limit")
  const sliderAtMax = filters.maxPrice >= +priceSlider.max;
  if (!sliderAtMax && flight.price > filters.maxPrice) return false;

  // Departure time (hour of departure must fall inside one of the chosen ranges)
  const hour = parseInt(flight.departs, 10);
  if (
    filters.times.length > 0 &&
    !filters.times.some((t) => hour >= t.from && hour < t.to)
  )
    return false;

  return true;
}

// ---------- 5. Sorting ----------
function sortFlights(list) {
  const sorted = [...list]; // copy so the original order is kept
  if (currentSort === "price") sorted.sort((a, b) => a.price - b.price);
  if (currentSort === "duration")
    sorted.sort((a, b) => a.durationMin - b.durationMin);
  return sorted;
}

// ---------- 6. Chips (small tags that show active filters) ----------

// Every filter that is currently switched on (ticked boxes + selected time buttons)
function getActiveControls() {
  return [...filtersPanel.querySelectorAll("input:checked, .time-btn.on")];
}

function showChips() {
  const active = getActiveControls();
  const html = active
    .map(
      (control, index) =>
        `<button type="button" class="chip" data-index="${index}">${control.dataset.label} <i class="bi bi-x"></i></button>`,
    )
    .join("");

  document.querySelectorAll(".chips").forEach((box) => {
    box.innerHTML = html;
  });
  filterCount.textContent = active.length > 0 ? " · " + active.length : "";
}

// ---------- 7. Refresh everything ----------
function updateList() {
  priceMaxLabel.textContent =
    "PKR " +
    formatPrice(+priceSlider.value) +
    (+priceSlider.value >= +priceSlider.max ? "+" : "");

  const filters = getFilters();
  const matching = currentRouteFlights.filter((flight) =>
    flightMatches(flight, filters),
  );

  showFlights(sortFlights(matching));
  showChips();
}

// ---------- 8. Events (what happens when the user clicks) ----------

// Any checkbox or the price slider changed
filtersPanel.addEventListener("input", updateList);

// Time buttons: click to switch on/off
filtersPanel.querySelectorAll(".time-btn").forEach((button) => {
  button.addEventListener("click", () => {
    button.classList.toggle("on");
    updateList();
  });
});

// Clicking a chip switches that filter off
document.addEventListener("click", (event) => {
  const chip = event.target.closest(".chip");
  if (!chip) return;

  const control = getActiveControls()[+chip.dataset.index];
  if (control.matches("input")) control.checked = false;
  else control.classList.remove("on");
  updateList();
});

// "Reset all"
resetBtn.addEventListener("click", () => {
  filtersPanel.querySelectorAll('input[type="checkbox"]').forEach((box) => {
    box.checked = false;
  });
  filtersPanel
    .querySelectorAll(".time-btn")
    .forEach((btn) => btn.classList.remove("on"));
  priceSlider.value = priceSlider.max;
  updateList();
});

// Sort menu
document.querySelectorAll("[data-sort]").forEach((item) => {
  item.addEventListener("click", () => {
    currentSort = item.dataset.sort;
    sortLabel.textContent = item.textContent;
    updateList();
  });
});

// Open / close "Flight details": update the button text and the blue outline
function setCardOpen(event, isOpen) {
  const card = event.target.closest(".flight-card");
  if (!card) return;
  card.classList.toggle("open", isOpen);
  card.querySelector(".details-btn span").textContent = isOpen
    ? "Hide details"
    : "Flight details";
}
document.addEventListener("show.bs.collapse", (event) =>
  setCardOpen(event, true),
);
document.addEventListener("hide.bs.collapse", (event) =>
  setCardOpen(event, false),
);

// ---------- 9. Start ----------
updateList();

// ---------- 10. Search widget ----------
(() => {
  const airportOptions = [
    { code: "LHR", city: "London", country: "United Kingdom" },
    { code: "DXB", city: "Dubai", country: "UAE" },
    { code: "JFK", city: "New York", country: "USA" },
    { code: "LAX", city: "Los Angeles", country: "USA" },
    { code: "ISB", city: "Islamabad", country: "Pakistan" },
    { code: "KHI", city: "Karachi", country: "Pakistan" },
    { code: "LHE", city: "Lahore", country: "Pakistan" },
    { code: "PEW", city: "Peshawar", country: "Pakistan" },
    { code: "MED", city: "Medina", country: "Saudi Arabia" },
    { code: "RUH", city: "Riyadh", country: "Saudi Arabia" },
    { code: "SIN", city: "Singapore", country: "Singapore" },
    { code: "CDG", city: "Paris", country: "France" },
  ];
  const passengerCounts = { adults: 1, children: 0, infants: 0 };
  let selectedFrom = null;
  let selectedTo = null;
  let selectedTripType = "oneway";
  let selectedVisaTravelers = 1;
  let nextMultiCityId = 3;

  const getElement = (id) => document.getElementById(id);

  function closeDropdowns() {
    document
      .querySelectorAll(".dd-panel.show, .dropdown-panel.show")
      .forEach((panel) => panel.classList.remove("show"));
    document
      .querySelectorAll(".field-box.open")
      .forEach((field) => field.classList.remove("open"));
  }

  function updateMultiCityCount() {
    const legs = [
      ...document.querySelectorAll("#multiCityPanel .multi-city-leg"),
    ];
    const flightCount = legs.length + 1;
    const count = getElement("multiCityCount");
    if (count) count.textContent = `${flightCount} / 6 flights`;
    legs.forEach((leg, index) => {
      const flightNumber = index + 2;
      const heading = leg.querySelector(".multi-city-leg-heading strong");
      const removeButton = leg.querySelector(".remove-flight-btn");
      if (heading) heading.textContent = `FLIGHT ${flightNumber}`;
      if (removeButton) {
        removeButton.setAttribute(
          "aria-label",
          `Remove flight ${flightNumber}`,
        );
      }
    });
    const addButton = document.querySelector(".add-flight-btn");
    if (addButton) addButton.disabled = flightCount >= 6;
  }

  function airportField(id, direction, label, placeholder) {
    const key = `multiCity${id}${direction}`;
    return `
      <label class="multi-city-airport">
        <span>${label}</span>
        <div class="field-box" onclick="openAirportPanel('${key}')">
          <span class="field-box-icon"><i class="bi bi-geo-alt"></i></span>
          <div class="field-box-content">
            <input class="field-box-input" id="${key}Input" type="text" placeholder="${placeholder}" readonly />
          </div>
        </div>
        <div class="dd-panel airport-panel" id="${key}Panel">
          <div class="dd-panel-header">
            <span>Select ${label}</span>
            <button type="button" class="dd-panel-close" onclick="closeAirportPanel('${key}')" aria-label="Close airport list">×</button>
          </div>
          <input class="airport-search-input" id="${key}Query" type="text" placeholder="Search airport or city..." oninput="searchAirport('${key}')" />
          <div class="airport-results" id="${key}Results"></div>
        </div>
      </label>`;
  }

  window.toggleMobileNav = function () {
    const menu = getElement("navbarMenu");
    const toggle = document.querySelector(".mobile-toggle");
    if (!menu || !toggle) return;
    const isOpen = menu.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  };

  window.switchTab = function (tab) {
    const buttons = document.querySelectorAll(".search-tab");
    const panels = document.querySelectorAll(".search-panel");
    const activeButton = [...buttons].find(
      (button) => button.dataset.tab === tab,
    );
    const activePanel = getElement(`panel-${tab}`);
    if (!activeButton || !activePanel) return;
    buttons.forEach((button) =>
      button.classList.toggle("active", button === activeButton),
    );
    panels.forEach((panel) =>
      panel.classList.toggle("active", panel === activePanel),
    );
    closeDropdowns();
  };

  window.setTripType = function (type, button) {
    selectedTripType = type;
    document.querySelectorAll(".trip-type-btn").forEach((item) => {
      item.classList.toggle("active", item === button);
    });
    const returnColumn = getElement("returnCol");
    if (returnColumn)
      returnColumn.style.display = type === "roundtrip" ? "block" : "none";
    getElement("multiCityPanel")?.classList.toggle(
      "show",
      type === "multicity",
    );
    if (type !== "roundtrip" && getElement("retDate")) {
      getElement("retDate").value = "";
    }
    closeDropdowns();
  };

  window.toggleCabinMenu = function () {
    const menu = getElement("cabinMenu");
    if (!menu) return;
    const isOpen = menu.classList.contains("show");
    closeDropdowns();
    menu.classList.toggle("show", !isOpen);
  };

  window.setCabin = function (value) {
    if (getElement("cabinInput")) getElement("cabinInput").value = value;
    closeDropdowns();
  };

  function renderAirportResults(key, query = "") {
    const results = getElement(`${key}Results`);
    if (!results) return;
    const normalizedQuery = query.trim().toLowerCase();
    const matches = airportOptions.filter((airport) =>
      `${airport.code} ${airport.city} ${airport.country}`
        .toLowerCase()
        .includes(normalizedQuery),
    );
    results.innerHTML = matches.length
      ? matches
          .map(
            (airport) => `
              <button type="button" class="dd-opt airport-result" onclick="selectAirport('${key}', '${airport.code}', '${airport.city}', '${airport.country}')">
                <strong>${airport.code}</strong> ${airport.city} <small>${airport.country}</small>
              </button>`,
          )
          .join("")
      : '<p class="empty airport-empty">No airports found.</p>';
  }

  window.openAirportPanel = function (key) {
    const panel = getElement(`${key}Panel`);
    if (!panel) return;
    closeDropdowns();
    panel.classList.add("show");
    const query = getElement(`${key}Query`);
    if (query) {
      query.value = "";
      renderAirportResults(key);
      query.focus();
    }
  };

  window.closeAirportPanel = function (key) {
    getElement(`${key}Panel`)?.classList.remove("show");
  };

  window.searchAirport = function (key) {
    renderAirportResults(key, getElement(`${key}Query`)?.value || "");
  };

  window.selectAirport = function (key, code, city, country) {
    const input = getElement(`${key}Input`);
    if (input) input.value = `${city} (${code})`;
    if (key === "from") selectedFrom = { code, city, country };
    if (key === "to") selectedTo = { code, city, country };
    closeDropdowns();
  };

  window.swapCities = function () {
    [selectedFrom, selectedTo] = [selectedTo, selectedFrom];
    const fromInput = getElement("fromInput");
    const toInput = getElement("toInput");
    if (!fromInput || !toInput) return;
    [fromInput.value, toInput.value] = [toInput.value, fromInput.value];
  };

  window.openDatePicker = function (id) {
    const input = getElement(id);
    if (!input) return;
    if (typeof input.showPicker === "function") input.showPicker();
    else input.click();
  };

  window.togglePassengerPanel = function () {
    const panel = getElement("paxPanel");
    if (!panel) return;
    const isOpen = panel.classList.contains("show");
    closeDropdowns();
    panel.classList.toggle("show", !isOpen);
  };

  window.changePax = function (type, delta) {
    passengerCounts[type] = Math.max(0, passengerCounts[type] + delta);
    const count = getElement(`count${type[0].toUpperCase()}${type.slice(1)}`);
    if (count) count.textContent = passengerCounts[type];
    const total = Object.values(passengerCounts).reduce(
      (sum, value) => sum + value,
      0,
    );
    if (getElement("paxInput")) {
      getElement("paxInput").value =
        `${total} ${total === 1 ? "Passenger" : "Passengers"}`;
    }
  };

  window.addMultiCityLeg = function () {
    const legs = document.querySelectorAll("#multiCityPanel .multi-city-leg");
    if (legs.length >= 5) return;
    const flightNumber = legs.length + 2;
    const legId = nextMultiCityId++;
    const leg = document.createElement("div");
    leg.className = "multi-city-leg";
    leg.innerHTML = `
      <div class="multi-city-leg-heading">
        <strong>FLIGHT ${flightNumber}</strong>
        <button type="button" class="remove-flight-btn" onclick="removeMultiCityLeg(this)">Remove</button>
      </div>
      <div class="multi-city-fields">
        ${airportField(legId, "From", "From", "Departure city")}
        ${airportField(legId, "To", "To", "Arrival city")}
        <label><span>Date</span><input type="date" /></label>
      </div>`;
    getElement("additionalFlightLegs")?.appendChild(leg);
    updateMultiCityCount();
  };

  window.removeMultiCityLeg = function (button) {
    button.closest(".multi-city-leg")?.remove();
    updateMultiCityCount();
  };

  window.handleFlightSearch = function (event) {
    event.preventDefault();
    const alert = getElement("searchAlert");
    const showError = (message) => {
      alert.textContent = message;
      alert.className = "alert show error";
    };
    if (!selectedFrom) return showError("Please select a departure city.");
    if (!selectedTo) return showError("Please select an arrival city.");
    if (selectedFrom.code === selectedTo.code) {
      return showError("Departure and arrival cities must be different.");
    }
    const departureDate = getElement("depDate")?.value;
    if (!departureDate) return showError("Please select a departure date.");
    if (selectedTripType === "roundtrip" && !getElement("retDate")?.value) {
      return showError("Please select a return date.");
    }

    currentRouteFlights =
      selectedFrom.code === ROUTE.from && selectedTo.code === ROUTE.to
        ? flights
        : [];
    updateList();
    const routeHeading = document.querySelector(".head h1");
    if (routeHeading) {
      routeHeading.innerHTML = `${selectedFrom.city} <i class="bi bi-arrow-right"></i> ${selectedTo.city}`;
    }
    const routeSummary = document.querySelector(".head .sub");
    const total = Object.values(passengerCounts).reduce(
      (sum, value) => sum + value,
      0,
    );
    if (routeSummary) {
      routeSummary.textContent = `${selectedFrom.code} to ${selectedTo.code} · ${total} traveler${total === 1 ? "" : "s"} · ${getElement("cabinInput")?.value || "Economy"}`;
    }
    const flightCountLabel = document.querySelector(".count b");
    if (flightCountLabel) {
      const liveIndicator = flightCountLabel.querySelector(".live");
      flightCountLabel.textContent = `${currentRouteFlights.length} flights`;
      if (liveIndicator) flightCountLabel.appendChild(liveIndicator);
    }

    alert.textContent = `Search ready: ${selectedFrom.city} to ${selectedTo.city} on ${departureDate}.`;
    alert.className = "alert show success";
    const result = getElement("searchResult");
    const resultTitle = getElement("resultTitle");
    if (resultTitle)
      resultTitle.textContent = `Flights from ${selectedFrom.city} to ${selectedTo.city}`;
    const summary = getElement("resultSummary");
    if (summary) {
      const total = Object.values(passengerCounts).reduce(
        (sum, value) => sum + value,
        0,
      );
      summary.textContent = `${selectedFrom.code} to ${selectedTo.code} · ${departureDate} · ${total} passenger${total === 1 ? "" : "s"} · ${getElement("cabinInput")?.value || "Economy"}`;
    }
    const resultText = getElement("resultText");
    if (resultText) resultText.textContent = "Your search details are ready.";
    result?.classList.add("show");
    return false;
  };

  window.handleModeSearch = function (event, mode) {
    event.preventDefault();
    const form = event.currentTarget;
    form.querySelector(".mode-search-notice")?.remove();
    const notice = document.createElement("div");
    notice.className = "mode-search-notice";
    notice.textContent = `Your ${mode} search is ready.`;
    form.appendChild(notice);
    return false;
  };

  window.toggleUmrahTypeMenu = function (event) {
    event?.stopPropagation();
    const menu = getElement("umrahTypeMenu");
    if (!menu) return;
    const isOpen = menu.classList.contains("show");
    closeDropdowns();
    menu.classList.toggle("show", !isOpen);
  };

  window.setUmrahType = function (value, option) {
    if (getElement("umrahTypeInput"))
      getElement("umrahTypeInput").value = value;
    document.querySelectorAll(".dd-umrah-type-opt").forEach((item) => {
      item.classList.toggle("active", item === option);
    });
    closeDropdowns();
  };

  window.toggleUmrahServicesMenu = function (event) {
    event?.stopPropagation();
    const menu = getElement("umrahServicesMenu");
    if (!menu) return;
    const isOpen = menu.classList.contains("show");
    closeDropdowns();
    menu.classList.toggle("show", !isOpen);
  };

  window.updateUmrahServices = function () {
    const selected = [
      ...document.querySelectorAll('input[name="umrahService"]:checked'),
    ].map((input) => input.value);
    if (getElement("umrahServicesInput")) {
      getElement("umrahServicesInput").value = selected.length
        ? selected.join(", ")
        : "No services selected";
    }
  };

  window.toggleVisaDropdown = function (type, event) {
    event?.stopPropagation();
    const menu = getElement(`${type}Menu`);
    if (!menu) return;
    const isOpen = menu.classList.contains("show");
    closeDropdowns();
    menu.classList.toggle("show", !isOpen);
  };

  window.setVisaVal = function (type, value, option) {
    if (getElement(`${type}Input`)) getElement(`${type}Input`).value = value;
    getElement(`${type}Menu`)
      ?.querySelectorAll(".dd-opt")
      .forEach((item) => item.classList.toggle("active", item === option));
    closeDropdowns();
  };

  window.changeVisaTravelers = function (delta) {
    selectedVisaTravelers = Math.max(1, selectedVisaTravelers + delta);
    if (getElement("countVisaTravelers")) {
      getElement("countVisaTravelers").textContent = selectedVisaTravelers;
    }
    if (getElement("visaPaxInput")) {
      getElement("visaPaxInput").value =
        `${selectedVisaTravelers} ${selectedVisaTravelers === 1 ? "Traveler" : "Travelers"}`;
    }
  };

  document.addEventListener("click", (event) => {
    if (event.target.closest(".field-box, .dd-panel, .multi-city-airport"))
      return;
    closeDropdowns();
  });

  updateMultiCityCount();
})();
