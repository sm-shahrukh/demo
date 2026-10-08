// ============ DATA ============
const airportOrder = [
  "LHR", "DXB", "JFK", "LAX", "ISB", "KHI", "LHE", "PEW", "MED",
  "MCT", "RUH", "SIN", "BKK", "MNL", "DEL", "BOM", "CDG", "FRA",
  "AMS", "SYD", "YYZ", "DOH", "KWI", "BAH", "AMM", "CAI", "IST",
];
const airportPriority = new Map(
  airportOrder.map((code, index) => [code, index]),
);
const airports = FlightData.AIRPORTS
  .slice()
  .sort(
    (a, b) =>
      (airportPriority.get(a.code) ?? airportOrder.length) -
      (airportPriority.get(b.code) ?? airportOrder.length),
  )
  .map((airport) => ({
    code: airport.code,
    city: airport.city,
    country: airport.country,
  }));

// ============ STATE ============
let fromSelected = null;
let toSelected = null;
let tripType = "oneway";
let pax = { adults: 1, children: 0, infants: 0 };

document.addEventListener("DOMContentLoaded", () => {
  const shape = document.querySelector(".hero-banner .hero-shape");
  if (!shape) return;

  const minScale = 1; // original size
  const maxScale = 1.15; // zoom level
  const duration = 25000; // ms for one full zoom in + back out

  shape.style.transformOrigin = "left center";
  shape.style.willChange = "transform";

  const animate = (now) => {
    const t = (now % duration) / duration; // 0 -> 1 loop
    const wave = (1 - Math.cos(t * 2 * Math.PI)) / 2; // 0 -> 1 -> 0, smooth
    const scale = minScale + (maxScale - minScale) * wave;
    shape.style.transform = `scale(${scale})`;
    requestAnimationFrame(animate);
  };

  requestAnimationFrame(animate);
});

// ============ TABS ============
function switchTab(tab) {
  const tabButtons = document.querySelectorAll(".tab-btn, .search-tab");
  const tabPanels = document.querySelectorAll(".tab-panel, .search-panel");
  const activeButton = [...tabButtons].find(
    (button) => button.dataset.tab === tab,
  );
  const activePanel = document.getElementById(`panel-${tab}`);
  if (!activeButton || !activePanel) return;

  tabButtons.forEach((button) => button.classList.remove("active"));
  activeButton.classList.add("active");
  tabPanels.forEach((panel) => panel.classList.remove("active"));
  activePanel.classList.add("active");
}

