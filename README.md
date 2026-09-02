# Hockey Wissel App

Wisselschema voor hockeywedstrijden. Je vinkt aan wie er is, kiest een keeper, en
de app regelt de rest: wie er wisselt, wanneer, en op welke positie ze komt te
staan. Iedereen speelt ongeveer even lang, en zoveel mogelijk op haar eigen linie.

Werkt offline op je telefoon, zonder account.

## Hoe het rekent

Een wedstrijd is 4 × 17:30. Elk kwart valt uiteen in **3 blokken van 5:50**, dus
12 blokken in totaal met 10 veldplekken = **120 speelster-blokken** te verdelen.

| Aanwezig | Veldspeelsters | Speeltijd per speelster | Verschil |
| --- | --- | --- | --- |
| 16 | 15 | 46:40 | geen |
| 15 | 14 | 52:30 of 46:40 | 5:50 |
| 14 | 13 | 58:20 of 52:30 | 5:50 |
| 13 | 12 | 58:20 | geen |
| 12 | 11 | 64:10 of 58:20 | 5:50 |
| 11 | 10 | 70:00 | geen wissels |

Nooit meer dan één blok verschil.

## Opstelling 4-3-3

```
          LA        SP        RA        Aanval
          LM        CM        RM        Middenveld
     LB   LV        CV   RB            Verdediging
               KEEPER
```

**LV** is de laatste vrouw, **CV** de centrale verdediger. Samen met **CM** zijn
dat de drie sleutelposities. Daar mag alleen iemand staan die zowel `centraal`
kan als in die linie speelt — daar wordt nooit van afgeweken. De overige zeven
plekken staan open voor iedereen in die linie.

Dat betekent dat de centrale pools kleiner zijn dan het aantal centraal-vlaggen
doet vermoeden:

| Plek | Per blok | Wie |
| --- | --- | --- |
| LV + CV | 2 | Lily, Eva Hoevers, Sofie, Nora, Lynn |
| CM | 1 | Lily, Kiki, Nora, Lynn |

Lily, Nora en Lynn zitten in beide pools en zijn daarmee de scharnierpunten van
het rooster. Cato kan wel centraal, maar speelt alleen aanval — en de voorhoede
kent geen sleutelpositie, dus zij staat op LA, SP of RA.

Die pools zijn krap, dus je kunt ze zelf aanvullen: op het aanwezigheidsscherm
staat achter elke naam een knop **centraal**. Zet je die aan bij Kate Janssen,
dan kan zij er ook op laatste vrouw en centrale verdediger staan. Wat het per
speelster oplevert hangt af van haar linies — bij Cato is de knop uitgeschakeld,
want in de aanval zit geen centrale sleutelpositie. Een teller boven de lijst laat
live zien hoeveel speelsters er achterin en op het middenveld centraal kunnen, en
waarschuwt als dat er te weinig zijn. De wijziging blijft bewaard voor volgende
wedstrijden; er is een knop om terug te zetten naar de oorspronkelijke selectie.

## Hoe het rooster tot stand komt

Twee stappen per blok, in deze volgorde:

1. **Wie rust?** Puur op speeltijd: wie de meeste blokken heeft gespeeld gaat
   naar de bank. Dat is de harde regel. Alleen tussen speelsters die er even veel
   op hebben zitten valt te kiezen, en die ruimte gebruikt de app om het blok
   netjes rond te krijgen — iedereen in haar eigen linie, en niemand twee blokken
   op rij op de bank.
2. **Wie waar?** Alle tien de posities in één keer, als koppelingsprobleem
   (Hongaars algoritme). Greedy per positie liep vast: dan kon de laatste vrije
   verdediger op linksback belanden terwijl ze de enige was die centraal kon.

Weegt mee bij stap 2: blijven staan waar je stond (minder wisselgeroep), je eigen
linie, je plek in de sterkte-volgorde, en spreiding over posities.

Komt de speeltijd in de knel met de linies, dan wint de speeltijd en staat er
iemand buiten haar linie — met een oranje rand op het veld, zodat je het ziet.

