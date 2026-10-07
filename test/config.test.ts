/*
 * How a config's URLs become fetchable. A host's standards usually live on
 * GitHub, and only raw.githubusercontent.com answers a browser's cross-origin
 * request, so every page link has to be rewritten - at the ref the user asked for.
 */

import { describe, expect, test } from 'vitest'
import {
  defaultRef, exampleList, fetchUrl, parseGitHubUrl, resolveStandard, shapesRepo,
  type ValidatorConfig,
} from '../src/config.js'

const blob = 'https://github.com/o/r/blob/main/dir/shape.ttl'
const raw = 'https://raw.githubusercontent.com/o/r/main/dir/shape.ttl'

describe('GitHub URLs', () => {
  test('page and raw links parse to the same file', () => {
    const expected = { owner: 'o', repo: 'r', ref: 'main', path: 'dir/shape.ttl' }
    expect(parseGitHubUrl(blob)).toEqual(expected)
    expect(parseGitHubUrl(raw)).toEqual(expected)
  })

  test('become raw links, at the requested ref', () => {
    expect(fetchUrl(blob)).toBe(raw)
    expect(fetchUrl(blob, 'v1.0.0')).toBe('https://raw.githubusercontent.com/o/r/v1.0.0/dir/shape.ttl')
    expect(fetchUrl(raw, 'v1.0.0')).toBe('https://raw.githubusercontent.com/o/r/v1.0.0/dir/shape.ttl')
  })

  test('anything else is fetched as written, whatever the ref', () => {
    expect(fetchUrl('https://example.org/shape.ttl', 'v1.0.0')).toBe('https://example.org/shape.ttl')
  })
})

describe('a config', () => {
  const config: ValidatorConfig = {
    standards: [{
      name: 'Thing',
      shapes: [blob, 'https://example.org/extra.ttl'],
      context: 'https://github.com/o/r/blob/main/dir/context.jsonld',
      examples: [
        'https://github.com/o/r/blob/main/examples/valid%20thing.jsonld?x=1',
        { name: 'Named', url: 'https://example.org/named.json' },
      ],
    }],
  }
  const standard = config.standards[0]!

  test('is versioned at the ref of its first GitHub shape', () => {
    expect(defaultRef(config)).toBe('main')
    expect(defaultRef({ ...config, ref: 'v2' })).toBe('v2')
    expect(shapesRepo(config)).toEqual({ name: 'o/r', url: 'https://github.com/o/r' })
  })

  test('is not versioned when no shape comes from GitHub', () => {
    const offline = { standards: [{ name: 'Local', shapes: 'https://example.org/s.ttl' }] }
    expect(defaultRef(offline)).toBeUndefined()
    expect(shapesRepo(offline)).toBeUndefined()
  })

  test('resolves shapes and context at a ref', () => {
    expect(resolveStandard(standard, 'v2')).toEqual({
      shapes: ['https://raw.githubusercontent.com/o/r/v2/dir/shape.ttl', 'https://example.org/extra.ttl'],
      context: 'https://raw.githubusercontent.com/o/r/v2/dir/context.jsonld',
    })
    expect(resolveStandard({ name: 'No context', shapes: blob })).not.toHaveProperty('context')
  })

  test('names a bare example URL after its file', () => {
    expect(exampleList(standard).map((e) => e.name)).toEqual(['valid thing', 'Named'])
  })
})
