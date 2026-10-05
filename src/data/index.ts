import data from './cards.json'
import type { Artwork, Card, Item } from '../types'

export const cards = data.cards as Card[]
export const pricesUpdated = new Date(data.updated)
export const exchange = data.rates as { date: string; base: 'EUR'; rates: Record<string, number> }

// The base variant keeps the plain card uid so earlier saved progress still applies.
export const itemId = (card: Card, index: number) => (index === 0 ? card.uid : `${card.uid}:${card.variants[index].key}`)

export const itemsOf = (card: Card): Item[] => card.variants.map((variant, i) => ({ id: itemId(card, i), card, variant }))

export const items: Item[] = cards.flatMap(itemsOf)

export const artworks: Artwork[] = (() => {
  const byArt = new Map<string, Card[]>()
  for (const c of cards) byArt.set(c.art, [...(byArt.get(c.art) ?? []), c])
  return [...byArt.entries()]
    .map(([id, prints]) => {
      prints.sort(
        (a, b) =>
          a.lang.localeCompare(b.lang) || a.rarityRank - b.rarityRank || a.set.localeCompare(b.set, undefined, { numeric: true }),
      )
      const top = prints.reduce((best, c) => (c.rarityRank < best.rarityRank ? c : best))
      const name = (prints.find((c) => c.lang === 'en') ?? prints[0]).name
      return { id, name, rarity: top.rarity, rarityRank: top.rarityRank, prints }
    })
    .sort((a, b) => a.rarityRank - b.rarityRank || a.name.localeCompare(b.name))
})()
