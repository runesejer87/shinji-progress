const eur = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })

export const formatEur = (value: number | null) => (value == null ? '—' : eur.format(value))