// ============ TRIP TYPE ============
function setTripType(type, btn) {
  tripType = type;
  document
    .querySelectorAll(".trip-type-btn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById("returnCol").style.display =
    type === "roundtrip" ? "flex" : "none";
  document
    .getElementById("multiCityPanel")
    .classList.toggle("show", type === "multicity");
  if (type !== "roundtrip") {
    document.getElementById("retDate").value = "";
  }
}

let multiCityLegId = 2;

function updateMultiCityLegs() {
  const legs = [
    ...document.querySelectorAll("#multiCityPanel .multi-city-leg"),
  ];
  const flightCount = legs.length + 1;
  document.getElementById("multiCityCount").textContent =
    `${flightCount} / 6 flights`;
  legs.forEach((leg, index) => {
    const flightNumber = index + 2;
    leg.querySelector(".multi-city-leg-heading strong").textContent =
      `FLIGHT ${flightNumber}`;
    leg
      .querySelector(".remove-flight-btn")
      .setAttribute("aria-label", `Remove flight ${flightNumber}`);
  });
  document.querySelector(".add-flight-btn").disabled = flightCount >= 6;
}

function multiCityAirportField(legId, direction, label, placeholder) {
  const key = `multiCity${legId}${direction}`;
  return `
    <label class="multi-city-airport">
      <span>${label}</span>
      <div class="input-wrapper" data-click="openAirportPanel('${key}')">
        <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="10" r="3" />
          <path d="M12 2a8 8 0 0 0-8 8c0 5.4 8 11 8 11s8-5.6 8-11a8 8 0 0 0-8-8z" />
        </svg>
        <input id="${key}Input" type="text" placeholder="${placeholder}" readonly />
      </div>
      <div class="dropdown-panel" id="${key}Panel">
        <div class="panel-header">
          <span>Select ${label}</span>
          <button type="button" class="close-btn" aria-label="Close airport list" data-click="closeAirportPanel('${key}')">×</button>
        </div>
        <input id="${key}Query" class="search-input" type="text" placeholder="Search airports..." data-input="searchAirport('${key}')" />
        <div id="${key}Results" class="results-list"></div>
      </div>
    </label>`;
}

function addMultiCityLeg() {
  const legs = document.querySelectorAll("#multiCityPanel .multi-city-leg");
  if (legs.length >= 5) return;

  const flightNumber = legs.length + 2;
  const legId = ++multiCityLegId;
  const leg = document.createElement("div");
  leg.className = "multi-city-leg compact-leg";
  leg.innerHTML = `
    <div class="multi-city-leg-heading">
      <strong>FLIGHT ${flightNumber}</strong>
      <button type="button" class="remove-flight-btn" data-click="removeMultiCityLeg(this)" aria-label="Remove flight ${flightNumber}">Remove</button>
    </div>
    <div class="multi-city-fields">
      ${multiCityAirportField(legId, "From", "From", "Departure city or airport")}
      ${multiCityAirportField(legId, "To", "To", "Arrival city or airport")}
      <label><span>Departure Date</span><input type="date"></label>
    </div>`;
  document.getElementById("additionalFlightLegs").appendChild(leg);
  updateMultiCityLegs();
}

function removeMultiCityLeg(button) {
  button.closest(".multi-city-leg").remove();
  updateMultiCityLegs();
}

function handleModeSearch(event, mode) {
  event.preventDefault();
  const form = this instanceof HTMLFormElement ? this : event.currentTarget;
  let message = `${mode} search started.`;
  if (mode === "Umrah") message = "Searching Umrah packages...";
  if (mode === "Visa") message = "Searching visa options...";
  const notice = document.createElement("div");
  notice.className = "mode-search-notice";
  notice.textContent = message;
  form.appendChild(notice);
  window.setTimeout(() => notice.remove(), 3000);
  return false;
}

// ============ AIRPORT SEARCH ============
function openAirportPanel(which) {
  document.getElementById(which + "Panel").classList.add("show");
  document.getElementById(which + "Query").focus();
  renderAirportResults(which, airports);
}
function closeAirportPanel(which) {
  document.getElementById(which + "Panel").classList.remove("show");
}
function searchAirport(which) {
  const q = document
    .getElementById(which + "Query")
    .value.toLowerCase()
    .trim();
  const filtered =
    q.length < 1
      ? airports
      : airports.filter(
          (a) =>
            a.city.toLowerCase().includes(q) ||
            a.country.toLowerCase().includes(q) ||
            a.code.toLowerCase().includes(q),
        );
  renderAirportResults(which, filtered);
}
function renderAirportResults(which, list) {
  const box = document.getElementById(which + "Results");
  box.innerHTML =
    list
      .slice(0, 6)
      .map(
        (a) => `
    <div class="airport-opt" data-click="selectAirport('${which}','${a.code}','${a.city}','${a.country}')">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-weight:700;color:var(--primary-blue)">${a.code}</span>
        <span style="font-size:14px;color:#374151">${a.city} <span style="color:#9ca3af">— ${a.country}</span></span>
      </div>
    </div>
  `,
      )
      .join("") ||
    '<div style="padding:16px;text-align:center;color:#9ca3af">No results found</div>';
}
function selectAirport(which, code, city, country) {
  if (which === "from") {
    fromSelected = { code, city, country };
    document.getElementById("fromInput").value = `${city} (${code})`;
  } else if (which === "to") {
    toSelected = { code, city, country };
    document.getElementById("toInput").value = `${city} (${code})`;
  } else {
    document.getElementById(which + "Input").value = `${city} (${code})`;
  }
  closeAirportPanel(which);
}
function swapCities() {
  const tmp = fromSelected;
  fromSelected = toSelected;
  toSelected = tmp;
  const fromVal = document.getElementById("fromInput").value;
  document.getElementById("fromInput").value =
    document.getElementById("toInput").value;
  document.getElementById("toInput").value = fromVal;
  const fromSel = fromSelected;
  fromSelected = toSelected;
  toSelected = fromSel;
}

// ============ CABIN ============
function toggleCabinMenu() {
  document.getElementById("cabinMenu").classList.toggle("show");
  document.getElementById("cabinTrigger")?.classList.toggle("open");
}
function setCabin(val) {
  document.getElementById("cabinInput").value = val;
  document.getElementById("cabinMenu").classList.remove("show");
  document.getElementById("cabinTrigger")?.classList.remove("open");
}

// ============ DATE PICKER ============
function openDatePicker(type) {
  let id = type;
  if (type === "dep") id = "depDate";
  else if (type === "ret") id = "retDate";
  const input = document.getElementById(id);
  if (input) input.showPicker?.() || input.click();
}

// ============ PASSENGERS ============
function togglePassengerPanel() {
  document.getElementById("paxPanel").classList.toggle("show");
  document.getElementById("paxTrigger")?.classList.toggle("open");
}
function changePax(type, delta) {
  pax[type] = Math.max(0, pax[type] + delta);
  document.getElementById(
    "count" + type.charAt(0).toUpperCase() + type.slice(1),
  ).textContent = pax[type];
  updatePaxInput();
}
function updatePaxInput() {
  const total = pax.adults + pax.children + pax.infants;
  const label = total + (total === 1 ? " Passenger" : " Passengers");
  document.getElementById("paxInput").value = label;
}

// ============ UMRAH DROPDOWNS ============
function toggleUmrahTypeMenu(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById("umrahTypeMenu");
  const trigger = document.getElementById("umrahTypeTrigger");
  const isOpen = menu?.classList.contains("show");
  closeAllHeroDropdowns();
  if (!isOpen && menu) {
    menu.classList.add("show");
    trigger?.classList.add("open");
  }
}

function setUmrahType(val, el) {
  const input = document.getElementById("umrahTypeInput");
  if (input) input.value = val;
  const menu = document.getElementById("umrahTypeMenu");
  if (menu) {
    menu
      .querySelectorAll(".dd-umrah-type-opt")
      .forEach((o) => o.classList.remove("active"));
    if (el) el.classList.add("active");
    menu.classList.remove("show");
  }
  document.getElementById("umrahTypeTrigger")?.classList.remove("open");
}

function toggleUmrahServicesMenu(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById("umrahServicesMenu");
  const trigger = document.getElementById("umrahServicesTrigger");
  const isOpen = menu?.classList.contains("show");
  closeAllHeroDropdowns();
  if (!isOpen && menu) {
    menu.classList.add("show");
    trigger?.classList.add("open");
  }
}

function updateUmrahServices() {
  const checkboxes = document.querySelectorAll(
    'input[name="umrahService"]:checked',
  );
  const selected = Array.from(checkboxes).map((c) => c.value);
  const input = document.getElementById("umrahServicesInput");
  if (!input) return;
  if (selected.length === 0) {
    input.value = "No services selected";
  } else if (selected.length === 3) {
    input.value = "Flights, Hotel, Transport";
  } else {
    input.value = selected.join(", ");
  }
}

// ============ VISA DROPDOWNS ============
let visaTravelers = 1;
function toggleVisaDropdown(type, e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById(type + "Menu");
  const trigger = document.getElementById(type + "Trigger");
  const isOpen = menu?.classList.contains("show");
  closeAllHeroDropdowns();
  if (!isOpen && menu) {
    menu.classList.add("show");
    trigger?.classList.add("open");
  }
}

function setVisaVal(type, val, el) {
  const input = document.getElementById(type + "Input");
  if (input) input.value = val;
  const menu = document.getElementById(type + "Menu");
  if (menu) {
    menu
      .querySelectorAll(".dd-opt")
      .forEach((o) => o.classList.remove("active"));
    if (el) el.classList.add("active");
    menu.classList.remove("show");
  }
  document.getElementById(type + "Trigger")?.classList.remove("open");
}

function changeVisaTravelers(delta) {
  visaTravelers = Math.max(1, visaTravelers + delta);
  const countEl = document.getElementById("countVisaTravelers");
  if (countEl) countEl.textContent = visaTravelers;
  const input = document.getElementById("visaPaxInput");
  if (input) {
    input.value =
      visaTravelers + (visaTravelers === 1 ? " Traveler" : " Travelers");
  }
}

function closeAllHeroDropdowns() {
  document.querySelectorAll(".dd-panel.show").forEach((panel) => {
    panel.classList.remove("show");
  });
  document.querySelectorAll(".field-box.open").forEach((fb) => {
    fb.classList.remove("open");
  });
}

// Outside click handler for all hero search dropdowns
document.addEventListener("click", (e) => {
  if (!e.target.closest("#cabinTrigger")) {
    document.getElementById("cabinMenu")?.classList.remove("show");
    document.getElementById("cabinTrigger")?.classList.remove("open");
  }
  if (!e.target.closest("#paxTrigger") && !e.target.closest("#paxPanel")) {
    document.getElementById("paxPanel")?.classList.remove("show");
    document.getElementById("paxTrigger")?.classList.remove("open");
  }
  if (
    !e.target.closest("#umrahTypeTrigger") &&
    !e.target.closest("#umrahTypeMenu")
  ) {
    document.getElementById("umrahTypeMenu")?.classList.remove("show");
    document.getElementById("umrahTypeTrigger")?.classList.remove("open");
  }
  if (
    !e.target.closest("#umrahServicesTrigger") &&
    !e.target.closest("#umrahServicesMenu")
  ) {
    document.getElementById("umrahServicesMenu")?.classList.remove("show");
    document.getElementById("umrahServicesTrigger")?.classList.remove("open");
  }
  ["visaFrom", "visaTo", "visaType", "visaSpeed", "visaPax"].forEach((key) => {
    if (
      !e.target.closest("#" + key + "Trigger") &&
      !e.target.closest("#" + key + "Menu")
    ) {
      document.getElementById(key + "Menu")?.classList.remove("show");
      document.getElementById(key + "Trigger")?.classList.remove("open");
    }
  });
});

// ============ FLIGHT SEARCH ============
function handleFlightSearch(e) {
  e.preventDefault();
  const alert = document.getElementById("searchAlert");
  alert.className = "alert";
  alert.style.display = "none";

  if (!fromSelected) {
    showAlert("Please select a departure city.", "error");
    return false;
  }
  if (!toSelected) {
    showAlert("Please select an arrival city.", "error");
    return false;
  }
  if (fromSelected.code === toSelected.code) {
    showAlert("Departure and arrival cities cannot be the same.", "error");
    return false;
  }
  const depDate = document.getElementById("depDate").value;
  if (!depDate) {
    showAlert("Please select a departure date.", "error");
    return false;
  }
  if (tripType === "roundtrip" && !document.getElementById("retDate").value) {
    showAlert("Please select a return date.", "error");
    return false;
  }
  const departure = document.getElementById("depDate").value;
  const returnDate = document.getElementById("retDate").value;
  if (
    tripType === "roundtrip" &&
    new Date(returnDate) < new Date(departure)
  ) {
    showAlert("The return date cannot be before the departure date.", "error");
    return false;
  }

  const cabin = document.getElementById("cabinInput").value;
  const search = new URLSearchParams({
    trip: tripType,
    from: fromSelected.code,
    to: toSelected.code,
    departure: depDate,
    adults: String(pax.adults),
    children: String(pax.children),
    infants: String(pax.infants),
    cabin,
  });
  if (tripType === "roundtrip") {
    search.set("return", returnDate);
  } else if (tripType === "multicity") {
    const multiLegs = [
      { from: fromSelected.code, to: toSelected.code, date: depDate },
    ];
    const additionalLegs = [
      ...document.querySelectorAll("#multiCityPanel .multi-city-leg"),
    ];

    for (const leg of additionalLegs) {
      const fromInput = leg.querySelector('input[id$="FromInput"]');
      const toInput = leg.querySelector('input[id$="ToInput"]');
      const dateInput = leg.querySelector('input[type="date"]');
      const fromCode = fromInput?.value.match(/\(([A-Z]{3})\)$/)?.[1];
      const toCode = toInput?.value.match(/\(([A-Z]{3})\)$/)?.[1];
      if (!fromCode || !toCode || !dateInput?.value) {
        showAlert("Complete both airports and a date for every flight.", "error");
        return false;
      }
      multiLegs.push({
        from: fromCode,
        to: toCode,
        date: dateInput.value,
      });
    }

    search.set("multiLegs", JSON.stringify(multiLegs));
  }
  window.location.href = `/search-flight.html?${search.toString()}`;
  return false;
}
function showAlert(msg, type) {
  const alert = document.getElementById("searchAlert");
  alert.className = "alert " + type + " show";
  alert.textContent = msg;
  alert.style.display = "block";
}

// ******************************************** STATS SECTION START ********************************************
document.addEventListener("DOMContentLoaded", () => {
  const counters = document.querySelectorAll(".stat-number");
  const duration = 2000; // animation time in ms

  // Split "50K+" into prefix "", number 50, suffix "K+"
  const parse = (text) => {
    const match = text.trim().match(/^(\D*)(\d+(?:\.\d+)?)(.*)$/);
    if (!match) return null;
    return {
      prefix: match[1],
      target: parseFloat(match[2]),
      suffix: match[3],
      decimals: (match[2].split(".")[1] || "").length,
    };
  };

  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  const animate = (el) => {
    const data = el._counter;
    if (!data) return;

    cancelAnimationFrame(data.frame);
    const start = performance.now();

    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const value = data.target * easeOutCubic(progress);
      el.textContent = data.prefix + value.toFixed(data.decimals) + data.suffix;

      if (progress < 1) {
        data.frame = requestAnimationFrame(step);
      }
    };

    data.frame = requestAnimationFrame(step);
  };

  const reset = (el) => {
    const data = el._counter;
    if (!data) return;
    cancelAnimationFrame(data.frame);
    el.textContent = data.prefix + (0).toFixed(data.decimals) + data.suffix;
  };

  counters.forEach((el) => {
    const data = parse(el.textContent);
    if (data) el._counter = data;
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animate(entry.target); // runs every time it enters the screen
        } else {
          reset(entry.target); // resets to 0 so it can replay next time
        }
      });
    },
    { threshold: 0.4 }, // starts when 40% of the number is visible
  );

  counters.forEach((el) => {
    if (el._counter) observer.observe(el);
  });
});
// ******************************************** STATS SECTION END ********************************************

