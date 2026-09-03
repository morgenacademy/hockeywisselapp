# Hockey Wissel App

Wisselschema voor hockeywedstrijden. Je vinkt aan wie er is, kiest een keeper, en
de app regelt de rest: wie er wisselt, wanneer, en op welke positie ze komt te
staan. Iedereen speelt ongeveer even lang, en zoveel mogelijk op haar eigen linie.

Werkt offline op je telefoon, zonder account. In de clubkleuren van
**HC Prinsenbeek**: kanariegeel op marineblauw.

## Het logo

Zet het clublogo als `public/logo.svg` of `public/logo.png` en de kop pakt het
vanzelf op — de app probeert beide bestandsnamen. Staat het er
niet, dan toont de app een woordmerk **HCP** in de clubkleuren — geen gebroken
plaatje. Als het logo er is, kun je ook `public/icon-192.png`, `icon-512.png` en
`favicon.svg` eruit laten genereren.

Kleuren: geel is bewust schaars gehouden. Het is de kleur van het wisselmoment
en van het logo, en verder niet — anders valt het alarm langs de lijn niet meer
op. Het veld blijft groen, want daarop lezen de shirtjes, de rode ERUIT-ring en
de gele SCHUIFT-vlag het beste.

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

Over alle bezettingen en keeperkeuzes samen scheelt dat 605 → ~320 schuiven. De
speeltijd blijft daarbij overal binnen één blok.

### Samen spelen

Nora en Kiki kunnen allebei op het centrale middenveld, maar er is één plek. De
rustrotatie zette ze daardoor om en om op de bank: precies in de blokken waarin
de een speelde, rustte de ander. Bij acht van de twaalf blokken elk stonden ze
dan maar vier blokken samen in het veld — het rekenkundige minimum.

Een reparatiestap laat hun rustbeurten samenvallen, waardoor ze acht blokken
samen spelen en degene die niet centraal staat gewoon op links- of rechtsmid
komt. Dat kost wel doorschuiven: van 140 naar ~320 over alle bezettingen samen.
Wil je die afruil anders, dan is `MAX_SAMENSPEL_RUILEN` in `schedule.ts` de knop.

Eerlijk over een beperking: de sterkte-volgorde voor de centrale posities stuurt
hierdoor bijna niets meer. Gelijke speeltijd, blijven staan waar je stond en
samen spelen laten simpelweg geen ruimte meer over — bij volle bezetting komt
iedereen uit de pool op precies zes centrale blokken uit. De volgorde bepaalt nog
wel wie er centraal ínvalt als er een plek vrijkomt.

## Gebruiken

Op je telefoon: open de app, en voeg hem toe aan je beginscherm. Daarna werkt hij
ook zonder bereik langs het veld.

1. **Aanwezigheid** — vink aan wie er is (11 t/m 16), en zet zo nodig bij iemand
   **centraal** aan.
2. **Keeper** — zij speelt de hele wedstrijd. De app waarschuwt als je keuze de
   centrale posities onvulbaar maakt.
3. **Centrale posities** — zet de speelsters op sterkte. Bovenaan staat het
   vaakst centraal; speeltijd blijft leidend, dus iedereen komt aan de beurt.
4. **Startopstelling** — het voorstel van de app, waarin je zelf plekken kunt
   aanpassen. Wat je vastzet geldt voor het eerste blok; de rest van de wedstrijd
   rekent daaromheen.
5. **Wedstrijd** — Start/Pauze, het veld met de opstelling, en een vooruitblik op
   de volgende wissel. Speelsters die eraf moeten krijgen een rode rand met
   ERUIT; wie doorschuift krijgt SCHUIFT.

Bij het wisselmoment gaat er een belletje af (plus trillen) en verschijnt de
wissel in de vorm waarin je hem roept: *"Nora, jij komt erin voor Eva Hoevers."*

De wissel op een kwartgrens heet een **rustwissel** en krijgt een eigen kaart:
de klok staat dan stil, dus dat is het rustigste moment om te wisselen.

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

## Hoeveel speelsters heb je nodig per positie?

