/*
 * The colouring is painted behind a transparent textarea, so it must
 * reproduce the input character for character or the colours drift off the text.
 */

import { describe, expect, test } from 'vitest'
import { highlightCsv, highlightJson } from '../src/highlight.js'

function text (highlighted: string): string {
  return highlighted.replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
}

describe('highlightJson', () => {
  test.each([
    '{ "@type": "Person", "name": "Ada", "age": 36, "ok": true, "x": null }',
    '{\n  "a": [1, -2.5e3, "<b>&"],\n  "half": "unterminated\n}',
    'not json at all <script>',
  ])('keeps every character of %j', (input) => {
    expect(text(highlightJson(input)).trimEnd()).toBe(input.trimEnd())
  })

  test('escapes markup', () => {
    expect(highlightJson('"<img>"')).not.toContain('<img>')
  })

  test('marks JSON-LD keywords apart from ordinary keys', () => {
    const out = highlightJson('{ "@id": "x", "name": "y" }')
    expect(out).toContain('<span class="tok-keyword">"@id"</span>')
    expect(out).toContain('<span class="tok-key">"name"</span>')
  })
})

describe('highlightCsv', () => {
  test.each([
    'name,age\nAda,36\n',
    '"multi\nline header",b\n"<x>&",-1\n',
    'a,"unclosed\n',
    '\ufeffa,b\r\n1,2\r\n',
  ])('keeps every character of %j', (input) => {
    const marks = [{ line: 1, column: 1, endLine: 1, endColumn: 3, severity: 'violation' as const }]
    expect(text(highlightCsv(input, marks)).trimEnd()).toBe(input.trimEnd())
  })

  test('colours the header apart from the data', () => {
    const out = highlightCsv('name,age\nAda,36')
    expect(out).toContain('<span class="tok-key">name</span>')
    expect(out).toContain('<span class="tok-number">36</span>')
    expect(out).toContain('<span class="tok-punct">,</span>')
  })

  test('marks the range an issue is about', () => {
    const out = highlightCsv('a,b\nAda,nope\n', [{ line: 2, column: 5, endLine: 2, endColumn: 9, severity: 'violation' }])
    expect(out).toContain('<mark class="cell-violation">nope</mark>')
  })

  test('marks an empty cell without adding any text', () => {
    const input = 'a,b\n,x\n'
    const out = highlightCsv(input, [{ line: 2, column: 1, endLine: 2, endColumn: 1, severity: 'violation' }])
    expect(out).toContain('<mark class="cell-violation empty"></mark>')
    expect(text(out).trimEnd()).toBe(input.trimEnd())
  })

  test('one mark where two issues share a cell, in the worse colour', () => {
    const range = { line: 2, column: 1, endLine: 2, endColumn: 4 }
    const out = highlightCsv('a\nbad\n', [{ ...range, severity: 'warning' }, { ...range, severity: 'violation' }])
    expect(out.match(/<mark/g)).toHaveLength(1)
    expect(out).toContain('cell-violation')
  })
})