// ******************************************** RENDER FLIGHT FARES start ********************************************
const flightFares = [
  {
    from: { code: "DXB", city: "Dubai" },
    to: { code: "LHR", city: "London" },
    airline: "Emirates",
    price: 650,
  },
  {
    from: { code: "CDG", city: "Paris" },
    to: { code: "BCN", city: "Barcelona" },
    airline: "Air France",
    price: 180,
  },
  {
    from: { code: "DXB", city: "Dubai" },
    to: { code: "JFK", city: "New York" },
    airline: "Emirates",
    price: 950,
  },
  {
    from: { code: "JFK", city: "New York" },
    to: { code: "LHR", city: "London" },
    airline: "Delta Air Lines",
    price: 750,
  },
  {
    from: { code: "JFK", city: "New York" },
    to: { code: "DXB", city: "Dubai" },
    airline: "United Airlines",
    price: 920,
  },
  {
    from: { code: "CDG", city: "Paris" },
    to: { code: "JFK", city: "New York" },
    airline: "Air France",
    price: 690,
  },
];

(function renderFlights() {
  document.getElementById("flightGrid").innerHTML = flightFares
    .map(
      (f) => `
    <a href="#" class="flight-card">
      <div class="flight-card-inner">
        <div class="flight-route">
          <span class="flight-code">${f.from.code}</span>
          <div class="flight-arrow"><span class="flight-airline-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg></span></div>
          <span class="flight-code">${f.to.code}</span>
        </div>
        <div class="flight-details">
          <span class="flight-city">${f.from.city}</span>
          <span class="flight-city center"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>${f.airline}</span>
          <span class="flight-city">${f.to.city}</span>
        </div>
        <div class="flight-meta">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          One Way
        </div>
        <div class="flight-price">
          <span class="price-badge">from USD ${f.price.toLocaleString()}</span>
        </div>
      </div>
    </a>
  `,
    )
    .join("");
})();
// ******************************************** RENDER FLIGHT FARES end ********************************************

