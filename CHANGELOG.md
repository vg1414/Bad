# Changelog

Alla ändringar i projektet loggas här med datum.

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
