/**
 * ╔══════════════════════════════════════════════════════════╗
 *   NIMBUS — Weather API Proxy Server
 *   Node.js + Express
 *
 *   Your OpenWeatherMap API key lives ONLY in .env
 *   The browser never sees it.
 * ╚══════════════════════════════════════════════════════════╝
 */

"use strict";

// ── Load environment variables from .env FIRST ──────────────
require("dotenv").config();

const express  = require("express");
const cors     = require("cors");
const rateLimit = require("express-rate-limit");
const path     = require("path");

// ── Validate that the API key is present ────────────────────
if (!process.env.OPENWEATHER_API_KEY || process.env.OPENWEATHER_API_KEY === "your_api_key_here") {
  console.error("\n❌  Missing API key!");
  console.error("    Open the .env file and set OPENWEATHER_API_KEY=your_real_key\n");
  process.exit(1);
}

const app  = express();
const PORT = process.env.PORT || 3000;

// ── OpenWeatherMap config (server-side only) ─────────────────
const OWM_BASE = "https://api.openweathermap.org/data/2.5/weather";
const API_KEY  = process.env.OPENWEATHER_API_KEY; // never sent to client

// ══════════════════════════════════════════════════════════════
//  MIDDLEWARE
// ══════════════════════════════════════════════════════════════

// 1. CORS — in production, lock this to your actual domain
//    e.g. origin: "https://yourdomain.com"
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || "*",   // set in .env for production
  methods: ["GET"],
}));

// 2. Parse JSON bodies (not strictly needed for GET, good practice)
app.use(express.json());

// 3. Rate limiting — prevents abuse of your proxy & API quota
//    Default: max 60 requests per IP per 15 minutes
const limiter = rateLimit({
  windowMs:          15 * 60 * 1000, // 15-minute window
  max:               60,             // max requests per window per IP
  standardHeaders:   true,
  legacyHeaders:     false,
  message: {
    error: "Too many requests. Please wait a few minutes and try again."
  },
});
app.use("/api/", limiter);

// 4. Serve the frontend (index.html + assets) from /public
app.use(express.static(path.join(__dirname, "public")));

// ══════════════════════════════════════════════════════════════
//  PROXY ROUTE  GET /api/weather?city=London&units=metric
// ══════════════════════════════════════════════════════════════
app.get("/api/weather", async (req, res) => {
  const { city, units = "metric" } = req.query;

  // ── Input validation ────────────────────────────────────────
  if (!city || typeof city !== "string" || city.trim().length === 0) {
    return res.status(400).json({ error: "A city name is required." });
  }

  const sanitizedCity = city.trim().slice(0, 100); // cap length

  // Validate units param (whitelist)
  const allowedUnits = ["metric", "imperial", "standard"];
  const safeUnits    = allowedUnits.includes(units) ? units : "metric";

  // ── Build upstream URL — API key added HERE, server-side ────
  const upstreamURL = new URL(OWM_BASE);
  upstreamURL.searchParams.set("q",     sanitizedCity);
  upstreamURL.searchParams.set("units", safeUnits);
  upstreamURL.searchParams.set("appid", API_KEY);       // ← key never leaves server

  // ── Forward request to OpenWeatherMap ───────────────────────
  try {
    const owmResponse = await fetch(upstreamURL.toString());
    const data        = await owmResponse.json();

    // If OWM returns an error (404, 401, etc.), relay status + message
    if (!owmResponse.ok) {
      return res.status(owmResponse.status).json({
        error: data.message || "Weather service error.",
        code:  owmResponse.status,
      });
    }

    // ── Success: return weather data to frontend ─────────────
    // Optional: strip fields you don't need before forwarding
    return res.json(data);

  } catch (err) {
    console.error("Proxy fetch error:", err.message);
    return res.status(502).json({
      error: "Could not reach the weather service. Please try again."
    });
  }
});

// ══════════════════════════════════════════════════════════════
//  HEALTH CHECK  GET /api/health
// ══════════════════════════════════════════════════════════════
app.get("/api/health", (_req, res) => {
  res.json({
    status:    "ok",
    timestamp: new Date().toISOString(),
    keyLoaded: !!API_KEY, // true/false — never reveals the actual key
  });
});

// ══════════════════════════════════════════════════════════════
//  CATCH-ALL — serve index.html for any unmatched route
//  (supports single-page app navigation)
// ══════════════════════════════════════════════════════════════
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ══════════════════════════════════════════════════════════════
//  START SERVER
// ══════════════════════════════════════════════════════════════
app.listen(PORT, () => {
  console.log(`\n✅  Nimbus proxy running at http://localhost:${PORT}`);
  console.log(`    API key: ${"*".repeat(API_KEY.length - 4)}${API_KEY.slice(-4)}`);
  console.log(`    Weather endpoint: http://localhost:${PORT}/api/weather?city=London\n`);
});
