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

Kleuren: marineblauw draagt alle vlakken, geel doet de clubkleur én de
hoofdactie — *Verder*, *Start*, en wat aan staat. Het veld blijft groen, want
daarop lezen de shirtjes, de rode ERUIT-ring en de gele SCHUIFT-vlag het beste.

Omdat geel overal zit, kan het wisselmoment niet meer met een geel randje
opvallen. Die kaart heeft daarom een vol geel kopvlak, en bij een rustwissel is
dat vlak groen — aan de kleur alleen zie je al of je haast hebt. Alle
tekst-op-vlak-combinaties in het palet halen WCAG AA.

De app-iconen komen uit `scripts/iconen.py`, dezelfde tekening als de favicon.
Verandert het palet, dan draai je dat script opnieuw; met de hand nagemaakte
iconen lopen anders bij elke kleurwijziging achter.

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

Die pools zijn krap, dus je kunt ze zelf aanvullen. Op het aanwezigheidsscherm
heeft elke speelster een kaartje met twee rijen knoppen:

- **linie** — Verdediging, Middenveld, Aanval. Hiermee bepaal je waar iemand kan
  staan. Haar laatste linie kun je niet weghalen: zonder linie kan ze nergens
  spelen.
- **centraal** — de centrale plek *binnen* een linie die ze speelt: *achterin*
  voor laatste vrouw en centrale verdediger, *midden* voor centrale middenveld.
  Bij Cato ontbreekt deze rij, want in de aanval zit geen sleutelpositie.

De twee zijn zonder lezen uit elkaar te houden: linies zijn rustig (omlijnd),
centraal is luid (een eigen kader met gele zijstreep, en een vol geel vlak als
het aan staat). Staat het uit maar kan het wel, dan is de knop gestippeld — zo
zie je in één blik wie je er nog bij kunt zetten.

Haal je een linie weg, dan vervalt de centraal-knop die erbij hoorde: "centraal
op het middenveld" betekent niets meer zodra ze het middenveld niet speelt.

Alles blijft bewaard voor volgende wedstrijden; onder *Opnieuw beginnen* staat
een knop om terug te zetten naar de oorspronkelijke selectie.

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

Over alle bezettingen en keeperkeuzes samen scheelt dat 605 → 97 schuiven. De
speeltijd blijft daarbij overal binnen één blok.

### En wat overblijft, gaat naar de rust

Midden in een kwart loopt de klok en staat iedereen verspreid; in de rust staat
de klok stil en sta je bij elkaar. Een schuif die je niet kwijt kunt, hoort dus
op een kwartgrens.

Een naverwerkingsstap verhuist ze daarheen door bank- en veldplekken tussen twee
blokken om te ruilen — dat laat ieders speeltijd exact gelijk (A speelt blok j in
plaats van blok i, B andersom). Elke kandidaat wordt met de echte roosterbouwer
beoordeeld, dus wat gemeten wordt is precies wat de leider te zien krijgt. Wat
eerder is rechtgezet blijft daarbij overeind: een kandidaat die meer meldingen
oplevert, iemand twee blokken op rij op de bank zet, een paar terugduwt naar zijn
samenspel-minimum of meer schuiven op één overgang samenklontert, wordt niet
genomen.

Van de 97 schuiven vallen er nog **20 midden in een kwart** en **77 in de rust**,
en **94% van de kwarten** wordt schuifvrij uitgespeeld. Vóór deze stap was dat
59% van de schuiven midden in een kwart, en werd 65% van de kwarten schuifvrij
gespeeld.

### Samen spelen

Nora en Kiki kunnen allebei op het centrale middenveld, maar er is één plek. De
rustrotatie zette ze daardoor om en om op de bank: precies in de blokken waarin
de een speelde, rustte de ander. Bij acht van de twaalf blokken elk stonden ze
dan maar vier blokken samen in het veld — het rekenkundige minimum.

Een reparatiestap laat hun rustbeurten samenvallen, waardoor ze acht blokken
samen spelen — het maximum — en degene die niet centraal staat gewoon op links-
of rechtsmid komt. Dat kostte aanvankelijk doorschuiven, maar de stap hierboven
haalt dat er weer uit. Wil je die afruil anders, dan is `MAX_SAMENSPEL_RUILEN` in
`schedule.ts` de knop.

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

De wissel op een kwartgrens heet een **rustwissel** en krijgt een eigen kaart met
een groen kopvlak: de klok staat dan stil, dus dat is het rustigste moment om te
wisselen.

In de rust kijkt het wedstrijdscherm vooruit. Boven het veld staat *"Opstelling
voor kwart 2"* en je ziet de opstelling die gáát komen, niet die van het kwart dat
net voorbij is. Tik je daar een plek aan, dan bevriest de app het gespeelde kwart
en rekent de rest van de wedstrijd om je keuze heen.

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

