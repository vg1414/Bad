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
  { id: "torreblanca",  name: "Playa de Torreblanca",  town: "Fuengirola",    lat: 36.5688, lon: -4.5936 },
];

// Ordningen spelar roll: index 2 (Playa José) används som "representant"
// för sådant vi inte medelvärdesberäknar (t.ex. timprognos), eftersom
// den ligger mitt emellan de andra tre.
const HEFNER_MEMBER_IDS = ["saltillo", "carihuela", "jose", "fuentesalud"];

// Ehrborg har bara en närmaste strand, så "medelvärdet" blir samma sak
// som den strandens egna data — men den får ändå ett eget hem-läge i
// väljaren, precis som Hefner, så stat-korten/prognosen ser likadana ut.
const EHRBORG_MEMBER_IDS = ["torreblanca"];

// Det här är vad som visas i väljaren högst upp — de två "hemmen"
// (medelvärden) + alla enskilda stränder.
const PICKER_ITEMS = [
  { id: "hefner", name: "La casa del Hefner" },
  { id: "ehrborg", name: "La casa del Ehrborg" },
  ...BEACHES.map((b) => ({ id: b.id, name: b.name })),
];
const HOME = { name: "Västerås", lat: 59.6099, lon: 16.5448 };

const DEFAULT_BEACH_ID = "hefner";

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
  const note = document.getElementById("hefnerNote");
  if (note) note.style.display = "none";
  document.getElementById("heroSub").textContent = "Hämtar aktuella värden …";
  document.getElementById("flagLabel").textContent = "…";
}

// Riktiga källor för flagga/maneter (rapporterat av livräddare) och
// live-webcams, så man kan dubbelkolla med egna ögon. oceanaria.es drivs
// av Málagas universitet i samarbete med Junta de Andalucía.
const OCEANARIA_TORREMOLINOS = "https://oceanaria.es/malaga/torremolinos/playas";
const OCEANARIA_BENALMADENA = "https://oceanaria.es/malaga/benalmadena/playas";
const OCEANARIA_FUENGIROLA = "https://oceanaria.es/malaga/fuengirola/playas";
const FLAG_LINKS = {
  saltillo: [{ label: "Riktig flagga & maneter", url: OCEANARIA_TORREMOLINOS }],
  carihuela: [
    { label: "Riktig flagga & maneter", url: OCEANARIA_TORREMOLINOS },
    { label: "Live-webcam", url: "https://meteo365.es/livecams/torremolinos-bajondillo.php" },
  ],
  jose: [{ label: "Riktig flagga & maneter", url: OCEANARIA_TORREMOLINOS }],
  fuentesalud: [{ label: "Riktig flagga & maneter", url: OCEANARIA_BENALMADENA }],
  santaana: [{ label: "Riktig flagga & maneter", url: OCEANARIA_BENALMADENA }],
  malapesquera: [{ label: "Riktig flagga & maneter", url: OCEANARIA_BENALMADENA }],
  // oceanaria.es har ingen egen sida för Torreblanca — Carvajal-La Torre är
  // närmaste strand de faktiskt listar, så länken pekar dit istället.
  torreblanca: [{ label: "Riktig flagga, Carvajal-La Torre", url: OCEANARIA_FUENGIROLA }],
  hefner: [
    { label: "Riktig flagga, Torremolinos", url: OCEANARIA_TORREMOLINOS },
    { label: "Riktig flagga, Benalmádena", url: OCEANARIA_BENALMADENA },
  ],
  ehrborg: [{ label: "Riktig flagga, Carvajal-La Torre", url: OCEANARIA_FUENGIROLA }],
};

function renderFlagLinks(beachId) {
  const container = document.getElementById("flagLinks");
  if (!container) return;
  const links = FLAG_LINKS[beachId] ?? [];
  container.innerHTML = links
    .map((l) => `<a href="${l.url}" target="_blank" rel="noopener">${l.label} ↗</a>`)
    .join("");
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

  // Vajar snabbare och kraftigare ju hårdare det blåser.
  // ~0 km/h ger lugn vajning, ~50+ km/h ger stormig vajning.
  const windForWave = windKmh ?? 10;
  const waveIntensity = Math.min(Math.max(windForWave / 20, 0.6), 2.8);
  const waveDuration = Math.min(Math.max(4.2 - windForWave / 15, 1.1), 4.2);
  cloth.style.setProperty("--wave-intensity", waveIntensity.toFixed(2));
  cloth.style.setProperty("--wave-duration", `${waveDuration.toFixed(2)}s`);

  document.getElementById("heroBeachName").textContent = beachTitle(beach);
  document.getElementById("heroSub").textContent = flag.text;
  renderFlagLinks(beach.id);

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

  animateAllStatValues();
}

