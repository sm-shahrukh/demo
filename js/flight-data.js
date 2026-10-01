/* ============================================================================
   flight-data.js — reference data + itinerary generator
   Real airports (IATA, city, country, lat/lon, UTC offset) and real airlines.
   Itineraries are generated deterministically from the search conditions, so
   every combination the user picks produces a coherent set of flights.
   ========================================================================== */

// ---------- 1. Airports -----------------------------------------------------
// utc = standard UTC offset in hours (fractional where zones are half/quarter)
// Searchable airports, limited to the five markets this booking flow covers:
// UAE, Qatar, Saudi Arabia, Turkiye and Pakistan. Every airport here has real
// coordinates and a UTC offset, so distances, block times and local arrival
// times stay correct.
const AIRPORTS = [
  { code: "DXB", city: "Dubai", name: "Dubai International", country: "UAE", lat: 25.25, lon: 55.36, utc: 4, region: "me" },

  { code: "DOH", city: "Doha", name: "Hamad International", country: "Qatar", lat: 25.27, lon: 51.61, utc: 3, region: "me" },

  { code: "RUH", city: "Riyadh", name: "King Khalid International", country: "Saudi Arabia", lat: 24.96, lon: 46.7, utc: 3, region: "me" },
  { code: "JED", city: "Jeddah", name: "King Abdulaziz International", country: "Saudi Arabia", lat: 21.68, lon: 39.16, utc: 3, region: "me" },
  { code: "MED", city: "Medina", name: "Prince Mohammad bin Abdulaziz", country: "Saudi Arabia", lat: 24.55, lon: 39.7, utc: 3, region: "me" },

  { code: "IST", city: "Istanbul", name: "Istanbul Airport", country: "Turkiye", lat: 41.26, lon: 28.74, utc: 3, region: "me" },
  { code: "SAW", city: "Istanbul", name: "Sabiha Gokcen International", country: "Turkiye", lat: 40.9, lon: 29.31, utc: 3, region: "me" },

  { code: "ISB", city: "Islamabad", name: "Islamabad International", country: "Pakistan", lat: 33.55, lon: 72.83, utc: 5, region: "pk" },
  { code: "KHI", city: "Karachi", name: "Jinnah International", country: "Pakistan", lat: 24.91, lon: 67.16, utc: 5, region: "pk" },
  { code: "LHE", city: "Lahore", name: "Allama Iqbal International", country: "Pakistan", lat: 31.52, lon: 74.4, utc: 5, region: "pk" },
];

const AIRPORT_BY_CODE = Object.fromEntries(AIRPORTS.map((a) => [a.code, a]));

// ---------- 2. Airlines -----------------------------------------------------
// Carriers that genuinely serve the airports above. `colour` drives the square
// logo tile on each card; `hubs` are the gateways a carrier operates from,
// which is what keeps an itinerary plausible (a Saudia connection out of RUH,
// an Emirates hop out of DXB, and so on).
const AIRLINES = [
  { code: "EK", name: "Emirates", country: "UAE", colour: "#d71921", hubs: ["DXB"], fleet: ["Boeing 777-300ER", "Airbus A380-800", "Boeing 777-8"] },
  { code: "FZ", name: "flydubai", country: "UAE", colour: "#e5007e", hubs: ["DXB"], fleet: ["Boeing 737-800", "Boeing 737 MAX 8"] },
  { code: "QR", name: "Qatar Airways", country: "Qatar", colour: "#5c0632", hubs: ["DOH"], fleet: ["Airbus A350-900", "Airbus A330-200", "Boeing 777-300ER"] },
  { code: "SV", name: "Saudia", country: "Saudi Arabia", colour: "#0f8b4c", hubs: ["JED", "RUH", "MED"], fleet: ["Boeing 777-300ER", "Boeing 787-9", "Airbus A320"] },
  { code: "TK", name: "Turkish Airlines", country: "Turkiye", colour: "#c70a0c", hubs: ["IST", "SAW"], fleet: ["Airbus A321", "Boeing 737-800", "Airbus A330-200"] },
  { code: "PC", name: "Pegasus Airlines", country: "Turkiye", colour: "#1a3a8f", hubs: ["SAW", "IST"], fleet: ["Boeing 737-800", "Airbus A320neo"] },
  { code: "PK", name: "PIA", country: "Pakistan", colour: "#1b7a43", hubs: ["KHI", "LHE", "ISB"], fleet: ["Airbus A320", "Boeing 777-300ER", "ATR 72"] },
  { code: "AZ", name: "ITA Airways", country: "Italy", colour: "#004b85", hubs: ["IST"], fleet: ["Airbus A320", "Airbus A321"] },
  { code: "GF", name: "Gulf Air", country: "Bahrain", colour: "#8a1538", hubs: ["DOH", "DXB"], fleet: ["Boeing 787-8", "Airbus A320"] },
];

