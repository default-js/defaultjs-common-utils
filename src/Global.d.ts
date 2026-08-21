/**
 * The global scope of the current environment - globalThis, then global, window and self. An empty
 * object when none of them exists.
 */
declare const GLOBAL: typeof globalThis;

export default GLOBAL;
