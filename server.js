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

function makeDemoResult(search) {
  const month = search.month || "2026-08";
  const day = search.departureDate || `${month}-10`;
  const from = search.from || "DUS";
  const to = search.to || "NOP";
  const returnDate = search.returnDate || null;
  const tripType = returnDate ? "roundtrip" : "oneway";

  const demoResults = [
    {
      provider: "demo",
      airline: "Lufthansa",
      from,
      to,
      departureDate: day,
      returnDate,
      tripType,
      price: 240,
      currency: "EUR",
      passengerType: "adult",
      note: "Demo result. Real live fares need official/partner API access."
    },
    {
      provider: "demo",
      airline: "Pegasus",
      from,
      to,
      departureDate: day,
      returnDate,
      tripType,
      price: 185,
      currency: "EUR",
      passengerType: "adult",
      note: "Demo result. Real live fares need official/partner API access."
    },
    {
      provider: "demo",
      airline: "SunExpress",
      from,
      to,
      departureDate: day,
      returnDate,
      tripType,
      price: 205,
      currency: "EUR",
      passengerType: "adult",
      note: "Demo result. Real live fares need official/partner API access."
    }
  ];

  if (search.student) {
