/*
 * The Version box's list of branches or tags. GitHub's API allows a browser 60
 * requests an hour, so what matters is how rarely it is asked: once per page,
 * and not again for an hour after that.
 */

import { beforeEach, describe, expect, test } from 'vitest'
import {
  clearRefsMemory, isDraftTag, latestTag, listRefs, nextPage, refOptions, refsApiUrl, REFS_FRESH_MS, REFS_MAX_AGE_MS, sortRefs,
} from '../src/refs.js'

const source = { owner: 'o', repo: 'r' }

interface Page { names: string[], next?: string, status?: number }

function fakeFetch (pages: Record<string, Page>): typeof fetch & { calls: string[] } {
  const calls: string[] = []
  const fn = async (input: string | URL | Request): Promise<Response> => {
    const url = String(input)
    calls.push(url)
    const page = pages[url]
    if (!page) return new Response('not found', { status: 404 })
    const headers = page.next !== undefined ? { link: `<${page.next}>; rel="next", <${page.next}>; rel="last"` } : undefined
    return new Response(JSON.stringify(page.names.map((name) => ({ name, commit: {} }))), {
      status: page.status ?? 200,
      ...(headers ? { headers } : {}),
    })
  }
  return Object.assign(fn as typeof fetch, { calls })
}

function memoryStorage (): Pick<Storage, 'getItem' | 'setItem'> & { items: Map<string, string> } {
  const items = new Map<string, string>()
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => { items.set(key, value) },
  }
}

const branches = refsApiUrl(source, 'branches')
const tags = refsApiUrl(source, 'tags')

beforeEach(() => { clearRefsMemory() })

describe('the GitHub API', () => {
  test('is asked for 100 refs a page', () => {
    expect(branches).toBe('https://api.github.com/repos/o/r/branches?per_page=100')
    expect(tags).toBe('https://api.github.com/repos/o/r/tags?per_page=100')
  })

  test('next page comes from the Link header', () => {
    const link = '<https://api.github.com/x?page=2>; rel="next", <https://api.github.com/x?page=5>; rel="last"'
    expect(nextPage(link)).toBe('https://api.github.com/x?page=2')
    expect(nextPage('<https://api.github.com/x?page=1>; rel="prev"')).toBeUndefined()
    expect(nextPage(null)).toBeUndefined()
  })
})

describe('sortRefs', () => {
  test('puts the newest tag first, reading numbers as numbers', () => {
    expect(sortRefs(['v1.2.0', 'v1.10.0', 'v1.9.1', 'v2.0.0'], 'tags')).toEqual(['v2.0.0', 'v1.10.0', 'v1.9.1', 'v1.2.0'])
  })

  test('leaves branches in the order GitHub gives', () => {
    expect(sortRefs(['dev', 'main', 'release'], 'branches')).toEqual(['dev', 'main', 'release'])
  })
})

describe('drafts and the latest tag', () => {
  test('a pre-release is named as one', () => {
    for (const tag of ['v1.3.0-draft', 'v2.0.0-rc.1', '1.0.0-beta', 'v1.0.0-alpha2', 'v3-preview']) expect(isDraftTag(tag)).toBe(true)
    for (const tag of ['v1.2.0', 'v2026-11-17', 'release-2024', 'v1.0.0-final', 'redraft']) expect(isDraftTag(tag)).toBe(false)
  })

  test('the latest tag is the newest that is not a draft', () => {
    expect(latestTag(sortRefs(['v1.1.0', 'v1.3.0-draft', 'v1.2.0'], 'tags'))).toBe('v1.2.0')
    expect(latestTag(['v1.0.0-rc.1'])).toBeUndefined()
  })
})

describe('refOptions', () => {
  test('keeps GitHub order, adding the starting ref and the one in use when it lacks them', () => {
    expect(refOptions(['dev', 'main'], 'main', 'main')).toEqual(['dev', 'main'])
    expect(refOptions(['dev', 'main'], 'v1.0.0', 'main')).toEqual(['v1.0.0', 'dev', 'main'])
    expect(refOptions(['v2', 'v1'], 'v1', 'main')).toEqual(['main', 'v2', 'v1'])
    expect(refOptions(['v2'], 'abc123', 'main')).toEqual(['main', 'abc123', 'v2'])
    expect(refOptions([], '', 'main')).toEqual(['main'])
  })
})

