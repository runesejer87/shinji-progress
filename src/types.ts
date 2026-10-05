export type Lang = 'en' | 'ja'

export interface Variant {
  key: string
  label: string
  priceEur: number | null
}

export interface Card {
  uid: string
  lang: Lang
  set: string
  setName: string
  number: string
  code: string
  name: string
  rarity: string
  rarityRank: number
  rarityRaw: string
  image: string
  priceEur: number | null
  url: string
  /** uid of the artwork group this print belongs to */
  art: string
  /** first entry is the base printing */
  variants: Variant[]
}

/** One collectible thing: a specific variant of a specific print. */
export interface Item {
  id: string
  card: Card
  variant: Variant
}

/** All prints (EN + JP, reprints) of the same illustration. */
export interface Artwork {
  id: string
  name: string
  rarity: string
  rarityRank: number
  prints: Card[]
}
