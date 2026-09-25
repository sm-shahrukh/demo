// ============ DATA ============
const airports = [
  { code: "LHR", city: "London", country: "United Kingdom" },
  { code: "DXB", city: "Dubai", country: "UAE" },
  { code: "JFK", city: "New York", country: "USA" },
  { code: "LAX", city: "Los Angeles", country: "USA" },
  { code: "ISB", city: "Islamabad", country: "Pakistan" },
  { code: "KHI", city: "Karachi", country: "Pakistan" },
  { code: "LHE", city: "Lahore", country: "Pakistan" },
  { code: "PEW", city: "Peshawar", country: "Pakistan" },
  { code: "MED", city: "Medina", country: "Saudi Arabia" },
  { code: "MCT", city: "Makkah", country: "Saudi Arabia" },
  { code: "RUH", city: "Riyadh", country: "Saudi Arabia" },
  { code: "SIN", city: "Singapore", country: "Singapore" },
  { code: "BKK", city: "Bangkok", country: "Thailand" },
  { code: "MNL", city: "Manila", country: "Philippines" },
  { code: "DEL", city: "Delhi", country: "India" },
  { code: "MUM", city: "Mumbai", country: "India" },
  { code: "CDG", city: "Paris", country: "France" },
  { code: "FRA", city: "Frankfurt", country: "Germany" },
  { code: "AMS", city: "Amsterdam", country: "Netherlands" },
  { code: "SYD", city: "Sydney", country: "Australia" },
  { code: "YYZ", city: "Toronto", country: "Canada" },
  { code: "DOH", city: "Doha", country: "Qatar" },
  { code: "KWI", city: "Kuwait City", country: "Kuwait" },
  { code: "BAH", city: "Manama", country: "Bahrain" },
  { code: "AMM", city: "Amman", country: "Jordan" },
  { code: "CAI", city: "Cairo", country: "Egypt" },
  { code: "IST", city: "Istanbul", country: "Turkey" },
];

// ============ STATE ============
let fromSelected = null;
let toSelected = null;
let tripType = "oneway";
let pax = { adults: 1, children: 0, infants: 0 };

// ============ HERO BG ============
(function initHeroBg() {
  const img = document.getElementById("heroBg");
  if (img) {
    img.addEventListener("load", () => img.classList.add("loaded"));
    if (img.complete && img.naturalWidth) img.classList.add("loaded");
  }
})();

// ============ MOBILE MENU ============
function toggleMobileMenu() {
  document.getElementById("mobileMenu").classList.toggle("open");
}
function toggleMobileDropdown(id, btn) {
  document.getElementById(id).classList.toggle("open");
  btn.classList.toggle("open");
}

// ============ CURRENCY PANEL ============
function toggleCurrency(e) {
  e.stopPropagation();
  const panel = document.getElementById("currencyPanel");
  panel.classList.toggle("show");
}
document.addEventListener("click", (e) => {
  if (!e.target.closest("#currencyWrap")) {
    document.getElementById("currencyPanel").classList.remove("show");
  }
  if (!e.target.closest("#signupWrap")) {
    document.getElementById("signupMenu").classList.remove("show");
  }
});
function toggleSignup(e) {
  e.stopPropagation();
  document.getElementById("signupMenu").classList.toggle("show");
}

