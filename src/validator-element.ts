/*
 * <data-standard-validator>: a toolbar to pick a standard, a format and an
 * example, an editor, and a results pane. Validation happens in a worker; this
 * element only collects input, renders the report, and keeps the editor's
 * gutter, colouring and table in step with the text.
 *
 * Everything it knows about a particular standard comes from `config`.
 *
 * The text is the one source of truth in both formats. The CSV table is a
 * view of it, and an edit in the table rewrites only that cell's slice of the
 * text, so the text view, line numbers and the report all keep agreeing.
 */

import { html, LitElement, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { live } from 'lit/directives/live.js'
import { unsafeHTML } from 'lit/directives/unsafe-html.js'
import type { Issue, RunReport } from '@theodi/data-standard-validator'
import {
  defaultRef, exampleFetchUrl, exampleList, fetchUrl, inShapesRepo, formatOf, formatsOf, matchLink, parseLinkParams, resolveStandard,
  shapesRepo, standardFiles, type DataFormat, type StandardConfig, type ValidatorConfig,
} from './config.js'
import {
  appendRow, dataRows, headerLabel, isBlank, parseCsv, pointerTarget, setCell, summariseCsvw,
  type CsvTable, type CsvwSummary,
} from './csv.js'
import { highlightCsv, highlightJson, type TextMark } from './highlight.js'
import { isDraftTag, latestTag, listRefs, refOptions } from './refs.js'
import { banner, flaggedCells, flaggedLines, renderReport, textMarks, type RunLabel } from './report.js'
import { styles } from './styles.js'
import type { ValidateRequest, WorkerResponse } from './worker.js'

/*
 * The standalone bundle is loaded from a CDN, and browsers refuse to start a
 * worker from another origin. A worker made from a blob has the page's origin,
 * and it may import a script that is served with CORS, so the blob just
 * imports the real worker sitting beside this module.
 *
 * The URL is built by string, not `new URL('./worker.js', import.meta.url)`, so
 * that bundlers do not mistake it for a second worker or asset to emit. The blob
 * URL is never revoked: it is a few bytes, and the worker may still be fetching it.
 */
function isCrossOrigin (): boolean {
  // webpack rewrites a bare import.meta.url to the file:// path it built from;
  // that is a bundled host page, not a CDN.
  const here = new URL(import.meta.url)
  return (here.protocol === 'http:' || here.protocol === 'https:') && here.origin !== location.origin
}

function crossOriginWorker (): Worker {
  const href = import.meta.url.replace(/[^/]*$/, 'worker.js')
  const shim = new Blob([`import ${JSON.stringify(href)}\n`], { type: 'text/javascript' })
  return new Worker(URL.createObjectURL(shim), { type: 'module' })
}

type Results =
  | { kind: 'info' | 'error', text: string }
  | { kind: 'report', report: RunReport, label: RunLabel }

type View = 'table' | 'text'
interface CellRef { record: number, column: number }

/*
 * A table of tens of thousands of cells makes every keystroke slow, and
 * nobody reads that many rows on screen. The text view and the validation
 * still see every row.
 */
const MAX_TABLE_ROWS = 500

const DELIMITER_NAMES: Record<string, string> = {
  ',': 'Comma-separated', '\t': 'Tab-separated', ';': 'Semicolon-separated', '|': 'Pipe-separated',
}

function fileName (url: string): string {
  return decodeURIComponent(url.replace(/[?#].*$/, '').replace(/^.*\//, ''))
}

// CSVW summaries, per URL, for the life of the page. A failed fetch is not
// kept: the table works without one, and the next run may succeed.
const csvwCache = new Map<string, Promise<CsvwSummary | undefined>>()

function loadCsvw (url: string): Promise<CsvwSummary | undefined> {
  let pending = csvwCache.get(url)
  if (!pending) {
    pending = fetch(url)
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return summariseCsvw(await response.json())
      })
      .catch(() => { csvwCache.delete(url); return undefined })
    csvwCache.set(url, pending)
  }
  return pending
}

export class DataStandardValidator extends LitElement {
  static override styles = styles

  static override properties = {
    config: { attribute: false },
    theme: { reflect: true },
    standardIndex: { state: true },
    exampleUrl: { state: true },
    ref: { state: true },
    refList: { state: true },
    format: { state: true },
    view: { state: true },
    text: { state: true },
    flagged: { state: true },
    cells: { state: true },
    marks: { state: true },
    results: { state: true },
    busy: { state: true },
    selected: { state: true },
    focusCell: { state: true },
    editing: { state: true },
    caret: { state: true },
    csvw: { state: true },
  }

  /** The standards to offer, and everything else the element is told. */
  declare config: ValidatorConfig | undefined
  /** `light` or `dark` overrides the system colour scheme. */
  declare theme: 'light' | 'dark' | undefined

  declare private standardIndex: number
  declare private exampleUrl: string
  declare private ref: string
  /** The refs the Version box offers; `failed` falls back to typing one. */
  declare private refList: string[] | 'loading' | 'failed'
  declare private format: DataFormat
  declare private view: View
  declare private text: string
  /** Gutter lines to flag. */
  declare private flagged: Set<number>
  /** Table cells and records to flag; see `flaggedCells`. */
  declare private cells: Map<string, 'violation' | 'warning'>
  /** Text ranges to mark in the CSV text view. */
  declare private marks: TextMark[]
  declare private results: Results | undefined
  declare private busy: boolean
  declare private selected: Issue | undefined
  declare private focusCell: CellRef | undefined
  declare private editing: (CellRef & { value: string }) | undefined
  declare private caret: { line: number, column: number }
  declare private csvw: CsvwSummary | undefined

  private worker: Worker | undefined
  private requestId = 0
  // A worker that throws while loading is gone for good, and messages posted to
  // it vanish without a reply - which on the page looks like "Validating..."
  // forever. Remember the failure so every run can say so instead.
  private workerFailure: string | undefined
  // The standard and ref of the latest request, for the verdict line.
  private inFlight: RunLabel = { standard: '' }
  // Only the latest example pick may fill the editor, however the fetches finish.
  private exampleToken = 0
  // The example as loaded, so a version change reloads it only while nobody has edited it.
  private exampleText: string | undefined
  // Only the latest standard's CSVW may describe the table.
  private csvwToken = 0
  // The page's link picks the starting standard once; a later config does not re-apply it.
  private linked = false
  // The other format's text, so switching format does not throw a paste away.
  // In memory only: records are never written to browser storage.
  private stash: Record<DataFormat, string> = { json: '', csv: '' }
  // The table is parsed once per text, not once per cell rendered.
  private parsed: { text: string, delimiter: string, table: CsvTable, rows: (number | undefined)[] } | undefined
  // What updated() should bring into view once the DOM has caught up.
  private reveal: 'cell' | 'issue' | 'editor' | undefined

  constructor () {
    super()
    this.standardIndex = 0
    this.exampleUrl = ''
    this.ref = ''
    this.refList = 'loading'
    this.format = 'json'
    this.view = 'table'
    this.text = ''
    this.flagged = new Set()
    this.cells = new Map()
    this.marks = []
    this.busy = false
    this.caret = { line: 1, column: 1 }
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  override connectedCallback (): void {
    super.connectedCallback()
    this.startWorker()
  }

  override disconnectedCallback (): void {
    super.disconnectedCallback()
    document.removeEventListener('pointerdown', this.onOutsideVersion)
    this.worker?.terminate()
    this.worker = undefined
  }

  protected override willUpdate (changed: PropertyValues<this>): void {
    if (changed.has('config')) {
      this.standardIndex = 0
      this.exampleUrl = ''
      this.ref = this.config !== undefined ? defaultRef(this.config) ?? '' : ''
      this.loadRefs()
      // Text typed under an earlier, editable config is not an example, and
      // could no longer be changed or cleared.
      if (this.readOnly) {
        this.exampleToken += 1
        this.stash = { json: '', csv: '' }
        this.exampleText = undefined
        this.setText('')
        this.results = undefined
      }
      if (!this.linked) this.applyLink()
      if (this.standard !== undefined && !formatsOf(this.standard).includes(this.format)) this.switchFormat('json')
      this.loadCsvwSummary()
    }
  }

  protected override updated (): void {
    this.syncScroll()
    const reveal = this.reveal
    this.reveal = undefined
    if (reveal === 'editor') {
      const input = this.find<HTMLInputElement>('.cell-input')
      if (input && this.renderRoot instanceof ShadowRoot && this.renderRoot.activeElement !== input) {
        input.focus()
        input.select()
      }
    } else if (reveal === 'cell' && this.focusCell !== undefined) {
      const { record, column } = this.focusCell
      const target = this.find<HTMLElement>(`[data-record="${record}"][data-column="${column}"]`) ??
        this.find<HTMLElement>(`tr[data-record="${record}"]`)
      target?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      if (target instanceof HTMLTableCellElement) target.focus({ preventScroll: true })
    } else if (reveal === 'issue') {
      this.find<HTMLElement>('.issue.selected')?.scrollIntoView({ block: 'nearest' })
    }
  }

  /*
   * Asked for as soon as there is a config, not when the box is opened, so the
   * list is usually there by the time anyone looks.
   */
  private loadRefs (): void {
    const config = this.config
    const repo = config !== undefined ? shapesRepo(config) : undefined
    if (config === undefined || repo === undefined) { this.refList = 'failed'; return }
    this.refList = 'loading'
    const show = (refs: string[]): void => { if (this.config === config) this.refList = refs }
    // A stored list shows at once; `onUpdate` brings in what GitHub says now.
    listRefs(repo, config.versions ?? 'branches', { onUpdate: show }).then(
      show,
      () => { if (this.config === config) this.refList = 'failed' },
    )
  }

  /** Open on the standard and example the page's query string names, if any. */
  private applyLink (): void {
    this.linked = true
    const config = this.config
    if (config === undefined || config.urlParams === false) return
    const link = parseLinkParams(location.search)
    // Relative links resolve against the page, as the config's own URLs do.
    const absolute = (url: string): string => new URL(url, location.href).href
    const match = matchLink(config, {
      shapes: link.shapes.map(absolute),
      ...(link.context !== undefined ? { context: absolute(link.context) } : {}),
      ...(link.csvMetadata !== undefined ? { csvMetadata: absolute(link.csvMetadata) } : {}),
      ...(link.example !== undefined ? { example: absolute(link.example) } : {}),
    })
    if (!match) return
    this.standardIndex = match.standardIndex
    if (match.ref !== undefined) this.ref = match.ref
    if (link.csvMetadata !== undefined) this.switchFormat('csv')
    if (match.example === undefined) return
    // A link may name any URL as its example; read-only means only the configured ones.
    const listed = exampleList(config.standards[match.standardIndex]!).some((e) => e.url === match.example)
    if (!this.readOnly || listed) this.loadExample(match.example)
  }

  /** Only the configured examples can be shown; see `ValidatorConfig.readOnly`. */
  private get readOnly (): boolean {
    return this.config?.readOnly === true
  }

  // -------------------------------------------------------------------------
  // Worker
  // -------------------------------------------------------------------------

  private startWorker (): void {
    if (this.worker) return
    this.workerFailure = undefined
    // The literal `new Worker(new URL(...))` stays as it is: that is the pattern
    // Vite and webpack recognise when they bundle the worker for a host page.
    const worker = isCrossOrigin()
      ? crossOriginWorker()
      : new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })
    // Deliberately not preventDefault(): the error should still reach the console.
    worker.addEventListener('error', (event: ErrorEvent) => {
      this.workerFailure = event.message !== '' ? event.message : 'the worker script failed to load'
      this.showWorkerFailure()
    })
    worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
      const message = event.data
      if (message.id !== this.requestId) return // a newer run has superseded this one
      if (message.kind === 'status') {
        this.results = { kind: 'info', text: message.message }
        return
      }
      this.busy = false
      if (message.kind === 'error') {
        this.results = { kind: 'error', text: `Could not validate: ${message.message}` }
        return
      }
      this.results = { kind: 'report', report: message.report, label: this.inFlight }
      this.flagged = flaggedLines(message.report)
      if (this.inFlight.csv !== undefined) {
        this.cells = flaggedCells(message.report)
        this.marks = textMarks(message.report)
      }
    })
    this.worker = worker
  }

  private showWorkerFailure (): void {
    this.busy = false
    this.results = {
      kind: 'error',
      text: `The validator could not start in this browser: ${this.workerFailure ?? 'unknown error'}`,
    }
  }

  private get standard (): StandardConfig | undefined {
    return this.config?.standards[this.standardIndex]
  }

  /** The ref the standard's files are read at, or undefined when nothing is versioned. */
  private get effectiveRef (): string | undefined {
    const initial = this.config !== undefined ? defaultRef(this.config) : undefined
    return initial === undefined ? undefined : this.ref.trim() || initial
  }

  /** Validate what is in the editor against the selected standard. */
  validate (): void {
    if (this.workerFailure !== undefined || !this.worker) { this.showWorkerFailure(); return }
    const standard = this.standard
    if (!standard || !this.config) return
    this.commitEdit()
    if (this.text.trim() === '') {
      this.results = {
        kind: 'info',
        text: this.readOnly
          ? 'Load one of the examples above.'
          : this.format === 'csv'
            ? 'Paste a CSV file into the Text view, drop one on the table, or load one of the examples.'
            : 'Paste a record above, or load one of the examples.',
      }
      return
    }
    // Clear first: leaving the previous run's issues on screen while a new one
    // is in flight invites people to act on stale advice.
    this.results = { kind: 'info', text: 'Validating…' }
    this.busy = true
    this.requestId += 1
    const ref = this.effectiveRef
    const resolved = resolveStandard(standard, ref)
    // JSON never needs the CSVW. Leaving it out means a broken mapping cannot
    // stop JSON from being checked.
    if (this.format === 'json') delete resolved.csvMetadata
    this.inFlight = {
      standard: standard.name,
      ...(ref !== undefined ? { ref } : {}),
      ...(this.format === 'csv' ? { csv: this.csvLabel(standard) } : {}),
    }
    if (this.format === 'csv') this.loadCsvwSummary()
    const request: ValidateRequest = {
      kind: 'validate',
      id: this.requestId,
      standard: resolved,
      ...(this.config.patterns !== undefined ? { patterns: this.config.patterns } : {}),
      ...(ref !== undefined ? { ref } : {}),
      text: this.text,
      name: this.format === 'csv' ? 'your file' : 'your record',
      format: this.format,
    }
    this.worker.postMessage(request)
  }

  private csvLabel (standard: StandardConfig): NonNullable<RunLabel['csv']> {
    const { table, rows } = this.table
    const firstCells = new Map<number, string>()
    table.records.forEach((record, index) => {
      const row = rows[index]
      if (row !== undefined) firstCells.set(row, record[0]?.value ?? '')
    })
    return {
      rows: rows.filter((row) => row !== undefined).length,
      firstCells,
      ...(standard.csvMetadata !== undefined ? { mapping: fileName(standard.csvMetadata) } : {}),
    }
  }

  // -------------------------------------------------------------------------
  // Format and CSV
  // -------------------------------------------------------------------------

  private get delimiter (): string {
    return this.csvw?.delimiter ?? ','
  }

  private get table (): { table: CsvTable, rows: (number | undefined)[] } {
    const delimiter = this.delimiter
    if (this.parsed?.text !== this.text || this.parsed.delimiter !== delimiter) {
      const table = parseCsv(this.text, delimiter)
      this.parsed = { text: this.text, delimiter, table, rows: dataRows(table) }
    }
    return this.parsed
  }

  private switchFormat (format: DataFormat): void {
    if (format === this.format) return
    this.commitEdit()
    this.stash[this.format] = this.text
    this.format = format
    this.exampleUrl = ''
    this.setText(this.stash[format])
    this.results = undefined
    this.loadCsvwSummary()
  }

  /** Fetch the CSVW for the table's column names and delimiter; validation does not wait for it. */
  private loadCsvwSummary (): void {
    const url = this.format === 'csv' ? this.standard?.csvMetadata : undefined
    const token = ++this.csvwToken
    if (url === undefined) { this.csvw = undefined; return }
    void loadCsvw(fetchUrl(url, this.effectiveRef)).then((summary) => {
      if (token === this.csvwToken) this.csvw = summary
    })
  }

  // -------------------------------------------------------------------------
  // Editor
  // -------------------------------------------------------------------------

  private find<T extends Element> (selector: string): T | null {
    return this.renderRoot.querySelector<T>(selector)
  }

  /** The gutter and the colour layer only look right while they scroll with the textarea. */
  private syncScroll (): void {
    const input = this.find<HTMLTextAreaElement>('.input')
    const gutter = this.find<HTMLElement>('.gutter')
    const highlight = this.find<HTMLElement>('.highlight')
    if (!input || !gutter || !highlight) return
    gutter.scrollTop = input.scrollTop
    highlight.scrollTop = input.scrollTop
    highlight.scrollLeft = input.scrollLeft
  }

  private setText (text: string): void {
    this.text = text
    this.flagged = new Set()
    this.cells = new Map()
    this.marks = []
    this.selected = undefined
    this.focusCell = undefined
    this.editing = undefined
  }

  /** Select a range of the text, or from a column to the line's end, and scroll it into view. */
  private jumpToText (line: number, column = 1, endLine?: number, endColumn?: number): void {
    const input = this.find<HTMLTextAreaElement>('.input')
    if (!input) return
    const lines = input.value.split('\n')
    const offset = (l: number, c: number): number => {
      let at = 0
      for (let i = 0; i < l - 1 && i < lines.length; i++) at += lines[i]!.length + 1
      return at + c - 1
    }
    const start = offset(line, column)
    const end = endLine !== undefined && endColumn !== undefined
      ? Math.max(offset(endLine, endColumn), start)
      : start + Math.max(1, (lines[line - 1]?.length ?? 1) - column + 1)
    input.focus()
    input.setSelectionRange(start, end)
    const lineHeight = input.scrollHeight / Math.max(lines.length, 1)
    input.scrollTop = Math.max(0, (line - 4) * lineHeight)
    // No soft wrapping, so a CSV cell can be far to the right. The editor's
    // font is monospaced: one character's width places the column.
    const charWidth = this.charWidth(input)
    const left = (column - 1) * charWidth
    if (left < input.scrollLeft || left > input.scrollLeft + input.clientWidth - 8 * charWidth) {
      input.scrollLeft = Math.max(0, left - input.clientWidth / 3)
    }
    this.syncScroll()
    this.updateCaret()
  }

  private charWidth (input: HTMLElement): number {
    const context = document.createElement('canvas').getContext('2d')
    if (!context) return 8
    context.font = getComputedStyle(input).font
    return context.measureText('0').width || 8
  }

  private updateCaret (): void {
    const input = this.find<HTMLTextAreaElement>('.input')
    if (!input) return
    const before = input.value.slice(0, input.selectionStart)
    const line = before.split('\n').length
    this.caret = { line, column: before.length - before.lastIndexOf('\n') }
  }

  /** Show the data an issue is about: its cell in the table, or its text. */
  private pick (issue: Issue): void {
    this.selected = issue
    const target = pointerTarget(issue.location.pointer)
    const inTable = this.format === 'csv' && this.view === 'table' && target !== undefined &&
      target.record <= MAX_TABLE_ROWS
    if (inTable) {
      this.focusCell = { record: target.record, column: target.column ?? -1 }
      this.reveal = 'cell'
      return
    }
    const { line, column, endLine, endColumn } = issue.location
    if (line === undefined) return
    // The text view is rendered by the time the update this asks for is done.
    if (this.format === 'csv' && this.view === 'table') this.view = 'text'
    void this.updateComplete.then(() => {
      if (this.format === 'csv' && endLine !== undefined && endColumn !== undefined) {
        this.jumpToText(line, column ?? 1, endLine, endColumn)
      } else {
        this.jumpToText(line, column ?? 1)
      }
    })
  }

  // -------------------------------------------------------------------------
  // Table editing
  // -------------------------------------------------------------------------

  private startEdit (cell: CellRef): void {
    if (this.readOnly || cell.record < 1 || cell.column < 0) return
    this.focusCell = cell
    const value = this.table.table.records[cell.record]?.[cell.column]?.value ?? ''
    this.editing = { ...cell, value }
    this.reveal = 'editor'
  }

  /** Write the cell being edited into the text. A cell left as it was changes nothing. */
  private commitEdit (): void {
    const editing = this.editing
    if (editing === undefined) return
    this.editing = undefined
    const { table } = this.table
    const before = table.records[editing.record]?.[editing.column]?.value ?? ''
    if (editing.value === before) return
    this.text = setCell(this.text, table, editing.record, editing.column, editing.value)
    // A cell edit moves no other cell, so the table keeps the other flags;
    // the text's marks and lines may have moved, so they go until the next run.
    const cells = new Map(this.cells)
    cells.delete(`${editing.record},${editing.column}`)
    this.cells = cells
    this.marks = []
    this.flagged = new Set()
  }

  private cancelEdit (): void {
    this.editing = undefined
    this.reveal = 'cell'
  }

  private onAddRow (): void {
    this.commitEdit()
    const { table } = this.table
    if (table.records.length === 0) return
    this.text = appendRow(this.text, table)
    const record = this.table.table.records.length - 1
    this.startEdit({ record, column: 0 })
  }

  private cellAt (event: Event): CellRef | undefined {
    const td = (event.target as Element).closest?.('td[data-record]')
    if (!td) return undefined
    return { record: Number(td.getAttribute('data-record')), column: Number(td.getAttribute('data-column')) }
  }

  private onCellClick (event: MouseEvent): void {
    const cell = this.cellAt(event)
    if (!cell || (this.editing !== undefined && this.editing.record === cell.record && this.editing.column === cell.column)) return
    this.focusCell = cell
    // A flagged cell selects what is wrong with it.
    if (this.results?.kind !== 'report' || !this.cells.has(`${cell.record},${cell.column}`)) return
    const issue = this.results.report.documents[0]?.issues.find((i) => {
      const target = pointerTarget(i.location.pointer)
      return target?.record === cell.record && target.column === cell.column && i.severity !== 'info'
    })
    if (issue) { this.selected = issue; this.reveal = 'issue' }
  }

  private onCellDblClick (event: MouseEvent): void {
    const cell = this.cellAt(event)
    if (cell) this.startEdit(cell)
  }

  private onGridKeydown (event: KeyboardEvent): void {
    if (this.editing !== undefined || this.focusCell === undefined) return
    const { record, column } = this.focusCell
    const { table } = this.table
    const last = Math.min(table.records.length - 1, MAX_TABLE_ROWS)
    const move = (r: number, c: number): void => {
      event.preventDefault()
      this.focusCell = { record: Math.max(1, Math.min(last, r)), column: Math.max(0, Math.min(table.width - 1, c)) }
      this.reveal = 'cell'
    }
    switch (event.key) {
      case 'Enter': case 'F2': event.preventDefault(); this.startEdit(this.focusCell); break
      case 'ArrowUp': move(record - 1, column); break
      case 'ArrowDown': move(record + 1, column); break
      case 'ArrowLeft': move(record, column - 1); break
      case 'ArrowRight': move(record, column + 1); break
    }
  }

  private onEditKeydown (event: KeyboardEvent): void {
    const editing = this.editing
    if (editing === undefined) return
    // Ctrl/Cmd+Enter still validates, with the cell committed first.
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') { event.preventDefault(); this.validate(); return }
    if (event.key === 'Escape') { event.preventDefault(); this.cancelEdit(); return }
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault()
      this.commitEdit()
      const { table } = this.table
      const next = event.key === 'Tab'
        ? { record: editing.record, column: Math.min(table.width - 1, editing.column + (event.shiftKey ? -1 : 1)) }
        : { record: Math.min(table.records.length - 1, editing.record + 1), column: editing.column }
      this.focusCell = { record: next.record, column: Math.max(0, next.column) }
      this.reveal = 'cell'
    }
  }

  // -------------------------------------------------------------------------
  // Events
  // -------------------------------------------------------------------------

  private onSubmit (event: Event): void {
    event.preventDefault()
    this.validate()
  }

  private onStandard (event: Event): void {
    this.standardIndex = Number((event.target as HTMLSelectElement).value)
    this.exampleUrl = ''
    const standard = this.standard
    if (standard !== undefined && !formatsOf(standard).includes(this.format)) this.switchFormat('json')
    this.loadCsvwSummary()
  }

  private onFormat (event: Event): void {
    this.switchFormat((event.target as HTMLInputElement).value as DataFormat)
  }

  private onExample (event: Event): void {
    this.loadExample((event.target as HTMLSelectElement).value)
  }

  private loadExample (url: string): void {
    if (url !== '') this.switchFormat(formatOf(url))
    this.exampleUrl = url
    if (url === '') return
    const token = ++this.exampleToken
    const config = this.config
    const ref = this.effectiveRef
    // An example beside the shapes is read at the same version as them.
    const versioned = config !== undefined && ref !== undefined && inShapesRepo(config, url)
    this.results = { kind: 'info', text: 'Loading example…' }
    void (async () => {
      try {
        const response = await fetch(config !== undefined ? exampleFetchUrl(config, url, ref) : fetchUrl(url))
        if (response.status === 404 && versioned) {
          throw new Error(`it is not in version ${ref} of ${shapesRepo(config)?.name ?? 'the shapes repository'}`)
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const text = await response.text()
        if (token !== this.exampleToken) return
        this.setText(text)
        this.exampleText = this.text
        this.results = undefined
        this.validate()
      } catch (error) {
        if (token !== this.exampleToken) return
        // exampleText is kept: the editor still holds the example, unedited, so
        // picking a version that has it brings it back.
        this.results = { kind: 'error', text: `Could not load the example: ${(error as Error).message}.` }
      }
    })()
  }

  private onRefPick (event: Event): void {
    this.ref = (event.target as HTMLInputElement).value
    if (event.type === 'change') this.reloadExample()
  }

  /*
   * An example beside the shapes belongs to their version, so picking another
   * version brings in that version's copy - unless the person has edited it,
   * since their edits matter more than keeping the example in step.
   */
  private reloadExample (): void {
    const config = this.config
    const url = this.exampleUrl
    if (config === undefined || url === '' || !inShapesRepo(config, url)) return
    if (this.exampleText === undefined || this.text !== this.exampleText) return
    this.loadExample(url)
  }

  // A click or Space picks and is done. Arrow keys only move through the list,
  // and fire no click, so the list stays open until Enter or Escape.
  private onRefClick (event: Event): void {
    if ((event.target as Element).closest('label') !== null) this.closeVersion()
  }

  private onVersionKey (event: KeyboardEvent): void {
    const inList = (event.target as Element).closest('.ref-list') !== null
    // Enter on a radio would submit the form and validate; in the text field it still does.
    if (event.key === 'Escape' || (event.key === 'Enter' && inList)) {
      event.preventDefault()
      this.closeVersion()
    }
  }

  private onVersionToggle (event: Event): void {
    const details = event.target as HTMLDetailsElement
    if (!details.open) { document.removeEventListener('pointerdown', this.onOutsideVersion); return }
    // Like any menu, a press anywhere else closes it.
    document.addEventListener('pointerdown', this.onOutsideVersion)
    const target = details.querySelector<HTMLInputElement>('.ref-list input:checked, .ref-input')
    target?.focus({ preventScroll: true })
    target?.closest('label')?.scrollIntoView({ block: 'nearest' })
  }

  private readonly onOutsideVersion = (event: Event): void => {
    const details = this.find<HTMLDetailsElement>('details.version')
    if (details?.open === true && !event.composedPath().includes(details)) details.open = false
  }

  private closeVersion (): void {
    const details = this.find<HTMLDetailsElement>('details.version')
    if (details?.open !== true) return
    details.open = false
    details.querySelector('summary')?.focus()
  }

  private onClear (): void {
    this.exampleToken += 1
    this.exampleUrl = ''
    this.setText('')
    this.results = undefined
  }

  private onInput (event: Event): void {
    this.setText((event.target as HTMLTextAreaElement).value)
    this.updateCaret()
  }

  private onKeydown (event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') { event.preventDefault(); this.validate() }
  }

  // Only a drop target that cancels dragover is offered the drop; read-only refuses it.
  private onDragOver (event: DragEvent): void {
    if (!this.readOnly) event.preventDefault()
  }

  // Drag a file straight onto the editor or the table. Its extension picks the format.
  private onDrop (event: DragEvent): void {
    if (this.readOnly) return
    const file = event.dataTransfer?.files?.[0]
    if (!file) return
    event.preventDefault()
    void file.text().then((text) => {
      this.switchFormat(formatOf(file.name))
      this.exampleUrl = ''
      this.setText(text)
      this.results = undefined
    })
  }

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  /*
   * Once the refs are listed, the box is just that list: one pick, and it
   * closes. Until then, and if GitHub won't list them, it is a text field, so
   * any branch, tag or commit can still be typed.
   */
  private renderVersion (): TemplateResult {
    const config = this.config
    const initial = config !== undefined ? defaultRef(config) : undefined
    if (config === undefined || initial === undefined) return html`<details class="version" hidden></details>`
    const current = this.ref.trim() || initial
    const repo = shapesRepo(config)
    const where = repo ? html`<a href=${repo.url} rel="noreferrer">${repo.name}</a>` : 'the shapes repository'
    const failed = this.refList === 'failed'
    // One <details> either way, so it stays open if the list fails while someone has it open.
    return html`
      <details class="version" @toggle=${this.onVersionToggle} @keydown=${this.onVersionKey}>
        <summary><span class="version-label">Version</span>${current !== initial
          // Named only when it isn't the default, so a version picked earlier isn't forgotten.
          ? html`<span class="version-dot" aria-hidden="true">·</span><span class="version-current">${current}</span>`
          : nothing}</summary>
        <div class=${failed ? 'version-body' : 'version-body version-menu'}>
          ${failed ? this.renderRefField(where) : this.renderRefList(config, current, initial)}
        </div>
      </details>`
  }

  private renderRefList (config: ValidatorConfig, current: string, initial: string): TemplateResult {
    const tags = config.versions === 'tags'
    const listed = Array.isArray(this.refList) ? this.refList : []
    const latest = tags ? latestTag(listed) : undefined
    const note = (ref: string): string =>
      ref === latest ? 'latest' : tags && isDraftTag(ref) ? 'draft' : ref === initial ? 'default' : ''
    return html`
      <div class="ref-list" role="radiogroup" aria-label="Shapes version"
        aria-busy=${this.refList === 'loading' ? 'true' : 'false'}
        @change=${this.onRefPick} @click=${this.onRefClick}>
        ${refOptions(listed, current, initial).map((ref) => html`
          <label class=${ref === current ? 'on' : ''}>
            <input type="radio" name="ref" value=${ref} .checked=${live(ref === current)} />
            <svg class="ref-check" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5" /></svg>
            <span class="ref-name">${ref}</span>
            <span class="ref-note">${note(ref)}</span>
          </label>`)}
      </div>
      ${this.refList === 'loading' ? html`<p class="ref-loading">Loading versions…</p>` : nothing}`
  }

  private renderRefField (where: unknown): TemplateResult {
    return html`
      <label for="ref">Shapes version</label>
      <input id="ref" name="ref" class="ref-input" spellcheck="false"
        .value=${live(this.ref)} @input=${this.onRefPick} @change=${this.onRefPick} />
      <p class="help ref-help">Couldn't list the versions of ${where}; type a branch, tag or commit.
        A tag pins results; a branch tracks the latest.</p>`
  }

  private renderGutter (): TemplateResult[] {
    const lines = Math.max(this.text.split('\n').length, 1)
    const out: TemplateResult[] = []
    for (let n = 1; n <= lines; n++) {
      out.push(this.flagged.has(n) ? html`<span class="flagged">${n}</span>\n` : html`${n}\n`)
    }
    return out
  }

  private renderResults (): TemplateResult {
    const results = this.results
    if (!results) {
      if (this.readOnly) return html`<p class="empty">Choose an example above to validate it.</p>`
      const what = this.format === 'csv' ? 'a file' : 'a record'
      return html`<p class="empty">Validate ${what} to see what needs fixing. Choose an example above to try it out.</p>`
    }
    if (results.kind === 'report') {
      return renderReport(results.report, results.label, {
        selected: this.selected,
        pick: (issue) => { this.pick(issue) },
      })
    }
    return banner(results.kind, results.text)
  }

  private renderFormat (standard: StandardConfig | undefined): TemplateResult | typeof nothing {
    const formats = standard !== undefined ? formatsOf(standard) : ['json']
    if (formats.length < 2 && this.format === 'json') return nothing
    const option = (format: DataFormat, label: string): TemplateResult => html`
      <label class=${this.format === format ? 'on' : ''}>
        <input type="radio" name="format" value=${format}
          .checked=${live(this.format === format)} @change=${this.onFormat} />${label}
      </label>`
    return html`
      <div class="format" role="radiogroup" aria-labelledby="format-label">
        <span id="format-label" class="label">Format</span>
        <div class="segmented">${option('json', 'JSON')}${option('csv', 'CSV')}</div>
      </div>`
  }

  private renderStandardFiles (standard: StandardConfig | undefined): TemplateResult | typeof nothing {
    if (standard === undefined) return nothing
    const files = standardFiles(standard, this.format, this.effectiveRef)
    if (files.length === 0) return nothing
    return html`
      <nav class="standard-files" aria-labelledby="standard-files-label">
        <span id="standard-files-label" class="label">Standard files</span>
        ${files.map((file) => html`
          <a href=${file.url} target="_blank" rel="noreferrer" class="file-link" data-kind=${file.label}>
            <svg class="file-icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 1.5h5.5L13 5v9.5H4z M9.5 1.5V5H13" /></svg>
            <span class="file-label">${file.label}</span>
            ${file.ext !== '' ? html`<span class="file-ext">${file.ext}</span>` : nothing}
            <span class="file-out" aria-hidden="true">↗</span>
            <span class="visually-hidden">(opens in a new tab)</span>
          </a>`)}
      </nav>`
  }

  private renderTextEditor (): TemplateResult {
    const csv = this.format === 'csv'
    const coloured = csv ? highlightCsv(this.text, this.marks, this.delimiter) : highlightJson(this.text)
    return html`
      <div class="editor">
        <pre class="gutter" aria-hidden="true">${this.renderGutter()}</pre>
        <div class="code">
          <pre class="highlight" aria-hidden="true">${unsafeHTML(coloured)}</pre>
          <textarea name="data" class="input" wrap="off" spellcheck="false"
            aria-label=${csv ? 'CSV to validate' : 'JSON or JSON-LD to validate'}
            ?readonly=${this.readOnly}
            placeholder=${this.readOnly
              ? 'Choose an example above.'
              : csv
                ? 'Paste CSV here, with its header row first, or drop a .csv file.'
                : this.config?.placeholder ?? nothing}
            .value=${live(this.text)}
            @input=${this.onInput}
            @scroll=${this.syncScroll}
            @keydown=${this.onKeydown}
            @keyup=${this.updateCaret}
            @click=${this.updateCaret}
            @select=${this.updateCaret}
            @dragover=${this.onDragOver}
            @drop=${this.onDrop}></textarea>
        </div>
      </div>
      ${csv
        ? html`
          <div class="editor-foot">
            <span>${DELIMITER_NAMES[this.delimiter] ?? `Separated by “${this.delimiter}”`} · UTF-8 · first line is the header</span>
            <span class="caret">Line ${this.caret.line}, column ${this.caret.column}</span>
          </div>`
        : nothing}`
  }

  private renderTable (): TemplateResult {
    const { table, rows } = this.table
    const header = table.records[0]
    const names = this.csvw?.names
    const shown = table.records.slice(1, MAX_TABLE_ROWS + 1)
    const hidden = table.records.length - 1 - shown.length
    const columns = Array.from({ length: table.width }, (_, c) => c)

    const headerCell = (c: number): TemplateResult => {
      const full = header?.[c]?.value ?? ''
      const label = headerLabel(full)
      const name = names?.get(label.toLowerCase())
      const flag = this.cells.get(`0,${c}`)
      return html`
        <th scope="col" data-record="0" data-column=${c} class=${flag !== undefined ? `flagged ${flag}` : ''}
          title=${full !== label ? full : nothing}>
          <span class="col-title">${label}</span>
          ${name !== undefined && name !== label ? html`<span class="col-map">→ ${name}</span>` : nothing}
        </th>`
    }

    const bodyCell = (record: number, c: number): TemplateResult => {
      const cell = table.records[record]?.[c]
      const value = cell?.value ?? ''
      const flag = this.cells.get(`${record},${c}`)
      const focused = this.focusCell?.record === record && this.focusCell.column === c
      const editing = this.editing?.record === record && this.editing.column === c
      const classes = [flag !== undefined ? `flagged ${flag}` : '', focused ? 'focus' : '', editing ? 'editing' : '']
        .filter(Boolean).join(' ')
      return html`
        <td data-record=${record} data-column=${c} class=${classes} tabindex=${focused ? 0 : -1}
          title=${value.includes('\n') || value.length > 40 ? value : nothing}>${editing
            ? html`<input class="cell-input" aria-label="Edit cell" spellcheck="false"
                .value=${live(this.editing!.value)}
                @input=${(e: Event) => { this.editing = { ...this.editing!, value: (e.target as HTMLInputElement).value } }}
                @keydown=${this.onEditKeydown}
                @blur=${() => { this.commitEdit() }} />`
            : value.trim() === '' && flag !== undefined
              ? html`<em class="empty-cell">empty</em>`
              : value}</td>`
    }

    return html`
      <div class="grid-wrap"
        @dragover=${this.onDragOver}
        @drop=${this.onDrop}>
        ${header === undefined
          ? html`<p class="grid-empty">${this.readOnly
              ? 'Choose an example above.'
              : 'Paste CSV into the Text view, drop a .csv file here, or load an example.'}</p>`
          : html`
            <table class="grid" aria-label=${this.readOnly ? 'CSV data' : 'Your CSV data'}
              aria-readonly=${this.readOnly ? 'true' : nothing}
              @click=${this.onCellClick} @dblclick=${this.onCellDblClick} @keydown=${this.onGridKeydown}>
              <thead><tr><th scope="col" class="rownum">#</th>${columns.map(headerCell)}</tr></thead>
              <tbody>${shown.map((record, index) => {
                const r = index + 1
                const flag = this.cells.get(String(r))
                const selected = this.focusCell?.record === r && this.focusCell.column === -1
                return html`
                  <tr data-record=${r} class=${[flag !== undefined ? `flagged ${flag}` : '', selected ? 'focus' : '', isBlank(record) ? 'blank' : ''].filter(Boolean).join(' ')}>
                    <th scope="row" class="rownum">${rows[r] ?? ''}</th>
                    ${columns.map((c) => bodyCell(r, c))}
                  </tr>`
              })}</tbody>
            </table>
            ${hidden > 0
              ? html`<p class="grid-more">${hidden} more row${hidden === 1 ? '' : 's'} not shown here. The Text view has every row, and all of them are validated.</p>`
              : nothing}`}
      </div>
      ${this.readOnly
        ? nothing
        : html`
          <div class="editor-foot grid-foot">
            <button type="button" class="ghost add-row" ?disabled=${header === undefined} @click=${this.onAddRow}>+ Add row</button>
            <span>Double-click a cell to edit · Drop a .csv file to replace</span>
          </div>`}`
  }

  private renderEditorPane (): TemplateResult {
    const csv = this.format === 'csv'
    const { table, rows } = csv ? this.table : { table: undefined, rows: [] }
    const rowCount = rows.filter((row) => row !== undefined).length
    const columnCount = table?.width ?? 0
    const viewButton = (view: View, label: string, icon: TemplateResult): TemplateResult => html`
      <button type="button" class="view-${view}${this.view === view ? ' on' : ''}" aria-pressed=${this.view === view ? 'true' : 'false'}
        @click=${() => { this.commitEdit(); this.view = view }}>${icon}${label}</button>`
    return html`
      <section class="pane editor-pane" aria-labelledby="editor-heading">
        <div class="pane-bar">
          <h2 id="editor-heading" class="pane-head">${this.readOnly ? 'Example data' : 'Your data'}</h2>
          ${csv
            ? html`
              <span class="counts">${rowCount} row${rowCount === 1 ? '' : 's'} · ${columnCount} column${columnCount === 1 ? '' : 's'}</span>
              <div class="view-toggle" role="group" aria-label="View">
                ${viewButton('table', 'Table', html`<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 3h12v10H2zM2 6.5h12M2 10h12M6 3v10" /></svg>`)}
                ${viewButton('text', 'Text', html`<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5.5 4.5 2 8l3.5 3.5M10.5 4.5 14 8l-3.5 3.5" /></svg>`)}
              </div>`
            : nothing}
        </div>
        ${csv && this.view === 'table' ? this.renderTable() : this.renderTextEditor()}
        ${this.readOnly
          ? nothing
          : html`
            <p class="privacy">
              Your data stays in this browser. Only the shape and ${csv ? 'CSVW mapping' : 'context'} files are downloaded.
            </p>`}
      </section>`
  }

  protected override render (): TemplateResult {
    const config = this.config
    const standard = this.standard
    return html`
      <form class="toolbar" autocomplete="off" @submit=${this.onSubmit}>
        <div class="field">
          <label for="standard">Standard</label>
          <select id="standard" name="standard" @change=${this.onStandard}>
            ${(config?.standards ?? []).map((s, index) => html`
              <option value=${index} .selected=${live(index === this.standardIndex)}>${s.name}</option>`)}
          </select>
        </div>
        ${this.renderFormat(standard)}
        <div class="field">
          <label for="example">Example</label>
          <select id="example" name="example" @change=${this.onExample}>
            <option value="" .selected=${live(this.exampleUrl === '')}>Load an example…</option>
            ${standard ? exampleList(standard, this.format).map((example) => html`
              <option value=${example.url} .selected=${live(example.url === this.exampleUrl)}>${example.name}</option>`) : nothing}
          </select>
        </div>
        <div class="actions">
          <button type="submit" class="primary validate" ?disabled=${this.busy}>${this.busy ? 'Validating…' : 'Validate'}</button>
          ${this.readOnly ? nothing : html`<button type="button" class="ghost clear" @click=${this.onClear}>Clear</button>`}
        </div>
        ${this.renderVersion()}
        <div class="toolbar-info">
          ${standard?.description !== undefined
            ? html`<p class="help toolbar-help standard-help">${standard.description}</p>`
            : nothing}
          ${this.renderStandardFiles(standard)}
        </div>
      </form>

      <main class="workspace">
        ${this.renderEditorPane()}

        <section class="pane results-pane" aria-labelledby="results-heading">
          <h2 id="results-heading" class="pane-head">Results</h2>
          <div class="results-scroll">
            <div class="results" aria-live="polite">${this.renderResults()}</div>
          </div>
        </section>
      </main>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'data-standard-validator': DataStandardValidator
  }
}
