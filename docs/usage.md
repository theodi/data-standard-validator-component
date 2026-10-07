# Usage

## Install

The package is installed from GitHub rather than from a registry. It builds
itself on install.

```bash
npm install github:theodi/data-standard-validator-component
```

The package ships as unbundled ES modules, so the page needs a bundler (Vite,
webpack 5 or Rollup). The validation worker is loaded with
`new URL('./worker.js', import.meta.url)`, which these bundlers recognise.

With **Vite**, exclude the package from dependency pre-bundling. If you don't,
the worker URL breaks in the dev server. Then include the engine again: its
CommonJS dependencies still need pre-bundling.

```ts
// vite.config.ts
export default defineConfig({
  optimizeDeps: {
    exclude: ['@theodi/data-standard-validator-component'],
    include: ['@theodi/data-standard-validator-component > @theodi/data-standard-validator'],
  },
})
```

## Use

Importing the package defines the element. You then set its `config`
property:

```ts
import '@theodi/data-standard-validator-component'
import type { ValidatorConfig } from '@theodi/data-standard-validator-component'

const config: ValidatorConfig = { standards: [/* ... */] }
document.querySelector('data-standard-validator')!.config = config
```

The element fills the space it is given. Inside a flex column it takes up the
remaining height, and the editor and results scroll separately. On narrow
screens the panes stack.

## Config

`ValidatorConfig`:

| Field | Meaning |
| --- | --- |
| `standards` | The standards to offer (required). |
| `ref` | Git ref to read GitHub-hosted shapes and contexts at. Defaults to the ref in the first GitHub shape URL. |
| `patterns` | Plain-English names for the `sh:pattern` regexes the shapes use: `{ pattern, description, example? }`. |
| `placeholder` | Text shown in the empty editor. |
| `storageKey` | localStorage key for the last record. `false` turns this off. |

`StandardConfig`:

| Field | Meaning |
| --- | --- |
| `name` | The picker label. The verdict also uses it to say what was checked. |
| `description` | Help text under the picker. |
| `shapes` | One or more SHACL Turtle URLs, merged in order. |
| `context` | A JSON-LD context that replaces each record's own `@context`. If you leave it out, the record's own context is used. |
| `examples` | Example record URLs (named after their file), or `{ name, url }`. |

GitHub page links (`github.com/<owner>/<repo>/blob/<ref>/...`) are fetched
from `raw.githubusercontent.com`, which is the only GitHub host that allows
cross-origin requests. When any shape comes from GitHub, an **Advanced** box
lets the person change the ref. Other URLs are fetched exactly as written.

## Theming

Styles live in the element's shadow root. You change the colours with CSS
custom properties, set on `:root` or on the element:

```css
data-standard-validator {
  --dsv-accent: #0f4b69;
  --dsv-sans: Georgia, serif;
}
```

| Group | Tokens (each prefixed `--dsv-`) |
| --- | --- |
| Surfaces | `bg`, `surface`, `surface-2`, `border`, `text`, `text-dim` |
| Links and buttons | `link`, `link-hover`, `accent`, `accent-text` |
| Issues | `violation`, `violation-edge`, `violation-bg`, `warning`, `warning-edge`, `warning-bg`, `info`, `info-edge`, `info-bg`, `ok`, `ok-edge`, `ok-bg` |
| Editor | `syn-key`, `syn-keyword`, `syn-string`, `syn-number`, `syn-literal`, `syn-punct`, `selection` |
| Other | `radius`, `sans`, `mono` |

Dark colours follow the system setting. To force one scheme, set
`theme="light"` or `theme="dark"` on the element. A token you set applies in
both schemes.

## Without the element

Two entry points need no DOM, so you can check a config in Node, or validate
records the way the worker does:

```ts
import { resolveStandard, defaultRef } from '@theodi/data-standard-validator-component/config'
import { loadValidator } from '@theodi/data-standard-validator-component/engine'

const validator = await loadValidator(resolveStandard(config.standards[0], defaultRef(config)))
const report = await validator.validate({ name: 'record.jsonld', text })
```

`/config` imports only types from the engine, so a page can import it
without pulling the RDF stack into its main bundle.
