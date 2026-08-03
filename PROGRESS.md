# Projekt: Bad-appen (PWA för stränder + väder hemma)

En liten enkel logg över vad som är gjort, vad som pågår, och vad som är kvar.
Jag (Claude) läser alltid denna filen först när vi fortsätter projektet.

## Bestämt tillsammans med David
- Flera stränder ska gå att välja mellan (chip-väljare)
- Förvald strand: **Playa del Saltillo** (Torremolinos, vid Lidl/N-340, gränsen mot Benalmádena)
- Flaggfärg finns ingen gratis officiell källa för → vi **uppskattar** den från våghöjd + vind
  (samma princip som sajten snowy.es använder), och märker tydligt att det är en uppskattning
- Maneter kan inte hämtas automatiskt (ingen öppen källa) → länk till officiella Infomedusa-appen istället
- Datakälla: Open-Meteo (gratis, ingen nyckel)
- Hostas på Cloudflare Pages, som Krokens Copa
- "Made by David Hefner" diskret i sidfoten

## Klart
- [x] Krav insamlade, plan godkänd
- [x] Hittat koordinater för stränderna
- [x] Designplan (färger, typsnitt, layout) bestämd

## Pågår / Kvar att göra
- [ ] Bygga index.html + style.css + app.js
- [ ] Flagg-logik (grön/gul/röd) från våg + vind
- [ ] Väderkort: lufttemp, vattentemp, vind, UV, sol upp/ner, 3-dagarsprognos
- [ ] Västerås-ruta separat
- [ ] PWA-filer: manifest.json, service worker, ikoner
- [ ] Testa i webbläsare / rätta buggar
- [ ] Instruktioner till David för att lägga upp på Cloudflare Pages

## Anteckningar
- Ingen live-server i denna sandbox kan nå open-meteo.com (nätverksbegränsning här),
  men det spelar ingen roll — koden körs i Davids egen webbläsare, inte i sandboxen.
  API-parametrarna är verifierade mot Open-Metheos officiella dokumentation.
