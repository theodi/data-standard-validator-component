/*
 * A run report, as Lit templates. Knows nothing about the editor beyond a
 * callback to jump to a line, so the rendering can be read and changed on its own.
 */

import { html, nothing, type TemplateResult } from 'lit'
import { groupIssues, type Issue, type RunReport, type Severity } from '@theodi/data-standard-validator'

/** What was validated against: the report itself only knows shape URLs. */
export interface RunLabel { standard: string, ref?: string }

type JumpTo = (line: number, column: number) => void

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

function issueCard (issue: Issue, jumpTo: JumpTo): TemplateResult {
  const where = issue.location.line !== undefined
    ? `${issue.location.jsonPath}  ·  line ${issue.location.line}`
    : issue.location.jsonPath
  const jump = (): void => {
    if (issue.location.line !== undefined) jumpTo(issue.location.line, issue.location.column ?? 1)
  }
  const onKey = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); jump() }
  }
  return html`
    <article class="issue ${issue.severity}" tabindex="0" role="button" @click=${jump} @keydown=${onKey}>
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

export function renderReport (report: RunReport, label: RunLabel, jumpTo: JumpTo): TemplateResult {
  const doc = report.documents[0]
  if (!doc) return html``

  const problems = doc.counts.violation
  const warnings = doc.counts.warning
  const parts = [label.standard, label.ref !== undefined ? `ref ${label.ref}` : '']
  if (warnings > 0) parts.push(`${warnings} warning${warnings === 1 ? '' : 's'}`)

  return html`
    ${report.setup.warnings.map((warning) =>
      banner('warning', `${warning.title}${warning.hint !== undefined ? ` ${warning.hint}` : ''}`))}
    <div class="verdict ${doc.conforms ? 'pass' : 'fail'}">
      <strong>${doc.conforms
        ? 'This record follows the standard'
        : `${problems} problem${problems === 1 ? '' : 's'} found`}</strong>
      <span class="muted">${parts.filter(Boolean).join('  ·  ')}</span>
    </div>
    ${groupIssues(doc.issues.filter((i) => i.severity !== 'info')).map((group) => html`
      <section class="group">
        <h3>${group.label}</h3>
        ${group.issues.map((issue) => issueCard(issue, jumpTo))}
      </section>`)}
    ${doc.issues.filter((i) => i.severity === 'info').map((note) => banner('info', note.title))}
    ${report.crossChecks.filter((check) => !check.ok).flatMap((check) =>
      check.findings.map((finding) => banner('error', finding.message)))}`
}