function renderForecast(marine, weather, rowId = "forecastRow") {
  const row = document.getElementById(rowId);
  if (!row) return;
  row.innerHTML = "";
  const days = weather.daily?.time ?? [];
  // dag 0 = idag, visa de fem kommande (index 1–5)
  for (let i = 1; i < Math.min(6, days.length); i++) {
    const date = new Date(days[i]);
    const dayName = date.toLocaleDateString("sv-SE", { weekday: "short" });
    const tMax = weather.daily.temperature_2m_max?.[i];
    const tMin = weather.daily.temperature_2m_min?.[i];
    const code = weather.daily.weather_code?.[i];
    const wave = marine?.daily?.wave_height_max?.[i];

    const el = document.createElement("div");
    el.className = "forecast-day";
    el.innerHTML = `
      <div class="day-name">${dayName}</div>
      <div class="stat-icon">${weatherEmoji(code)}</div>
      <div class="day-temp">${tMax != null ? Math.round(tMax) : "–"}°/${tMin != null ? Math.round(tMin) : "–"}°</div>
      ${marine ? `<div class="day-wave">🌊 ${wave != null ? wave.toFixed(1) + " m" : "–"}</div>` : ""}
    `;
    row.appendChild(el);
  }
}

function renderHourly(weather, rowId = "hourlyRow") {
  const row = document.getElementById(rowId);
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

// --- Scroll-reveal: sektioner tonas in när de blir synliga -----------------
function initScrollReveal() {
  const targets = document.querySelectorAll(".stat-grid, .hourly, .forecast, .stores, .transport, .home-card");
  targets.forEach((el) => el.classList.add("reveal"));

  if (!("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("in-view"));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  targets.forEach((el) => observer.observe(el));
}

// --- Topbar: byter från transparent till frostat glas när man scrollar ----
function initTopbarScroll() {
  const topbar = document.querySelector(".topbar");
  if (!topbar) return;
  const onScroll = () => {
    topbar.classList.toggle("scrolled", window.scrollY > 40);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

// --- Hero-fotot: enkel parallax, bilden rör sig långsammare än sidan ------
// Ren transform-baserad parallax (ingen bakgrundsbild-attachment-hack, som
// inte fungerar bra på mobil) — GPU-vänligt och respekterar reduced-motion.
function initHeroParallax() {
  const bg = document.getElementById("heroPhotoBg");
  const hero = document.getElementById("flagHero");
  if (!bg || !hero) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // Svagare effekt på mobil (99% av trafiken) — stark parallax känns lätt
  // ryckig när adressfältet i mobilbrowsers visar/döljer sig under scroll.
  const strength = window.matchMedia("(max-width: 560px)").matches ? 0.15 : 0.35;

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const rect = hero.getBoundingClientRect();
      const offset = rect.top * strength;
      bg.style.transform = `translateY(${offset.toFixed(1)}px)`;
      ticking = false;
    });
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

// --- Hero-kortet: minimerat läge visar bara rubrik + badläge, expanderat
// läge visar disclaimer/länkar/Hefner-not. Håller mindre av fotot dolt. --
function initHeroTextToggle() {
  const toggle = document.getElementById("heroTextToggle");
  const details = document.getElementById("heroTextDetails");
  if (!toggle || !details) return;
  toggle.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!expanded));
    details.classList.toggle("expanded", !expanded);
  });
}

