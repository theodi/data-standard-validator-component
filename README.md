# data-standard-validator-component

`<data-standard-validator>`: a [Lit](https://lit.dev) web component that
checks JSON and JSON-LD records against SHACL shapes in the browser, with
plain-English errors that point at the line. It is built on
[@theodi/data-standard-validator](https://github.com/theodi/data-standard-validator).

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

- [Usage](docs/usage.md)
- [Development](docs/development.md)

## Licence

Licensed under the Apache License 2.0. See the LICENSE file for details.
