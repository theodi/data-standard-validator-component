# data-standard-validator Component

[![npm](https://img.shields.io/npm/v/@theodi/data-standard-validator-component)](https://www.npmjs.com/package/@theodi/data-standard-validator-component)

`<data-standard-validator>`: a [Lit](https://lit.dev) web component that
checks JSON and JSON-LD records against SHACL shapes in the browser, with
plain-English errors that point at the line. It is built on
[@theodi/data-standard-validator](https://github.com/theodi/data-standard-validator).

See the [example project](https://github.com/theodi/data-standard-validator-demo)
and its [live demo](https://theodi.github.io/data-standard-validator-demo/).

Install it from
[npm](https://www.npmjs.com/package/@theodi/data-standard-validator-component):

```bash
npm install @theodi/data-standard-validator-component
```

```ts
import '@theodi/data-standard-validator-component'

document.querySelector('data-standard-validator')!.config = {
  standards: [{ name: 'Person', shapes: 'https://example.org/person.ttl' }],
}
```

Without a bundler, load a release from jsDelivr instead
([details](https://theodi.github.io/data-standard-validator-component/usage/#without-a-bundler)):

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/@theodi/data-standard-validator-component@1.0.0/standalone/data-standard-validator.js"></script>
```

Documentation: **<https://theodi.github.io/data-standard-validator-component/>**

- [Usage](https://theodi.github.io/data-standard-validator-component/usage/)
- [Development](https://theodi.github.io/data-standard-validator-component/development/)
  (including how to release a new version to npm)

## Licence

Licensed under the Apache License 2.0. See the LICENSE file for details.