// ============ TABS ============
function switchTab(tab) {
  document
    .querySelectorAll(".search-tab")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelector(`.search-tab[data-tab="${tab}"]`)
    .classList.add("active");
  document
    .querySelectorAll(".search-panel")
    .forEach((p) => p.classList.remove("active"));
  document.getElementById("panel-" + tab).classList.add("active");
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

let multiCityLegs = 2;
function addMultiCityLeg() {
  if (multiCityLegs >= 6) return;
  multiCityLegs += 1;
  const leg = document.createElement("div");
  leg.className = "multi-city-leg compact-leg";
  leg.innerHTML = `
    <strong>FLIGHT ${multiCityLegs}</strong>
    <div class="multi-city-fields">
      <label><span>Departure From</span><input type="text" placeholder="Departure City or Airport"></label>
      <label><span>Arrival To</span><input type="text" placeholder="Arrival City or Airport"></label>
      <label><span>Departure Date</span><input type="date"></label>
    </div>`;
  document.getElementById("additionalFlightLegs").appendChild(leg);
  document.getElementById("multiCityCount").textContent =
    `${multiCityLegs} / 6 flights`;
  if (multiCityLegs === 6) {
    document.querySelector(".add-flight-btn").disabled = true;
  }
}

function handleModeSearch(event, mode) {
  event.preventDefault();
  const form = event.currentTarget;
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
    <div class="airport-opt" style="padding:8px 12px;cursor:pointer;border-radius:6px;transition:background .15s" onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background=''" onclick="selectAirport('${which}','${a.code}','${a.city}','${a.country}')">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-weight:700;color:var(--primary)">${a.code}</span>
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
  } else {
    toSelected = { code, city, country };
    document.getElementById("toInput").value = `${city} (${code})`;
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
    menu.querySelectorAll(".dd-umrah-type-opt").forEach((o) => o.classList.remove("active"));
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
  const checkboxes = document.querySelectorAll('input[name="umrahService"]:checked');
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
    menu.querySelectorAll(".dd-opt").forEach((o) => o.classList.remove("active"));
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
    input.value = visaTravelers + (visaTravelers === 1 ? " Traveler" : " Travelers");
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
  if (!e.target.closest("#paxTrigger")) {
    document.getElementById("paxPanel")?.classList.remove("show");
    document.getElementById("paxTrigger")?.classList.remove("open");
  }
  if (!e.target.closest("#umrahTypeTrigger")) {
    document.getElementById("umrahTypeMenu")?.classList.remove("show");
    document.getElementById("umrahTypeTrigger")?.classList.remove("open");
  }
  if (!e.target.closest("#umrahServicesTrigger")) {
    document.getElementById("umrahServicesMenu")?.classList.remove("show");
    document.getElementById("umrahServicesTrigger")?.classList.remove("open");
  }
  ["visaFrom", "visaTo", "visaType", "visaSpeed", "visaPax"].forEach((key) => {
    if (!e.target.closest("#" + key + "Trigger")) {
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

  const total = pax.adults + pax.children + pax.infants;
  const cabin = document.getElementById("cabinInput").value;
  const ret =
    tripType === "roundtrip"
      ? " — Return: " + document.getElementById("retDate").value
      : "";

  showAlert(
    `✓ Searching ${fromSelected.city} → ${toSelected.city} on ${depDate}${ret} for ${total} ${total === 1 ? "passenger" : "passengers"} (${cabin})...`,
    "success",
  );

  const result = document.getElementById("searchResult");
  document.getElementById("resultTitle").textContent =
    `Flights: ${fromSelected.city} ( ${fromSelected.code}) → ${toSelected.city} (${toSelected.code})`;
  document.getElementById("resultSummary").innerHTML = [
    `<span class="tag">${fromSelected.code} → ${toSelected.code}</span>`,
    `<span class="tag">${depDate}</span>`,
    `<span class="tag">${cabin}</span>`,
    `<span class="tag">${total} pax</span>`,
  ].join("");
  const basePrice = (fromSelected.code + toSelected.code).length * 55 + 150;
  document.getElementById("resultText").innerHTML = `
    <strong style="color:var(--primary)">From $${basePrice.toLocaleString()} /person</strong> ·
    Airlines available: Emirates, Flydubai, Air Arabia, Saudia, Pakistan International Airlines.<br>
    <small>Showing sample results. Search <a href="#" style="color:var(--primary);text-decoration:underline">full results</a> for live pricing.</small>
  `;
  result.classList.add("show");
  result.scrollIntoView({ behavior: "smooth", block: "nearest" });
  return false;
}
function showAlert(msg, type) {
  const alert = document.getElementById("searchAlert");
  alert.className = "alert " + type + " show";
  alert.textContent = msg;
  alert.style.display = "block";
}

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
    price: 1200.0,
    image: "/images/feature_img1.jpg",
  },
  {
    title: "Pilgrimage in the Heart of Madinah",
    duration: "7 Days / 7 Nights",
    cat: "economy",
    price: 1200.0,
    image: "/images/feature_img2.jpg",
  },
  {
    title: "Spiritual Journey to Madinah",
    duration: "7 Days / 7 Nights",
    cat: "economy",
    price: 1200.0,
    image: "/images/feature_img3.jpg",
  },
  {
    title: "Sacred Journey of Umrah in Makkah",
    duration: "7 Days / 7 Nights",
    cat: "economy",
    price: 1500.0,
    image: "/images/feature_img4.jpg",
  },
  {
    title: "3 Star Umrah Package in Madinah",
    duration: "10 Days / 10 Nights",
    cat: "3star",
    price: 2400.0,
    image: "/images/feature_img5.jpg",
  },
  {
    title: "Exclusive 7-Day Umrah Experience in Makkah",
    duration: "7 Days / 7 Nights",
    cat: "3star",
    price: 2200.0,
    image: "/images/feature_img6.jpg",
  },
  {
    title: "4 Star Umrah Package in Makkah",
    duration: "7 Days / 7 Nights",
    cat: "5star",
    price: 2800.0,
    image: "/images/feature_img7.jpg",
  },
  {
    title: "Luxury Umrah Journey in Madinah",
    duration: "7 Days / 7 Nights",
    cat: "5star",
    price: 3200.0,
    image: "/images/feature_img8.jpg",
  },
  {
    title: "Spiritual Journey Umrah Package",
    duration: "10 Days / 10 Nights",
    cat: "5star",
    price: 2500.0,
    image: "/images/feature_img9.jpg",
  },
  {
    title: "Luxury Umrah Experience in Jeddah",
    duration: "7 Days / 7 Nights",
    cat: "5star",
    price: 2500.0,
    image: "/images/feature_img10.jpg",
  },
];

function renderPackages(filter) {
  const filtered = filter
    ? umrahPackages.filter((p) => p.cat === filter)
    : umrahPackages;
  document.getElementById("packageGrid").innerHTML = filtered
    .map(
      (p) => `
    <a href="#" class="package-card">
      <div class="package-img">
        <img src="${p.image}" alt="${p.title}" loading="lazy">
        <span class="badge">${p.cat === "economy" ? "Economy" : p.cat === "3star" ? "3 Star" : "5 Star"}</span>
      </div>
      <div class="package-body">
        <h3 class="package-title">${p.title}</h3>
        <div class="package-duration">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
          ${p.duration}
        </div>
        <div class="package-price-label">From</div>
        <div class="package-price">USD ${p.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <small>/Person</small></div>
      </div>
    </a>
  `,
    )
    .join("");
}
function filterPackages(filter, btn) {
  document
    .querySelectorAll("#umrahFilters .filter-btn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  renderPackages(filter);
}
renderPackages("economy");
// ******************************************** UMRAH PACKAGES end ********************************************

// ******************************************** RENDER BLOGS start ********************************************

const blogPosts = [
  {
    slug: "what-does-your-airline-ticket-actually-include",
    category: "TRAVEL TIPS",
    title: "What Does Your Airline Ticket Actually Include?",
    date: "Sep 2, 2026",
    image: "/images/blog_img1.png",
  },
  {
    slug: "what-to-pack-for-umrah",
    category: "TRAVEL TIPS",
    title: "What to Pack for Umrah: A Complete Packing Checklist for...",
    date: "Sep 2, 2026",
    image: "/images/blog_img2.png",
  },
  {
    slug: "how-to-find-cheap-international-flights",
    category: "TRAVEL TIPS",
    title: "How to Find Cheap International Flights in 2026",
    date: "Aug 31, 2026",
    image: "/images/blog_img3.png",
  },
  {
    slug: "how-to-book-cheap-flights-from-pakistan",
    category: "TRAVEL TIPS",
    title: "How to Book Cheap Flights from Pakistan: Complete Guide",
    date: "Aug 25, 2026",
    image: "/images/blog_img4.png",
  },
];

(function renderBlogs() {
  document.getElementById("blogGrid").innerHTML = blogPosts
    .map(
      (b) => `
    <a href="#" class="blog-card">
      <img class="blog-img" src="${b.image}" alt="${b.title}" loading="lazy">
      <div class="blog-body">
        <div class="blog-category">${b.category}</div>
        <h3 class="blog-title">${b.title}</h3>
        <div class="blog-date">${b.date}</div>
      </div>
    </a>
  `,
    )
    .join("");
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
  if (document.getElementById("depDate")) document.getElementById("depDate").min = today;
  if (document.getElementById("retDate")) document.getElementById("retDate").min = today;
  if (document.getElementById("umrahStartDate")) {
    document.getElementById("umrahStartDate").min = today;
    document.getElementById("umrahStartDate").addEventListener("change", function () {
      const durInput = document.getElementById("umrahDurationDate");
      if (durInput) {
        durInput.min = this.value;
        if (durInput.value && durInput.value < this.value) {
          durInput.value = this.value;
        }
      }
    });
  }
  if (document.getElementById("umrahDurationDate")) document.getElementById("umrahDurationDate").min = today;
  if (document.getElementById("visaDate")) document.getElementById("visaDate").min = today;
});
// ******************************************** INIT end ********************************************

const currentDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
}).format(new Date());

console.log(currentDate);