const AIRLINE_BY_CODE = {};
AIRLINES.forEach((airline) => {
  AIRLINE_BY_CODE[airline.code] = airline;
  if (airline.alias) AIRLINE_BY_CODE[airline.alias] = airline;
});

// ---------- 3. Cabin classes ------------------------------------------------
const CABINS = {
  Economy: {
    key: "economy",
    label: "Economy",
    multiplier: 1,
    cabinBag: "1 × 8 kg",
    checkedBag: "1 × 23 kg",
    seat: "Standard seat included",
    meals: "Meal and snack included",
    seatClass: "Standard",
  },
  Premium: {
    key: "premium",
    label: "Premium Economy",
    multiplier: 1.75,
    cabinBag: "1 × 10 kg",
    checkedBag: "1 × 30 kg",
    seat: "Legroom seat included",
    meals: "Two-course meal included",
    seatClass: "Legroom",
  },
  Business: {
    key: "business",
    label: "Business",
    multiplier: 3.2,
    cabinBag: "2 × 8 kg",
    checkedBag: "2 × 32 kg",
    seat: "Lie-flat seat included",
    meals: "Chef meal and lounge included",
    seatClass: "Lie-flat",
  },
  First: {
    key: "first",
    label: "First Class",
    multiplier: 5.4,
    cabinBag: "2 × 8 kg",
    checkedBag: "2 × 32 kg",
    seat: "Private suite included",
    meals: "Chef meal and lounge included",
    seatClass: "Private suite",
  },
};

// ---------- 4. Geometry and time helpers -----------------------------------

const EARTH_RADIUS_KM = 6371;

function toRadians(value) {
  return (value * Math.PI) / 180;
}

