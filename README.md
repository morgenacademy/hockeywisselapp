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

Een wedstrijd is 4 × 17:30, en elk kwart valt uiteen in gelijke **blokken**. Op
een blokgrens ligt een wisselmoment. Hoeveel blokken een kwart heeft kies je
zelf, vóór de wedstrijd:

| Keuze | Blokduur | Blokken in de wedstrijd |
| --- | --- | --- |
| Alleen in de rust | 17:30 | 4 |
| 1× per kwart | 8:45 | 8 |
| 2× per kwart | 5:50 | 12 |
| 3× per kwart | 4:23 | 16 |

Het getal telt de wissels *binnen* een kwart; in de rust wissel je sowieso, want
daar staat de klok stil.

**De totale speeltijd verandert daar niet van.** Er zijn altijd 10 veldplekken
gedurende 70 minuten, dus 700 speelster-minuten te verdelen — hoe je ze in
blokken knipt maakt voor het totaal niets uit. Wat de keuze wél bepaalt is hoe
lang één beurt duurt, en dus hoe lang iemand achter elkaar aan de kant staat.

| Aanwezig | Veldspeelsters | Speeltijd per speelster |
| --- | --- | --- |
| 16 | 15 | 46:40 |
| 15 | 14 | 50:00 |
| 14 | 13 | 53:51 |
| 13 | 12 | 58:20 |
| 12 | 11 | 63:38 |
| 11 | 10 | 70:00 (geen wissels) |

Nooit meer dan één blok verschil tussen de speelster die het meest en het minst
speelt. Met kortere blokken is dat verschil dus ook kleiner.

### Wat de app adviseert

Per blok blijven er `V − 10` speelsters over voor de bank, dus na `V / (V − 10)`
blokken is iedereen één keer aan de beurt geweest. Past die ronde niet in de
wedstrijd, dan zijn er speelsters die helemaal niet rusten terwijl anderen dubbel
rusten. Het advies is daarom: zoveel blokken per kwart dat die ronde er minstens
één keer in past.

| Aanwezig | Veldspeelsters | Advies |
| --- | --- | --- |
| 11 | 10 | alleen in de rust (niemand hoeft te rusten) |
| 12 | 11 | 2× per kwart |
| 13 t/m 16 | 12 t/m 15 | 1× per kwart |

Met één wisselspeelster moet je vaak wisselen om haar aan spelen te krijgen; met
vijf hoeft dat veel minder. En zodra er gewisseld wordt zijn het er minstens
één per kwart: een blok van een heel kwart betekent dat iemand 17:30 achter
elkaar aan de kant staat.

Het blijft een advies. De coach kent de tegenstander, het weer en de benen van
zijn ploeg, dus elke keuze is gewoon aan te tikken — met de minuten erbij, want
dát is het getal waar je langs de lijn iets aan hebt. Zolang je zelf niets kiest
schuift het advies mee als er nog iemand binnenkomt of afzegt; tik je een keuze
aan, dan blijft die staan.

Het ritme mag ook nog wijzigen als de wedstrijd al loopt. Wat er gespeeld is
verhuist dan mee naar de nieuwe indeling — elk nieuw blok pakt het oude blok dat
op datzelfde moment liep — zodat de speeltijd blijft kloppen.

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
de een speelde, rustte de ander. Bij acht van de twaalf blokken elk — het
voorbeeld rekent met 2× per kwart — stonden ze dan maar vier blokken samen in het
veld, het rekenkundige minimum.

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

### Uit elkaar

Het omgekeerde kan ook: speelsters die de coach liever níét tegelijk in het veld
heeft. Die paren staan in `UIT_ELKAAR` in `players.ts`; nu zijn dat Kiki en
Priscilla, die allebei middenveld en aanval spelen.

