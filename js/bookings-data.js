const BOOKINGS = [
  {
    ref: "SM-482913",
    status: "upcoming", // upcoming | completed | cancelled
    bookedOn: "2026-08-21",
    airline: "Emirates",
    airlineCode: "EK",
    flightNo: "EK 553",
    from: { code: "KHI", city: "Karachi", country: "Pakistan" },
    to: { code: "DXB", city: "Dubai", country: "UAE" },
    departDate: "2026-10-18",
    departTime: "17:15",
    arriveTime: "19:05",
    duration: "2h 20m",
    stops: "Non-stop",
    cabin: "Economy",
    fare: "PKR 84,500",
    fareNote: "1 adult · Taxes included",
    progress: 2, // step index: 1 booked, 2 ticketed, 3 boarded, 4 flown
    pax: [
      { name: "Ahmed Shah", type: "Adult", seat: "12A" },
      { name: "Sana Shah", type: "Adult", seat: "12B" },
    ],
  },
  {
    ref: "SM-771204",
    status: "upcoming",
    bookedOn: "2026-09-02",
    airline: "Saudi Arabian Airlines",
    airlineCode: "SV",
    flightNo: "SV 741",
    from: { code: "LHE", city: "Lahore", country: "Pakistan" },
    to: { code: "JED", city: "Jeddah", country: "Saudi Arabia" },
    departDate: "2026-10-27",
    departTime: "09:40",
    arriveTime: "13:10",
    duration: "5h 30m",
    stops: "Non-stop",
    cabin: "Economy",
    fare: "PKR 132,000",
    fareNote: "2 adults · Taxes included",
    progress: 2,
    pax: [
      { name: "Ahmed Shah", type: "Adult", seat: "22C" },
      { name: "Sana Shah", type: "Adult", seat: "22D" },
      { name: "Bilal Shah", type: "Child", seat: "22E" },
    ],
  },
  {
    ref: "SM-305668",
    status: "upcoming",
    bookedOn: "2026-09-14",
    airline: "Turkish Airlines",
    airlineCode: "TK",
    flightNo: "TK 616",
    from: { code: "ISB", city: "Islamabad", country: "Pakistan" },
    to: { code: "IST", city: "Istanbul", country: "Türkiye" },
    departDate: "2026-11-09",
    departTime: "21:25",
    arriveTime: "23:55",
    duration: "6h 30m",
    stops: "1 stop · 1h 20m layover",
    cabin: "Business",
    fare: "PKR 268,400",
    fareNote: "1 adult · Taxes included",
    progress: 1,
    pax: [{ name: "Ahmed Shah", type: "Adult", seat: "4F" }],
  },
  {
    ref: "SM-640117",
    status: "completed",
    bookedOn: "2026-06-11",
    airline: "Qatar Airways",
    airlineCode: "QR",
    flightNo: "QR 617",
    from: { code: "KHI", city: "Karachi", country: "Pakistan" },
    to: { code: "DOH", city: "Doha", country: "Qatar" },
    departDate: "2026-07-04",
    departTime: "22:45",
    arriveTime: "01:10",
    duration: "3h 25m",
    stops: "Non-stop",
    cabin: "Economy",
    fare: "PKR 96,750",
    fareNote: "1 adult · Taxes included",
    progress: 4,
    pax: [{ name: "Ahmed Shah", type: "Adult", seat: "8D" }],
  },
  {
    ref: "SM-118530",
    status: "completed",
    bookedOn: "2026-05-28",
    airline: "British Airways",
    airlineCode: "BA",
    flightNo: "BA 117",
    from: { code: "LHE", city: "Lahore", country: "Pakistan" },
    to: { code: "LHR", city: "London", country: "United Kingdom" },
    departDate: "2026-06-15",
    departTime: "02:30",
    arriveTime: "07:15",
    duration: "8h 45m",
    stops: "1 stop · 1h 05m layover",
    cabin: "Economy",
    fare: "PKR 178,300",
    fareNote: "2 adults · Taxes included",
    progress: 4,
    pax: [
      { name: "Ahmed Shah", type: "Adult", seat: "31A" },
      { name: "Sana Shah", type: "Adult", seat: "31B" },
    ],
  },
  {
    ref: "SM-924376",
    status: "cancelled",
    bookedOn: "2026-08-30",
    airline: "FlyDubai",
    airlineCode: "FZ",
    flightNo: "FZ 325",
    from: { code: "KHI", city: "Karachi", country: "Pakistan" },
    to: { code: "SHJ", city: "Sharjah", country: "UAE" },
    departDate: "2026-09-22",
    departTime: "06:50",
    arriveTime: "08:55",
    duration: "2h 05m",
    stops: "Non-stop",
    cabin: "Economy",
    fare: "PKR 61,200",
    fareNote: "Refunded PKR 55,080",
    progress: 0,
    pax: [{ name: "Ahmed Shah", type: "Adult", seat: "—" }],
  },
];

/* Cancelled bookings live here too, so a cancellation survives a reload. */
const BOOKING_OVERRIDES_KEY = "sm_booking_overrides";

function readOverrides() {
  try {
    return JSON.parse(localStorage.getItem(BOOKING_OVERRIDES_KEY) || "{}");
  } catch (err) {
    return {};
  }
}

function writeOverrides(overrides) {
  try {
    localStorage.setItem(BOOKING_OVERRIDES_KEY, JSON.stringify(overrides));
  } catch (err) {
    /* private browsing — overrides simply don't persist */
  }
}

/* Returns BOOKINGS with any locally saved status changes merged in. */
function getBookings() {
  const overrides = readOverrides();
  return BOOKINGS.map((b) => Object.assign({}, b, overrides[b.ref] || {}));
}

function setBookingStatus(ref, patch) {
  const overrides = readOverrides();
  overrides[ref] = Object.assign({}, overrides[ref], patch);
  writeOverrides(overrides);
}
