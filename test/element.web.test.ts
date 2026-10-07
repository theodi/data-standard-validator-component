/*
 * The element, driven in a real browser against the demo page.
 *
 * What this proves is the part unit tests cannot: that the RDF stack survives
 * bundling, that the worker starts, and that a person who pastes a broken
 * record sees the field name and the line. Playwright's selectors pierce the
 * open shadow root, so they read like selectors into a plain page.
 *
 * It drives the production build, not the dev server. The two differ in ways
 * that matter: the dev server never tree-shakes, so it once hid a build that
 * dropped the worker's `window` shim and hung on "Validating..." in production.
 */

import { describe, expect, test, beforeAll, afterAll } from 'vitest'
import { chromium, type Browser, type Page } from 'playwright'
import { build, preview, type PreviewServer } from 'vite'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const fixture = (file: string): string => readFileSync(join(root, 'demo', 'public', 'fixtures', file), 'utf8')

let server: PreviewServer
let outDir: string
let browser: Browser
let page: Page
const consoleErrors: string[] = []

beforeAll(async () => {
  const configFile = join(root, 'vite.config.ts')
  outDir = mkdtempSync(join(tmpdir(), 'dsv-component-web-'))
  await build({ configFile, logLevel: 'warn', build: { outDir } })
  server = await preview({ configFile, build: { outDir }, preview: { port: 0 } })
  const address = server.httpServer.address()
  const port = typeof address === 'object' && address !== null ? address.port : 0

  // HEADED=1 opens a real window, and SLOWMO=250 slows it enough to watch.
  browser = await chromium.launch({
    headless: process.env['HEADED'] !== '1',
    slowMo: Number(process.env['SLOWMO'] ?? 0),
  })
  page = await browser.newPage()
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => { consoleErrors.push(error.message) })
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' })
}, 180_000)

afterAll(async () => {
  await browser?.close()
  await server?.close()
  if (outDir !== undefined) rmSync(outDir, { recursive: true, force: true })
})

async function validate (text: string): Promise<void> {
  await page.fill('[name="data"]', text)
  await page.click('button.validate')
}

describe('<data-standard-validator>', () => {
  test('renders into a shadow root', async () => {
    const shadow = await page.$eval('data-standard-validator', (el) => el.shadowRoot !== null)
    expect(shadow).toBe(true)
  })

  test('lists the configured standards and examples', async () => {
    const standards = await page.$$eval('[name="standard"] option', (nodes) => nodes.map((n) => n.textContent))
    expect(standards).toEqual(['Example person'])
    const examples = await page.$$eval('[name="example"] option', (nodes) => nodes.map((n) => n.textContent))
    expect(examples).toEqual(['Load an example…', 'valid', 'invalid'])
  })

  test('hides the version box when no shape comes from GitHub', async () => {
    expect(await page.isHidden('details.advanced')).toBe(true)
  })

  test('loads an example and validates it', async () => {
    await page.selectOption('[name="example"]', { label: 'valid' })
    await page.waitForSelector('.verdict', { timeout: 120_000 })
    expect(await page.inputValue('[name="data"]')).toContain('Ada Lovelace')
    expect(await page.textContent('.verdict')).toContain('follows the standard')
  })

  test('reports a bad postcode with the field name and the line', async () => {
    await validate(fixture('invalid.jsonld'))
    await page.waitForSelector('.verdict.fail', { timeout: 120_000 })
    const metas = await page.$$eval('.issue.violation .issue-meta', (nodes) => nodes.map((n) => n.textContent))
    expect(metas.some((m) => m?.includes('address[0].postcode') && m.includes('line 6'))).toBe(true)
    const titles = await page.$$eval('.issue-title', (nodes) => nodes.map((n) => n.textContent))
    for (const title of titles) expect(title).not.toContain('http')
    expect(await page.$$eval('.gutter .flagged', (nodes) => nodes.length)).toBeGreaterThan(0)
  })

  test('jumps to the line when an issue is clicked', async () => {
    await page.click('.issue.violation >> text=postcode')
    const line = await page.$eval('[name="data"]', (el) => {
      const input = el as HTMLTextAreaElement
      return input.value.slice(0, input.selectionStart).split('\n').length
    })
    expect(line).toBe(6)
  })

  test('shows permitted values as pills', async () => {
    const pills = await page.$$eval('.pill', (nodes) => nodes.map((n) => n.textContent))
    expect(pills.length).toBeGreaterThan(1)
  })

  test('explains malformed JSON instead of failing silently', async () => {
    await validate('{ "name": ')
    await page.waitForSelector('.issue, .banner.error', { timeout: 120_000 })
    expect((await page.textContent('.results'))?.toLowerCase()).toContain('json')
  })

  test('clears the editor and the results', async () => {
    await page.click('button.clear')
    expect(await page.inputValue('[name="data"]')).toBe('')
    expect(await page.textContent('.results')).toContain('Validate a record')
  })

  test('the browser logged no errors throughout', () => {
    expect(consoleErrors).toEqual([])
  })
})