// ******************************************** UMRAH PACKAGES start ********************************************
const umrahPackages = [
  {
    title: "Umrah Journey: Madinah Bliss",
    duration: "7 Days / 7 Nights",
    cat: "economy",
    price: 1200,
    image: "images/feature_img1.jpg",
  },
  {
    title: "Pilgrimage in the Heart of Madinah",
    duration: "7 Days / 7 Nights",
    cat: "economy",
    price: 1200,
    image: "images/feature_img2.jpg",
  },
  {
    title: "Exclusive 7-Day Umrah Experience in Makkah",
    duration: "7 Days / 7 Nights",
    cat: "economy",
    price: 2200,
    image: "images/feature_img6.jpg",
  },
  {
    title: "Spiritual Journey to Madinah",
    duration: "7 Days / 7 Nights",
    cat: "economy",
    price: 1200,
    image: "images/feature_img3.jpg",
  },
  {
    title: "Sacred Journey of Umrah in Makkah",
    duration: "7 Days / 7 Nights",
    cat: "economy",
    price: 1500,
    image: "images/feature_img4.jpg",
  },
  {
    title: "3 Star Umrah Package in Madinah",
    duration: "10 Days / 10 Nights",
    cat: "3star",
    price: 2400,
    image: "images/feature_img5.jpg",
  },
  {
    title: "Exclusive 7-Day Umrah Experience in Makkah",
    duration: "7 Days / 7 Nights",
    cat: "3star",
    price: 2200,
    image: "images/feature_img6.jpg",
  },
  {
    title: "4 Star Umrah Package in Makkah",
    duration: "7 Days / 7 Nights",
    cat: "5star",
    price: 2800,
    image: "images/feature_img7.jpg",
  },
  {
    title: "Luxury Umrah Journey in Madinah",
    duration: "7 Days / 7 Nights",
    cat: "5star",
    price: 3200,
    image: "images/feature_img8.jpg",
  },
  {
    title: "Spiritual Journey Umrah Package",
    duration: "10 Days / 10 Nights",
    cat: "5star",
    price: 2500,
    image: "images/feature_img9.jpg",
  },
  {
    title: "Luxury Umrah Experience in Jeddah",
    duration: "7 Days / 7 Nights",
    cat: "5star",
    price: 2500,
    image: "images/feature_img10.jpg",
  },
];


