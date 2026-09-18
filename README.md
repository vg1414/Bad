# Badläget — Costa del Sol

En liten webbapp (PWA) som visar aktuellt badläge för stränderna i Torremolinos/Benalmádena, samt vädret hemma i Västerås.

Live: https://vg1414.github.io/Bad/

## Funktioner

- **Flera stränder att välja mellan**, inklusive "La casa del Hefner" — ett medelvärde av Playa del Saltillo, La Carihuela, Playa José och Fuente de la Salud
- **Uppskattad flaggfärg** (grön/gul/röd) baserat på våghöjd och vind, eftersom ingen gratis officiell källa finns — tydligt markerad som en uppskattning, med länk till den officiella flaggan (oceanaria.es) och webcam
- **Väderkort**: våghöjd, vattentemp, lufttemp (inkl. "känns som" och dagens max), vind, UV-index, sol upp/ner
- **Timprognos** för resten av dagen (temp + väderikon per timme)
- **Flerdagarsprognos** (5 dagar)
- **Närmaste mataffärer** med dagsaktuella öppettider, klickbara till Google Maps
- **Tåg från El Pinillo** mot Málaga och Fuengirola, länkar till Google Maps för aktuella avgångar
- **Vädret hemma i Västerås**, med samma typ av timme- och dagsprognos
- **Platsval**: första gången väljer man plats i en fullskärmsvy, valet sparas som förval — byt plats när som helst via husikonen i menyn
- **Hero-foto** från La casa del Hefners takterrass med parallax-scroll, med flaggan och badläge-status i ett expanderbart glaskort ovanpå
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
