/**
 * Private state for an object, held outside of it in a WeakMap.
 */

/** The store belonging to an object. Created on the first call, the same one from then on. */
export function privateStore(obj: object): Record<string, any>;

/**
 * Reads or writes private state, depending on how many arguments it is called with. Passing
 * undefined as the value still counts as a write.
 *
 * @throws {Error} when called with more than three arguments
 */
export function privateProperty(obj: object): Record<string, any>;
export function privateProperty(obj: object, name: string): any;
export function privateProperty(obj: object, name: string, value: any): void;

/** Builds a function reading and writing one fixed property. */
export function privatePropertyAccessor(varname: string): {
	(self: object): any;
	(self: object, value: any): void;
};

declare const PrivateProperty: {
	privateProperty: typeof privateProperty;
	privatePropertyAccessor: typeof privatePropertyAccessor;
	privateStore: typeof privateStore;
};

export default PrivateProperty;
