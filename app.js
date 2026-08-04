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
  { id: "jose",         name: "Playa José",            town: "Torremolinos",  lat: 36.6018, lon: -4.5084 },
  { id: "fuentesalud",  name: "Fuente de la Salud",    town: "Benalmádena",   lat: 36.5990, lon: -4.5101 },
  { id: "santaana",     name: "Santa Ana",             town: "Benalmádena",   lat: 36.5921, lon: -4.5230 },
  { id: "malapesquera", name: "Malapesquera",          town: "Benalmádena",   lat: 36.5965, lon: -4.5171 },
];

// Ordningen spelar roll: index 2 (Playa José) används som "representant"
// för sådant vi inte medelvärdesberäknar (t.ex. timprognos), eftersom
// den ligger mitt emellan de andra tre.
const STRANDEN_MEMBER_IDS = ["saltillo", "carihuela", "jose", "fuentesalud"];

// Det här är vad som visas i väljaren högst upp — "Stranden" (medelvärdet) + alla enskilda.
const PICKER_ITEMS = [{ id: "stranden", name: "Stranden" }, ...BEACHES.map((b) => ({ id: b.id, name: b.name }))];
const HOME = { name: "Västerås", lat: 59.6099, lon: 16.5448 };

const DEFAULT_BEACH_ID = "stranden";

// --- 2. Hjälpfunktioner för att bygga API-adresser ----------
function marineUrl(lat, lon) {
  return `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}` +
    `&current=wave_height,sea_surface_temperature` +
    `&daily=wave_height_max` +
    `&timezone=auto&forecast_days=6`;
}

function weatherUrl(lat, lon) {
  return `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,wind_speed_10m,weather_code` +
    `&hourly=temperature_2m,weather_code` +
    `&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,weather_code` +
    `&timezone=auto&forecast_days=6`;
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
  document.getElementById("heroBeachName").textContent = beachTitle(beach);
  const note = document.getElementById("strandenNote");
  if (note) note.style.display = "none";
  document.getElementById("heroSub").textContent = "Hämtar aktuella värden …";
  document.getElementById("flagLabel").textContent = "…";
}

function beachTitle(beach) {
  return beach.town ? `${beach.name}, ${beach.town}` : beach.name;
}

