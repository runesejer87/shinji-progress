import type { Card } from '../types'
import { formatEur } from '../format'

interface Props {
  card: Card
  owned: boolean
  onToggle: (uid: string) => void
  onInspect: (card: Card) => void
}

export function CardTile({ card, owned, onToggle, onInspect }: Props) {
  return (
    <figure className="group relative">
      <button
        type="button"
        onClick={() => onToggle(card.uid)}
        aria-pressed={owned}
        aria-label={`${card.name} ${card.code} – ${owned ? 'collected' : 'not collected'}`}
        className={`relative block w-full overflow-hidden rounded-[4.5%/3.2%] transition duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent active:scale-[0.97] ${
          owned
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
        {owned && (
          <span className="absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-accent text-bg shadow-lg">
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden>
              <path
                fillRule="evenodd"
                d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        )}
      </button>

      <figcaption className="mt-2.5 flex items-start justify-between gap-2 px-0.5">
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
        <span className="rounded-md bg-white/8 px-1.5 py-0.5 font-mono text-zinc-300">{card.code}</span>
        <span className="rounded-md bg-white/8 px-1.5 py-0.5 uppercase text-zinc-400">{card.lang === 'ja' ? 'JP' : 'EN'}</span>
        <span className="ml-auto rounded-md bg-accent-2/12 px-1.5 py-0.5 tabular-nums text-accent-2">{formatEur(card.priceEur)}</span>
      </div>
    </figure>
  )
}