Een positiegroep die **k plekken per blok** moet vullen heeft bij **V**
veldspeelsters minstens **k × V / 10** speelsters nodig — haar eigen aandeel van
de selectie. Vier van de tien plekken achterin? Dan minstens vier tiende van je
veldspeelsters.

Daar komt één eis bij: wil je dat er twee tegelijk kunnen rusten — en dus de rest
van de wedstrijd sámen spelen — dan moeten er na hun rust nog k overblijven, dus
**k + 2**. Zonder die marge ontwijken hun rustbeurten elkaar en staan ze nooit
samen in het veld.

Voor 16 aanwezig (15 veldspeelsters):

| Groep | Plekken | Advies | In de selectie |
| --- | --- | --- | --- |
| Laatste vrouw + centrale verdediger | 2 | 4 | 5 |
| Centrale middenveld | 1 | 3 | 4 |
| Verdediging | 4 | 6 | 8 |
| Middenveld | 3 | 5 | 11 |
| Aanval | 3 | 5 | 10 |

Het aanwezigheidsscherm toont dit live. Onder het **minimum** (precies de plekken
die gevuld moeten worden) kun je niet verder — dan komt het schema niet rond.
Tussen minimum en advies mag je door, met een melding erbij.

Het verschil tussen de twee soorten groepen is belangrijk. **De centrale groepen
kun je oplossen** met de centraal-knop, dus de app noemt concreet wie je met één
tik kunt aanzetten. **De linies kun je niet oplossen** — die volgen uit wie er
die zaterdag is; daar zegt de app alleen wat het gevolg wordt.

Het advies is een sterke indicatie, geen garantie: het telt per groep, en wie
twee linies speelt telt twee keer mee terwijl ze maar op één plek tegelijk kan
staan. Gemeten over alle bezettingen en keeperkeuzes levert het in 62 van de 63
gevallen een schema zonder linieproblemen op.

## Oefenwedstrijd (alleen in de testversie)

Om de app te beoordelen zonder 70 minuten te wachten is er een oefenmodus: een
balk met 1×, 10× en 60×. Op 60× loopt een hele wedstrijd in ruim een minuut, met
alle elf wisselmomenten, het belletje en de kettingen.

Die zit **niet** in de echte app. De scheiding zit in de build:

```ts
export const OEFENMODUS = import.meta.env.VITE_OEFENMODUS === '1'
```

Vite vervangt dat bij het bouwen door een letterlijke waarde, waarna de minifier
elk `if (OEFENMODUS)`-blok weggooit. De stijlen staan om dezelfde reden in een
apart bestand dat alleen dynamisch geladen wordt — CSS wordt namelijk níét
weggesnoeid op basis van gebruik, dus in `styles.css` zouden ze wél meereizen.

```bash
npm run build          # echte app, zonder oefenmodus
npm run build:oefen    # testversie, mét oefenmodus
```

Beide workflows in `.github/` controleren na de productiebuild dat het woord
`Oefenwedstrijd` er niet in voorkomt, en falen als dat wel zo is. Een versnelde
klok die op zaterdag per ongeluk aan staat is erger dan geen oefenmodus.

## Vastzitten kan niet

Twee dingen zorgen dat je altijd verder kunt:

- **De opgeslagen wedstrijd heeft een versienummer.** Verandert de vorm van die
  stand, dan wordt een oude stand genegeerd in plaats van half teruggezet. Zonder
  dat sprong de app bij het openen meteen naar een oude wedstrijd en waren de
  voorbereidingsschermen onbereikbaar.
- **Vanaf het wedstrijdscherm kun je terug** met *Wijzig opstelling*, zonder de
  wedstrijd weg te gooien. Op het aanwezigheidsscherm staat dan *Terug naar de
  lopende wedstrijd*. `Opnieuw` blijft bestaan voor als je écht schoon wilt
  beginnen.

## Ontwikkelen

```bash
npm install
npm run dev                      # http://localhost:5173/hockeywisselapp/
VITE_OEFENMODUS=1 npm run dev    # met oefenwedstrijd
npm test                         # de rooster- en kloklogica
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
