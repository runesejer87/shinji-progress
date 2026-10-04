import { useMemo, useRef, useState } from 'react'
import { cards, exchange, pricesUpdated } from './data'
import { currencies, useCurrency } from './currency'
import { useCollection } from './hooks/useCollection'
import { ProgressHeader } from './components/ProgressHeader'
import { CardTile } from './components/CardTile'
import { Lightbox } from './components/Lightbox'
import type { Card, Lang } from './types'

type LangFilter = 'all' | Lang
type Status = 'all' | 'missing' | 'owned'

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-1 rounded-xl border border-line bg-surface p-1 sm:flex-none">
      {options.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`flex-1 rounded-lg px-2.5 py-1.5 text-sm font-medium whitespace-nowrap transition ${
            value === key ? 'bg-white/12 text-white' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export default function App() {
  const { owned, toggle, exportBackup, importBackup } = useCollection()
  const [lang, setLang] = useState<LangFilter>('all')
  const [status, setStatus] = useState<Status>('all')
  const [query, setQuery] = useState('')
  const [inspecting, setInspecting] = useState<Card | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const { currency, setCurrency } = useCurrency()

  const flash = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const visible = cards.filter(
      (c) =>
        (lang === 'all' || c.lang === lang) &&
        (status === 'all' || (status === 'owned') === owned.has(c.uid)) &&
        (!q || `${c.name} ${c.setName} ${c.code}`.toLowerCase().includes(q)),
    )
    const byRarity = new Map<string, Card[]>()
    for (const c of visible) byRarity.set(c.rarity, [...(byRarity.get(c.rarity) ?? []), c])
    return [...byRarity.entries()]
  }, [lang, status, query, owned])

  const rarityTotals = useMemo(() => {
    const scoped = cards.filter((c) => lang === 'all' || c.lang === lang)
    const map = new Map<string, { have: number; total: number }>()
    for (const c of scoped) {
      const t = map.get(c.rarity) ?? { have: 0, total: 0 }
      t.total++
      if (owned.has(c.uid)) t.have++
      map.set(c.rarity, t)
    }
    return map
  }, [lang, owned])

  const scopedCards = useMemo(() => cards.filter((c) => lang === 'all' || c.lang === lang), [lang])
  const ownedInScope = scopedCards.filter((c) => owned.has(c.uid)).length

  return (
    <div className="mx-auto max-w-7xl px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-16 sm:px-6">
      <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Shinji Kanda <span className="text-zinc-500">Collection</span>
          </h1>
          <p className="text-sm text-zinc-500">Every physical card, English &amp; Japanese</p>
        </div>
        <div className="flex gap-2">
          <label className="relative">
            <span className="sr-only">Currency</span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="appearance-none rounded-xl border border-line bg-surface py-2 pr-7 pl-3 text-sm font-medium text-zinc-300 hover:bg-white/8 focus:border-accent focus:outline-none"
            >
              {currencies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <svg viewBox="0 0 20 20" fill="currentColor" className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-zinc-500" aria-hidden>
              <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z" />
            </svg>
          </label>
          <button
            type="button"
            onClick={exportBackup}
            className="rounded-xl border border-line bg-surface px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-white/8"
          >
            Export
          </button>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="rounded-xl border border-line bg-surface px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-white/8"
          >
            Import
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              try {
                const n = await importBackup(file)
                flash(`Imported ${n} cards`)
              } catch {
                flash('That file is not a valid backup')
              }
            }}
          />
        </div>
      </header>

      <ProgressHeader cards={scopedCards} owned={owned} />

      <div className="sticky top-0 z-30 -mx-4 mt-4 border-b border-line/60 bg-bg/85 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
        <div className="mb-2.5 flex items-center gap-3 text-xs font-semibold tabular-nums">
          <span className="text-zinc-300">
            {ownedInScope}/{scopedCards.length}
          </span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2 transition-[width] duration-500"
              style={{ width: `${scopedCards.length ? (ownedInScope / scopedCards.length) * 100 : 0}%` }}
            />
          </div>
          <span className="text-accent">{scopedCards.length ? Math.round((ownedInScope / scopedCards.length) * 100) : 0}%</span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex gap-2">
            <Segmented<LangFilter> value={lang} onChange={setLang} options={[['all', 'All'], ['en', 'EN'], ['ja', 'JP']]} />
            <Segmented<Status> value={status} onChange={setStatus} options={[['all', 'All'], ['missing', 'Missing'], ['owned', 'Got']]} />
          </div>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, set or ID…"
            className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-4 py-2 text-sm placeholder:text-zinc-500 focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      <main className="mt-6 space-y-12">
        {groups.length === 0 && <p className="py-20 text-center text-zinc-500">No cards match these filters.</p>}
        {groups.map(([rarity, list]) => {
          const t = rarityTotals.get(rarity)
          return (
            <section key={rarity}>
              <div className="mb-4 flex items-baseline justify-between border-b border-line pb-2">
                <h2 className="text-lg font-bold sm:text-xl">{rarity}</h2>
                {t && (
                  <span className="text-sm tabular-nums text-zinc-400">
                    {t.have}/{t.total}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                {list.map((card) => (
                  <CardTile key={card.uid} card={card} owned={owned.has(card.uid)} onToggle={toggle} onInspect={setInspecting} />
                ))}
              </div>
            </section>
          )
        })}
      </main>

      <footer className="mt-16 text-center text-xs text-zinc-600">
        Tap a card to mark it collected · Prices: Cardmarket trend, updated {pricesUpdated.toLocaleDateString()}
        {currency !== 'EUR' && <> · converted from EUR at ECB rate of {new Date(exchange.date).toLocaleDateString()}</>} · Progress is saved on this device
        <br />
        Card images via Limitless TCG. Pokémon and card artwork © Nintendo, Creatures, GAME FREAK, The Pokémon Company.
      </footer>

      {inspecting && (
        <Lightbox card={inspecting} owned={owned.has(inspecting.uid)} onToggle={toggle} onClose={() => setInspecting(null)} />
      )}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-bg shadow-xl">
          {toast}
        </div>
      )}
    </div>
  )
}
