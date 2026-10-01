/* ============================================================================
   flight-data.js — reference data + itinerary generator
   Real airports (IATA, city, country, lat/lon, UTC offset) and real airlines.
   Itineraries are generated deterministically from the search conditions, so
   every combination the user picks produces a coherent set of flights.
   ========================================================================== */

// ---------- 1. Airports -----------------------------------------------------
// utc = standard UTC offset in hours (fractional where zones are half/quarter)
const AIRPORTS = [
  { code: "CDG", city: "Paris", name: "Charles de Gaulle", country: "France", lat: 49.01, lon: 2.55, utc: 1, region: "eu" },
  { code: "ORY", city: "Paris", name: "Orly", country: "France", lat: 48.72, lon: 2.38, utc: 1, region: "eu" },
  { code: "BCN", city: "Barcelona", name: "El Prat", country: "Spain", lat: 41.3, lon: 2.08, utc: 1, region: "eu" },
  { code: "MAD", city: "Madrid", name: "Barajas", country: "Spain", lat: 40.47, lon: -3.56, utc: 1, region: "eu" },
  { code: "LIS", city: "Lisbon", name: "Humberto Delgado", country: "Portugal", lat: 38.77, lon: -9.13, utc: 0, region: "eu" },
  { code: "OPO", city: "Porto", name: "Francisco Sá Carneiro", country: "Portugal", lat: 41.24, lon: -8.68, utc: 0, region: "eu" },
  { code: "FCO", city: "Rome", name: "Fiumicino", country: "Italy", lat: 41.8, lon: 12.25, utc: 1, region: "eu" },
  { code: "MXP", city: "Milan", name: "Malpensa", country: "Italy", lat: 45.63, lon: 8.72, utc: 1, region: "eu" },
  { code: "LIN", city: "Milan", name: "Linate", country: "Italy", lat: 45.45, lon: 9.28, utc: 1, region: "eu" },
  { code: "VCE", city: "Venice", name: "Marco Polo", country: "Italy", lat: 45.51, lon: 12.35, utc: 1, region: "eu" },
  { code: "NAP", city: "Naples", name: "Capodichino", country: "Italy", lat: 40.88, lon: 14.29, utc: 1, region: "eu" },
  { code: "FRA", city: "Frankfurt", name: "Frankfurt am Main", country: "Germany", lat: 50.03, lon: 8.56, utc: 1, region: "eu" },
  { code: "MUC", city: "Munich", name: "Franz Josef Strauss", country: "Germany", lat: 48.35, lon: 11.79, utc: 1, region: "eu" },
  { code: "BER", city: "Berlin", name: "Brandenburg", country: "Germany", lat: 52.36, lon: 13.5, utc: 1, region: "eu" },
  { code: "DUS", city: "Dusseldorf", name: "Dusseldorf International", country: "Germany", lat: 51.29, lon: 6.77, utc: 1, region: "eu" },
  { code: "AMS", city: "Amsterdam", name: "Schiphol", country: "Netherlands", lat: 52.31, lon: 4.76, utc: 1, region: "eu" },
  { code: "BRU", city: "Brussels", name: "Zaventem", country: "Belgium", lat: 50.9, lon: 4.48, utc: 1, region: "eu" },
  { code: "LUX", city: "Luxembourg", name: "Findel", country: "Luxembourg", lat: 49.62, lon: 6.21, utc: 1, region: "eu" },
  { code: "ZRH", city: "Zurich", name: "Kloten", country: "Switzerland", lat: 47.46, lon: 8.55, utc: 1, region: "eu" },
  { code: "GVA", city: "Geneva", name: "Cointrin", country: "Switzerland", lat: 46.24, lon: 6.11, utc: 1, region: "eu" },
  { code: "VIE", city: "Vienna", name: "Schwechat", country: "Austria", lat: 48.11, lon: 16.57, utc: 1, region: "eu" },
  { code: "PRG", city: "Prague", name: "Vaclav Havel", country: "Czechia", lat: 50.1, lon: 14.26, utc: 1, region: "eu" },
  { code: "WAW", city: "Warsaw", name: "Chopin", country: "Poland", lat: 52.17, lon: 20.97, utc: 1, region: "eu" },
  { code: "CPH", city: "Copenhagen", name: "Kastrup", country: "Denmark", lat: 55.62, lon: 12.65, utc: 1, region: "eu" },
  { code: "ARN", city: "Stockholm", name: "Arlanda", country: "Sweden", lat: 59.65, lon: 17.92, utc: 1, region: "eu" },
  { code: "OSL", city: "Oslo", name: "Gardermoen", country: "Norway", lat: 60.19, lon: 11.1, utc: 1, region: "eu" },
  { code: "HEL", city: "Helsinki", name: "Vantaa", country: "Finland", lat: 60.32, lon: 24.96, utc: 2, region: "eu" },
  { code: "DUB", city: "Dublin", name: "Dublin", country: "Ireland", lat: 53.42, lon: -6.27, utc: 0, region: "eu" },
  { code: "LHR", city: "London", name: "Heathrow", country: "United Kingdom", lat: 51.47, lon: -0.45, utc: 0, region: "eu" },
  { code: "LGW", city: "London", name: "Gatwick", country: "United Kingdom", lat: 51.15, lon: -0.19, utc: 0, region: "eu" },
  { code: "STN", city: "London", name: "Stansted", country: "United Kingdom", lat: 51.89, lon: 0.24, utc: 0, region: "eu" },
  { code: "MAN", city: "Manchester", name: "Manchester", country: "United Kingdom", lat: 53.35, lon: -2.27, utc: 0, region: "eu" },
  { code: "EDI", city: "Edinburgh", name: "Edinburgh", country: "United Kingdom", lat: 55.95, lon: -3.37, utc: 0, region: "eu" },
  { code: "ATH", city: "Athens", name: "Eleftherios Venizelos", country: "Greece", lat: 37.94, lon: 23.95, utc: 2, region: "eu" },
  { code: "IST", city: "Istanbul", name: "Istanbul", country: "Turkiye", lat: 41.26, lon: 28.74, utc: 3, region: "eu" },
  { code: "SAW", city: "Istanbul", name: "Sabiha Gokcen", country: "Turkiye", lat: 40.9, lon: 29.31, utc: 3, region: "eu" },
  { code: "KEF", city: "Reykjavik", name: "Keflavik", country: "Iceland", lat: 63.99, lon: -22.61, utc: 0, region: "eu" },
  { code: "TLL", city: "Tallinn", name: "Lennart Meri", country: "Estonia", lat: 59.41, lon: 24.83, utc: 2, region: "eu" },
  { code: "RIX", city: "Riga", name: "Riga International", country: "Latvia", lat: 56.92, lon: 23.97, utc: 2, region: "eu" },
  { code: "OTP", city: "Bucharest", name: "Henri Coanda", country: "Romania", lat: 44.57, lon: 26.1, utc: 2, region: "eu" },

  { code: "DXB", city: "Dubai", name: "Dubai International", country: "UAE", lat: 25.25, lon: 55.36, utc: 4, region: "me" },
  { code: "AUH", city: "Abu Dhabi", name: "Zayed International", country: "UAE", lat: 24.43, lon: 54.65, utc: 4, region: "me" },
  { code: "DOH", city: "Doha", name: "Hamad International", country: "Qatar", lat: 25.27, lon: 51.61, utc: 3, region: "me" },
  { code: "RUH", city: "Riyadh", name: "King Khalid International", country: "Saudi Arabia", lat: 24.96, lon: 46.7, utc: 3, region: "me" },
  { code: "JED", city: "Jeddah", name: "King Abdulaziz International", country: "Saudi Arabia", lat: 21.68, lon: 39.16, utc: 3, region: "me" },
  { code: "MED", city: "Medina", name: "Prince Mohammad bin Abdulaziz", country: "Saudi Arabia", lat: 24.55, lon: 39.7, utc: 3, region: "me" },
  { code: "KWI", city: "Kuwait City", name: "Kuwait International", country: "Kuwait", lat: 29.23, lon: 47.97, utc: 3, region: "me" },
  { code: "BAH", city: "Manama", name: "Bahrain International", country: "Bahrain", lat: 26.27, lon: 50.63, utc: 3, region: "me" },
  { code: "MCT", city: "Muscat", name: "Muscat International", country: "Oman", lat: 23.59, lon: 58.28, utc: 4, region: "me" },
  { code: "TLV", city: "Tel Aviv", name: "Ben Gurion", country: "Israel", lat: 32.01, lon: 34.89, utc: 2, region: "me" },
  { code: "CAI", city: "Cairo", name: "Cairo International", country: "Egypt", lat: 30.11, lon: 31.41, utc: 2, region: "me" },
  { code: "AMM", city: "Amman", name: "Queen Alia International", country: "Jordan", lat: 31.72, lon: 35.99, utc: 3, region: "me" },

  { code: "ISB", city: "Islamabad", name: "Islamabad International", country: "Pakistan", lat: 33.55, lon: 72.83, utc: 5, region: "as" },
  { code: "KHI", city: "Karachi", name: "Jinnah International", country: "Pakistan", lat: 24.91, lon: 67.16, utc: 5, region: "as" },
  { code: "LHE", city: "Lahore", name: "Allama Iqbal International", country: "Pakistan", lat: 31.52, lon: 74.4, utc: 5, region: "as" },
  { code: "DEL", city: "New Delhi", name: "Indira Gandhi International", country: "India", lat: 28.56, lon: 77.1, utc: 5.5, region: "as" },
  { code: "BOM", city: "Mumbai", name: "Chhatrapati Shivaji Maharaj", country: "India", lat: 19.09, lon: 72.87, utc: 5.5, region: "as" },
  { code: "BLR", city: "Bengaluru", name: "Kempegowda International", country: "India", lat: 13.2, lon: 77.71, utc: 5.5, region: "as" },
  { code: "MAA", city: "Chennai", name: "Chennai International", country: "India", lat: 12.99, lon: 80.17, utc: 5.5, region: "as" },
  { code: "KTM", city: "Kathmandu", name: "Tribhuvan International", country: "Nepal", lat: 27.7, lon: 85.36, utc: 5.75, region: "as" },
  { code: "CMB", city: "Colombo", name: "Bandaranaike International", country: "Sri Lanka", lat: 7.18, lon: 79.88, utc: 5.5, region: "as" },
  { code: "BKK", city: "Bangkok", name: "Suvarnabhumi", country: "Thailand", lat: 13.69, lon: 100.75, utc: 7, region: "as" },
  { code: "SIN", city: "Singapore", name: "Changi", country: "Singapore", lat: 1.36, lon: 103.99, utc: 8, region: "as" },
  { code: "KUL", city: "Kuala Lumpur", name: "Kuala Lumpur International", country: "Malaysia", lat: 2.75, lon: 101.71, utc: 8, region: "as" },
  { code: "CGK", city: "Jakarta", name: "Soekarno-Hatta", country: "Indonesia", lat: -6.13, lon: 106.66, utc: 7, region: "as" },
  { code: "HKG", city: "Hong Kong", name: "Hong Kong International", country: "Hong Kong", lat: 22.31, lon: 113.91, utc: 8, region: "as" },
  { code: "NRT", city: "Tokyo", name: "Narita", country: "Japan", lat: 35.77, lon: 140.39, utc: 9, region: "as" },
  { code: "HND", city: "Tokyo", name: "Haneda", country: "Japan", lat: 35.55, lon: 139.78, utc: 9, region: "as" },
  { code: "ICN", city: "Seoul", name: "Incheon International", country: "South Korea", lat: 37.46, lon: 126.44, utc: 9, region: "as" },

  { code: "JFK", city: "New York", name: "John F. Kennedy International", country: "USA", lat: 40.64, lon: -73.78, utc: -5, region: "af" },
  { code: "EWR", city: "New York", name: "Newark Liberty", country: "USA", lat: 40.69, lon: -74.17, utc: -5, region: "af" },
  { code: "BOS", city: "Boston", name: "Logan International", country: "USA", lat: 42.36, lon: -71.01, utc: -5, region: "af" },
  { code: "ORD", city: "Chicago", name: "O'Hare International", country: "USA", lat: 41.98, lon: -87.9, utc: -6, region: "af" },
  { code: "ATL", city: "Atlanta", name: "Hartsfield-Jackson", country: "USA", lat: 33.64, lon: -84.43, utc: -5, region: "af" },
  { code: "MIA", city: "Miami", name: "Miami International", country: "USA", lat: 25.79, lon: -80.29, utc: -5, region: "af" },
  { code: "DFW", city: "Dallas", name: "Dallas/Fort Worth", country: "USA", lat: 32.9, lon: -97.04, utc: -6, region: "af" },
  { code: "LAX", city: "Los Angeles", name: "Los Angeles International", country: "USA", lat: 33.94, lon: -118.41, utc: -8, region: "af" },
  { code: "SFO", city: "San Francisco", name: "San Francisco International", country: "USA", lat: 37.62, lon: -122.38, utc: -8, region: "af" },
  { code: "SEA", city: "Seattle", name: "Seattle-Tacoma", country: "USA", lat: 47.45, lon: -122.31, utc: -8, region: "af" },
  { code: "YYZ", city: "Toronto", name: "Toronto Pearson", country: "Canada", lat: 43.68, lon: -79.63, utc: -5, region: "af" },
  { code: "YVR", city: "Vancouver", name: "Vancouver International", country: "Canada", lat: 49.19, lon: -123.18, utc: -8, region: "af" },
  { code: "MEX", city: "Mexico City", name: "Benito Juarez International", country: "Mexico", lat: 19.44, lon: -99.07, utc: -6, region: "af" },
  { code: "GRU", city: "Sao Paulo", name: "Guarulhos", country: "Brazil", lat: -23.43, lon: -46.47, utc: -3, region: "af" },
  { code: "EZE", city: "Buenos Aires", name: "Ezeiza International", country: "Argentina", lat: -34.82, lon: -58.54, utc: -3, region: "af" },
  { code: "SCL", city: "Santiago", name: "Arturo Merino Benitez", country: "Chile", lat: -33.39, lon: -70.79, utc: -4, region: "af" },
  { code: "BOG", city: "Bogota", name: "El Dorado International", country: "Colombia", lat: 4.7, lon: -74.15, utc: -5, region: "af" },

  { code: "SYD", city: "Sydney", name: "Kingsford Smith", country: "Australia", lat: -33.94, lon: 151.18, utc: 10, region: "oc" },
  { code: "MEL", city: "Melbourne", name: "Tullamarine", country: "Australia", lat: -37.67, lon: 144.84, utc: 10, region: "oc" },
  { code: "BNE", city: "Brisbane", name: "Brisbane International", country: "Australia", lat: -27.38, lon: 153.12, utc: 10, region: "oc" },
  { code: "AKL", city: "Auckland", name: "Auckland International", country: "New Zealand", lat: -37.01, lon: 174.79, utc: 12, region: "oc" },
];

