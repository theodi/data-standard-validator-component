/*
 * The colouring is painted behind a transparent textarea, so it must
 * reproduce the input character for character or the colours drift off the text.
 */

import { describe, expect, test } from 'vitest'
import { highlightJson } from '../src/highlight.js'

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
