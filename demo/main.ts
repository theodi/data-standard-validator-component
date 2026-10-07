/*
 * The demo page: one standard built from the fixtures in demo/public/, so it
 * works offline and the web test does not depend on any published standard.
 */

import '../src/index.js'
import type { ValidatorConfig } from '../src/index.js'

const fixture = (file: string): string => new URL(`fixtures/${file}`, document.baseURI).href

const config: ValidatorConfig = {
  standards: [{
    name: 'Example person',
    description: 'A person with a name, an optional age and status, and addresses with a short postcode.',
    shapes: fixture('person-shape.ttl'),
    context: fixture('context.jsonld'),
    examples: [fixture('valid.jsonld'), fixture('invalid.jsonld')],
  }],
  patterns: [{ pattern: '^[A-Z]{2}[0-9]$', description: 'a short postcode', example: 'AB1' }],
  placeholder: 'Paste a JSON-LD person here, or load an example.',
  storageKey: false,
}

document.querySelector('data-standard-validator')!.config = config
