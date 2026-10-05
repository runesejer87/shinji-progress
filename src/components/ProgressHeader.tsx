import type { Item } from '../types'
import { useCurrency } from '../currency'

interface Props {
  items: Item[]
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

function stats(items: Item[], owned: Set<string>) {
  const have = items.filter((i) => owned.has(i.id))
  const sum = (list: Item[]) => list.reduce((acc, i) => acc + (i.variant.priceEur ?? 0), 0)
  return { have: have.length, total: items.length, ratio: items.length ? have.length / items.length : 0, value: sum(have), totalValue: sum(items) }
}

export function ProgressHeader({ items, owned }: Props) {
  const { format } = useCurrency()
  const all = stats(items, owned)
  const langs = [
    { label: 'English', s: stats(items.filter((i) => i.card.lang === 'en'), owned) },
    { label: 'Japanese', s: stats(items.filter((i) => i.card.lang === 'ja'), owned) },
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
            {format(all.value)} <span className="text-zinc-500">/ {format(all.totalValue)}</span>
          </span>
        </div>
      </div>
    </div>
  )
}