Een reparatiestap ruilt rustbeurten tot ze zo weinig mogelijk samen spelen, en
dat is het rekenkundige minimum: wie elk n van de N blokken speelt, staat
onvermijdelijk `n_a + n_b − N` blokken samen. Met de volle selectie spelen ze
elk 8 van de 12 blokken, dus minstens 4 samen -- minder kan alleen door een van
beiden minder te laten spelen, en speeltijd gaat voor. Over 48 bezettingen en
keeperkeuzes gaat dat van 249 naar 215 blokken samen, precies het minimum in
elk geval. De prijs: Nora en Kiki spelen iets minder vaak samen (267 → 253).

## Gebruiken

Op je telefoon: open de app, en voeg hem toe aan je beginscherm. Daarna werkt hij
ook zonder bereik langs het veld.

1. **Aanwezigheid** — vink aan wie er is, en zet zo nodig bij iemand **centraal**
   aan. Staat er een invalster naast je die niet in de selectie zit, dan zet je
   haar er met **Iemand erbij** zo bij. Tijdens de wedstrijd kan het ook, met
   **Invalster erbij** onder de bank: wat al gespeeld is blijft staan, het blok
   dat loopt ook, en zij komt bij de volgende wissel erin.
2. **Keeper** — zij speelt de hele wedstrijd. De app waarschuwt als je keuze de
   centrale posities onvulbaar maakt.
3. **Wisselmomenten** — hoe vaak wissel je per kwart? De app adviseert op basis
   van de opkomst en noemt de blokduur in minuten; je tikt aan wat je zelf wilt.
4. **Centrale posities** — zet de speelsters op sterkte. Bovenaan staat het
   vaakst centraal; speeltijd blijft leidend, dus iedereen komt aan de beurt.
5. **Startopstelling** — het voorstel van de app, waarin je zelf plekken kunt
   aanpassen. Wat je vastzet geldt voor het eerste blok; de rest van de wedstrijd
   rekent daaromheen.
6. **Wedstrijd** — Start/Pauze (met *Klok loopt* en een knipperend groen
   bolletje zolang de tijd telt), het veld met de opstelling, en een vooruitblik op
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

### Vooropstelling: alle wisselmomenten vooruit

Het voorstel is een voorstel. Met **Alle wisselmomenten bekijken** — ook al
vóór de aftrap — blader je met ‹ › langs elk wisselmoment dat nog komt
(*Kwart 2, na 8:45*, *Rustwissel, begin kwart 3*). Per moment zie je de
opstelling ná die wissel en wie eruit en erin gaat. Tik een plek aan om te
kiezen wie daar komt; wie op dat moment op de bank zou zitten heeft het label
*bank*. Onder *Volgende wissel* brengt **Wissel aanpassen** je meteen naar het
eerstvolgende moment, en in het *Overzicht* tik je op een bloknummer.

Wat je zo kiest wordt dat wisselmoment. De blokken ertussen rekent de app
opnieuw, zodat de speeltijd rond blijft. Wat er nu op het veld staat verandert
niet; vóór de aftrap zet de app daarom de startopstelling vast zoals je hem
ziet. Een moment dat geweest is valt vanzelf af, en met **Klaar** kijk je weer
naar nu.

### Zelf ingrijpen

Tijdens de wedstrijd kun je altijd ingrijpen: tik op een speelster op het veld om
haar te vervangen, of zet iemand op **eruit** bij een blessure of kaart. De app
rekent de rest van de wedstrijd opnieuw uit; wat al gespeeld is blijft staan.

Twee dingen die daarbij vastliggen:

**Iedereen is te kiezen.** Ook wie een sleutelpositie normaal niet aankan, en ook
buiten haar eigen linie. De app zet er wel een opmerking bij — *niet centraal*,
*buiten linie* — en markeert het op het veld, maar ze houdt het niet tegen. Langs
de lijn weet jij het beter dan de gegevens: er komt een invalster mee die niemand
kent, of je ziet gewoon iets.

