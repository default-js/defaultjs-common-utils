/**
 * Entry point registering the package on the global scope as defaultjs.common.utils, next to
 * handing out the same named exports as the main entry.
 */
export { GLOBAL, ObjectUtils, Escaper, ValueHelper, PromiseUtils, PrivateProperty, UUID } from "./src/index.js";
