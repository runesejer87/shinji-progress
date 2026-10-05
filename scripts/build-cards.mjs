// Builds src/data/cards.json + public/cards/** for every physical Shinji Kanda card.
//
// Sources:
//   - Limitless TCG artist search (EN + JP): master card list, rarity, scans, EN prices
//   - TCGdex API: Cardmarket EUR prices (used for JP cards and as EN fallback)
//   - data/overrides.json: manual fixes / extra cards, keyed by uid
//
// Usage: node scripts/build-cards.mjs [--skip-images]

import { mkdir, readFile, writeFile, access } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.resolve(import.meta.dirname, '..')
const ARTIST = '!artist:shinji_kanda' // exact-match artist search on Limitless
const UA = { 'User-Agent': 'Mozilla/5.0 (shinji-progress card builder)' }
const CURRENCIES = ['USD', 'GBP', 'DKK', 'SEK', 'NOK', 'CHF', 'JPY', 'CAD', 'AUD']
const SKIP_IMAGES = process.argv.includes('--skip-images')

// Highest first. Keys are lowercase rarity names from Limitless / TCGdex.
const RARITY_ORDER = [
  ['Special Illustration Rare', ['special art rare', 'special illustration rare', 'sar']],
  ['Illustration Rare', ['art rare', 'illustration rare', 'ar', 'character rare', 'character holo rare']],
  ['Ultra Rare', ['hyper rare', 'ultra rare', 'secret rare', 'super rare', 'ur', 'sr', 'shiny ultra rare']],
  ['Double Rare', ['double rare', 'rr', 'holo rare v', 'holo rare vmax', 'holo rare vstar']],
  ['Rare', ['rare', 'holo rare', 'rare holo', 'shiny rare', 'ace spec rare', 'r']],
  ['Uncommon', ['uncommon', 'u']],
  ['Common', ['common', 'c']],
  ['Promo & Special', ['promo', 'pr', 'none', '']],
]

function rarityInfo(raw) {
  const key = (raw ?? '').trim().toLowerCase()
  const idx = RARITY_ORDER.findIndex(([, aliases]) => aliases.includes(key))
  if (idx === -1) {
    console.warn(`  ! unknown rarity "${raw}" – grouping under Rare`)
    return { rarity: 'Rare', rarityRank: 4, rarityRaw: raw }
  }
  return { rarity: RARITY_ORDER[idx][0], rarityRank: idx, rarityRaw: raw }
}

async function get(url, { json = false, tries = 4 } = {}) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { headers: UA })
      if (res.status === 404) return null
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return json ? res.json() : res.text()
    } catch (err) {
      if (i >= tries) throw new Error(`${url}: ${err.message}`)
      await new Promise((r) => setTimeout(r, 1000 * i))
    }
  }
}

const decode = (s) =>
  s.replace(/&amp;/g, '&').replace(/&#039;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim()

// Parse the Limitless list view table into card rows.
async function limitless(lang) {
  const base = lang === 'ja' ? 'https://limitlesstcg.com/cards/jp' : 'https://limitlesstcg.com/cards'
  const html = await get(`${base}?q=${encodeURIComponent(ARTIST)}&show=all&display=list`)
  const rows = html.split('<tr data-hover="').slice(1)
  const cards = []
  for (const row of rows) {
    const thumb = row.slice(0, row.indexOf('"'))
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1])
    const href = row.match(/href="(\/cards\/[^"]+)"/)[1]
    const [set, number] = href.split('/').slice(-2)
    const setName = decode(row.match(/data-tooltip="([^"]*)"/)?.[1] ?? set)
    const text = (c) => decode(c.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '))
    const eur = text(cells[6] ?? '').match(/([\d.,]+)€/)?.[1]
    cards.push({
      uid: `${lang}-${set}-${number}`,
      lang,
      set,
      setName,
      number,
      code: `${set} ${number}`,
      name: text(cells[2]),
      ...rarityInfo(text(cells[4])),
      url: `https://limitlesstcg.com${href}`,
      imageSrc: thumb.replace(/_XS\.png$/, '_LG.png'),
      priceEur: eur ? Number(eur.replace(/,/g, '')) : null,
      priceSource: eur ? 'cardmarket' : null,
    })
  }
  return cards
}

