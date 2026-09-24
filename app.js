// ============================================================
// BADLÄGET — app.js
// All logik för att hämta väder/vågdata och visa den på sidan.
// Kommentarer på svenska så det är lätt att följa med.
// ============================================================

// --- 1. Stränderna bakom de två husen ----------------------
// Man väljer bara mellan husen (Hefner och Ehrborg). Stränderna nedan
// används i bakgrunden: husens värden är medelvärden av dessa.
const BEACHES = [
  { id: "saltillo",     name: "Playa del Saltillo",    town: "Torremolinos",  lat: 36.6025, lon: -4.5135 },
  { id: "carihuela",    name: "La Carihuela",          town: "Torremolinos",  lat: 36.6076, lon: -4.5046 },
  { id: "jose",         name: "Playa José",            town: "Torremolinos",  lat: 36.6018, lon: -4.5084 },
  { id: "fuentesalud",  name: "Fuente de la Salud",    town: "Benalmádena",   lat: 36.5990, lon: -4.5101 },
  { id: "torreblanca",  name: "Playa de Torreblanca",  town: "Fuengirola",    lat: 36.5688, lon: -4.5936 },
];

// Ordningen spelar roll: index 2 (Playa José) används som "representant"
// för sådant vi inte medelvärdesberäknar (t.ex. timprognos), eftersom
// den ligger mitt emellan de andra tre.
const HEFNER_MEMBER_IDS = ["saltillo", "carihuela", "jose", "fuentesalud"];

// Ehrborg har bara en närmaste strand, så "medelvärdet" blir samma sak
// som den strandens egna data — men den får ändå ett eget hem-läge.
const EHRBORG_MEMBER_IDS = ["torreblanca"];

const HOMES = [
  { id: "hefner", name: "La casa del Hefner", sub: "Torremolinos · El Pinillo" },
  { id: "ehrborg", name: "La casa del Ehrborg", sub: "Fuengirola · Torreblanca" },
];
const HOME = { name: "Västerås", lat: 59.6099, lon: 16.5448 };

const DEFAULT_BEACH_ID = "hefner";

// Senast hämtade data, så att delar som behöver båda platserna
// (jämförelsen Spanien–Västerås) kan ritas när båda har kommit in.
const state = { beachWeather: null, homeWeather: null, beachAir: null };

// --- 2. Hjälpfunktioner för att bygga API-adresser ----------
function marineUrl(lat, lon) {
  return `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}` +
    `&current=wave_height,sea_surface_temperature` +
    `&daily=wave_height_max` +
    `&timezone=auto&forecast_days=6`;
}

function weatherUrl(lat, lon) {
  return `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,wind_speed_10m,weather_code,is_day` +
    `&hourly=temperature_2m,weather_code,is_day,precipitation_probability` +
    `&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,weather_code` +
    `&timezone=auto&forecast_days=6&windspeed_unit=ms`;
}

// Svenska decimaltal: 23,7 istället för 23.7
function fmt(n, decimals = 0) {
  return n.toFixed(decimals).replace(".", ",");
}

// --- 3. Egna mjuka väderikoner (SVG) istället för emojis ------------
// Emojis ser olika ut på iPhone och Android och är ganska "hårda".
// De här ritas med samma färger som resten av appen, och får en måne
// istället för en sol när det är mörkt ute.
const SUN = `<circle cx="18" cy="18" r="7" fill="var(--limon)"/><g stroke="var(--limon-deep)" stroke-width="2.2" stroke-linecap="round"><path d="M18 4.5v3M18 28.5v3M4.5 18h3M28.5 18h3M8.5 8.5l2.1 2.1M25.4 25.4l2.1 2.1M8.5 27.5l2.1-2.1M25.4 10.6l2.1-2.1"/></g>`;
const SUN_SMALL = `<g transform="translate(-4 -5) scale(.8)">${SUN}</g>`;
const MOON = `<path d="M22.5 7.5a10.5 10.5 0 1 0 6 18.2A9 9 0 0 1 22.5 7.5z" fill="#F3DFA2" stroke="#D8BE72" stroke-width="1.2"/>`;
const MOON_SMALL = `<g transform="translate(-5 -5) scale(.8)">${MOON}</g>`;
const CLOUD = `<path d="M11 28h14.5a6 6 0 0 0 .7-12 8.3 8.3 0 0 0-15.7 2.3A4.9 4.9 0 0 0 11 28z" fill="var(--cloud)" stroke="var(--cloud-line)" stroke-width="1.5" stroke-linejoin="round"/>`;
const CLOUD_UP = `<g transform="translate(0 -3)">${CLOUD}</g>`;
function drops(color, n = 3) {
  const xs = n === 2 ? [14, 22] : [12, 18, 24];
  return xs.map((x, i) => `<path d="M${x} ${29 + (i % 2) * 2}l-1.4 3.2" stroke="${color}" stroke-width="2.2" stroke-linecap="round"/>`).join("");
}
function svg(inner) {
  return `<svg viewBox="0 0 36 36" aria-hidden="true">${inner}</svg>`;
}

function weatherIcon(code, isDay = 1) {
  const orb = isDay ? SUN_SMALL : MOON_SMALL;
  if (code === 0) return svg(isDay ? SUN : MOON);
  if (code === 1 || code === 2) return svg(orb + CLOUD);
  if (code === 3) return svg(CLOUD);
  if (code === 45 || code === 48) return svg(CLOUD_UP + `<path d="M9 30h18M12 33.5h12" stroke="var(--cloud-line)" stroke-width="2" stroke-linecap="round"/>`);
  if ([51, 53, 55, 56, 57].includes(code)) return svg(orb + CLOUD_UP + drops("var(--cielo)", 2));
  if ([61, 63, 65, 80, 81, 82].includes(code)) return svg(CLOUD_UP + drops("var(--cielo)"));
  if ([71, 73, 75, 77, 85, 86].includes(code)) return svg(CLOUD_UP + `<g fill="var(--cielo)"><circle cx="12" cy="31" r="1.6"/><circle cx="18" cy="33" r="1.6"/><circle cx="24" cy="31" r="1.6"/></g>`);
  if ([95, 96, 99].includes(code)) return svg(CLOUD_UP + `<path d="M19 26l-3.5 5.5h4L17.5 36" fill="none" stroke="var(--limon-deep)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`);
  return svg(CLOUD);
}

