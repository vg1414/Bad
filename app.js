// ============================================================
// BADLÄGET — app.js
// All logik för att hämta väder/vågdata och visa den på sidan.
// Kommentarer på svenska så det är lätt att följa med.
// ============================================================

// --- 1. Stränderna vi kan välja mellan ---------------------
// "id" måste vara unikt och används för att komma ihåg vilket
// val användaren gjorde senast (sparas i webbläsaren).
const BEACHES = [
  { id: "saltillo",     name: "Playa del Saltillo",    town: "Torremolinos",  lat: 36.6025, lon: -4.5135 },
  { id: "carihuela",    name: "La Carihuela",          town: "Torremolinos",  lat: 36.6076, lon: -4.5046 },
  { id: "bajondillo",   name: "El Bajondillo",         town: "Torremolinos",  lat: 36.6249, lon: -4.4931 },
  { id: "playamar",     name: "Playamar",              town: "Torremolinos",  lat: 36.6306, lon: -4.4887 },
  { id: "alamos",       name: "Los Álamos",            town: "Torremolinos",  lat: 36.6349, lon: -4.4856 },
  { id: "fuentesalud",  name: "Fuente de la Salud",    town: "Benalmádena",   lat: 36.5990, lon: -4.5101 },
  { id: "santaana",     name: "Santa Ana",             town: "Benalmádena",   lat: 36.5921, lon: -4.5230 },
  { id: "malapesquera", name: "Malapesquera",          town: "Benalmádena",   lat: 36.5965, lon: -4.5171 },
  { id: "bilbil",       name: "Bil-Bil",               town: "Benalmádena",   lat: 36.5882, lon: -4.5301 },
];

// Hemma-koordinater: Västerås
const HOME = { name: "Västerås", lat: 59.6099, lon: 16.5448 };

const DEFAULT_BEACH_ID = "carihuela";

// --- 2. Hjälpfunktioner för att bygga API-adresser ----------
function marineUrl(lat, lon) {
  return `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}` +
    `&current=wave_height,sea_surface_temperature` +
    `&daily=wave_height_max` +
    `&timezone=auto&forecast_days=4`;
}

function weatherUrl(lat, lon) {
  return `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,wind_speed_10m,weather_code` +
    `&hourly=temperature_2m,weather_code` +
    `&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,weather_code` +
    `&timezone=auto&forecast_days=4`;
}

// Enkel översättning av Open-Meteos "weather_code" till en emoji.
// (Se https://open-meteo.com/en/docs för hela listan — detta är en förenklad version)
function weatherEmoji(code) {
  if (code === 0) return "☀️";
  if ([1, 2].includes(code)) return "🌤️";
  if (code === 3) return "☁️";
  if ([45, 48].includes(code)) return "🌫️";
  if ([51, 53, 55, 56, 57].includes(code)) return "🌦️";
  if ([61, 63, 65, 80, 81, 82].includes(code)) return "🌧️";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "🌨️";
  if ([95, 96, 99].includes(code)) return "⛈️";
  return "🌡️";
}

// --- 3. Flaggfärg: uppskattning utifrån våghöjd + vind ------
// OBS: Det här är EN UPPSKATTNING, inte den officiella livräddarflaggan.
// Samma princip används av bl.a. snowy.es: grön <1m, gul 1–2.5m, röd >2.5m.
// Vi väger också in vindstyrkan eftersom hård vind gör det farligare
// även om vågorna vid kusten ännu inte hunnit bli höga.
function estimateFlag(waveHeightM, windKmh) {
  if (waveHeightM == null) {
    return { level: "yellow", text: "Okänt läge" };
  }
  if (waveHeightM > 2.0 || windKmh > 45) {
    return { level: "red", text: "Avrådes — höga vågor/hård vind" };
  }
  if (waveHeightM > 1.0 || windKmh > 25) {
    return { level: "yellow", text: "Bada med försiktighet" };
  }
  return { level: "green", text: "Bra badläge" };
}

