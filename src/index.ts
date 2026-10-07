/*
 * <data-standard-validator>: checks JSON and JSON-LD records against SHACL
 * shapes in the browser, configured with a list of standards.
 *
 * Importing this module defines the element. `./config` and `./engine` are
 * separate entry points that need no DOM, for hosts that test their config in Node.
 */

import { DataStandardValidator } from './validator-element.js'

export { DataStandardValidator }
export type { ValidatorConfig, StandardConfig } from './config.js'

if (!customElements.get('data-standard-validator')) {
  customElements.define('data-standard-validator', DataStandardValidator)
}