const STAT_ICONS = {
  wave: svg(`<g fill="none" stroke="var(--mar)" stroke-width="2.4" stroke-linecap="round"><path d="M4 15c3-3 6-3 9 0s6 3 9 0 6-3 10 0"/><path d="M4 23c3-3 6-3 9 0s6 3 9 0 6-3 10 0" opacity=".55"/></g>`),
  wind: svg(`<g fill="none" stroke="var(--cielo)" stroke-width="2.4" stroke-linecap="round"><path d="M4 14h17a4 4 0 1 0-4-4"/><path d="M4 21h23a4 4 0 1 1-4 4"/><path d="M4 28h9" opacity=".55"/></g>`),
  uv: svg(SUN),
};

// Små ordbeskrivningar gör siffrorna lättare att förstå direkt
function waveWord(m) {
  if (m == null) return "Vågor";
  if (m < 0.2) return "Spegelblankt";
  if (m < 0.5) return "Små krusningar";
  if (m < 1) return "Lite vågor";
  if (m < 2) return "Rejäla vågor";
  return "Höga vågor";
}
// Samma indelning som SMHI använder för vindstyrka
function windWord(ms) {
  if (ms == null) return "Vind";
  if (ms < 0.3) return "Vindstilla";
  if (ms < 3.4) return "Svag vind";
  if (ms < 8) return "Måttlig vind";
  if (ms < 14) return "Frisk vind";
  return "Hård vind";
}
function uvInfo(uv) {
  if (uv == null) return { word: "UV", color: "transparent" };
  if (uv < 3) return { word: "Låg", color: "#4FA46A" };
  if (uv < 6) return { word: "Måttlig", color: "#F0BD3F" };
  if (uv < 8) return { word: "Hög", color: "#EE8A3C" };
  if (uv < 11) return { word: "Mycket hög", color: "#DD5F4A" };
  return { word: "Extrem", color: "#9A5BC4" };
}
function waterWord(t) {
  if (t == null) return "";
  if (t < 18) return "Friskt!";
  if (t < 21) return "Svalt men skönt";
  if (t < 24) return "Behagligt";
  if (t < 27) return "Varmt och gott";
  return "Som ett badkar";
}

// --- 4. Flaggfärg: uppskattning utifrån våghöjd + vind ------
// OBS: Det här är EN UPPSKATTNING, inte den officiella livräddarflaggan.
// Samma princip används av bl.a. snowy.es: grön <1m, gul 1–2.5m, röd >2.5m.
// Vi väger också in vindstyrkan eftersom hård vind gör det farligare
// även om vågorna vid kusten ännu inte hunnit bli höga.
function estimateFlag(waveHeightM, windMs) {
  if (waveHeightM == null) {
    return { level: "yellow", name: "Gul", text: "Okänt läge" };
  }
  if (waveHeightM > 2.0 || windMs > 12.5) {
    return { level: "red", name: "Röd", text: "Avstå från bad" };
  }
  if (waveHeightM > 1.0 || windMs > 7) {
    return { level: "yellow", name: "Gul", text: "Bada försiktigt" };
  }
  return { level: "green", name: "Grön", text: "Bra badläge" };
}