// --- 4. Hämta och visa data för vald strand -----------------
async function loadBeach(beach) {
  setLoadingState(beach);

  try {
    const [marineRes, weatherRes] = await Promise.all([
      fetch(marineUrl(beach.lat, beach.lon)),
      fetch(weatherUrl(beach.lat, beach.lon)),
    ]);
    if (!marineRes.ok || !weatherRes.ok) throw new Error("Kunde inte hämta data");

    const marine = await marineRes.json();
    const weather = await weatherRes.json();

    renderBeach(beach, marine, weather);

    // Spara senaste lyckade svar lokalt, så vi kan visa något
    // även om nätet är nere nästa gång sidan öppnas.
    localStorage.setItem(`badapp:${beach.id}`, JSON.stringify({ marine, weather, ts: Date.now() }));
  } catch (err) {
    console.error(err);
    const cached = localStorage.getItem(`badapp:${beach.id}`);
    if (cached) {
      const { marine, weather, ts } = JSON.parse(cached);
      renderBeach(beach, marine, weather, ts);
    } else {
      document.getElementById("heroSub").textContent = "Kunde inte hämta data just nu. Testa igen om en stund.";
    }
  }
}

function setLoadingState(beach) {
  document.getElementById("heroBeachName").textContent = `${beach.name}, ${beach.town}`;
  document.getElementById("heroSub").textContent = "Hämtar aktuella värden …";
  document.getElementById("flagLabel").textContent = "…";
}

function renderBeach(beach, marine, weather, cachedTs) {
  const waveNow = marine.current?.wave_height ?? null;
  const waterTemp = marine.current?.sea_surface_temperature ?? null;
  const airTemp = weather.current?.temperature_2m ?? null;
  const feelsLike = weather.current?.apparent_temperature ?? null;
  const windKmh = weather.current?.wind_speed_10m ?? null;
  const uvToday = weather.daily?.uv_index_max?.[0] ?? null;
  const sunrise = weather.daily?.sunrise?.[0];
  const sunset = weather.daily?.sunset?.[0];

  // --- Flaggan ---
  const flag = estimateFlag(waveNow, windKmh);
  const cloth = document.getElementById("flagCloth");
  cloth.classList.remove("flag-yellow", "flag-red");
  if (flag.level === "yellow") cloth.classList.add("flag-yellow");
  if (flag.level === "red") cloth.classList.add("flag-red");
  document.getElementById("flagLabel").textContent =
    flag.level === "green" ? "Grön" : flag.level === "yellow" ? "Gul" : "Röd";

  document.getElementById("heroBeachName").textContent = `${beach.name}, ${beach.town}`;
  document.getElementById("heroSub").textContent = flag.text;

  // --- Värdekorten ---
  document.getElementById("statWave").textContent = waveNow != null ? `${waveNow.toFixed(1)} m` : "–";
  document.getElementById("statWaterTemp").textContent = waterTemp != null ? `${waterTemp.toFixed(1)}°` : "–";
  document.getElementById("statAirTemp").textContent = airTemp != null ? `${Math.round(airTemp)}°` : "–";
  document.getElementById("statAirFeels").textContent =
    feelsLike != null ? `Känns som ${Math.round(feelsLike)}°` : "";
  document.getElementById("statWind").textContent = windKmh != null ? `${Math.round(windKmh)} km/h` : "–";
  document.getElementById("statUv").textContent = uvToday != null ? uvToday.toFixed(0) : "–";
  document.getElementById("statSun").textContent =
    sunrise && sunset ? `${formatTime(sunrise)}–${formatTime(sunset)}` : "–";

  // --- Timme-för-timme, resten av dagen ---
  renderHourly(weather);

  // --- Prognos, 3 dagar framåt ---
  renderForecast(marine, weather);

  // --- Senast uppdaterad ---
  const stamp = cachedTs ?? Date.now();
  const prefix = cachedTs ? "Sparad data från" : "Uppdaterad";
  document.getElementById("lastUpdated").textContent =
    `${prefix} ${new Date(stamp).toLocaleString("sv-SE", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}`;
}

function renderForecast(marine, weather) {
  const row = document.getElementById("forecastRow");
  row.innerHTML = "";
  const days = weather.daily?.time ?? [];
  // dag 0 = idag, visa de tre kommande (index 1–3)
  for (let i = 1; i < Math.min(4, days.length); i++) {
    const date = new Date(days[i]);
    const dayName = date.toLocaleDateString("sv-SE", { weekday: "short" });
    const tMax = weather.daily.temperature_2m_max?.[i];
    const tMin = weather.daily.temperature_2m_min?.[i];
    const code = weather.daily.weather_code?.[i];
    const wave = marine.daily?.wave_height_max?.[i];

    const el = document.createElement("div");
    el.className = "forecast-day";
    el.innerHTML = `
      <div class="day-name">${dayName}</div>
      <div class="stat-icon">${weatherEmoji(code)}</div>
      <div class="day-temp">${tMax != null ? Math.round(tMax) : "–"}° / ${tMin != null ? Math.round(tMin) : "–"}°</div>
      <div class="day-wave">🌊 ${wave != null ? wave.toFixed(1) + " m" : "–"}</div>
    `;
    row.appendChild(el);
  }
}

