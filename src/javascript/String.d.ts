/**
 * Adds hashcode() to every string. Importing this module patches the prototype.
 */
declare global {
	interface String {
		/**
		 * The hash java uses for its strings, kept inside 32 signed bits. Meant for bucketing and for
		 * telling texts apart cheaply - two different texts can share a hash.
		 */
		hashcode(): number;
	}
}

export {};