(function () {
  const LABEL = { economy: "Economy", "3star": "3 Star", "5star": "5 Star" };
  const DEFAULT_DESC =
    "Includes flights, accommodation and transport for a smooth, comfortable pilgrimage.";
  const track = document.getElementById("packageGrid");
  const viewport = document.getElementById("umViewport");
  const dotsWrap = document.getElementById("umDots");
  const filters = document.getElementById("umrahFilters");
  if (!track || !viewport) return;

  let current = 0,
    count = 0,
    curX = 0;
  const fmt = (n) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });

  function rating(p) {
    if (!p.rating) return "";
    const label = p.rating >= 8.5 ? "Superb" : p.rating >= 7 ? "Good" : "Fair";
    const rev = p.reviews ? `<small>${p.reviews} Reviews</small>` : "";
    return `<div class="um-rating"><div class="um-rating-text">${label}${rev}</div><span class="um-score">${p.rating.toFixed(1)}</span></div>`;
  }

  function card(p) {
    return `
    <div class="um-slide">
      <article class="um-card">
        <div class="um-img">
          <img src="${p.image}" alt="${p.title}" loading="lazy" draggable="false">
          <span class="um-tag">${LABEL[p.cat] || p.cat}</span>
          <button type="button" class="um-heart" aria-label="Save package">
            <svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.2 3 4.5 6.7 4.5c2 0 3.7 1.1 5.3 3 1.6-1.9 3.3-3 5.3-3 3.7 0 5.8 3.7 4.3 7.2C19.5 16.4 12 21 12 21z"/></svg>
          </button>
        </div>
        <div class="um-body">
          <h3 class="um-title"><a href="${p.url || "#"}" class="stretched-link">${p.title}</a></h3>
          <p class="um-desc">${p.desc || DEFAULT_DESC}</p>
          <div class="um-price">From <strong>USD ${fmt(p.price)}</strong> /per person</div>
        </div>
        <div class="um-footer">
          <span class="um-duration">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
            ${p.duration}
          </span>
          ${rating(p)}
        </div>
      </article>
    </div>`;
  }

  function position() {
    const slides = [...track.children];
    if (!slides.length) return;
    const el = slides[current];
    curX = viewport.clientWidth / 2 - (el.offsetLeft + el.offsetWidth / 2);
    track.style.transform = `translateX(${curX}px)`;
    slides.forEach((s, i) => s.classList.toggle("is-active", i === current));
    [...dotsWrap.children].forEach((d, i) =>
      d.classList.toggle("active", i === current),
    );
  }

  function goTo(i) {
    current = Math.max(0, Math.min(count - 1, i));
    position();
  }

  function renderPackages(filter) {
    const list = umrahPackages.filter((p) => !filter || p.cat === filter);
    count = list.length;
    track.innerHTML = list.map(card).join("");
    dotsWrap.innerHTML = list
      .map(
        (_, i) =>
          `<button type="button" class="um-dot" data-i="${i}" aria-label="Go to package ${i + 1}"></button>`,
      )
      .join("");
    current = window.innerWidth < 768 ? 0 : Math.floor((count - 1) / 2);
    track.style.transition = "none";
    position();
    void track.offsetWidth;
    track.style.transition = "";
  }

  // ---- filters / dots / clicks ----
  filters.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-tab");
    if (!btn) return;
    filters
      .querySelectorAll(".filter-tab")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    renderPackages(btn.dataset.filter);
  });

  dotsWrap.addEventListener("click", (e) => {
    const d = e.target.closest(".um-dot");
    if (d) goTo(+d.dataset.i);
  });

  track.addEventListener("click", (e) => {
    const heart = e.target.closest(".um-heart");
    if (heart) {
      e.preventDefault();
      e.stopPropagation();
      heart.classList.toggle("liked");
      return;
    }
    const slide = e.target.closest(".um-slide");
    if (slide && !slide.classList.contains("is-active")) {
      e.preventDefault();
      goTo([...track.children].indexOf(slide));
    }
  });

  // ---- drag / swipe: the track follows the pointer, then snaps ----
  let startX = 0,
    startY = 0,
    baseX = 0,
    down = false,
    moved = false,
    pid = null;
  const slideW = () => (track.children[0] ? track.children[0].offsetWidth : 1);

  viewport.addEventListener("dragstart", (e) => e.preventDefault());
  viewport.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    down = true;
    moved = false;
    startX = e.clientX;
    startY = e.clientY;
    baseX = curX;
    pid = e.pointerId;
  });
  viewport.addEventListener("pointermove", (e) => {
    if (!down) return;
    const dx = e.clientX - startX;
    if (!moved) {
      if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(e.clientY - startY))
        return;
      moved = true;
      viewport.setPointerCapture(pid);
      track.style.transition = "none";
      viewport.classList.add("is-dragging");
    }
    track.style.transform = `translateX(${baseX + dx}px)`;
  });
  viewport.addEventListener("pointerup", (e) => {
    if (!down) return;
    down = false;
    if (!moved) return;
    viewport.classList.remove("is-dragging");
    track.style.transition = "";
    const dx = e.clientX - startX;
    let steps = Math.round(-dx / slideW());
    if (steps === 0 && Math.abs(dx) > 50) steps = dx < 0 ? 1 : -1;
    goTo(current + steps);
  });
  viewport.addEventListener("pointercancel", () => {
    if (!down) return;
    down = false;
    if (moved) {
      viewport.classList.remove("is-dragging");
      track.style.transition = "";
      position();
    }
  });
  viewport.addEventListener(
    "click",
    (e) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
        moved = false;
      }
    },
    true,
  );

  let t;
  window.addEventListener("resize", () => {
    clearTimeout(t);
    t = setTimeout(position, 100);
  });

  renderPackages("economy");
})();
// ******************************************** UMRAH PACKAGES end ********************************************

