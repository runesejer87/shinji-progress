import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

// Each card has a last-write-wins entry, so offline edits on several devices
// merge cleanly: { uid: { o: 1 = collected / 0 = not, t: edit time } }.
export type Entries = Record<string, { o: 0 | 1; t: number }>
export type SyncStatus = 'locked' | 'syncing' | 'synced' | 'offline' | 'error'

const KEY = 'shinji-collection-v2'
const LEGACY_KEY = 'shinji-collection-v1'
const PASSWORD_KEY = 'shinji-password'
const API = '/api/collection'

const storage = {
  get(key: string) {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  set(key: string, value: string | null) {
    try {
      if (value == null) localStorage.removeItem(key)
      else localStorage.setItem(key, value)
    } catch {
      // storage unavailable (private mode)
    }
  },
}

function loadEntries(): Entries {
  const raw = storage.get(KEY)
  if (raw) return JSON.parse(raw) as Entries
  // Migrate the original local-only format (array of uids).
  const legacy = storage.get(LEGACY_KEY)
  const now = Date.now()
  return Object.fromEntries(((legacy ? JSON.parse(legacy) : []) as string[]).map((uid) => [uid, { o: 1, t: now }]))
}

export function merge(a: Entries, b: Entries): Entries {
  const out = { ...a }
  for (const [uid, e] of Object.entries(b)) if (!out[uid] || e.t > out[uid].t) out[uid] = e
  return out
}

class AuthError extends Error {}

async function request(password: string, method: 'GET' | 'PUT', entries?: Entries): Promise<Entries> {
  const res = await fetch(API, {
    method,
    headers: { 'x-password': password, ...(entries && { 'content-type': 'application/json' }) },
    body: entries && JSON.stringify({ entries }),
    cache: 'no-store',
  })
  if (res.status === 401) throw new AuthError('Wrong password')
  if (!res.ok) throw new Error(`Sync failed (${res.status})`)
  return ((await res.json()) as { entries: Entries }).entries
}

export function useCollection() {
  const [entries, setEntries] = useState<Entries>(loadEntries)
  const [password, setPassword] = useState(() => storage.get(PASSWORD_KEY))
  const [status, setStatus] = useState<SyncStatus>(password ? 'syncing' : 'locked')
  const [dirty, setDirty] = useState(0)
  const entriesRef = useRef(entries)
  entriesRef.current = entries

  const owned = useMemo(() => new Set(Object.keys(entries).filter((uid) => entries[uid].o === 1)), [entries])

  useEffect(() => storage.set(KEY, JSON.stringify(entries)), [entries])

  const lock = useCallback((reason?: string) => {
    storage.set(PASSWORD_KEY, null)
    setPassword(null)
    setStatus('locked')
    if (reason) console.warn(reason)
  }, [])

  // Push local entries; the server merges and returns the combined collection.
  const sync = useCallback(async () => {
    if (!password) return
    if (!navigator.onLine) return setStatus('offline')
    setStatus('syncing')
    try {
      const remote = await request(password, 'PUT', entriesRef.current)
      setEntries((local) => merge(local, remote))
      setStatus('synced')
    } catch (err) {
      if (err instanceof AuthError) lock('Password no longer valid')
      else setStatus(navigator.onLine ? 'error' : 'offline')
    }
  }, [password, lock])

  // Sync on start, when returning to the app, when back online, and every minute.
  useEffect(() => {
    if (!password) return
    sync()
    const onVisible = () => document.visibilityState === 'visible' && sync()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', sync)
    const timer = setInterval(() => document.visibilityState === 'visible' && sync(), 60_000)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', sync)
      clearInterval(timer)
    }
  }, [password, sync])

  // Debounced push after local edits.
  useEffect(() => {
    if (!dirty) return
    const timer = setTimeout(sync, 600)
    return () => clearTimeout(timer)
  }, [dirty, sync])

  const unlock = useCallback(async (pw: string) => {
    let remote: Entries
    try {
      remote = await request(pw, 'GET')
    } catch (err) {
      throw err instanceof AuthError ? err : new Error('Could not reach the server – check your connection')
    }
    setEntries((local) => merge(local, remote))
    storage.set(PASSWORD_KEY, pw)
    setPassword(pw)
  }, [])

  const toggle = useCallback((uid: string) => {
    setEntries((prev) => ({ ...prev, [uid]: { o: prev[uid]?.o === 1 ? 0 : 1, t: Date.now() } }))
    setDirty((n) => n + 1)
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
    const now = Date.now()
    setEntries((prev) => ({ ...prev, ...Object.fromEntries(ids.map((uid) => [uid, { o: 1 as const, t: now }])) }))
    setDirty((n) => n + 1)
    return ids.length
  }, [])

  return { owned, toggle, exportBackup, importBackup, status, unlock, lock: () => lock(), sync }
}
