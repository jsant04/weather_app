
    /* ══════════════════════════════════════════════════════════
       NIMBUS FRONTEND — talks to LOCAL PROXY, not OWM directly
       ══════════════════════════════════════════════════════════
       ✅ No API key here. Zero. The key lives in server/.env
       The browser calls /api/weather, the server calls OWM.
    ══════════════════════════════════════════════════════════ */

    // ── Config (no secrets!) ─────────────────────────────────
    const CONFIG = {
      PROXY_URL:  "/api/weather",   // relative URL → same origin as this page
      UNITS:      "metric",
      UNIT_LABEL: "°C",
    };

    // ── DOM refs ──────────────────────────────────────────────
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

    // ── Weather condition → theme map ────────────────────────
    const THEMES = {
      thunderstorm: { ids:[200,299], emoji:"⛈️",  bg:{from:"#0d0d1a",mid:"#1a1a2e",to:"#16213e"}, orbs:{a:"rgba(100,60,200,0.55)",  b:"rgba(30,80,180,0.5)",   c:"rgba(180,60,250,0.35)"},  pill:"Thunderstorm warning" },
      drizzle:      { ids:[300,399], emoji:"🌦️",  bg:{from:"#1a2a3a",mid:"#1f3048",to:"#253545"}, orbs:{a:"rgba(60,130,200,0.5)",   b:"rgba(40,100,180,0.45)", c:"rgba(80,160,220,0.3)"},   pill:"Light drizzle conditions" },
      rain:         { ids:[500,599], emoji:"🌧️",  bg:{from:"#12263a",mid:"#1c3555",to:"#1e3a50"}, orbs:{a:"rgba(30,120,210,0.6)",   b:"rgba(20,90,180,0.5)",   c:"rgba(60,150,230,0.3)"},   pill:"Rainy conditions" },
      snow:         { ids:[600,699], emoji:"❄️",   bg:{from:"#2a2e4a",mid:"#353a5a",to:"#2e3555"}, orbs:{a:"rgba(160,180,255,0.45)", b:"rgba(200,220,255,0.35)",c:"rgba(140,160,240,0.3)"},  pill:"Snow conditions" },
      atmosphere:   { ids:[700,799], emoji:"🌫️",  bg:{from:"#2a2a3a",mid:"#3a3a4a",to:"#32323f"}, orbs:{a:"rgba(160,160,200,0.4)",  b:"rgba(140,140,180,0.35)",c:"rgba(180,180,220,0.25)"}, pill:"Low visibility" },
      clear:        { ids:[800,800], emoji:"☀️",   bg:{from:"#1a0a00",mid:"#3d1c00",to:"#1f0e00"}, orbs:{a:"rgba(255,160,30,0.55)",  b:"rgba(255,100,0,0.4)",   c:"rgba(255,200,60,0.35)"},  pill:"Clear skies" },
      fewClouds:    { ids:[801,802], emoji:"⛅",   bg:{from:"#0f1a2e",mid:"#1e2d4a",to:"#162240"}, orbs:{a:"rgba(80,140,220,0.5)",   b:"rgba(255,130,30,0.3)",  c:"rgba(60,120,200,0.35)"},  pill:"Partly cloudy" },
      cloudy:       { ids:[803,899], emoji:"☁️",   bg:{from:"#1a1f2e",mid:"#252d3f",to:"#1e2538"}, orbs:{a:"rgba(100,120,180,0.5)",  b:"rgba(80,100,160,0.4)",  c:"rgba(120,140,200,0.3)"},  pill:"Overcast skies" },
    };
    const DEFAULT_THEME = THEMES.cloudy;

    function getTheme(id) {
      for (const t of Object.values(THEMES)) {
        if (id >= t.ids[0] && id <= t.ids[1]) return t;
      }
      return DEFAULT_THEME;
    }

    function applyTheme(theme) {
      const r = document.documentElement;
      r.style.setProperty("--bg-from", theme.bg.from);
      r.style.setProperty("--bg-mid",  theme.bg.mid);
      r.style.setProperty("--bg-to",   theme.bg.to);
      r.style.setProperty("--orb-a",   theme.orbs.a);
      r.style.setProperty("--orb-b",   theme.orbs.b);
      r.style.setProperty("--orb-c",   theme.orbs.c);
    }

    // ── UI state manager ──────────────────────────────────────
    function showState(state) {
      DOM.emptyState.style.display   = "none";
      DOM.loadingState.style.display = "none";
      DOM.errorState.style.display   = "none";
      DOM.weatherCard.classList.remove("visible");
      DOM.weatherCard.style.display  = "none";

      const reAnimate = (el) => {
        el.classList.remove("anim-fadein");
        void el.offsetWidth;
        el.classList.add("anim-fadein");
      };

      if (state === "empty")   { DOM.emptyState.style.display   = "block"; reAnimate(DOM.emptyState); }
      if (state === "loading") { DOM.loadingState.style.display = "block"; reAnimate(DOM.loadingState); }
      if (state === "error")   { DOM.errorState.style.display   = "block"; reAnimate(DOM.errorState); }
      if (state === "weather") {
        DOM.weatherCard.style.display = "block";
        void DOM.weatherCard.offsetWidth;
        DOM.weatherCard.classList.add("visible");
      }
    }

    // ── Render weather data ───────────────────────────────────
    function renderWeather(data) {
      const id    = data.weather[0].id;
      const desc  = data.weather[0].description;
      const main  = data.weather[0].main;
      const temp  = Math.round(data.main.temp);
      const feels = Math.round(data.main.feels_like);
      const wind  = data.wind.speed;
      const vis   = data.visibility;
      const tz    = data.timezone;

      const theme   = getTheme(id);
      const capDesc = desc.charAt(0).toUpperCase() + desc.slice(1);
      const windStr = `${wind.toFixed(1)} m/s`;
      const visStr  = `${(vis / 1000).toFixed(1)} km`;

      // Local time from timezone offset
      const utcMs   = Date.now() + new Date().getTimezoneOffset() * 60000;
      const local   = new Date(utcMs + tz * 1000);
      const timeStr = local.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      const dateStr = local.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

      applyTheme(theme);

      DOM.cityName.textContent      = data.name;
      DOM.countryBadge.textContent  = data.sys.country;
      DOM.localTime.textContent     = `${dateStr} · ${timeStr} local`;
      DOM.weatherIcon.textContent   = theme.emoji;
      DOM.temperature.innerHTML     = `${temp}<span class="temp-unit">${CONFIG.UNIT_LABEL}</span>`;
      DOM.conditionText.textContent = capDesc;
      DOM.feelsLike.textContent     = `Feels like ${feels}${CONFIG.UNIT_LABEL}   ·   ${main}`;
      DOM.humidity.textContent      = `${data.main.humidity}%`;
      DOM.windSpeed.textContent     = windStr;
      DOM.visibility.textContent    = visStr;
      DOM.conditionPill.innerHTML   =
        `<span class="condition-dot" aria-hidden="true"></span>${theme.pill}`;

      showState("weather");
    }

    // ── Fetch via proxy ───────────────────────────────────────
    /**
     * Calls OUR server at /api/weather — never OpenWeatherMap directly.
     * The API key is added by the server, out of reach of the browser.
     */
    async function fetchWeather(city) {
      const trimmed = city.trim();
      if (!trimmed) return;

      // Disable button during fetch
      DOM.searchBtn.disabled = true;
      showState("loading");
      DOM.cityInput.blur();

      // Build URL to OUR proxy (relative = same origin)
      const url = new URL(CONFIG.PROXY_URL, window.location.origin);
      url.searchParams.set("city",  trimmed);
      url.searchParams.set("units", CONFIG.UNITS);

      try {
        const res  = await fetch(url.toString());
        const data = await res.json();

        if (!res.ok) {
          // Server relayed an error from OWM
          DOM.errorTitle.textContent = res.status === 404 ? "City Not Found" : `Error ${res.status}`;
          DOM.errorBody.textContent  = data.error || "Something went wrong. Please try again.";
          showState("error");
          applyTheme(DEFAULT_THEME);
          return;
        }

        renderWeather(data);

      } catch (err) {
        console.error("Proxy fetch error:", err);
        DOM.errorTitle.textContent = "Connection Error";
        DOM.errorBody.textContent  = "Could not reach the proxy server. Is it running? (npm start)";
        showState("error");
        applyTheme(DEFAULT_THEME);
      } finally {
        DOM.searchBtn.disabled = false;
      }
    }

    // ── Event listeners ───────────────────────────────────────
    DOM.searchBtn.addEventListener("click", () => fetchWeather(DOM.cityInput.value));
    DOM.cityInput.addEventListener("keydown", (e) => { if (e.key === "Enter") fetchWeather(DOM.cityInput.value); });
    DOM.cityInput.addEventListener("input", () => {
      if (!DOM.cityInput.value.trim()) { showState("empty"); applyTheme(DEFAULT_THEME); }
    });

    // ── Init ──────────────────────────────────────────────────
    showState("empty");
    if (window.innerWidth > 768) DOM.cityInput.focus();
 