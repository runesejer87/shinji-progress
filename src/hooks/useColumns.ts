import { useEffect, useState } from 'react'

// Grid column count per breakpoint (matches Tailwind sm / md / xl).
const QUERIES: [string, number][] = [
  ['(min-width: 1280px)', 5],
  ['(min-width: 768px)', 4],
  ['(min-width: 640px)', 3],
]

function current() {
  return QUERIES.find(([q]) => window.matchMedia(q).matches)?.[1] ?? 2
}

export function useColumns() {
  const [cols, setCols] = useState(current)
  useEffect(() => {
    const lists = QUERIES.map(([q]) => window.matchMedia(q))
    const update = () => setCols(current())
    lists.forEach((l) => l.addEventListener('change', update))
    return () => lists.forEach((l) => l.removeEventListener('change', update))
  }, [])
  return cols
}
