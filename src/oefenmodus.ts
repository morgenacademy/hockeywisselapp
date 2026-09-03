/**
 * Staat de oefenwedstrijd aan?
 *
 * Vite vervangt `import.meta.env.VITE_OEFENMODUS` tijdens het bouwen door een
 * letterlijke waarde. In de productiebuild wordt dit dus `false`, waarna de
 * minifier elk `if (OEFENMODUS)`-blok weggooit. De oefencode zit daar niet
 * uitgeschakeld in -- hij zit er niet in. Dat is precies de bedoeling: een
 * versnelde klok die op zaterdag per ongeluk aan staat is erger dan geen
 * oefenmodus.
 *
 * Bouwen met de oefenmodus: `npm run build:oefen`.
 * De deploy-workflow controleert dat de productiebuild hem niet bevat.
 */
export const OEFENMODUS = import.meta.env.VITE_OEFENMODUS === '1'

// Dynamisch, zodat het hele blok -- inclusief het stijlbestand -- uit de
// productiebuild valt. Een gewone import bovenaan zou altijd meegebundeld
// worden, want CSS wordt niet weggesnoeid op basis van gebruik.
if (OEFENMODUS) {
  void import('./oefenmodus.css')
}

/** Keuzes in de oefenbalk. 10x is prettig: een blok duurt dan 35 seconden. */
export const SNELHEDEN = [1, 10, 60] as const
export const STANDAARD_OEFENSNELHEID = 10
