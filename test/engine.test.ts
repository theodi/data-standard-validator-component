/*
 * The engine as the worker loads it: from the fixtures the demo page uses.
 */

import { describe, expect, test } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadValidator } from '../src/engine.js'

const fixtures = join(dirname(fileURLToPath(import.meta.url)), '..', 'demo', 'public', 'fixtures')
const sources = { shapes: [join(fixtures, 'person-shape.ttl')], context: join(fixtures, 'context.jsonld') }
const record = (file: string): { name: string, text: string } =>
  ({ name: file, text: readFileSync(join(fixtures, file), 'utf8') })
const withCsv = { ...sources, csvMetadata: join(fixtures, 'csv-metadata.json') }

describe('loadValidator', () => {
  test('loads a standard once per set of sources', () => {
    expect(loadValidator(sources)).toBe(loadValidator({ ...sources }))
  })

  test('passes a valid record and fails an invalid one', async () => {
    const validator = await loadValidator(sources)
    expect((await validator.validate(record('valid.jsonld'))).conforms).toBe(true)
    const report = await validator.validate(record('invalid.jsonld'))
    expect(report.conforms).toBe(false)
    expect(report.issues.map((i) => i.location.jsonPath)).toContain('address[0].postcode')
  })

  test('keeps a standard with CSVW apart from the same one without', () => {
    expect(loadValidator(withCsv)).not.toBe(loadValidator(sources))
    expect(loadValidator(withCsv)).toBe(loadValidator({ ...withCsv }))
  })

  test('checks CSV against the same shapes, cell by cell', async () => {
    const validator = await loadValidator(withCsv)
    expect((await validator.validate({ ...record('valid.csv'), format: 'csv' })).conforms).toBe(true)
    const report = await validator.validate({ ...record('invalid.csv'), format: 'csv' })
    expect(report.conforms).toBe(false)
    const where = report.issues.map((i) => [i.severity, i.location.pointer])
    expect(where).toContainEqual(['violation', '#cell=3,1']) // the empty full_name
    expect(where).toContainEqual(['violation', '#cell=3,4']) // the bad postcode
    expect(where).toContainEqual(['warning', '#cell=1,5']) // the unmapped notes column
  })
})
