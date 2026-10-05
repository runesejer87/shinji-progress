// Cross-device collection sync, stored as one private JSON file in Vercel Blob.
//
//   GET  /api/collection            → current collection
//   PUT  /api/collection  {entries} → merge into stored collection, return result
//
// Every request needs `x-password` matching APP_PASSWORD.
// Entries are last-write-wins per card ({ uid: { o: 0|1, t: epoch ms } }), so
// devices can edit offline and merge without losing each other's changes.

import { timingSafeEqual } from 'node:crypto'
import { get, put } from '@vercel/blob'

type Entries = Record<string, { o: 0 | 1; t: number }>

const PATHNAME = 'collection.json'
const MAX_ENTRIES = 5000

function authorized(request: Request) {
  const expected = process.env.APP_PASSWORD
  const given = request.headers.get('x-password') ?? ''
  if (!expected) return false
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

async function load(): Promise<Entries> {
  const result = await get(PATHNAME, { access: 'private', useCache: false })
  if (!result || result.statusCode !== 200) return {}
  const data = JSON.parse(await new Response(result.stream).text())
  return data.entries ?? {}
}

function parse(body: unknown): Entries | null {
  const entries = (body as { entries?: unknown })?.entries
  if (!entries || typeof entries !== 'object' || Array.isArray(entries)) return null
  const list = Object.entries(entries as Record<string, unknown>)
  if (list.length > MAX_ENTRIES) return null
  const out: Entries = {}
  for (const [uid, v] of list) {
    const e = v as { o?: unknown; t?: unknown }
    if (uid.length > 64 || (e?.o !== 0 && e?.o !== 1) || typeof e.t !== 'number' || !Number.isFinite(e.t)) return null
    out[uid] = { o: e.o, t: e.t }
  }
  return out
}

function merge(a: Entries, b: Entries): Entries {
  const out = { ...a }
  for (const [uid, e] of Object.entries(b)) if (!out[uid] || e.t > out[uid].t) out[uid] = e
  return out
}

async function deny() {
  // Slow down password guessing.
  await new Promise((r) => setTimeout(r, 800))
  return json({ error: 'Wrong password' }, 401)
}

export async function GET(request: Request) {
  if (!authorized(request)) return deny()
  return json({ entries: await load() })
}

export async function PUT(request: Request) {
  if (!authorized(request)) return deny()
  const incoming = parse(await request.json().catch(() => null))
  if (!incoming) return json({ error: 'Invalid body' }, 400)
  const merged = merge(await load(), incoming)
  await put(PATHNAME, JSON.stringify({ updated: Date.now(), entries: merged }), {
    access: 'private',
    allowOverwrite: true,
    addRandomSuffix: false,
    contentType: 'application/json',
  })
  return json({ entries: merged })
}
