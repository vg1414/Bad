# Badläget — Costa del Sol

En liten webbapp (PWA) som visar aktuellt badläge för stränderna i Torremolinos/Benalmádena/Fuengirola, samt vädret hemma i Västerås.

Live: https://vg1414.github.io/Bad/

## Funktioner

- **Flera stränder att välja mellan**, inklusive två "hem" (medelvärden):
  - **La casa del Hefner** — medelvärde av Playa del Saltillo, La Carihuela, Playa José och Fuente de la Salud
  - **La casa del Ehrborg** — baserat på Playa de Torreblanca, närmaste strand från Calle las Tórtolas 14
- **Uppskattad flaggfärg** (grön/gul/röd) baserat på våghöjd och vind, eftersom ingen gratis officiell källa finns — tydligt markerad som en uppskattning, med länk till den officiella flaggan (oceanaria.es) och webcam
- **Väderkort**: våghöjd, vattentemp, lufttemp (inkl. "känns som" och dagens max), vind, UV-index, sol upp/ner
- **Timprognos** för resten av dagen (temp + väderikon per timme)
- **Flerdagarsprognos** (5 dagar)
- **Närmaste mataffärer** med dagsaktuella öppettider, klickbara till Google Maps — egna listor för Hefner och Ehrborg
- **Transport**: tåg från El Pinillo (Hefner) mot Málaga och Fuengirola, samt för Ehrborg lokalbussen L-5 till Mercado de Los Boliches och tåg från Fuengirola station — länkar till Google Maps/officiell tidtabell för aktuella tider
- **Vädret hemma i Västerås**, med samma typ av timme- och dagsprognos
- **Platsval**: första gången väljer man plats i en fullskärmsvy, valet sparas som förval — byt plats när som helst via husikonen i menyn
- **Hero-foto** med parallax-scroll, med flaggan och badläge-status i ett expanderbart glaskort ovanpå
- Fungerar som installerbar PWA (manifest + service worker + ikoner)

## Datakälla

All väder- och vågdata hämtas från [Open-Meteo](https://open-meteo.com) (gratis, ingen API-nyckel krävs).

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
| `PROGRESS.md` | Utvecklingslogg (används av Claude mellan sessioner) |

---
Made by: David Hefner
