/**
 * Replacing characters in a text and taking the replacement back out.
 *
 * @module Escaper
 */

// the one list of characters carrying a meaning inside a regular expression. quote and the map of
// REGEXP_ESCAPER are both derived from it, so a character can never be in one and missing in the
// other.
const REGEXCHARS = ["\\", "?", "*", "+", "|", "[", "]", "{", "}", "(", ")", ".", "^", "$"];

const REGEXQUOTE = new RegExp(`[${REGEXCHARS.map((char) => "\\" + char).join("")}]`, "g");

/**
 * Takes the regex meaning out of a text, so a filter is matched as the literal text it is.
 *
 * @private
 * @param {string} aText
 * @returns {string}
 */
const quote = (aText) => aText.replace(REGEXQUOTE, (char) => "\\" + char);

/**
 * The two directions an entry of a char map can take part in.
 *
 * Meant for the at of a {@link CharMapEntry}. The values are the plain texts "escape" and "unescape",
 * and an at is compared in lower case, so "Escape" and "ESCAPE" name the same direction. Writing the
 * text by hand is therefore fine - MODES is the safer way to spell it, not the only one.
 *
 * Frozen: the values are part of the contract, and a changed one would silently move what a map means.
 *
 * @readonly
 * @enum {string}
 *
 * @example
 * new Escaper([
 *     {char : "&", escaped : "&amp;"},
 *     {char : "&", escaped : "&#38;", at : MODES.unescape},
 * ], true);
 */
export const MODES = Object.freeze({
	/** the entry takes part while escaping */
	escape: "escape".toLowerCase(),
	/** the entry takes part while unescaping */
	unescape: "unescape".toLowerCase()
});

/**
 * Collects everything wrong with one entry of a char map.
 *
 * char has to name something to look for, so an empty one is rejected - it would compile into a
 * regex matching at every position. An empty escaped is allowed: dropping a character is a sensible
 * thing to escape to, it just cannot be undone, so such an entry only takes part in escaping.
 *
 * at is read in lower case, so only a direction that is not one of the two at all is a problem.
 *
 * @private
 * @param {*} item
 * @param {number} index position in the char map, to point at the entry in the message
 * @returns {Array<string>} one text per problem, empty when the entry is fine
 */
const problemsOfEntry = (item, index) => {
	if (item === null || typeof item !== "object") return [`entry ${index} is no object`];

	const problems = [];
	if (typeof item.char !== "string") problems.push(`entry ${index}: char has to be a string`);
	else if (item.char.length === 0) problems.push(`entry ${index}: char must not be empty`);

	if (typeof item.escaped !== "string") problems.push(`entry ${index}: escaped has to be a string`);
	
	// no at at all is the normal case - only look closer once there is one, otherwise the lower casing
	// below would run against undefined
	if (typeof item.at !== "undefined") {
		if (typeof item.at !== "string") problems.push(`entry ${index}: at has to be a string or undefined`);
		else if (item.at.toLowerCase() !== MODES.escape && item.at.toLowerCase() !== MODES.unescape)
			problems.push(`entry ${index}: at has to be "${MODES.escape}" or "${MODES.unescape}", not ${JSON.stringify(item.at)}`);
	}

	return problems;
};

/**
 * Checks a whole char map and reports every problem at once - fixing a map one thrown error at a
 * time is no fun.
 *
 * @private
 * @param {*} aCharMap
 * @returns {void}
 * @throws {TypeError} when the map is no array or any of its entries is unusable
 */
const validateCharMap = (aCharMap) => {
	if (!Array.isArray(aCharMap)) throw new TypeError(`Escaper: the char map has to be an array, not ${aCharMap === null ? "null" : typeof aCharMap}`);

	const problems = aCharMap.flatMap(problemsOfEntry);
	if (problems.length > 0) throw new TypeError(`Escaper: unusable char map\n\t${problems.join("\n\t")}`);
};

/**
 * Builds the list of replacements for one direction. An entry takes part in a direction when it
 * carries no at at all or names that direction, and when the text it has to look for in that
 * direction is not empty - there is nothing to search for otherwise.
 *
 * The order of the map is kept: it decides which entry wins where two of them can match at the same
 * position.
 *
 * @private
 * @param {Array<CharMapEntry>} aCharMap
 * @param {MODES} mode the direction to build for
 * @returns {Array} entries of {filter, value}, filter being the literal text to look for
 */
const buildMappingList = (aCharMap, mode) => {
	const from = mode == MODES.escape ? "char" : "escaped";
	const to = mode == MODES.escape ? "escaped" : "char";

	return aCharMap
		.filter((item) => !item.at || item.at.toLowerCase() == mode)
		.filter((item) => item[from].length > 0)
		.map((item) => {
			return { filter: item[from], value: item[to] };
		});
};

/**
 * Compiles one regex covering every filter of a direction, so a text can be walked in a single pass.
 *
 * Every filter becomes a capture group of its own. Which group took part in a match tells which
 * replacement belongs to it - that only works because quote escapes ( and ), so a filter can never
 * bring a group of its own and shift the numbering.
 *
 * @private
 * @param {Array} theFilters
 * @param {boolean} isCaseSensitive
 * @returns {RegExp|null} null when there is nothing to look for
 */
const buildMatcher = (theFilters, isCaseSensitive) => {
	// an empty alternation would compile into a regex matching at every position
	if (theFilters.length === 0) return null;

	const source = theFilters.map((item) => `(${quote(item.filter)})`).join("|");

	// no m flag - the filters are quoted literals, ^ and $ never reach the regex as anchors
	return new RegExp(source, isCaseSensitive ? "g" : "gi");
};

