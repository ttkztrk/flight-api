const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

const SERPAPI_KEY = process.env.SERPAPI_KEY;
const SERPAPI_BASE = "https://serpapi.com/search.json";

// Airlines known to run student-fare campaigns (extend as needed).
// Google Flights never returns the real student PRICE - THY's student
// campaign requires their own membership/verification - so we only
// attach an informational note, never a fake price.
const STUDENT_FARE_AIRLINES = {
  "Turkish Airlines": "THY öğrenci indirimi olabilir (Gençlik/Öğrenci Kampanyası). Gerçek fiyat için turkishairlines.com üzerinden üye girişi gerekir.",
};

function pad(n) {
  return String(n).padStart(2, "0");
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

// Pick `count` evenly spaced departure dates across the given month,
// instead of querying every single day (keeps us well inside SerpApi's
// free 250 searches/month).
function sampleDatesInMonth(month, count) {
  const [year, mon] = month.split("-").map(Number);
  const lastDay = new Date(year, mon, 0).getDate();
  const step = Math.max(1, Math.floor(lastDay / count));
  const dates = [];
  for (let day = 1; day <= lastDay && dates.length < count; day += step) {
    dates.push(`${year}-${pad(mon)}-${pad(day)}`);
  }
  return dates;
}

async function searchOneDate({ origin, destination, date, returnDate }) {
  if (!SERPAPI_KEY) {
    throw new Error("SERPAPI_KEY env değişkeni tanımlı değil.");
  }
  const url = new URL(SERPAPI_BASE);
  url.searchParams.set("engine", "google_flights");
  url.searchParams.set("departure_id", origin);
  url.searchParams.set("arrival_id", destination);
  url.searchParams.set("outbound_date", date);
  if (returnDate) {
    url.searchParams.set("return_date", returnDate);
    url.searchParams.set("type", "1"); // roundtrip
  } else {
    url.searchParams.set("type", "2"); // oneway
  }
  url.searchParams.set("currency", "EUR");
  url.searchParams.set("hl", "tr");
  url.searchParams.set("api_key", SERPAPI_KEY);

  const res = await fetch(url);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`SerpApi hatası: ${res.status} ${errText}`);
  }
  const data = await res.json();
  if (data.error) {
    throw new Error(`SerpApi hatası: ${data.error}`);
  }

  const allGroups = [...(data.best_flights || []), ...(data.other_flights || [])];

  return allGroups.map((group) => {
    const firstLeg = group.flights[0];
    const airlineNames = [...new Set(group.flights.map((f) => f.airline))];
    const primaryAirline = firstLeg.airline;

    const studentNote = STUDENT_FARE_AIRLINES[primaryAirline] || null;
    const searchLink = `https://www.google.com/travel/flights?q=${encodeURIComponent(
      `flights from ${origin} to ${destination} on ${date}${returnDate ? " return " + returnDate : ""}`
    )}`;

    return {
      price: group.price,
      currency: "EUR",
      from: origin,
      to: destination,
      departureDate: date,
      returnDate: returnDate || null,
      airline: primaryAirline,
      allAirlines: airlineNames,
      stops: group.flights.length - 1,
      totalDurationMinutes: group.total_duration,
      studentFareNote: studentNote,
      // passengerType is informational only - this is always the standard
      // (non-discounted) fare; "student_possible" just flags that a
      // cheaper student fare *might* exist directly with the airline.
      passengerType: studentNote ? "student_possible" : "standard",
      link: searchLink,
    };
  });
}

app.get("/", (req, res) => {
  res.json({
    message: "Flight API is running (SerpApi / Google Flights)",
    example: "/flights?origin=DUS&destination=IST&month=2026-08&tripLength=14&samples=5",
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Give an origin airport + a month, get back the cheapest date found
// (sampled across the month) plus multiple real airline options for it.
app.get("/flights", async (req, res) => {
  const originRaw = req.query.from || req.query.origin;
  const destinationRaw = req.query.to || req.query.destination;
  const origin = originRaw ? String(originRaw).toUpperCase() : null;
  const destination = destinationRaw ? String(destinationRaw).toUpperCase() : null;
  const month = req.query.month || null; // format: YYYY-MM
  // roundtrip=true (or tripLength=<days>) -> real roundtrip search. Omit for oneway.
  const tripLength = req.query.tripLength
    ? Number(req.query.tripLength)
    : req.query.roundtrip === "true"
    ? 14
    : null;
  const samples = req.query.samples ? Math.min(Number(req.query.samples), 10) : 5;

  if (!origin || !destination || !month) {
    return res.status(400).json({
      error: "from/to (veya origin/destination) ve month (YYYY-MM) parametreleri zorunlu.",
      example: "/flights?from=DUS&to=IST&month=2026-08&roundtrip=true",
    });
  }

  try {
    const candidateDates = sampleDatesInMonth(month, samples);
    let bestResults = [];
    let bestPrice = Infinity;
    let bestDate = null;

    for (const date of candidateDates) {
      const returnDate = tripLength ? addDays(date, tripLength) : null;
      const results = await searchOneDate({ origin, destination, date, returnDate });
      if (results.length === 0) continue;
      const cheapestOnThisDate = Math.min(...results.map((r) => r.price));
      if (cheapestOnThisDate < bestPrice) {
        bestPrice = cheapestOnThisDate;
        bestDate = date;
        bestResults = results;
      }
    }

    if (!bestDate) {
      return res.json({
        search: { origin, destination, month },
        count: 0,
        results: [],
        note: "Bu ay için sonuç bulunamadı. Rota/tarih kombinasyonunu kontrol edin.",
      });
    }

    res.json({
      search: {
        origin,
        destination,
        month,
        sampledDates: candidateDates,
        cheapestDateFound: bestDate,
      },
      count: bestResults.length,
      results: bestResults.sort((a, b) => a.price - b.price),
    });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});