// Confirm each card really is Shinji Kanda's (the search is a substring match).
async function verifyArtist(card) {
  const html = await get(card.url)
  const artist = html?.match(/Illustrated by\s*<a[^>]*>([^<]+)</)?.[1]?.trim()
  return artist ?? null
}

// ---------- TCGdex: variants + per-variant Cardmarket prices ----------

const TCGDEX = 'https://api.tcgdex.net/v2'
const digits = (n) => String(n).replace(/\D/g, '').replace(/^0+/, '')
const norm = (s) => s.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]/gu, '')

// EN Limitless set codes (PRE, BLK…) don't match TCGdex ids (sv08.5…), so EN
// cards are matched against TCGdex's own Shinji Kanda list by name + number.
async function tcgdexEnIndex() {
  const list = await get(`${TCGDEX}/en/cards?illustrator=${encodeURIComponent('Shinji Kanda')}`, { json: true })
  const index = new Map()
  for (const brief of list) {
    const full = await get(`${TCGDEX}/en/cards/${encodeURIComponent(brief.id)}`, { json: true })
    if (full) index.set(`${norm(full.name)}|${digits(full.localId)}`, full)
  }
  return index
}

async function tcgdexCard(card, enIndex) {
  if (card.lang === 'en') return enIndex.get(`${norm(card.name)}|${digits(card.number)}`) ?? null
  const id = `${card.set}-${card.number.padStart(3, '0')}`
  return get(`${TCGDEX}/ja/cards/${encodeURIComponent(id)}`, { json: true }).catch(() => null)
}

const positive = (...values) => values.find((v) => typeof v === 'number' && v > 0) ?? null
const title = (s) => s.charAt(0).toUpperCase() + s.slice(1)

// Base printing first, then reverse holos, then special foils.
function variantOrder(v) {
  const order = ['normal', 'holo', 'reverse', 'reverse-pokeball', 'reverse-masterball']
  const i = order.indexOf(variantKey(v))
  return i === -1 ? order.length : i
}

function variantKey(v) {
  return v.foil ? `${v.type}-${v.foil}` : v.type
}

function variantLabel(v) {
  if (v.type === 'reverse' && v.foil === 'pokeball') return 'Poké Ball'
  if (v.type === 'reverse' && v.foil === 'masterball') return 'Master Ball'
  if (v.foil) return `${title(v.foil)} ${v.type === 'reverse' ? 'Reverse' : title(v.type)}`
  return { normal: 'Normal', holo: 'Holo', reverse: 'Reverse Holo', firstEdition: '1st Edition', wPromo: 'W Promo' }[v.type] ?? title(v.type)
}

// Cardmarket lists normal + reverse as one product ("holo" fields = reverse);
// special foils (Poké Ball / Master Ball) are their own product.
function variantPrice(v, base) {
  const cm = v.pricing?.cardmarket
  if (!cm) return null
  if (v === base) return positive(cm.trend, cm.avg30, cm.avg7)
  if (cm.idProduct === base.pricing?.cardmarket?.idProduct) return positive(cm['trend-holo'], cm['avg30-holo'], cm['avg7-holo'])
  return positive(cm['trend-holo'], cm['avg30-holo'], cm.trend, cm.avg30)
}

