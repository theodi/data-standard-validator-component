/*
 * A run report, as Lit templates. Knows nothing about the editor beyond a
 * callback for the issue a person picks, so the rendering can be read and
 * changed on its own.
 */

import { html, nothing, type TemplateResult } from 'lit'
import { groupIssues, type Issue, type RunReport, type Severity } from '@theodi/data-standard-validator'
import { pointerTarget } from './csv.js'
import type { TextMark } from './highlight.js'

/** What was validated, and against what: the report itself only knows URLs. */
export interface RunLabel {
  standard: string
  ref?: string
  /** Set for a CSV run, from the table as it was sent. */
  csv?: {
    /** Data rows, as the engine counts them. */
    rows: number
    /** Each data row's first cell, to name the row in its heading. */
    firstCells: Map<number, string>
    /** The CSVW file's name, to say what the rows were read with. */
    mapping?: string
  }
}

export interface ReportView {
  /** The issue last picked, drawn as selected. */
  selected?: Issue | undefined
  pick: (issue: Issue) => void
}

const SEVERITY_WORD: Record<Severity, string> = {
  violation: 'Problem', warning: 'Warning', info: 'Note',
}

export function banner (kind: 'warning' | 'info' | 'error', text: string): TemplateResult {
  return html`<div class="banner ${kind}">${text}</div>`
}

/** Render `**bold**` and `` `code` `` from the message layer. */
function richText (text: string): (string | TemplateResult)[] {
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*)/g
  const out: (string | TemplateResult)[] = []
  let last = 0
  for (const match of text.matchAll(pattern)) {
    const index = match.index
    if (index > last) out.push(text.slice(last, index))
    const token = match[0]
    out.push(token.startsWith('`')
      ? html`<code>${token.slice(1, -1)}</code>`
      : html`<strong>${token.slice(2, -2)}</strong>`)
    last = index + token.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

function technicalDetail (issue: Issue): TemplateResult | typeof nothing {
  // `value` is the only place an issue raised outside SHACL - a context that
  // could not be loaded, say - can name the URL and the reason.
  if (!issue.technical && issue.value === undefined) return nothing
  const rows: [string, string | undefined][] = [
    ['code', issue.code],
    ['value', issue.value],
    ['constraint', issue.technical?.constraint],
    ['property', issue.technical?.resultPath],
    ['focus', issue.technical?.focusNode],
    ['shape', issue.technical?.sourceShape],
  ]
  // Clicking inside the disclosure should not also jump the editor.
  return html`
    <details @click=${(event: Event) => { event.stopPropagation() }}>
      <summary>Technical detail</summary>
      <dl>${rows.map(([key, value]) => value === undefined
        ? nothing
        : html`<dt>${key}</dt><dd>${value}</dd>`)}</dl>
    </details>`
}

function issueCard (issue: Issue, view: ReportView): TemplateResult {
  const where = issue.location.line !== undefined
    ? `${issue.location.jsonPath}  ·  line ${issue.location.line}`
    : issue.location.jsonPath
  const jump = (): void => { view.pick(issue) }
  const onKey = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); jump() }
  }
  const selected = view.selected === issue
  return html`
    <article class="issue ${issue.severity}${selected ? ' selected' : ''}" tabindex="0" role="button"
      aria-pressed=${selected ? 'true' : 'false'} @click=${jump} @keydown=${onKey}>
      <p class="issue-title">${richText(issue.title)}</p>
      <p class="issue-meta">${SEVERITY_WORD[issue.severity]} at ${where}</p>
      ${issue.hint !== undefined ? html`<p class="issue-hint">${richText(issue.hint)}</p>` : nothing}
      ${issue.allowedValues !== undefined && issue.allowedValues.length > 0
        ? html`<div class="pills">${issue.allowedValues.map((value) => html`<span class="pill">${value}</span>`)}</div>`
        : nothing}
      ${technicalDetail(issue)}
    </article>`
}

/** The lines the editor should flag for a report. */
export function flaggedLines (report: RunReport): Set<number> {
  const flagged = new Set<number>()
  for (const issue of report.documents[0]?.issues ?? []) {
    if (issue.location.line !== undefined && issue.severity !== 'info') {
      flagged.add(issue.location.line)
    }
  }
  return flagged
}