function renderBeach(beach, marine, weather, cachedTs) {
  const waveNow = marine.current?.wave_height ?? null;
  const waterTemp = marine.current?.sea_surface_temperature ?? null;
  const airTemp = weather.current?.temperature_2m ?? null;
  const feelsLike = weather.current?.apparent_temperature ?? null;
  const maxTempToday = weather.daily?.temperature_2m_max?.[0] ?? null;
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

  document.getElementById("heroBeachName").textContent = beachTitle(beach);
  document.getElementById("heroSub").textContent = flag.text;

  // --- Värdekorten ---
  document.getElementById("statWave").textContent = waveNow != null ? `${waveNow.toFixed(1)} m` : "–";
  document.getElementById("statWaterTemp").textContent = waterTemp != null ? `${waterTemp.toFixed(1)}°` : "–";
  document.getElementById("statAirTemp").textContent = airTemp != null ? `${Math.round(airTemp)}°` : "–";
  document.getElementById("statAirFeels").textContent =
    feelsLike != null ? `Känns som ${Math.round(feelsLike)}°` : "";
  document.getElementById("statAirMax").textContent =
    maxTempToday != null ? `Max idag ${Math.round(maxTempToday)}°` : "";
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
  for (let i = 1; i < Math.min(6, days.length); i++) {
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

  const hoursToShow = times.slice(startIdx, startIdx + 24);
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

async function loadStranden() {
  setLoadingState({ name: "Stranden", town: "medelvärde" });

  try {
    const members = STRANDEN_MEMBER_IDS.map((id) => BEACHES.find((b) => b.id === id));
    const pairs = await Promise.all(
      members.map((b) =>
        Promise.all([
          fetch(marineUrl(b.lat, b.lon)).then((r) => r.json()),
          fetch(weatherUrl(b.lat, b.lon)).then((r) => r.json()),
        ])
      )
    );
    const marines = pairs.map((p) => p[0]);
    const weathers = pairs.map((p) => p[1]);
    const { marineSynth, weatherSynth } = averageStranden(marines, weathers);

    renderBeach({ name: "Stranden", town: "" }, marineSynth, weatherSynth);
    showStrandenNote();
    localStorage.setItem("badapp:stranden", JSON.stringify({ marine: marineSynth, weather: weatherSynth, ts: Date.now() }));
  } catch (err) {
    console.error(err);
    const cached = localStorage.getItem("badapp:stranden");
    if (cached) {
      const { marine, weather, ts } = JSON.parse(cached);
      renderBeach({ name: "Stranden", town: "" }, marine, weather, ts);
      showStrandenNote();
    } else {
      document.getElementById("heroSub").textContent = "Kunde inte hämta data just nu. Testa igen om en stund.";
    }
  }
}

// Slår ihop data från flera stränder till ett medelvärde. Aktuella värden
// (våghöjd, temperaturer, vind, UV) medelvärdesberäknas rakt av. Timprognos
// och soltider hämtas från Playa José, som ligger mitt emellan de andra tre.
function averageStranden(marines, weathers) {
  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

  const waveVals = marines.map((m) => m.current?.wave_height).filter((v) => v != null);
  const waterVals = marines.map((m) => m.current?.sea_surface_temperature).filter((v) => v != null);
  const airVals = weathers.map((w) => w.current?.temperature_2m).filter((v) => v != null);
  const feelsVals = weathers.map((w) => w.current?.apparent_temperature).filter((v) => v != null);
  const windVals = weathers.map((w) => w.current?.wind_speed_10m).filter((v) => v != null);
  const uvVals = weathers.map((w) => w.daily?.uv_index_max?.[0]).filter((v) => v != null);

  const repIdx = Math.min(2, weathers.length - 1); // Playa José
  const rep = weathers[repIdx];
  const repMarine = marines[repIdx];

  const marineSynth = {
    current: { wave_height: avg(waveVals), sea_surface_temperature: avg(waterVals) },
    daily: repMarine.daily,
  };
  const weatherSynth = {
    current: {
      time: rep.current?.time,
      temperature_2m: avg(airVals),
      apparent_temperature: avg(feelsVals),
      wind_speed_10m: avg(windVals),
    },
    daily: { ...rep.daily, uv_index_max: [avg(uvVals), ...(rep.daily?.uv_index_max?.slice(1) ?? [])] },
    hourly: rep.hourly,
  };
  return { marineSynth, weatherSynth };
}

function showStrandenNote() {
  const note = document.getElementById("strandenNote");
  if (note) note.style.display = "block";
}


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
  const maxTempToday = data.daily?.temperature_2m_max?.[0];
  const wind = data.current?.wind_speed_10m;
  const code = data.current?.weather_code;
  document.getElementById("homeTemp").textContent = temp != null ? `${Math.round(temp)}°` : "–";
  document.getElementById("homeFeels").textContent =
    feelsLike != null ? `Känns som ${Math.round(feelsLike)}°` : "";
  document.getElementById("homeMax").textContent =
    maxTempToday != null ? `Max idag ${Math.round(maxTempToday)}°` : "";
  document.getElementById("homeWind").textContent = wind != null ? `${Math.round(wind)} km/h` : "–";
  document.getElementById("homeCond").textContent = weatherEmoji(code);
}

// --- 6. Mataffärer nära C. Antonio García Fernández 7 -----------
// Öppettider hämtade manuellt (Google Maps) — uppdatera själv om en
// affär ändrar sina ordinarie tider.
const STORES = [
  {
    name: "Dia (DIA Maxi)",
    short: "DIA",
    brandBg: "#EE1C25",
    brandFg: "#ffffff",
    distance: "~160 m",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Dia+Maxi+Torremolinos&query_place_id=ChIJQ3_Ol378cg0Rh5LY9ZUaSMc",
    hours: { mon: { open: "09:00", close: "22:00" }, tue: { open: "09:00", close: "22:00" }, wed: { open: "09:00", close: "22:00" }, thu: { open: "09:00", close: "22:00" }, fri: { open: "09:00", close: "22:00" }, sat: { open: "09:00", close: "22:00" }, sun: { open: "09:00", close: "15:00" } },
  },
  {
    name: "Lidl",
    short: "LIDL",
    brandBg: "#0050AA",
    brandFg: "#FFD100",
    distance: "~400 m",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Lidl+Torremolinos&query_place_id=ChIJF6BlGHr8cg0RCrq8w6A52K8",
    hours: { mon: { open: "09:00", close: "22:00" }, tue: { open: "09:00", close: "22:00" }, wed: { open: "09:00", close: "22:00" }, thu: { open: "09:00", close: "22:00" }, fri: { open: "09:00", close: "22:00" }, sat: { open: "09:00", close: "22:00" }, sun: { open: "09:00", close: "22:00" } },
  },
  {
    name: "Mercadona",
    short: "Mercadona",
    brandBg: "#00A65E",
    brandFg: "#ffffff",
    distance: "~500 m",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Mercadona+Torremolinos&query_place_id=ChIJXRr-ufD9cg0RRHg-ptLm7Po",
    hours: { mon: { open: "09:00", close: "22:00" }, tue: { open: "09:00", close: "22:00" }, wed: { open: "09:00", close: "22:00" }, thu: { open: "09:00", close: "22:00" }, fri: { open: "09:00", close: "22:00" }, sat: { open: "09:00", close: "22:00" }, sun: { open: "09:00", close: "15:00" } },
  },
  {
    name: "Carrefour",
    short: "Carrefour",
    brandBg: "#004E9E",
    brandFg: "#F36F21",
    distance: "~750 m",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Carrefour+Costasol+Torremolinos&query_place_id=ChIJ_____5v7cg0RMVT4JM99Hnk",
    hours: { mon: { open: "09:00", close: "22:00" }, tue: { open: "09:00", close: "22:00" }, wed: { open: "09:00", close: "22:00" }, thu: { open: "09:00", close: "22:00" }, fri: { open: "09:00", close: "22:00" }, sat: { open: "09:00", close: "22:00" }, sun: { open: "10:00", close: "22:00" } },
  },
];

// De stora, nationellt obligatoriska stängningsdagarna i Spanien.
// Dessa är alltid på samma datum, oavsett år, så vi kan kolla
// månad+dag direkt utan att behöva en lista per år.
const MANDATORY_CLOSED_DATES = [
  [1, 1],   // Nyårsdagen
  [1, 6],   // Trettondagen (Reyes)
  [5, 1],   // Första maj
  [12, 25], // Juldagen
];

function isMandatoryClosedToday(now) {
  const m = now.getMonth() + 1;
  const d = now.getDate();
  return MANDATORY_CLOSED_DATES.some(([mm, dd]) => mm === m && dd === d);
}

function renderStores() {
  const row = document.getElementById("storesRow");
  if (!row) return;
  row.innerHTML = "";

  const now = new Date();
  const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const todayKey = dayKeys[now.getDay()];
  const mandatoryClosed = isMandatoryClosedToday(now);

  STORES.forEach((store) => {
    const todayHours = store.hours[todayKey];
    let statusClass = "closed";
    let statusText = "Stängt idag";
    let hoursText = "";

    if (mandatoryClosed) {
      statusText = "Stängt (helgdag)";
    } else if (!todayHours) {
      statusText = "Stängt idag";
    } else {
      const nowMin = now.getHours() * 60 + now.getMinutes();
      const [oh, om] = todayHours.open.split(":").map(Number);
      const [ch, cm] = todayHours.close.split(":").map(Number);
      const openMin = oh * 60 + om;
      const closeMin = ch * 60 + cm;
      if (nowMin >= openMin && nowMin < closeMin) {
        statusClass = "open";
        statusText = "Öppet nu";
        hoursText = `till ${todayHours.close}`;
      } else {
        statusClass = "closed";
        statusText = "Stängt nu";
        hoursText = nowMin < openMin ? `öppnar ${todayHours.open}` : "öppnar imorgon";
      }
    }

    const el = document.createElement("a");
    el.className = "store-card";
    el.href = store.mapsUrl;
    el.target = "_blank";
    el.rel = "noopener";
    el.innerHTML = `
      <div class="store-badge" style="background:${store.brandBg};color:${store.brandFg}">${store.short}</div>
      <div class="store-dist">${store.distance}</div>
      <div class="store-status ${statusClass}">${statusText}</div>
      <div class="store-hours">${hoursText}</div>
      <div class="store-link-hint">Se på kartan ↗</div>
    `;
    row.appendChild(el);
  });
}

// --- 7. Strandväljaren (chips högst upp) ---------------------
function buildBeachPicker(activeId, onSelect) {
  const nav = document.getElementById("beachPicker");
  nav.innerHTML = "";
  PICKER_ITEMS.forEach((item) => {
    const btn = document.createElement("button");
    btn.className = "beach-chip" + (item.id === activeId ? " active" : "");
    btn.textContent = item.name;
    btn.addEventListener("click", () => onSelect(item.id));
    nav.appendChild(btn);
  });
}

// --- 8. Starta appen -------------------------------------------
function selectBeach(beachId) {
  localStorage.setItem("badapp:lastBeach", beachId);
  buildBeachPicker(beachId, selectBeach);

  const storesSection = document.getElementById("storesSection");
  if (storesSection) storesSection.style.display = beachId === "stranden" ? "block" : "none";

  if (beachId === "stranden") {
    loadStranden();
    return;
  }
  const beach = BEACHES.find((b) => b.id === beachId) ?? BEACHES[0];
  loadBeach(beach);
}

function init() {
  const savedId = localStorage.getItem("badapp:lastBeach") || DEFAULT_BEACH_ID;
  selectBeach(savedId);
  loadHome();
  renderStores();
}

init();

// --- 9. PWA: registrera service worker --------------------------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((err) => console.warn("SW-registrering misslyckades", err));
  });
}
