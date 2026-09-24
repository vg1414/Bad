# Badläget — Costa del Sol

En liten webbapp (PWA) som visar aktuellt badläge för stränderna i Torremolinos/Benalmádena/Fuengirola, samt vädret hemma i Västerås.

Live: https://vg1414.github.io/Bad/

## Funktioner

- **Två hus att välja mellan** i en fullskärmsväljare (valet sparas som förval, byt via platsnamnet högst upp):
  - **La casa del Hefner** — medelvärde av Playa del Saltillo, La Carihuela, Playa José och Fuente de la Salud
  - **La casa del Ehrborg** — baserat på Playa de Torreblanca, närmaste strand från Calle las Tórtolas 14
- **Vajande flagga** (grön/gul/röd) ritad på canvas, uppskattad från våghöjd och vind — tyget böljar i remsor med ljus och skugga, och vinden styr hur mycket den fladdrar. Tydligt markerad som uppskattning, med länkar till den officiella flaggan (oceanaria.es) och webcam
- **Tema efter tid på dygnet**: dag, gyllene timmen runt solnedgången, och natt med stjärnhimmel (styrs av solens upp/nedgång på platsen; kan tvingas med `?tema=dag|gyllene|natt`)
- **Väderkort**: vattentemp och lufttemp (inkl. "känns som" och dagens max), vågor, vind och UV med korta ordbeskrivningar
- **Solbåge** som visar var solen står, med nedräkning till solnedgång/soluppgång och gyllene timmen
- **Timprognos** (24 h, med regnrisk och måne på natten) och **flerdagarsprognos** (5 dagar)
- **Närmaste mataffärer** med dagsaktuella öppettider, klickbara till Google Maps — egna listor för Hefner och Ehrborg
- **Transport**: tåg från El Pinillo (Hefner) mot Málaga, Fuengirola och Plaza Mayor; för Ehrborg lokalbussen L-5 och tåg från Torreblanca station mot Málaga och Fuengirola — länkar till Google Maps med riktiga avgångstider
- **Euro ↔ kronor**-räknare med ECB:s dagskurs (sparas för användning utan nät)
- **Vädret hemma i Västerås** med timprognos, samt jämförelse "Spanien mot Västerås" för kommande dagar
- **Dra ner för att uppdatera** (en citron rullar ner), plus uppdatera-knapp
- Hero-foto från terrassen med parallax och bågad markis-kant
- Fungerar som installerbar PWA (manifest + service worker + ikoner)

## Datakälla

All väder- och vågdata hämtas från [Open-Meteo](https://open-meteo.com) (gratis, ingen API-nyckel krävs). Valutakursen kommer från [Frankfurter](https://frankfurter.dev) (ECB:s referenskurser).

## Teknik

Ren HTML/CSS/JS utan byggsteg eller ramverk. Hostas på GitHub Pages.

## Filer

| Fil | Syfte |
|---|---|
| `index.html` | Sidstruktur |
| `style.css` | Utseende |
| `app.js` | All logik: datahämtning, flaggberäkning, rendering |
| `manifest.json` | PWA-manifest |
| `sw.js` | Service worker (offline-stöd) |
| `icon-192.png`, `icon-512.png` | App-ikoner |
| `images/` | Foton som används i gränssnittet (t.ex. hero-bilden) |
| `beta/` | Omdirigering till huvudsidan (beta-versionen blev live 2026-09-24) |
| `PROGRESS.md` | Utvecklingslogg (används av Claude mellan sessioner) |

## Återgå till gamla designen

Versionen före redesignen är sparad med git-taggen `original`.

---
Made by: David Hefner