// ******************************************** RENDER BLOGS start ********************************************

(function () {
  var posts = [
    {
      cat: "Travel Tools",
      title: "Top Travel Apps You Should Use for a Better Travel Experience",
      excerpt: "The best apps for maps, bookings and budgeting on the road.",
      date: "21 April, 2026",
      img: "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=800&q=80",
      url: "#",
    },
    {
      cat: "Booking Tips",
      title: "How to Book Flights at the Best Prices and Save More",
      excerpt:
        "Learn smart strategies to book flights at the best prices, from timing your purchase and comparing fares.",
      date: "21 April, 2026",
      img: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=800&q=80",
      url: "#",
    },
    {
      cat: "Adventure Travel",
      title: "Exciting Adventure Travel Ideas for Thrill Seekers",
      excerpt: "Hiking, diving, rafting and more for your next trip.",
      date: "21 April, 2026",
      img: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80",
      url: "#",
    },
    {
      cat: "Travel Guide",
      title: "Complete Solo Travel Guide for Beginners",
      excerpt:
        "Start your solo travel journey with confidence using this beginner-friendly guide, packed with practical tips.",
      date: "21 April, 2026",
      img: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80",
      url: "#",
    },
    {
      cat: "Destinations",
      title: "Hidden Gems Worth Adding to Your Bucket List",
      excerpt: "Quiet places that deserve a spot on your itinerary.",
      date: "21 April, 2026",
      img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
      url: "#",
    },
    {
      cat: "Packing",
      title: "Smart Packing Checklist for Every Kind of Trip",
      excerpt:
        "Pack light and never forget the essentials again, with this simple checklist.",
      date: "21 April, 2026",
      img: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80",
      url: "#",
    },
  ];

  var arrow =
    '<svg viewBox="0 0 14 14" fill="none" stroke-width="1.8" stroke-linecap="round"><path d="M2 12L12 2M4 2h8v8"/></svg>';
  var blogSection = document.getElementById("blog");
  var track = document.getElementById("blogTrack");
  var dotsBox = document.getElementById("blogDots");

  track.innerHTML = posts
    .map(function (p, i) {
      var overlay = i % 2 === 0;
      var img =
        '<div class="blog-img g' +
        (i % 6) +
        '"><img src="' +
        p.img +
        '" alt="' +
        p.title +
        '" loading="lazy"></div>';
      var meta =
        '<div class="blog-meta"><span>' +
        p.date +
        '</span><span class="blog-more">Read More ' +
        arrow +
        "</span></div>";
      var body = overlay
        ? '<div class="blog-body"><span class="blog-tag">' +
          p.cat +
          '</span><h3 class="blog-title">' +
          p.title +
          "</h3>" +
          meta +
          "</div>"
        : '<div class="blog-body"><span class="blog-tag">' +
          p.cat +
          '</span><h3 class="blog-title">' +
          p.title +
          '</h3><p class="blog-excerpt">' +
          p.excerpt +
          "</p>" +
          meta +
          "</div>";
      return (
        '<article class="blog-card ' +
        (overlay ? "overlay" : "plain") +
        '"><a href="' +
        p.url +
        '">' +
        img +
        body +
        "</a></article>"
      );
    })
    .join("");

  // hide broken images so the gradient fallback shows
  track.querySelectorAll("img").forEach(function (im) {
    var hide = function () {
      im.style.display = "none";
    };
    im.addEventListener("error", hide);
    if (im.complete && im.naturalWidth === 0) hide();
  });

  var viewport = document.getElementById("blogViewport");
  var idx = 0,
    timer,
    startX = 0,
    dx = 0,
    dragging = false,
    moved = false;

  function pv() {
    return (
      parseInt(getComputedStyle(blogSection).getPropertyValue("--pv"), 10) || 1
    );
  }
  function gap() {
    return parseFloat(getComputedStyle(track).columnGap) || 24;
  }
  function cardW() {
    return track.querySelector(".blog-card").offsetWidth;
  }
  function step() {
    return cardW() + gap();
  }
  function maxIdx() {
    return Math.max(0, posts.length - pv());
  }

  function render() {
    track.style.transform = "translateX(" + (-idx * step() + dx) + "px)";
    dotsBox.querySelectorAll("button").forEach(function (b, k) {
      b.classList.toggle("active", k === idx);
    });
  }

  function go(i) {
    var max = maxIdx();
    idx = i > max ? 0 : i < 0 ? max : i; // loops back at the ends
    dx = 0;
    render();
  }

  function buildDots() {
    dotsBox.innerHTML = "";
    for (var i = 0; i <= maxIdx(); i++) {
      (function (i) {
        var b = document.createElement("button");
        b.setAttribute("aria-label", "Go to slide " + (i + 1));
        b.addEventListener("click", function () {
          go(i);
          restart();
        });
        dotsBox.appendChild(b);
      })(i);
    }
    if (idx > maxIdx()) idx = maxIdx();
    render();
  }

  function restart() {
    clearInterval(timer);
    timer = setInterval(function () {
      go(idx + 1);
    }, 4500);
  }

  document.getElementById("blogPrev").addEventListener("click", function () {
    go(idx - 1);
    restart();
  });
  document.getElementById("blogNext").addEventListener("click", function () {
    go(idx + 1);
    restart();
  });

  // drag / swipe (mouse + touch)
  viewport.addEventListener("pointerdown", function (e) {
    dragging = true;
    moved = false;
    startX = e.clientX;
    dx = 0;
    track.classList.add("no-anim");
    viewport.classList.add("dragging");
  });
  window.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    dx = e.clientX - startX;
    if (Math.abs(dx) > 6) moved = true;
    render();
  });
  window.addEventListener("pointerup", function () {
    if (!dragging) return;
    dragging = false;
    track.classList.remove("no-anim");
    viewport.classList.remove("dragging");
    var d = dx;
    dx = 0;
    if (d < -50) go(idx + 1);
    else if (d > 50) go(idx - 1);
    else render();
    restart();
  });
  track.addEventListener("click", function (e) {
    if (moved) {
      e.preventDefault();
      moved = false;
    }
  });

  viewport.addEventListener("mouseenter", function () {
    clearInterval(timer);
  });
  viewport.addEventListener("mouseleave", restart);
  window.addEventListener("resize", buildDots);

  buildDots();
  restart();
})();

