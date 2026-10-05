import { useEffect } from 'react'
import type { Card } from '../types'
import { useCurrency } from '../currency'
import { itemsOf } from '../data'

interface Props {
  card: Card
  owned: Set<string>
  onToggle: (uid: string) => void
  onClose: () => void
}

export function Lightbox({ card, owned, onToggle, onClose }: Props) {
  const { format } = useCurrency()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={card.name}
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 overflow-y-auto bg-black/85 p-4 backdrop-blur-md"
    >
      <img
        src={card.image}
        alt={`${card.name} (${card.code})`}
        className="max-h-[56dvh] w-auto max-w-full rounded-[4.5%/3.2%] shadow-2xl shadow-black"
        onClick={(e) => e.stopPropagation()}
      />
      <div className="w-full max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
        <p className="text-lg font-bold">{card.name}</p>
        <p className="text-sm text-zinc-400">
          {card.setName} · <span className="font-mono">{card.code}</span> · {card.rarityRaw || card.rarity}
        </p>
        <ul className="mt-4 space-y-1.5 text-left">
          {itemsOf(card).map((item) => {
            const on = owned.has(item.id)
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onToggle(item.id)}
                  aria-pressed={on}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                    on ? 'bg-accent/15 ring-1 ring-accent/60' : 'bg-white/6 hover:bg-white/10'
                  }`}
                >
                  <span
                    className={`grid size-5 shrink-0 place-items-center rounded-md text-xs font-bold ${on ? 'bg-accent text-bg' : 'ring-1 ring-zinc-500'}`}
                    aria-hidden
                  >
                    {on && '✓'}
                  </span>
                  <span className="flex-1 font-medium">{item.variant.label}</span>
                  <span className="tabular-nums text-accent-2">{format(item.variant.priceEur)}</span>
                </button>
              </li>
            )
          })}
        </ul>
        <div className="mt-3 flex gap-2">
          <a
            href={card.url}
            target="_blank"
            rel="noreferrer"
            className="flex-1 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-white/15"
          >
            Card details on Limitless
          </a>
        </div>
      </div>
      <button type="button" onClick={onClose} className="absolute top-4 right-4 rounded-full bg-white/10 p-2 hover:bg-white/20" aria-label="Close">
        <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden>
          <path d="M5.3 5.3a1 1 0 0 1 1.4 0L10 8.6l3.3-3.3a1 1 0 1 1 1.4 1.4L11.4 10l3.3 3.3a1 1 0 0 1-1.4 1.4L10 11.4l-3.3 3.3a1 1 0 0 1-1.4-1.4L8.6 10 5.3 6.7a1 1 0 0 1 0-1.4Z" />
        </svg>
      </button>
    </div>
  )
}
