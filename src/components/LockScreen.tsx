import { useState, type FormEvent } from 'react'

interface Props {
  onUnlock: (password: string) => Promise<void>
}

export function LockScreen({ onUnlock }: Props) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!password || busy) return
    setBusy(true)
    setError(null)
    try {
      await onUnlock(password.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl border border-line bg-surface/80 p-6 shadow-2xl shadow-black/40">
        <img src="/icon-192.png" alt="" className="mx-auto size-20 rounded-2xl shadow-lg shadow-accent/20" />
        <h1 className="mt-5 text-center text-2xl font-extrabold tracking-tight">
          Shinji Kanda <span className="text-zinc-500">Collection</span>
        </h1>
        <p className="mt-1 text-center text-sm text-zinc-500">Enter your password to sync your collection across devices.</p>
        <input
          type="password"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          aria-label="Password"
          className="mt-6 w-full rounded-xl border border-line bg-bg px-4 py-3 text-base placeholder:text-zinc-500 focus:border-accent focus:outline-none"
        />
        {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}
        <button
          type="submit"
          disabled={busy || !password}
          className="mt-4 w-full rounded-xl bg-gradient-to-r from-accent to-accent-2 px-4 py-3 text-sm font-bold text-bg transition hover:brightness-110 disabled:opacity-50"
        >
          {busy ? 'Checking…' : 'Unlock'}
        </button>
      </form>
    </div>
  )
}