describe('listRefs', () => {
  test('follows every page', async () => {
    const page2 = `${branches}&page=2`
    const fetch = fakeFetch({ [branches]: { names: ['a', 'b'], next: page2 }, [page2]: { names: ['c'] } })
    expect(await listRefs(source, 'branches', { fetch, storage: null })).toEqual(['a', 'b', 'c'])
  })

  test('asks GitHub once however many elements want the list', async () => {
    const fetch = fakeFetch({ [tags]: { names: ['v1', 'v2'] } })
    const [a, b] = await Promise.all([
      listRefs(source, 'tags', { fetch, storage: null }),
      listRefs(source, 'tags', { fetch, storage: null }),
    ])
    expect(a).toEqual(['v2', 'v1'])
    expect(b).toBe(a)
    expect(fetch.calls).toHaveLength(1)
  })

  test('keeps branches and tags apart', async () => {
    const fetch = fakeFetch({ [branches]: { names: ['main'] }, [tags]: { names: ['v1'] } })
    expect(await listRefs(source, 'branches', { fetch, storage: null })).toEqual(['main'])
    expect(await listRefs(source, 'tags', { fetch, storage: null })).toEqual(['v1'])
  })

  test('does not hold on to a failure', async () => {
    const limited = fakeFetch({ [branches]: { names: [], status: 403 } })
    await expect(listRefs(source, 'branches', { fetch: limited, storage: null })).rejects.toThrow('403')
    const fetch = fakeFetch({ [branches]: { names: ['main'] } })
    expect(await listRefs(source, 'branches', { fetch, storage: null })).toEqual(['main'])
  })

  // Lets the background refresh, which nobody awaits, finish.
  const settle = (): Promise<void> => new Promise((resolve) => { setTimeout(resolve, 0) })

  test('a reload within a minute uses the stored list and asks GitHub nothing', async () => {
    const storage = memoryStorage()
    let now = 1_000_000
    await listRefs(source, 'branches', { fetch: fakeFetch({ [branches]: { names: ['main'] } }), storage, now: () => now })
    expect(storage.items.size).toBe(1)

    // A reload: memory is gone, storage is not.
    clearRefsMemory()
    now += REFS_FRESH_MS - 1
    const fetch = fakeFetch({ [branches]: { names: ['main', 'dev'] } })
    expect(await listRefs(source, 'branches', { fetch, storage, now: () => now })).toEqual(['main'])
    await settle()
    expect(fetch.calls).toHaveLength(0)
  })

  test('a later reload shows the stored list at once, then what GitHub has now', async () => {
    const storage = memoryStorage()
    let now = 1_000_000
    await listRefs(source, 'branches', { fetch: fakeFetch({ [branches]: { names: ['main'] } }), storage, now: () => now })

    clearRefsMemory()
    now += REFS_FRESH_MS
    const fetch = fakeFetch({ [branches]: { names: ['automation/sync', 'main'] } })
    const updates: string[][] = []
    const first = await listRefs(source, 'branches', { fetch, storage, now: () => now, onUpdate: (refs) => updates.push(refs) })
    expect(first).toEqual(['main'])
    await settle()
    expect(fetch.calls).toHaveLength(1)
    expect(updates).toEqual([['automation/sync', 'main']])
    // Another element on the same page now gets the new list, without a request.
    expect(await listRefs(source, 'branches', { fetch, storage, now: () => now })).toEqual(['automation/sync', 'main'])
    expect(fetch.calls).toHaveLength(1)
    expect(JSON.parse(storage.items.get('dsv-refs:v1:o/r:branches')!)).toEqual({ at: now, refs: ['automation/sync', 'main'] })
  })

  test('a refresh that changes nothing, or fails, keeps the stored list quietly', async () => {
    const storage = memoryStorage()
    let now = 1_000_000
    await listRefs(source, 'branches', { fetch: fakeFetch({ [branches]: { names: ['main'] } }), storage, now: () => now })
    const updates: string[][] = []
    const onUpdate = (refs: string[]): void => { updates.push(refs) }

    clearRefsMemory()
    now += REFS_FRESH_MS
    expect(await listRefs(source, 'branches', { fetch: fakeFetch({ [branches]: { names: ['main'] } }), storage, now: () => now, onUpdate })).toEqual(['main'])
    await settle()

    clearRefsMemory()
    now += REFS_FRESH_MS
    const limited = fakeFetch({ [branches]: { names: [], status: 403 } })
    expect(await listRefs(source, 'branches', { fetch: limited, storage, now: () => now, onUpdate })).toEqual(['main'])
    await settle()
    expect(limited.calls).toHaveLength(1)
    expect(updates).toEqual([])
  })

  test('a list stored more than a day ago is not shown', async () => {
    const storage = memoryStorage()
    let now = 1_000_000
    await listRefs(source, 'branches', { fetch: fakeFetch({ [branches]: { names: ['old'] } }), storage, now: () => now })

    clearRefsMemory()
    now += REFS_MAX_AGE_MS
    const fetch = fakeFetch({ [branches]: { names: ['main'] } })
    expect(await listRefs(source, 'branches', { fetch, storage, now: () => now })).toEqual(['main'])
  })

  test('ignores a stored list it cannot read', async () => {
    const storage = memoryStorage()
    storage.items.set('dsv-refs:v1:o/r:branches', '{not json')
    const fetch = fakeFetch({ [branches]: { names: ['main'] } })
    expect(await listRefs(source, 'branches', { fetch, storage })).toEqual(['main'])
  })

  test('works when storage throws', async () => {
    const storage = {
      getItem: (): string | null => { throw new Error('blocked') },
      setItem: (): void => { throw new Error('blocked') },
    }
    const fetch = fakeFetch({ [branches]: { names: ['main'] } })
    expect(await listRefs(source, 'branches', { fetch, storage })).toEqual(['main'])
  })
})