function buildVariants(card, tcg) {
  const detailed = (tcg?.variants_detailed ?? []).filter((v) => (v.size ?? 'standard') === 'standard')
  if (!detailed.length) {
    // No variant data: assume a single printing.
    return [{ key: card.rarityRank <= 4 ? 'holo' : 'normal', label: card.rarityRank <= 4 ? 'Holo' : 'Normal', priceEur: card.priceEur ?? null }]
  }
  detailed.sort((a, b) => variantOrder(a) - variantOrder(b))
  const base = detailed[0]
  const cm = tcg.pricing?.cardmarket
  const fallbackBase = card.priceEur ?? positive(cm?.trend, cm?.avg30, cm?.['trend-holo'], cm?.['avg30-holo'])
  const seen = new Set()
  return detailed
    .map((v) => ({ key: variantKey(v), label: variantLabel(v), priceEur: variantPrice(v, base) }))
    .filter((v) => !seen.has(v.key) && seen.add(v.key))
    .map((v, i) => (i === 0 && v.priceEur == null ? { ...v, priceEur: fallbackBase ?? null } : v))
}

// ---------- Artwork grouping (same art across languages / reprints) ----------

// Difference hash of the upper art area; same artwork scores < ~35, different > ~100.
async function artHash(imagePath) {
  const img = sharp(path.join(ROOT, 'public', imagePath))
  const { width, height } = await img.metadata()
  const buf = await img
    .extract({ left: Math.round(width * 0.1), top: Math.round(height * 0.14), width: Math.round(width * 0.8), height: Math.round(height * 0.34) })
    .greyscale()
    .resize(17, 16, { fit: 'fill' })
    .raw()
    .toBuffer()
  const bits = []
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) bits.push(buf[y * 17 + x] > buf[y * 17 + x + 1] ? 1 : 0)
  return bits
}

const ART_THRESHOLD = 60

async function groupArtworks(cards, manualGroups = []) {
  const hashes = await Promise.all(cards.map((c) => artHash(c.image)))
  const parent = cards.map((_, i) => i)
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])))
  const union = (a, b) => (parent[find(a)] = find(b))
  for (let i = 0; i < cards.length; i++)
    for (let j = i + 1; j < cards.length; j++) {
      const d = hashes[i].reduce((n, bit, k) => n + (bit !== hashes[j][k]), 0)
      if (d < ART_THRESHOLD) union(i, j)
    }
  for (const group of manualGroups) {
    const idx = group.map((uid) => cards.findIndex((c) => c.uid === uid)).filter((i) => i >= 0)
    for (const i of idx.slice(1)) union(idx[0], i)
  }
  const members = new Map()
  cards.forEach((c, i) => members.set(find(i), [...(members.get(find(i)) ?? []), c]))
  for (const group of members.values()) {
    const lead = group.find((c) => c.lang === 'en') ?? group[0]
    for (const c of group) c.art = lead.uid
  }
  return members.size
}

// ECB reference rates (EUR base). Falls back to the previously committed rates.
async function exchangeRates() {
  try {
    const data = await get(`https://api.frankfurter.dev/v1/latest?base=EUR&symbols=${CURRENCIES.join(',')}`, { json: true })
    return { date: data.date, base: 'EUR', rates: { EUR: 1, ...data.rates } }
  } catch (err) {
    console.warn(`  ! exchange rates unavailable (${err.message}) – keeping previous rates`)
    const prev = JSON.parse(await readFile(path.join(ROOT, 'src/data/cards.json'), 'utf8').catch(() => '{}'))
    if (prev.rates) return prev.rates
    throw err
  }
}

