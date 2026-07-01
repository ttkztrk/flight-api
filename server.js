const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

const mockFlights = [
  {
    provider: "mock",
    airline: "Lufthansa",
    from: "DUS",
    to: "NOP",
    departureDate: "2026-07-10",
    returnDate: "2026-07-20",
    tripType: "roundtrip",
    price: 240,
    currency: "EUR"
  },
  {
    provider: "mock",
    airline: "Turkish Airlines",
    from: "CGN",
    to: "IST",
    departureDate: "2026-08-05",
    returnDate: null,
    tripType: "oneway",
    price: 190,
    currency: "EUR"
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
    currency: "EUR"
  }
];

function normalizeSearchParams(query) {
  return {
    from: query.from ? query.from.toUpperCase() : null,
    to: query.to ? query.to.toUpperCase() : null,
    departureDate: query.departureDate || null,
    returnDate: query.returnDate || null,
    startDate: query.startDate || null,
    endDate: query.endDate || null,
    month: query.month || null,
    tripType: query.tripType || null,
    adults: query.adults || "1",
    children: query.children || "0",
    airline: query.airline || null
  };
}

function filterFlights(flights, search) {
  let results = flights;

  if (search.from) {
    results = results.filter((flight) => flight.from === search.from);
  }

  if (search.to) {
    results = results.filter((flight) => flight.to === search.to);
  }

  if (search.departureDate) {
    results = results.filter((flight) => flight.departureDate === search.departureDate);
  }

  if (search.returnDate) {
    results = results.filter((flight) => flight.returnDate === search.returnDate);
  }

  if (search.startDate) {
    results = results.filter((flight) => flight.departureDate >= search.startDate);
  }

  if (search.endDate) {
    results = results.filter((flight) => flight.departureDate <= search.endDate);
  }

  if (search.month) {
    results = results.filter((flight) => flight.departureDate.startsWith(search.month));
  }

  if (search.tripType) {
    results = results.filter((flight) => flight.tripType === search.tripType);
  }

  if (search.airline) {
    results = results.filter((flight) =>
      flight.airline.toLowerCase().includes(search.airline.toLowerCase())
    );
  }

  return results;
}

async function searchMockProvider(search) {
  return {
    provider: "mock",
    status: "ok",
    results: filterFlights(mockFlights, search),
    warning: null
  };
}

async function searchSkyscannerProvider() {
  const apiKey = process.env.SKYSCANNER_API_KEY;

  if (!apiKey) {
    return {
      provider: "skyscanner",
      status: "not_configured",
      results: [],
      warning: "Skyscanner official API key is not configured. Website scraping is not used."
    };
  }

  return {
    provider: "skyscanner",
    status: "todo",
    results: [],
    warning: "Skyscanner official API integration will be added after API access is available."
  };
}

async function searchOfficialAirlineProviders() {
  return {
    provider: "official_airlines",
    status: "todo",
    results: [],
    warning: "Official airline or partner APIs can be connected here. Website scraping is not used."
  };
}

app.get("/", (req, res) => {
  res.json({
    message: "Flight API is running",
    example: "/flights?from=DUS&to=NOP&departureDate=2026-07-10"
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/flights", async (req, res) => {
  const search = normalizeSearchParams(req.query);

  const providerResponses = await Promise.all([
    searchMockProvider(search),
    searchSkyscannerProvider(search),
    searchOfficialAirlineProviders(search)
  ]);

  const results = providerResponses.flatMap((provider) => provider.results);
  const warnings = providerResponses
    .filter((provider) => provider.warning)
    .map((provider) => ({
      provider: provider.provider,
      warning: provider.warning
    }));

  res.json({
    search,
    count: results.length,
    results,
    warnings
  });
});

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});
