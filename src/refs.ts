/*
 * The branches or tags the Version box offers, listed from GitHub's API.
 *
 * Unauthenticated, that API allows 60 requests an hour per IP address, shared
 * by every page the person has open. So a list is fetched at most once per page
 * however many elements ask, and kept in localStorage. On a later load the
 * stored list is shown straight away and refreshed in the background, so a
 * branch pushed a minute ago still appears, and a refresh that fails (the rate
 * limit, no connection) leaves the stored list in place rather than an empty
 * one. The list is the repository's public refs and holds nothing the person
 * typed or loaded. Records are never stored.
 *
 * Kept free of the DOM: the element passes in `fetch` and storage, and so can
 * Node tests.
 */

import type { VersionKind } from './config.js'

export interface RefSource { owner: string, repo: string }

export interface ListRefsOptions {
  fetch?: typeof fetch
  /** Where lists are kept between page loads; `null` keeps them in memory only. */
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null
  now?: () => number
  /** Called with the refreshed list when it differs from the stored one handed out first. */
  onUpdate?: (refs: string[]) => void
}

// Younger than this, a stored list is not refreshed: reloading a page over and
// over should not spend the rate limit. GitHub caches the answer as long anyway.
export const REFS_FRESH_MS = 60 * 1000
// Older than this, a stored list is too stale to show even while refreshing.
export const REFS_MAX_AGE_MS = 24 * 60 * 60 * 1000
// A repository with more refs than this is not one anyone picks from a list.
const MAX_PAGES = 10

export function refsApiUrl ({ owner, repo }: RefSource, kind: VersionKind): string {
  return `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${kind}?per_page=100`
}

/** The `rel="next"` URL of a GitHub `Link` header, if there is one. */
export function nextPage (link: string | null): string | undefined {
  if (link === null) return undefined
  for (const part of link.split(',')) {
    const match = /<([^>]+)>\s*;\s*rel="next"/.exec(part)
    if (match) return match[1]
  }
  return undefined
}

/*
 * Tags newest first, comparing the digits in them as numbers so that v1.10.0
 * comes before v1.9.0. GitHub returns branches in alphabetical order, which is
 * the order people look for them in.
 */
export function sortRefs (refs: string[], kind: VersionKind): string[] {
  if (kind === 'branches') return refs
  return [...refs].sort((a, b) => b.localeCompare(a, 'en', { numeric: true }))
}

/*
 * A pre-release by its name: `v1.3.0-draft`, `v2.0.0-rc.1`, `1.0.0-beta`. Only
 * these words count, since a dash alone is common in released tags (`v2026-11-17`).
 */
const DRAFT = /(?:^|[-._+])(?:draft|alpha|beta|rc|pre|preview|dev|snapshot|next|canary)(?=$|[-._+\d])/i

export function isDraftTag (tag: string): boolean {
  return DRAFT.test(tag)
}

/** The newest tag that is not a pre-release, from a list sorted newest first. */
export function latestTag (tags: readonly string[]): string | undefined {
  return tags.find((tag) => !isDraftTag(tag))
}

/**
 * What the menu lists: the repository's refs in their order, after the
 * configured ref and the one in use if GitHub didn't list them (`main` in a
 * list of tags, a commit from a deep link). The ref in use is always an
 * option, so the menu never hides what will be validated against.
 */
export function refOptions (refs: readonly string[], current: string, initial: string): string[] {
  const missing = [initial, current].filter((ref) => ref !== '' && !refs.includes(ref))
  return [...new Set([...missing, ...refs])]
}

interface Entry { refs: Promise<string[]>, listeners: Set<(refs: string[]) => void> }

const memory = new Map<string, Entry>()

function storageKey ({ owner, repo }: RefSource, kind: VersionKind): string {
  return `dsv-refs:v1:${owner}/${repo}:${kind}`
}

// Reading the property can throw in a sandboxed frame, as well as the calls.
function defaultStorage (): Pick<Storage, 'getItem' | 'setItem'> | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

function readStored (storage: ListRefsOptions['storage'], key: string, now: number): { refs: string[], fresh: boolean } | undefined {
  if (!storage) return undefined
  try {
    const raw = storage.getItem(key)
    if (raw === null) return undefined
    const stored = JSON.parse(raw) as { at?: unknown, refs?: unknown }
    if (typeof stored.at !== 'number' || now - stored.at >= REFS_MAX_AGE_MS) return undefined
    if (!Array.isArray(stored.refs) || !stored.refs.every((ref) => typeof ref === 'string')) return undefined
    // A time in the future means the clock moved; refresh rather than trust it.
    const age = now - stored.at
    return { refs: stored.refs as string[], fresh: age >= 0 && age < REFS_FRESH_MS }
  } catch {
    return undefined
  }
}

function sameRefs (a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((ref, i) => ref === b[i])
}

function writeStored (storage: ListRefsOptions['storage'], key: string, now: number, refs: string[]): void {
  try {
    storage?.setItem(key, JSON.stringify({ at: now, refs }))
  } catch {
    // Full or blocked storage only costs a refetch on the next load.
  }
}

async function fetchRefs (source: RefSource, kind: VersionKind, fetcher: typeof fetch): Promise<string[]> {
  const refs: string[] = []
  let url: string | undefined = refsApiUrl(source, kind)
  for (let page = 0; url !== undefined && page < MAX_PAGES; page++) {
    const response: Response = await fetcher(url)
    // 403 and 429 are the rate limit, 404 a private or missing repository.
    if (!response.ok) throw new Error(`GitHub answered ${response.status} for ${url}`)
    const body = await response.json() as { name?: unknown }[]
    if (!Array.isArray(body)) throw new Error(`GitHub sent no list for ${url}`)
    for (const entry of body) if (typeof entry.name === 'string') refs.push(entry.name)
    url = nextPage(response.headers.get('link'))
  }
  return sortRefs(refs, kind)
}

/**
 * The repository's branches or tags: from memory, else from storage (refreshed
 * in the background unless just stored, with `onUpdate` told of any change),
 * else from GitHub.
 */
export function listRefs (source: RefSource, kind: VersionKind, opts: ListRefsOptions = {}): Promise<string[]> {
  const key = storageKey(source, kind)
  const known = memory.get(key)
  if (known) {
    if (opts.onUpdate) known.listeners.add(opts.onUpdate)
    return known.refs
  }
  const storage = opts.storage !== undefined ? opts.storage : defaultStorage()
  const now = opts.now ?? Date.now
  const fetcher = opts.fetch ?? globalThis.fetch.bind(globalThis)
  const fetchAndStore = (): Promise<string[]> => fetchRefs(source, kind, fetcher).then((refs) => {
    writeStored(storage, key, now(), refs)
    return refs
  })
  const entry: Entry = { refs: Promise.resolve([]), listeners: new Set(opts.onUpdate ? [opts.onUpdate] : []) }
  const stored = readStored(storage, key, now())
  if (stored !== undefined) {
    entry.refs = Promise.resolve(stored.refs)
    if (!stored.fresh) {
      fetchAndStore().then((refs) => {
        entry.refs = Promise.resolve(refs)
        if (!sameRefs(refs, stored.refs)) for (const listener of entry.listeners) listener(refs)
      }, () => {
        // The stored list is still the best there is; the next load tries again.
      })
    }
  } else {
    entry.refs = fetchAndStore()
    // A failure (rate limit, no connection) should not stick for the life of the page.
    entry.refs.catch(() => memory.delete(key))
  }
  memory.set(key, entry)
  return entry.refs
}

/** Forget the lists held in memory. For tests; storage is left alone. */
export function clearRefsMemory (): void {
  memory.clear()
}
