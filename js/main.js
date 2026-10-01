// ---------- 1. Search widget ----------
(() => {
  const passengerCounts = { adults: 1, children: 0, infants: 0 };
  let selectedFrom = null;
  let selectedTo = null;
  let selectedTripType = "oneway";
  let selectedVisaTravelers = 1;
  let nextMultiCityId = 3;
  let multiCitySelections = {};

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

    // Keep the results tabs in step and re-run with whatever is filled in
    document.querySelectorAll(".fr-trip-tab").forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.trip === type);
    });
    if (runSearch(type, true)) {
      getElement("frResults")?.scrollIntoView({ behavior: "smooth" });
    }
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
    const matches = FlightData.searchAirports(query);

    results.innerHTML = matches.length
      ? matches
          .map(
            (airport) => `
              <button type="button" class="dd-opt airport-result" onclick="selectAirport('${key}', '${airport.code}', '${airport.city}', '${airport.country}')">
                <strong>${airport.code}</strong> ${airport.city} — ${airport.name}
                <small>${airport.country}</small>
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
    if (key.startsWith("multiCity")) {
      multiCitySelections[key] = { code, city, country };
    }
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
        <label><span>Date</span><input type="date" id="multiCity${legId}Date" onchange="setMultiCityDate(${legId}, this.value)" /></label>
      </div>`;
    getElement("additionalFlightLegs")?.appendChild(leg);
    updateMultiCityCount();
  };

  window.setMultiCityDate = function (legId, value) {
    multiCitySelections[`multiCity${legId}Date`] = value;
  };

  window.removeMultiCityLeg = function (button) {
    button.closest(".multi-city-leg")?.remove();
    updateMultiCityCount();
  };

  // Read the multi-city legs the user has filled in, in document order.
  function collectMultiCityLegs() {
    const legs = [];

    // Leg 1 comes from the main From / To / Departure fields
    if (selectedFrom && selectedTo) {
      legs.push({
        from: selectedFrom,
        to: selectedTo,
        date: getElement("depDate")?.value,
      });
    }

    document
      .querySelectorAll("#multiCityPanel .multi-city-leg")
      .forEach((node, index) => {
        const id = index + 2;
        const from = multiCitySelections[`multiCity${id}From`];
        const to = multiCitySelections[`multiCity${id}To`];
        const date = multiCitySelections[`multiCity${id}Date`];
        if (from && to) legs.push({ from, to, date });
      });

    return legs;
  }

  // Default dates so the demo always has something to show on first load.
  function isoDateIn(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }

  function defaultSearch() {
    selectedFrom = { code: "ISB", city: "Islamabad", country: "Pakistan" };
    selectedTo = { code: "DXB", city: "Dubai", country: "United Arab Emirates" };
    const fromInput = getElement("fromInput");
    const toInput = getElement("toInput");
    const depDate = getElement("depDate");
    const retDate = getElement("retDate");
    if (fromInput) fromInput.value = "Islamabad (ISB)";
    if (toInput) toInput.value = "Dubai (DXB)";
    if (depDate && !depDate.value) depDate.value = isoDateIn(14);
    if (retDate && !retDate.value) retDate.value = isoDateIn(21);
  }

  window.setResultsTripType = function (tripType) {
    document.querySelectorAll(".fr-trip-tab").forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.trip === tripType);
    });
    runSearch(tripType, true);
  };

  function runSearch(tripType, silent) {
    const alert = getElement("searchAlert");
    const showError = (message) => {
      if (alert) {
        alert.textContent = message;
        alert.className = "alert show error";
      }
      return false;
    };

    const cabin = getElement("cabinInput")?.value || "Economy";
    const departure = getElement("depDate")?.value;
    const returnDate = getElement("retDate")?.value;

    if (tripType === "multicity") {
      const legs = collectMultiCityLegs();
      if (legs.length < 2) {
        return showError("Add at least one more flight for a multi-city search.");
      }
      const missing = legs.find((leg) => !leg.date);
      if (missing) return showError("Please select a date for every flight.");

      const result = window.FlightResults.search({
        tripType: "multicity",
        multiLegs: legs.map((leg) => ({
          from: leg.from.code,
          to: leg.to.code,
          date: leg.date,
        })),
        adults: passengerCounts.adults,
        children: passengerCounts.children,
        infants: passengerCounts.infants,
        cabin,
      });

      if (!result.ok) return showError("Please complete every flight.");
      if (alert) {
        alert.textContent = `Multi-city search ready: ${legs.length} flights.`;
        alert.className = "alert show success";
      }
      return true;
    }

    if (!selectedFrom) return showError("Please select a departure city.");
    if (!selectedTo) return showError("Please select an arrival city.");
    if (selectedFrom.code === selectedTo.code) {
      return showError("Departure and arrival cities must be different.");
    }
    if (!departure) return showError("Please select a departure date.");
    if (tripType === "roundtrip" && !returnDate) {
      return showError("Please select a return date.");
    }
    if (
      tripType === "roundtrip" &&
      new Date(returnDate) < new Date(departure)
    ) {
      return showError("The return date cannot be before the departure date.");
    }

    const result = window.FlightResults.search({
      tripType,
      from: selectedFrom.code,
      to: selectedTo.code,
      departure,
      return: returnDate,
      adults: passengerCounts.adults,
      children: passengerCounts.children,
      infants: passengerCounts.infants,
      cabin,
    });

    if (!result.ok) return showError("Please complete the search.");

    if (alert) {
      alert.textContent = `Search ready: ${selectedFrom.city} to ${selectedTo.city} on ${departure}.`;
      alert.className = "alert show success";
    }

    if (!silent) {
      getElement("frResults")?.scrollIntoView({ behavior: "smooth" });
    }
    return true;
  }

  window.handleFlightSearch = function (event) {
    event.preventDefault();
    runSearch(selectedTripType, false);
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

  // ---------- Start ----------
  updateMultiCityCount();
  defaultSearch();

  document.querySelectorAll(".fr-trip-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.trip === "oneway");
  });
  runSearch("oneway", true);
})();