async function exists(p) {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

async function downloadImage(card) {
  const rel = `cards/${card.lang}/${card.set}-${card.number}.webp`
  const out = path.join(ROOT, 'public', rel)
  if (!(await exists(out))) {
    const res = await fetch(card.imageSrc, { headers: UA })
    if (!res.ok) throw new Error(`image ${card.imageSrc}: HTTP ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    await mkdir(path.dirname(out), { recursive: true })
    await sharp(buf).resize({ width: 600, withoutEnlargement: true }).webp({ quality: 82 }).toFile(out)
  }
  return `/${rel}`
}

async function pool(items, size, fn) {
  const results = new Array(items.length)
  let next = 0
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < items.length) {
        const i = next++
        results[i] = await fn(items[i], i)
      }
    }),
  )
  return results
}

async function main() {
  const overrides = JSON.parse(await readFile(path.join(ROOT, 'data/overrides.json'), 'utf8'))

  console.log('Fetching Limitless lists…')
  const [en, ja] = await Promise.all([limitless('en'), limitless('ja')])
  console.log(`  EN ${en.length}, JA ${ja.length}`)

  let cards = [...en, ...ja]
  for (const extra of overrides.extraCards ?? []) {
    if (!cards.some((c) => c.uid === extra.uid)) cards.push({ ...extra, ...rarityInfo(extra.rarityRaw) })
  }

  console.log('Verifying artist + fetching variants and prices…')
  const problems = []
  const enIndex = await tcgdexEnIndex()
  await pool(cards, 6, async (card) => {
    if (!card.extra) {
      const artist = await verifyArtist(card)
      card.artist = artist
      if (artist && !/shinji kanda/i.test(artist)) card.drop = `artist is ${artist}`
    }
    card.tcg = await tcgdexCard(card, enIndex)
    if (!card.tcg) console.warn(`  ! no TCGdex match for ${card.uid} – assuming one variant`)
  })
  for (const c of cards.filter((c) => c.drop)) console.log(`  - dropping ${c.uid}: ${c.drop}`)
  cards = cards.filter((c) => !c.drop && !(overrides.exclude ?? []).includes(c.uid))

  for (const c of cards) {
    const o = overrides.cards?.[c.uid]
    if (o) Object.assign(c, o, o.rarityRaw ? rarityInfo(o.rarityRaw) : {})
    c.variants = o?.variants ?? buildVariants(c, c.tcg)
    c.priceEur = c.variants[0].priceEur
  }

  if (!SKIP_IMAGES) {
    console.log('Downloading images…')
    await pool(cards, 6, async (card) => {
      try {
        card.image = await downloadImage(card)
      } catch (err) {
        problems.push(`${card.uid}: ${err.message}`)
      }
    })
  } else {
    for (const c of cards) c.image = `/cards/${c.lang}/${c.set}-${c.number}.webp`
  }

  if (!problems.length) {
    const groups = await groupArtworks(cards, overrides.artGroups)
    console.log(`Grouped ${cards.length} prints into ${groups} artworks`)
  }

  cards.sort(
    (a, b) =>
      a.rarityRank - b.rarityRank ||
      a.lang.localeCompare(b.lang) ||
      a.set.localeCompare(b.set) ||
      a.number.localeCompare(b.number, undefined, { numeric: true }),
  )

  const output = cards.map(({ uid, lang, set, setName, number, code, name, rarity, rarityRank, rarityRaw, image, priceEur, url, art, variants }) => ({
    uid, lang, set, setName, number, code, name, rarity, rarityRank, rarityRaw, image, priceEur, url, art, variants,
  }))
  const rates = await exchangeRates()
  await writeFile(
    path.join(ROOT, 'src/data/cards.json'),
    JSON.stringify({ updated: new Date().toISOString(), rates, cards: output }, null, 2) + '\n',
  )

  const noPrice = output.filter((c) => c.priceEur == null).map((c) => c.uid)
  console.log(`\nWrote ${output.length} cards (EN ${output.filter((c) => c.lang === 'en').length}, JA ${output.filter((c) => c.lang === 'ja').length})`)
  console.log(`Missing price: ${noPrice.length ? noPrice.join(', ') : 'none'}`)
  console.log(`Variants: ${output.reduce((n, c) => n + c.variants.length, 0)} collectible items`)
  if (problems.length) {
    console.error(`\nMISSING IMAGES (${problems.length}):\n  ${problems.join('\n  ')}`)
    process.exit(1)
  }
  console.log('All cards have images ✔')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
