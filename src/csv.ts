/*
 * CSV for the table view and the text colouring, on the main thread.
 *
 * The engine has its own CSV reader, but it lives in the worker beside the RDF
 * stack, and the table needs the text parsed on every keystroke. This one
 * counts records the way the engine does - RFC 7111: the header is record 1,
 * a blank line is a record, a final line break starts none - so the engine's
 * `#cell=R,C` pointers land on the right cell here.
 *
 * Unlike the engine it never throws. A quote that is still being typed runs
 * to the end of the text, and the engine is the one to say what is wrong.
 *
 * Kept free of the DOM, so it can be tested in Node.
 */

export interface Cell {
  /** Quotes removed and `""` unescaped, not trimmed. */
  value: string
  /** The raw slice in the text, quotes included: `text.slice(start, end)`. */
  start: number
  end: number
  /** 1-based, of the cell's first character, as the engine reports it. */
  line: number
  column: number
  quoted: boolean
}

export interface CsvTable {
  /** Every record in the file, header first. */
  records: Cell[][]
  /** The widest record, so a short row still shows every column. */
  width: number
  delimiter: string
  /** `\r\n` when the file uses it, so an added row matches. */
  newline: string
}

const BOM = 0xfeff

export function parseCsv (text: string, delimiter = ','): CsvTable {
  const records: Cell[][] = []
  let cells: Cell[] = []
  let i = text.charCodeAt(0) === BOM ? 1 : 0
  let line = 1
  let column = 1

  const advance = (): void => {
    if (text[i] === '\n') { line++; column = 1 } else column++
    i++
  }
  const atRecordEnd = (): boolean => i >= text.length || text[i] === '\n' || text[i] === '\r'

  while (i < text.length || cells.length > 0) {
    const start = i
    const startLine = line
    const startColumn = column
    let value = ''
    const quoted = text[i] === '"'

    if (quoted) {
      advance()
      while (i < text.length) {
        if (text[i] === '"') {
          if (text[i + 1] === '"') { value += '"'; advance(); advance(); continue }
          advance()
          break
        }
        if (text[i] === '\r' && text[i + 1] === '\n') { advance(); continue }
        value += text[i]
        advance()
      }
      // Stray text after a closing quote stays in the cell, as typed.
      while (!atRecordEnd() && text[i] !== delimiter) { value += text[i]; advance() }
    } else {
      while (!atRecordEnd() && text[i] !== delimiter) { value += text[i]; advance() }
    }

    cells.push({ value, start, end: i, line: startLine, column: startColumn, quoted })

    if (i < text.length && text[i] === delimiter) { advance(); continue }

    records.push(cells)
    cells = []
    if (text[i] === '\r') { i++; column++ }
    if (text[i] === '\n') advance()
    if (i >= text.length) break
  }

  return {
    records,
    width: records.reduce((max, record) => Math.max(max, record.length), 0),
    delimiter,
    newline: text.includes('\r\n') ? '\r\n' : '\n',
  }
}

/** A blank line, or a row of empty cells: the engine skips it, so it has no row number. */
export function isBlank (record: Cell[]): boolean {
  return record.every((cell) => cell.value.trim() === '')
}

/**
 * The data row number the engine gives each record (CSVW's `_row`: 1-based,
 * header and blank records excluded), or undefined for those it skips.
 */
export function dataRows (table: CsvTable): (number | undefined)[] {
  let row = 0
  return table.records.map((record, index) => index === 0 || isBlank(record) ? undefined : ++row)
}

function encode (value: string, delimiter: string, quote: boolean): string {
  if (!quote && !value.includes(delimiter) && !/["\r\n]/.test(value)) return value
  return `"${value.replace(/"/g, '""')}"`
}

/**
 * The text with one cell changed. Only that cell's slice is rewritten - a
 * cell quoted before stays quoted - so every other byte, and every line
 * number in a report, stays where it was. A record shorter than `column`
 * is padded with empty cells.
 */
export function setCell (text: string, table: CsvTable, record: number, column: number, value: string): string {
  const cells = table.records[record]
  if (cells === undefined || cells.length === 0) return text
  const cell = cells[column]
  if (cell !== undefined) {
    return text.slice(0, cell.start) + encode(value, table.delimiter, cell.quoted) + text.slice(cell.end)
  }
  const last = cells[cells.length - 1]!
  const padding = table.delimiter.repeat(column - cells.length + 1)
  return text.slice(0, last.end) + padding + encode(value, table.delimiter, false) + text.slice(last.end)
}

/** The text with an empty record added at the end, as wide as the table. */
export function appendRow (text: string, table: CsvTable): string {
  const row = table.delimiter.repeat(Math.max(table.width - 1, 0))
  if (text === '') return row
  return text.endsWith('\n') ? `${text}${row}${table.newline}` : `${text}${table.newline}${row}`
}

/**
 * A header cell's name. Spreadsheet exports put help text under the column
 * name in the same cell; the name is its first line.
 */
export function headerLabel (value: string): string {
  return value.split(/\r?\n/, 1)[0]!.trim()
}

/**
 * Where an issue is in the table, from its RFC 7111 pointer: `#cell=R,C`
 * for a cell, `#row=R` for a whole record. Indexes are 0-based, header = 0.
 */
export function pointerTarget (pointer: string): { record: number, column?: number } | undefined {
  const cell = /^#cell=(\d+),(\d+)$/.exec(pointer)
  if (cell) return { record: Number(cell[1]) - 1, column: Number(cell[2]) - 1 }
  const row = /^#row=(\d+)$/.exec(pointer)
  if (row) return { record: Number(row[1]) - 1 }
  return undefined
}

/** What the table needs from CSVW metadata: column names, and the delimiter. */
export interface CsvwSummary {
  delimiter: string
  /** Lower-cased title to the column's `name`, for the `→ name` under a header. */
  names: Map<string, string>
}

type Json = Record<string, unknown>

function titlesOf (titles: unknown): string[] {
  if (typeof titles === 'string') return [titles]
  if (Array.isArray(titles)) return titles.filter((t): t is string => typeof t === 'string')
  if (titles !== null && typeof titles === 'object') return Object.values(titles).flatMap(titlesOf)
  return []
}

/**
 * Read only as much of the metadata as the table shows. Anything unexpected
 * is skipped: the engine, not the table, says whether the metadata is valid.
 */
export function summariseCsvw (metadata: unknown): CsvwSummary {
  const root = (metadata ?? {}) as Json
  const table = (Array.isArray(root['tables']) ? root['tables'][0] : root) as Json | undefined
  const dialect = (table?.['dialect'] ?? root['dialect'] ?? {}) as Json
  const schema = (table?.['tableSchema'] ?? {}) as Json
  const columns = Array.isArray(schema['columns']) ? schema['columns'] as Json[] : []
  const names = new Map<string, string>()
  for (const column of columns) {
    if (column['virtual'] === true || typeof column['name'] !== 'string') continue
    for (const title of titlesOf(column['titles'])) names.set(title.trim().toLowerCase(), column['name'])
  }
  const delimiter = typeof dialect['delimiter'] === 'string' && dialect['delimiter'].length === 1
    ? dialect['delimiter']
    : ','
  return { delimiter, names }
}
