/*
 * The table and the text are two views of one string. These pin down that the
 * table reads records as the engine does - so its pointers land on the right
 * cell - and that an edit in the table leaves every other byte alone.
 */

import { describe, expect, test } from 'vitest'
import {
  appendRow, dataRows, headerLabel, parseCsv, pointerTarget, setCell, summariseCsvw,
} from '../src/csv.js'

const values = (text: string): string[][] => parseCsv(text).records.map((r) => r.map((c) => c.value))

describe('parseCsv', () => {
  test('reads quoted commas, quotes and line breaks', () => {
    expect(values('a,"b,c","say ""hi"""\n"two\nlines",x,\n')).toEqual([
      ['a', 'b,c', 'say "hi"'],
      ['two\nlines', 'x', ''],
    ])
  })

  test('reads CRLF, and a final line break starts no record', () => {
    const table = parseCsv('a,b\r\n1,2\r\n')
    expect(table.records.map((r) => r.map((c) => c.value))).toEqual([['a', 'b'], ['1', '2']])
    expect(table.newline).toBe('\r\n')
  })

  test('counts a blank line as a record, as RFC 7111 does', () => {
    expect(values('h\n\nx\n')).toEqual([['h'], [''], ['x']])
    expect(dataRows(parseCsv('h\n\nx\n'))).toEqual([undefined, undefined, 1])
  })

  test('places each cell where the engine reports it', () => {
    const [, row] = parseCsv('"multi\nline",b\n,-1\n').records
    expect(row!.map((c) => [c.line, c.column])).toEqual([[3, 1], [3, 2]])
  })

  test('skips a byte order mark the way the engine does', () => {
    const table = parseCsv('﻿a,b\n')
    expect(table.records[0]![0]).toMatchObject({ value: 'a', start: 1, column: 1 })
  })

  test('runs an unclosed quote to the end instead of throwing', () => {
    expect(values('a\n"open,still')).toEqual([['a'], ['open,still']])
  })

  test('reads another delimiter', () => {
    expect(values('a;b\n1;2')).toEqual([['a;b'], ['1;2']])
    expect(parseCsv('a;b\n1;2', ';').records.map((r) => r.map((c) => c.value))).toEqual([['a', 'b'], ['1', '2']])
  })

  test('is as wide as its widest record', () => {
    expect(parseCsv('a\n1,2,3\n').width).toBe(3)
  })
})

describe('editing', () => {
  const text = 'name,"note"\nAda,"x"\nAlan,y\n'

  test('rewrites only the cell, keeping its quotes', () => {
    const table = parseCsv(text)
    expect(setCell(text, table, 1, 0, 'Grace')).toBe('name,"note"\nGrace,"x"\nAlan,y\n')
    expect(setCell(text, table, 1, 1, 'z')).toBe('name,"note"\nAda,"z"\nAlan,y\n')
  })

  test('quotes a value that needs it', () => {
    const table = parseCsv(text)
    expect(setCell(text, table, 2, 1, 'a, "b"')).toBe('name,"note"\nAda,"x"\nAlan,"a, ""b"""\n')
  })

  test('pads a short record', () => {
    const short = 'a,b,c\n1\n'
    expect(setCell(short, parseCsv(short), 1, 2, 'z')).toBe('a,b,c\n1,,z\n')
  })

  test('round-trips through the parser', () => {
    const edited = setCell(text, parseCsv(text), 2, 0, 'line\nbreak')
    expect(parseCsv(edited).records[2]![0]!.value).toBe('line\nbreak')
  })

  test('adds an empty row in the file\'s own line ending', () => {
    expect(appendRow('a,b\n1,2\n', parseCsv('a,b\n1,2\n'))).toBe('a,b\n1,2\n,\n')
    expect(appendRow('a,b\r\n1,2', parseCsv('a,b\r\n1,2'))).toBe('a,b\r\n1,2\r\n,')
  })
})

describe('locating', () => {
  test('a header cell is named by its first line', () => {
    expect(headerLabel('child_ID\n\nPlease enter the unique ID.')).toBe('child_ID')
    expect(headerLabel('  plain  ')).toBe('plain')
  })

  test('pointers become 0-based records and columns', () => {
    expect(pointerTarget('#cell=3,2')).toEqual({ record: 2, column: 1 })
    expect(pointerTarget('#row=1')).toEqual({ record: 0 })
    expect(pointerTarget('/address/0')).toBeUndefined()
  })
})

describe('summariseCsvw', () => {
  test('maps titles to column names, and reads the delimiter', () => {
    const summary = summariseCsvw({
      dialect: { delimiter: ';' },
      tableSchema: {
        columns: [
          { name: 'childId', titles: 'child_ID' },
          { name: 'age', titles: ['age', 'Age (years)'] },
          { name: 'type', virtual: true, propertyUrl: 'rdf:type' },
        ],
      },
    })
    expect(summary.delimiter).toBe(';')
    expect([...summary.names]).toEqual([['child_id', 'childId'], ['age', 'age'], ['age (years)', 'age']])
  })

  test('reads the first table of a group, and survives nonsense', () => {
    expect(summariseCsvw({ tables: [{ tableSchema: { columns: [{ name: 'n', titles: 't' }] } }] }).names.get('t')).toBe('n')
    expect(summariseCsvw(null)).toEqual({ delimiter: ',', names: new Map() })
  })
})