type Flag = 'violation' | 'warning'

/**
 * The table cells and records a CSV report flags, keyed `record,column` for
 * a cell and `record` for a whole record (0-based, header = 0). A violation
 * outranks a warning in the same place.
 */
export function flaggedCells (report: RunReport): Map<string, Flag> {
  const flagged = new Map<string, Flag>()
  const flag = (key: string, severity: Flag): void => {
    if (flagged.get(key) !== 'violation') flagged.set(key, severity)
  }
  for (const issue of report.documents[0]?.issues ?? []) {
    if (issue.severity === 'info') continue
    const target = pointerTarget(issue.location.pointer)
    if (target === undefined) continue
    flag(String(target.record), issue.severity)
    if (target.column !== undefined) flag(`${target.record},${target.column}`, issue.severity)
  }
  return flagged
}

/** The text a CSV report's issues are about, for the editor to mark. */
export function textMarks (report: RunReport): TextMark[] {
  const marks: TextMark[] = []
  for (const issue of report.documents[0]?.issues ?? []) {
    const { line, column, endLine, endColumn, pointer } = issue.location
    // Only a cell: a whole record's range would paint the entire row.
    if (issue.severity === 'info' || !pointer.startsWith('#cell=')) continue
    if (line === undefined || column === undefined || endLine === undefined || endColumn === undefined) continue
    marks.push({ line, column, endLine, endColumn, severity: issue.severity })
  }
  return marks
}

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`

/** A CSV group is a row; name it by its first cell, which is usually its identifier. */
function csvGroupLabel (issues: Issue[], label: string, firstCells: Map<number, string>): string {
  const row = issues[0]?.location.cell?.row
  if (row === undefined) return label
  if (row === 0) return 'Columns'
  const first = firstCells.get(row)?.trim()
  return first !== undefined && first !== '' ? `Row ${row}  ·  ${first}` : `Row ${row}`
}

export function renderReport (report: RunReport, label: RunLabel, view: ReportView): TemplateResult {
  const doc = report.documents[0]
  if (!doc) return html``

  const problems = doc.counts.violation
  const warnings = doc.counts.warning
  const csv = label.csv
  const parts = [label.standard, label.ref !== undefined ? `ref ${label.ref}` : '']
  if (csv !== undefined) {
    const failing = new Set(doc.issues
      .filter((i) => i.severity === 'violation' && (i.location.cell?.row ?? 0) > 0)
      .map((i) => i.location.cell!.row))
    if (failing.size > 0) parts.push(`${failing.size} of ${plural(csv.rows, 'row')} fail${failing.size === 1 ? 's' : ''}`)
    if (problems > 0) parts.push(plural(problems, 'problem'))
  }
  if (warnings > 0) parts.push(plural(warnings, 'warning'))

  const noun = csv !== undefined ? 'file' : 'record'
  const verdict = doc.conforms
    ? `This ${noun} follows the standard`
    : csv !== undefined ? 'This file does not follow the standard' : `${plural(problems, 'problem')} found`

  return html`
    ${report.setup.warnings.map((warning) =>
      banner('warning', `${warning.title}${warning.hint !== undefined ? ` ${warning.hint}` : ''}`))}
    <div class="verdict ${doc.conforms ? 'pass' : 'fail'}">
      <strong>${verdict}</strong>
      <span class="muted">${parts.filter(Boolean).join('  ·  ')}</span>
    </div>
    ${csv !== undefined && csv.rows > 0
      ? html`<div class="banner info read-as">Read ${plural(csv.rows, 'row')}${csv.mapping !== undefined
          ? html` using the CSVW mapping <code>${csv.mapping}</code>`
          : nothing}.</div>`
      : nothing}
    ${groupIssues(doc.issues.filter((i) => i.severity !== 'info')).map((group) => html`
      <section class="group">
        <h3>${csv !== undefined ? csvGroupLabel(group.issues, group.label, csv.firstCells) : group.label}</h3>
        ${group.issues.map((issue) => issueCard(issue, view))}
      </section>`)}
    ${doc.issues.filter((i) => i.severity === 'info').map((note) => banner('info', note.title))}
    ${report.crossChecks.filter((check) => !check.ok).flatMap((check) =>
      check.findings.map((finding) => banner('error', finding.message)))}`
}
