import data from './cards.json'
import type { Card } from '../types'

export const cards = data.cards as Card[]
export const pricesUpdated = new Date(data.updated)
