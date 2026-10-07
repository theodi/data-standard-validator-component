/*
 * <data-standard-validator>: a toolbar to pick a standard and an example, an
 * editor, and a results pane. Validation happens in a worker; this element only
 * collects input, renders the report, and keeps the gutter and colouring in
 * step with the textarea.
 *
 * Everything it knows about a particular standard comes from `config`.
 */

import { html, LitElement, nothing, type PropertyValues, type TemplateResult } from 'lit'
import { live } from 'lit/directives/live.js'
import { unsafeHTML } from 'lit/directives/unsafe-html.js'
import type { RunReport } from '@theodi/data-standard-validator'
import {
  defaultRef, exampleList, fetchUrl, resolveStandard, shapesRepo,
  type StandardConfig, type ValidatorConfig,
} from './config.js'
import { highlightJson } from './highlight.js'
import { banner, flaggedLines, renderReport, type RunLabel } from './report.js'
import { styles } from './styles.js'
import type { ValidateRequest, WorkerResponse } from './worker.js'

const DEFAULT_STORAGE_KEY = 'data-standard-validator:last'

type Results =
  | { kind: 'info' | 'error', text: string }
  | { kind: 'report', report: RunReport, label: RunLabel }

export class DataStandardValidator extends LitElement {
  static override styles = styles

  static override properties = {
    config: { attribute: false },
    theme: { reflect: true },
    standardIndex: { state: true },
    exampleUrl: { state: true },
    ref: { state: true },
    text: { state: true },
    flagged: { state: true },
    results: { state: true },
    busy: { state: true },
  }

  /** The standards to offer, and everything else the element is told. */
  declare config: ValidatorConfig | undefined
  /** `light` or `dark` overrides the system colour scheme. */
  declare theme: 'light' | 'dark' | undefined

  declare private standardIndex: number
  declare private exampleUrl: string
  declare private ref: string
  declare private text: string
  declare private flagged: Set<number>
  declare private results: Results | undefined
  declare private busy: boolean

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
  private restored = false

  constructor () {
    super()
    this.standardIndex = 0
    this.exampleUrl = ''
    this.ref = ''
    this.text = ''
    this.flagged = new Set()
    this.busy = false
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
    this.worker?.terminate()
    this.worker = undefined
  }

  protected override willUpdate (changed: PropertyValues<this>): void {
    if (changed.has('config')) {
      this.standardIndex = 0
      this.exampleUrl = ''
      this.ref = this.config !== undefined ? defaultRef(this.config) ?? '' : ''
      if (!this.restored) this.restoreText()
    }
  }

  protected override updated (): void {
    this.syncScroll()
  }

  private get storageKey (): string | undefined {
    const key = this.config?.storageKey
    return key === false ? undefined : key ?? DEFAULT_STORAGE_KEY
  }

  private restoreText (): void {
    this.restored = true
    const key = this.storageKey
    if (key === undefined) return
    try {
      const saved = localStorage.getItem(key)
      if (saved !== null && saved !== '') this.text = saved
    } catch {
      // Private browsing, or storage disabled. Not worth mentioning.
    }
  }

  // -------------------------------------------------------------------------
  // Worker
  // -------------------------------------------------------------------------