### Doorschuiven is het laatste redmiddel

Een speelster die in het veld blijft maar naar een andere plek gaat, is de duurste
instructie langs de lijn: je moet drie mensen tegelijk iets vertellen. Daarom is
dat geen kwestie van weging maar van stappen. Eerst probeert de app het blok rond
te zetten met iedereen op haar eigen plek; lukt dat niet, dan met precies één
speelster die doorschuift; en pas als dat ook niet kan met meer — en dan krijg je
het te zien. Ook de rustrotatie kijkt vooruit: bij speelsters met dezelfde
speeltijd kiest de app degene wier vervanger direct op haar plek kan.

Over alle bezettingen en keeperkeuzes samen scheelt dat 605 → 140 schuiven, en
zakt het aantal wisselmomenten met meer dan één schuif van 151 naar 25. De
speeltijd blijft daarbij overal binnen één blok.

## Gebruiken

Op je telefoon: open de app, en voeg hem toe aan je beginscherm. Daarna werkt hij
ook zonder bereik langs het veld.

1. **Aanwezigheid** — vink aan wie er is (11 t/m 16), en zet zo nodig bij iemand
   **centraal** aan.
2. **Keeper** — zij speelt de hele wedstrijd. De app waarschuwt als je keuze de
   centrale posities onvulbaar maakt.
3. **Centrale posities** — zet de speelsters op sterkte. Bovenaan staat het
   vaakst centraal; speeltijd blijft leidend, dus iedereen komt aan de beurt.
4. **Wedstrijd** — Start/Pauze, het veld met de opstelling, en een vooruitblik op
   de volgende wissel. Speelsters die eraf moeten krijgen een rode rand met
   ERUIT; wie doorschuift krijgt SCHUIFT.

Bij het wisselmoment gaat er een belletje af (plus trillen) en verschijnt de
wissel in de vorm waarin je hem roept: *"Nora, jij komt erin voor Eva Hoevers."*

Moet er toch iemand doorschuiven, dan staat de hele ketting op één kaart, zodat
niemand per ongeluk het veld af loopt:

```
ERUIT      Kiki van der Feer     stond op Centrale middenveld
   ↓
SCHUIFT    Lily le Blanc         van Rechtsmid naar Centrale middenveld
   ↓
ERIN       Suus Kimenai          op Rechtsmid
```

Tijdens de wedstrijd kun je altijd ingrijpen: tik op een speelster op het veld om
haar te vervangen, of zet iemand op **eruit** bij een blessure of kaart. De app
rekent de rest van de wedstrijd opnieuw uit; wat al gespeeld is blijft staan.

## Ontwikkelen

```bash
npm install
npm run dev      # http://localhost:5173/hockeywisselapp/
npm test         # de rooster-logica
npm run build
```

De logica zit in `src/domain/` en is los te testen zonder browser:

- `formation.ts` — de 4-3-3 posities en welke sleutelposities zijn
- `players.ts` — de selectie en wie waar mag staan
- `schedule.ts` — het rooster: rustrotatie, positieverdeling, reparatiestappen,
  wisselkettingen en herberekening
- `assignment.ts` — koppeling (Kuhn) en toewijzing (Hongaars)
- `clock.ts` — kwarten, blokken en tijd

Publiceren gaat automatisch naar GitHub Pages bij een push naar `main`
(`.github/workflows/deploy.yml`). Zet in de repo-instellingen **Pages → Source**
op **GitHub Actions**.

## De selectie aanpassen

De vaste selectie staat in `src/domain/players.ts`. Elke speelster heeft haar
voorkeurslinies (`V`, `M`, `A`) en of ze centraal kan. Let op: `centraal` geldt
binnen haar eigen linies — een aanvalster met `centraal` komt daardoor niet op
CM terecht.

De centraal-vlag kun je ook in de app zelf aanzetten; die wijziging wordt lokaal
bewaard. Alleen voor het aanpassen van linies moet je dit bestand in.
