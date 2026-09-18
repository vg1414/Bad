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
- [x] index.html, style.css, app.js, manifest.json, sw.js, ikoner byggda
- [x] Pushat till GitHub: vg1414/Bad, live via GitHub Pages: https://vg1414.github.io/Bad/
- [x] Fixad bugg: flaggan låg över texten på mobil
- [x] Timprognos idag (temp + väderikon per timme, resten av dagen)
- [x] Lagt till tågkort mot Plaza Mayor (M​álaga), samma mönster som Málaga/Fuengirola
- [x] Byggt om tåg-sektionen: ett kort per destination (Málaga/Fuengirola/Plaza Mayor)
  med Till+Från-knappar i samma kort, istället för separata dit/hem-rader. Undersökte
  GTFS-baserade tågtider (Renfe/Adif öppen data) men avfärdade det — ger bara statiska
  tabelltider utan realtid och kräver mycket infrastruktur, samma problem som fick
  David att ta bort en tidigare liknande lösning (commit 03dcaf5)

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
- Butikernas öppettider (STORES i app.js) är manuellt inlagda och bör dubbelkollas
  då och då. Websökningar för att verifiera dem ger ofta motstridiga uppgifter
  mellan olika tredjepartssidor (bekräftat 2026-09-18) — Davids egna iakttagelser
  på plats väger tyngre än det. Lidl-filialens place_id (ChIJF6BlGHr8cg0RCrq8w6A52K8)
  är verifierad till Av. Carlota Alessandri 288, vilket är den Lidl som ligger
  närmast El Pinillo/hemadressen (den andra Torremolinos-filialen, C/ de la Cruz 69,
  ligger ~2,3 km bort) — koden pekar redan rätt, ingen ändring behövdes.
- 2026-09-18: Öppettider verifierade via skärmdumpar från David (Google Maps):
  Lidl (Av. Carlota Alessandri 288) ändrad till 21:30 stängning alla dagar (var 22:00).
  Dia (DIA Maxi) ändrad till 21:30 mån-lör (var 22:00), sön 15:00 bekräftad oförändrad.
  Carrefour bekräftad oförändrad (09-22 mån-lör, 10-22 sön).
  Mercadona (Av. Alcalde Miguel Escalona Quesada, place_id ChIJXRr-ufD9cg0RRHg-ptLm7Po)
  INTE verifierad — Maps-uppgiften där var 12 veckor gammal och bedömdes otillförlitlig,
  och ingen pålitlig alternativ källa hittades (Mercadonas egen sajt blockerar
  automatisk hämtning, tredjepartssidor motsäger varandra). Nuvarande värden i koden
  (mån-lör 09-22, sön 09-15) är alltså overifierade gissningar — dubbelkolla på plats
  eller skicka en färsk skärmdump när det går.
