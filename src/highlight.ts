/*
 * Syntax colouring for the editor: JSON, and CSV with the issues marked.
 *
 * The output is laid behind a transparent <textarea>, so it must reproduce the
 * input character for character: every byte either lands in a token span or is
 * copied through as-is. Anything the pattern does not recognise - a half-typed
 * string, a stray word - is simply left uncoloured, which is the right outcome
 * for a record that is still being written.
 */

import { parseCsv } from './csv.js'

const TOKEN = /("(?:[^"\\\n]|\\.)*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b|([{}[\],:])/g

function escape (text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function span (kind: string, text: string): string {
  return `<span class="tok-${kind}">${escape(text)}</span>`
}

export function highlightJson (text: string): string {
  let out = ''
  let last = 0
  for (const match of text.matchAll(TOKEN)) {
    const index = match.index
    out += escape(text.slice(last, index))
    const [whole, string, colon, number, literal] = match
    if (string !== undefined) {
      if (colon !== undefined) {
        // JSON-LD keywords (@context, @type, @id) are what make a record
        // linked data, so they read differently from ordinary field names.
        out += span(string.startsWith('"@') ? 'keyword' : 'key', string)
        out += escape(colon.slice(0, -1)) + span('punct', ':')
      } else {
        out += span('string', string)
      }
    } else if (number !== undefined) {
      out += span('number', number)
    } else if (literal !== undefined) {
      out += span('literal', literal)
    } else {
      out += span('punct', whole)
    }
    last = index + whole.length
  }
  out += escape(text.slice(last))
  // A <pre> drops a final empty line that a textarea still shows, which would
  // leave the last row of colour one line short of the caret.
  return text.endsWith('\n') || text === '' ? `${out} ` : out
}

/** An issue's place in the text, as the engine reports it: 1-based, end exclusive. */
export interface TextMark {
  line: number
  column: number
  endLine: number
  endColumn: number
  severity: 'violation' | 'warning'
}

function lineStarts (text: string): number[] {
  const starts = [0]
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1)
  return starts
}

/**
 * CSV colouring: the header record as keys, quoted values as strings,
 * numbers, and delimiters. Each mark wraps its range in `<mark>`; an empty
 * range - an empty cell - becomes an empty `<mark>` that the styles draw
 * without giving it any width, so nothing after it moves.
 */
export function highlightCsv (text: string, marks: readonly TextMark[] = [], delimiter = ','): string {
  const table = parseCsv(text, delimiter)
  // [start, end, class], in order and not overlapping.
  const tokens: [number, number, string][] = []
  table.records.forEach((record, index) => {
    record.forEach((cell, column) => {
      if (column > 0) tokens.push([cell.start - 1, cell.start, 'punct'])
      if (cell.start === cell.end) return
      const kind = index === 0
        ? 'key'
        : cell.quoted ? 'string' : /^\s*-?\d+(?:\.\d+)?\s*$/.test(cell.value) ? 'number' : undefined
      if (kind !== undefined) tokens.push([cell.start, cell.end, kind])
    })
  })

  // The engine counts columns after a byte order mark; the text still has it.
  const bom = text.charCodeAt(0) === 0xfeff ? 1 : 0
  const starts = lineStarts(text)
  const offset = (line: number, column: number): number =>
    Math.min(text.length, (starts[line - 1] ?? text.length) + column - 1 + (line === 1 ? bom : 0))
  const ranges = marks
    .map((mark): [number, number, string] =>
      [offset(mark.line, mark.column), offset(mark.endLine, mark.endColumn), mark.severity])
    .sort((a, b) => a[0] - b[0] || b[1] - a[1])
  // Where two issues share a cell, one mark, in the worse colour.
  const merged: [number, number, string][] = []
  for (const range of ranges) {
    const last = merged[merged.length - 1]
    if (last && range[0] < last[1]) {
      last[1] = Math.max(last[1], range[1])
      if (range[2] === 'violation') last[2] = 'violation'
    } else if (last && range[0] === last[0] && range[1] === last[1]) {
      if (range[2] === 'violation') last[2] = 'violation'
    } else {
      merged.push([...range])
    }
  }

  const cuts = new Set<number>([0, text.length])
  for (const [a, b] of [...tokens, ...merged]) { cuts.add(a); cuts.add(b) }
  const points = [...cuts].sort((a, b) => a - b)

  let out = ''
  let t = 0
  let m = 0
  for (let p = 0; p < points.length; p++) {
    const at = points[p]!
    while (m < merged.length && merged[m]![0] < merged[m]![1] && merged[m]![1] <= at) m++
    while (m < merged.length && merged[m]![0] === at && merged[m]![1] === at) {
      out += `<mark class="cell-${merged[m]![2]} empty"></mark>`
      m++
    }
    const next = points[p + 1]
    if (next === undefined) break
    while (t < tokens.length && tokens[t]![1] <= at) t++
    const token = tokens[t] !== undefined && tokens[t]![0] <= at ? tokens[t]![2] : undefined
    const mark = merged[m] !== undefined && merged[m]![0] <= at && merged[m]![1] > at ? merged[m]![2] : undefined
    let piece = escape(text.slice(at, next))
    if (token !== undefined) piece = `<span class="tok-${token}">${piece}</span>`
    if (mark !== undefined) piece = `<mark class="cell-${mark}">${piece}</mark>`
    out += piece
  }
  return text.endsWith('\n') || text === '' ? `${out} ` : out
}
