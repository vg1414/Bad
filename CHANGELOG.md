# Changelog

Alla ändringar i projektet loggas här med datum.

## 2026-09-24 (nya designen live)
- Beta-versionen ("Citron & terrakotta") ersätter nu den riktiga appen på huvudadressen — se de två beta-posterna nedan för allt som ändrats
- `beta/` är nu bara en omdirigering till huvudsidan, och beta-appens service worker tar bort sig själv
- Service workern hämtar nu sidans filer med "no-cache", så nya versioner syns direkt istället för efter upp till 10 minuter
- Manifestets bakgrunds- och temafärg bytta till den nya kalkvita tonen (#FFF8EC)
- README uppdaterad med de nya funktionerna
- Gamla designen finns kvar i git-taggen `original`

## 2026-09-24 (beta: bara husen, Torreblanca station)
- Platsväljaren visar nu bara La casa del Hefner och La casa del Ehrborg — de enskilda stränderna är borttagna (de används fortfarande i bakgrunden för husens medelvärden). Den som hade en enskild strand sparad får välja hus på nytt
- Live-webcamen (Bajondillo/La Carihuela) ligger nu under Hefners flagglänkar
- Ehrborg: tåget går nu från Torreblanca station (~1 km, 12–15 min promenad) istället för Fuengirola station (~2 km), med kort både mot Málaga och Fuengirola. Kartlänkarna utgår från huset så promenaden räknas med
- Fix: stäng-knappen i platsväljaren döljs första gången man öppnar appen

## 2026-09-24 (beta: ny design "Citron & terrakotta")
- Ny version att testa på `/beta/` — den vanliga appen är orörd. Originalet är sparat med git-taggen `original`
- Ny mjuk stil med färger från terrassfotot (kalkvitt, citron, taktegel, himmel), typsnitten Fraunces + Nunito och egna väderikoner istället för emojis
- Ny flagga ritad på canvas: tyget vajar i remsor med ljus och skugga, texten följer med i vecken, vinden styr fart och kraft
- Hero-fotot slutar i en bågad markis-kant
- Tema efter tid på dygnet: dag, gyllene timmen (persika) och natt (bläckblått med stjärnor)
- Solbåge med nedräkning till solnedgång/soluppgång och gyllene timmen
- Spanien mot Västerås: "X° kallare än här" + staplar för kommande dagar
- Euro ↔ kronor-räknare med ECB:s dagskurs
- Dra ner för att uppdatera (en citron rullar ner)
- Timprognosen visar regnrisk och måne på natten; ordbeskrivningar för vågor, vind, UV och vattentemp

## 2026-09-20 (vind i m/s)
- Bytte vindenhet från km/h till m/s (standarden i svenska väderrapporter) — hämtas nu direkt i m/s från Open-Meteo, och flaggans gul/röd-trösklar är omräknade så de slår in vid samma verkliga vindstyrka som innan

## 2026-09-20 (smalare flagga)
- Gjorde flaggan i hero-fotot smalare i förhållande till höjden, både på desktop och mobil — den kändes för bred/banderoll-lik innan

## 2026-09-20 (rättad flagglänk för Ehrborg)
- oceanaria.es listar inte Torreblanca med eget namn — bytte flagglänkens text från generiska "Fuengirola" till "Carvajal-La Torre", närmaste strand som faktiskt finns med på deras sida

## 2026-09-18 (nytt appnamn)
- Bytte appens namn på hemskärmen från "Badläget" till "Spanien" (i `manifest.json`) — de som redan lagt till appen behöver ta bort och lägga till den på nytt för att se det nya namnet

## 2026-09-18 (installationstips på väljarvyn)
- Lade till en hopfällbar installationsguide längst ner på platsväljaren, med steg för att lägga till appen på hemskärmen på både iPhone (Safari) och Android (Chrome)

## 2026-09-18 (nytt boende: La casa del Ehrborg)
- Nytt "hem" i platsväljaren: La casa del Ehrborg (Calle las Tórtolas 14, Torreblanca/Fuengirola), med samma typ av medelvärdesberäkning som Hefner — här baserat på närmaste strand, Playa de Torreblanca
- Egna mataffärer nära Ehrborg (Alsara Express, Maxi Market, Covirán) samt Mercado Virgen del Carmen i Los Boliches, som nås med lokalbussen
- Nytt transportavsnitt för Ehrborg: L-5-lokalbussen (hållplats C/ Tórtolas–Dalias, länk till officiell tidtabell) samt tåg från Fuengirola station mot Málaga (samma linje som passerar Torremolinos)
- Tog bort bildtexten "Utsikten från La casa del Hefner" under hero-fotot, eftersom fotot nu representerar båda boendena
- Städade bort namnet "Hefner" som stod hårdkodat på flera ställen i koden (mataffärer, tåg, medelvärdesberäkning) — allt är nu datadrivet per hem så det går lätt att lägga till fler boenden i framtiden

## 2026-09-18 (ny hero-bild)
- Bytte hero-fotot mot en ny bild från terrassen (citronträd, tak och havet i bakgrunden), sparad som `images/hefner-terrace.jpg`

## 2026-09-18 (ny app-ikon)
- Ny app-ikon och favicon: en designad sol (glow + strålar) på turkos/koral-gradient, i stället för de gamla ikonerna — genererad i alla storlekar (16, 32, 180, 192, 512px) plus maskable-varianter för Android och en riktig `favicon.ico`
- Tog bort strand-emojin bredvid "Badläget" i menyn — texten står nu ensam, matchar bättre med den nya ikonen

## 2026-09-18 (facelift)
- Total visuell facelift: nytt ljust färgschema (turkos/koral-accenter), Space Grotesk + Inter-typografi, glasiga kort med hover-effekter och scroll-reveal-animationer
- Nytt hero-avsnitt: fullbredds parallax-foto från La casa del Hefners takterrass (`images/hefner-view.jpg`), med flaggan och badläge-status i ett expanderbart glaskort ovanpå (minimerat läge visar bara namn + status, klick expanderar detaljer/länkar)
- Ny platsväljare: strandvalet görs numera i en fullskärmsvy (första gången automatiskt, annars via en ny husikon i menyn) istället för en chip-rad — valet sparas som förval
- Statistik-korten har en subtil animerad bakgrund, lutar lätt mot muspekaren på desktop, och siffrorna räknar upp från 0 vid varje datauppdatering
- Flaggan vajar med en enklare, mer tillförlitlig animation efter flera iterationer (komplexa segment-/veck-experiment testades och förkastades — enkel skevning fungerade bäst)
- Läsbarhetsfixar: starkare kontrast på all sekundärtext, tydligare skuggor på text ovanpå foton
- Mobilanpassningar: större touch-ytor på knappar/chips (min 44px), svagare parallax-effekt på mobil, fixad kolumnlayout för tågkort på smala skärmar

## 2026-09-18
- Skapade README.md och CHANGELOG.md
- Synkade GitHub-repot vg1414/Bad till lokal mapp
- Lade till tågkort "Mot Plaza Mayor" (Málaga) i tåg-sektionen, samma mönster som Málaga/Fuengirola
- Verifierade butikernas öppettider mot webbkällor: källorna var motsägelsefulla för söndagstider (Dia, Mercadona, Carrefour) — behöll befintliga tider oförändrade eftersom Davids egna iakttagelser på plats (Dia stänger 15:00 på söndagar) väger tyngre än opålitliga tredjepartssidor
- Bekräftade att Lidl-kortet redan pekar på rätt filial (Av. Carlota Alessandri 288, närmast El Pinillo) — ingen ändring behövdes
- Uppdaterade öppettider baserat på skärmdumpar från David (Google Maps): Lidl stänger nu 21:30 alla dagar (var 22:00), Dia stänger 21:30 mån-lör (var 22:00). Carrefour bekräftad oförändrad. Mercadonas öppettider förblir overifierade (Maps-uppgift 12 veckor gammal, ingen pålitlig alternativ källa hittad) — dubbelkolla på plats senare
- Byggde om tåg-sektionen till tre kompakta kort (Málaga/Fuengirola/Plaza Mayor), varje med både "Till" och "Från"-knapp för returresa. Tog bort pilarna och centrerade stationsnamnen för en renare, mer kompakt layout med enhetlig korthöjd

## Tidigare (historik från git-loggen, exakta datum ej loggade)
- Första versionen av Badläget publicerad
- La casa del Hefner: medelvärde av 4 stränder, förvalt läge
- Uppskattad flaggfärg (grön/gul/röd) från våghöjd + vind, med länk till officiell flagga och webcam
- Timprognos (24h) och flerdagarsprognos (5 dagar) för strand och Västerås
- "Känns som"-temperatur och dagens maxtemp tillagt
- Närmaste mataffärer med dagsaktuella öppettider, klickbara till Google Maps
- Tågkort för El Pinillo (mot Málaga/Fuengirola), länkade till Google Maps
- Uppdatera-knapp bredvid tidsstämpeln
- Diverse buggfixar (flagg-overlap på mobil, mataffärer som inte visades, tidjämförelse i timprognosen)