// --- 5. Den vajande flaggan (canvas) ---------------------------------
// Hur det funkar: flaggans tyg (färg + text) ritas en gång på en osynlig
// "textur"-canvas. Varje bildruta klipps texturen i smala lodräta remsor
// (1 px breda). Varje remsa flyttas upp/ner enligt en sinusvåg som växer
// ju längre från stången man kommer — precis som ett riktigt tyg, som är
// fast vid stången och fladdrar mest i den fria änden. Remsorna får också
// ljus eller skugga beroende på hur mycket vågen lutar just där, vilket
// ger illusionen av veck. Vinden styr både hur höga vågorna är och hur
// fort de rör sig, plus små "vindbyar" som gör rörelsen levande.
const Flag = (() => {
  const CSS_W = 190, CSS_H = 168;
  const POLE_X = 8, FLAG_X = 13, FLAG_Y = 18, FLAG_W = 158, FLAG_H = 100;
  const COLORS = { green: [79, 164, 106], yellow: [240, 189, 63], red: [221, 95, 74], none: [236, 224, 204] };

  let canvas, ctx, tex, texCtx, dpr = 1;
  let color = COLORS.none.slice(), target = COLORS.none.slice();
  let label = "";
  let intensity = 0.8, targetIntensity = 0.8;
  let speed = 0.6, targetSpeed = 0.6;
  let phase = 0, time = 0, last = 0;
  let running = false, onScreen = true;
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function init(el) {
    canvas = el;
    ctx = canvas.getContext("2d");
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = CSS_W * dpr;
    canvas.height = CSS_H * dpr;
    tex = document.createElement("canvas");
    tex.width = FLAG_W * dpr;
    tex.height = FLAG_H * dpr;
    texCtx = tex.getContext("2d");
    paintTexture();

    // Pausa när flaggan inte syns (sparar batteri)
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entries) => {
        onScreen = entries[0].isIntersecting;
        if (onScreen) start();
      }).observe(canvas);
    }
    document.addEventListener("visibilitychange", () => { if (!document.hidden) start(); });
    // Texten på flaggan använder Fraunces — rita om när typsnittet laddat
    if (document.fonts) document.fonts.ready.then(paintTexture);
    start();
  }

  function paintTexture() {
    if (!texCtx) return;
    const c = texCtx, w = tex.width, h = tex.height, r = 6 * dpr;
    const [R, G, B] = color.map(Math.round);
    c.clearRect(0, 0, w, h);
    c.save();
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(w - r, 0);
    c.quadraticCurveTo(w, 0, w, r);
    c.lineTo(w, h - r);
    c.quadraticCurveTo(w, h, w - r, h);
    c.lineTo(0, h);
    c.closePath();
    c.clip();
    c.fillStyle = `rgb(${R},${G},${B})`;
    c.fillRect(0, 0, w, h);
    // Mjuk ljusreflex uppifrån + lite mörkare fåll vid stången
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "rgba(255,255,255,0.18)");
    g.addColorStop(0.5, "rgba(255,255,255,0)");
    g.addColorStop(1, "rgba(0,0,0,0.08)");
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    c.fillStyle = "rgba(0,0,0,0.12)";
    c.fillRect(0, 0, 7 * dpr, h);
    c.fillStyle = "rgba(255,255,255,0.35)";
    for (let y = 10 * dpr; y < h - 6 * dpr; y += 12 * dpr) {
      c.beginPath();
      c.arc(3.5 * dpr, y, 1.1 * dpr, 0, Math.PI * 2);
      c.fill();
    }
    // Texten (Grön/Gul/Röd) — mörk på gul, ljus på grön/röd
    if (label) {
      const light = color[0] * 0.3 + color[1] * 0.59 + color[2] * 0.11 > 170;
      c.fillStyle = light ? "rgba(59,42,34,0.88)" : "rgba(255,250,240,0.96)";
      c.font = `600 ${30 * dpr}px Fraunces, Georgia, serif`;
      c.textBaseline = "alphabetic";
      c.fillText(label, 18 * dpr, h - 16 * dpr);
    }
    c.restore();
  }

  function setState(level, text, windMs) {
    target = (COLORS[level] || COLORS.none).slice();
    label = text;
    const w = windMs ?? 3;
    targetIntensity = Math.min(Math.max(w / 5, 0.45), 2.4);
    targetSpeed = Math.min(0.45 + w * 0.1, 1.9);
    paintTexture();
    start();
  }

  function start() {
    if (running || !ctx) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    time += dt;

    // Glid mjukt mot nya värden istället för att hoppa
    const ease = 1 - Math.pow(0.02, dt);
    intensity += (targetIntensity - intensity) * ease;
    speed += (targetSpeed - speed) * ease;
    let colorMoving = false;
    for (let i = 0; i < 3; i++) {
      const d = target[i] - color[i];
      if (Math.abs(d) > 0.5) { color[i] += d * ease * 1.5; colorMoving = true; }
      else color[i] = target[i];
    }
    if (colorMoving) paintTexture();

    phase += dt * speed * Math.PI * 2;
    draw();

    if (reduced || !onScreen || document.hidden) { running = false; return; }
    requestAnimationFrame(frame);
  }

  function draw() {
    const c = ctx;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, CSS_W, CSS_H);

    // Vindbyar: två långsamma vågor ovanpå varandra ger ett oregelbundet andetag
    const gust = 0.82 + 0.13 * Math.sin(time * 0.53) + 0.07 * Math.sin(time * 1.37 + 2);
    const amp = (2.5 + 6.5 * intensity) * gust;
    const step = 1;
    const slices = [];

    for (let x = 0; x < FLAG_W; x += step) {
      const k = x / FLAG_W;                       // 0 vid stången, 1 i fria änden
      const reach = Math.pow(k, 1.15);
      const p = k * 7.2 - phase;
      const wave = Math.sin(p) + 0.28 * Math.sin(p * 2.1 + 1.3);
      const slope = Math.cos(p) + 0.59 * Math.cos(p * 2.1 + 1.3);
      const dy = amp * reach * wave;
      // Tyget ser lite kortare ut där det vrider sig bort från oss
      const h = FLAG_H * (1 - 0.07 * reach * intensity * (0.5 + 0.5 * Math.sin(p + 1.1)));
      // Lite "häng" längst ut när det nästan är vindstilla
      const sag = (1.6 - Math.min(intensity, 1.6)) * 6 * k * k;
      const y = FLAG_Y + dy + (FLAG_H - h) / 2 + sag;
      slices.push({ x, y, h, shade: slope * reach });
      c.drawImage(tex, x * dpr, 0, step * dpr, tex.height, FLAG_X + x, y, step + 0.6, h);
    }

    // Ljus och skugga ritas bara ovanpå tyget (source-atop)
    c.globalCompositeOperation = "source-atop";
    for (const s of slices) {
      const v = s.shade * Math.min(intensity, 1.6);
      c.fillStyle = v > 0 ? `rgba(255,255,255,${Math.min(v * 0.16, 0.3)})` : `rgba(40,20,10,${Math.min(-v * 0.2, 0.34)})`;
      c.fillRect(FLAG_X + s.x, s.y, step, s.h); // exakt en remsa bred, annars blir det ränder där de överlappar
    }
    c.globalCompositeOperation = "source-over";

    // Stången: ljust trä med en liten mässingsknopp
    const pg = c.createLinearGradient(POLE_X - 3, 0, POLE_X + 3, 0);
    pg.addColorStop(0, "#F3E6C4");
    pg.addColorStop(0.5, "#D9BF86");
    pg.addColorStop(1, "#A88652");
    c.fillStyle = pg;
    roundRect(c, POLE_X - 3, 10, 6, CSS_H - 10, 3);
    c.fill();
    const kg = c.createRadialGradient(POLE_X - 1.5, 8, 0.5, POLE_X, 9, 6);
    kg.addColorStop(0, "#FFF6D6");
    kg.addColorStop(1, "#C99A3A");
    c.fillStyle = kg;
    c.beginPath();
    c.arc(POLE_X, 9, 5.5, 0, Math.PI * 2);
    c.fill();
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  return { init, setState };
})();

// --- 6. Tid på platsen + tema efter dygnet ---------------------------
// Open-Meteo ger tider som "2026-09-24T20:12" i platsens egen lokaltid.
// Vi läser dem som om de vore UTC ("…Z") och jämför med "nu på platsen"
// = nu i UTC + platsens tidsskillnad. Då blir det rätt även om telefonen
// står på svensk tid och platsen är en annan tidszon.
function placeMs(iso) {
  return Date.parse(iso + (iso.length <= 16 ? ":00Z" : "Z"));
}
function placeNowMs(weather) {
  const offset = weather?.utc_offset_seconds ?? -new Date().getTimezoneOffset() * 60;
  return Date.now() + offset * 1000;
}
function hhmm(ms) {
  const d = new Date(ms);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}