const AIRPORT_BY_CODE = Object.fromEntries(AIRPORTS.map((a) => [a.code, a]));

// ---------- 2. Airlines -----------------------------------------------------
// colour drives the square logo tile on every card
const AIRLINES = [
  { code: "LH", name: "Lufthansa", country: "Germany", colour: "#05164d", hubs: ["FRA", "MUC"], fleet: ["Airbus A320neo", "Airbus A321", "Airbus A330-300", "Boeing 747-8"] },
  { code: "AF", name: "Air France", country: "France", colour: "#002157", hubs: ["CDG"], fleet: ["Airbus A220-300", "Airbus A320", "Airbus A330-200", "Boeing 777-300ER"] },
  { code: "VY", name: "Vueling", country: "Spain", colour: "#ffcc00", dark: true, hubs: ["BCN"], fleet: ["Airbus A320", "Airbus A321", "Airbus A321neo"] },
  { code: "U2", name: "easyJet", country: "United Kingdom", colour: "#ff6600", hubs: ["LGW", "MXP"], fleet: ["Airbus A319", "Airbus A320", "Airbus A320neo", "Airbus A321"] },
  { code: "BA", name: "British Airways", country: "United Kingdom", colour: "#075aaa", hubs: ["LHR", "LGW"], fleet: ["Airbus A320", "Airbus A321neo", "Boeing 777-300ER", "Boeing 787-9"] },
  { code: "KL", name: "KLM", country: "Netherlands", colour: "#00a1de", hubs: ["AMS"], fleet: ["Airbus A220", "Boeing 737-800", "Boeing 777-200"] },
  { code: "IB", name: "Iberia", country: "Spain", colour: "#d7192d", hubs: ["MAD"], fleet: ["Airbus A320", "Airbus A321", "Airbus A350-900"] },
  { code: "TK", name: "Turkish Airlines", country: "Turkiye", colour: "#c70a0c", hubs: ["IST"], fleet: ["Airbus A321", "Boeing 737-800", "Boeing 777-300ER"] },
  { code: "LX", name: "SWISS", country: "Switzerland", colour: "#e60000", hubs: ["ZRH"], fleet: ["Airbus A220-300", "Airbus A320", "Boeing 777-300ER"] },
  { code: "OS", name: "Austrian Airlines", country: "Austria", colour: "#c8102e", hubs: ["VIE"], fleet: ["Airbus A320", "Airbus A321", "Boeing 767-300"] },
  { code: "SN", name: "Brussels Airlines", country: "Belgium", colour: "#c8102e", hubs: ["BRU"], fleet: ["Airbus A319", "Airbus A320", "Airbus A330"] },
  { code: "SK", name: "SAS", country: "Sweden", colour: "#0b2e59", hubs: ["CPH", "ARN"], fleet: ["Airbus A320neo", "Airbus A321neo", "Bombardier CRJ-900"] },
  { code: "AY", name: "Finnair", country: "Finland", colour: "#0b1560", hubs: ["HEL"], fleet: ["Airbus A320", "Airbus A321", "Airbus A350-900"] },
  { code: "LO", name: "LOT Polish Airlines", country: "Poland", colour: "#11397a", hubs: ["WAW"], fleet: ["Boeing 737-800", "Embraer E195"] },
  { code: "FR", name: "Ryanair", country: "Ireland", colour: "#073590", hubs: ["STN", "DUB"], fleet: ["Boeing 737-800", "Boeing 737 MAX 8"] },
  { code: "U2X", name: "easyJet", country: "United Kingdom", colour: "#ff6600", hubs: ["LGW"], fleet: ["Airbus A320"], alias: "U2" },
  { code: "EK", name: "Emirates", country: "UAE", colour: "#d71921", hubs: ["DXB"], fleet: ["Boeing 777-300ER", "Airbus A380-800"] },
  { code: "QR", name: "Qatar Airways", country: "Qatar", colour: "#5c0632", hubs: ["DOH"], fleet: ["Airbus A320", "Airbus A350-900", "Boeing 777-300ER"] },
  { code: "EY", name: "Etihad Airways", country: "UAE", colour: "#bd8b13", hubs: ["AUH"], fleet: ["Airbus A320", "Boeing 787-9"] },
  { code: "TK2", name: "Turkish Airlines", country: "Turkiye", colour: "#c70a0c", hubs: ["IST"], fleet: ["Boeing 737-800"], alias: "TK" },
  { code: "SA", name: "South African Airways", country: "South Africa", colour: "#00539f", hubs: ["JNB"], fleet: ["Airbus A330-300"] },
  { code: "SQ", name: "Singapore Airlines", country: "Singapore", colour: "#f99f1c", hubs: ["SIN"], fleet: ["Airbus A330-300", "Airbus A350-900", "Boeing 787-10"] },
  { code: "MH", name: "Malaysia Airlines", country: "Malaysia", colour: "#1a2b5c", hubs: ["KUL"], fleet: ["Airbus A330-300", "Boeing 737-800"] },
  { code: "AI", name: "Air India", country: "India", colour: "#d5122a", hubs: ["DEL", "BOM"], fleet: ["Airbus A320neo", "Boeing 787-8", "Boeing 777-300ER"] },
  { code: "PK", name: "PIA", country: "Pakistan", colour: "#1b7a43", hubs: ["KHI", "LHE", "ISB"], fleet: ["Airbus A320", "Boeing 777-300ER", "ATR 72"] },
  { code: "UL", name: "SriLankan Airlines", country: "Sri Lanka", colour: "#8a1538", hubs: ["CMB"], fleet: ["Airbus A320", "Airbus A330-300"] },
  { code: "CX", name: "Cathay Pacific", country: "Hong Kong", colour: "#00547e", hubs: ["HKG"], fleet: ["Airbus A350-1000", "Boeing 777-300ER"] },
  { code: "JL", name: "Japan Airlines", country: "Japan", colour: "#c8102e", hubs: ["NRT", "HND"], fleet: ["Airbus A350-900", "Boeing 777-300ER"] },
  { code: "KE", name: "Korean Air", country: "South Korea", colour: "#1a3a6b", hubs: ["ICN"], fleet: ["Airbus A330-300", "Boeing 777-300ER"] },
  { code: "GA", name: "Garuda Indonesia", country: "Indonesia", colour: "#0a4d8c", hubs: ["CGK"], fleet: ["Airbus A330-300", "Boeing 737-800"] },
  { code: "AA", name: "American Airlines", country: "USA", colour: "#0078d2", hubs: ["ORD", "MIA", "DFW"], fleet: ["Airbus A321", "Boeing 737-800", "Boeing 777-300ER"] },
  { code: "DL", name: "Delta Air Lines", country: "USA", colour: "#c8102e", hubs: ["ATL", "JFK", "LAX"], fleet: ["Airbus A320", "Airbus A330-300", "Boeing 767-400ER"] },
  { code: "UA", name: "United Airlines", country: "USA", colour: "#1d3d6e", hubs: ["EWR", "ORD", "SFO"], fleet: ["Airbus A320", "Boeing 737 MAX 9", "Boeing 787-10"] },
  { code: "AC", name: "Air Canada", country: "Canada", colour: "#d22630", hubs: ["YYZ"], fleet: ["Airbus A220-300", "Airbus A321", "Boeing 787-8"] },
  { code: "LA", name: "LATAM Airlines", country: "Chile", colour: "#1b0088", hubs: ["SCL", "GRU"], fleet: ["Airbus A320", "Airbus A321", "Boeing 787-9"] },
  { code: "QF", name: "Qantas", country: "Australia", colour: "#e40000", hubs: ["SYD", "MEL", "BNE"], fleet: ["Airbus A330-300", "Boeing 787-9"] },
  { code: "ET", name: "Ethiopian Airlines", country: "Ethiopia", colour: "#6ba539", hubs: ["ADD"], fleet: ["Airbus A350-900", "Boeing 737-800"] },
  { code: "MS", name: "EgyptAir", country: "Egypt", colour: "#004b8d", hubs: ["CAI"], fleet: ["Airbus A220-300", "Boeing 737-800", "Boeing 777-300ER"] },
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

const HUBS = {
  eu: ["FRA", "CDG", "AMS", "LHR", "MAD", "IST", "MUC", "ZRH", "VIE", "BRU"],
  me: ["DXB", "DOH", "IST", "AUH", "RUH", "LHR", "FRA", "AMS"],
  as: ["DOH", "DXB", "IST", "SIN", "BKK", "DEL", "KUL", "AUH", "FRA", "LHR"],
  af: ["JFK", "EWR", "ORD", "ATL", "LHR", "CDG", "AMS", "FRA", "IST", "MAD"],
  oc: ["SIN", "DOH", "DXB", "KUL", "IST", "FRA", "JFK", "LHR"],
};

// Carriers that plausibly serve a given connection, keyed by hub.
const CARRIERS_BY_HUB = {
  FRA: ["LH", "LH", "LH", "LX", "OS", "SN", "KL"],
  MUC: ["LH", "LH", "OS", "SN"],
  CDG: ["AF", "AF", "AF", "KL", "TK", "IB"],
  AMS: ["KL", "KL", "AF", "LH", "TK"],
  LHR: ["BA", "BA", "BA", "IB", "AF", "EK", "SQ", "QR"],
  LGW: ["BA", "U2", "U2", "TK"],
  MAD: ["IB", "IB", "UX", "TK"],
  IST: ["TK", "TK", "TK", "LX", "KL"],
  ZRH: ["LX", "LX", "LH"],
  VIE: ["OS", "OS", "LH"],
  BRU: ["SN", "SN", "LH", "KL"],
  DOH: ["QR", "QR", "QR", "EK"],
  DXB: ["EK", "EK", "EY", "QR"],
  AUH: ["EY", "EY", "EK"],
  RUH: ["SV", "EK", "QR"],
  KWI: ["KU", "EK", "QR"],
  BAH: ["GF", "EK", "QR"],
  MCT: ["OV", "EK"],
  TLV: ["LY", "TK", "LH"],
  CAI: ["MS", "MS", "TK"],
  AMM: ["RJ", "MS", "QR"],
  CPH: ["SK", "SK", "KL"],
  ARN: ["SK", "SK", "KL"],
  HEL: ["AY", "AY", "KL"],
  DUB: ["EI", "EI", "KL"],
  STN: ["FR", "U2"],
  MXP: ["U2", "U2", "AZ"],
  ZAG: ["OU"],
  SIN: ["SQ", "SQ", "MH", "TR", "GA"],
  BKK: ["TG", "SQ", "MH"],
  KUL: ["MH", "MH", "TR", "SQ"],
  CGK: ["GA", "GA", "TR"],
  HKG: ["CX", "CX", "SQ", "MH"],
  NRT: ["JL", "JL", "NH", "CA"],
  HND: ["JL", "NH", "CA"],
  ICN: ["KE", "KE", "OZ"],
  DEL: ["AI", "AI", "6E", "UK"],
  BOM: ["AI", "AI", "UK"],
  BLR: ["AI", "6E"],
  MAA: ["AI", "6E"],
  KTM: ["AI", "BA"],
  CMB: ["UL", "UL", "MH"],
  JFK: ["DL", "AA", "UA", "EK", "QR", "SQ", "KL", "AF", "BA"],
  EWR: ["UA", "UA", "DL"],
  BOS: ["BA", "DL", "AA"],
  ORD: ["UA", "AA", "DL"],
  ATL: ["DL", "DL", "AA"],
  MIA: ["AA", "DL", "UA"],
  DFW: ["AA", "AA", "DL"],
  LAX: ["UA", "AA", "DL", "EK"],
  SFO: ["UA", "UA", "AA"],
  SEA: ["DL", "AA"],
  YYZ: ["AC", "AC", "UA", "DL"],
  YVR: ["AC", "WS"],
  MEX: ["AM", "AA", "DL"],
  GRU: ["LA", "LA", "AR"],
  EZE: ["AR", "LA"],
  SCL: ["LA", "LA", "IB"],
  BOG: ["AV", "LA", "UA"],
  SYD: ["QF", "QF", "SQ", "EK", "QR"],
  MEL: ["QF", "QF", "CX"],
  BNE: ["QF", "QF", "NZ"],
  AKL: ["NZ", "QF"],
  ISB: ["PK", "PK", "TK", "EK"],
  KHI: ["PK", "PK", "EK", "QR"],
  LHE: ["PK", "PK", "BA"],
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

  hops.forEach((target, index) => {
    const isLastHop = index === hops.length - 1;
    const carrierCode = pickCarrier(cursor, target, random, isLastHop);
    const airline = AIRLINE_BY_CODE[carrierCode] || AIRLINE_BY_CODE.AF;
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

  const pool = (HUBS[origin.region] || HUBS.eu).filter(
    (code) =>
      code !== origin.code &&
      code !== destination.code &&
      AIRPORT_BY_CODE[code] &&
      AIRPORT_BY_CODE[code].country !== origin.country,
  );

  if (preferDirect || (sameCountry && directKm < 900 && random() < 0.7)) {
    return [];
  }

  if (directKm < 3200 || random() < 0.35) {
    return pool.length ? [pickRandom(random, pool)] : [];
  }

  if (pool.length >= 2 && random() < 0.25) {
    const first = pickRandom(random, pool);
    const second = pickRandom(random, pool.filter((code) => code !== first));
    return [first, second];
  }

  return pool.length ? [pickRandom(random, pool)] : [];
}

// Pick a carrier that plausibly flies this hop. Falls back to a carrier whose
// hub is the origin or destination so we never show an implausible operator.
function pickCarrier(origin, destination, random, isLastHop) {
  const fromHub = AIRLINES.find((airline) => airline.hubs.includes(origin.code));
  const toHub = AIRLINES.find((airline) => airline.hubs.includes(destination.code));
  const candidates = [];

  if (isLastHop && toHub) candidates.push(toHub.code);
  if (fromHub) candidates.push(fromHub.code);

  const regionalPool = (HUBS[origin.region] || HUBS.eu).map(
    (hub) => (CARRIERS_BY_HUB[hub] || []).find((code) => AIRLINE_BY_CODE[code]),
  );
  candidates.push(...regionalPool.filter(Boolean));

  const viaCarrierPool = Object.values(CARRIERS_BY_HUB).flatMap((list) => list);
  candidates.push(...viaCarrierPool);

  const valid = candidates.filter((code) => AIRLINE_BY_CODE[code]);
  if (!valid.length) return "AF";
  return pickRandom(random, valid);
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

// How many itineraries to show per trip type, matching the designs.
const ITINERARY_COUNTS = { oneway: 24, roundtrip: 18, multicity: 12 };

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