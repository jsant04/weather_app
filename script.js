 /* ═══════════════════════════════════════════════════════
       NIMBUS WEATHER DASHBOARD — Vanilla JS
       ─────────────────────────────────────────────────────
       HOW TO USE:
         1. Get a free API key from https://openweathermap.org/api
         2. Replace YOUR_API_KEY_HERE below with your key.
         3. Open this file in a browser. Done!
    ═══════════════════════════════════════════════════════ */

    // ─── CONFIG ──────────────────────────────────────────
    const CONFIG = {
      API_KEY: "25151e7cdef0ddabbda001fc6c94c42e",           // ← Replace with your OpenWeatherMap key
      BASE_URL: "https://api.openweathermap.org/data/2.5/weather",
      UNITS: "metric",                         // "metric" (°C) | "imperial" (°F)
      UNIT_LABEL: "°C",
      WIND_UNIT: "m/s",
    };

    // ─── DOM REFS ─────────────────────────────────────────
    const $ = (id) => document.getElementById(id);
    const DOM = {
      cityInput:     $("cityInput"),
      searchBtn:     $("searchBtn"),
      emptyState:    $("emptyState"),
      loadingState:  $("loadingState"),
      errorState:    $("errorState"),
      errorTitle:    $("errorTitle"),
      errorBody:     $("errorBody"),
      weatherCard:   $("weatherCard"),
      cityName:      $("cityName"),
      countryBadge:  $("countryBadge"),
      localTime:     $("localTime"),
      weatherIcon:   $("weatherIcon"),
      temperature:   $("temperature"),
      conditionText: $("conditionText"),
      feelsLike:     $("feelsLike"),
      humidity:      $("humidity"),
      windSpeed:     $("windSpeed"),
      visibility:    $("visibility"),
      conditionPill: $("conditionPill"),
    };

    // ─── WEATHER CONDITION → THEME MAPPING ───────────────
    /**
     * Maps OpenWeatherMap condition IDs to visual themes.
     * Each theme controls:
     *   emoji     — displayed weather icon
     *   bg        — CSS variables for body gradient
     *   orbs      — animated orb colors
     *   pillText  — description for the pill badge
     */
    const THEMES = {
      thunderstorm: {
        ids: [200, 299],
        emoji: "⛈️",
        bg: { from: "#0d0d1a", mid: "#1a1a2e", to: "#16213e" },
        orbs: { a: "rgba(100, 60, 200, 0.55)", b: "rgba(30, 80, 180, 0.5)", c: "rgba(180, 60, 250, 0.35)" },
        pillText: "Thunderstorm warning",
      },
      drizzle: {
        ids: [300, 399],
        emoji: "🌦️",
        bg: { from: "#1a2a3a", mid: "#1f3048", to: "#253545" },
        orbs: { a: "rgba(60, 130, 200, 0.5)", b: "rgba(40, 100, 180, 0.45)", c: "rgba(80, 160, 220, 0.3)" },
        pillText: "Light drizzle conditions",
      },
      rain: {
        ids: [500, 599],
        emoji: "🌧️",
        bg: { from: "#12263a", mid: "#1c3555", to: "#1e3a50" },
        orbs: { a: "rgba(30, 120, 210, 0.6)", b: "rgba(20, 90, 180, 0.5)", c: "rgba(60, 150, 230, 0.3)" },
        pillText: "Rainy conditions",
      },
      snow: {
        ids: [600, 699],
        emoji: "❄️",
        bg: { from: "#2a2e4a", mid: "#353a5a", to: "#2e3555" },
        orbs: { a: "rgba(160, 180, 255, 0.45)", b: "rgba(200, 220, 255, 0.35)", c: "rgba(140, 160, 240, 0.3)" },
        pillText: "Snow conditions",
      },
      atmosphere: {
        ids: [700, 799],
        emoji: "🌫️",
        bg: { from: "#2a2a3a", mid: "#3a3a4a", to: "#32323f" },
        orbs: { a: "rgba(160, 160, 200, 0.4)", b: "rgba(140, 140, 180, 0.35)", c: "rgba(180, 180, 220, 0.25)" },
        pillText: "Low visibility conditions",
      },
      clear: {
        ids: [800, 800],
        emoji: "☀️",
        bg: { from: "#1a0a00", mid: "#3d1c00", to: "#1f0e00" },
        orbs: { a: "rgba(255, 160, 30, 0.55)", b: "rgba(255, 100, 0, 0.4)", c: "rgba(255, 200, 60, 0.35)" },
        pillText: "Clear skies",
      },
      fewClouds: {
        ids: [801, 802],
        emoji: "⛅",
        bg: { from: "#0f1a2e", mid: "#1e2d4a", to: "#162240" },
        orbs: { a: "rgba(80, 140, 220, 0.5)", b: "rgba(255, 130, 30, 0.3)", c: "rgba(60, 120, 200, 0.35)" },
        pillText: "Partly cloudy",
      },
      cloudy: {
        ids: [803, 899],
        emoji: "☁️",
        bg: { from: "#1a1f2e", mid: "#252d3f", to: "#1e2538" },
        orbs: { a: "rgba(100, 120, 180, 0.5)", b: "rgba(80, 100, 160, 0.4)", c: "rgba(120, 140, 200, 0.3)" },
        pillText: "Overcast skies",
      },
    };

    // Default theme for unknown conditions
    const DEFAULT_THEME = THEMES.cloudy;

    /**
     * Returns the theme object for a given OWM condition code.
     * @param {number} id — OWM weather condition ID
     * @returns {object} Theme configuration
     */
    function getTheme(id) {
      for (const theme of Object.values(THEMES)) {
        if (id >= theme.ids[0] && id <= theme.ids[1]) return theme;
      }
      return DEFAULT_THEME;
    }

    // ─── APPLY DYNAMIC THEME ─────────────────────────────
    /**
     * Updates CSS custom properties on :root to change
     * the animated background gradient and orb colors.
     */
    function applyTheme(theme) {
      const root = document.documentElement;
      root.style.setProperty("--bg-from", theme.bg.from);
      root.style.setProperty("--bg-mid",  theme.bg.mid);
      root.style.setProperty("--bg-to",   theme.bg.to);
      root.style.setProperty("--orb-a",   theme.orbs.a);
      root.style.setProperty("--orb-b",   theme.orbs.b);
      root.style.setProperty("--orb-c",   theme.orbs.c);
    }

    // ─── UI STATE MANAGER ────────────────────────────────
    /**
     * Manages which panel is visible.
     * Hides all states, then reveals the chosen one.
     * @param {"empty"|"loading"|"error"|"weather"} state
     */
    function showState(state) {
      // Hide everything
      DOM.emptyState.style.display   = "none";
      DOM.loadingState.style.display = "none";
      DOM.errorState.style.display   = "none";
      DOM.weatherCard.classList.remove("visible");
      DOM.weatherCard.style.display  = "none";

      // Show target + trigger re-animation by cloning (force animation replay)
      const reAnimate = (el) => {
        el.classList.remove("anim-fadein");
        void el.offsetWidth; // reflow
        el.classList.add("anim-fadein");
      };

      switch (state) {
        case "empty":
          DOM.emptyState.style.display = "block";
          reAnimate(DOM.emptyState);
          break;
        case "loading":
          DOM.loadingState.style.display = "block";
          reAnimate(DOM.loadingState);
          break;
        case "error":
          DOM.errorState.style.display = "block";
          reAnimate(DOM.errorState);
          break;
        case "weather":
          DOM.weatherCard.style.display = "block";
          void DOM.weatherCard.offsetWidth;
          DOM.weatherCard.classList.add("visible");
          break;
      }
    }

    // ─── POPULATE WEATHER DATA ───────────────────────────
    /**
     * Takes the OWM API response and fills the weather card.
     * @param {object} data — OWM /weather endpoint response
     */
    function renderWeather(data) {
      const conditionId   = data.weather[0].id;
      const conditionMain = data.weather[0].main;
      const conditionDesc = data.weather[0].description;
      const temp          = Math.round(data.main.temp);
      const feelsLike     = Math.round(data.main.feels_like);
      const humidity      = data.main.humidity;
      const windSpeedRaw  = data.wind.speed;
      const visibilityRaw = data.visibility; // in meters
      const timezone      = data.timezone;   // UTC offset in seconds
      const country       = data.sys.country;

      // Capitalize description
      const capDesc = conditionDesc.charAt(0).toUpperCase() + conditionDesc.slice(1);

      // Format wind speed
      const windDisplay = CONFIG.UNITS === "metric"
        ? `${windSpeedRaw.toFixed(1)} m/s`
        : `${Math.round(windSpeedRaw)} mph`;

      // Format visibility (OWM gives meters, max reported 10000)
      const visKm = (visibilityRaw / 1000).toFixed(1);
      const visDisplay = CONFIG.UNITS === "metric"
        ? `${visKm} km`
        : `${(visibilityRaw / 1609).toFixed(1)} mi`;

      // Local time using timezone offset
      const utcMs     = Date.now() + new Date().getTimezoneOffset() * 60000;
      const localMs   = utcMs + timezone * 1000;
      const localDate = new Date(localMs);
      const timeStr   = localDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      const dateStr   = localDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

      // Get theme
      const theme = getTheme(conditionId);

      // Apply background theme
      applyTheme(theme);

      // Populate DOM
      DOM.cityName.textContent      = data.name;
      DOM.countryBadge.textContent  = country;
      DOM.localTime.textContent     = `${dateStr} · ${timeStr} local`;
      DOM.weatherIcon.textContent   = theme.emoji;
      DOM.temperature.innerHTML     = `${temp}<span class="temp-unit">${CONFIG.UNIT_LABEL}</span>`;
      DOM.conditionText.textContent = capDesc;
      DOM.feelsLike.textContent     = `Feels like ${feelsLike}${CONFIG.UNIT_LABEL}   ·   ${conditionMain}`;
      DOM.humidity.textContent      = `${humidity}%`;
      DOM.windSpeed.textContent     = windDisplay;
      DOM.visibility.textContent    = visDisplay;
      DOM.conditionPill.innerHTML   =
        `<span class="condition-dot" aria-hidden="true"></span>${theme.pillText}`;

      // Show weather card
      showState("weather");
    }

    // ─── FETCH WEATHER DATA ──────────────────────────────
    /**
     * Fetches weather from OpenWeatherMap API.
     * Handles loading, success, and error states.
     * @param {string} city — City name entered by user
     */
    async function fetchWeather(city) {
      const trimmed = city.trim();
      if (!trimmed) return; // Guard: empty input

      // Show loading
      showState("loading");
      DOM.cityInput.blur();

      // Build request URL
      const url = new URL(CONFIG.BASE_URL);
      url.searchParams.set("q",     trimmed);
      url.searchParams.set("appid", CONFIG.API_KEY);
      url.searchParams.set("units", CONFIG.UNITS);

      try {
        // ── API call ──
        const response = await fetch(url.toString());

        // Handle non-OK HTTP status
        if (!response.ok) {
          // 401 = invalid key, 404 = city not found
          if (response.status === 401) {
            DOM.errorTitle.textContent = "Invalid API Key";
            DOM.errorBody.textContent  =
              "Please replace YOUR_API_KEY_HERE with a valid OpenWeatherMap API key.";
          } else if (response.status === 404) {
            DOM.errorTitle.textContent = "City Not Found";
            DOM.errorBody.textContent  =
              `We couldn't find "${trimmed}". Double-check the spelling or try a nearby larger city.`;
          } else {
            DOM.errorTitle.textContent = `Error ${response.status}`;
            DOM.errorBody.textContent  = "Something went wrong. Please try again in a moment.";
          }
          showState("error");
          applyTheme(DEFAULT_THEME); // Reset to neutral theme on error
          return;
        }

        // Parse JSON
        const data = await response.json();

        // Render the weather card
        renderWeather(data);

      } catch (error) {
        // Network error, CORS, or parse error
        console.error("Fetch error:", error);
        DOM.errorTitle.textContent = "Connection Error";
        DOM.errorBody.textContent  =
          "Unable to reach the weather service. Check your internet connection and try again.";
        showState("error");
        applyTheme(DEFAULT_THEME);
      }
    }

    // ─── EVENT LISTENERS ─────────────────────────────────

    /** Search button click */
    DOM.searchBtn.addEventListener("click", () => {
      fetchWeather(DOM.cityInput.value);
    });

    /** Enter key in input */
    DOM.cityInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        fetchWeather(DOM.cityInput.value);
      }
    });

    /** Clear error/result when user starts typing again */
    DOM.cityInput.addEventListener("input", () => {
      const hasValue = DOM.cityInput.value.trim().length > 0;
      // If they clear the input completely, go back to empty state
      if (!hasValue) {
        showState("empty");
        applyTheme(DEFAULT_THEME);
      }
    });

    // ─── INITIAL STATE ───────────────────────────────────
    // Show empty state on page load
    showState("empty");

    // Auto-focus input on desktop (not on mobile to avoid keyboard popup)
    if (window.innerWidth > 768) {
      DOM.cityInput.focus();
    }

    /* ═══════════════════════════════════════════════════════
       DEMO / TESTING MODE
       ─────────────────────────────────────────────────────
       To test without an API key, uncomment the block below.
       It simulates a "Tokyo" weather response with mock data.
       Comment it out again before deploying with a real key.
    ═══════════════════════════════════════════════════════

    (function demoMode() {
      const mockData = {
        name: "Tokyo",
        sys: { country: "JP" },
        timezone: 32400, // UTC+9
        weather: [{ id: 800, main: "Clear", description: "clear sky" }],
        main: { temp: 22, feels_like: 21, humidity: 55 },
        wind: { speed: 4.2 },
        visibility: 10000,
      };
      setTimeout(() => renderWeather(mockData), 800);
    })();

    */