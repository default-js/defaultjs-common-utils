/**
 * One property of an object, addressed by name, together with the object carrying it.
 */
export default class ObjectProperty {
	constructor(key: string, context: object);

	key: string;
	context: object;

	/**
	 * Whether the key is reachable on the context at all. Answers for the whole prototype chain, not
	 * only for own properties.
	 */
	readonly keyDefined: boolean;

	/** Whether something is stored under the key. Only undefined counts as nothing. */
	readonly hasValue: boolean;

	get value(): any;
	set value(data: any);

	/**
	 * Adds a value next to what is already there: writes it when the key holds nothing, turns it into
	 * an array of both when it holds one, and pushes onto the array when it holds one already.
	 */
	set append(data: any);

	/** Deletes the key from the object. Does nothing when it is not there. */
	remove(): void;

	/**
	 * Loads the property a dotted path addresses. Every part of the path is trimmed.
	 *
	 * @param create create a missing step on the way, a step holding null counts as missing
	 * @returns null when a step is missing and create is false
	 * @throws {TypeError} when a step of the path holds something that is no object
	 */
	static load(data: object, key: string, create?: boolean): ObjectProperty | null;
}
