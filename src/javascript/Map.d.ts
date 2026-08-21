/**
 * Adds toObject() to every Map. Importing this module patches the prototype.
 */
declare global {
	interface Map<K, V> {
		/**
		 * Converts the map into a plain object, nested maps along with it. Every key becomes a property
		 * name, so a key that is no string is turned into one the way javascript does it.
		 */
		toObject(): Record<string, any>;
	}
}

export {};