/**
 * Replaces every filter of a direction in one pass over the text.
 *
 * One pass is what keeps the rules apart: whatever a replacement inserts is behind the position the
 * walk continues at, so no other rule can ever see it. The replacement comes from a callback, whose
 * return value String.replace takes literally - a value carrying $&, $` or $1 is inserted as written.
 *
 * @private
 * @param {string} aText
 * @param {Array} theFilters
 * @param {RegExp|null} aMatcher
 * @returns {string}
 */
const mapping = (aText, theFilters, aMatcher) => {
	if (aMatcher === null) return aText;

	return aText.replace(aMatcher, (...args) => {
		// the whole match comes first, then one entry per group, then offset and text - exactly one
		// of the groups took part
		const groups = args.slice(1, 1 + theFilters.length);
		return theFilters[groups.findIndex((group) => typeof group !== "undefined")].value;
	});
};

/**
 * One entry of a char map.
 *
 * @typedef {object} CharMapEntry
 * @property {string} char the text to look for while escaping, must not be empty
 * @property {string} escaped what it is replaced with. An empty one drops the text, which cannot be
 *   undone - such an entry takes part in escaping only.
 * @property {MODES} [at] limits the entry to one direction, {@link MODES}.escape or
 *   {@link MODES}.unescape. Compared in lower case, so the spelling of the direction does not matter.
 *   Taking part in both is the default. Anything else is rejected.
 */

/**
 * Replaces texts by a char map and takes the replacement back out.
 *
 * Both directions walk the text once, so a replacement is never touched again by another entry. Where
 * two entries can match at the same place, the one written first in the map wins.
 *
 * char and escaped are texts, not single characters - an entry may look for "aa" and replace it with
 * "xyz". A character carrying a meaning in a regular expression is matched literally.
 *
 * An entry may name a direction through the at of its {@link CharMapEntry}, see {@link MODES}.
 *
 * @example
 * const escaper = new Escaper([
 *     {char : "\\", escaped : "\\\\"},
 *     {char : "\"", escaped : "\\\""},
 * ], true);
 *
 * escaper.escape(`say "hi"`);      // 'say \\"hi\\"'
 * escaper.unescape('say \\"hi\\"');   // 'say "hi"'
 */
class Escaper {

	/**
	 * The replacements of the escape direction, in the order of the char map.
	 *
	 * @private
	 * @type {Array<{filter : string, value : string}>}
	 */
	#escapeMap = null;

	/**
	 * The replacements of the unescape direction. Shorter than the escape one whenever an entry names
	 * a direction or drops its text.
	 *
	 * @private
	 * @type {Array<{filter : string, value : string}>}
	 */
	#unescapeMap = null;

	/**
	 * The compiled regex covering every filter of the escape direction, null when there is nothing to
	 * look for. Its capture groups line up with #escapeMap.
	 *
	 * @private
	 * @type {RegExp|null}
	 */
	#escapeMatcher = null;

	/**
	 * The same for the unescape direction, lined up with #unescapeMap.
	 *
	 * @private
	 * @type {RegExp|null}
	 */
	#unescapeMatcher = null;

	/**
	 * @param {Array<CharMapEntry>} escapeMap
	 * @param {boolean} [isCaseSensitive=false] leaving it out gives a case insensitive escaper, which
	 *   also matches the other case of a char and therefore does not carry the case through a
	 *   roundtrip
	 * @throws {TypeError} when the map is no array or any of its entries is unusable. Every problem of
	 *   the map is reported at once.
	 */
	constructor(escapeMap, isCaseSensitive) {
		validateCharMap(escapeMap);
		this.#escapeMap = buildMappingList(escapeMap, MODES.escape);
		this.#unescapeMap = buildMappingList(escapeMap, MODES.unescape);
		this.#escapeMatcher = buildMatcher(this.#escapeMap, isCaseSensitive);
		this.#unescapeMatcher = buildMatcher(this.#unescapeMap, isCaseSensitive);
	}

	/**
	 * Replaces every char of the map with its escaped text.
	 *
	 * @param {string} aText
	 * @returns {string}
	 * @throws {TypeError} when the argument is no string
	 */
	escape(aText) {
		if (typeof aText !== "string") throw new TypeError("Expected a string");
		return mapping(aText, this.#escapeMap, this.#escapeMatcher);
	}

	/**
	 * Replaces every escaped text of the map with its char.
	 *
	 * @param {string} aText
	 * @returns {string}
	 * @throws {TypeError} when the argument is no string
	 */
	unescape(aText) {
		if (typeof aText !== "string") throw new TypeError("Expected a string");
		return mapping(aText, this.#unescapeMap, this.#unescapeMatcher);
	}

	/**
	 * The escaper for regular expressions, see {@link REGEXP_ESCAPER}.
	 *
	 * @returns {Escaper} always the same instance
	 */
	static REGEXP_ESCAPER() {
		return REGEXP_ESCAPER;
	}
}

/**
 * Escaper taking the meaning out of every character a regular expression reads specially, so a text
 * can be put into a pattern and matched literally.
 *
 * @type {Escaper}
 *
 * @example
 * const pattern = new RegExp(`^${REGEXP_ESCAPER.escape("a+b")}$`);
 * pattern.test("a+b");   // true
 * pattern.test("aab");   // false
 */
// has to come after the class - the singleton is built while the module is evaluated, and a class
// stays in its temporal dead zone until its declaration has run
export const REGEXP_ESCAPER = new Escaper(
	REGEXCHARS.map((char) => {
		return { char, escaped: "\\" + char };
	}),
);

export default Escaper;
