# Development

```bash
npm install
npm run dev          # the demo page, http://localhost:5173/
npm run typecheck
npm test             # unit tests: config, highlighting, engine (offline)
npm run build        # dist/, what hosts import
```

The demo (`demo/`) has a single standard built from the fixtures in
`demo/public/fixtures/`, so it works offline.

## Browser tests

```bash
npx playwright install chromium    # once
npm run test:web
```

These tests drive a real Chromium against a production build of the demo:
loading an example, reporting an issue with its line, jumping to that line,
showing pills and handling malformed JSON. They also check that the console
stays clean. They use the production build because the dev server doesn't
tree-shake, and it has hidden bundling failures in the worker before.

To watch the tests run:

```bash
HEADED=1 SLOWMO=250 npm run test:web
```

## Trying a change in a host page

```bash
cd ../your-site
npm install --install-links ../data-standard-validator-component
```

Re-run this after each change. `--install-links` copies the package into
`node_modules` (running `prepare`) instead of symlinking it. With a symlink,
Vite's dev server refuses to serve the worker from outside the host's root.

## Layout

```
src/
  index.ts              defines <data-standard-validator>
  validator-element.ts  the element: toolbar, editor, results
  report.ts             a run report, as Lit templates
  styles.ts             the shadow-root styles and theme tokens
  highlight.ts          JSON colouring for the editor
  config.ts             config types and URL handling (no DOM, no engine values)
  engine.ts             a resolved standard, loaded into a memoised validator
  worker.ts             where validation runs
demo/                   the dev and test page
test/                   unit tests, and element.web.test.ts
```

The element must stay free of anything specific to a standard. Names, URLs
and copy belong in the host's config.
