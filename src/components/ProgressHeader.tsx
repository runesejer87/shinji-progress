import type { Card } from '../types'
import { formatEur } from '../format'

interface Props {
  cards: Card[]
  owned: Set<string>
}

function Bar({ value, className = 'h-2.5' }: { value: number; className?: string }) {
  return (
    <div className={`w-full overflow-hidden rounded-full bg-white/8 ${className}`}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2 transition-[width] duration-500"
        style={{ width: `${value * 100}%` }}
      />
    </div>
  )
}

function stats(cards: Card[], owned: Set<string>) {
  const have = cards.filter((c) => owned.has(c.uid))
  const sum = (list: Card[]) => list.reduce((acc, c) => acc + (c.priceEur ?? 0), 0)
  return { have: have.length, total: cards.length, ratio: cards.length ? have.length / cards.length : 0, value: sum(have), totalValue: sum(cards) }
}

export function ProgressHeader({ cards, owned }: Props) {
  const all = stats(cards, owned)
  const langs = [
    { label: 'English', s: stats(cards.filter((c) => c.lang === 'en'), owned) },
    { label: 'Japanese', s: stats(cards.filter((c) => c.lang === 'ja'), owned) },
  ]

  return (
    <div className="rounded-3xl border border-line bg-surface/80 p-5 shadow-2xl shadow-black/40 sm:p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">Collection progress</p>
          <p className="mt-1 text-4xl font-extrabold tabular-nums sm:text-5xl">
            {all.have}
            <span className="text-zinc-500"> / {all.total}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-extrabold tabular-nums text-transparent bg-gradient-to-r from-accent to-accent-2 bg-clip-text sm:text-5xl">
            {Math.round(all.ratio * 100)}%
          </p>
        </div>
      </div>
      <Bar value={all.ratio} className="mt-4 h-3" />
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {langs.map(({ label, s }) => (
          <div key={label}>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">{label}</span>
              <span className="font-semibold tabular-nums">
                {s.have}/{s.total}
              </span>
            </div>
            <Bar value={s.ratio} className="mt-1.5 h-1.5" />
          </div>
        ))}
        <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-2 text-sm sm:flex-col sm:items-start sm:justify-center sm:py-1.5">
          <span className="text-zinc-400">Collection value</span>
          <span className="font-semibold tabular-nums">
            {formatEur(all.value)} <span className="text-zinc-500">/ {formatEur(all.totalValue)}</span>
          </span>
        </div>
      </div>
    </div>
  )
}
