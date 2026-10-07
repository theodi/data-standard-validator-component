# Data Standard Validator Component

`<data-standard-validator>`, a Lit web component that validates JSON and
JSON-LD records against SHACL shapes in the browser. The engine is
[@theodi/data-standard-validator](https://github.com/theodi/data-standard-validator)
(locally `../data-standard-validator`). Its first host is
[SocialCareData/validator](https://github.com/SocialCareData/validator) (locally `../validator`).

```bash
npm test             # unit: config, highlight, engine - offline
npm run typecheck
npm run build        # dist/ - hosts import this, not src/
npm run dev          # demo/ at http://localhost:5173/
npm run test:web     # real Chromium against a production build of demo/
```

## Things you cannot infer from the code

**Nothing about a particular standard belongs here:** no names, URLs, copy or
storage keys. All of that goes in the host's config. Wording of issues
belongs in the engine.

**Distributed as a git dependency, not via a registry.** Hosts install
`github:theodi/data-standard-validator-component#main`, and `prepare` builds
`dist/` on install. Keep `prepare` working from a clean clone.

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
(`[name="standard|example|ref|data"]`, `button.validate`, `.verdict`,
`.issue`, `.issue-meta`, `.pill`, `.banner`), so treat them as API.

## Conventions

Comments explain why something is the way it is, not what the line does.
