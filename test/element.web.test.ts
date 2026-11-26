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
let origin: string
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
  origin = `http://localhost:${port}`
  await page.goto(`${origin}/`, { waitUntil: 'networkidle' })
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
    expect(await page.isHidden('details.version')).toBe(true)
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

  test('links the shape and context of a JSON standard', async () => {
    const links = await page.$$eval('.standard-files a', (nodes) => nodes.map((n) => n.getAttribute('data-kind')))
    expect(links).toEqual(['Shape', 'Context'])
  })

  test('offers CSV for a standard with CSVW, with its own examples and files', async () => {
    await page.check('[name="format"][value="csv"]')
    const examples = await page.$$eval('[name="example"] option', (nodes) => nodes.map((n) => (n as HTMLOptionElement).value))
    expect(examples.slice(1).every((url) => url.endsWith('.csv'))).toBe(true)
    const links = await page.$$eval('.standard-files a', (nodes) => nodes.map((n) => n.getAttribute('data-kind')))
    expect(links).toEqual(['Shape', 'CSVW mapping'])
    expect(await page.textContent('.privacy')).toContain('CSVW mapping')
  })

  test('flags the cells, rows and columns of an invalid CSV in the table', async () => {
    await page.selectOption('[name="example"]', { label: 'invalid' })
    await page.waitForSelector('.verdict.fail', { timeout: 120_000 })
    expect(await page.textContent('.verdict')).toContain('1 of 3 rows fails')
    // Row 2's name is empty, its postcode is wrong; the notes column is not in the mapping.
    expect(await page.textContent('td.flagged.violation[data-record="2"][data-column="0"]')).toBe('empty')
    expect(await page.textContent('td.flagged.violation[data-record="2"][data-column="3"]')).toBe('nope')
    expect(await page.textContent('tr.flagged.violation .rownum')).toBe('2')
    expect(await page.isVisible('th.flagged.warning[data-column="4"]')).toBe(true)
    expect(await page.textContent('.group h3')).toContain('Row 2')
  })

  test('outlines the cell when an issue is clicked', async () => {
    await page.click('.issue.violation >> text=age')
    expect(await page.getAttribute('td.focus', 'data-column')).toBe('1')
    expect(await page.isVisible('.issue.selected')).toBe(true)
  })

  test('edits a cell in place, writing it into the text', async () => {
    await page.dblclick('td[data-record="2"][data-column="3"]')
    await page.fill('.cell-input', 'GH1')
    await page.press('.cell-input', 'Enter')
    expect(await page.isVisible('td.flagged[data-record="2"][data-column="3"]')).toBe(false)
    await page.click('button.view-text')
    expect(await page.inputValue('[name="data"]')).toContain(',Retired,GH1,')
  })

  test('marks the lines and cells in the text view after validating again', async () => {
    await page.click('button.validate')
    await page.waitForSelector('.verdict.fail', { timeout: 120_000 })
    const metas = await page.$$eval('.issue-meta', (nodes) => nodes.map((n) => n.textContent))
    expect(metas.some((m) => m?.includes('postcode'))).toBe(false)
    expect(await page.textContent('.gutter .flagged')).toBe('1')
    expect(await page.$$eval('.highlight mark.cell-violation', (nodes) => nodes.length)).toBeGreaterThan(0)
  })

  test('keeps each format\'s text when switching between them', async () => {
    await page.check('[name="format"][value="json"]')
    expect(await page.inputValue('[name="data"]')).toBe('')
    await page.check('[name="format"][value="csv"]')
    expect(await page.inputValue('[name="data"]')).toContain('GH1')
    await page.click('button.clear')
    await page.check('[name="format"][value="json"]')
  })

  test('opens on the standard and example a link names', async () => {
    const url = (file: string): string => `${origin}/fixtures/${file}`
    const query = new URLSearchParams({
      shape: url('person-shape.ttl'),
      context: url('context.jsonld'),
      example: url('invalid.jsonld'),
    })
    const linked = await browser.newPage()
    try {
      await linked.goto(`${origin}/?${query}`)
      await linked.waitForSelector('.verdict.fail', { timeout: 120_000 })
      expect(await linked.inputValue('[name="example"]')).toBe(url('invalid.jsonld'))
      expect(await linked.inputValue('[name="data"]')).toContain('postcode')
    } finally {
      await linked.close()
    }
  })

  describe('the Version box, for shapes on GitHub', () => {
    const shape = 'https://github.com/o/r/blob/main/person-shape.ttl'

    // GitHub's API is stubbed: the test must not depend on the network or its rate limit.
    async function open (answer: { status: number, body: unknown }, stored?: string[]): Promise<{ page: Page, asked: string[] }> {
      const versioned = await browser.newPage()
      const asked: string[] = []
      await versioned.route('https://api.github.com/**', async (route) => {
        asked.push(route.request().url())
        await route.fulfill({ status: answer.status, contentType: 'application/json', body: JSON.stringify(answer.body) })
      })
      await versioned.goto(`${origin}/`)
      // An hour-old list, as a page loaded earlier would have left it.
      await versioned.evaluate((refs) => {
        localStorage.clear()
        if (refs) localStorage.setItem('dsv-refs:v1:o/r:branches', JSON.stringify({ at: Date.now() - 3_600_000, refs }))
      }, stored)
      await versioned.evaluate((url) => {
        const el = document.querySelector('data-standard-validator') as HTMLElement & { config: unknown }
        el.config = { standards: [{ name: 'On GitHub', shapes: url }] }
      }, shape)
      await versioned.click('details.version summary')
      return { page: versioned, asked }
    }

    const isOpen = (p: Page): Promise<boolean> => p.$eval('details.version', (el) => (el as HTMLDetailsElement).open)

    test('lists the branches, and reads the shapes at the one picked', async () => {
      const { page: versioned, asked } = await open({ status: 200, body: [{ name: 'dev' }, { name: 'main' }] })
      try {
        await versioned.waitForSelector('.ref-list[aria-busy="false"]')
        expect(asked).toEqual(['https://api.github.com/repos/o/r/branches?per_page=100'])
        expect((await versioned.textContent('details.version summary'))?.trim()).toBe('Version')
        expect(await versioned.textContent('.ref-list label.on .ref-note')).toBe('default')
        const refs = await versioned.$$eval('[name="ref"]', (nodes) => nodes.map((n) => (n as HTMLInputElement).value))
        expect(refs).toEqual(['dev', 'main'])
        expect(await versioned.$eval('[name="ref"]:checked', (el) => (el as HTMLInputElement).value)).toBe('main')

        await versioned.click('.ref-list label:has([value="dev"])')
        expect(await isOpen(versioned)).toBe(false)
        expect(await versioned.textContent('.version-current')).toBe('dev')
        expect(await versioned.getAttribute('.standard-files a', 'href'))
          .toBe('https://github.com/o/r/blob/dev/person-shape.ttl')

        await versioned.click('details.version summary')
        expect(await isOpen(versioned)).toBe(true)
        await versioned.keyboard.press('Escape')
        expect(await isOpen(versioned)).toBe(false)
      } finally {
        await versioned.close()
      }
    })

    test('shows a stored list at once, then the branches GitHub has now', async () => {
      const body = [{ name: 'automation/sync' }, { name: 'main' }]
      const { page: versioned, asked } = await open({ status: 200, body }, ['main'])
      try {
        await versioned.waitForSelector('[name="ref"][value="automation/sync"]')
        expect(asked).toHaveLength(1)
        const refs = await versioned.$$eval('[name="ref"]', (nodes) => nodes.map((n) => (n as HTMLInputElement).value))
        expect(refs).toEqual(['automation/sync', 'main'])
      } finally {
        await versioned.close()
      }
    })

    test('reads an example beside the shapes at the version picked', async () => {
      const versioned = await browser.newPage()
      const examples: Record<string, string> = {
        'https://raw.githubusercontent.com/o/r/main/examples/x.jsonld': '{ "at": "main" }',
        'https://raw.githubusercontent.com/o/r/v2/examples/x.jsonld': '{ "at": "v2" }',
      }
      await versioned.route('https://api.github.com/**', (route) => route.fulfill({
        contentType: 'application/json', body: JSON.stringify([{ name: 'v2' }, { name: 'v1' }]),
      }))
      await versioned.route('https://raw.githubusercontent.com/**', (route) => {
        const body = examples[route.request().url()]
        return body !== undefined ? route.fulfill({ body }) : route.fulfill({ status: 404, body: 'Not found' })
      })
      try {
        await versioned.goto(`${origin}/`)
        await versioned.evaluate((url) => {
          localStorage.clear()
          const el = document.querySelector('data-standard-validator') as HTMLElement & { config: unknown }
          el.config = { versions: 'tags', standards: [{ name: 'On GitHub', shapes: url, examples: [url.replace('person-shape.ttl', 'examples/x.jsonld')] }] }
        }, shape)
        const pick = async (ref: string): Promise<void> => {
          await versioned.click('details.version summary')
          await versioned.click(`.ref-list label:has([value="${ref}"])`)
        }
        await versioned.selectOption('[name="example"]', { label: 'x' })
        await versioned.waitForFunction(() => document.querySelector('data-standard-validator')!.shadowRoot!
          .querySelector<HTMLTextAreaElement>('[name="data"]')!.value.includes('main'))

        await pick('v2')
        await versioned.waitForFunction(() => document.querySelector('data-standard-validator')!.shadowRoot!
          .querySelector<HTMLTextAreaElement>('[name="data"]')!.value.includes('v2'))

        // Not in v1: say so, and leave the editor alone.
        await pick('v1')
        await versioned.waitForSelector('.results >> text=not in version v1 of o/r')
        expect(await versioned.inputValue('[name="data"]')).toContain('v2')

        // An edited example is the person's now; another version leaves it be.
        await versioned.fill('[name="data"]', '{ "mine": true }')
        await pick('main')
        await versioned.waitForTimeout(300)
        expect(await versioned.inputValue('[name="data"]')).toBe('{ "mine": true }')
      } finally {
        await versioned.close()
      }
    })

    test('falls back to typing a ref when GitHub will not list them', async () => {
      const { page: versioned } = await open({ status: 403, body: { message: 'rate limit' } })
      try {
        await versioned.waitForSelector('input[name="ref"]')
        expect(await versioned.inputValue('[name="ref"]')).toBe('main')
        expect(await versioned.textContent('.ref-help')).toContain("Couldn't list the versions")
        await versioned.fill('[name="ref"]', 'v1.0.0')
        expect(await versioned.getAttribute('.standard-files a', 'href'))
          .toBe('https://github.com/o/r/blob/v1.0.0/person-shape.ttl')
      } finally {
        await versioned.close()
      }
    })
  })

  describe('read-only', () => {
    /*
     * A fresh element, so that it reads the link as the first one on the page
     * would. The demo's own element has already read it, editable.
     */
    async function open (search = ''): Promise<Page> {
      const readOnly = await browser.newPage()
      await readOnly.goto(`${origin}/${search}`)
      await readOnly.evaluate(() => {
        type El = HTMLElement & { config: object }
        const demo = document.querySelector('data-standard-validator') as El
        const el = document.createElement('data-standard-validator') as El
        el.config = { ...demo.config, readOnly: true }
        demo.replaceWith(el)
      })
      return readOnly
    }

    test('runs the examples but offers no way to change them', async () => {
      const readOnly = await open()
      try {
        expect(await readOnly.getAttribute('[name="data"]', 'readonly')).not.toBeNull()
        expect(await readOnly.$('button.clear')).toBeNull()
        expect(await readOnly.$('.privacy')).toBeNull()

        await readOnly.selectOption('[name="example"]', { label: 'invalid' })
        await readOnly.waitForSelector('.verdict.fail', { timeout: 120_000 })
        await readOnly.click('.issue.violation >> text=postcode')
        const line = await readOnly.$eval('[name="data"]', (el) => {
          const input = el as HTMLTextAreaElement
          return input.value.slice(0, input.selectionStart).split('\n').length
        })
        expect(line).toBe(6)

        await readOnly.check('[name="format"][value="csv"]')
        await readOnly.selectOption('[name="example"]', { label: 'invalid' })
        await readOnly.waitForSelector('.grid td[data-record="2"]', { timeout: 120_000 })
        await readOnly.dblclick('td[data-record="2"][data-column="3"]')
        await readOnly.keyboard.press('Enter')
        expect(await readOnly.$('.cell-input')).toBeNull()
        expect(await readOnly.$('.add-row')).toBeNull()
        expect(await readOnly.getAttribute('.grid', 'aria-readonly')).toBe('true')
      } finally {
        await readOnly.close()
      }
    })

    test('empties text typed before it became read-only', async () => {
      const readOnly = await browser.newPage()
      try {
        await readOnly.goto(`${origin}/`)
        await readOnly.fill('[name="data"]', '{ "mine": true }')
        await readOnly.evaluate(() => {
          const el = document.querySelector('data-standard-validator') as HTMLElement & { config: object }
          el.config = { ...el.config, readOnly: true }
        })
        await readOnly.waitForFunction(() => document.querySelector('data-standard-validator')!.shadowRoot!
          .querySelector<HTMLTextAreaElement>('[name="data"]')!.readOnly)
        expect(await readOnly.inputValue('[name="data"]')).toBe('')
      } finally {
        await readOnly.close()
      }
    })

    test('opens a linked example only if it is one of the configured ones', async () => {
      const listed = await open('?example=fixtures/valid.jsonld')
      try {
        await listed.waitForSelector('.verdict', { timeout: 120_000 })
        expect(await listed.inputValue('[name="data"]')).toContain('Ada Lovelace')
      } finally {
        await listed.close()
      }
      // A JSON file the demo serves, but not one of its examples.
      const unlisted = await open('?example=fixtures/context.jsonld')
      try {
        await unlisted.waitForTimeout(500)
        expect(await unlisted.inputValue('[name="data"]')).toBe('')
      } finally {
        await unlisted.close()
      }
    })
  })

  test('the browser logged no errors throughout', () => {
    expect(consoleErrors).toEqual([])
  })
})
