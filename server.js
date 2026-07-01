const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

function isTrue(value) {
  return ["1", "true", "yes", "evet"].includes(String(value || "").toLowerCase());
}

const flights = [
  {
    provider: "mock",
    airline: "Lufthansa",
    from: "DUS",
    to: "NOP",
    departureDate: "2026-07-10",
    returnDate: "2026-07-20",
    tripType: "roundtrip",
    price: 240,
    currency: "EUR",
    passengerType: "adult"
  },
  {
    provider: "mock",
    airline: "Turkish Airlines",
    from: "DUS",
    to: "NOP",
    departureDate: "2026-07-10",
    returnDate: "2026-07-20",
    tripType: "roundtrip",
    price: 215,
    currency: "EUR",
    passengerType: "student",
    note: "Student fare example. Real THY student prices require official account/API access."
  },
  {
    provider: "mock",
    airline: "SunExpress",
    from: "DUS",
    to: "AYT",
    departureDate: "2026-08-01",
    returnDate: "2026-08-14",
    tripType: "roundtrip",
    price: 160,
    currency: "EUR",
    passengerType: "adult"
  }
];

app.get("/", (req, res) => {
  res.json({
    message: "Flight API is running",
    example: "/flights?from=DUS&to=NOP&departureDate=2026-07-10&student=true"
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/flights", (req, res) => {
  const search = {
    from: req.query.from ? String(req.query.from).toUpperCase() : null,
    to: req.query.to ? String(req.query.to).toUpperCase() : null,
    departureDate: req.query.departureDate || null,
    returnDate: req.query.returnDate || null,
    month: req.query.month || null,
    tripType: req.query.tripType || null,
    student: isTrue(req.query.student),
    adults: req.query.adults || "1",
    children: req.query.children || "0",
    airline: req.query.airline || null
  };

  let results = flights;

  if (search.from) results = results.filter((flight) => flight.from === search.from);
  if (search.to) results = results.filter((flight) => flight.to === search.to);
  if (search.departureDate) results = results.filter((flight) => flight.departureDate === search.departureDate);
  if (search.returnDate) results = results.filter((flight) => flight.returnDate === search.returnDate);
  if (search.month) results = results.filter((flight) => flight.departureDate.startsWith(search.month));
  if (search.tripType) results = results.filter((flight) => flight.tripType === search.tripType);
  if (search.student) results = results.filter((flight) => flight.passengerType === "student");
  if (search.airline) {
    results = results.filter((flight) =>
      flight.airline.toLowerCase().includes(String(search.airline).toLowerCase())
    );
  }

  res.json({
    search,
    count: results.length,
    results,
    warnings: [
      {
        provider: "official_airlines",
        warning: "Live airline and THY student fares need official/partner API access. Website scraping is not used."
      }
    ]
  });
});

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});
