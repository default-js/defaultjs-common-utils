/**
 * Extensions to the built in javascript types.
 *
 * Importing this module patches prototypes - that is what it is for, and it is deliberate. The
 * package imports it from its own entry point, so anything using it gets the extensions without
 * asking for them separately. They are meant to read like part of the language at the call site:
 * "text".hashcode() instead of hashcode("text").
 *
 * Every extension is added only when the type does not already carry that name, so a newer engine
 * or another library defining the same member keeps the upper hand and nothing is overwritten.
 *
 * @module javascript
 */
import "./String.js";
import "./Map.js";