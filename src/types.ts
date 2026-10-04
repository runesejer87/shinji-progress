export type Lang = 'en' | 'ja'

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
}
