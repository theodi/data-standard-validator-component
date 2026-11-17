/*
 * How a config's URLs become fetchable. A host's standards usually live on
 * GitHub, and only raw.githubusercontent.com answers a browser's cross-origin
 * request, so every page link has to be rewritten - at the ref the user asked for.
 */

import { describe, expect, test } from 'vitest'
import {
  defaultRef, exampleList, fetchUrl, formatOf, formatsOf, matchLink, pageUrl, parseGitHubUrl, parseLinkParams,
  resolveStandard, shapesRepo, standardFiles, type ValidatorConfig,
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

describe('formats', () => {
  const csvw = 'https://github.com/o/r/blob/main/dir/csv-metadata.json'
  const standard = {
    name: 'Both',
    shapes: blob,
    context: 'https://github.com/o/r/blob/main/dir/context.jsonld',
    csvMetadata: csvw,
    examples: ['https://example.org/a.jsonld', 'https://example.org/b.CSV?raw=1', { name: 'C', url: 'https://example.org/c.csv' }],
  }

  test('come from the extension', () => {
    expect(formatOf('people.csv')).toBe('csv')
    expect(formatOf('https://example.org/x.Csv#frag')).toBe('csv')
    expect(formatOf('record.jsonld')).toBe('json')
    expect(formatOf('no-extension')).toBe('json')
  })

  test('CSV is offered once a standard has CSVW', () => {
    expect(formatsOf(standard)).toEqual(['json', 'csv'])
    expect(formatsOf({ name: 'JSON only', shapes: blob })).toEqual(['json'])
  })

  test('examples are listed by format', () => {
    expect(exampleList(standard, 'json').map((e) => e.name)).toEqual(['a'])
    expect(exampleList(standard, 'csv').map((e) => e.name)).toEqual(['b', 'C'])
  })

  test('the CSVW is resolved at the ref', () => {
    expect(resolveStandard(standard, 'v2').csvMetadata).toBe('https://raw.githubusercontent.com/o/r/v2/dir/csv-metadata.json')
  })

  test('file links open GitHub pages at the ref', () => {
    expect(pageUrl('https://raw.githubusercontent.com/o/r/main/x.ttl', 'v2')).toBe('https://github.com/o/r/blob/v2/x.ttl')
    expect(pageUrl('https://example.org/x.ttl', 'v2')).toBe('https://example.org/x.ttl')
  })

  test('link the shapes, and the context or the CSVW by format', () => {
    expect(standardFiles(standard, 'json', 'v2')).toEqual([
      { label: 'Shape', ext: '.ttl', url: 'https://github.com/o/r/blob/v2/dir/shape.ttl' },
      { label: 'Context', ext: '.jsonld', url: 'https://github.com/o/r/blob/v2/dir/context.jsonld' },
    ])
    expect(standardFiles(standard, 'csv').map((f) => [f.label, f.ext])).toEqual([['Shape', '.ttl'], ['CSVW mapping', '.json']])
  })
})

describe('a link to the page', () => {
  const shape = (name: string): string => `https://github.com/o/r/blob/main/${name}/shape.ttl`
  const context = (name: string): string => `https://github.com/o/r/blob/main/${name}/context.jsonld`
  const example = (name: string): string => `https://github.com/o/examples/blob/main/${name}.jsonld`
  const config: ValidatorConfig = {
    standards: ['a', 'b'].map((name) => ({
      name,
      shapes: shape(name),
      context: context(name),
      examples: [example(`${name}-valid`), example(`${name}-full`)],
    })),
  }

  test('reads repeated shapes, a context and an example', () => {
    expect(parseLinkParams('?shape=s1&shape=s2&context=c&example=e'))
      .toEqual({ shapes: ['s1', 's2'], context: 'c', example: 'e' })
    expect(parseLinkParams('?shape=&context=')).toEqual({ shapes: [] })
    expect(parseLinkParams('')).toEqual({ shapes: [] })
  })

  test('names nothing without parameters', () => {
    expect(matchLink(config, { shapes: [] })).toBeUndefined()
  })

  test('picks the standard and example it names', () => {
    expect(matchLink(config, { shapes: [shape('b')], context: context('b'), example: example('b-full') }))
      .toEqual({ standardIndex: 1, ref: 'main', example: example('b-full') })
  })

  test('treats raw links as the page links in the config', () => {
    const raw = 'https://raw.githubusercontent.com/o/r/main/b/shape.ttl'
    const rawExample = 'https://raw.githubusercontent.com/o/examples/main/b-valid.jsonld'
    expect(matchLink(config, { shapes: [raw], example: rawExample }))
      .toEqual({ standardIndex: 1, ref: 'main', example: example('b-valid') })
  })

  test('matches at another ref, and asks for that ref', () => {
    const tagged = 'https://github.com/o/r/blob/v1.0.0/b/shape.ttl'
    expect(matchLink(config, { shapes: [tagged] })).toEqual({ standardIndex: 1, ref: 'v1.0.0' })
  })

  test('reads a CSVW link, and matches the standard with that CSVW', () => {
    expect(parseLinkParams('?csvw=m.json')).toEqual({ shapes: [], csvMetadata: 'm.json' })
    const csvw = 'https://github.com/o/r/blob/v3/b/csv-metadata.json'
    const withCsv: ValidatorConfig = {
      standards: config.standards.map((s) => ({ ...s, csvMetadata: `https://github.com/o/r/blob/main/${s.name}/csv-metadata.json` })),
    }
    expect(matchLink(withCsv, { shapes: [], csvMetadata: csvw })).toEqual({ standardIndex: 1, ref: 'v3' })
    expect(matchLink(config, { shapes: [], csvMetadata: csvw })).toBeUndefined()
  })

  test('names nothing when the context belongs to another standard', () => {
    expect(matchLink(config, { shapes: [shape('a')], context: context('b') })).toBeUndefined()
  })

  test('finds the standard from an example alone', () => {
    expect(matchLink(config, { shapes: [], example: example('b-valid') }))
      .toEqual({ standardIndex: 1, example: example('b-valid') })
  })

  test('still loads an example the config does not list', () => {
    const other = 'https://example.org/other.jsonld'
    expect(matchLink(config, { shapes: [shape('a')], example: other }))
      .toEqual({ standardIndex: 0, ref: 'main', example: other })
  })

  test('asks for no ref when nothing is versioned', () => {
    const offline = { standards: [{ name: 'Local', shapes: 'https://example.org/s.ttl' }] }
    expect(matchLink(offline, { shapes: ['https://example.org/s.ttl'] })).toEqual({ standardIndex: 0 })
  })
})