  private startWorker (): void {
    if (this.worker) return
    this.workerFailure = undefined
    const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })
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

  /** Validate what is in the editor against the selected standard. */
  validate (): void {
    if (this.workerFailure !== undefined || !this.worker) { this.showWorkerFailure(); return }
    const standard = this.standard
    if (!standard || !this.config) return
    if (this.text.trim() === '') {
      this.results = { kind: 'info', text: 'Paste a record above, or load one of the examples.' }
      return
    }
    const key = this.storageKey
    if (key !== undefined) {
      try {
        localStorage.setItem(key, this.text)
      } catch {
        // As above.
      }
    }
    // Clear first: leaving the previous run's issues on screen while a new one
    // is in flight invites people to act on stale advice.
    this.results = { kind: 'info', text: 'Validating…' }
    this.busy = true
    this.requestId += 1
    const initialRef = defaultRef(this.config)
    const ref = initialRef === undefined ? undefined : this.ref.trim() || initialRef
    this.inFlight = { standard: standard.name, ...(ref !== undefined ? { ref } : {}) }
    const request: ValidateRequest = {
      kind: 'validate',
      id: this.requestId,
      standard: resolveStandard(standard, ref),
      ...(this.config.patterns !== undefined ? { patterns: this.config.patterns } : {}),
      ...(ref !== undefined ? { ref } : {}),
      text: this.text,
      name: 'your record',
    }
    this.worker.postMessage(request)
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
  }

  /** Put the caret on a line and scroll it into view. */
  private jumpToLine (line: number, column = 1): void {
    const input = this.find<HTMLTextAreaElement>('.input')
    if (!input) return
    const lines = input.value.split('\n')
    let offset = 0
    for (let i = 0; i < line - 1 && i < lines.length; i++) offset += lines[i]!.length + 1
    const start = offset + column - 1
    input.focus()
    input.setSelectionRange(start, start + Math.max(1, (lines[line - 1]?.length ?? 1) - column + 1))
    const lineHeight = input.scrollHeight / Math.max(lines.length, 1)
    input.scrollTop = Math.max(0, (line - 4) * lineHeight)
    this.syncScroll()
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
  }

  private onExample (event: Event): void {
    const url = (event.target as HTMLSelectElement).value
    this.exampleUrl = url
    if (url === '') return
    const token = ++this.exampleToken
    this.results = { kind: 'info', text: 'Loading example…' }
    void (async () => {
      try {
        const response = await fetch(fetchUrl(url))
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const text = await response.text()
        if (token !== this.exampleToken) return
        this.setText(text)
        this.results = undefined
        this.validate()
      } catch (error) {
        if (token !== this.exampleToken) return
        this.results = { kind: 'error', text: `Could not load the example: ${(error as Error).message}` }
      }
    })()
  }

  private onClear (): void {
    this.exampleToken += 1
    this.exampleUrl = ''
    this.setText('')
    this.results = undefined
  }

  private onInput (event: Event): void {
    this.setText((event.target as HTMLTextAreaElement).value)
  }

  private onKeydown (event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') { event.preventDefault(); this.validate() }
  }

  // Drag a .json or .jsonld file straight onto the editor.
  private onDrop (event: DragEvent): void {
    const file = event.dataTransfer?.files?.[0]
    if (!file) return
    event.preventDefault()
    void file.text().then((text) => { this.setText(text) })
  }

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  private renderRefHelp (): TemplateResult {
    const repo = this.config !== undefined ? shapesRepo(this.config) : undefined
    return html`Which revision of ${repo
      ? html`<a href=${repo.url} rel="noreferrer">${repo.name}</a>`
      : 'the shapes repository'} the shapes are read from. A tag pins results; a branch tracks the latest.`
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
      return html`<p class="empty">Validate a record to see what needs fixing. Choose an example above to try it out.</p>`
    }
    if (results.kind === 'report') {
      return renderReport(results.report, results.label, (line, column) => { this.jumpToLine(line, column) })
    }
    return banner(results.kind, results.text)
  }

  protected override render (): TemplateResult {
    const config = this.config
    const standard = this.standard
    const versioned = config !== undefined && defaultRef(config) !== undefined
    return html`
      <form class="toolbar" autocomplete="off" @submit=${this.onSubmit}>
        <div class="field">
          <label for="standard">Standard</label>
          <select id="standard" name="standard" @change=${this.onStandard}>
            ${(config?.standards ?? []).map((s, index) => html`
              <option value=${index} .selected=${live(index === this.standardIndex)}>${s.name}</option>`)}
          </select>
        </div>
        <div class="field">
          <label for="example">Example</label>
          <select id="example" name="example" @change=${this.onExample}>
            <option value="" .selected=${live(this.exampleUrl === '')}>Load an example…</option>
            ${standard ? exampleList(standard).map((example) => html`
              <option value=${example.url} .selected=${live(example.url === this.exampleUrl)}>${example.name}</option>`) : nothing}
          </select>
        </div>
        <div class="actions">
          <button type="submit" class="primary validate" ?disabled=${this.busy}>${this.busy ? 'Validating…' : 'Validate'}</button>
          <button type="button" class="ghost clear" @click=${this.onClear}>Clear</button>
        </div>
        <details class="advanced" ?hidden=${!versioned}>
          <summary>Advanced</summary>
          <div class="advanced-body">
            <label for="ref">Shapes version (git ref)</label>
            <input id="ref" name="ref" class="ref-input" spellcheck="false"
              .value=${live(this.ref)} @input=${(e: Event) => { this.ref = (e.target as HTMLInputElement).value }} />
            <p class="help ref-help">${versioned ? this.renderRefHelp() : nothing}</p>
          </div>
        </details>
        ${standard?.description !== undefined
          ? html`<p class="help toolbar-help standard-help">${standard.description}</p>`
          : nothing}
      </form>

      <main class="workspace">
        <section class="pane editor-pane" aria-labelledby="editor-heading">
          <h2 id="editor-heading" class="pane-head">Your data</h2>
          <div class="editor">
            <pre class="gutter" aria-hidden="true">${this.renderGutter()}</pre>
            <div class="code">
              <pre class="highlight" aria-hidden="true">${unsafeHTML(highlightJson(this.text))}</pre>
              <textarea name="data" class="input" wrap="off" spellcheck="false"
                aria-label="JSON or JSON-LD to validate"
                placeholder=${config?.placeholder ?? nothing}
                .value=${live(this.text)}
                @input=${this.onInput}
                @scroll=${this.syncScroll}
                @keydown=${this.onKeydown}
                @dragover=${(e: DragEvent) => { e.preventDefault() }}
                @drop=${this.onDrop}></textarea>
            </div>
          </div>
          <p class="privacy">
            Your data stays in this browser. Only the shape and context files are downloaded.
          </p>
        </section>

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