// --- Tilt-hover: statistikkorten lutar lätt mot muspekaren (desktop) ------
function initCardTilt() {
  if (window.matchMedia && window.matchMedia("(hover: none)").matches) return;
  document.querySelectorAll(".stat-card").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(500px) rotateX(${(-py * 8).toFixed(2)}deg) rotateY(${(px * 8).toFixed(2)}deg) translateY(-3px)`;
    });
    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });
}

// --- Count-up: stat-siffror räknar upp från 0 när de först får ett värde --
// Läser talet ur textContent (t.ex. "1.2 m" eller "24°"), animerar en kopia
// av siffran och skriver tillbaka hela texten (inkl. enhet) på sista frame.
function animateCountUp(el) {
  if (!el || el.dataset.counting === "1") return;
  const text = el.textContent.trim();
  const match = text.match(/-?\d+(\.\d+)?/);
  if (!match) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const target = parseFloat(match[0]);
  const decimals = match[0].includes(".") ? match[0].split(".")[1].length : 0;
  const prefix = text.slice(0, match.index);
  const suffix = text.slice(match.index + match[0].length);

  el.dataset.counting = "1";
  const duration = 700;
  const start = performance.now();

  function frame(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    const value = target * eased;
    el.textContent = `${prefix}${value.toFixed(decimals)}${suffix}`;
    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      el.textContent = text;
      el.dataset.counting = "0";
    }
  }
  requestAnimationFrame(frame);
}

function animateAllStatValues() {
  document.querySelectorAll(".stat-value, .home-stat .stat-value").forEach(animateCountUp);
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
}

// Generisk laddning för ett "hem" (medelvärde av en eller flera stränder).
// Hefner har fyra medlemsstränder, Ehrborg bara en (Torreblanca) — koden
// funkar likadant oavsett antal.
async function loadHomeAverage(homeId, memberIds, displayName) {
  setLoadingState({ name: displayName, town: "medelvärde" });

  try {
    const members = memberIds.map((id) => BEACHES.find((b) => b.id === id));
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
    const { marineSynth, weatherSynth } = averageMembers(marines, weathers);

    renderBeach({ id: homeId, name: displayName, town: "" }, marineSynth, weatherSynth);
    showHomeNote(homeId);
    localStorage.setItem(`badapp:${homeId}`, JSON.stringify({ marine: marineSynth, weather: weatherSynth, ts: Date.now() }));
  } catch (err) {
    console.error(err);
    const cached = localStorage.getItem(`badapp:${homeId}`);
    if (cached) {
      const { marine, weather, ts } = JSON.parse(cached);
      renderBeach({ id: homeId, name: displayName, town: "" }, marine, weather, ts);
      showHomeNote(homeId);
    } else {
      document.getElementById("heroSub").textContent = "Kunde inte hämta data just nu. Testa igen om en stund.";
    }
  }
}

// Slår ihop data från en eller flera stränder till ett medelvärde. Aktuella
// värden (våghöjd, temperaturer, vind, UV) medelvärdesberäknas rakt av.
// Timprognos och soltider hämtas från en "representant"-strand — för Hefner
// Playa José (mitt emellan de andra tre), för Ehrborg den enda stranden.
function averageMembers(marines, weathers) {
  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

  const waveVals = marines.map((m) => m.current?.wave_height).filter((v) => v != null);
  const waterVals = marines.map((m) => m.current?.sea_surface_temperature).filter((v) => v != null);
  const airVals = weathers.map((w) => w.current?.temperature_2m).filter((v) => v != null);
  const feelsVals = weathers.map((w) => w.current?.apparent_temperature).filter((v) => v != null);
  const windVals = weathers.map((w) => w.current?.wind_speed_10m).filter((v) => v != null);
  const uvVals = weathers.map((w) => w.daily?.uv_index_max?.[0]).filter((v) => v != null);

  const repIdx = Math.min(2, weathers.length - 1); // Playa José för Hefner, index 0 för Ehrborg
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

const HOME_NOTES = {
  hefner: "Medelvärde av Playa del Saltillo, La Carihuela, Playa José och Fuente de la Salud.",
  ehrborg: "Data för Playa de Torreblanca, närmaste strand från Calle las Tórtolas.",
};

function showHomeNote(homeId) {
  const note = document.getElementById("hefnerNote");
  if (!note) return;
  note.textContent = HOME_NOTES[homeId] ?? "";
  note.style.display = "block";
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
  renderHourly(data, "homeHourlyRow");
  renderForecast(null, data, "homeForecastRow");
  animateAllStatValues();
}

// --- 6. Mataffärer nära respektive hem -----------------------------
// Öppettider hämtade manuellt (Google Maps) — uppdatera själv om en
// affär ändrar sina ordinarie tider.
const STORES_BY_HOME = {
  // Nära C. Antonio García Fernández 7 (La casa del Hefner)
  hefner: [
    {
      name: "Dia (DIA Maxi)",
      short: "DIA",
      brandBg: "#EE1C25",
      brandFg: "#ffffff",
      distance: "~160 m",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Dia+Maxi+Torremolinos&query_place_id=ChIJQ3_Ol378cg0Rh5LY9ZUaSMc",
      hours: { mon: { open: "09:00", close: "21:30" }, tue: { open: "09:00", close: "21:30" }, wed: { open: "09:00", close: "21:30" }, thu: { open: "09:00", close: "21:30" }, fri: { open: "09:00", close: "21:30" }, sat: { open: "09:00", close: "21:30" }, sun: { open: "09:00", close: "15:00" } },
    },
    {
      name: "Lidl",
      short: "LIDL",
      brandBg: "#0050AA",
      brandFg: "#FFD100",
      distance: "~400 m",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Lidl+Torremolinos&query_place_id=ChIJF6BlGHr8cg0RCrq8w6A52K8",
      hours: { mon: { open: "09:00", close: "21:30" }, tue: { open: "09:00", close: "21:30" }, wed: { open: "09:00", close: "21:30" }, thu: { open: "09:00", close: "21:30" }, fri: { open: "09:00", close: "21:30" }, sat: { open: "09:00", close: "21:30" }, sun: { open: "09:00", close: "21:30" } },
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
  ],
  // Nära Calle las Tórtolas 14 (La casa del Ehrborg), Torreblanca/Fuengirola.
  // Inga stora kedjor inom promenadavstånd (Mercadona/Lidl ligger 2-4 km
  // bort) — de här tre lokala butikerna ligger alla inom ~1 km.
  ehrborg: [
    {
      name: "Alsara Express",
      short: "Alsara",
      brandBg: "#2E7D32",
      brandFg: "#ffffff",
      distance: "~930 m",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Alsara+Express+Fuengirola",
      hours: { mon: { open: "09:30", close: "21:00" }, tue: { open: "09:30", close: "21:00" }, wed: { open: "09:30", close: "21:00" }, thu: { open: "09:30", close: "21:00" }, fri: { open: "09:30", close: "21:00" }, sat: { open: "09:30", close: "21:00" } },
    },
    {
      name: "Maxi Market",
      short: "Maxi Market",
      brandBg: "#C62828",
      brandFg: "#ffffff",
      distance: "~1,1 km",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Maxi+Market+Calle+del+Ficus+Fuengirola",
      hours: { mon: { open: "09:00", close: "20:30" }, tue: { open: "09:00", close: "20:30" }, wed: { open: "09:00", close: "20:30" }, thu: { open: "09:00", close: "20:30" }, fri: { open: "09:00", close: "20:30" }, sat: { open: "09:00", close: "20:30" } },
    },
    {
      name: "Covirán",
      short: "Covirán",
      brandBg: "#EF6C00",
      brandFg: "#ffffff",
      distance: "~1,1 km",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Coviran+Paseo+Maritimo+Rey+de+Espana+Fuengirola",
      hours: { mon: { open: "08:30", close: "22:00" }, tue: { open: "08:30", close: "22:00" }, wed: { open: "08:30", close: "22:00" }, thu: { open: "08:30", close: "22:00" }, fri: { open: "08:30", close: "22:00" }, sat: { open: "08:30", close: "22:00" }, sun: { open: "08:30", close: "22:00" } },
    },
    {
      name: "Mercado Virgen del Carmen (Los Boliches)",
      short: "Mercado Boliches",
      brandBg: "#00695C",
      brandFg: "#ffffff",
      distance: "~2,3 km · med L-5-bussen",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Mercado+Virgen+del+Carmen+Los+Boliches+Fuengirola",
      hours: { mon: { open: "08:30", close: "15:00" }, tue: { open: "08:30", close: "15:00" }, wed: { open: "08:30", close: "15:00" }, thu: { open: "08:30", close: "15:00" }, fri: { open: "08:30", close: "15:00" }, sat: { open: "09:00", close: "13:30" } },
    },
  ],
};

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

function renderStores(rowId, stores) {
  const row = document.getElementById(rowId);
  if (!row) return;
  row.innerHTML = "";

  const now = new Date();
  const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const todayKey = dayKeys[now.getDay()];
  const mandatoryClosed = isMandatoryClosedToday(now);

  stores.forEach((store) => {
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

// --- 7. Platsväljaren (fullskärmsvy: första gången + "Byt plats") --------
// Ersätter den gamla chip-raden i hero:t — istället väljer man plats en
// gång, den sparas som förval, och man kommer direkt till den nästa gång.
function buildLocationGrid(activeId, onSelect) {
  const grid = document.getElementById("locationGrid");
  if (!grid) return;
  grid.innerHTML = "";
  PICKER_ITEMS.forEach((item) => {
    const btn = document.createElement("button");
    btn.className = "location-card" + (item.id === activeId ? " active" : "");
    const isHome = item.id === "hefner" || item.id === "ehrborg";
    btn.innerHTML = `
      <span class="location-card-icon">${isHome ? "🏠" : "🏖️"}</span>
      <span class="location-card-name">${item.name}</span>
    `;
    btn.addEventListener("click", () => onSelect(item.id));
    grid.appendChild(btn);
  });
}

function showLocationPicker() {
  const picker = document.getElementById("locationPicker");
  if (picker) picker.hidden = false;
  document.body.classList.add("picking-location");
}

function hideLocationPicker() {
  const picker = document.getElementById("locationPicker");
  if (picker) picker.hidden = true;
  document.body.classList.remove("picking-location");
}

// --- 8. Starta appen -------------------------------------------
const HOME_SECTION_IDS = ["hefnerSection", "ehrborgSection"];

// Laddar rätt data för valfritt id — de två hemmen (medelvärden) eller en
// enskild strand. Används av både selectBeach och uppdatera-knappen.
function loadForId(beachId) {
  if (beachId === "hefner") return loadHomeAverage("hefner", HEFNER_MEMBER_IDS, "La casa del Hefner");
  if (beachId === "ehrborg") return loadHomeAverage("ehrborg", EHRBORG_MEMBER_IDS, "La casa del Ehrborg");
  const beach = BEACHES.find((b) => b.id === beachId) ?? BEACHES[0];
  return loadBeach(beach);
}

function selectBeach(beachId) {
  localStorage.setItem("badapp:lastBeach", beachId);
  buildLocationGrid(beachId, (id) => {
    selectBeach(id);
    hideLocationPicker();
  });

  HOME_SECTION_IDS.forEach((sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) section.style.display = sectionId === `${beachId}Section` ? "block" : "none";
  });

  loadForId(beachId);
}

function init() {
  const savedId = localStorage.getItem("badapp:lastBeach");
  selectBeach(savedId || DEFAULT_BEACH_ID);
  if (!savedId) showLocationPicker();

  const changeLocationBtn = document.getElementById("changeLocationBtn");
  if (changeLocationBtn) {
    changeLocationBtn.addEventListener("click", showLocationPicker);
  }

  loadHome();
  renderStores("storesRow", STORES_BY_HOME.hefner);
  renderStores("ehrborgStoresRow", STORES_BY_HOME.ehrborg);
  initScrollReveal();
  initTopbarScroll();
  initHeroParallax();
  initCardTilt();
  initHeroTextToggle();

  const refreshBtn = document.getElementById("refreshBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", async () => {
      refreshBtn.classList.add("spinning");
      refreshBtn.disabled = true;
      const currentId = localStorage.getItem("badapp:lastBeach") || DEFAULT_BEACH_ID;
      await Promise.all([loadForId(currentId), loadHome()]);
      refreshBtn.classList.remove("spinning");
      refreshBtn.disabled = false;
    });
  }
}

init();

// --- 9. PWA: registrera service worker --------------------------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((err) => console.warn("SW-registrering misslyckades", err));
  });
}