function duration(ms) {
  const mins = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(mins / 60), m = mins % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

// Teman: "day", "golden" (gyllene timmen runt solnedgång/soluppgång)
// och "night". Går att tvinga fram med ?tema=natt / gyllene / dag i adressen.
const THEME_OVERRIDE = { natt: "night", gyllene: "golden", dag: "day" }[new URLSearchParams(location.search).get("tema")];
const THEME_COLORS = { day: "#FFF8EC", golden: "#FDEBDD", night: "#161E36" };

function applyDaypart(weather) {
  let part = "day";
  const sunrise = weather?.daily?.sunrise?.[0];
  const sunset = weather?.daily?.sunset?.[0];
  if (sunrise && sunset) {
    const now = placeNowMs(weather);
    const rise = placeMs(sunrise), set = placeMs(sunset);
    const MIN = 60000;
    if (now < rise - 40 * MIN || now > set + 45 * MIN) part = "night";
    else if (now > set - 75 * MIN || now < rise + 30 * MIN) part = "golden";
  }
  part = THEME_OVERRIDE ?? part;
  document.documentElement.dataset.daypart = part;
  document.getElementById("themeColor")?.setAttribute("content", THEME_COLORS[part]);
}

// --- 7. Solbågen ----------------------------------------------------
// Bågen är en kvadratisk Bézier-kurva från vänster horisont (soluppgång)
// till höger (solnedgång). Hur långt solen kommit längs dagen (0–1) ger en
// punkt på kurvan. Den redan passerade biten ritas med de Casteljaus
// metod: man delar kurvan vid t och får en ny kontrollpunkt.
const ARC = { p0: [20, 108], p1: [160, -52], p2: [300, 108] };
function arcPoint(t) {
  const u = 1 - t;
  return [
    u * u * ARC.p0[0] + 2 * u * t * ARC.p1[0] + t * t * ARC.p2[0],
    u * u * ARC.p0[1] + 2 * u * t * ARC.p1[1] + t * t * ARC.p2[1],
  ];
}

function renderSun(weather) {
  const sunrise = weather?.daily?.sunrise;
  const sunset = weather?.daily?.sunset;
  if (!sunrise?.[0] || !sunset?.[0]) return;
  const now = placeNowMs(weather);
  const rise = placeMs(sunrise[0]), set = placeMs(sunset[0]);
  const golden = set - 60 * 60000;

  document.getElementById("sunriseTime").textContent = hhmm(rise);
  document.getElementById("sunsetTime").textContent = hhmm(set);

  const countdown = document.getElementById("sunCountdown");
  const sub = document.getElementById("sunSub");
  const dot = document.getElementById("sunDot");
  const glow = document.getElementById("sunGlowDot");
  const done = document.getElementById("arcDone");
  const fill = document.getElementById("arcFillPath");

  if (now < rise) {
    countdown.textContent = `Soluppgång om ${duration(rise - now)}`;
    sub.textContent = `Solen går upp ${hhmm(rise)}`;
  } else if (now > set) {
    const tomorrow = sunrise[1] ? placeMs(sunrise[1]) : null;
    countdown.textContent = "Solen har gått ner";
    sub.textContent = tomorrow ? `Soluppgång imorgon ${hhmm(tomorrow)}, om ${duration(tomorrow - now)}` : "";
  } else {
    countdown.textContent = `Solnedgång om ${duration(set - now)}`;
    sub.textContent = now >= golden ? "Gyllene timmen pågår — dags för terrassen" : `Gyllene timmen börjar ${hhmm(golden)}`;
  }

  if (now >= rise && now <= set) {
    const t = (now - rise) / (set - rise);
    const [x, y] = arcPoint(t);
    const c = [ARC.p0[0] + t * (ARC.p1[0] - ARC.p0[0]), ARC.p0[1] + t * (ARC.p1[1] - ARC.p0[1])];
    done.setAttribute("d", `M${ARC.p0} Q${c} ${x},${y}`);
    fill.setAttribute("d", `M${ARC.p0} Q${c} ${x},${y} L${x},108 Z`);
    dot.setAttribute("cx", x); dot.setAttribute("cy", y);
    glow.setAttribute("cx", x); glow.setAttribute("cy", y);
  } else {
    done.setAttribute("d", "");
    fill.setAttribute("d", "");
    dot.setAttribute("cx", -50);
    glow.setAttribute("cx", -50);
  }
}

// --- 8. Visa data för valt hus -----------------------------
function setLoadingState(beach) {
  document.getElementById("heroBeachName").textContent = beach.name;
  document.getElementById("placeBtnLabel").textContent = beach.name;
  const note = document.getElementById("hefnerNote");
  if (note) note.style.display = "none";
}

// Riktiga källor för flagga/maneter (rapporterat av livräddare) och
// live-webcams, så man kan dubbelkolla med egna ögon. oceanaria.es drivs
// av Málagas universitet i samarbete med Junta de Andalucía.
const OCEANARIA_TORREMOLINOS = "https://oceanaria.es/malaga/torremolinos/playas";
const OCEANARIA_BENALMADENA = "https://oceanaria.es/malaga/benalmadena/playas";
const OCEANARIA_FUENGIROLA = "https://oceanaria.es/malaga/fuengirola/playas";
const FLAG_LINKS = {
  hefner: [
    { label: "Riktig flagga, Torremolinos", url: OCEANARIA_TORREMOLINOS },
    { label: "Riktig flagga, Benalmádena", url: OCEANARIA_BENALMADENA },
    // Webcamen tittar på Bajondillo/La Carihuela, en av Hefners stränder
    { label: "Live-webcam", url: "https://meteo365.es/livecams/torremolinos-bajondillo.php" },
  ],
  // oceanaria.es har ingen egen sida för Torreblanca — Carvajal-La Torre är
  // närmaste strand de faktiskt listar, så länken pekar dit istället.
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

function renderBeach(beach, marine, weather, cachedTs) {
  const waveNow = marine.current?.wave_height ?? null;
  const waterTemp = marine.current?.sea_surface_temperature ?? null;
  const airTemp = weather.current?.temperature_2m ?? null;
  const feelsLike = weather.current?.apparent_temperature ?? null;
  const maxTempToday = weather.daily?.temperature_2m_max?.[0] ?? null;
  const windMs = weather.current?.wind_speed_10m ?? null;
  const uvToday = weather.daily?.uv_index_max?.[0] ?? null;

  state.beachWeather = weather;
  state.beachAir = airTemp;

  // --- Tema + flaggan ---
  applyDaypart(weather);
  const flag = estimateFlag(waveNow, windMs);
  Flag.setState(flag.level, flag.name, windMs);
  document.getElementById("flagLabel").textContent = `${flag.name} flagga`;
  document.getElementById("heroBeachName").textContent = `${beach.name} · ${flag.name.toLowerCase()} flagga`;
  document.getElementById("placeBtnLabel").textContent = beach.name;
  document.getElementById("heroSub").textContent = flag.text;
  renderFlagLinks(beach.id);

  // --- Värdekorten ---
  document.getElementById("statWave").textContent = waveNow != null ? `${fmt(waveNow, 1)} m` : "–";
  document.getElementById("statWaveWord").textContent = waveWord(waveNow);
  document.getElementById("statWaterTemp").textContent = waterTemp != null ? `${fmt(waterTemp, 1)}°` : "–";
  document.getElementById("statWaterNote").textContent = waterWord(waterTemp);
  document.getElementById("statAirTemp").textContent = airTemp != null ? `${Math.round(airTemp)}°` : "–";
  document.getElementById("statAirFeels").textContent =
    feelsLike != null ? `Känns som ${Math.round(feelsLike)}°` : "";
  document.getElementById("statAirMax").textContent =
    maxTempToday != null ? `· max ${Math.round(maxTempToday)}°` : "";
  document.getElementById("statWind").textContent = windMs != null ? `${fmt(windMs, 1)} m/s` : "–";
  document.getElementById("statWindWord").textContent = windWord(windMs);
  const uv = uvInfo(uvToday);
  document.getElementById("statUv").textContent = uvToday != null ? fmt(uvToday) : "–";
  document.getElementById("statUvWord").innerHTML = `<span class="dot" style="background:${uv.color}"></span>${uv.word}`;

  renderSun(weather);
  renderHourly(weather);
  renderForecast(marine, weather);
  renderCompare();

  // --- Senast uppdaterad ---
  const stamp = cachedTs ?? Date.now();
  const prefix = cachedTs ? "Sparad data från" : "Uppdaterad";
  document.getElementById("lastUpdated").textContent =
    `${prefix} ${new Date(stamp).toLocaleString("sv-SE", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}`;

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
    const dayName = date.toLocaleDateString("sv-SE", { weekday: "short" }).replace(".", "");
    const tMax = weather.daily.temperature_2m_max?.[i];
    const tMin = weather.daily.temperature_2m_min?.[i];
    const code = weather.daily.weather_code?.[i];
    const wave = marine?.daily?.wave_height_max?.[i];

    const el = document.createElement("div");
    el.className = "forecast-day";
    el.innerHTML = `
      <div class="day-name">${dayName}</div>
      <div class="day-icon">${weatherIcon(code)}</div>
      <div class="day-temp">${tMax != null ? Math.round(tMax) : "–"}° <span class="min">${tMin != null ? Math.round(tMin) : "–"}°</span></div>
      ${marine ? `<div class="day-wave">${wave != null ? fmt(wave, 1) + " m vågor" : "–"}</div>` : ""}
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
  const isDay = weather.hourly?.is_day ?? [];
  const rain = weather.hourly?.precipitation_probability ?? [];
  const nowIso = weather.current?.time;

  if (!nowIso || times.length === 0) {
    row.innerHTML = '<p class="hourly-empty">Ingen timprognos tillgänglig just nu.</p>';
    return;
  }

  // Hitta index för nästa kommande timme. ISO-tider med fast bredd
  // ("2026-08-05T08:00") går att jämföra som vanliga strängar.
  const nowPrefix = nowIso.slice(0, 13);
  let startIdx = times.findIndex((t) => t >= nowPrefix);
  if (startIdx === -1) startIdx = 0;

  times.slice(startIdx, startIdx + 24).forEach((t, idx) => {
    const i = startIdx + idx;
    const temp = temps[i];
    const chance = rain[i];
    const el = document.createElement("div");
    el.className = "hour-card" + (idx === 0 ? " now" : "");
    el.innerHTML = `
      <span class="hour-label">${idx === 0 ? "Nu" : t.slice(11, 13)}</span>
      <span class="hour-icon">${weatherIcon(codes[i], isDay[i] ?? 1)}</span>
      <span class="hour-temp">${temp != null ? Math.round(temp) + "°" : "–"}</span>
      ${chance >= 20 ? `<span class="hour-rain">${chance}%</span>` : ""}
    `;
    row.appendChild(el);
  });
}

// --- 9. Spanien mot Västerås ------------------------------------------
// Ritas först när BÅDA platsernas data har kommit in. Staplarnas längd
// räknas ut från det lägsta och högsta värdet av alla tio temperaturer,
// så skillnaden syns tydligt oavsett årstid.
function renderCompare() {
  const es = state.beachWeather, se = state.homeWeather;
  const chip = document.getElementById("diffChip");
  if (!es || !se) return;

  if (state.beachAir != null && se.current?.temperature_2m != null) {
    const diff = Math.round(state.beachAir - se.current.temperature_2m);
    chip.hidden = false;
    chip.textContent = diff > 0 ? `${diff}° kallare än här` : diff < 0 ? `${-diff}° varmare än här` : "Lika varmt som här";
  }

  const rows = document.getElementById("compareRows");
  const esMax = es.daily?.temperature_2m_max ?? [];
  const seMax = se.daily?.temperature_2m_max ?? [];
  const n = Math.min(5, esMax.length, seMax.length);
  const all = [...esMax.slice(0, n), ...seMax.slice(0, n)].filter((v) => v != null);
  const lo = Math.min(...all) - 3, hi = Math.max(...all);
  const pct = (v) => 22 + 78 * ((v - lo) / (hi - lo || 1));

  rows.innerHTML = "";
  for (let i = 0; i < n; i++) {
    const day = i === 0 ? "Idag" : new Date(es.daily.time[i]).toLocaleDateString("sv-SE", { weekday: "short" }).replace(".", "");
    const el = document.createElement("div");
    el.className = "compare-row";
    el.innerHTML = `
      <span class="compare-day">${day}</span>
      <span class="compare-bars">
        <span class="compare-bar es" data-w="${pct(esMax[i])}">${Math.round(esMax[i])}°</span>
        <span class="compare-bar se" data-w="${pct(seMax[i])}">${Math.round(seMax[i])}°</span>
      </span>`;
    rows.appendChild(el);
  }
  rows.insertAdjacentHTML("beforeend",
    `<div class="compare-legend"><span><i style="background:var(--teja)"></i>Spanien, max</span><span><i style="background:#5E9CC8"></i>Västerås, max</span></div>`);
  // Staplarna växer ut från 0 — nästa bildruta så att CSS-övergången syns
  requestAnimationFrame(() => requestAnimationFrame(() => {
    rows.querySelectorAll(".compare-bar").forEach((b) => { b.style.width = b.dataset.w + "%"; });
  }));
}

// --- 10. Scroll-effekter ---------------------------------------------
function initScrollReveal() {
  const targets = document.querySelectorAll(".flag-about, .stats, .sun-card, .hourly, .forecast, .stores, .transport, .fx, .home-card");
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
    { threshold: 0.12 }
  );
  targets.forEach((el) => observer.observe(el));
}

// Topbar: transparent över fotot, frostat glas när man scrollat förbi
function initTopbarScroll() {
  const topbar = document.getElementById("topbar");
  if (!topbar) return;
  const onScroll = () => topbar.classList.toggle("scrolled", window.scrollY > 40);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

// Hero-fotot rör sig långsammare än sidan (parallax)
function initHeroParallax() {
  const bg = document.getElementById("heroPhotoBg");
  const hero = document.getElementById("flagHero");
  if (!bg || !hero) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const rect = hero.getBoundingClientRect();
      bg.style.transform = `translateY(${(rect.top * -0.25).toFixed(1)}px)`;
      ticking = false;
    });
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

// --- Count-up: siffrorna räknar upp från 0 när de får ett nytt värde --
// Läser talet ur texten (t.ex. "0,4 m" eller "24°"), animerar siffran
// och skriver tillbaka hela texten (inkl. enhet) på sista bildrutan.
function animateCountUp(el) {
  if (!el || el.dataset.counting === "1") return;
  const text = el.textContent.trim();
  const match = text.match(/-?\d+([.,]\d+)?/);
  if (!match) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const sep = match[0].includes(",") ? "," : ".";
  const target = parseFloat(match[0].replace(",", "."));
  const decimals = match[1] ? match[1].length - 1 : 0;
  const prefix = text.slice(0, match.index);
  const suffix = text.slice(match.index + match[0].length);

  el.dataset.counting = "1";
  const duration = 900;
  const start = performance.now();

  function frame(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 4);
    el.textContent = `${prefix}${(target * eased).toFixed(decimals).replace(".", sep)}${suffix}`;
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
  document.querySelectorAll(".stat-value").forEach(animateCountUp);
}

// --- 11. Hem-medelvärden (Hefner / Ehrborg) --------------------------
// Generisk laddning för ett "hem" (medelvärde av en eller flera stränder).
async function loadHomeAverage(homeId, memberIds, displayName) {
  setLoadingState({ name: displayName });

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

    renderBeach({ id: homeId, name: displayName }, marineSynth, weatherSynth);
    showHomeNote(homeId);
    localStorage.setItem(`badapp:${homeId}`, JSON.stringify({ marine: marineSynth, weather: weatherSynth, ts: Date.now() }));
  } catch (err) {
    console.error(err);
    const cached = localStorage.getItem(`badapp:${homeId}`);
    if (cached) {
      const { marine, weather, ts } = JSON.parse(cached);
      renderBeach({ id: homeId, name: displayName }, marine, weather, ts);
      showHomeNote(homeId);
    } else {
      document.getElementById("heroSub").textContent = "Ingen kontakt";
      document.getElementById("lastUpdated").textContent = "Kunde inte hämta data — dra ner för att försöka igen";
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

  const repIdx = Math.min(2, weathers.length - 1);
  const rep = weathers[repIdx];
  const repMarine = marines[repIdx];

  const marineSynth = {
    current: { wave_height: avg(waveVals), sea_surface_temperature: avg(waterVals) },
    daily: repMarine.daily,
  };
  const weatherSynth = {
    utc_offset_seconds: rep.utc_offset_seconds,
    current: {
      time: rep.current?.time,
      temperature_2m: avg(airVals),
      apparent_temperature: avg(feelsVals),
      wind_speed_10m: avg(windVals),
      is_day: rep.current?.is_day,
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

// --- 12. Västerås -----------------------------------------------------
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
  state.homeWeather = data;
  const temp = data.current?.temperature_2m;
  const feelsLike = data.current?.apparent_temperature;
  const maxTempToday = data.daily?.temperature_2m_max?.[0];
  const wind = data.current?.wind_speed_10m;
  document.getElementById("homeTemp").textContent = temp != null ? `${Math.round(temp)}°` : "–";
  document.getElementById("homeFeels").textContent = feelsLike != null ? `känns som ${Math.round(feelsLike)}°` : "";
  document.getElementById("homeMax").textContent = maxTempToday != null ? `max ${Math.round(maxTempToday)}°` : "";
  document.getElementById("homeWind").textContent = wind != null ? `${fmt(wind, 1)} m/s` : "–";
  document.getElementById("homeCond").innerHTML = weatherIcon(data.current?.weather_code, data.current?.is_day ?? 1);
  renderHourly(data, "homeHourlyRow");
  renderCompare();
  animateCountUp(document.getElementById("homeTemp"));
}

// --- 13. Mataffärer nära respektive hem -------------------------------
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
      brandFg: "#ffffff",
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
      short: "Mercado",
      brandBg: "#00695C",
      brandFg: "#ffffff",
      distance: "~2,3 km · med L-5-bussen",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Mercado+Virgen+del+Carmen+Los+Boliches+Fuengirola",
      hours: { mon: { open: "08:30", close: "15:00" }, tue: { open: "08:30", close: "15:00" }, wed: { open: "08:30", close: "15:00" }, thu: { open: "08:30", close: "15:00" }, fri: { open: "08:30", close: "15:00" }, sat: { open: "09:00", close: "13:30" } },
    },
  ],
};

// De stora, nationellt obligatoriska stängningsdagarna i Spanien.
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
    } else if (todayHours) {
      const nowMin = now.getHours() * 60 + now.getMinutes();
      const [oh, om] = todayHours.open.split(":").map(Number);
      const [ch, cm] = todayHours.close.split(":").map(Number);
      const openMin = oh * 60 + om;
      const closeMin = ch * 60 + cm;
      if (nowMin >= openMin && nowMin < closeMin) {
        statusClass = "open";
        statusText = "Öppet";
        hoursText = `till ${todayHours.close}`;
      } else {
        statusText = "Stängt";
        hoursText = nowMin < openMin ? `öppnar ${todayHours.open}` : "öppnar imorgon";
      }
    }

    const el = document.createElement("a");
    el.className = "store-card";
    el.href = store.mapsUrl;
    el.target = "_blank";
    el.rel = "noopener";
    el.setAttribute("aria-label", `${store.name}, ${statusText} ${hoursText}, öppna i kartan`);
    el.innerHTML = `
      <div class="store-top">
        <span class="store-badge" style="background:${store.brandBg};color:${store.brandFg}">${store.short}</span>
        <svg class="store-arrow" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M9 7h8v8"/></svg>
      </div>
      <div class="store-status ${statusClass}">${statusText}</div>
      <div class="store-hours">${hoursText || "&nbsp;"}</div>
      <div class="store-dist">${store.distance}</div>
    `;
    row.appendChild(el);
  });
}

// --- 14. Euro ↔ kronor --------------------------------------------------
// Kursen kommer från Frankfurter (Europeiska centralbankens dagliga kurs,
// gratis, ingen nyckel). Sparas lokalt så räknaren funkar även utan nät.
async function initFx() {
  const eurIn = document.getElementById("fxEur");
  const sekIn = document.getElementById("fxSek");
  const rateEl = document.getElementById("fxRate");
  if (!eurIn || !sekIn) return;

  let rate = null;
  let rateDate = null;
  try {
    const cached = JSON.parse(localStorage.getItem("badapp:fx") || "null");
    if (cached) ({ rate, date: rateDate } = cached);
  } catch {}

  const parse = (s) => parseFloat(String(s).replace(/\s/g, "").replace(",", "."));
  const show = (n, max) => (isFinite(n) ? n.toLocaleString("sv-SE", { maximumFractionDigits: max }) : "");

  function fromEur() {
    if (!rate) return;
    const e = parse(eurIn.value);
    const s = e * rate;
    sekIn.value = isFinite(s) ? show(s, s < 100 ? 2 : 0) : "";
  }
  function fromSek() {
    if (!rate) return;
    const s = parse(sekIn.value);
    eurIn.value = show(s / rate, 2);
  }
  function showRate() {
    if (!rate) { rateEl.textContent = "Ingen kurs just nu — försök igen när du har nät."; return; }
    const d = rateDate ? new Date(rateDate).toLocaleDateString("sv-SE", { day: "numeric", month: "short" }) : "";
    rateEl.textContent = `1 € = ${show(rate, 2)} kr · ECB:s kurs ${d}`;
  }

  eurIn.addEventListener("input", fromEur);
  sekIn.addEventListener("input", fromSek);
  document.querySelectorAll("#fxChips button").forEach((b) =>
    b.addEventListener("click", () => { eurIn.value = b.dataset.eur; fromEur(); })
  );

  showRate();
  fromEur();

  try {
    const res = await fetch("https://api.frankfurter.dev/v1/latest?from=EUR&to=SEK");
    if (!res.ok) throw new Error("fx");
    const data = await res.json();
    rate = data.rates.SEK;
    rateDate = data.date;
    localStorage.setItem("badapp:fx", JSON.stringify({ rate, date: rateDate }));
  } catch (err) {
    console.warn("Valutakurs kunde inte hämtas", err);
  }
  showRate();
  fromEur();
}

// --- 15. Platsväljaren (fullskärmsvy) ---------------------------------
// Små illustrationer för de två husen: vitt hus med tegeltak, och en
// citron (Hefner) respektive en palm (Ehrborg) bredvid.
const HOUSE_ART = {
  hefner: `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="12" y="28" width="30" height="26" rx="3" fill="#FFFDF8" stroke="#E4D3BA" stroke-width="1.5"/><path d="M8 30L27 15l19 15z" fill="var(--teja)" stroke-linejoin="round"/><rect x="23" y="40" width="8" height="14" rx="4" fill="#6EAED8"/><rect x="15" y="34" width="6" height="6" rx="2" fill="#6EAED8" opacity=".6"/><circle cx="50" cy="40" r="9" fill="var(--hoja)"/><rect x="49" y="46" width="2.4" height="9" rx="1" fill="#8A6A45"/><ellipse cx="47" cy="38" rx="3" ry="2.4" fill="var(--limon)"/><ellipse cx="53.5" cy="42" rx="2.8" ry="2.2" fill="var(--limon)"/></svg>`,
  ehrborg: `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="8" y="30" width="30" height="24" rx="3" fill="#FFFDF8" stroke="#E4D3BA" stroke-width="1.5"/><path d="M5 32L23 18l18 14z" fill="var(--teja)"/><rect x="18" y="41" width="8" height="13" rx="4" fill="#6EAED8"/><path d="M50 55c0-10 1-18-1-26" stroke="#8A6A45" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M49 28c-5-5-11-4-13 0 4-2 8-1 13 0zM49 28c5-6 11-5 13-1-4-2-8-1-13 1zM49 28c-1-6 2-10 6-11-2 3-4 6-6 11zM49 28c-3-3-3-8-1-11 0 4 1 7 1 11z" fill="var(--hoja)"/><circle cx="56" cy="10" r="4" fill="var(--limon)"/></svg>`,
};

function buildLocationGrid(activeId, onSelect) {
  const homeGrid = document.getElementById("homeGrid");
  if (!homeGrid) return;
  homeGrid.innerHTML = "";
  HOMES.forEach((h) => {
    const btn = document.createElement("button");
    btn.className = "home-choice" + (h.id === activeId ? " active" : "");
    btn.innerHTML = `${HOUSE_ART[h.id]}<span class="home-choice-name">${h.name}</span><span class="home-choice-sub">${h.sub}</span>`;
    btn.addEventListener("click", () => onSelect(h.id));
    homeGrid.appendChild(btn);
  });
}

function showLocationPicker() {
  const picker = document.getElementById("locationPicker");
  if (picker) picker.hidden = false;
  document.getElementById("pickerClose").hidden = !savedHomeId();
  document.body.classList.add("picking-location");
}

function hideLocationPicker() {
  const picker = document.getElementById("locationPicker");
  if (picker) picker.hidden = true;
  document.body.classList.remove("picking-location");
}

// --- 16. Dra ner för att uppdatera -------------------------------------
// Följer fingret när man drar nedåt högst upp på sidan. En citron rullar
// ner (roterar i takt med dragningen). Släpper man efter tillräckligt
// långt drag laddas all data om, och citronen snurrar tills det är klart.
function initPullToRefresh() {
  const ptr = document.getElementById("ptr");
  if (!ptr) return;
  const THRESHOLD = 72;
  let startY = null, pull = 0, busy = false;

  const set = (y, rot, o) => {
    ptr.style.setProperty("--ptr-y", `${y}px`);
    ptr.style.setProperty("--ptr-rot", `${rot}deg`);
    ptr.style.setProperty("--ptr-o", o);
  };

  window.addEventListener("touchstart", (e) => {
    if (busy || window.scrollY > 0 || document.body.classList.contains("picking-location")) return;
    startY = e.touches[0].clientY;
    pull = 0;
    ptr.classList.remove("releasing");
  }, { passive: true });

  window.addEventListener("touchmove", (e) => {
    if (startY == null) return;
    const dy = e.touches[0].clientY - startY;
    if (dy <= 0) { set(-70, 0, 0); pull = 0; return; }
    if (e.cancelable) e.preventDefault(); // stoppa webbläsarens egen studs
    pull = Math.min(dy * 0.5, 120);        // motstånd: citronen rör sig halva fingerlängden
    set(-60 + pull, pull * 3.2, Math.min(pull / THRESHOLD, 1));
  }, { passive: false });

  window.addEventListener("touchend", async () => {
    if (startY == null) return;
    startY = null;
    ptr.classList.add("releasing");
    if (pull < THRESHOLD) { set(-70, 0, 0); return; }
    busy = true;
    set(70, 0, 1);
    ptr.classList.add("loading");
    if (navigator.vibrate) navigator.vibrate(12);
    await refreshAll();
    ptr.classList.remove("loading");
    set(-70, 0, 0);
    busy = false;
  });
}

// --- 17. Starta appen ---------------------------------------------------
const HOME_SECTION_IDS = ["hefnerSection", "ehrborgSection"];

// Sparat val från förr kan vara en enskild strand som inte finns längre —
// då räknas det som inget val, och man får välja hus på nytt.
function savedHomeId() {
  const id = localStorage.getItem("badapp:lastBeach");
  return HOMES.some((h) => h.id === id) ? id : null;
}

function currentId() {
  return savedHomeId() || DEFAULT_BEACH_ID;
}

// Laddar rätt hus. Allt som inte är Ehrborg blir Hefner.
function loadForId(beachId) {
  if (beachId === "ehrborg") return loadHomeAverage("ehrborg", EHRBORG_MEMBER_IDS, "La casa del Ehrborg");
  return loadHomeAverage("hefner", HEFNER_MEMBER_IDS, "La casa del Hefner");
}

function refreshAll() {
  const btn = document.getElementById("refreshBtn");
  btn?.classList.add("spinning");
  return Promise.all([loadForId(currentId()), loadHome()]).finally(() => btn?.classList.remove("spinning"));
}

function selectBeach(beachId) {
  localStorage.setItem("badapp:lastBeach", beachId);
  buildLocationGrid(beachId, (id) => {
    selectBeach(id);
    hideLocationPicker();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  HOME_SECTION_IDS.forEach((sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) section.style.display = sectionId === `${beachId}Section` ? "block" : "none";
  });

  loadForId(beachId);
}

function init() {
  // Ikoner i de små statistikkorten
  document.querySelectorAll("[data-icon]").forEach((el) => { el.innerHTML = STAT_ICONS[el.dataset.icon] ?? ""; });
  Flag.init(document.getElementById("flagCanvas"));
  if (THEME_OVERRIDE) document.documentElement.dataset.daypart = THEME_OVERRIDE;

  const savedId = savedHomeId();
  if (!savedId) showLocationPicker();
  selectBeach(savedId || DEFAULT_BEACH_ID);

  document.getElementById("changeLocationBtn")?.addEventListener("click", showLocationPicker);
  document.getElementById("pickerClose")?.addEventListener("click", hideLocationPicker);
  document.getElementById("refreshBtn")?.addEventListener("click", refreshAll);

  loadHome();
  renderStores("storesRow", STORES_BY_HOME.hefner);
  renderStores("ehrborgStoresRow", STORES_BY_HOME.ehrborg);
  initFx();
  initScrollReveal();
  initTopbarScroll();
  initHeroParallax();
  initPullToRefresh();

  // Solbågen, temat och butikernas öppet/stängt uppdateras varje minut
  // så att appen stämmer även om den ligger öppen länge.
  setInterval(() => {
    if (!state.beachWeather) return;
    renderSun(state.beachWeather);
    applyDaypart(state.beachWeather);
    renderStores("storesRow", STORES_BY_HOME.hefner);
    renderStores("ehrborgStoresRow", STORES_BY_HOME.ehrborg);
  }, 60000);
}

init();

// --- 18. PWA: registrera service worker --------------------------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((err) => console.warn("SW-registrering misslyckades", err));
  });
}
