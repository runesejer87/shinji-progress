import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { exchange } from './data'

const KEY = 'shinji-currency'
export const currencies = Object.keys(exchange.rates).sort((a, b) => (a === 'EUR' ? -1 : b === 'EUR' ? 1 : a.localeCompare(b)))

// Best guess from the browser locale's region, e.g. da-DK → DKK.
const REGION_CURRENCY: Record<string, string> = {
  US: 'USD', GB: 'GBP', DK: 'DKK', SE: 'SEK', NO: 'NOK', CH: 'CHF', JP: 'JPY', CA: 'CAD', AU: 'AUD',
}

function initialCurrency() {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved && saved in exchange.rates) return saved
  } catch {
    // storage unavailable
  }
  const region = navigator.language.split('-')[1]?.toUpperCase()
  const guess = region ? REGION_CURRENCY[region] : undefined
  return guess && guess in exchange.rates ? guess : 'EUR'
}

interface CurrencyState {
  currency: string
  setCurrency: (c: string) => void
  format: (eur: number | null) => string
}

const CurrencyContext = createContext<CurrencyState | null>(null)

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState(initialCurrency)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, currency)
    } catch {
      // storage unavailable
    }
  }, [currency])

  const formatter = useMemo(() => {
    const digits = currency === 'JPY' ? 0 : 2
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, minimumFractionDigits: digits, maximumFractionDigits: digits })
  }, [currency])

  const format = useCallback(
    (eur: number | null) => (eur == null ? '—' : formatter.format(eur * exchange.rates[currency])),
    [formatter, currency],
  )

  const value = useMemo(() => ({ currency, setCurrency, format }), [currency, format])
  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext)
  if (!ctx) throw new Error('useCurrency must be used inside CurrencyProvider')
  return ctx
}
