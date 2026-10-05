import type { Card } from '../types'
import { itemsOf } from '../data'
import { useCurrency } from '../currency'

interface Props {
  card: Card
  owned: Set<string>
  onToggle: (id: string) => void
  onInspect: (card: Card) => void
}

export function CardTile({ card, owned, onToggle, onInspect }: Props) {
  const { format } = useCurrency()
  const items = itemsOf(card)
  const have = items.filter((i) => owned.has(i.id)).length
  const complete = have === items.length
  const base = items[0]

  return (
    <figure className="group relative min-w-0">
      <button
        type="button"
        onClick={() => onToggle(base.id)}
        aria-pressed={owned.has(base.id)}
        aria-label={`${card.name} ${card.code} ${base.variant.label} – ${owned.has(base.id) ? 'collected' : 'not collected'}`}
        className={`relative block w-full overflow-hidden rounded-[4.5%/3.2%] transition duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent active:scale-[0.97] ${
          have
            ? 'shadow-[0_0_0_2px_var(--color-accent),0_10px_40px_-8px_rgba(167,139,250,0.55)]'
            : 'shadow-lg shadow-black/50'
        }`}
      >
        <img
          src={card.image}
          alt={`${card.name} (${card.code})`}
          loading="lazy"
          decoding="async"
          width={600}
          height={837}
          className="aspect-[600/837] w-full bg-surface object-cover"
        />
        {complete ? (
          <span className="absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-accent text-bg shadow-lg">
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden>
              <path
                fillRule="evenodd"
                d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        ) : have > 0 ? (
          <span className="absolute top-2 right-2 rounded-full bg-bg/85 px-2 py-1 text-xs font-bold tabular-nums text-accent shadow-lg ring-1 ring-accent/60">
            {have}/{items.length}
          </span>
        ) : null}
        <span className="absolute top-2 left-2 rounded-md bg-bg/80 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-zinc-200">
          {card.lang === 'ja' ? 'JP' : 'EN'}
        </span>
      </button>

      {items.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {items.map((item) => {
            const on = owned.has(item.id)
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onToggle(item.id)}
                aria-pressed={on}
                title={`${item.variant.label} · ${format(item.variant.priceEur)}`}
                className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold transition ${
                  on ? 'bg-accent text-bg' : 'bg-white/8 text-zinc-400 hover:bg-white/14 hover:text-zinc-200'
                }`}
              >
                {on && '✓ '}
                {item.variant.label}
              </button>
            )
          })}
        </div>
      )}

      <figcaption className="mt-2 flex items-start justify-between gap-2 px-0.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{card.name}</p>
          <p className="truncate text-xs text-zinc-500">{card.setName}</p>
        </div>
        <button
          type="button"
          onClick={() => onInspect(card)}
          className="shrink-0 rounded-full p-1 text-zinc-500 hover:bg-white/10 hover:text-zinc-200"
          aria-label={`Enlarge ${card.name}`}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden>
            <path d="M3 3h5v2H5v3H3V3Zm9 0h5v5h-2V5h-3V3ZM3 12h2v3h3v2H3v-5Zm12 3v-3h2v5h-5v-2h3Z" />
          </svg>
        </button>
      </figcaption>
      <div className="mt-1.5 flex items-center gap-1.5 px-0.5 text-[11px] font-medium">
        <span className="truncate rounded-md bg-white/8 px-1.5 py-0.5 font-mono text-zinc-300">{card.code}</span>
        <span className="ml-auto shrink-0 rounded-md bg-accent-2/12 px-1.5 py-0.5 tabular-nums text-accent-2">{format(card.priceEur)}</span>
      </div>
    </figure>
  )
}