// Great-circle distance in km between two airports
function distanceKm(a, b) {
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Block time in minutes. Cruise at ~840 km/h, plus taxi, climb and descent.
function blockTimeMinutes(a, b) {
  const km = distanceKm(a, b);
  const hours = km / 840 + 0.55;
  const minutes = Math.round(hours * 60 / 5) * 5;
  return Math.max(45, minutes);
}

function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// Duration used for ranking and the "shortest" sort — pure airborne time
function formatDistanceKm(km) {
  return `${Math.round(km).toLocaleString("en-US")} km`;
}

// ---------- 5. Date / time utilities ---------------------------------------
// Dates are handled as UTC-noon Date objects so day arithmetic never drifts
// across a timezone boundary.

function parseISODate(value) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

// "Thu, 15 Oct 2026"
function formatLongDate(date) {
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

// "Thu, 15 Oct 2026" used on journey-leg bars
function formatLegDate(date) {
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

// "15 October 2026" for the page header
function formatHeaderDate(date) {
  return date
    .toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    })
    .toUpperCase();
}

function formatHour(hour) {
  return `${String(hour).padStart(2, "0")}:00`;
}

// Minutes past local midnight -> "HH:MM"
function minutesToClock(minutes) {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// ---------- 5b. Currency ---------------------------------------------------
// Fares, taxes and fees are modelled in EUR because the pricing formula reads
// naturally in a major currency, then converted once at the presentation
// boundary so every figure on the page moves together.
const CURRENCY = {
  code: "PKR",
  symbol: "Rs",
  // Indicative rate. Illustrative fares only — not a live FX quote.
  eurToPkr: 310,
};

function formatPKR(amountInEur) {
  const pkr = Math.round(amountInEur * CURRENCY.eurToPkr);
  return `${CURRENCY.symbol} ${pkr.toLocaleString("en-US")}`;
}

// ---------- 6. Fare packages ----------------------------------------------
// Three illustrative tiers built off the base fare of each itinerary, so the
// prices always add up the way the designs show them.

function buildFarePackages(baseFare, cabin) {
  const tiers = [
    {
      id: "starter",
      name: "Sample Starter",
      uplift: 0,
      cabinBag: cabin.cabinBag,
      checkedBag: "Not included",
      seat: "Assigned at check-in",
      meals: "Buy on board",
      changes: "Not permitted",
      refunds: "Non-refundable; eligible unused taxes only",
    },
    {
      id: "standard",
      name: "Sample Standard",
      uplift: 0.19,
      cabinBag: cabin.cabinBag,
      checkedBag: cabin.checkedBag,
      seat: `${cabin.seatClass} seat included`,
      meals: "Meal or snack included",
      changes: `${formatPKR(35)} per person · fare difference`,
      refunds: "Non-refundable; eligible unused taxes only",
    },
    {
      id: "flex",
      name: "Sample Flex",
      uplift: 0.32,
      cabinBag: cabin.cabinBag,
      checkedBag: cabin.checkedBag,
      seat: `Preferred seat included`,
      meals: "Meal or snack included",
      changes: "No fee; fare difference applies",
      refunds: "Refundable before departure; service fee excluded",
    },
  ];

  return tiers.map((tier) => {
    const uplift = Math.round(baseFare * tier.uplift);
    return {
      ...tier,
      uplift,
      price: baseFare + uplift,
      hasChecked: tier.checkedBag !== "Not included",
      refundable: tier.id === "flex",
      flexible: tier.id === "flex",
      mealsIncluded: tier.meals !== "Buy on board",
    };
  });
}

// ---------- 7. Routing ------------------------------------------------------
// Hubs that carriers genuinely use as connecting points, grouped so a
// connection is plausible for the region pair involved.

// Connection points that make sense for each origin region. Every code here is
// an airport that still exists in AIRPORTS, so a routed connection can never
// point at a city the search cannot reach.
const HUBS = {
  me: ["DXB", "DOH", "RUH", "JED", "IST", "SAW"],
  pk: ["DXB", "DOH", "IST", "RUH", "LHE"],
};

// Carriers that plausibly serve a given connection, keyed by hub. Repeats
// weight the choice, so Emirates dominates out of DXB and Saudia out of RUH.
const CARRIERS_BY_HUB = {
  DXB: ["EK", "EK", "FZ", "QR", "GF"],
  DOH: ["QR", "QR", "QR", "GF"],
  RUH: ["SV", "SV", "EK", "QR"],
  JED: ["SV", "SV", "EK", "QR"],
  MED: ["SV", "SV", "EK"],
  IST: ["TK", "TK", "AZ", "PC"],
  SAW: ["PC", "TK", "TK"],
  ISB: ["PK", "PK", "EK", "QR", "TK"],
  KHI: ["PK", "PK", "EK", "QR"],
  LHE: ["PK", "PK", "EK", "TK"],
};

// ---------- 8. Deterministic pseudo-random ---------------------------------
// Same search -> same itineraries, so results never shuffle on re-render.

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return function random() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickRandom(random, list) {
  return list[Math.floor(random() * list.length)];
}

// ---------- 9. Segment construction ---------------------------------------

const TERMINAL_NAMES = [
  "Terminal 1",
  "Terminal 2",
  "Terminal 3",
  "Pier A",
  "Pier B",
  "North Terminal",
  "South Terminal",
  "Concourse A",
  "Concourse B",
  "Satellite Terminal",
];

// Same-airport, same-terminal layovers read differently from airport changes.
function describeLayover(layoverMinutes, fromAirport, toAirport, fromTerminal, toTerminal, sameCarrier) {
  const airportChange = fromAirport.code !== toAirport.code;
  const terminalChange = airportChange && fromTerminal !== toTerminal;

  if (layoverMinutes >= 1440) {
    const days = Math.floor(layoverMinutes / 1440);
    const hours = Math.round((layoverMinutes % 1440) / 60);
    return {
      kind: "overnight",
      airportChange,
      terminalChange,
      sameCarrier,
      minutes: layoverMinutes,
      label: `Overnight · ${toAirport.city} (${toAirport.code})`,
      duration: `${days}d ${hours}h`,
      detail: `Self transfer on separate tickets. Collect and recheck bags, check airport transfer access and entry requirements. Connection not protected.`,
    };
  }

  if (terminalChange || airportChange) {
    return {
      kind: "airport-change",
      airportChange: true,
      terminalChange,
      sameCarrier,
      minutes: layoverMinutes,
      label: `Self transfer · ${toAirport.city} (${toAirport.code})`,
      duration: formatDuration(layoverMinutes),
      detail: airportChange
        ? `Airport change! Recheck at ${toAirport.name} (${toTerminal}). Bags are not automatically through-checked — confirm with the operating carrier.`
        : `Terminal change at ${toAirport.code}. Allow extra time for security and transfer desks.`,
    };
  }

  return {
    kind: "connection",
    airportChange: false,
    terminalChange: false,
    sameCarrier,
    minutes: layoverMinutes,
    label: `Layover · ${toAirport.city} (${toAirport.code})`,
    duration: formatDuration(layoverMinutes),
    detail: sameCarrier
      ? `Same airport, ${toTerminal}. Bags checked through; no self-transfer.`
      : `Same airport, ${toTerminal}. Bags through-checked on separate tickets; connection may need re-check.`,
  };
}

// Build the flight segments for one journey leg from `origin` to `destination`.
// `departMinutes` is minutes past local midnight on the leg's travel date.
// Times are carried as "minutes past the leg's departure midnight" so that a
// +1 day arrival is just a value past 1440.
function buildLegSegments(origin, destination, departMinutes, seedKey, preferDirect) {
  const random = mulberry32(hashString(seedKey));
  const segments = [];
  const viaList = pickViaAirports(origin, destination, random, preferDirect);

  // The via airports are connection points *inside* the route, not the route
  // itself. A leg is always at least origin -> destination, so a nonstop has
  // a single hop and a two-connection itinerary has three.
  const hops = [...viaList.map((code) => AIRPORT_BY_CODE[code]), destination];

  let cursor = origin;
  let clock = departMinutes;
  // Carried across hops so a connection can stay with one operator
  let previousCarrier = null;

  hops.forEach((target, index) => {
    const carrierCode = pickCarrier(
      cursor,
      target,
      random,
      previousCarrier,
    );
    const airline = AIRLINE_BY_CODE[carrierCode] || AIRLINE_BY_CODE.EK;
    previousCarrier = carrierCode;
    const minutes = blockTimeMinutes(cursor, target);
    const terminalOut = pickRandom(random, TERMINAL_NAMES);
    const terminalIn = pickRandom(random, TERMINAL_NAMES);

    // First departure is the requested time; connections add a little slack
    const departAt = index === 0 ? clock : clock + 5 + Math.floor(random() * 20);
    const arriveAt = departAt + minutes;

    segments.push({
      index: index + 1,
      airline,
      carrier: carrierCode,
      flightNumber: `${carrierCode} ${100 + Math.floor(random() * 899)}`,
      operatedBy: airline.name,
      aircraft: pickRandom(random, airline.fleet),
      cabin: "Economy",
      from: cursor,
      to: target,
      fromTerminal: terminalOut,
      toTerminal: terminalIn,
      departAt,
      arriveAt,
      durationMin: minutes,
      // Calendar-day offsets relative to the leg's own departure date, so the
      // card can render "Departs 15 Oct 2026" and "+1 day" without guessing.
      departDayOffset: Math.floor(departAt / 1440),
      arriveDayOffset: Math.floor(arriveAt / 1440),
    });

    cursor = target;
    clock = arriveAt;
  });

  return segments;
}

// Choose 0, 1 or 2 connection points. Long routes get connections; short ones
// can go nonstop. `preferDirect` biases towards a nonstop first hop.
function pickViaAirports(origin, destination, random, preferDirect) {
  const directKm = distanceKm(origin, destination);
  const sameCountry = origin.country === destination.country;

  const pool = (HUBS[origin.region] || HUBS.me).filter(
    (code) =>
      code !== origin.code &&
      code !== destination.code &&
      AIRPORT_BY_CODE[code] &&
      AIRPORT_BY_CODE[code].country !== origin.country,
  );

  // Only worth connecting when there is no sensible nonstop: same-country
  // hops under ~900 km, or anything short of a normal widebody sector.
  const nonstopReasonable =
    sameCountry ? directKm < 900 : directKm < 2600;

  if (preferDirect || nonstopReasonable) return [];

  // One connection covers most of this market; two only for the longer runs.
  if (directKm >= 4200 && pool.length >= 2 && random() < 0.3) {
    const first = pickRandom(random, pool);
    const second = pickRandom(random, pool.filter((code) => code !== first));
    return [first, second];
  }

  if (random() < 0.4) return pool.length ? [pickRandom(random, pool)] : [];

  return [];

  return pool.length ? [pickRandom(random, pool)] : [];
}

// Pick a carrier that plausibly flies this hop.
//
// A carrier is only eligible if one of its own hubs sits at either end of the
// hop, so PIA can fly ISB → KHI (both Pakistani PIA bases) and Saudia can fly
// RUH → JED, but Pegasus — an Istanbul low-cost carrier — is never picked for
// Karachi → Dubai. `previous` carries the last carrier on this leg so a
// connection can stay with one operator, which is what produces a single
// "EK 241 → EK 715" rather than two unrelated airlines.
function pickCarrier(origin, destination, random, previous) {
  const eligible = AIRLINES.filter(
    (airline) =>
      airline.hubs.includes(origin.code) || airline.hubs.includes(destination.code),
  );

  // Staying with the same operator across a connection is the common case, so
  // it gets a strong weight — but only if that carrier is actually eligible.
  const continuing = eligible.filter((airline) => airline.code === previous);
  if (continuing.length && random() < 0.72) {
    return continuing[0].code;
  }

  // Otherwise weight by the CARRIERS_BY_HUB lists for this hop's two airports,
  // which encode who actually operates out of each gateway.
  const weighted = [];
  [origin.code, destination.code].forEach((code) => {
    (CARRIERS_BY_HUB[code] || []).forEach((carrier) => {
      if (eligible.some((airline) => airline.code === carrier)) {
        weighted.push(carrier);
      }
    });
  });

  if (weighted.length) return pickRandom(random, weighted);

  // Last resort: a carrier based at the origin, so the operator at least has a
  // presence where the flight begins.
  const fromBase = eligible.filter((airline) => airline.hubs.includes(origin.code));
  if (fromBase.length) return pickRandom(random, fromBase).code;

  return eligible.length ? pickRandom(random, eligible).code : "EK";
}

// ---------- 10. Itinerary assembly ----------------------------------------

// Per-leg base fare in EUR. Distance carries the fare; each extra segment adds
// an amount, and long sectors cost proportionally more.
function baseFareFor(segments) {
  let total = 0;
  segments.forEach((segment, index) => {
    const km = distanceKm(segment.from, segment.to);
    const hop = 19 + km * 0.062 + (km > 6000 ? 22 : 0);
    total += index === 0 ? hop * 0.72 : hop;
  });
  // Long itineraries carry a small premium; very short ones a discount
  const distance = segments.reduce(
    (sum, segment) => sum + distanceKm(segment.from, segment.to),
    0,
  );
  if (distance > 12000) total *= 1.12;
  if (distance < 1200) total *= 0.86;
  return Math.max(35, Math.round(total));
}

function seasonalFactor(date) {
  const month = date.getUTCMonth();
  if (month === 6 || month === 11 || month === 0) return 1.18; // Jul, Dec, Jan
  if (month === 4 || month === 8) return 1.08; // May, Sep
  if (month === 2 || month === 3) return 1.04;
  return 1;
}

// Turn one journey leg into the display shape the cards expect.
function assembleLeg(legIndex, origin, destination, date, departHour, seedKey, preferDirect) {
  const departMinutes = departHour * 60;
  const segments = buildLegSegments(origin, destination, departMinutes, seedKey, preferDirect);
  const first = segments[0];
  const last = segments[segments.length - 1];

  // Total elapsed time = flight time + every connection
  let totalMinutes = last.arriveAt - first.departAt;

  // Build connection notes between segments
  const connections = [];
  for (let i = 0; i < segments.length - 1; i += 1) {
    const current = segments[i];
    const next = segments[i + 1];
    const layover = next.departAt - current.arriveAt;
    connections.push(
      describeLayover(
        layover,
        current.to,
        next.from,
        current.toTerminal,
        next.fromTerminal,
        current.carrier === next.carrier,
      ),
    );
  }

  const distance = segments.reduce(
    (sum, segment) => sum + distanceKm(segment.from, segment.to),
    0,
  );

  const arrivalDate = addDays(date, Math.floor(last.arriveAt / 1440));

  return {
    legIndex,
    origin,
    destination,
    date,
    dateLabel: formatLegDate(date),
    segments,
    connections,
    stops: segments.length - 1,
    totalMin: totalMinutes,
    departAt: first.departAt,
    arriveAt: last.arriveAt,
    arrivalDate,
    arrivalDateLabel: formatLongDate(arrivalDate),
    distanceKm: distance,
    // Unique carriers on the leg — the headline names every one of them
    carriers: [...new Set(segments.map((segment) => segment.carrier))],
    hasAirportChange: connections.some((connection) => connection.airportChange),
    hasOvernight: connections.some((connection) => connection.kind === "overnight"),
    hasSelfTransfer: connections.some((connection) => !connection.sameCarrier),
  };
}

// Turn a whole itinerary (1, 2 or 3 journey legs) into the display shape.
function assembleItinerary(id, legs, search) {
  const allSegments = legs.flatMap((leg) => leg.segments);
  const firstLeg = legs[0];
  const lastLeg = legs[legs.length - 1];

  const cabin = CABINS[search.cabin] || CABINS.Economy;

  // Fare basis: base fare for the whole trip, scaled by cabin and season
  const rawBase = legs.reduce((sum, leg) => {
    const legBase = baseFareFor(leg.segments);
    // Return hops are usually cheaper than outbound
    return sum + legBase;
  }, 0);
  const seasonFactor = seasonalFactor(firstLeg.date);
  const baseFare = Math.round(
    rawBase * cabin.multiplier * seasonFactor,
  );

  // Taxes and airport charges scale with distance; the service fee is flat
  const totalDistance = legs.reduce((sum, leg) => sum + leg.distanceKm, 0);
  const taxes = Math.round(14 + totalDistance * 0.0042);
  const serviceFee = 8;

  // Package prices are per adult. Multi-segment trips are priced per traveller.
  const packages = buildFarePackages(baseFare, cabin);

  const carriers = [...new Set(allSegments.map((segment) => segment.carrier))];

  const tags = [];
  const stopsAll = legs.reduce((sum, leg) => sum + leg.stops, 0);
  if (stopsAll === 0) tags.push("Nonstop");
  if (legs.some((leg) => leg.hasOvernight)) tags.push("Overnight");
  if (legs.some((leg) => leg.hasAirportChange)) tags.push("Airport change");
  if (legs.some((leg) => leg.hasSelfTransfer)) tags.push("Self transfer");

  return {
    id,
    kind: search.tripType,
    legs,
    packages,
    carriers,
    segments: allSegments,
    stops: stopsAll,
    totalMin: legs.reduce((sum, leg) => sum + leg.totalMin, 0),
    departAt: firstLeg.departAt,
    arriveAt: lastLeg.arriveAt,
    firstDepart: firstLeg.date,
    firstDepartMinutes: firstLeg.departAt,
    price: packages[1].price + taxes + serviceFee,
    baseFare,
    taxes,
    serviceFee,
    cabin,
    tags,
    // Convenience flags used by the filter panel
    includesCabinBag: true,
    checkedBag: packages[1].hasChecked,
    overnight: legs.some((leg) => leg.hasOvernight),
    airportChange: legs.some((leg) => leg.hasAirportChange),
    selfTransfer: legs.some((leg) => leg.hasSelfTransfer),
    routeLabel: legs
      .map((leg) => leg.destination.city)
      .join(" → "),
  };
}

// ---------- 11. Public generator -------------------------------------------

// Departure hours spread across the day so the departure-time filter has
// something meaningful to bite on.
const DEPART_HOURS = [6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19, 20, 21];

// How many itineraries to show per trip type. Kept small so every result is
// visible without paging through a long list.
const ITINERARY_COUNTS = { oneway: 5, roundtrip: 5, multicity: 5 };

/**
 * Build the full result set for a search.
 * search = {
 *   tripType: "oneway" | "roundtrip" | "multicity",
 *   from: { code, city }, to: { code, city },
 *   legs: [{ from, to, date }],   // already normalised to 1..N journey legs
 *   passengers: { adults, children, infants },
 *   cabin: "Economy" | ...
 * }
 */
function generateItineraries(search) {
  const totalPax = search.passengers.adults + search.passengers.children + search.passengers.infants;
  const seedBase = `${search.tripType}|${search.legs
    .map((leg) => `${leg.from.code}-${leg.to.code}-${leg.date.toISOString().slice(0, 10)}`)
    .join(",")}|${search.cabin}|${totalPax}`;

  const target = ITINERARY_COUNTS[search.tripType] || 18;
  const itineraries = [];

  for (let index = 0; index < target; index += 1) {
    const seed = `${seedBase}|#${index}`;
    const random = mulberry32(hashString(seed));

    // First 3 itineraries showcase a nonstop and a fast connection
    const preferDirect = index < 3;
    const hourOffset = (index * 3 + Math.floor(random() * 2)) % DEPART_HOURS.length;

    const legs = search.legs.map((legSpec, legPosition) => {
      const origin = AIRPORT_BY_CODE[legSpec.from.code];
      const destination = AIRPORT_BY_CODE[legSpec.to.code];
      const hour =
        legPosition === 0
          ? DEPART_HOURS[hourOffset]
          : DEPART_HOURS[(hourOffset + 3 + legPosition) % DEPART_HOURS.length];
      return assembleLeg(
        legPosition + 1,
        origin,
        destination,
        legSpec.date,
        hour,
        `${seed}|leg${legPosition}`,
        preferDirect && legPosition === 0,
      );
    });

    itineraries.push(assembleItinerary(`it-${index}`, legs, search));
  }

  // Recommended first: balance price, travel time and connections
  itineraries.sort((a, b) => {
    const scoreA = a.price / 100 + a.totalMin / 60 + a.stops * 40;
    const scoreB = b.price / 100 + b.totalMin / 60 + b.stops * 40;
    return scoreA - scoreB;
  });

  return itineraries;
}

// Normalise the widget's inputs into the shape `generateItineraries` expects.
function buildSearch(options) {
  const tripType = options.tripType || "oneway";
  const cabin = CABINS[options.cabin] ? options.cabin : "Economy";
  const passengers = {
    adults: Math.max(1, options.adults || 1),
    children: Math.max(0, options.children || 0),
    infants: Math.max(0, options.infants || 0),
  };

  const legs = [];

  if (tripType === "multicity") {
    (options.multiLegs || []).forEach((spec) => {
      if (!spec.from || !spec.to || !spec.date) return;
      legs.push({
        from: AIRPORT_BY_CODE[spec.from],
        to: AIRPORT_BY_CODE[spec.to],
        date: parseISODate(spec.date),
      });
    });
  } else if (tripType === "roundtrip") {
    legs.push({
      from: AIRPORT_BY_CODE[options.from],
      to: AIRPORT_BY_CODE[options.to],
      date: parseISODate(options.departure),
    });
    legs.push({
      from: AIRPORT_BY_CODE[options.to],
      to: AIRPORT_BY_CODE[options.from],
      date: parseISODate(options.return),
    });
  } else {
    legs.push({
      from: AIRPORT_BY_CODE[options.from],
      to: AIRPORT_BY_CODE[options.to],
      date: parseISODate(options.departure),
    });
  }

  const cleanLegs = legs.filter((leg) => leg.from && leg.to && leg.date);

  return {
    tripType,
    cabin,
    passengers,
    legs: cleanLegs,
  };
}

const FlightData = {
  AIRPORTS,
  AIRPORT_BY_CODE,
  AIRLINES,
  AIRLINE_BY_CODE,
  CABINS,
  HUBS,
  searchAirports(query) {
    const needle = (query || "").trim().toLowerCase();
    const pool = AIRPORTS.filter((airport) => {
      if (!needle) return true;
      return `${airport.code} ${airport.city} ${airport.name} ${airport.country}`
        .toLowerCase()
        .includes(needle);
    });

    // Group by city so multi-airport cities collapse to one row per name
    return pool.slice(0, 60).map((airport) => ({
      code: airport.code,
      city: airport.city,
      name: airport.name,
      country: airport.country,
      region: airport.region,
    }));
  },
  buildSearch,
  generateItineraries,
  blockTimeMinutes,
  distanceKm,
  formatDuration,
  formatLongDate,
  formatHeaderDate,
  parseISODate,
  toISODate,
  addDays,
  minutesToClock,
  formatHour,
  CURRENCY,
  formatPKR,
  CABIN_KEYS: Object.keys(CABINS),
};