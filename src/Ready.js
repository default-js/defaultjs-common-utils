/**
 * Ready is {@link module:PromiseUtils.lazyPromise} and only kept as an entry point of its own, so an
 * existing import keeps working. Use lazyPromise directly in new code.
 *
 * Against the implementation Ready had before, resolve and reject now take a value and a reason, an
 * Error handed to resolve rejects, the properties are read only, and settling twice throws.
 *
 * @module Ready
 * @deprecated use {@link module:PromiseUtils.lazyPromise}
 */
import {lazyPromise} from "./PromiseUtils.js";

export default lazyPromise;
