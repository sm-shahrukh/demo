// ============================================================
// FLIGHT DATA  (sample data - replace with your real API/database)
// Each flight is one object. Segments = the individual legs of the trip.
// ============================================================

const ROUTE = { from: 'ISB', to: 'DXB' };

const flights = [
  {
    id: 'pa210',
    code: 'PA',                       // 2-letter airline code (used for filter + logo colour)
    airline: 'Airblue',
    number: 'PA 210',
    departs: '07:10',
    arrives: '09:55',
    duration: '3h 45m',
    durationMin: 225,                // used for "Fastest" sorting
    stops: 0,
    stopsText: 'Nonstop',
    price: 58500,
    badge: { text: 'Best value', color: 'green' },   // color: blue | green | amber
    fare: 'Economy Light',
    baggage: '1 cabin bag · 7 kg',
    cabinBag: true,
    checkedBag: false,
    co2: '148 kg CO₂e',
    segments: [
      { departTime: '07:10', fromCity: 'Islamabad International', fromInfo: 'ISB',
        arriveTime: '09:55', toCity: 'Dubai International', toInfo: 'DXB · Terminal 2',
        flightNumber: 'PA 210', aircraft: 'Airbus A320', duration: '3h 45m' }
    ]
  },
  {
    id: 'pk211',
    code: 'PK',
    airline: 'PIA',
    number: 'PK 211',
    departs: '09:30',
    arrives: '12:20',
    duration: '3h 50m',
    durationMin: 230,
    stops: 0,
    stopsText: 'Nonstop',
    price: 54900,
    badge: { text: 'Lowest fare', color: 'blue' },
    fare: 'Economy',
    baggage: 'Checked bag included',
    cabinBag: true,
    checkedBag: true,
    co2: '151 kg CO₂e',
    open: true,                      // this card starts expanded
    onTime: '87% on-time arrival',
    includes: [                      // shown in the "fare includes" box
      { text: 'Checked bag 20 kg', yes: true },
      { text: 'Meal on board', yes: true },
      { text: 'Seat selection', yes: false }
    ],
    segments: [
      { departTime: '09:30', fromCity: 'Islamabad International', fromInfo: 'ISB',
        arriveTime: '12:20', toCity: 'Dubai International', toInfo: 'DXB · Terminal 1',
        flightNumber: 'PK 211', aircraft: 'Boeing 777', duration: '3h 50m' }
    ]
  },
  {
    id: 'fz332',
    code: 'FZ',
    airline: 'flydubai',
    number: 'FZ 332',
    departs: '12:45',
    arrives: '15:30',
    duration: '3h 45m',
    durationMin: 225,
    stops: 0,
    stopsText: 'Nonstop',
    price: 61200,
    fare: 'Standard',
    baggage: '1 cabin bag · 10 kg',
    cabinBag: true,
    checkedBag: false,
    co2: '146 kg CO₂e',
    segments: [
      { departTime: '12:45', fromCity: 'Islamabad International', fromInfo: 'ISB',
        arriveTime: '15:30', toCity: 'Dubai International', toInfo: 'DXB · Terminal 2',
        flightNumber: 'FZ 332', aircraft: 'Boeing 737 MAX 8', duration: '3h 45m' }
    ]
  },
  {
    id: 'ek613',
    code: 'EK',
    airline: 'Emirates',
    number: 'EK 613',
    departs: '15:30',
    arrives: '18:20',
    duration: '3h 50m',
    durationMin: 230,
    stops: 0,
    stopsText: 'Nonstop',
    price: 79800,
    badge: { text: 'Flexible', color: 'amber' },
    fare: 'Economy Flex',
    baggage: 'Cabin + checked bag',
    cabinBag: true,
    checkedBag: true,
    co2: '149 kg CO₂e',
    segments: [
      { departTime: '15:30', fromCity: 'Islamabad International', fromInfo: 'ISB',
        arriveTime: '18:20', toCity: 'Dubai International', toInfo: 'DXB · Terminal 3',
        flightNumber: 'EK 613', aircraft: 'Boeing 777-300ER', duration: '3h 50m' }
    ]
  },
  {
    id: 'qr633',
    code: 'QR',
    airline: 'Qatar Airways',
    number: 'QR 633 · QR 1058',
    departs: '18:10',
    arrives: '23:55',
    duration: '6h 45m',
    durationMin: 405,
    stops: 1,
    stopsText: '1 stop · DOH',
    price: 67400,
    fare: 'Economy',
    baggage: '1 cabin bag · 7 kg',
    cabinBag: true,
    checkedBag: false,
    co2: '212 kg CO₂e',
    segments: [
      { departTime: '18:10', fromCity: 'Islamabad International', fromInfo: 'ISB',
        arriveTime: '19:25', toCity: 'Doha Hamad International', toInfo: 'DOH',
        flightNumber: 'QR 633', aircraft: 'Airbus A320', duration: '3h 15m',
        noteAfter: '2h 05m layover in Doha' },
      { departTime: '21:30', fromCity: 'Doha Hamad International', fromInfo: 'DOH',
        arriveTime: '23:55', toCity: 'Dubai International', toInfo: 'DXB · Terminal 1',
        flightNumber: 'QR 1058', aircraft: 'Airbus A320', duration: '1h 25m' }
    ]
  }
];
