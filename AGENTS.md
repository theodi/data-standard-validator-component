# Data Standard Validator Component

`<data-standard-validator>`, a Lit web component that validates JSON and
JSON-LD records, and CSV files through CSVW, against SHACL shapes in the browser. The engine is
[@theodi/data-standard-validator](https://github.com/theodi/data-standard-validator)
(locally `../data-standard-validator`). Its first host is
[SocialCareData/validator](https://github.com/SocialCareData/validator) (locally `../validator`).

```bash
npm test             # unit: config, csv, highlight, engine - offline
npm run typecheck
npm run build        # dist/ - hosts import this, not src/
npm run dev          # demo/ at http://localhost:5173/
npm run test:web     # real Chromium against a production build of demo/
```

## Things you cannot infer from the code

**Nothing about a particular standard belongs here:** no names, URLs or
copy. All of that goes in the host's config. Wording of issues belongs in the
engine.

**Records are never stored in the browser.** They may contain personal data,
so nothing typed or loaded into the element goes to `localStorage`,
`sessionStorage`, IndexedDB or cookies - not even behind an option.

**Published to npm by a GitHub release** (`.github/workflows/cd.yml`) as
[@theodi/data-standard-validator-component](https://www.npmjs.com/package/@theodi/data-standard-validator-component).
The release tag must match `version` in package.json. The jsDelivr snippets in
README.md and docs/usage.md pin a version; bump them with each release. `prepublishOnly` builds
`dist/` and `standalone/`, which are never committed. `prepare` still builds
`dist/` so a git install or a clean clone works; keep it working.

**`config.ts` and `engine.ts` are separate entry points (`/config`, `/engine`)
and must not touch the DOM.** Hosts import them in Node tests. `config.ts`
takes only types from the engine, so that a host's main thread can import it
without pulling in the RDF stack (~500 kB). The engine loads only in the worker.

**`sideEffects` in package.json must list `index` and the worker files.** If
it doesn't, bundlers drop `customElements.define` and the worker's `window`
shim, and the build still succeeds.

**The worker is `new URL('./worker.js', import.meta.url)`.** The host's
bundler bundles it. A Vite host must put this package in
`optimizeDeps.exclude` (or the URL breaks in dev) and its engine in
`optimizeDeps.include` (or the engine's CommonJS deps break in dev).

**Shadow DOM.** Theming goes through `--dsv-*` custom properties only. The
host's Playwright tests rely on the class names and `name=` attributes
(`[name="standard|example|ref|data|format"]`, `button.validate`, `.verdict`,
`.issue`, `.issue-meta`, `.pill`, `.banner`, `.standard-files a`,
`button.view-table|view-text`, `.grid td[data-record][data-column]`,
`.cell-input`), so treat them as API.

**CSV: the text is the only state.** The table is parsed from it (`src/csv.ts`,
which must count records exactly as the engine does, so its `#cell=R,C`
pointers land on the right cell), and a table edit rewrites just that cell's
slice of the text. Don't give the table its own copy of the data.

## Conventions

Comments explain why something is the way it is, not what the line does.
