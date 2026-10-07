# Data Standard Validator Component

`<data-standard-validator>` is a [Lit](https://lit.dev) web component for
checking JSON and JSON-LD records against SHACL shapes in the browser. The
person using it picks a standard, pastes a record or loads an example, and
gets a plain-English list of what needs fixing. Each issue links to the line
it is about.

Validation is done by
[@theodi/data-standard-validator](https://theodi.github.io/data-standard-validator/)
in a Web Worker. Records never leave the browser; only the shape and context
files are downloaded.

The element knows nothing about any particular standard. You give it a
config that lists the standards: their shapes, their context and some
example records.

```html
<data-standard-validator></data-standard-validator>
<script type="module">
  import '@theodi/data-standard-validator-component'

  document.querySelector('data-standard-validator').config = {
    standards: [{
      name: 'Person',
      shapes: 'https://github.com/example/standard/blob/main/person/shape.ttl',
      context: 'https://github.com/example/standard/blob/main/person/context.jsonld',
    }],
  }
</script>
```

- [Usage](usage.md): install it, configure it, theme it.
- [Development](development.md): run the demo and the tests.

See the [demo and example use](https://theodi.github.io/data-standard-validator-demo/).