Het verschil tussen de twee soorten groepen zit in hoe je ze oplost. Bij een
**centrale groep** noemt de app concreet wie je met één tik kunt aanzetten. Bij
een **linie** kan dat niet met één tik — wie welke linie kan is een keuze over de
speelster zelf, niet over deze wedstrijd — dus daar wijst de app naar de
linie-knoppen in de lijst en zegt wat het gevolg is als je niets doet.

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
  lopende wedstrijd*.

Onderaan het aanwezigheidsscherm staat **Opnieuw beginnen**, met drie acties die
elk zeggen wat er weggaat:

| | wat gaat weg | wat blijft |
| --- | --- | --- |
| **Nieuwe wedstrijd** | keeper, opstelling, klok | wie er zijn, linies, centraal |
| **Linies en centraal terugzetten** | alleen de selectie-aanpassingen | de wedstrijd |
| **Alles wissen** | alles, ook de opgeslagen stand | niets |

Die scheiding is met opzet: linies en centrale posities horen bij het team en
niet bij één wedstrijd, dus een nieuwe wedstrijd raakt ze niet aan. *Alles
wissen* is ook de uitweg als er ooit iets in de opslag staat waar de app niet
mee overweg kan.

## Ontwikkelen

```bash
npm install
npm run dev                      # http://localhost:5173/hockeywisselapp/ (met eigen domein: /)
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

Publiceren naar GitHub Pages kan op twee manieren; kies er één in
**Settings → Pages → Source**:

- **GitHub Actions** — de workflow in `.github/workflows/deploy.yml` bouwt en
  publiceert bij elke push naar de standaardbranch. Voorkeur: altijd actueel.
- **Deploy from a branch → `gh-pages`** — die branch bevat de gebouwde app.
  Korter lijstje om uit te kiezen, maar hij moet met de hand ververst worden:
  `npm run build` en de inhoud van `dist/` naar `gh-pages` pushen. Daarna staat de app
op `https://morgenacademy.github.io/hockeywisselapp/` — zonder login,
installeerbaar op je beginscherm en offline bruikbaar.

De workflow weigert te publiceren als de oefenmodus per ongeluk in de
productiebuild zit.

## Een eigen domein

De app is één pagina zonder login, dus een gekocht domein kan er rechtstreeks
naartoe wijzen. Een landingspagina ertussen is niet nodig: wie de URL intypt,
staat meteen in het beginscherm van de wedstrijd.

Er zijn drie dingen nodig, en de DNS is de traagste — begin daarmee.

**1. DNS bij de partij waar je het domein gekocht hebt.** Welke records je zet
hangt ervan af of je het kale domein of een subdomein gebruikt:

- `wissels.jouwdomein.nl` (subdomein, het eenvoudigst): één `CNAME`-record met
  waarde `morgenacademy.github.io`.
- `jouwdomein.nl` (kaal domein): vier `A`-records naar `185.199.108.153`,
  `185.199.109.153`, `185.199.110.153` en `185.199.111.153`. Zet daarnaast een
  `CNAME` voor `www` naar `morgenacademy.github.io`, dan werkt die ook.

**2. Het domein in de repo.** Zet het in `public/CNAME`, precies één regel,
zonder `https://` en zonder slash:

```bash
echo "wissels.jouwdomein.nl" > public/CNAME
```

Dat bestand doet twee dingen. GitHub Pages leest het om te weten welk domein bij
deze site hoort, en `vite.config.ts` leest het om het basispad op `/` te zetten
in plaats van `/hockeywisselapp/`. Dat tweede is niet cosmetisch: met een eigen
domein staat de app op de root, en zonder die omschakeling zoekt de pagina haar
JavaScript op een pad dat er niet is — een wit scherm. Om diezelfde reden draait
`npm run dev` dan ook op `http://localhost:5173/` in plaats van op
`/hockeywisselapp/`.

**3. Publiceren.** Push naar de standaardbranch; de workflow bouwt en zet het
online. Zet daarna in **Settings → Pages** *Enforce HTTPS* aan zodra dat kan —
het certificaat wordt pas uitgegeven als de DNS is doorgekomen, wat van een paar
minuten tot een uur kan duren. Tot die tijd kan de browser klagen over de
verbinding; dat gaat vanzelf over.

De github.io-URL blijft daarnaast gewoon werken, dus je hebt altijd een adres dat
het doet als het domein nog aan het doorkomen is.

## De selectie aanpassen

De vaste selectie staat in `src/domain/players.ts`. Elke speelster heeft haar
voorkeurslinies (`V`, `M`, `A`) en `centraal`: de linies waarin ze de centrale
plek aankan. Dat is per linie, want dat verschilt echt — iemand kan prima laatste
vrouw zijn zonder dat ze het centrale middenveld aankan. Alleen linies die ze ook
speelt tellen mee, en de aanval heeft geen centrale sleutelplek.

Zowel de linies als de centraal-vlag kun je in de app zelf aanpassen; die
wijzigingen worden lokaal bewaard en overleven een nieuwe wedstrijd. Dit bestand
is de standaard waar *Alles wissen* naar terugvalt — daar hoef je dus alleen in
als de vaste selectie zelf verandert, bijvoorbeeld als er iemand bij het team
komt.
