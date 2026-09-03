/**
 * Bundelt de build tot één zelfstandig HTML-bestand.
 *
 * Handig om de app ergens te hosten waar je geen map met losse bestanden kwijt
 * kunt. Alles gaat inline: er zijn daarna geen verzoeken meer naar CSS-, JS- of
 * icoonbestanden, dus de verwijzingen daarnaartoe worden eruit gehaald.
 *
 *   node scripts/bundel.mjs <uitvoerbestand> [titel]
 *
 * Draai eerst een build met SINGLE_FILE=1, anders zit de service worker er nog
 * in en zoekt die naar bestanden die er niet zijn.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const [, , uitvoer, titel = 'Hockey Wissels'] = process.argv
if (!uitvoer) {
  console.error('Gebruik: node scripts/bundel.mjs <uitvoerbestand> [titel]')
  process.exit(1)
}

const dist = 'dist'
const bestanden = readdirSync(join(dist, 'assets'))
const lees = (naam) => readFileSync(join(dist, 'assets', naam), 'utf8')
const css = bestanden.filter((f) => f.endsWith('.css')).sort().map(lees).join('\n')
const js = bestanden.filter((f) => f.endsWith('.js')).sort().map(lees).join('\n')

const html = readFileSync(join(dist, 'index.html'), 'utf8')
const body = html
  .match(/<body>(.*?)<\/body>/s)[1]
  .replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/g, '')
  .trim()

// De <link rel="icon"> en apple-touch-icon staan in de <head>, die we sowieso
// niet meenemen. Mocht er iets in de body naar een los bestand wijzen, dan valt
// dat hier weg.

writeFileSync(
  uitvoer,
  `<title>${titel}</title>\n<style>\n${css}\n</style>\n${body}\n<script type="module">\n${js}\n</script>\n`,
)

const grootte = (readFileSync(uitvoer).length / 1024).toFixed(0)
console.log(`${uitvoer} — ${grootte} kB, oefenmodus: ${js.includes('Oefenwedstrijd') ? 'ja' : 'nee'}`)