function renderHourly(weather) {
  const row = document.getElementById("hourlyRow");
  if (!row) return;
  row.innerHTML = "";

  const times = weather.hourly?.time ?? [];
  const temps = weather.hourly?.temperature_2m ?? [];
  const codes = weather.hourly?.weather_code ?? [];
  const nowIso = weather.current?.time;

  if (!nowIso || times.length === 0) {
    row.innerHTML = '<p class="hourly-empty">Ingen timprognos tillgänglig just nu.</p>';
    return;
  }

  // Hitta index för nästa kommande timme. ISO-tider med fast bredd
  // ("2026-08-05T08:00") går att jämföra som vanliga strängar —
  // de sorteras i samma ordning som datumen faktiskt ligger i.
  const nowPrefix = nowIso.slice(0, 13); // t.ex. "2026-08-05T08"
  let startIdx = times.findIndex((t) => t >= nowPrefix);
  if (startIdx === -1) startIdx = 0;

  const hoursToShow = times.slice(startIdx, startIdx + 12);
  if (hoursToShow.length === 0) {
    row.innerHTML = '<p class="hourly-empty">Ingen timprognos tillgänglig just nu.</p>';
    return;
  }

  hoursToShow.forEach((t, idx) => {
    const i = startIdx + idx;
    const temp = temps[i];
    const code = codes[i];
    const hourLabel = idx === 0 ? "Nu" : t.slice(11, 13);

    const el = document.createElement("div");
    el.className = "hour-card";
    el.innerHTML = `
      <span class="hour-label">${hourLabel}</span>
      <span class="hour-icon">${weatherEmoji(code)}</span>
      <span class="hour-temp">${temp != null ? Math.round(temp) + "°" : "–"}</span>
    `;
    row.appendChild(el);
  });
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
}

// --- 5. Hemma i Västerås -------------------------------------
async function loadHome() {
  try {
    const res = await fetch(weatherUrl(HOME.lat, HOME.lon));
    if (!res.ok) throw new Error("Kunde inte hämta hemma-väder");
    const data = await res.json();
    localStorage.setItem("badapp:home", JSON.stringify({ data, ts: Date.now() }));
    renderHome(data);
  } catch (err) {
    console.error(err);
    const cached = localStorage.getItem("badapp:home");
    if (cached) renderHome(JSON.parse(cached).data);
  }
}

function renderHome(data) {
  const temp = data.current?.temperature_2m;
  const feelsLike = data.current?.apparent_temperature;
  const wind = data.current?.wind_speed_10m;
  const code = data.current?.weather_code;
  document.getElementById("homeTemp").textContent = temp != null ? `${Math.round(temp)}°` : "–";
  document.getElementById("homeFeels").textContent =
    feelsLike != null ? `Känns som ${Math.round(feelsLike)}°` : "";
  document.getElementById("homeWind").textContent = wind != null ? `${Math.round(wind)} km/h` : "–";
  document.getElementById("homeCond").textContent = weatherEmoji(code);
}

// --- 6. Strandväljaren (chips högst upp) ---------------------
function buildBeachPicker(activeId, onSelect) {
  const nav = document.getElementById("beachPicker");
  nav.innerHTML = "";
  BEACHES.forEach((beach) => {
    const btn = document.createElement("button");
    btn.className = "beach-chip" + (beach.id === activeId ? " active" : "");
    btn.textContent = beach.name;
    btn.addEventListener("click", () => onSelect(beach.id));
    nav.appendChild(btn);
  });
}

// --- 7. Starta appen -------------------------------------------
function selectBeach(beachId) {
  const beach = BEACHES.find((b) => b.id === beachId) ?? BEACHES[0];
  localStorage.setItem("badapp:lastBeach", beach.id);
  buildBeachPicker(beach.id, selectBeach);
  loadBeach(beach);
}

function init() {
  const savedId = localStorage.getItem("badapp:lastBeach") || DEFAULT_BEACH_ID;
  selectBeach(savedId);
  loadHome();
}

init();

// --- 8. PWA: registrera service worker --------------------------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((err) => console.warn("SW-registrering misslyckades", err));
  });
}