// ******************************************** RENDER BLOGS end ********************************************

// ******************************************** BACK TO TOP start ********************************************

window.addEventListener("scroll", () => {
  const btn = document.getElementById("backToTop");
  if (window.scrollY > 400) btn.classList.add("show");
  else btn.classList.remove("show");
});
// ******************************************** BACK TO TOP end ********************************************

// ******************************************** INIT start ********************************************
document.addEventListener("DOMContentLoaded", () => {
  updatePaxInput();
  // Set min dates
  const today = new Date().toISOString().split("T")[0];
  if (document.getElementById("depDate"))
    document.getElementById("depDate").min = today;
  if (document.getElementById("retDate"))
    document.getElementById("retDate").min = today;
  if (document.getElementById("umrahStartDate")) {
    document.getElementById("umrahStartDate").min = today;
    document
      .getElementById("umrahStartDate")
      .addEventListener("change", function () {
        const durInput = document.getElementById("umrahDurationDate");
        if (durInput) {
          durInput.min = this.value;
          if (durInput.value && durInput.value < this.value) {
            durInput.value = this.value;
          }
        }
      });
  }
  if (document.getElementById("umrahDurationDate"))
    document.getElementById("umrahDurationDate").min = today;
  if (document.getElementById("visaDate"))
    document.getElementById("visaDate").min = today;
});
// ******************************************** INIT end ********************************************

const currentDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
}).format(new Date());

// console.log(currentDate);
