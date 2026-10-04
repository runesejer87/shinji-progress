import { useCallback, useEffect, useState } from 'react'

const KEY = 'shinji-collection-v1'

function load(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

export function useCollection() {
  const [owned, setOwned] = useState<Set<string>>(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify([...owned]))
    } catch {
      // storage unavailable (private mode); progress stays in memory
    }
  }, [owned])

  // Keep multiple open tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => e.key === KEY && setOwned(load())
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const toggle = useCallback((uid: string) => {
    setOwned((prev) => {
      const next = new Set(prev)
      if (next.has(uid)) next.delete(uid)
      else next.add(uid)
      return next
    })
  }, [])

  const exportBackup = useCallback(() => {
    const blob = new Blob(
      [JSON.stringify({ app: 'shinji-progress', exported: new Date().toISOString(), owned: [...owned] }, null, 2)],
      { type: 'application/json' },
    )
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `kanda-collection-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }, [owned])

  const importBackup = useCallback(async (file: File) => {
    const parsed = JSON.parse(await file.text())
    const ids: unknown = Array.isArray(parsed) ? parsed : parsed?.owned
    if (!Array.isArray(ids) || !ids.every((x) => typeof x === 'string')) throw new Error('Not a valid backup file')
    setOwned((prev) => new Set([...prev, ...ids]))
    return ids.length
  }, [])

  return { owned, toggle, exportBackup, importBackup }
}
