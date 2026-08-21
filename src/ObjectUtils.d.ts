/**
 * Utilities to inspect, compare, merge and filter javascript objects.
 */

/** Decides whether a single property is taken over by {@link filter}. */
export type PropertyFilter = (name: string, value: any, context: object) => boolean;

/** Checks whether a value is null or undefined. */
export function isNullOrUndefined(object: unknown): boolean;

/** Checks whether a value is a primitive. null and undefined count, a symbol does not. */
export function isPrimitive(object: unknown): boolean;

/** Checks whether a value is an object. Every object counts, null does not. */
export function isObject(object: unknown): boolean;

/**
 * Compares two values by value. Primitives, simple objects, Array, Date, RegExp, Map and Set are
 * compared by value, everything keeping its state out of reach by identity. Cycles are supported.
 */
export function equalPojo(a: unknown, b: unknown): boolean;

/**
 * Checks whether an object is a pure data object, all the way down. The object itself has to be a
 * simple one, so an Array is rejected.
 */
export function isPojo(object: unknown): boolean;

/**
 * Appends a value to a property, turning it into an array as soon as a second one arrives. The key
 * may address a nested property through a dotted path. An undefined value is ignored.
 *
 * @returns the object that was passed in
 */
export function append<T extends object>(aKey: string, aData: unknown, aObject: T): T;

/**
 * Merges objects into a target - a recursive Object.assign. Array, Set, Map, Date and RegExp are
 * replaced as a whole. The target is written into and returned; a falsy one is replaced by a new
 * object.
 */
export function merge<T extends object>(target: T, ...sources: Array<object | null | undefined>): T;
export function merge(target: null | undefined, ...sources: Array<object | null | undefined>): Record<string, any>;

/** Builds a {@link PropertyFilter} accepting or rejecting a fixed list of property names. */
export function buildPropertyFilter(options: { names: string[]; allowed: boolean }): PropertyFilter;

/**
 * Builds a new object holding the properties a filter accepts. The filter is called for every
 * enumerable property, inherited ones included.
 */
export function filter<T = Record<string, any>>(data: object, propFilter: PropertyFilter, options?: { deep?: boolean }): T;

/** Defines a constant, non enumerable property. */
export function defValue(o: object, name: string, value: unknown): void;

/** Defines a read only, non enumerable property backed by a getter. */
export function defGet(o: object, name: string, get: () => any): void;

/** Defines a non enumerable property backed by a getter and a setter. */
export function defGetSet(o: object, name: string, get: () => any, set: (value: any) => void): void;

declare const ObjectUtils: {
	isNullOrUndefined: typeof isNullOrUndefined;
	isObject: typeof isObject;
	isPrimitive: typeof isPrimitive;
	equalPojo: typeof equalPojo;
	isPojo: typeof isPojo;
	append: typeof append;
	merge: typeof merge;
	filter: typeof filter;
	buildPropertyFilter: typeof buildPropertyFilter;
	defValue: typeof defValue;
	defGet: typeof defGet;
	defGetSet: typeof defGetSet;
};

export default ObjectUtils;