**Verzet je één plek, dan verandert er verder niets.** Stond ze al in het veld,
dan ruilen die twee van plek; kwam ze van de bank, dan gaat wie er stond naar de
bank. De rest van dat blok blijft exact staan — de app legt het blok vast en
rekent alleen de blokken die nog komen opnieuw uit. Onder het veld staat dan
*"Deze opstelling heb je zelf gezet"*, met een knop om het blok weer aan de app
terug te geven.

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
alle wisselmomenten, het belletje en de kettingen.

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

Drie dingen zorgen dat je altijd verder kunt:

- **De opgeslagen wedstrijd heeft een versienummer.** Verandert de vorm van die
  stand, dan wordt een oude stand genegeerd in plaats van half teruggezet. Zonder
  dat sprong de app bij het openen meteen naar een oude wedstrijd en waren de
  voorbereidingsschermen onbereikbaar.
- **Vanaf het wedstrijdscherm kun je terug** met *Wijzig opstelling*, zonder de
  wedstrijd weg te gooien. Op het aanwezigheidsscherm staat dan *Terug naar de
  lopende wedstrijd*.
- **Een fout in een scherm geeft geen witte pagina.** Het lezen van de opslag was
  al afgeschermd, maar dat dekt alleen het opstarten. Gaat er tijdens de
  wedstrijd iets mis in het tekenen van een scherm, dan haalt React zonder
  vangnet de hele boom weg -- midden in een kwart, met een team dat op een wissel
  wacht. `Vangnet` toont in plaats daarvan twee uitwegen: *Opnieuw proberen*
  (de wedstrijd blijft staan, genoeg bij een eenmalige fout) en *Alles wissen*
  (voor als de fout in de opgeslagen stand zelf zit).

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
npm run dev                      # http://localhost:5173/
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

## Publiceren

De app staat op **https://hockeywisselapp.nl** — zonder login, installeerbaar op
je beginscherm en offline bruikbaar. Netlify bouwt en publiceert bij elke push
naar `main`; de instellingen staan in `netlify.toml` en niet in het dashboard,
zodat je in deze repo kunt zien wat er gebeurt.

Drie dingen die die configuratie regelt:

- **`BASE_PATH=/`** — de app draait op de root van het domein. Vite zet dat door
  naar de asset-verwijzingen én naar `start_url` en `scope` in het manifest.
- **De productiebranch bouwt met `npm run controleer:productie`**, die de build
  daarna doorzoekt op de oefenmodus en faalt als hij er in zit. Staat
  `VITE_OEFENMODUS` per ongeluk in de omgeving, dan komt er dus geen versnelde
  klok live maar een rode build.
- **`sw.js` wordt nooit gecachet.** Die bepaalt wat een geïnstalleerde app te
  zien krijgt; blijft hij hangen, dan zit een telefoon op een oude versie vast
  en is daar van buitenaf niets meer aan te doen.

Een branch die `oefen` heet krijgt zijn eigen adres, gebouwd met de
snelheidsbalk erin. Daarmee speel je een hele wedstrijd in een minuut door
zonder de app aan te raken die op zaterdag gebruikt wordt.

Wil je de app ergens neerzetten waar je geen map met losse bestanden kwijt kunt,
dan bundelt `npm run bundel` alles tot één zelfstandig HTML-bestand van ongeveer
205 kB (`npm run bundel:oefen` voor de versie met de snelheidsbalk).

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

Voor een invalster hoef je hier níét in. Op het aanwezigheidsscherm zet je haar
met **Iemand erbij** in de lijst: ze komt aanwezig binnen met alle drie de linies
en zonder centrale plek — de veilige aanname voor iemand die je niet kent — en je
stelt haar linies en centraal daarna bij met dezelfde knoppen als bij de rest.
Met *weghalen* is ze weer weg. Zulke speelsters horen bij deze telefoon en niet
bij het team, dus ze overleven wel een nieuwe wedstrijd en het terugzetten van de
linies, maar niet *Alles wissen*.
