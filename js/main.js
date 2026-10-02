// ---------- 1. Search widget ----------
(() => {
  const passengerCounts = { adults: 1, children: 0, infants: 0 };
  let selectedFrom = null;
  let selectedTo = null;
  let selectedTripType = "oneway";
  let selectedVisaTravelers = 1;
  // Multi-city leg ids: leg 1 is the main From/To/Departure row and leg 2 is the
  // "Flight 2" block already present in the markup, so added legs start at 3.
  // Ids stay unique across removals and each leg carries its own id in
  // data-leg-id, so collection never has to guess.
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
    // The form buttons are driven from the results tabs too, which pass only a
    // type, so fall back to whichever button carries that type.
    const target =
      button ||
      document.querySelector(`.trip-type-btn[data-type="${type}"]`);
    document.querySelectorAll(".trip-type-btn").forEach((item) => {
      item.classList.toggle("active", item === target);
    });
    const returnColumn = getElement("returnCol");
    if (returnColumn)
      returnColumn.style.display = type === "roundtrip" ? "block" : "none";
    getElement("multiCityPanel")?.classList.toggle(
      "show",
      type === "multicity",
    );
    if (type !== "roundtrip" && getElement("retDate")) {
      setDateValue(getElement("retDate"), "");
    }
    closeDropdowns();

    // Keep the results tabs in step. The search itself is not re-run here: it
    // waits for the traveller to press Search, which uses selectedTripType.
    document.querySelectorAll(".fr-trip-tab").forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.trip === type);
    });
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

  // ---------- Calendar ----------
  // One shared panel drives every date field, styled like the airport and
  // passenger dropdowns rather than the browser's own picker. It floats
  // next to whichever field opened it, so the Umrah and Visa date fields —
  // which sit in a different form entirely — get the picker at their own edge.
  const calendar = {
    input: null,
    view: new Date(),
    min: null,
  };

  function toIso(date) {
    // Local parts, not toISOString, so the value never slips a day for anyone
    // west of UTC.
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
  }

  function parseIso(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
    if (!match) return null;
    const date = new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
    );
    return Number.isNaN(date.getTime()) ? null : date;
  }

  // The markup calls openDatePicker('dep') and ('ret') but the inputs are
  // #depDate and #retDate, so resolve the short names rather than trusting the
  // argument to already be an element id.
  function resolveDateInput(id) {
    return getElement(id) || getElement(`${id}Date`);
  }

  // Keeps the form valid: nothing books in the past, and a return date cannot
  // land before the departure it follows.
  function calendarMinFor(input) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (input.id === "retDate") {
      const departure = parseIso(getElement("depDate")?.value);
      return departure && departure > today ? departure : today;
    }
    return today;
  }

  function renderCalendar() {
    const grid = getElement("datePickerGrid");
    const monthLabel = getElement("datePickerMonth");
    if (!grid || !monthLabel) return;

    const selected = parseIso(calendar.input?.value);
    const view = calendar.view;

    monthLabel.textContent = view.toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
    });

    // Monday-first offset, to match the Mo–Su weekday header.
    const leading = (view.getDay() + 6) % 7;
    const daysInMonth = new Date(
      view.getFullYear(),
      view.getMonth() + 1,
      0,
    ).getDate();
    const todayIso = toIso(new Date());

    const cells = [];
    for (let i = 0; i < leading; i += 1) {
      cells.push('<span class="date-cell is-blank"></span>');
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(view.getFullYear(), view.getMonth(), day);
      const iso = toIso(date);
      const classes = ["date-cell"];
      if (selected && toIso(selected) === iso) classes.push("is-selected");
      if (iso === todayIso) classes.push("is-today");
      cells.push(
        `<button type="button" class="${classes.join(" ")}" data-date="${iso}"${
          date < calendar.min ? " disabled" : ""
        }>${day}</button>`,
      );
    }
    grid.innerHTML = cells.join("");
  }

  // Anchor the panel to the field's bottom-left, flipping above the field when
  // there isn't room below and clamping to the viewport so it never runs off
  // the right edge on a narrow screen.
  function positionDatePanel(panel, trigger) {
    const gap = 6;
    const box = panel.getBoundingClientRect();
    const rect = trigger.getBoundingClientRect();
    const margin = 8;

    let left = rect.left;
    if (left + box.width > window.innerWidth - margin) {
      left = window.innerWidth - box.width - margin;
    }
    left = Math.max(margin, left);

    let top = rect.bottom + gap;
    if (top + box.height > window.innerHeight - margin) {
      const above = rect.top - gap - box.height;
      top = above >= margin ? above : Math.max(margin, window.innerHeight - box.height - margin);
    }

    panel.style.left = `${Math.round(left)}px`;
    panel.style.top = `${Math.round(top)}px`;
  }

  window.openDatePicker = function (id) {
    const input = resolveDateInput(id);
    const panel = getElement("datePickerPanel");
    const trigger = input?.closest(".field-box");
    if (!input || !panel || !trigger) return;

    // Re-opening on the same field closes it again, matching the other panels.
    if (calendar.input === input && panel.classList.contains("show")) {
      closeDatePicker();
      return;
    }

    closeDropdowns();
    calendar.input = input;
    calendar.min = calendarMinFor(input);

    const title = getElement("datePickerTitle");
    const label = trigger.querySelector(".field-box-label");
    if (title) {
      title.textContent = label ? `Select ${label.textContent.trim()} date` : "Select date";
    }

    // Open on the chosen month when there is one, otherwise the current month.
    const chosen = parseIso(input.value);
    const today = new Date();
    calendar.view = chosen
      ? new Date(chosen.getFullYear(), chosen.getMonth(), 1)
      : new Date(today.getFullYear(), today.getMonth(), 1);

    panel.classList.add("show");
    trigger.classList.add("open");
    renderCalendar();
    positionDatePanel(panel, trigger);
  };

  function closeDatePicker() {
    const panel = getElement("datePickerPanel");
    panel?.classList.remove("show");
    calendar.input?.closest(".field-box")?.classList.remove("open");
    calendar.input = null;
  }
  window.closeDatePicker = closeDatePicker;

  // The native input keeps holding the ISO value every other script reads, but
  // its own text is hidden under the mirror so the date can be shown in the
  // format the rest of the form uses rather than the browser's locale guess.
  function syncDateMirror(input) {
    const mirror = input?.parentElement?.querySelector(".field-box-input-mirror");
    if (!mirror) return;
    const picked = parseIso(input.value);
    mirror.textContent = picked
      ? picked.toLocaleDateString("en-GB", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : input.placeholder || "";
    mirror.classList.toggle("is-placeholder", !picked);
  }

  window.selectCalendarDate = function (iso) {
    if (!calendar.input) return;
    setDateValue(calendar.input, iso);
    renderCalendar();
    closeDatePicker();
  };

  window.shiftCalendarMonth = function (delta) {
    calendar.view = new Date(
      calendar.view.getFullYear(),
      calendar.view.getMonth() + delta,
      1,
    );
    renderCalendar();
  };

  window.goToToday = function () {
    const today = new Date();
    calendar.view = new Date(today.getFullYear(), today.getMonth(), 1);
    renderCalendar();
  };

  window.clearCalendarDate = function () {
    if (calendar.input) setDateValue(calendar.input, "");
    renderCalendar();
  };

  // Give every date field the mirror span and hide the native control, so all
  // five fields — flights, Umrah and Visa — behave identically.
  function initDateFields() {
    document.querySelectorAll('.field-box-input[type="date"]').forEach((input) => {
      const content = input.parentElement;
      const trigger = input.closest(".field-box");
      if (!content || !trigger || content.querySelector(".field-box-input-mirror"))
        return;

      input.setAttribute("readonly", "");
      trigger.classList.add("date-mirrored");
      const mirror = document.createElement("span");
      mirror.className = "field-box-input-mirror is-placeholder";
      content.appendChild(mirror);
      syncDateMirror(input);
    });
  }

  // Every script writes the ISO value straight onto the input, so mirror it in
  // one place rather than making each caller remember.
  function setDateValue(input, value) {
    if (!input) return;
    input.value = value;
    syncDateMirror(input);
  }

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
    leg.dataset.legId = String(legId);
    leg.innerHTML = `
      <div class="multi-city-leg-heading">
        <strong>FLIGHT ${flightNumber}</strong>
        <button type="button" class="remove-flight-btn" onclick="removeMultiCityLeg(this)">Remove</button>
      </div>
      <div class="multi-city-fields">
        ${airportField(legId, "From", "From", "Departure city")}
        ${airportField(legId, "To", "To", "Arrival city")}
        <label><span>Date</span><input type="date" id="multiCity${legId}Date" /></label>
      </div>`;
    getElement("additionalFlightLegs")?.appendChild(leg);
    updateMultiCityCount();
  };

  window.removeMultiCityLeg = function (button) {
    button.closest(".multi-city-leg")?.remove();
    updateMultiCityCount();
  };

  // Read the multi-city legs the user has filled in, in document order.
  // Airport picks come from `multiCitySelections` (set by selectAirport), but
  // the date is read straight off each input so it is correct even if the
  // change event has not fired yet — and leg ids stay bound to their own input
  // instead of drifting when a middle leg is removed.
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
        const id = node.dataset.legId || index + 2;
        const from = multiCitySelections[`multiCity${id}From`];
        const to = multiCitySelections[`multiCity${id}To`];
        const date = getElement(`multiCity${id}Date`)?.value;
        if (from && to) legs.push({ from, to, date });
      });

    return legs;
  }

  // Default dates so the demo always has something to show on first load.
  function isoDateIn(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return toIso(date);
  }

  // Nothing is pre-selected: the traveller picks the route from the dropdowns, so
  // the results always match what was actually searched for. Dates still get a
  // sensible two-week offset so the search form is usable on first open.
  function defaultSearch() {
    const depDate = getElement("depDate");
    const retDate = getElement("retDate");
    if (depDate && !depDate.value) setDateValue(depDate, isoDateIn(14));
    if (retDate && !retDate.value) setDateValue(retDate, isoDateIn(21));
  }

  // Switching trip type only re-marks the tabs and the search form. Results are
  // left exactly as they were until Search is pressed, so the traveller can pick
  // a different trip type without the list changing underneath them.
  window.setResultsTripType = function (tripType) {
    document.querySelectorAll(".fr-trip-tab").forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.trip === tripType);
    });
    window.setTripType(tripType);
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
    // Day cells live inside the panel, which the guard below treats as "inside
    // a dropdown" — so the pick has to be handled before the early return.
    const day = event.target.closest(".date-cell[data-date]");
    if (day && !day.disabled) {
      selectCalendarDate(day.dataset.date);
      return;
    }

    if (event.target.closest(".field-box, .dd-panel, .multi-city-airport"))
      return;
    closeDropdowns();
  });

  // Keep the panel anchored to its field if the page scrolls while it's open.
  window.addEventListener("scroll", () => {
    const panel = getElement("datePickerPanel");
    const trigger = calendar.input?.closest(".field-box");
    if (panel?.classList.contains("show") && trigger) {
      positionDatePanel(panel, trigger);
    }
  }, true);

  // ---------- Start ----------
  updateMultiCityCount();
  initDateFields();
  defaultSearch();
  // The two-week default is set after the mirrors exist, so seed them once more.
  document
    .querySelectorAll('.field-box-input[type="date"]')
    .forEach(syncDateMirror);

  document.querySelectorAll(".fr-trip-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.trip === "oneway");
  });

  // No search is run on load: with no route chosen there is nothing to show, and
  // running one would raise a validation error before the user has touched anything.
  const emptyState = document.getElementById("frResults");
  if (emptyState) emptyState.classList.add("fr-awaiting-search");
})();
