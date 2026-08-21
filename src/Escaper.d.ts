/**
 * Replacing characters in a text and taking the replacement back out.
 */

/** The two directions an entry of a char map can take part in. */
export const MODES: Readonly<{
	escape: "escape";
	unescape: "unescape";
}>;

/** One of the two directions. An at is compared in lower case, so any spelling of these works. */
export type Mode = (typeof MODES)[keyof typeof MODES];

/** One entry of a char map. */
export interface CharMapEntry {
	/** the text to look for while escaping, must not be empty */
	char: string;
	/** what it is replaced with. An empty one drops the text and takes part in escaping only. */
	escaped: string;
	/** limits the entry to one direction. Compared in lower case. Taking part in both is the default. */
	at?: Mode | string;
}

/**
 * Replaces texts by a char map and takes the replacement back out.
 *
 * Both directions walk the text once, so a replacement is never touched again by another entry.
 * Where two entries can match at the same place, the one written first in the map wins.
 */
export default class Escaper {
	/**
	 * @param escapeMap the entries to replace by
	 * @param isCaseSensitive leaving it out gives a case insensitive escaper
	 * @throws {TypeError} when the map is no array or any of its entries is unusable. Every problem of
	 *   the map is reported at once.
	 */
	constructor(escapeMap: CharMapEntry[], isCaseSensitive?: boolean);

	/**
	 * Replaces every char of the map with its escaped text.
	 *
	 * @throws {TypeError} when the argument is no string
	 */
	escape(aText: string): string;

	/**
	 * Replaces every escaped text of the map with its char.
	 *
	 * @throws {TypeError} when the argument is no string
	 */
	unescape(aText: string): string;

	/** The escaper for regular expressions - always the same instance. */
	static REGEXP_ESCAPER(): Escaper;
}

/**
 * Escaper taking the meaning out of every character a regular expression reads specially, so a text
 * can be put into a pattern and matched literally.
 */
export const REGEXP_ESCAPER: Escaper;
