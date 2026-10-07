# data-standard-validator Component

`<data-standard-validator-component>`: a [Lit](https://lit.dev) web component that
checks JSON and JSON-LD records against SHACL shapes in the browser, with
plain-English errors that point at the line. It is built on
[@theodi/data-standard-validator](https://github.com/theodi/data-standard-validator).

See the [example project](https://github.com/theodi/data-standard-validator-demo)
and its [live demo](https://theodi.github.io/data-standard-validator-demo/).

```bash
npm install github:theodi/data-standard-validator-component
```

```ts
import '@theodi/data-standard-validator-component'

document.querySelector('data-standard-validator')!.config = {
  standards: [{ name: 'Person', shapes: 'https://example.org/person.ttl' }],
}
```

Documentation: **<https://theodi.github.io/data-standard-validator-component/>**

- [Usage](https://theodi.github.io/data-standard-validator-component/usage/)
- [Development](https://theodi.github.io/data-standard-validator-component/development/)

## Licence

Licensed under the Apache License 2.0. See the LICENSE file for details.
