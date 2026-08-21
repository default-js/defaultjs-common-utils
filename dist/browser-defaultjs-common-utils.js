/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/Escaper.js":
/*!************************!*\
  !*** ./src/Escaper.js ***!
  \************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   MODES: () => (/* binding */ MODES),
/* harmony export */   REGEXP_ESCAPER: () => (/* binding */ REGEXP_ESCAPER),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
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
const MODES = Object.freeze({
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
const REGEXP_ESCAPER = new Escaper(
	REGEXCHARS.map((char) => {
		return { char, escaped: "\\" + char };
	}),
);

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Escaper);


/***/ }),

/***/ "./src/Global.js":
/*!***********************!*\
  !*** ./src/Global.js ***!
  \***********************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/**
 * The global scope of the current environment.
 *
 * Resolved once when the module is loaded: globalThis, then global, window and self for engines not
 * knowing it yet. An empty object when none of them exists, so reading from it never throws.
 *
 * @module Global
 *
 * @example
 * GLOBAL.crypto.getRandomValues(buffer);
 */
const GLOBAL = (() => {
	if(typeof globalThis !== "undefined") return globalThis;
	if(typeof global !== "undefined") return global;
	if(typeof window !== "undefined") return window;
	if(typeof self !== "undefined") return self;
	return {};
})();

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (GLOBAL);


/***/ }),

/***/ "./src/ObjectProperty.js":
/*!*******************************!*\
  !*** ./src/ObjectProperty.js ***!
  \*******************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ ObjectProperty)
/* harmony export */ });
/**
 * Only an object can carry a property, so a path stops at a primitive instead of handing out a
 * property that cannot be read or written. An Array, Map or Date passes - they are objects and take
 * a property like any other one, which is what makes a path like "list.0" work.
 *
 * @private
 * @param {*} value the value a step of the path resolved to
 * @param {string} name the name of that step
 * @param {string} key the whole path, to tell which one of several steps failed
 * @returns {void}
 * @throws {TypeError} when the step carries no object
 */
const assertDescendable = (value, name, key) => {
	if(value !== null && typeof value === "object")
		return;

	const type = value === null ? "null" : `a ${typeof value}`;
	throw new TypeError(`cannot descend into "${name}" of path "${key}" - ${type} is no object`);
};

/**
 * One property of an object, addressed by name, together with the object carrying it.
 *
 * Built through {@link ObjectProperty.load}, which walks a dotted path and hands back the property at
 * its end.
 *
 * @example
 * const property = ObjectProperty.load({a : {b : 1}}, "a.b");
 * property.value;      // 1
 * property.value = 2;  // writes into the object
 */
class ObjectProperty {
	/**
	 * @param {string} key name of the property
	 * @param {object} context the object carrying it
	 */
	constructor(key, context){
		this.key = key;
		this.context = context;
	}

	/**
	 * Whether the key is reachable on the context at all.
	 *
	 * This answers for the whole prototype chain, not only for own properties - load({}, "toString")
	 * reports true. That is deliberate: a path may address a prototype and extend it, so an inherited
	 * key is a key like any other here. Use hasValue to ask whether something is actually stored.
	 *
	 * @returns {boolean}
	 */
	get keyDefined(){
		return this.key in this.context;
	}
	
	/**
	 * Whether something is stored under the key. Only undefined counts as nothing - 0, "", false and
	 * null are values.
	 *
	 * @returns {boolean}
	 */
	get hasValue(){
		return typeof this.context[this.key] !== "undefined";
	}

	/**
	 * @returns {*} the stored value, undefined when there is none
	 */
	get value(){
		return this.context[this.key];
	}

	/**
	 * @param {*} data
	 */
	set value(data){
		this.context[this.key] = data;
	}

	/**
	 * Adds a value next to what is already there: writes it when the key holds nothing, turns the
	 * value into an array of both when it holds one, and pushes onto the array when it holds one
	 * already.
	 *
	 * The value itself is not looked at - appending undefined puts undefined into the array.
	 *
	 * @param {*} data
	 *
	 * @example
	 * property.append = 1;   // {key : 1}
	 * property.append = 2;   // {key : [1, 2]}
	 * property.append = 3;   // {key : [1, 2, 3]}
	 */
	set append(data) {
		if(!this.hasValue)
			this.value = data;
		else {
			const value = this.value;
			if(value instanceof Array)
				value.push(data);
			else
				this.value = [this.value, data];
		}
	}

	/**
	 * Deletes the key from the object. Does nothing when it is not there.
	 *
	 * @returns {void}
	 */
	remove(){
		delete this.context[this.key];
	}
	
	/**
	 * Loads the property a dotted path addresses. Every part of the path is trimmed, so " a . b "
	 * addresses the same property as "a.b".
	 *
	 * A missing step is created with create, otherwise the path is reported as not loadable. A step
	 * holding something that is no object cannot be walked into at all - that is a broken path, not a
	 * missing one, and it is reported as an error regardless of create.
	 *
	 * @param {object} data the object to walk
	 * @param {string} key name of the property, a dotted path addresses a nested one
	 * @param {boolean} [create=true] create a missing step on the way
	 * @returns {ObjectProperty|null} null when a step is missing and create is false
	 * @throws {TypeError} when a step of the path holds something that is no object
	 *
	 * @example
	 * ObjectProperty.load({a : {b : 1}}, "a.b").value;   // 1
	 * ObjectProperty.load({list : [1, 2]}, "list.1").value;   // 2, an array is an object
	 * ObjectProperty.load({}, "a.b", false);             // null
	 * ObjectProperty.load({a : 0}, "a.b");               // throws, 0 is no object
	 */
	static load(data, key, create=true) {
		let context = data;
		const keys = key.split(".");
		let name = keys.shift().trim();
		while(keys.length > 0){
			if(typeof context[name] === "undefined" || context[name] === null){
				if(!create)
					return null;

				context[name] = {}
			}

			assertDescendable(context[name], name, key);
			context = context[name];
			name = keys.shift().trim();
		}

		return new ObjectProperty(name, context);
	}
};

/***/ }),

/***/ "./src/ObjectUtils.js":
/*!****************************!*\
  !*** ./src/ObjectUtils.js ***!
  \****************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   append: () => (/* binding */ append),
/* harmony export */   buildPropertyFilter: () => (/* binding */ buildPropertyFilter),
/* harmony export */   defGet: () => (/* binding */ defGet),
/* harmony export */   defGetSet: () => (/* binding */ defGetSet),
/* harmony export */   defValue: () => (/* binding */ defValue),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   equalPojo: () => (/* binding */ equalPojo),
/* harmony export */   filter: () => (/* binding */ filter),
/* harmony export */   isNullOrUndefined: () => (/* binding */ isNullOrUndefined),
/* harmony export */   isObject: () => (/* binding */ isObject),
/* harmony export */   isPojo: () => (/* binding */ isPojo),
/* harmony export */   isPrimitive: () => (/* binding */ isPrimitive),
/* harmony export */   merge: () => (/* binding */ merge)
/* harmony export */ });
/* harmony import */ var _ObjectProperty_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./ObjectProperty.js */ "./src/ObjectProperty.js");
/**
 * Utilities to inspect, compare, merge and filter javascript objects.
 *
 * Several functions share one notion of data: primitives, simple objects, Array, Date, RegExp, Map
 * and Set. {@link isPojo} decides whether a value stays within it, {@link equalPojo} compares those
 * types by value, and {@link merge} treats everything outside of it as a value to be replaced.
 *
 * @module ObjectUtils
 */


/**
 * @private
 * @param {Array} a
 * @param {Array} b
 * @param {WeakMap} seen pairs currently under comparison
 * @returns {boolean}
 */
const equalArray = (a, b, seen) => {
	if (a.length !== b.length) return false;

	const length = a.length;
	for (let i = 0; i < length; i++) if (!internalEqualPojo(a[i], b[i], seen)) return false;

	return true;
};

/**
 * A set is unordered, so every entry of a has to find its own partner in b.
 *
 * @private
 * @param {Set} a
 * @param {Set} b
 * @param {WeakMap} seen pairs currently under comparison
 * @returns {boolean}
 */
const equalSet = (a, b, seen) => {
	if (a.size !== b.size) return false;

	const remaining = Array.from(b);
	for (const entryA of a) {
		const index = remaining.findIndex((entryB) => internalEqualPojo(entryA, entryB, seen));
		if (index < 0) return false;

		remaining.splice(index, 1);
	}

	return true;
};

/**
 * A map is unordered as well and its keys may be objects, so the keys get compared by value too.
 *
 * @private
 * @param {Map} a
 * @param {Map} b
 * @param {WeakMap} seen pairs currently under comparison
 * @returns {boolean}
 */
const equalMap = (a, b, seen) => {
	if (a.size !== b.size) return false;

	const remaining = Array.from(b);
	for (const [keyA, valueA] of a) {
		const index = remaining.findIndex(([keyB, valueB]) => internalEqualPojo(keyA, keyB, seen) && internalEqualPojo(valueA, valueB, seen));
		if (index < 0) return false;

		remaining.splice(index, 1);
	}

	return true;
};

/**
 * Compares two objects by prototype and by their own enumerable properties.
 *
 * @private
 * @param {object} a
 * @param {object} b
 * @param {WeakMap} seen pairs currently under comparison
 * @returns {boolean}
 */
const equalObject = (a, b, seen) => {
	if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;

	const propertiesA = Object.keys(a);
	const propertiesB = Object.keys(b);
	if (propertiesA.length !== propertiesB.length) return false;

	for (const key of propertiesA) {
		// equal key counts alone would let {x:1, y:undefined} pass against {x:1, z:undefined}
		if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
		if (!internalEqualPojo(a[key], b[key], seen)) return false;
	}

	return true;
};

/**
 * A cyclic structure can only be decided co-inductively: a pair already under comparison counts as
 * equal, otherwise the walk would never come back.
 *
 * @private
 * @param {WeakMap} seen pairs currently under comparison
 * @param {object} a
 * @param {object} b
 * @returns {boolean} true when this pair is already being compared further up the stack
 */
const isComparing = (seen, a, b) => {
	const partners = seen.get(a);
	return !!partners && partners.has(b);
};

/**
 * Notes a pair as being compared, so a cycle running through it terminates.
 *
 * @private
 * @param {WeakMap} seen pairs currently under comparison
 * @param {object} a
 * @param {object} b
 * @returns {void}
 */
const rememberComparing = (seen, a, b) => {
	const partners = seen.get(a);
	if (partners) partners.add(b);
	else seen.set(a, new WeakSet([b]));
};

/**
 * Checks whether a value is null or undefined.
 *
 * ValueHelper.noValue answers the same question. Both are kept on purpose, so ValueHelper stays free
 * of a dependency on this module - see the note there.
 *
 * @param {*} object the value to be testing
 * @returns {boolean}
 */
const isNullOrUndefined = (object) => {
	return object == null || typeof object === "undefined";
};

/**
 * Checks whether a value is a primitive.
 *
 * null and undefined count as primitives. A symbol does not - it is treated as an opaque value
 * throughout this module, so that {@link isPojo} keeps rejecting it as data.
 *
 * @param {*} object the value to be testing
 * @returns {boolean}
 */
const isPrimitive = (object) => {
	if (object == null) return true;

	const type = typeof object;
	switch (type) {
		case "number":
		case "bigint":
		case "boolean":
		case "string":
		case "undefined":
			return true;
	}

	return false;
};

/**
 * Checks whether a value is an object.
 *
 * Every object counts, Array, Map, Date and class instances included. Use {@link isPojo} to ask for
 * a simple data object instead.
 *
 * @param {*} object the value to be testing
 * @returns {boolean}
 */
const isObject = (object) => {
	if (isNullOrUndefined(object)) return false;

	return typeof object === "object";
};

/**
 * Compares two values by value.
 *
 * The types compared by value are the ones {@link isPojo} accepts as data: primitives, simple
 * objects, Array, Date, RegExp, Map and Set. A Date is compared by its time, a RegExp by source and
 * flags. Set and Map are unordered, so their entries are matched by value instead of by position,
 * and the keys of a Map take part in that comparison.
 *
 * Simple objects and class instances need the same prototype and the same own enumerable
 * properties. Every other object - Error, Promise, WeakMap and the like - keeps its state out of
 * reach, so those compare by identity only. Functions and symbols do as well.
 *
 * Cyclic structures are supported.
 *
 * @param {*} a
 * @param {*} b
 * @returns {boolean}
 *
 * @example
 * equalPojo({a : [1, 2]}, {a : [1, 2]});               // true
 * equalPojo(new Set([1, 2]), new Set([2, 1]));         // true, a set is unordered
 * equalPojo(new Date(0), new Date(1));                 // false
 * equalPojo(new Error("x"), new Error("x"));           // false, compared by identity
 */
const equalPojo = (a, b) => internalEqualPojo(a, b, new WeakMap());


/**
* @param {*} a
 * @param {*} b
 * @param {WeakMap} seen internal, tracks the pairs currently under comparison
 * @returns {boolean}
 */
const internalEqualPojo = (a, b, seen) => {
	if (isNullOrUndefined(a) || isNullOrUndefined(b)) return a === b;
	if (a === b) return true;
	if (isPrimitive(a) || isPrimitive(b)) return a === b;

	const typeA = typeof a;
	if (typeA !== typeof b) return false;
	if (typeA !== "object") return a === b; // function and symbol

	if (isComparing(seen, a, b)) return true;
	rememberComparing(seen, a, b);

	if(a instanceof Date) return  b instanceof Date ? Object.is(a.getTime(), b.getTime()) : false;
	else if(a instanceof RegExp) return b instanceof RegExp ? (a.source === b.source && a.flags === b.flags) : false;
	else if(a instanceof Array) return b instanceof Array ? equalArray(a, b, seen) : false;
	else if(a instanceof Set) return b instanceof Set ? equalSet(a, b, seen) : false;
	else if(a instanceof Map) return b instanceof Map ? equalMap(a, b, seen) : false;
	else if (Object.prototype.toString.call(a) !== "[object Object]") return false;	
	else return equalObject(a, b, seen);
};

/**
 * A plain object owns either no prototype at all or a prototype that itself has none. Checking the
 * chain length instead of comparing against Object.prototype keeps this working across realms,
 * where an iframe brings its own Object.prototype.
 *
 * @private
 * @param {*} object
 * @returns {boolean}
 */
const isPlainObject = (object) => {
	if (object === null || typeof object !== "object") return false;
	const prototype = Object.getPrototypeOf(object);
	return prototype === null || Object.getPrototypeOf(prototype) === null;
};

/**
 * Walks a value and decides whether everything reachable from it is data.
 *
 * @private
 * @param {*} value
 * @param {WeakSet} [seen] values already walked, closes cycles
 * @returns {boolean}
 */
const isDataValue = (value, seen = new WeakSet()) => {
	if (isPrimitive(value)) return true;
	else if (value instanceof Date) return true;
	else if (value instanceof RegExp) return true;

	if (seen.has(value)) return true;
	seen.add(value);

	if (value instanceof Array) return value.every((entry) => isDataValue(entry, seen));
	else if (value instanceof Map) {
		for (const [key, entry] of value) {
			if (!isDataValue(key, seen) || !isDataValue(entry, seen)) return false;
		}
		return true;
	} else if (value instanceof Set) {
		for (const entry of value) {
			if (!isDataValue(entry, seen)) return false;
		}
		return true;
	} else if (!isPlainObject(value))
		return false; // class instances and every other exotic object
	else {
		for (const key of Object.keys(value)) {
			if (!isDataValue(value[key], seen)) return false;
		}

		return true;
	}
};

/**
 * Checks whether an object is a pure data object.
 *
 * The object itself has to be a simple object - no Array, Map or something else. Every value
 * reachable from it has to be data as well: primitives, simple objects, Array, Date, RegExp, Map or
 * Set. Functions and class instances are rejected at any depth, including inside arrays and inside
 * the keys and values of a Map or Set.
 *
 * Only own enumerable properties are inspected. Cyclic references are allowed.
 *
 * @param {*} object the object to be testing
 * @returns {boolean}
 *
 * @example
 * isPojo({a : {b : [1, new Date()]}});   // true
 * isPojo({a : () => {}});                // false, a function is no data
 * isPojo({a : [{b : new Foo()}]});       // false, rejected at any depth
 * isPojo([]);                            // false, the object itself has to be a simple one
 */
const isPojo = (object) => {
	if (isNullOrUndefined(object) || !isPlainObject(object)) return false;

	return isDataValue(object);
};

/**
 * Appends a property value to an object. If the property already holds a value, it is converted
 * into an array carrying both. An undefined value is ignored.
 *
 * The key may address a nested property by a dotted path, missing steps are created on the way.
 *
 * @param {string} aKey name of the property, a dotted path addresses a nested one
 * @param {*} aData property value
 * @param {object} aObject the object to append the property to
 * @returns {object} the changed object
 *
 * @example
 * append("a", 1, {});             // {a : 1}
 * append("a", 2, {a : 1});        // {a : [1, 2]}
 * append("a.b", 1, {});           // {a : {b : 1}}
 */
const append = (aKey, aData, aObject) => {
	if (typeof aData !== "undefined") {
		const property = _ObjectProperty_js__WEBPACK_IMPORTED_MODULE_0__["default"].load(aObject, aKey, true);
		property.append = aData;
	}
	return aObject;
};

/**
 * Own enumerable keys, strings and symbols alike - the same set Object.assign copies.
 *
 * @private
 * @param {*} source
 * @returns {Array<string|symbol>}
 */
const assignableKeys = (source) => {
	const object = Object(source);
	return Reflect.ownKeys(object).filter((key) => Object.prototype.propertyIsEnumerable.call(object, key));
};

/**
 * Merges objects into a target object - a recursive Object.assign. It steps into objects and sub
 * objects. Every other value is replaced by the value from the source object.
 *
 * Like Object.assign it copies own enumerable properties - string and symbol keys alike -, ignores
 * null and undefined sources and returns the target. Unlike Object.assign it steps into a property
 * when target and source both hold an object, instead of replacing it.
 *
 * A class instance counts as an object here and is merged property by property just like a simple
 * one. The target keeps its own prototype, only the properties of the source are applied to it - a
 * merge never turns the target into an instance of the class of the source.
 *
 * An Array, Set, Map, Date or RegExp is always replaced as a whole, never merged entry by entry.
 * That already applies when only one of both sides holds one. The result therefore carries the
 * container of the source with its own length - nothing of the target survives it, not even an
 * object sitting at the same index or under the same key.
 *
 * A key whose value is a symbol is skipped, on the target side as well as on the source side. A
 * symbol carries no data, so such a property is left untouched.
 *
 * The key __proto__ is skipped. Object.assign would only repoint the prototype of the target, but
 * merging into it would walk into Object.prototype and leak into every object.
 *
 * The target is modified in place. A sub object of a source that has no counterpart in the target is
 * taken over by reference, just like Object.assign does.
 *
 * @param {object} target the target object to merge into, a new object when falsy
 * @param {...object} sources the source objects, applied in order
 * @returns {object} the target object
 *
 * @example
 * merge({a : 1}, {b : 2});                          // {a : 1, b : 2}
 * merge({a : {x : 1}}, {a : {y : 2}});              // {a : {x : 1, y : 2}}
 * merge({a : [1, 2, 3]}, {a : [9]});                // {a : [9]}, replaced as a whole
 * merge({a : new Foo(1)}, {a : new Bar(2)});        // a stays a Foo, carrying the properties of both
 * merge({}, source1, source2, source3);
 */
const merge = (target, ...sources) => {
	if (!target) target = {};

	sources
		.filter((source) => !isNullOrUndefined(source))
		.forEach((source) => {
			const keys = assignableKeys(source);
			keys
				.filter((key) => key != "__proto__")
				.filter((key) => typeof target[key] !== "symbol")
				.filter((key) => typeof source[key] !== "symbol")
				.forEach((key) => {
					const value = source[key];
					const current = target[key];

					if(current == null ) target[key] = value;
					else if( typeof current !== typeof value ) target[key] = value;
					else if (current instanceof Array || value instanceof Array) target[key] = value;
					else if (current instanceof Set || value instanceof Set) target[key] = value;
					else if (current instanceof Map || value instanceof Map) target[key] = value;
					else if (current instanceof Date || value instanceof Date) target[key] = value;
					else if (current instanceof RegExp || value instanceof RegExp) target[key] = value;
					else if (isObject(current) && isObject(value)) merge(current, value);
					else target[key] = value;
				});
		});

	return target;
};

/**
 * Decides whether a single property is taken over by {@link filter}.
 *
 * @callback PropertyFilter
 * @param {string} name name of the property
 * @param {*} value value of the property
 * @param {object} context the object the property belongs to
 * @returns {boolean} true to keep the property
 */

/**
 * Builds a {@link PropertyFilter} accepting or rejecting a fixed list of property names.
 *
 * @param {object} options
 * @param {Array<string>} options.names the property names to decide on
 * @param {boolean} options.allowed true turns the list into an allow list, false into a deny list
 * @returns {PropertyFilter}
 *
 * @example
 * const deny = buildPropertyFilter({names : ["password"], allowed : false});
 * filter(user, deny);   // every property but password
 */
const buildPropertyFilter = ({ names, allowed }) => {
	return (name, value, context) => {
		return names.includes(name) === allowed;
	};
};

/**
 * Rebuilds an Array, Set or Map with its values filtered. A container keeps all of its entries -
 * only the values inside get filtered. The keys of a Map stay untouched, replacing them would break
 * every lookup against the result.
 *
 * @private
 * @param {Array|Set|Map} value
 * @param {PropertyFilter} propFilter
 * @param {boolean} deep
 * @param {WeakMap} copies maps an original onto its filtered copy
 * @returns {Array|Set|Map}
 */
const filterContainer = (value, propFilter, deep, copies) => {
	if (value instanceof Array) {
		const copy = [];
		copies.set(value, copy);
		for (const entry of value) copy.push(filterValue(entry, propFilter, deep, copies));

		return copy;
	}

	if (value instanceof Set) {
		const copy = new Set();
		copies.set(value, copy);
		for (const entry of value) copy.add(filterValue(entry, propFilter, deep, copies));

		return copy;
	}

	const copy = new Map();
	copies.set(value, copy);
	for (const [key, entry] of value) copy.set(key, filterValue(entry, propFilter, deep, copies));

	return copy;
};

/**
 * Filters a single value, dispatching on what it is.
 *
 * @private
 * @param {*} value
 * @param {PropertyFilter} propFilter
 * @param {boolean} deep
 * @param {WeakMap} copies maps an original onto its filtered copy
 * @returns {*} the filtered value, or the value itself when there is nothing to filter
 */
const filterValue = (value, propFilter, deep, copies) => {
	if (value === null || typeof value !== "object") return value;
	if (value instanceof Date || value instanceof RegExp) return value; // carry no properties to filter

	// a value seen before closes a cycle - its copy stands in, so nothing unfiltered leaks back in
	if (copies.has(value)) return copies.get(value);

	if (value instanceof Array || value instanceof Set || value instanceof Map) return filterContainer(value, propFilter, deep, copies);

	return filterObject(value, propFilter, deep, copies);
};

/**
 * Builds the filtered copy of an object. The copy is registered before it is filled, so a cycle
 * running back into it resolves to the copy instead of the original.
 *
 * @private
 * @param {object} data
 * @param {PropertyFilter} propFilter
 * @param {boolean} deep
 * @param {WeakMap} copies maps an original onto its filtered copy
 * @returns {object}
 */
const filterObject = (data, propFilter, deep, copies) => {
	const result = {};
	copies.set(data, result);

	for (const name in data) {
		const value = data[name];
		if (propFilter(name, value, data)){
			result[name] = deep ? filterValue(value, propFilter, deep, copies) : value;
		}
	}

	return result;
};

/**
 * Builds a new object holding the properties a filter accepts.
 *
 * The filter is called for every enumerable property, inherited ones included - filtering a window
 * relies on that, since most of its members sit on the prototype.
 *
 * With deep the filter is applied to sub objects as well. Array, Set and Map are rebuilt with their
 * values filtered, keeping all of their entries and, for a Map, its keys. Date and RegExp are taken
 * over as they are. A cyclic reference resolves to the filtered copy, so the result never carries a
 * reference into the untouched original.
 *
 * Without deep the accepted values are taken over as they are, sub objects by reference.
 *
 * @param {object} data the object to be filtered
 * @param {PropertyFilter} propFilter decides per property, see {@link buildPropertyFilter}
 * @param {object} [options]
 * @param {boolean} [options.deep=false] filter sub objects too
 * @returns {object} a new object
 *
 * @example
 * const deny = buildPropertyFilter({names : ["secret"], allowed : false});
 *
 * filter({secret : "x", a : 1}, deny);                             // {a : 1}
 * filter({sub : {secret : "x", a : 1}}, deny, {deep : true});      // {sub : {a : 1}}
 */
const filter = (data, propFilter, { deep = false } = {}) => filterObject(data, propFilter, deep, new WeakMap());

/**
 * Defines a constant, non enumerable property.
 *
 * @param {object} o the object to define the property on
 * @param {string} name name of the property
 * @param {*} value the value, neither writable nor configurable
 * @returns {void}
 */
const defValue = (o, name, value) => {
	Object.defineProperty(o, name, {
		value,
		writable: false,
		configurable: false,
		enumerable: false,
	});
};

/**
 * Defines a read only, non enumerable property backed by a getter.
 *
 * @param {object} o the object to define the property on
 * @param {string} name name of the property
 * @param {Function} get returns the value of the property
 * @returns {void}
 */
const defGet = (o, name, get) => {
	Object.defineProperty(o, name, {
		get,
		configurable: false,
		enumerable: false,
	});
};

/**
 * Defines a non enumerable property backed by a getter and a setter.
 *
 * @param {object} o the object to define the property on
 * @param {string} name name of the property
 * @param {Function} get returns the value of the property
 * @param {Function} set takes the new value of the property
 * @returns {void}
 */
const defGetSet = (o, name, get, set) => {
	Object.defineProperty(o, name, {
		get,
		set,
		configurable: false,
		enumerable: false,
	});
};

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({
	isNullOrUndefined,
	isObject,
	isPrimitive,
	equalPojo,
	isPojo,
	append,
	merge,
	filter,
	buildPropertyFilter,
	defValue,
	defGet,
	defGetSet,
});


/***/ }),

/***/ "./src/PrivateProperty.js":
/*!********************************!*\
  !*** ./src/PrivateProperty.js ***!
  \********************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   privateProperty: () => (/* binding */ privateProperty),
/* harmony export */   privatePropertyAccessor: () => (/* binding */ privatePropertyAccessor),
/* harmony export */   privateStore: () => (/* binding */ privateStore)
/* harmony export */ });
/**
 * Private state for an object, held outside of it.
 *
 * The values live in a WeakMap keyed by the object, so nothing is added to the object itself and
 * nothing shows up in Object.keys or JSON. Once the object is gone its state is collectable too.
 *
 * @module PrivateProperty
 */
const PRIVATE_PROPERTIES = new WeakMap();

/**
 * The store belonging to an object. Created on the first call, the same one from then on.
 *
 * @param {object} obj
 * @returns {object} the store, writable directly
 */
const privateStore = (obj) => {
	if(PRIVATE_PROPERTIES.has(obj))
		return PRIVATE_PROPERTIES.get(obj);

	const data = {};
	PRIVATE_PROPERTIES.set(obj, data);
	return data;
};

/**
 * Reads or writes private state, depending on how many arguments it is called with.
 *
 * Passing undefined as the value still counts as a write - what decides is the number of arguments,
 * not their content.
 *
 * @param {object} obj the object the state belongs to
 * @param {string} [name] name of the property
 * @param {*} [value] the value to write
 * @returns {*} the whole store with one argument, the value with two, nothing with three
 * @throws {Error} when called with more than three arguments
 *
 * @example
 * privateProperty(instance, "count", 1);   // write
 * privateProperty(instance, "count");      // 1
 * privateProperty(instance);               // {count : 1}
 */
const privateProperty = function(obj, name, value) {
	const data = privateStore(obj);
	if(arguments.length === 1)
		return data;
	else if(arguments.length === 2)
		return data[name];
	else if(arguments.length === 3)
		data[name] = value;
	else
		throw new Error("Not allowed size of arguments!");
};

/**
 * Builds a function reading and writing one fixed property, so the name is written once instead of
 * at every call.
 *
 * @param {string} varname name of the property
 * @returns {Function} called with (self) it reads, called with (self, value) it writes
 *
 * @example
 * const count = privatePropertyAccessor("count");
 * count(instance, 1);   // write
 * count(instance);      // 1
 */
const privatePropertyAccessor = (varname) => {
	return function(self, value){
		if(arguments.length == 2)
			privateProperty(self, varname, value);
		else
			return privateProperty(self, varname);
	};
};

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({privateProperty, privatePropertyAccessor, privateStore});


/***/ }),

/***/ "./src/PromiseUtils.js":
/*!*****************************!*\
  !*** ./src/PromiseUtils.js ***!
  \*****************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   lazyPromise: () => (/* binding */ lazyPromise),
/* harmony export */   timeoutPromise: () => (/* binding */ timeoutPromise)
/* harmony export */ });
/* harmony import */ var _ObjectUtils_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./ObjectUtils.js */ "./src/ObjectUtils.js");
/**
 * Two ways of building a promise that something outside of it settles.
 *
 * {@link timeoutPromise} runs a function once a timeout has passed and lets the whole chain behind
 * it be canceled. {@link lazyPromise} hands out a promise together with its resolve and reject, for
 * the cases where the settling is driven from somewhere else - a framework callback, an event,
 * foreign code - and packing all of that into the executor would only blow the code up or is not
 * possible at all.
 *
 * The two carry different state on purpose: a timeoutPromise reports its cancellation through a
 * rejection and an AbortSignal, a lazyPromise reports its outcome through resolved, error and value.
 *
 * @module PromiseUtils
 */


/**
 * The reason an aborted operation rejects with. A DOMException named AbortError is what
 * AbortController itself uses, an Error carrying the same name stands in where it is missing.
 *
 * @private
 * @returns {Error|DOMException}
 */
const abortError = () => {
	if (typeof DOMException !== "undefined") return new DOMException("The operation was aborted.", "AbortError");

	/* istanbul ignore next - every browser the suite runs in brings DOMException, so this line only
	   stands in for environments the test run cannot reach */
	return Object.assign(new Error("The operation was aborted."), { name: "AbortError" });
};

/**
 * The reason a signal carries. abort() fills it in on its own, older implementations know the
 * method but not the property.
 *
 * @private
 * @param {AbortSignal} signal
 * @returns {*}
 */
const abortReason = (signal) => (typeof signal.reason === "undefined" ? abortError() : signal.reason);

/**
 * Adds the cancel api to a promise and to every promise derived from it. All of them share one
 * controller, so a chain can be canceled from any of its links.
 *
 * @private
 * @param {Promise} promise
 * @param {AbortController} controller
 * @param {Function} cancel
 * @returns {Promise} the promise itself
 */
const cancelable = (promise, controller, cancel) => {
	(0,_ObjectUtils_js__WEBPACK_IMPORTED_MODULE_0__.defValue)(promise, "cancel", cancel);
	(0,_ObjectUtils_js__WEBPACK_IMPORTED_MODULE_0__.defGet)(promise, "signal", () => controller.signal);
	(0,_ObjectUtils_js__WEBPACK_IMPORTED_MODULE_0__.defGet)(promise, "canceled", () => controller.signal.aborted);

	// then has to hand both handlers through and return the derived promise - catch, finally and
	// await are defined in terms of then, so anything less silently breaks those as well
	const then = promise.then;
	(0,_ObjectUtils_js__WEBPACK_IMPORTED_MODULE_0__.defValue)(promise, "then", (onFulfilled, onRejected) => cancelable(then.call(promise, onFulfilled, onRejected), controller, cancel));

	return promise;
};

/**
 * Calls a function after a timeout and settles with whatever it produces.
 *
 * The function is called with resolve, reject and the AbortSignal of the promise, so work started
 * inside it can be aborted along with it. An exception thrown by the function rejects the promise
 * instead of escaping into the timer.
 *
 * The promise brings its own AbortController. cancel() clears a pending timeout and rejects with an
 * AbortError, which travels down the whole chain - no then handler behind it runs. cancel() sits on
 * every promise derived from it and does nothing once the promise has settled.
 *
 * @param {Function} fn called with (resolve, reject, signal) once the timeout has passed
 * @param {number} ms the timeout in milliseconds
 * @returns {Promise} a promise carrying cancel(), signal and canceled
 *
 * @example
 * const promise = timeoutPromise((resolve) => resolve("done"), 1000);
 * await promise;                                  // "done"
 *
 * @example
 * const promise = timeoutPromise((resolve) => resolve("done"), 1000);
 * promise.then(() => console.log("never runs"));
 * promise.cancel();
 * await promise;                                  // throws AbortError
 */
const timeoutPromise = (fn, ms) => {
	const controller = new AbortController();
	const signal = controller.signal;
	let timeout = null;
	let settled = false;

	const promise = new Promise((resolve, reject) => {
		// the timeout is cleared on every way out, a canceled promise must not keep the timer alive
		const settle = (handler) => (value) => {
			if (settled) return;

			settled = true;
			if (timeout !== null) {
				clearTimeout(timeout);
				timeout = null;
			}
			handler(value);
		};

		const onResolve = settle(resolve);
		const onReject = settle(reject);

		signal.addEventListener("abort", () => onReject(abortReason(signal)), { once: true });

		timeout = setTimeout(() => {
			timeout = null;
			try {
				fn(onResolve, onReject, signal);
			} catch (error) {
				onReject(error);
			}
		}, ms);
	});

	return cancelable(promise, controller, (reason) => {
		if (settled || signal.aborted) return;

		controller.abort(typeof reason === "undefined" ? abortError() : reason);
	});
};

/**
 * Builds a promise together with the two functions settling it.
 *
 * The point is to have the promise and its resolve and reject apart from each other: whatever
 * settles it does not have to sit inside the executor. That keeps a promise usable where the
 * settling is driven by a framework callback, an event or any other foreign code the executor has no
 * way of reaching.
 *
 * The promise carries three read only properties:
 *
 * - resolved says the promise has been settled. It says nothing about the outcome - it is true for a
 *   failure just as well.
 * - error tells the two apart.
 * - value holds whatever the promise was settled with: the result after a resolve, the reason after
 *   a reject. error is what decides how to read it.
 *
 * An Error always leads to a rejection, in both directions - handing one to resolve rejects the
 * promise just like reject would. A reason that is no Error is wrapped into one, and a reject
 * without a reason gets an Error of its own, so there is always a message to read.
 *
 * Both functions settle the promise once. A second call throws instead of settling again, so the
 * three properties can never end up disagreeing with the promise.
 *
 * @returns {Promise} a promise carrying resolve(), reject(), value, error and resolved
 * @throws {Error} from resolve or reject when the promise has already been settled
 *
 * @example
 * const promise = lazyPromise();
 * element.addEventListener("load", () => promise.resolve(element), {once : true});
 * await promise;
 *
 * @example
 * const promise = lazyPromise();
 * promise.reject("no connection");   // rejects with an Error carrying that message
 * promise.resolved;                  // true - settled, not successful
 * promise.error;                     // true
 * promise.value;                     // "no connection"
 */
const lazyPromise = () => {
	let promiseResolve = null;
	let promiseReject = null;
	let resolved = false;
	let error = false;
	let value = undefined;

	const promise = new Promise((r, e) => {
		promiseResolve = r;
		promiseReject = (anError) => e(anError instanceof Error ? anError : new Error(anError == null ? "Promise rejected with no reason" : anError));
	});

	(0,_ObjectUtils_js__WEBPACK_IMPORTED_MODULE_0__.defValue)(promise, "resolve", (result) => {
		if (resolved) throw new Error("Promise already resolved!");
		resolved = true;
		value = result;
		if (value instanceof Error) {
			error = true;
			promiseReject(value);
		} else promiseResolve(value);
	});
	(0,_ObjectUtils_js__WEBPACK_IMPORTED_MODULE_0__.defValue)(promise, "reject", (result) => {
		if (resolved) throw new Error("Promise already resolved!");
		resolved = true;
		value = result;
		error = true;
		promiseReject(result);
	});

	(0,_ObjectUtils_js__WEBPACK_IMPORTED_MODULE_0__.defGet)(promise, "value", () => value);
	(0,_ObjectUtils_js__WEBPACK_IMPORTED_MODULE_0__.defGet)(promise, "error", () => error);
	(0,_ObjectUtils_js__WEBPACK_IMPORTED_MODULE_0__.defGet)(promise, "resolved", () => resolved);

	return promise;
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({
	lazyPromise,
	timeoutPromise,
});


/***/ }),

/***/ "./src/UUID.js":
/*!*********************!*\
  !*** ./src/UUID.js ***!
  \*********************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   UUID_SCHEMA: () => (/* binding */ UUID_SCHEMA),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   uuid: () => (/* binding */ uuid)
/* harmony export */ });
/* harmony import */ var _Global_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./Global.js */ "./src/Global.js");
/**
 * Creation of random UUIDs.
 *
 * @module UUID
 */
//the solution is found here: https://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid



/**
 * The layout of a version 4 UUID. x is a random hex digit, y is the variant digit and becomes one of
 * 8, 9, a or b.
 *
 * @type {string}
 */
const UUID_SCHEMA = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";

/**
 * Creates a random UUID of version 4.
 *
 * The digits come from crypto.getRandomValues, not from Math.random. Requires a crypto on the global
 * scope, which every browser and every web worker brings.
 *
 * @returns {string} 36 characters, following {@link UUID_SCHEMA}
 *
 * @example
 * uuid();   // "1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed"
 */
const uuid = () => {
	const buf = new Uint32Array(4);
	_Global_js__WEBPACK_IMPORTED_MODULE_0__["default"].crypto.getRandomValues(buf);
	let idx = -1;
	return UUID_SCHEMA.replace(/[xy]/g, (c) => {
		idx++;
		const r = (buf[idx >> 3] >> ((idx % 8) * 4)) & 15;
		const v = c == "x" ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
};

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({ uuid });


/***/ }),

/***/ "./src/ValueHelper.js":
/*!****************************!*\
  !*** ./src/ValueHelper.js ***!
  \****************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   emptyOrBlank: () => (/* binding */ emptyOrBlank),
/* harmony export */   emtpyOrNoValueString: () => (/* binding */ emtpyOrNoValueString),
/* harmony export */   noValue: () => (/* binding */ noValue)
/* harmony export */ });
/**
 * Small checks on plain values.
 *
 * noValue answers the same question as ObjectUtils.isNullOrUndefined and is kept as its own function
 * on purpose: this module is the one to reach for when all that is needed is a look at a value, and
 * it stays free of any dependency on ObjectUtils. The duplication is the price for that, and it is
 * accepted - both are two lines and neither is going to change.
 *
 * @module ValueHelper
 */

/**
 * Checks whether a value is null or undefined.
 *
 * @param {*} value
 * @returns {boolean}
 */
const noValue = (value) => {
	return value == null || typeof value === "undefined";
};

/**
 * Checks whether a string carries nothing to work with - null, undefined, empty or whitespace only.
 *
 * Expects a string for everything else and throws on a value without trim, a number for instance.
 *
 * @param {string} value
 * @returns {boolean}
 *
 * @example
 * emptyOrBlank("  ");     // true
 * emptyOrBlank(null);     // true
 * emptyOrBlank("test");   // false
 */
const emptyOrBlank = (value) => {
	return noValue(value) || value.trim().length == 0;
};

/**
 * @deprecated use {@link emptyOrBlank}
 * @param {string} value
 * @returns {boolean}
 */
const emtpyOrNoValueString = (value) => {
	console.warn("emtpyOrNoValueString is deprecated! use emptyOrBlank");
	return emptyOrBlank(value);
};


/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({
	noValue,
	emptyOrBlank,
	emtpyOrNoValueString
});

/***/ }),

/***/ "./src/index.js":
/*!**********************!*\
  !*** ./src/index.js ***!
  \**********************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Escaper: () => (/* reexport safe */ _Escaper_js__WEBPACK_IMPORTED_MODULE_3__["default"]),
/* harmony export */   GLOBAL: () => (/* reexport safe */ _Global_js__WEBPACK_IMPORTED_MODULE_1__["default"]),
/* harmony export */   ObjectUtils: () => (/* reexport safe */ _ObjectUtils_js__WEBPACK_IMPORTED_MODULE_2__["default"]),
/* harmony export */   PrivateProperty: () => (/* reexport safe */ _PrivateProperty_js__WEBPACK_IMPORTED_MODULE_6__["default"]),
/* harmony export */   PromiseUtils: () => (/* reexport safe */ _PromiseUtils_js__WEBPACK_IMPORTED_MODULE_5__["default"]),
/* harmony export */   UUID: () => (/* reexport safe */ _UUID_js__WEBPACK_IMPORTED_MODULE_7__["default"]),
/* harmony export */   ValueHelper: () => (/* reexport safe */ _ValueHelper_js__WEBPACK_IMPORTED_MODULE_4__["default"])
/* harmony export */ });
/* harmony import */ var _javascript_index_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./javascript/index.js */ "./src/javascript/index.js");
/* harmony import */ var _ObjectUtils_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./ObjectUtils.js */ "./src/ObjectUtils.js");
/* harmony import */ var _Global_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./Global.js */ "./src/Global.js");
/* harmony import */ var _Escaper_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./Escaper.js */ "./src/Escaper.js");
/* harmony import */ var _ValueHelper_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./ValueHelper.js */ "./src/ValueHelper.js");
/* harmony import */ var _PromiseUtils_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./PromiseUtils.js */ "./src/PromiseUtils.js");
/* harmony import */ var _PrivateProperty_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./PrivateProperty.js */ "./src/PrivateProperty.js");
/* harmony import */ var _UUID_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./UUID.js */ "./src/UUID.js");
/**
 * Entry point of the package.
 *
 * Importing it also pulls in the javascript module, which extends String and Map - see the note
 * there. Ready, ServiceHelper and the XmlToJson converter are not part of this surface and have to be
 * imported from their own file.
 *
 * @module defaultjs-common-utils
 */











/***/ }),

/***/ "./src/javascript/Map.js":
/*!*******************************!*\
  !*** ./src/javascript/Map.js ***!
  \*******************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/**
 * Adds toObject() to every Map - see the note on patching prototypes in ./index.js.
 *
 * A nested Map is converted along with it. Every key becomes a property name, so a key that is no
 * string is turned into one the way javascript does it - an object key ends up as "[object Object]",
 * and two keys collapsing onto the same name overwrite each other.
 *
 * Only defined when nothing else carries that name already.
 *
 * @returns {object}
 *
 * @example
 * new Map([["a", 1], ["b", new Map([["c", 2]])]]).toObject();   // {a : 1, b : {c : 2}}
 */
if (!Map.prototype.toObject)
	Map.prototype.toObject = function () {
		const object = {};
		for (const [key, value] of this.entries()) object[key] = value instanceof Map ? value.toObject() : value;

		return object;
	};


/***/ }),

/***/ "./src/javascript/String.js":
/*!**********************************!*\
  !*** ./src/javascript/String.js ***!
  \**********************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/**
 * Adds hashcode() to every string - see the note on patching prototypes in ./index.js.
 *
 * The hash is the one java uses for its strings: h = 31 * h + char, kept inside 32 signed bits. It
 * is meant for bucketing and for telling texts apart cheaply, not for anything where collisions
 * matter - two different texts can share a hash, and it is no cryptographic digest.
 *
 * Only defined when nothing else carries that name already.
 *
 * @returns {number} a 32 bit signed integer, 0 for the empty string
 *
 * @example
 * "test".hashcode();   // 3556498
 */
if (!String.prototype.hashcode)
	String.prototype.hashcode = function() {
		if (this.length === 0)
			return 0;
		
		let hash = 0;
		const length = this.length;
		for (let i = 0; i < length; i++) {
			const c = this.charCodeAt(i);
			hash = ((hash << 5) - hash) + c;
			hash |= 0; // Convert to 32bit integer
		}
		return hash;
	};

/***/ }),

/***/ "./src/javascript/index.js":
/*!*********************************!*\
  !*** ./src/javascript/index.js ***!
  \*********************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _String_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./String.js */ "./src/javascript/String.js");
/* harmony import */ var _Map_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./Map.js */ "./src/javascript/Map.js");
/**
 * Extensions to the built in javascript types.
 *
 * Importing this module patches prototypes - that is what it is for, and it is deliberate. The
 * package imports it from its own entry point, so anything using it gets the extensions without
 * asking for them separately. They are meant to read like part of the language at the call site:
 * "text".hashcode() instead of hashcode("text").
 *
 * Every extension is added only when the type does not already carry that name, so a newer engine
 * or another library defining the same member keeps the upper hand and nothing is overwritten.
 *
 * @module javascript
 */



/***/ }),

/***/ "./src/version.js":
/*!************************!*\
  !*** ./src/version.js ***!
  \************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   VERSION: () => (/* binding */ VERSION),
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/**
 * The version of this package.
 *
 * Generated from package.json by scripts/generate-version.js before every build. Do not edit - the
 * next build overwrites it.
 *
 * @module version
 */
const VERSION = "1.0.0";

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (VERSION);


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
/*!********************!*\
  !*** ./browser.js ***!
  \********************/
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   Escaper: () => (/* reexport safe */ _src_index_js__WEBPACK_IMPORTED_MODULE_0__.Escaper),
/* harmony export */   GLOBAL: () => (/* reexport safe */ _src_index_js__WEBPACK_IMPORTED_MODULE_0__.GLOBAL),
/* harmony export */   ObjectUtils: () => (/* reexport safe */ _src_index_js__WEBPACK_IMPORTED_MODULE_0__.ObjectUtils),
/* harmony export */   PrivateProperty: () => (/* reexport safe */ _src_index_js__WEBPACK_IMPORTED_MODULE_0__.PrivateProperty),
/* harmony export */   PromiseUtils: () => (/* reexport safe */ _src_index_js__WEBPACK_IMPORTED_MODULE_0__.PromiseUtils),
/* harmony export */   UUID: () => (/* reexport safe */ _src_index_js__WEBPACK_IMPORTED_MODULE_0__.UUID),
/* harmony export */   ValueHelper: () => (/* reexport safe */ _src_index_js__WEBPACK_IMPORTED_MODULE_0__.ValueHelper)
/* harmony export */ });
/* harmony import */ var _src_index_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./src/index.js */ "./src/index.js");
/* harmony import */ var _src_version_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./src/version.js */ "./src/version.js");



_src_index_js__WEBPACK_IMPORTED_MODULE_0__.GLOBAL.defaultjs = _src_index_js__WEBPACK_IMPORTED_MODULE_0__.GLOBAL.defaultjs || {};
_src_index_js__WEBPACK_IMPORTED_MODULE_0__.GLOBAL.defaultjs.common = _src_index_js__WEBPACK_IMPORTED_MODULE_0__.GLOBAL.defaultjs.common || {};
_src_index_js__WEBPACK_IMPORTED_MODULE_0__.GLOBAL.defaultjs.common.utils = _src_index_js__WEBPACK_IMPORTED_MODULE_0__.GLOBAL.defaultjs.common.utils || {
	VERSION: _src_version_js__WEBPACK_IMPORTED_MODULE_1__.VERSION,
	GLOBAL: _src_index_js__WEBPACK_IMPORTED_MODULE_0__.GLOBAL,
	ObjectUtils: _src_index_js__WEBPACK_IMPORTED_MODULE_0__.ObjectUtils,
	Escaper: _src_index_js__WEBPACK_IMPORTED_MODULE_0__.Escaper,
	ValueHelper: _src_index_js__WEBPACK_IMPORTED_MODULE_0__.ValueHelper,
	PromiseUtils: _src_index_js__WEBPACK_IMPORTED_MODULE_0__.PromiseUtils,
	PrivateProperty: _src_index_js__WEBPACK_IMPORTED_MODULE_0__.PrivateProperty,
	UUID: _src_index_js__WEBPACK_IMPORTED_MODULE_0__.UUID,
};



})();

/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QUNqRjtXQUNBO1dBQ0E7Ozs7O1dDUEE7Ozs7O1dDQUE7V0FDQTtXQUNBO1dBQ0EsdURBQXVELGlCQUFpQjtXQUN4RTtXQUNBLGdEQUFnRCxhQUFhO1dBQzdEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FDTmdIO0FBQ3JFOztBQUUzQyxpREFBTSxhQUFhLGlEQUFNO0FBQ3pCLGlEQUFNLG9CQUFvQixpREFBTTtBQUNoQyxpREFBTSwwQkFBMEIsaURBQU07QUFDdEMsUUFBUTtBQUNSLE9BQU87QUFDUCxZQUFZO0FBQ1osUUFBUTtBQUNSLFlBQVk7QUFDWixhQUFhO0FBQ2IsZ0JBQWdCO0FBQ2hCLEtBQUs7QUFDTDs7QUFFMEYiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9AZGVmYXVsdC1qcy9kZWZhdWx0anMtY29tbW9uLXV0aWxzLy4vc3JjL0VzY2FwZXIuanMiLCJ3ZWJwYWNrOi8vQGRlZmF1bHQtanMvZGVmYXVsdGpzLWNvbW1vbi11dGlscy8uL3NyYy9HbG9iYWwuanMiLCJ3ZWJwYWNrOi8vQGRlZmF1bHQtanMvZGVmYXVsdGpzLWNvbW1vbi11dGlscy8uL3NyYy9PYmplY3RQcm9wZXJ0eS5qcyIsIndlYnBhY2s6Ly9AZGVmYXVsdC1qcy9kZWZhdWx0anMtY29tbW9uLXV0aWxzLy4vc3JjL09iamVjdFV0aWxzLmpzIiwid2VicGFjazovL0BkZWZhdWx0LWpzL2RlZmF1bHRqcy1jb21tb24tdXRpbHMvLi9zcmMvUHJpdmF0ZVByb3BlcnR5LmpzIiwid2VicGFjazovL0BkZWZhdWx0LWpzL2RlZmF1bHRqcy1jb21tb24tdXRpbHMvLi9zcmMvUHJvbWlzZVV0aWxzLmpzIiwid2VicGFjazovL0BkZWZhdWx0LWpzL2RlZmF1bHRqcy1jb21tb24tdXRpbHMvLi9zcmMvVVVJRC5qcyIsIndlYnBhY2s6Ly9AZGVmYXVsdC1qcy9kZWZhdWx0anMtY29tbW9uLXV0aWxzLy4vc3JjL1ZhbHVlSGVscGVyLmpzIiwid2VicGFjazovL0BkZWZhdWx0LWpzL2RlZmF1bHRqcy1jb21tb24tdXRpbHMvLi9zcmMvaW5kZXguanMiLCJ3ZWJwYWNrOi8vQGRlZmF1bHQtanMvZGVmYXVsdGpzLWNvbW1vbi11dGlscy8uL3NyYy9qYXZhc2NyaXB0L01hcC5qcyIsIndlYnBhY2s6Ly9AZGVmYXVsdC1qcy9kZWZhdWx0anMtY29tbW9uLXV0aWxzLy4vc3JjL2phdmFzY3JpcHQvU3RyaW5nLmpzIiwid2VicGFjazovL0BkZWZhdWx0LWpzL2RlZmF1bHRqcy1jb21tb24tdXRpbHMvLi9zcmMvamF2YXNjcmlwdC9pbmRleC5qcyIsIndlYnBhY2s6Ly9AZGVmYXVsdC1qcy9kZWZhdWx0anMtY29tbW9uLXV0aWxzLy4vc3JjL3ZlcnNpb24uanMiLCJ3ZWJwYWNrOi8vQGRlZmF1bHQtanMvZGVmYXVsdGpzLWNvbW1vbi11dGlscy93ZWJwYWNrL2Jvb3RzdHJhcCIsIndlYnBhY2s6Ly9AZGVmYXVsdC1qcy9kZWZhdWx0anMtY29tbW9uLXV0aWxzL3dlYnBhY2svcnVudGltZS9kZWZpbmUgcHJvcGVydHkgZ2V0dGVycyIsIndlYnBhY2s6Ly9AZGVmYXVsdC1qcy9kZWZhdWx0anMtY29tbW9uLXV0aWxzL3dlYnBhY2svcnVudGltZS9oYXNPd25Qcm9wZXJ0eSBzaG9ydGhhbmQiLCJ3ZWJwYWNrOi8vQGRlZmF1bHQtanMvZGVmYXVsdGpzLWNvbW1vbi11dGlscy93ZWJwYWNrL3J1bnRpbWUvbWFrZSBuYW1lc3BhY2Ugb2JqZWN0Iiwid2VicGFjazovL0BkZWZhdWx0LWpzL2RlZmF1bHRqcy1jb21tb24tdXRpbHMvLi9icm93c2VyLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogUmVwbGFjaW5nIGNoYXJhY3RlcnMgaW4gYSB0ZXh0IGFuZCB0YWtpbmcgdGhlIHJlcGxhY2VtZW50IGJhY2sgb3V0LlxuICpcbiAqIEBtb2R1bGUgRXNjYXBlclxuICovXG5cbi8vIHRoZSBvbmUgbGlzdCBvZiBjaGFyYWN0ZXJzIGNhcnJ5aW5nIGEgbWVhbmluZyBpbnNpZGUgYSByZWd1bGFyIGV4cHJlc3Npb24uIHF1b3RlIGFuZCB0aGUgbWFwIG9mXG4vLyBSRUdFWFBfRVNDQVBFUiBhcmUgYm90aCBkZXJpdmVkIGZyb20gaXQsIHNvIGEgY2hhcmFjdGVyIGNhbiBuZXZlciBiZSBpbiBvbmUgYW5kIG1pc3NpbmcgaW4gdGhlXG4vLyBvdGhlci5cbmNvbnN0IFJFR0VYQ0hBUlMgPSBbXCJcXFxcXCIsIFwiP1wiLCBcIipcIiwgXCIrXCIsIFwifFwiLCBcIltcIiwgXCJdXCIsIFwie1wiLCBcIn1cIiwgXCIoXCIsIFwiKVwiLCBcIi5cIiwgXCJeXCIsIFwiJFwiXTtcblxuY29uc3QgUkVHRVhRVU9URSA9IG5ldyBSZWdFeHAoYFske1JFR0VYQ0hBUlMubWFwKChjaGFyKSA9PiBcIlxcXFxcIiArIGNoYXIpLmpvaW4oXCJcIil9XWAsIFwiZ1wiKTtcblxuLyoqXG4gKiBUYWtlcyB0aGUgcmVnZXggbWVhbmluZyBvdXQgb2YgYSB0ZXh0LCBzbyBhIGZpbHRlciBpcyBtYXRjaGVkIGFzIHRoZSBsaXRlcmFsIHRleHQgaXQgaXMuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7c3RyaW5nfSBhVGV4dFxuICogQHJldHVybnMge3N0cmluZ31cbiAqL1xuY29uc3QgcXVvdGUgPSAoYVRleHQpID0+IGFUZXh0LnJlcGxhY2UoUkVHRVhRVU9URSwgKGNoYXIpID0+IFwiXFxcXFwiICsgY2hhcik7XG5cbi8qKlxuICogVGhlIHR3byBkaXJlY3Rpb25zIGFuIGVudHJ5IG9mIGEgY2hhciBtYXAgY2FuIHRha2UgcGFydCBpbi5cbiAqXG4gKiBNZWFudCBmb3IgdGhlIGF0IG9mIGEge0BsaW5rIENoYXJNYXBFbnRyeX0uIFRoZSB2YWx1ZXMgYXJlIHRoZSBwbGFpbiB0ZXh0cyBcImVzY2FwZVwiIGFuZCBcInVuZXNjYXBlXCIsXG4gKiBhbmQgYW4gYXQgaXMgY29tcGFyZWQgaW4gbG93ZXIgY2FzZSwgc28gXCJFc2NhcGVcIiBhbmQgXCJFU0NBUEVcIiBuYW1lIHRoZSBzYW1lIGRpcmVjdGlvbi4gV3JpdGluZyB0aGVcbiAqIHRleHQgYnkgaGFuZCBpcyB0aGVyZWZvcmUgZmluZSAtIE1PREVTIGlzIHRoZSBzYWZlciB3YXkgdG8gc3BlbGwgaXQsIG5vdCB0aGUgb25seSBvbmUuXG4gKlxuICogRnJvemVuOiB0aGUgdmFsdWVzIGFyZSBwYXJ0IG9mIHRoZSBjb250cmFjdCwgYW5kIGEgY2hhbmdlZCBvbmUgd291bGQgc2lsZW50bHkgbW92ZSB3aGF0IGEgbWFwIG1lYW5zLlxuICpcbiAqIEByZWFkb25seVxuICogQGVudW0ge3N0cmluZ31cbiAqXG4gKiBAZXhhbXBsZVxuICogbmV3IEVzY2FwZXIoW1xuICogICAgIHtjaGFyIDogXCImXCIsIGVzY2FwZWQgOiBcIiZhbXA7XCJ9LFxuICogICAgIHtjaGFyIDogXCImXCIsIGVzY2FwZWQgOiBcIiYjMzg7XCIsIGF0IDogTU9ERVMudW5lc2NhcGV9LFxuICogXSwgdHJ1ZSk7XG4gKi9cbmV4cG9ydCBjb25zdCBNT0RFUyA9IE9iamVjdC5mcmVlemUoe1xuXHQvKiogdGhlIGVudHJ5IHRha2VzIHBhcnQgd2hpbGUgZXNjYXBpbmcgKi9cblx0ZXNjYXBlOiBcImVzY2FwZVwiLnRvTG93ZXJDYXNlKCksXG5cdC8qKiB0aGUgZW50cnkgdGFrZXMgcGFydCB3aGlsZSB1bmVzY2FwaW5nICovXG5cdHVuZXNjYXBlOiBcInVuZXNjYXBlXCIudG9Mb3dlckNhc2UoKVxufSk7XG5cbi8qKlxuICogQ29sbGVjdHMgZXZlcnl0aGluZyB3cm9uZyB3aXRoIG9uZSBlbnRyeSBvZiBhIGNoYXIgbWFwLlxuICpcbiAqIGNoYXIgaGFzIHRvIG5hbWUgc29tZXRoaW5nIHRvIGxvb2sgZm9yLCBzbyBhbiBlbXB0eSBvbmUgaXMgcmVqZWN0ZWQgLSBpdCB3b3VsZCBjb21waWxlIGludG8gYVxuICogcmVnZXggbWF0Y2hpbmcgYXQgZXZlcnkgcG9zaXRpb24uIEFuIGVtcHR5IGVzY2FwZWQgaXMgYWxsb3dlZDogZHJvcHBpbmcgYSBjaGFyYWN0ZXIgaXMgYSBzZW5zaWJsZVxuICogdGhpbmcgdG8gZXNjYXBlIHRvLCBpdCBqdXN0IGNhbm5vdCBiZSB1bmRvbmUsIHNvIHN1Y2ggYW4gZW50cnkgb25seSB0YWtlcyBwYXJ0IGluIGVzY2FwaW5nLlxuICpcbiAqIGF0IGlzIHJlYWQgaW4gbG93ZXIgY2FzZSwgc28gb25seSBhIGRpcmVjdGlvbiB0aGF0IGlzIG5vdCBvbmUgb2YgdGhlIHR3byBhdCBhbGwgaXMgYSBwcm9ibGVtLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0geyp9IGl0ZW1cbiAqIEBwYXJhbSB7bnVtYmVyfSBpbmRleCBwb3NpdGlvbiBpbiB0aGUgY2hhciBtYXAsIHRvIHBvaW50IGF0IHRoZSBlbnRyeSBpbiB0aGUgbWVzc2FnZVxuICogQHJldHVybnMge0FycmF5PHN0cmluZz59IG9uZSB0ZXh0IHBlciBwcm9ibGVtLCBlbXB0eSB3aGVuIHRoZSBlbnRyeSBpcyBmaW5lXG4gKi9cbmNvbnN0IHByb2JsZW1zT2ZFbnRyeSA9IChpdGVtLCBpbmRleCkgPT4ge1xuXHRpZiAoaXRlbSA9PT0gbnVsbCB8fCB0eXBlb2YgaXRlbSAhPT0gXCJvYmplY3RcIikgcmV0dXJuIFtgZW50cnkgJHtpbmRleH0gaXMgbm8gb2JqZWN0YF07XG5cblx0Y29uc3QgcHJvYmxlbXMgPSBbXTtcblx0aWYgKHR5cGVvZiBpdGVtLmNoYXIgIT09IFwic3RyaW5nXCIpIHByb2JsZW1zLnB1c2goYGVudHJ5ICR7aW5kZXh9OiBjaGFyIGhhcyB0byBiZSBhIHN0cmluZ2ApO1xuXHRlbHNlIGlmIChpdGVtLmNoYXIubGVuZ3RoID09PSAwKSBwcm9ibGVtcy5wdXNoKGBlbnRyeSAke2luZGV4fTogY2hhciBtdXN0IG5vdCBiZSBlbXB0eWApO1xuXG5cdGlmICh0eXBlb2YgaXRlbS5lc2NhcGVkICE9PSBcInN0cmluZ1wiKSBwcm9ibGVtcy5wdXNoKGBlbnRyeSAke2luZGV4fTogZXNjYXBlZCBoYXMgdG8gYmUgYSBzdHJpbmdgKTtcblx0XG5cdC8vIG5vIGF0IGF0IGFsbCBpcyB0aGUgbm9ybWFsIGNhc2UgLSBvbmx5IGxvb2sgY2xvc2VyIG9uY2UgdGhlcmUgaXMgb25lLCBvdGhlcndpc2UgdGhlIGxvd2VyIGNhc2luZ1xuXHQvLyBiZWxvdyB3b3VsZCBydW4gYWdhaW5zdCB1bmRlZmluZWRcblx0aWYgKHR5cGVvZiBpdGVtLmF0ICE9PSBcInVuZGVmaW5lZFwiKSB7XG5cdFx0aWYgKHR5cGVvZiBpdGVtLmF0ICE9PSBcInN0cmluZ1wiKSBwcm9ibGVtcy5wdXNoKGBlbnRyeSAke2luZGV4fTogYXQgaGFzIHRvIGJlIGEgc3RyaW5nIG9yIHVuZGVmaW5lZGApO1xuXHRcdGVsc2UgaWYgKGl0ZW0uYXQudG9Mb3dlckNhc2UoKSAhPT0gTU9ERVMuZXNjYXBlICYmIGl0ZW0uYXQudG9Mb3dlckNhc2UoKSAhPT0gTU9ERVMudW5lc2NhcGUpXG5cdFx0XHRwcm9ibGVtcy5wdXNoKGBlbnRyeSAke2luZGV4fTogYXQgaGFzIHRvIGJlIFwiJHtNT0RFUy5lc2NhcGV9XCIgb3IgXCIke01PREVTLnVuZXNjYXBlfVwiLCBub3QgJHtKU09OLnN0cmluZ2lmeShpdGVtLmF0KX1gKTtcblx0fVxuXG5cdHJldHVybiBwcm9ibGVtcztcbn07XG5cbi8qKlxuICogQ2hlY2tzIGEgd2hvbGUgY2hhciBtYXAgYW5kIHJlcG9ydHMgZXZlcnkgcHJvYmxlbSBhdCBvbmNlIC0gZml4aW5nIGEgbWFwIG9uZSB0aHJvd24gZXJyb3IgYXQgYVxuICogdGltZSBpcyBubyBmdW4uXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7Kn0gYUNoYXJNYXBcbiAqIEByZXR1cm5zIHt2b2lkfVxuICogQHRocm93cyB7VHlwZUVycm9yfSB3aGVuIHRoZSBtYXAgaXMgbm8gYXJyYXkgb3IgYW55IG9mIGl0cyBlbnRyaWVzIGlzIHVudXNhYmxlXG4gKi9cbmNvbnN0IHZhbGlkYXRlQ2hhck1hcCA9IChhQ2hhck1hcCkgPT4ge1xuXHRpZiAoIUFycmF5LmlzQXJyYXkoYUNoYXJNYXApKSB0aHJvdyBuZXcgVHlwZUVycm9yKGBFc2NhcGVyOiB0aGUgY2hhciBtYXAgaGFzIHRvIGJlIGFuIGFycmF5LCBub3QgJHthQ2hhck1hcCA9PT0gbnVsbCA/IFwibnVsbFwiIDogdHlwZW9mIGFDaGFyTWFwfWApO1xuXG5cdGNvbnN0IHByb2JsZW1zID0gYUNoYXJNYXAuZmxhdE1hcChwcm9ibGVtc09mRW50cnkpO1xuXHRpZiAocHJvYmxlbXMubGVuZ3RoID4gMCkgdGhyb3cgbmV3IFR5cGVFcnJvcihgRXNjYXBlcjogdW51c2FibGUgY2hhciBtYXBcXG5cXHQke3Byb2JsZW1zLmpvaW4oXCJcXG5cXHRcIil9YCk7XG59O1xuXG4vKipcbiAqIEJ1aWxkcyB0aGUgbGlzdCBvZiByZXBsYWNlbWVudHMgZm9yIG9uZSBkaXJlY3Rpb24uIEFuIGVudHJ5IHRha2VzIHBhcnQgaW4gYSBkaXJlY3Rpb24gd2hlbiBpdFxuICogY2FycmllcyBubyBhdCBhdCBhbGwgb3IgbmFtZXMgdGhhdCBkaXJlY3Rpb24sIGFuZCB3aGVuIHRoZSB0ZXh0IGl0IGhhcyB0byBsb29rIGZvciBpbiB0aGF0XG4gKiBkaXJlY3Rpb24gaXMgbm90IGVtcHR5IC0gdGhlcmUgaXMgbm90aGluZyB0byBzZWFyY2ggZm9yIG90aGVyd2lzZS5cbiAqXG4gKiBUaGUgb3JkZXIgb2YgdGhlIG1hcCBpcyBrZXB0OiBpdCBkZWNpZGVzIHdoaWNoIGVudHJ5IHdpbnMgd2hlcmUgdHdvIG9mIHRoZW0gY2FuIG1hdGNoIGF0IHRoZSBzYW1lXG4gKiBwb3NpdGlvbi5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtBcnJheTxDaGFyTWFwRW50cnk+fSBhQ2hhck1hcFxuICogQHBhcmFtIHtNT0RFU30gbW9kZSB0aGUgZGlyZWN0aW9uIHRvIGJ1aWxkIGZvclxuICogQHJldHVybnMge0FycmF5fSBlbnRyaWVzIG9mIHtmaWx0ZXIsIHZhbHVlfSwgZmlsdGVyIGJlaW5nIHRoZSBsaXRlcmFsIHRleHQgdG8gbG9vayBmb3JcbiAqL1xuY29uc3QgYnVpbGRNYXBwaW5nTGlzdCA9IChhQ2hhck1hcCwgbW9kZSkgPT4ge1xuXHRjb25zdCBmcm9tID0gbW9kZSA9PSBNT0RFUy5lc2NhcGUgPyBcImNoYXJcIiA6IFwiZXNjYXBlZFwiO1xuXHRjb25zdCB0byA9IG1vZGUgPT0gTU9ERVMuZXNjYXBlID8gXCJlc2NhcGVkXCIgOiBcImNoYXJcIjtcblxuXHRyZXR1cm4gYUNoYXJNYXBcblx0XHQuZmlsdGVyKChpdGVtKSA9PiAhaXRlbS5hdCB8fCBpdGVtLmF0LnRvTG93ZXJDYXNlKCkgPT0gbW9kZSlcblx0XHQuZmlsdGVyKChpdGVtKSA9PiBpdGVtW2Zyb21dLmxlbmd0aCA+IDApXG5cdFx0Lm1hcCgoaXRlbSkgPT4ge1xuXHRcdFx0cmV0dXJuIHsgZmlsdGVyOiBpdGVtW2Zyb21dLCB2YWx1ZTogaXRlbVt0b10gfTtcblx0XHR9KTtcbn07XG5cbi8qKlxuICogQ29tcGlsZXMgb25lIHJlZ2V4IGNvdmVyaW5nIGV2ZXJ5IGZpbHRlciBvZiBhIGRpcmVjdGlvbiwgc28gYSB0ZXh0IGNhbiBiZSB3YWxrZWQgaW4gYSBzaW5nbGUgcGFzcy5cbiAqXG4gKiBFdmVyeSBmaWx0ZXIgYmVjb21lcyBhIGNhcHR1cmUgZ3JvdXAgb2YgaXRzIG93bi4gV2hpY2ggZ3JvdXAgdG9vayBwYXJ0IGluIGEgbWF0Y2ggdGVsbHMgd2hpY2hcbiAqIHJlcGxhY2VtZW50IGJlbG9uZ3MgdG8gaXQgLSB0aGF0IG9ubHkgd29ya3MgYmVjYXVzZSBxdW90ZSBlc2NhcGVzICggYW5kICksIHNvIGEgZmlsdGVyIGNhbiBuZXZlclxuICogYnJpbmcgYSBncm91cCBvZiBpdHMgb3duIGFuZCBzaGlmdCB0aGUgbnVtYmVyaW5nLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge0FycmF5fSB0aGVGaWx0ZXJzXG4gKiBAcGFyYW0ge2Jvb2xlYW59IGlzQ2FzZVNlbnNpdGl2ZVxuICogQHJldHVybnMge1JlZ0V4cHxudWxsfSBudWxsIHdoZW4gdGhlcmUgaXMgbm90aGluZyB0byBsb29rIGZvclxuICovXG5jb25zdCBidWlsZE1hdGNoZXIgPSAodGhlRmlsdGVycywgaXNDYXNlU2Vuc2l0aXZlKSA9PiB7XG5cdC8vIGFuIGVtcHR5IGFsdGVybmF0aW9uIHdvdWxkIGNvbXBpbGUgaW50byBhIHJlZ2V4IG1hdGNoaW5nIGF0IGV2ZXJ5IHBvc2l0aW9uXG5cdGlmICh0aGVGaWx0ZXJzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIG51bGw7XG5cblx0Y29uc3Qgc291cmNlID0gdGhlRmlsdGVycy5tYXAoKGl0ZW0pID0+IGAoJHtxdW90ZShpdGVtLmZpbHRlcil9KWApLmpvaW4oXCJ8XCIpO1xuXG5cdC8vIG5vIG0gZmxhZyAtIHRoZSBmaWx0ZXJzIGFyZSBxdW90ZWQgbGl0ZXJhbHMsIF4gYW5kICQgbmV2ZXIgcmVhY2ggdGhlIHJlZ2V4IGFzIGFuY2hvcnNcblx0cmV0dXJuIG5ldyBSZWdFeHAoc291cmNlLCBpc0Nhc2VTZW5zaXRpdmUgPyBcImdcIiA6IFwiZ2lcIik7XG59O1xuXG4vKipcbiAqIFJlcGxhY2VzIGV2ZXJ5IGZpbHRlciBvZiBhIGRpcmVjdGlvbiBpbiBvbmUgcGFzcyBvdmVyIHRoZSB0ZXh0LlxuICpcbiAqIE9uZSBwYXNzIGlzIHdoYXQga2VlcHMgdGhlIHJ1bGVzIGFwYXJ0OiB3aGF0ZXZlciBhIHJlcGxhY2VtZW50IGluc2VydHMgaXMgYmVoaW5kIHRoZSBwb3NpdGlvbiB0aGVcbiAqIHdhbGsgY29udGludWVzIGF0LCBzbyBubyBvdGhlciBydWxlIGNhbiBldmVyIHNlZSBpdC4gVGhlIHJlcGxhY2VtZW50IGNvbWVzIGZyb20gYSBjYWxsYmFjaywgd2hvc2VcbiAqIHJldHVybiB2YWx1ZSBTdHJpbmcucmVwbGFjZSB0YWtlcyBsaXRlcmFsbHkgLSBhIHZhbHVlIGNhcnJ5aW5nICQmLCAkYCBvciAkMSBpcyBpbnNlcnRlZCBhcyB3cml0dGVuLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge3N0cmluZ30gYVRleHRcbiAqIEBwYXJhbSB7QXJyYXl9IHRoZUZpbHRlcnNcbiAqIEBwYXJhbSB7UmVnRXhwfG51bGx9IGFNYXRjaGVyXG4gKiBAcmV0dXJucyB7c3RyaW5nfVxuICovXG5jb25zdCBtYXBwaW5nID0gKGFUZXh0LCB0aGVGaWx0ZXJzLCBhTWF0Y2hlcikgPT4ge1xuXHRpZiAoYU1hdGNoZXIgPT09IG51bGwpIHJldHVybiBhVGV4dDtcblxuXHRyZXR1cm4gYVRleHQucmVwbGFjZShhTWF0Y2hlciwgKC4uLmFyZ3MpID0+IHtcblx0XHQvLyB0aGUgd2hvbGUgbWF0Y2ggY29tZXMgZmlyc3QsIHRoZW4gb25lIGVudHJ5IHBlciBncm91cCwgdGhlbiBvZmZzZXQgYW5kIHRleHQgLSBleGFjdGx5IG9uZVxuXHRcdC8vIG9mIHRoZSBncm91cHMgdG9vayBwYXJ0XG5cdFx0Y29uc3QgZ3JvdXBzID0gYXJncy5zbGljZSgxLCAxICsgdGhlRmlsdGVycy5sZW5ndGgpO1xuXHRcdHJldHVybiB0aGVGaWx0ZXJzW2dyb3Vwcy5maW5kSW5kZXgoKGdyb3VwKSA9PiB0eXBlb2YgZ3JvdXAgIT09IFwidW5kZWZpbmVkXCIpXS52YWx1ZTtcblx0fSk7XG59O1xuXG4vKipcbiAqIE9uZSBlbnRyeSBvZiBhIGNoYXIgbWFwLlxuICpcbiAqIEB0eXBlZGVmIHtvYmplY3R9IENoYXJNYXBFbnRyeVxuICogQHByb3BlcnR5IHtzdHJpbmd9IGNoYXIgdGhlIHRleHQgdG8gbG9vayBmb3Igd2hpbGUgZXNjYXBpbmcsIG11c3Qgbm90IGJlIGVtcHR5XG4gKiBAcHJvcGVydHkge3N0cmluZ30gZXNjYXBlZCB3aGF0IGl0IGlzIHJlcGxhY2VkIHdpdGguIEFuIGVtcHR5IG9uZSBkcm9wcyB0aGUgdGV4dCwgd2hpY2ggY2Fubm90IGJlXG4gKiAgIHVuZG9uZSAtIHN1Y2ggYW4gZW50cnkgdGFrZXMgcGFydCBpbiBlc2NhcGluZyBvbmx5LlxuICogQHByb3BlcnR5IHtNT0RFU30gW2F0XSBsaW1pdHMgdGhlIGVudHJ5IHRvIG9uZSBkaXJlY3Rpb24sIHtAbGluayBNT0RFU30uZXNjYXBlIG9yXG4gKiAgIHtAbGluayBNT0RFU30udW5lc2NhcGUuIENvbXBhcmVkIGluIGxvd2VyIGNhc2UsIHNvIHRoZSBzcGVsbGluZyBvZiB0aGUgZGlyZWN0aW9uIGRvZXMgbm90IG1hdHRlci5cbiAqICAgVGFraW5nIHBhcnQgaW4gYm90aCBpcyB0aGUgZGVmYXVsdC4gQW55dGhpbmcgZWxzZSBpcyByZWplY3RlZC5cbiAqL1xuXG4vKipcbiAqIFJlcGxhY2VzIHRleHRzIGJ5IGEgY2hhciBtYXAgYW5kIHRha2VzIHRoZSByZXBsYWNlbWVudCBiYWNrIG91dC5cbiAqXG4gKiBCb3RoIGRpcmVjdGlvbnMgd2FsayB0aGUgdGV4dCBvbmNlLCBzbyBhIHJlcGxhY2VtZW50IGlzIG5ldmVyIHRvdWNoZWQgYWdhaW4gYnkgYW5vdGhlciBlbnRyeS4gV2hlcmVcbiAqIHR3byBlbnRyaWVzIGNhbiBtYXRjaCBhdCB0aGUgc2FtZSBwbGFjZSwgdGhlIG9uZSB3cml0dGVuIGZpcnN0IGluIHRoZSBtYXAgd2lucy5cbiAqXG4gKiBjaGFyIGFuZCBlc2NhcGVkIGFyZSB0ZXh0cywgbm90IHNpbmdsZSBjaGFyYWN0ZXJzIC0gYW4gZW50cnkgbWF5IGxvb2sgZm9yIFwiYWFcIiBhbmQgcmVwbGFjZSBpdCB3aXRoXG4gKiBcInh5elwiLiBBIGNoYXJhY3RlciBjYXJyeWluZyBhIG1lYW5pbmcgaW4gYSByZWd1bGFyIGV4cHJlc3Npb24gaXMgbWF0Y2hlZCBsaXRlcmFsbHkuXG4gKlxuICogQW4gZW50cnkgbWF5IG5hbWUgYSBkaXJlY3Rpb24gdGhyb3VnaCB0aGUgYXQgb2YgaXRzIHtAbGluayBDaGFyTWFwRW50cnl9LCBzZWUge0BsaW5rIE1PREVTfS5cbiAqXG4gKiBAZXhhbXBsZVxuICogY29uc3QgZXNjYXBlciA9IG5ldyBFc2NhcGVyKFtcbiAqICAgICB7Y2hhciA6IFwiXFxcXFwiLCBlc2NhcGVkIDogXCJcXFxcXFxcXFwifSxcbiAqICAgICB7Y2hhciA6IFwiXFxcIlwiLCBlc2NhcGVkIDogXCJcXFxcXFxcIlwifSxcbiAqIF0sIHRydWUpO1xuICpcbiAqIGVzY2FwZXIuZXNjYXBlKGBzYXkgXCJoaVwiYCk7ICAgICAgLy8gJ3NheSBcXFxcXCJoaVxcXFxcIidcbiAqIGVzY2FwZXIudW5lc2NhcGUoJ3NheSBcXFxcXCJoaVxcXFxcIicpOyAgIC8vICdzYXkgXCJoaVwiJ1xuICovXG5jbGFzcyBFc2NhcGVyIHtcblxuXHQvKipcblx0ICogVGhlIHJlcGxhY2VtZW50cyBvZiB0aGUgZXNjYXBlIGRpcmVjdGlvbiwgaW4gdGhlIG9yZGVyIG9mIHRoZSBjaGFyIG1hcC5cblx0ICpcblx0ICogQHByaXZhdGVcblx0ICogQHR5cGUge0FycmF5PHtmaWx0ZXIgOiBzdHJpbmcsIHZhbHVlIDogc3RyaW5nfT59XG5cdCAqL1xuXHQjZXNjYXBlTWFwID0gbnVsbDtcblxuXHQvKipcblx0ICogVGhlIHJlcGxhY2VtZW50cyBvZiB0aGUgdW5lc2NhcGUgZGlyZWN0aW9uLiBTaG9ydGVyIHRoYW4gdGhlIGVzY2FwZSBvbmUgd2hlbmV2ZXIgYW4gZW50cnkgbmFtZXNcblx0ICogYSBkaXJlY3Rpb24gb3IgZHJvcHMgaXRzIHRleHQuXG5cdCAqXG5cdCAqIEBwcml2YXRlXG5cdCAqIEB0eXBlIHtBcnJheTx7ZmlsdGVyIDogc3RyaW5nLCB2YWx1ZSA6IHN0cmluZ30+fVxuXHQgKi9cblx0I3VuZXNjYXBlTWFwID0gbnVsbDtcblxuXHQvKipcblx0ICogVGhlIGNvbXBpbGVkIHJlZ2V4IGNvdmVyaW5nIGV2ZXJ5IGZpbHRlciBvZiB0aGUgZXNjYXBlIGRpcmVjdGlvbiwgbnVsbCB3aGVuIHRoZXJlIGlzIG5vdGhpbmcgdG9cblx0ICogbG9vayBmb3IuIEl0cyBjYXB0dXJlIGdyb3VwcyBsaW5lIHVwIHdpdGggI2VzY2FwZU1hcC5cblx0ICpcblx0ICogQHByaXZhdGVcblx0ICogQHR5cGUge1JlZ0V4cHxudWxsfVxuXHQgKi9cblx0I2VzY2FwZU1hdGNoZXIgPSBudWxsO1xuXG5cdC8qKlxuXHQgKiBUaGUgc2FtZSBmb3IgdGhlIHVuZXNjYXBlIGRpcmVjdGlvbiwgbGluZWQgdXAgd2l0aCAjdW5lc2NhcGVNYXAuXG5cdCAqXG5cdCAqIEBwcml2YXRlXG5cdCAqIEB0eXBlIHtSZWdFeHB8bnVsbH1cblx0ICovXG5cdCN1bmVzY2FwZU1hdGNoZXIgPSBudWxsO1xuXG5cdC8qKlxuXHQgKiBAcGFyYW0ge0FycmF5PENoYXJNYXBFbnRyeT59IGVzY2FwZU1hcFxuXHQgKiBAcGFyYW0ge2Jvb2xlYW59IFtpc0Nhc2VTZW5zaXRpdmU9ZmFsc2VdIGxlYXZpbmcgaXQgb3V0IGdpdmVzIGEgY2FzZSBpbnNlbnNpdGl2ZSBlc2NhcGVyLCB3aGljaFxuXHQgKiAgIGFsc28gbWF0Y2hlcyB0aGUgb3RoZXIgY2FzZSBvZiBhIGNoYXIgYW5kIHRoZXJlZm9yZSBkb2VzIG5vdCBjYXJyeSB0aGUgY2FzZSB0aHJvdWdoIGFcblx0ICogICByb3VuZHRyaXBcblx0ICogQHRocm93cyB7VHlwZUVycm9yfSB3aGVuIHRoZSBtYXAgaXMgbm8gYXJyYXkgb3IgYW55IG9mIGl0cyBlbnRyaWVzIGlzIHVudXNhYmxlLiBFdmVyeSBwcm9ibGVtIG9mXG5cdCAqICAgdGhlIG1hcCBpcyByZXBvcnRlZCBhdCBvbmNlLlxuXHQgKi9cblx0Y29uc3RydWN0b3IoZXNjYXBlTWFwLCBpc0Nhc2VTZW5zaXRpdmUpIHtcblx0XHR2YWxpZGF0ZUNoYXJNYXAoZXNjYXBlTWFwKTtcblx0XHR0aGlzLiNlc2NhcGVNYXAgPSBidWlsZE1hcHBpbmdMaXN0KGVzY2FwZU1hcCwgTU9ERVMuZXNjYXBlKTtcblx0XHR0aGlzLiN1bmVzY2FwZU1hcCA9IGJ1aWxkTWFwcGluZ0xpc3QoZXNjYXBlTWFwLCBNT0RFUy51bmVzY2FwZSk7XG5cdFx0dGhpcy4jZXNjYXBlTWF0Y2hlciA9IGJ1aWxkTWF0Y2hlcih0aGlzLiNlc2NhcGVNYXAsIGlzQ2FzZVNlbnNpdGl2ZSk7XG5cdFx0dGhpcy4jdW5lc2NhcGVNYXRjaGVyID0gYnVpbGRNYXRjaGVyKHRoaXMuI3VuZXNjYXBlTWFwLCBpc0Nhc2VTZW5zaXRpdmUpO1xuXHR9XG5cblx0LyoqXG5cdCAqIFJlcGxhY2VzIGV2ZXJ5IGNoYXIgb2YgdGhlIG1hcCB3aXRoIGl0cyBlc2NhcGVkIHRleHQuXG5cdCAqXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBhVGV4dFxuXHQgKiBAcmV0dXJucyB7c3RyaW5nfVxuXHQgKiBAdGhyb3dzIHtUeXBlRXJyb3J9IHdoZW4gdGhlIGFyZ3VtZW50IGlzIG5vIHN0cmluZ1xuXHQgKi9cblx0ZXNjYXBlKGFUZXh0KSB7XG5cdFx0aWYgKHR5cGVvZiBhVGV4dCAhPT0gXCJzdHJpbmdcIikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkV4cGVjdGVkIGEgc3RyaW5nXCIpO1xuXHRcdHJldHVybiBtYXBwaW5nKGFUZXh0LCB0aGlzLiNlc2NhcGVNYXAsIHRoaXMuI2VzY2FwZU1hdGNoZXIpO1xuXHR9XG5cblx0LyoqXG5cdCAqIFJlcGxhY2VzIGV2ZXJ5IGVzY2FwZWQgdGV4dCBvZiB0aGUgbWFwIHdpdGggaXRzIGNoYXIuXG5cdCAqXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBhVGV4dFxuXHQgKiBAcmV0dXJucyB7c3RyaW5nfVxuXHQgKiBAdGhyb3dzIHtUeXBlRXJyb3J9IHdoZW4gdGhlIGFyZ3VtZW50IGlzIG5vIHN0cmluZ1xuXHQgKi9cblx0dW5lc2NhcGUoYVRleHQpIHtcblx0XHRpZiAodHlwZW9mIGFUZXh0ICE9PSBcInN0cmluZ1wiKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiRXhwZWN0ZWQgYSBzdHJpbmdcIik7XG5cdFx0cmV0dXJuIG1hcHBpbmcoYVRleHQsIHRoaXMuI3VuZXNjYXBlTWFwLCB0aGlzLiN1bmVzY2FwZU1hdGNoZXIpO1xuXHR9XG5cblx0LyoqXG5cdCAqIFRoZSBlc2NhcGVyIGZvciByZWd1bGFyIGV4cHJlc3Npb25zLCBzZWUge0BsaW5rIFJFR0VYUF9FU0NBUEVSfS5cblx0ICpcblx0ICogQHJldHVybnMge0VzY2FwZXJ9IGFsd2F5cyB0aGUgc2FtZSBpbnN0YW5jZVxuXHQgKi9cblx0c3RhdGljIFJFR0VYUF9FU0NBUEVSKCkge1xuXHRcdHJldHVybiBSRUdFWFBfRVNDQVBFUjtcblx0fVxufVxuXG4vKipcbiAqIEVzY2FwZXIgdGFraW5nIHRoZSBtZWFuaW5nIG91dCBvZiBldmVyeSBjaGFyYWN0ZXIgYSByZWd1bGFyIGV4cHJlc3Npb24gcmVhZHMgc3BlY2lhbGx5LCBzbyBhIHRleHRcbiAqIGNhbiBiZSBwdXQgaW50byBhIHBhdHRlcm4gYW5kIG1hdGNoZWQgbGl0ZXJhbGx5LlxuICpcbiAqIEB0eXBlIHtFc2NhcGVyfVxuICpcbiAqIEBleGFtcGxlXG4gKiBjb25zdCBwYXR0ZXJuID0gbmV3IFJlZ0V4cChgXiR7UkVHRVhQX0VTQ0FQRVIuZXNjYXBlKFwiYStiXCIpfSRgKTtcbiAqIHBhdHRlcm4udGVzdChcImErYlwiKTsgICAvLyB0cnVlXG4gKiBwYXR0ZXJuLnRlc3QoXCJhYWJcIik7ICAgLy8gZmFsc2VcbiAqL1xuLy8gaGFzIHRvIGNvbWUgYWZ0ZXIgdGhlIGNsYXNzIC0gdGhlIHNpbmdsZXRvbiBpcyBidWlsdCB3aGlsZSB0aGUgbW9kdWxlIGlzIGV2YWx1YXRlZCwgYW5kIGEgY2xhc3Ncbi8vIHN0YXlzIGluIGl0cyB0ZW1wb3JhbCBkZWFkIHpvbmUgdW50aWwgaXRzIGRlY2xhcmF0aW9uIGhhcyBydW5cbmV4cG9ydCBjb25zdCBSRUdFWFBfRVNDQVBFUiA9IG5ldyBFc2NhcGVyKFxuXHRSRUdFWENIQVJTLm1hcCgoY2hhcikgPT4ge1xuXHRcdHJldHVybiB7IGNoYXIsIGVzY2FwZWQ6IFwiXFxcXFwiICsgY2hhciB9O1xuXHR9KSxcbik7XG5cbmV4cG9ydCBkZWZhdWx0IEVzY2FwZXI7XG4iLCIvKipcbiAqIFRoZSBnbG9iYWwgc2NvcGUgb2YgdGhlIGN1cnJlbnQgZW52aXJvbm1lbnQuXG4gKlxuICogUmVzb2x2ZWQgb25jZSB3aGVuIHRoZSBtb2R1bGUgaXMgbG9hZGVkOiBnbG9iYWxUaGlzLCB0aGVuIGdsb2JhbCwgd2luZG93IGFuZCBzZWxmIGZvciBlbmdpbmVzIG5vdFxuICoga25vd2luZyBpdCB5ZXQuIEFuIGVtcHR5IG9iamVjdCB3aGVuIG5vbmUgb2YgdGhlbSBleGlzdHMsIHNvIHJlYWRpbmcgZnJvbSBpdCBuZXZlciB0aHJvd3MuXG4gKlxuICogQG1vZHVsZSBHbG9iYWxcbiAqXG4gKiBAZXhhbXBsZVxuICogR0xPQkFMLmNyeXB0by5nZXRSYW5kb21WYWx1ZXMoYnVmZmVyKTtcbiAqL1xuY29uc3QgR0xPQkFMID0gKCgpID0+IHtcblx0aWYodHlwZW9mIGdsb2JhbFRoaXMgIT09IFwidW5kZWZpbmVkXCIpIHJldHVybiBnbG9iYWxUaGlzO1xuXHRpZih0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiKSByZXR1cm4gZ2xvYmFsO1xuXHRpZih0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiKSByZXR1cm4gd2luZG93O1xuXHRpZih0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIikgcmV0dXJuIHNlbGY7XG5cdHJldHVybiB7fTtcbn0pKCk7XG5cbmV4cG9ydCBkZWZhdWx0IEdMT0JBTDtcbiIsIi8qKlxyXG4gKiBPbmx5IGFuIG9iamVjdCBjYW4gY2FycnkgYSBwcm9wZXJ0eSwgc28gYSBwYXRoIHN0b3BzIGF0IGEgcHJpbWl0aXZlIGluc3RlYWQgb2YgaGFuZGluZyBvdXQgYVxyXG4gKiBwcm9wZXJ0eSB0aGF0IGNhbm5vdCBiZSByZWFkIG9yIHdyaXR0ZW4uIEFuIEFycmF5LCBNYXAgb3IgRGF0ZSBwYXNzZXMgLSB0aGV5IGFyZSBvYmplY3RzIGFuZCB0YWtlXHJcbiAqIGEgcHJvcGVydHkgbGlrZSBhbnkgb3RoZXIgb25lLCB3aGljaCBpcyB3aGF0IG1ha2VzIGEgcGF0aCBsaWtlIFwibGlzdC4wXCIgd29yay5cclxuICpcclxuICogQHByaXZhdGVcclxuICogQHBhcmFtIHsqfSB2YWx1ZSB0aGUgdmFsdWUgYSBzdGVwIG9mIHRoZSBwYXRoIHJlc29sdmVkIHRvXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIHRoZSBuYW1lIG9mIHRoYXQgc3RlcFxyXG4gKiBAcGFyYW0ge3N0cmluZ30ga2V5IHRoZSB3aG9sZSBwYXRoLCB0byB0ZWxsIHdoaWNoIG9uZSBvZiBzZXZlcmFsIHN0ZXBzIGZhaWxlZFxyXG4gKiBAcmV0dXJucyB7dm9pZH1cclxuICogQHRocm93cyB7VHlwZUVycm9yfSB3aGVuIHRoZSBzdGVwIGNhcnJpZXMgbm8gb2JqZWN0XHJcbiAqL1xyXG5jb25zdCBhc3NlcnREZXNjZW5kYWJsZSA9ICh2YWx1ZSwgbmFtZSwga2V5KSA9PiB7XHJcblx0aWYodmFsdWUgIT09IG51bGwgJiYgdHlwZW9mIHZhbHVlID09PSBcIm9iamVjdFwiKVxyXG5cdFx0cmV0dXJuO1xyXG5cclxuXHRjb25zdCB0eXBlID0gdmFsdWUgPT09IG51bGwgPyBcIm51bGxcIiA6IGBhICR7dHlwZW9mIHZhbHVlfWA7XHJcblx0dGhyb3cgbmV3IFR5cGVFcnJvcihgY2Fubm90IGRlc2NlbmQgaW50byBcIiR7bmFtZX1cIiBvZiBwYXRoIFwiJHtrZXl9XCIgLSAke3R5cGV9IGlzIG5vIG9iamVjdGApO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIE9uZSBwcm9wZXJ0eSBvZiBhbiBvYmplY3QsIGFkZHJlc3NlZCBieSBuYW1lLCB0b2dldGhlciB3aXRoIHRoZSBvYmplY3QgY2FycnlpbmcgaXQuXHJcbiAqXHJcbiAqIEJ1aWx0IHRocm91Z2gge0BsaW5rIE9iamVjdFByb3BlcnR5LmxvYWR9LCB3aGljaCB3YWxrcyBhIGRvdHRlZCBwYXRoIGFuZCBoYW5kcyBiYWNrIHRoZSBwcm9wZXJ0eSBhdFxyXG4gKiBpdHMgZW5kLlxyXG4gKlxyXG4gKiBAZXhhbXBsZVxyXG4gKiBjb25zdCBwcm9wZXJ0eSA9IE9iamVjdFByb3BlcnR5LmxvYWQoe2EgOiB7YiA6IDF9fSwgXCJhLmJcIik7XHJcbiAqIHByb3BlcnR5LnZhbHVlOyAgICAgIC8vIDFcclxuICogcHJvcGVydHkudmFsdWUgPSAyOyAgLy8gd3JpdGVzIGludG8gdGhlIG9iamVjdFxyXG4gKi9cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgT2JqZWN0UHJvcGVydHkge1xyXG5cdC8qKlxyXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgbmFtZSBvZiB0aGUgcHJvcGVydHlcclxuXHQgKiBAcGFyYW0ge29iamVjdH0gY29udGV4dCB0aGUgb2JqZWN0IGNhcnJ5aW5nIGl0XHJcblx0ICovXHJcblx0Y29uc3RydWN0b3Ioa2V5LCBjb250ZXh0KXtcclxuXHRcdHRoaXMua2V5ID0ga2V5O1xyXG5cdFx0dGhpcy5jb250ZXh0ID0gY29udGV4dDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFdoZXRoZXIgdGhlIGtleSBpcyByZWFjaGFibGUgb24gdGhlIGNvbnRleHQgYXQgYWxsLlxyXG5cdCAqXHJcblx0ICogVGhpcyBhbnN3ZXJzIGZvciB0aGUgd2hvbGUgcHJvdG90eXBlIGNoYWluLCBub3Qgb25seSBmb3Igb3duIHByb3BlcnRpZXMgLSBsb2FkKHt9LCBcInRvU3RyaW5nXCIpXHJcblx0ICogcmVwb3J0cyB0cnVlLiBUaGF0IGlzIGRlbGliZXJhdGU6IGEgcGF0aCBtYXkgYWRkcmVzcyBhIHByb3RvdHlwZSBhbmQgZXh0ZW5kIGl0LCBzbyBhbiBpbmhlcml0ZWRcclxuXHQgKiBrZXkgaXMgYSBrZXkgbGlrZSBhbnkgb3RoZXIgaGVyZS4gVXNlIGhhc1ZhbHVlIHRvIGFzayB3aGV0aGVyIHNvbWV0aGluZyBpcyBhY3R1YWxseSBzdG9yZWQuXHJcblx0ICpcclxuXHQgKiBAcmV0dXJucyB7Ym9vbGVhbn1cclxuXHQgKi9cclxuXHRnZXQga2V5RGVmaW5lZCgpe1xyXG5cdFx0cmV0dXJuIHRoaXMua2V5IGluIHRoaXMuY29udGV4dDtcclxuXHR9XHJcblx0XHJcblx0LyoqXHJcblx0ICogV2hldGhlciBzb21ldGhpbmcgaXMgc3RvcmVkIHVuZGVyIHRoZSBrZXkuIE9ubHkgdW5kZWZpbmVkIGNvdW50cyBhcyBub3RoaW5nIC0gMCwgXCJcIiwgZmFsc2UgYW5kXHJcblx0ICogbnVsbCBhcmUgdmFsdWVzLlxyXG5cdCAqXHJcblx0ICogQHJldHVybnMge2Jvb2xlYW59XHJcblx0ICovXHJcblx0Z2V0IGhhc1ZhbHVlKCl7XHJcblx0XHRyZXR1cm4gdHlwZW9mIHRoaXMuY29udGV4dFt0aGlzLmtleV0gIT09IFwidW5kZWZpbmVkXCI7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBAcmV0dXJucyB7Kn0gdGhlIHN0b3JlZCB2YWx1ZSwgdW5kZWZpbmVkIHdoZW4gdGhlcmUgaXMgbm9uZVxyXG5cdCAqL1xyXG5cdGdldCB2YWx1ZSgpe1xyXG5cdFx0cmV0dXJuIHRoaXMuY29udGV4dFt0aGlzLmtleV07XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBAcGFyYW0geyp9IGRhdGFcclxuXHQgKi9cclxuXHRzZXQgdmFsdWUoZGF0YSl7XHJcblx0XHR0aGlzLmNvbnRleHRbdGhpcy5rZXldID0gZGF0YTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEFkZHMgYSB2YWx1ZSBuZXh0IHRvIHdoYXQgaXMgYWxyZWFkeSB0aGVyZTogd3JpdGVzIGl0IHdoZW4gdGhlIGtleSBob2xkcyBub3RoaW5nLCB0dXJucyB0aGVcclxuXHQgKiB2YWx1ZSBpbnRvIGFuIGFycmF5IG9mIGJvdGggd2hlbiBpdCBob2xkcyBvbmUsIGFuZCBwdXNoZXMgb250byB0aGUgYXJyYXkgd2hlbiBpdCBob2xkcyBvbmVcclxuXHQgKiBhbHJlYWR5LlxyXG5cdCAqXHJcblx0ICogVGhlIHZhbHVlIGl0c2VsZiBpcyBub3QgbG9va2VkIGF0IC0gYXBwZW5kaW5nIHVuZGVmaW5lZCBwdXRzIHVuZGVmaW5lZCBpbnRvIHRoZSBhcnJheS5cclxuXHQgKlxyXG5cdCAqIEBwYXJhbSB7Kn0gZGF0YVxyXG5cdCAqXHJcblx0ICogQGV4YW1wbGVcclxuXHQgKiBwcm9wZXJ0eS5hcHBlbmQgPSAxOyAgIC8vIHtrZXkgOiAxfVxyXG5cdCAqIHByb3BlcnR5LmFwcGVuZCA9IDI7ICAgLy8ge2tleSA6IFsxLCAyXX1cclxuXHQgKiBwcm9wZXJ0eS5hcHBlbmQgPSAzOyAgIC8vIHtrZXkgOiBbMSwgMiwgM119XHJcblx0ICovXHJcblx0c2V0IGFwcGVuZChkYXRhKSB7XHJcblx0XHRpZighdGhpcy5oYXNWYWx1ZSlcclxuXHRcdFx0dGhpcy52YWx1ZSA9IGRhdGE7XHJcblx0XHRlbHNlIHtcclxuXHRcdFx0Y29uc3QgdmFsdWUgPSB0aGlzLnZhbHVlO1xyXG5cdFx0XHRpZih2YWx1ZSBpbnN0YW5jZW9mIEFycmF5KVxyXG5cdFx0XHRcdHZhbHVlLnB1c2goZGF0YSk7XHJcblx0XHRcdGVsc2VcclxuXHRcdFx0XHR0aGlzLnZhbHVlID0gW3RoaXMudmFsdWUsIGRhdGFdO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRGVsZXRlcyB0aGUga2V5IGZyb20gdGhlIG9iamVjdC4gRG9lcyBub3RoaW5nIHdoZW4gaXQgaXMgbm90IHRoZXJlLlxyXG5cdCAqXHJcblx0ICogQHJldHVybnMge3ZvaWR9XHJcblx0ICovXHJcblx0cmVtb3ZlKCl7XHJcblx0XHRkZWxldGUgdGhpcy5jb250ZXh0W3RoaXMua2V5XTtcclxuXHR9XHJcblx0XHJcblx0LyoqXHJcblx0ICogTG9hZHMgdGhlIHByb3BlcnR5IGEgZG90dGVkIHBhdGggYWRkcmVzc2VzLiBFdmVyeSBwYXJ0IG9mIHRoZSBwYXRoIGlzIHRyaW1tZWQsIHNvIFwiIGEgLiBiIFwiXHJcblx0ICogYWRkcmVzc2VzIHRoZSBzYW1lIHByb3BlcnR5IGFzIFwiYS5iXCIuXHJcblx0ICpcclxuXHQgKiBBIG1pc3Npbmcgc3RlcCBpcyBjcmVhdGVkIHdpdGggY3JlYXRlLCBvdGhlcndpc2UgdGhlIHBhdGggaXMgcmVwb3J0ZWQgYXMgbm90IGxvYWRhYmxlLiBBIHN0ZXBcclxuXHQgKiBob2xkaW5nIHNvbWV0aGluZyB0aGF0IGlzIG5vIG9iamVjdCBjYW5ub3QgYmUgd2Fsa2VkIGludG8gYXQgYWxsIC0gdGhhdCBpcyBhIGJyb2tlbiBwYXRoLCBub3QgYVxyXG5cdCAqIG1pc3Npbmcgb25lLCBhbmQgaXQgaXMgcmVwb3J0ZWQgYXMgYW4gZXJyb3IgcmVnYXJkbGVzcyBvZiBjcmVhdGUuXHJcblx0ICpcclxuXHQgKiBAcGFyYW0ge29iamVjdH0gZGF0YSB0aGUgb2JqZWN0IHRvIHdhbGtcclxuXHQgKiBAcGFyYW0ge3N0cmluZ30ga2V5IG5hbWUgb2YgdGhlIHByb3BlcnR5LCBhIGRvdHRlZCBwYXRoIGFkZHJlc3NlcyBhIG5lc3RlZCBvbmVcclxuXHQgKiBAcGFyYW0ge2Jvb2xlYW59IFtjcmVhdGU9dHJ1ZV0gY3JlYXRlIGEgbWlzc2luZyBzdGVwIG9uIHRoZSB3YXlcclxuXHQgKiBAcmV0dXJucyB7T2JqZWN0UHJvcGVydHl8bnVsbH0gbnVsbCB3aGVuIGEgc3RlcCBpcyBtaXNzaW5nIGFuZCBjcmVhdGUgaXMgZmFsc2VcclxuXHQgKiBAdGhyb3dzIHtUeXBlRXJyb3J9IHdoZW4gYSBzdGVwIG9mIHRoZSBwYXRoIGhvbGRzIHNvbWV0aGluZyB0aGF0IGlzIG5vIG9iamVjdFxyXG5cdCAqXHJcblx0ICogQGV4YW1wbGVcclxuXHQgKiBPYmplY3RQcm9wZXJ0eS5sb2FkKHthIDoge2IgOiAxfX0sIFwiYS5iXCIpLnZhbHVlOyAgIC8vIDFcclxuXHQgKiBPYmplY3RQcm9wZXJ0eS5sb2FkKHtsaXN0IDogWzEsIDJdfSwgXCJsaXN0LjFcIikudmFsdWU7ICAgLy8gMiwgYW4gYXJyYXkgaXMgYW4gb2JqZWN0XHJcblx0ICogT2JqZWN0UHJvcGVydHkubG9hZCh7fSwgXCJhLmJcIiwgZmFsc2UpOyAgICAgICAgICAgICAvLyBudWxsXHJcblx0ICogT2JqZWN0UHJvcGVydHkubG9hZCh7YSA6IDB9LCBcImEuYlwiKTsgICAgICAgICAgICAgICAvLyB0aHJvd3MsIDAgaXMgbm8gb2JqZWN0XHJcblx0ICovXHJcblx0c3RhdGljIGxvYWQoZGF0YSwga2V5LCBjcmVhdGU9dHJ1ZSkge1xyXG5cdFx0bGV0IGNvbnRleHQgPSBkYXRhO1xyXG5cdFx0Y29uc3Qga2V5cyA9IGtleS5zcGxpdChcIi5cIik7XHJcblx0XHRsZXQgbmFtZSA9IGtleXMuc2hpZnQoKS50cmltKCk7XHJcblx0XHR3aGlsZShrZXlzLmxlbmd0aCA+IDApe1xyXG5cdFx0XHRpZih0eXBlb2YgY29udGV4dFtuYW1lXSA9PT0gXCJ1bmRlZmluZWRcIiB8fCBjb250ZXh0W25hbWVdID09PSBudWxsKXtcclxuXHRcdFx0XHRpZighY3JlYXRlKVxyXG5cdFx0XHRcdFx0cmV0dXJuIG51bGw7XHJcblxyXG5cdFx0XHRcdGNvbnRleHRbbmFtZV0gPSB7fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRhc3NlcnREZXNjZW5kYWJsZShjb250ZXh0W25hbWVdLCBuYW1lLCBrZXkpO1xyXG5cdFx0XHRjb250ZXh0ID0gY29udGV4dFtuYW1lXTtcclxuXHRcdFx0bmFtZSA9IGtleXMuc2hpZnQoKS50cmltKCk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIG5ldyBPYmplY3RQcm9wZXJ0eShuYW1lLCBjb250ZXh0KTtcclxuXHR9XHJcbn07IiwiLyoqXHJcbiAqIFV0aWxpdGllcyB0byBpbnNwZWN0LCBjb21wYXJlLCBtZXJnZSBhbmQgZmlsdGVyIGphdmFzY3JpcHQgb2JqZWN0cy5cclxuICpcclxuICogU2V2ZXJhbCBmdW5jdGlvbnMgc2hhcmUgb25lIG5vdGlvbiBvZiBkYXRhOiBwcmltaXRpdmVzLCBzaW1wbGUgb2JqZWN0cywgQXJyYXksIERhdGUsIFJlZ0V4cCwgTWFwXHJcbiAqIGFuZCBTZXQuIHtAbGluayBpc1Bvam99IGRlY2lkZXMgd2hldGhlciBhIHZhbHVlIHN0YXlzIHdpdGhpbiBpdCwge0BsaW5rIGVxdWFsUG9qb30gY29tcGFyZXMgdGhvc2VcclxuICogdHlwZXMgYnkgdmFsdWUsIGFuZCB7QGxpbmsgbWVyZ2V9IHRyZWF0cyBldmVyeXRoaW5nIG91dHNpZGUgb2YgaXQgYXMgYSB2YWx1ZSB0byBiZSByZXBsYWNlZC5cclxuICpcclxuICogQG1vZHVsZSBPYmplY3RVdGlsc1xyXG4gKi9cclxuaW1wb3J0IE9iamVjdFByb3BlcnR5IGZyb20gXCIuL09iamVjdFByb3BlcnR5LmpzXCI7XHJcblxyXG4vKipcclxuICogQHByaXZhdGVcclxuICogQHBhcmFtIHtBcnJheX0gYVxyXG4gKiBAcGFyYW0ge0FycmF5fSBiXHJcbiAqIEBwYXJhbSB7V2Vha01hcH0gc2VlbiBwYWlycyBjdXJyZW50bHkgdW5kZXIgY29tcGFyaXNvblxyXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cclxuICovXHJcbmNvbnN0IGVxdWFsQXJyYXkgPSAoYSwgYiwgc2VlbikgPT4ge1xyXG5cdGlmIChhLmxlbmd0aCAhPT0gYi5sZW5ndGgpIHJldHVybiBmYWxzZTtcclxuXHJcblx0Y29uc3QgbGVuZ3RoID0gYS5sZW5ndGg7XHJcblx0Zm9yIChsZXQgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykgaWYgKCFpbnRlcm5hbEVxdWFsUG9qbyhhW2ldLCBiW2ldLCBzZWVuKSkgcmV0dXJuIGZhbHNlO1xyXG5cclxuXHRyZXR1cm4gdHJ1ZTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBBIHNldCBpcyB1bm9yZGVyZWQsIHNvIGV2ZXJ5IGVudHJ5IG9mIGEgaGFzIHRvIGZpbmQgaXRzIG93biBwYXJ0bmVyIGluIGIuXHJcbiAqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBwYXJhbSB7U2V0fSBhXHJcbiAqIEBwYXJhbSB7U2V0fSBiXHJcbiAqIEBwYXJhbSB7V2Vha01hcH0gc2VlbiBwYWlycyBjdXJyZW50bHkgdW5kZXIgY29tcGFyaXNvblxyXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cclxuICovXHJcbmNvbnN0IGVxdWFsU2V0ID0gKGEsIGIsIHNlZW4pID0+IHtcclxuXHRpZiAoYS5zaXplICE9PSBiLnNpemUpIHJldHVybiBmYWxzZTtcclxuXHJcblx0Y29uc3QgcmVtYWluaW5nID0gQXJyYXkuZnJvbShiKTtcclxuXHRmb3IgKGNvbnN0IGVudHJ5QSBvZiBhKSB7XHJcblx0XHRjb25zdCBpbmRleCA9IHJlbWFpbmluZy5maW5kSW5kZXgoKGVudHJ5QikgPT4gaW50ZXJuYWxFcXVhbFBvam8oZW50cnlBLCBlbnRyeUIsIHNlZW4pKTtcclxuXHRcdGlmIChpbmRleCA8IDApIHJldHVybiBmYWxzZTtcclxuXHJcblx0XHRyZW1haW5pbmcuc3BsaWNlKGluZGV4LCAxKTtcclxuXHR9XHJcblxyXG5cdHJldHVybiB0cnVlO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEEgbWFwIGlzIHVub3JkZXJlZCBhcyB3ZWxsIGFuZCBpdHMga2V5cyBtYXkgYmUgb2JqZWN0cywgc28gdGhlIGtleXMgZ2V0IGNvbXBhcmVkIGJ5IHZhbHVlIHRvby5cclxuICpcclxuICogQHByaXZhdGVcclxuICogQHBhcmFtIHtNYXB9IGFcclxuICogQHBhcmFtIHtNYXB9IGJcclxuICogQHBhcmFtIHtXZWFrTWFwfSBzZWVuIHBhaXJzIGN1cnJlbnRseSB1bmRlciBjb21wYXJpc29uXHJcbiAqIEByZXR1cm5zIHtib29sZWFufVxyXG4gKi9cclxuY29uc3QgZXF1YWxNYXAgPSAoYSwgYiwgc2VlbikgPT4ge1xyXG5cdGlmIChhLnNpemUgIT09IGIuc2l6ZSkgcmV0dXJuIGZhbHNlO1xyXG5cclxuXHRjb25zdCByZW1haW5pbmcgPSBBcnJheS5mcm9tKGIpO1xyXG5cdGZvciAoY29uc3QgW2tleUEsIHZhbHVlQV0gb2YgYSkge1xyXG5cdFx0Y29uc3QgaW5kZXggPSByZW1haW5pbmcuZmluZEluZGV4KChba2V5QiwgdmFsdWVCXSkgPT4gaW50ZXJuYWxFcXVhbFBvam8oa2V5QSwga2V5Qiwgc2VlbikgJiYgaW50ZXJuYWxFcXVhbFBvam8odmFsdWVBLCB2YWx1ZUIsIHNlZW4pKTtcclxuXHRcdGlmIChpbmRleCA8IDApIHJldHVybiBmYWxzZTtcclxuXHJcblx0XHRyZW1haW5pbmcuc3BsaWNlKGluZGV4LCAxKTtcclxuXHR9XHJcblxyXG5cdHJldHVybiB0cnVlO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENvbXBhcmVzIHR3byBvYmplY3RzIGJ5IHByb3RvdHlwZSBhbmQgYnkgdGhlaXIgb3duIGVudW1lcmFibGUgcHJvcGVydGllcy5cclxuICpcclxuICogQHByaXZhdGVcclxuICogQHBhcmFtIHtvYmplY3R9IGFcclxuICogQHBhcmFtIHtvYmplY3R9IGJcclxuICogQHBhcmFtIHtXZWFrTWFwfSBzZWVuIHBhaXJzIGN1cnJlbnRseSB1bmRlciBjb21wYXJpc29uXHJcbiAqIEByZXR1cm5zIHtib29sZWFufVxyXG4gKi9cclxuY29uc3QgZXF1YWxPYmplY3QgPSAoYSwgYiwgc2VlbikgPT4ge1xyXG5cdGlmIChPYmplY3QuZ2V0UHJvdG90eXBlT2YoYSkgIT09IE9iamVjdC5nZXRQcm90b3R5cGVPZihiKSkgcmV0dXJuIGZhbHNlO1xyXG5cclxuXHRjb25zdCBwcm9wZXJ0aWVzQSA9IE9iamVjdC5rZXlzKGEpO1xyXG5cdGNvbnN0IHByb3BlcnRpZXNCID0gT2JqZWN0LmtleXMoYik7XHJcblx0aWYgKHByb3BlcnRpZXNBLmxlbmd0aCAhPT0gcHJvcGVydGllc0IubGVuZ3RoKSByZXR1cm4gZmFsc2U7XHJcblxyXG5cdGZvciAoY29uc3Qga2V5IG9mIHByb3BlcnRpZXNBKSB7XHJcblx0XHQvLyBlcXVhbCBrZXkgY291bnRzIGFsb25lIHdvdWxkIGxldCB7eDoxLCB5OnVuZGVmaW5lZH0gcGFzcyBhZ2FpbnN0IHt4OjEsIHo6dW5kZWZpbmVkfVxyXG5cdFx0aWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoYiwga2V5KSkgcmV0dXJuIGZhbHNlO1xyXG5cdFx0aWYgKCFpbnRlcm5hbEVxdWFsUG9qbyhhW2tleV0sIGJba2V5XSwgc2VlbikpIHJldHVybiBmYWxzZTtcclxuXHR9XHJcblxyXG5cdHJldHVybiB0cnVlO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEEgY3ljbGljIHN0cnVjdHVyZSBjYW4gb25seSBiZSBkZWNpZGVkIGNvLWluZHVjdGl2ZWx5OiBhIHBhaXIgYWxyZWFkeSB1bmRlciBjb21wYXJpc29uIGNvdW50cyBhc1xyXG4gKiBlcXVhbCwgb3RoZXJ3aXNlIHRoZSB3YWxrIHdvdWxkIG5ldmVyIGNvbWUgYmFjay5cclxuICpcclxuICogQHByaXZhdGVcclxuICogQHBhcmFtIHtXZWFrTWFwfSBzZWVuIHBhaXJzIGN1cnJlbnRseSB1bmRlciBjb21wYXJpc29uXHJcbiAqIEBwYXJhbSB7b2JqZWN0fSBhXHJcbiAqIEBwYXJhbSB7b2JqZWN0fSBiXHJcbiAqIEByZXR1cm5zIHtib29sZWFufSB0cnVlIHdoZW4gdGhpcyBwYWlyIGlzIGFscmVhZHkgYmVpbmcgY29tcGFyZWQgZnVydGhlciB1cCB0aGUgc3RhY2tcclxuICovXHJcbmNvbnN0IGlzQ29tcGFyaW5nID0gKHNlZW4sIGEsIGIpID0+IHtcclxuXHRjb25zdCBwYXJ0bmVycyA9IHNlZW4uZ2V0KGEpO1xyXG5cdHJldHVybiAhIXBhcnRuZXJzICYmIHBhcnRuZXJzLmhhcyhiKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBOb3RlcyBhIHBhaXIgYXMgYmVpbmcgY29tcGFyZWQsIHNvIGEgY3ljbGUgcnVubmluZyB0aHJvdWdoIGl0IHRlcm1pbmF0ZXMuXHJcbiAqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBwYXJhbSB7V2Vha01hcH0gc2VlbiBwYWlycyBjdXJyZW50bHkgdW5kZXIgY29tcGFyaXNvblxyXG4gKiBAcGFyYW0ge29iamVjdH0gYVxyXG4gKiBAcGFyYW0ge29iamVjdH0gYlxyXG4gKiBAcmV0dXJucyB7dm9pZH1cclxuICovXHJcbmNvbnN0IHJlbWVtYmVyQ29tcGFyaW5nID0gKHNlZW4sIGEsIGIpID0+IHtcclxuXHRjb25zdCBwYXJ0bmVycyA9IHNlZW4uZ2V0KGEpO1xyXG5cdGlmIChwYXJ0bmVycykgcGFydG5lcnMuYWRkKGIpO1xyXG5cdGVsc2Ugc2Vlbi5zZXQoYSwgbmV3IFdlYWtTZXQoW2JdKSk7XHJcbn07XHJcblxyXG4vKipcclxuICogQ2hlY2tzIHdoZXRoZXIgYSB2YWx1ZSBpcyBudWxsIG9yIHVuZGVmaW5lZC5cclxuICpcclxuICogVmFsdWVIZWxwZXIubm9WYWx1ZSBhbnN3ZXJzIHRoZSBzYW1lIHF1ZXN0aW9uLiBCb3RoIGFyZSBrZXB0IG9uIHB1cnBvc2UsIHNvIFZhbHVlSGVscGVyIHN0YXlzIGZyZWVcclxuICogb2YgYSBkZXBlbmRlbmN5IG9uIHRoaXMgbW9kdWxlIC0gc2VlIHRoZSBub3RlIHRoZXJlLlxyXG4gKlxyXG4gKiBAcGFyYW0geyp9IG9iamVjdCB0aGUgdmFsdWUgdG8gYmUgdGVzdGluZ1xyXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cclxuICovXHJcbmV4cG9ydCBjb25zdCBpc051bGxPclVuZGVmaW5lZCA9IChvYmplY3QpID0+IHtcclxuXHRyZXR1cm4gb2JqZWN0ID09IG51bGwgfHwgdHlwZW9mIG9iamVjdCA9PT0gXCJ1bmRlZmluZWRcIjtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDaGVja3Mgd2hldGhlciBhIHZhbHVlIGlzIGEgcHJpbWl0aXZlLlxyXG4gKlxyXG4gKiBudWxsIGFuZCB1bmRlZmluZWQgY291bnQgYXMgcHJpbWl0aXZlcy4gQSBzeW1ib2wgZG9lcyBub3QgLSBpdCBpcyB0cmVhdGVkIGFzIGFuIG9wYXF1ZSB2YWx1ZVxyXG4gKiB0aHJvdWdob3V0IHRoaXMgbW9kdWxlLCBzbyB0aGF0IHtAbGluayBpc1Bvam99IGtlZXBzIHJlamVjdGluZyBpdCBhcyBkYXRhLlxyXG4gKlxyXG4gKiBAcGFyYW0geyp9IG9iamVjdCB0aGUgdmFsdWUgdG8gYmUgdGVzdGluZ1xyXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cclxuICovXHJcbmV4cG9ydCBjb25zdCBpc1ByaW1pdGl2ZSA9IChvYmplY3QpID0+IHtcclxuXHRpZiAob2JqZWN0ID09IG51bGwpIHJldHVybiB0cnVlO1xyXG5cclxuXHRjb25zdCB0eXBlID0gdHlwZW9mIG9iamVjdDtcclxuXHRzd2l0Y2ggKHR5cGUpIHtcclxuXHRcdGNhc2UgXCJudW1iZXJcIjpcclxuXHRcdGNhc2UgXCJiaWdpbnRcIjpcclxuXHRcdGNhc2UgXCJib29sZWFuXCI6XHJcblx0XHRjYXNlIFwic3RyaW5nXCI6XHJcblx0XHRjYXNlIFwidW5kZWZpbmVkXCI6XHJcblx0XHRcdHJldHVybiB0cnVlO1xyXG5cdH1cclxuXHJcblx0cmV0dXJuIGZhbHNlO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENoZWNrcyB3aGV0aGVyIGEgdmFsdWUgaXMgYW4gb2JqZWN0LlxyXG4gKlxyXG4gKiBFdmVyeSBvYmplY3QgY291bnRzLCBBcnJheSwgTWFwLCBEYXRlIGFuZCBjbGFzcyBpbnN0YW5jZXMgaW5jbHVkZWQuIFVzZSB7QGxpbmsgaXNQb2pvfSB0byBhc2sgZm9yXHJcbiAqIGEgc2ltcGxlIGRhdGEgb2JqZWN0IGluc3RlYWQuXHJcbiAqXHJcbiAqIEBwYXJhbSB7Kn0gb2JqZWN0IHRoZSB2YWx1ZSB0byBiZSB0ZXN0aW5nXHJcbiAqIEByZXR1cm5zIHtib29sZWFufVxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IGlzT2JqZWN0ID0gKG9iamVjdCkgPT4ge1xyXG5cdGlmIChpc051bGxPclVuZGVmaW5lZChvYmplY3QpKSByZXR1cm4gZmFsc2U7XHJcblxyXG5cdHJldHVybiB0eXBlb2Ygb2JqZWN0ID09PSBcIm9iamVjdFwiO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENvbXBhcmVzIHR3byB2YWx1ZXMgYnkgdmFsdWUuXHJcbiAqXHJcbiAqIFRoZSB0eXBlcyBjb21wYXJlZCBieSB2YWx1ZSBhcmUgdGhlIG9uZXMge0BsaW5rIGlzUG9qb30gYWNjZXB0cyBhcyBkYXRhOiBwcmltaXRpdmVzLCBzaW1wbGVcclxuICogb2JqZWN0cywgQXJyYXksIERhdGUsIFJlZ0V4cCwgTWFwIGFuZCBTZXQuIEEgRGF0ZSBpcyBjb21wYXJlZCBieSBpdHMgdGltZSwgYSBSZWdFeHAgYnkgc291cmNlIGFuZFxyXG4gKiBmbGFncy4gU2V0IGFuZCBNYXAgYXJlIHVub3JkZXJlZCwgc28gdGhlaXIgZW50cmllcyBhcmUgbWF0Y2hlZCBieSB2YWx1ZSBpbnN0ZWFkIG9mIGJ5IHBvc2l0aW9uLFxyXG4gKiBhbmQgdGhlIGtleXMgb2YgYSBNYXAgdGFrZSBwYXJ0IGluIHRoYXQgY29tcGFyaXNvbi5cclxuICpcclxuICogU2ltcGxlIG9iamVjdHMgYW5kIGNsYXNzIGluc3RhbmNlcyBuZWVkIHRoZSBzYW1lIHByb3RvdHlwZSBhbmQgdGhlIHNhbWUgb3duIGVudW1lcmFibGVcclxuICogcHJvcGVydGllcy4gRXZlcnkgb3RoZXIgb2JqZWN0IC0gRXJyb3IsIFByb21pc2UsIFdlYWtNYXAgYW5kIHRoZSBsaWtlIC0ga2VlcHMgaXRzIHN0YXRlIG91dCBvZlxyXG4gKiByZWFjaCwgc28gdGhvc2UgY29tcGFyZSBieSBpZGVudGl0eSBvbmx5LiBGdW5jdGlvbnMgYW5kIHN5bWJvbHMgZG8gYXMgd2VsbC5cclxuICpcclxuICogQ3ljbGljIHN0cnVjdHVyZXMgYXJlIHN1cHBvcnRlZC5cclxuICpcclxuICogQHBhcmFtIHsqfSBhXHJcbiAqIEBwYXJhbSB7Kn0gYlxyXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cclxuICpcclxuICogQGV4YW1wbGVcclxuICogZXF1YWxQb2pvKHthIDogWzEsIDJdfSwge2EgOiBbMSwgMl19KTsgICAgICAgICAgICAgICAvLyB0cnVlXHJcbiAqIGVxdWFsUG9qbyhuZXcgU2V0KFsxLCAyXSksIG5ldyBTZXQoWzIsIDFdKSk7ICAgICAgICAgLy8gdHJ1ZSwgYSBzZXQgaXMgdW5vcmRlcmVkXHJcbiAqIGVxdWFsUG9qbyhuZXcgRGF0ZSgwKSwgbmV3IERhdGUoMSkpOyAgICAgICAgICAgICAgICAgLy8gZmFsc2VcclxuICogZXF1YWxQb2pvKG5ldyBFcnJvcihcInhcIiksIG5ldyBFcnJvcihcInhcIikpOyAgICAgICAgICAgLy8gZmFsc2UsIGNvbXBhcmVkIGJ5IGlkZW50aXR5XHJcbiAqL1xyXG5leHBvcnQgY29uc3QgZXF1YWxQb2pvID0gKGEsIGIpID0+IGludGVybmFsRXF1YWxQb2pvKGEsIGIsIG5ldyBXZWFrTWFwKCkpO1xyXG5cclxuXHJcbi8qKlxyXG4qIEBwYXJhbSB7Kn0gYVxyXG4gKiBAcGFyYW0geyp9IGJcclxuICogQHBhcmFtIHtXZWFrTWFwfSBzZWVuIGludGVybmFsLCB0cmFja3MgdGhlIHBhaXJzIGN1cnJlbnRseSB1bmRlciBjb21wYXJpc29uXHJcbiAqIEByZXR1cm5zIHtib29sZWFufVxyXG4gKi9cclxuY29uc3QgaW50ZXJuYWxFcXVhbFBvam8gPSAoYSwgYiwgc2VlbikgPT4ge1xyXG5cdGlmIChpc051bGxPclVuZGVmaW5lZChhKSB8fCBpc051bGxPclVuZGVmaW5lZChiKSkgcmV0dXJuIGEgPT09IGI7XHJcblx0aWYgKGEgPT09IGIpIHJldHVybiB0cnVlO1xyXG5cdGlmIChpc1ByaW1pdGl2ZShhKSB8fCBpc1ByaW1pdGl2ZShiKSkgcmV0dXJuIGEgPT09IGI7XHJcblxyXG5cdGNvbnN0IHR5cGVBID0gdHlwZW9mIGE7XHJcblx0aWYgKHR5cGVBICE9PSB0eXBlb2YgYikgcmV0dXJuIGZhbHNlO1xyXG5cdGlmICh0eXBlQSAhPT0gXCJvYmplY3RcIikgcmV0dXJuIGEgPT09IGI7IC8vIGZ1bmN0aW9uIGFuZCBzeW1ib2xcclxuXHJcblx0aWYgKGlzQ29tcGFyaW5nKHNlZW4sIGEsIGIpKSByZXR1cm4gdHJ1ZTtcclxuXHRyZW1lbWJlckNvbXBhcmluZyhzZWVuLCBhLCBiKTtcclxuXHJcblx0aWYoYSBpbnN0YW5jZW9mIERhdGUpIHJldHVybiAgYiBpbnN0YW5jZW9mIERhdGUgPyBPYmplY3QuaXMoYS5nZXRUaW1lKCksIGIuZ2V0VGltZSgpKSA6IGZhbHNlO1xyXG5cdGVsc2UgaWYoYSBpbnN0YW5jZW9mIFJlZ0V4cCkgcmV0dXJuIGIgaW5zdGFuY2VvZiBSZWdFeHAgPyAoYS5zb3VyY2UgPT09IGIuc291cmNlICYmIGEuZmxhZ3MgPT09IGIuZmxhZ3MpIDogZmFsc2U7XHJcblx0ZWxzZSBpZihhIGluc3RhbmNlb2YgQXJyYXkpIHJldHVybiBiIGluc3RhbmNlb2YgQXJyYXkgPyBlcXVhbEFycmF5KGEsIGIsIHNlZW4pIDogZmFsc2U7XHJcblx0ZWxzZSBpZihhIGluc3RhbmNlb2YgU2V0KSByZXR1cm4gYiBpbnN0YW5jZW9mIFNldCA/IGVxdWFsU2V0KGEsIGIsIHNlZW4pIDogZmFsc2U7XHJcblx0ZWxzZSBpZihhIGluc3RhbmNlb2YgTWFwKSByZXR1cm4gYiBpbnN0YW5jZW9mIE1hcCA/IGVxdWFsTWFwKGEsIGIsIHNlZW4pIDogZmFsc2U7XHJcblx0ZWxzZSBpZiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGEpICE9PSBcIltvYmplY3QgT2JqZWN0XVwiKSByZXR1cm4gZmFsc2U7XHRcclxuXHRlbHNlIHJldHVybiBlcXVhbE9iamVjdChhLCBiLCBzZWVuKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBBIHBsYWluIG9iamVjdCBvd25zIGVpdGhlciBubyBwcm90b3R5cGUgYXQgYWxsIG9yIGEgcHJvdG90eXBlIHRoYXQgaXRzZWxmIGhhcyBub25lLiBDaGVja2luZyB0aGVcclxuICogY2hhaW4gbGVuZ3RoIGluc3RlYWQgb2YgY29tcGFyaW5nIGFnYWluc3QgT2JqZWN0LnByb3RvdHlwZSBrZWVwcyB0aGlzIHdvcmtpbmcgYWNyb3NzIHJlYWxtcyxcclxuICogd2hlcmUgYW4gaWZyYW1lIGJyaW5ncyBpdHMgb3duIE9iamVjdC5wcm90b3R5cGUuXHJcbiAqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBwYXJhbSB7Kn0gb2JqZWN0XHJcbiAqIEByZXR1cm5zIHtib29sZWFufVxyXG4gKi9cclxuY29uc3QgaXNQbGFpbk9iamVjdCA9IChvYmplY3QpID0+IHtcclxuXHRpZiAob2JqZWN0ID09PSBudWxsIHx8IHR5cGVvZiBvYmplY3QgIT09IFwib2JqZWN0XCIpIHJldHVybiBmYWxzZTtcclxuXHRjb25zdCBwcm90b3R5cGUgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2Yob2JqZWN0KTtcclxuXHRyZXR1cm4gcHJvdG90eXBlID09PSBudWxsIHx8IE9iamVjdC5nZXRQcm90b3R5cGVPZihwcm90b3R5cGUpID09PSBudWxsO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFdhbGtzIGEgdmFsdWUgYW5kIGRlY2lkZXMgd2hldGhlciBldmVyeXRoaW5nIHJlYWNoYWJsZSBmcm9tIGl0IGlzIGRhdGEuXHJcbiAqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBwYXJhbSB7Kn0gdmFsdWVcclxuICogQHBhcmFtIHtXZWFrU2V0fSBbc2Vlbl0gdmFsdWVzIGFscmVhZHkgd2Fsa2VkLCBjbG9zZXMgY3ljbGVzXHJcbiAqIEByZXR1cm5zIHtib29sZWFufVxyXG4gKi9cclxuY29uc3QgaXNEYXRhVmFsdWUgPSAodmFsdWUsIHNlZW4gPSBuZXcgV2Vha1NldCgpKSA9PiB7XHJcblx0aWYgKGlzUHJpbWl0aXZlKHZhbHVlKSkgcmV0dXJuIHRydWU7XHJcblx0ZWxzZSBpZiAodmFsdWUgaW5zdGFuY2VvZiBEYXRlKSByZXR1cm4gdHJ1ZTtcclxuXHRlbHNlIGlmICh2YWx1ZSBpbnN0YW5jZW9mIFJlZ0V4cCkgcmV0dXJuIHRydWU7XHJcblxyXG5cdGlmIChzZWVuLmhhcyh2YWx1ZSkpIHJldHVybiB0cnVlO1xyXG5cdHNlZW4uYWRkKHZhbHVlKTtcclxuXHJcblx0aWYgKHZhbHVlIGluc3RhbmNlb2YgQXJyYXkpIHJldHVybiB2YWx1ZS5ldmVyeSgoZW50cnkpID0+IGlzRGF0YVZhbHVlKGVudHJ5LCBzZWVuKSk7XHJcblx0ZWxzZSBpZiAodmFsdWUgaW5zdGFuY2VvZiBNYXApIHtcclxuXHRcdGZvciAoY29uc3QgW2tleSwgZW50cnldIG9mIHZhbHVlKSB7XHJcblx0XHRcdGlmICghaXNEYXRhVmFsdWUoa2V5LCBzZWVuKSB8fCAhaXNEYXRhVmFsdWUoZW50cnksIHNlZW4pKSByZXR1cm4gZmFsc2U7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gdHJ1ZTtcclxuXHR9IGVsc2UgaWYgKHZhbHVlIGluc3RhbmNlb2YgU2V0KSB7XHJcblx0XHRmb3IgKGNvbnN0IGVudHJ5IG9mIHZhbHVlKSB7XHJcblx0XHRcdGlmICghaXNEYXRhVmFsdWUoZW50cnksIHNlZW4pKSByZXR1cm4gZmFsc2U7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gdHJ1ZTtcclxuXHR9IGVsc2UgaWYgKCFpc1BsYWluT2JqZWN0KHZhbHVlKSlcclxuXHRcdHJldHVybiBmYWxzZTsgLy8gY2xhc3MgaW5zdGFuY2VzIGFuZCBldmVyeSBvdGhlciBleG90aWMgb2JqZWN0XHJcblx0ZWxzZSB7XHJcblx0XHRmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyh2YWx1ZSkpIHtcclxuXHRcdFx0aWYgKCFpc0RhdGFWYWx1ZSh2YWx1ZVtrZXldLCBzZWVuKSkgcmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB0cnVlO1xyXG5cdH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBDaGVja3Mgd2hldGhlciBhbiBvYmplY3QgaXMgYSBwdXJlIGRhdGEgb2JqZWN0LlxyXG4gKlxyXG4gKiBUaGUgb2JqZWN0IGl0c2VsZiBoYXMgdG8gYmUgYSBzaW1wbGUgb2JqZWN0IC0gbm8gQXJyYXksIE1hcCBvciBzb21ldGhpbmcgZWxzZS4gRXZlcnkgdmFsdWVcclxuICogcmVhY2hhYmxlIGZyb20gaXQgaGFzIHRvIGJlIGRhdGEgYXMgd2VsbDogcHJpbWl0aXZlcywgc2ltcGxlIG9iamVjdHMsIEFycmF5LCBEYXRlLCBSZWdFeHAsIE1hcCBvclxyXG4gKiBTZXQuIEZ1bmN0aW9ucyBhbmQgY2xhc3MgaW5zdGFuY2VzIGFyZSByZWplY3RlZCBhdCBhbnkgZGVwdGgsIGluY2x1ZGluZyBpbnNpZGUgYXJyYXlzIGFuZCBpbnNpZGVcclxuICogdGhlIGtleXMgYW5kIHZhbHVlcyBvZiBhIE1hcCBvciBTZXQuXHJcbiAqXHJcbiAqIE9ubHkgb3duIGVudW1lcmFibGUgcHJvcGVydGllcyBhcmUgaW5zcGVjdGVkLiBDeWNsaWMgcmVmZXJlbmNlcyBhcmUgYWxsb3dlZC5cclxuICpcclxuICogQHBhcmFtIHsqfSBvYmplY3QgdGhlIG9iamVjdCB0byBiZSB0ZXN0aW5nXHJcbiAqIEByZXR1cm5zIHtib29sZWFufVxyXG4gKlxyXG4gKiBAZXhhbXBsZVxyXG4gKiBpc1Bvam8oe2EgOiB7YiA6IFsxLCBuZXcgRGF0ZSgpXX19KTsgICAvLyB0cnVlXHJcbiAqIGlzUG9qbyh7YSA6ICgpID0+IHt9fSk7ICAgICAgICAgICAgICAgIC8vIGZhbHNlLCBhIGZ1bmN0aW9uIGlzIG5vIGRhdGFcclxuICogaXNQb2pvKHthIDogW3tiIDogbmV3IEZvbygpfV19KTsgICAgICAgLy8gZmFsc2UsIHJlamVjdGVkIGF0IGFueSBkZXB0aFxyXG4gKiBpc1Bvam8oW10pOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBmYWxzZSwgdGhlIG9iamVjdCBpdHNlbGYgaGFzIHRvIGJlIGEgc2ltcGxlIG9uZVxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IGlzUG9qbyA9IChvYmplY3QpID0+IHtcclxuXHRpZiAoaXNOdWxsT3JVbmRlZmluZWQob2JqZWN0KSB8fCAhaXNQbGFpbk9iamVjdChvYmplY3QpKSByZXR1cm4gZmFsc2U7XHJcblxyXG5cdHJldHVybiBpc0RhdGFWYWx1ZShvYmplY3QpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEFwcGVuZHMgYSBwcm9wZXJ0eSB2YWx1ZSB0byBhbiBvYmplY3QuIElmIHRoZSBwcm9wZXJ0eSBhbHJlYWR5IGhvbGRzIGEgdmFsdWUsIGl0IGlzIGNvbnZlcnRlZFxyXG4gKiBpbnRvIGFuIGFycmF5IGNhcnJ5aW5nIGJvdGguIEFuIHVuZGVmaW5lZCB2YWx1ZSBpcyBpZ25vcmVkLlxyXG4gKlxyXG4gKiBUaGUga2V5IG1heSBhZGRyZXNzIGEgbmVzdGVkIHByb3BlcnR5IGJ5IGEgZG90dGVkIHBhdGgsIG1pc3Npbmcgc3RlcHMgYXJlIGNyZWF0ZWQgb24gdGhlIHdheS5cclxuICpcclxuICogQHBhcmFtIHtzdHJpbmd9IGFLZXkgbmFtZSBvZiB0aGUgcHJvcGVydHksIGEgZG90dGVkIHBhdGggYWRkcmVzc2VzIGEgbmVzdGVkIG9uZVxyXG4gKiBAcGFyYW0geyp9IGFEYXRhIHByb3BlcnR5IHZhbHVlXHJcbiAqIEBwYXJhbSB7b2JqZWN0fSBhT2JqZWN0IHRoZSBvYmplY3QgdG8gYXBwZW5kIHRoZSBwcm9wZXJ0eSB0b1xyXG4gKiBAcmV0dXJucyB7b2JqZWN0fSB0aGUgY2hhbmdlZCBvYmplY3RcclxuICpcclxuICogQGV4YW1wbGVcclxuICogYXBwZW5kKFwiYVwiLCAxLCB7fSk7ICAgICAgICAgICAgIC8vIHthIDogMX1cclxuICogYXBwZW5kKFwiYVwiLCAyLCB7YSA6IDF9KTsgICAgICAgIC8vIHthIDogWzEsIDJdfVxyXG4gKiBhcHBlbmQoXCJhLmJcIiwgMSwge30pOyAgICAgICAgICAgLy8ge2EgOiB7YiA6IDF9fVxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IGFwcGVuZCA9IChhS2V5LCBhRGF0YSwgYU9iamVjdCkgPT4ge1xyXG5cdGlmICh0eXBlb2YgYURhdGEgIT09IFwidW5kZWZpbmVkXCIpIHtcclxuXHRcdGNvbnN0IHByb3BlcnR5ID0gT2JqZWN0UHJvcGVydHkubG9hZChhT2JqZWN0LCBhS2V5LCB0cnVlKTtcclxuXHRcdHByb3BlcnR5LmFwcGVuZCA9IGFEYXRhO1xyXG5cdH1cclxuXHRyZXR1cm4gYU9iamVjdDtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBPd24gZW51bWVyYWJsZSBrZXlzLCBzdHJpbmdzIGFuZCBzeW1ib2xzIGFsaWtlIC0gdGhlIHNhbWUgc2V0IE9iamVjdC5hc3NpZ24gY29waWVzLlxyXG4gKlxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAcGFyYW0geyp9IHNvdXJjZVxyXG4gKiBAcmV0dXJucyB7QXJyYXk8c3RyaW5nfHN5bWJvbD59XHJcbiAqL1xyXG5jb25zdCBhc3NpZ25hYmxlS2V5cyA9IChzb3VyY2UpID0+IHtcclxuXHRjb25zdCBvYmplY3QgPSBPYmplY3Qoc291cmNlKTtcclxuXHRyZXR1cm4gUmVmbGVjdC5vd25LZXlzKG9iamVjdCkuZmlsdGVyKChrZXkpID0+IE9iamVjdC5wcm90b3R5cGUucHJvcGVydHlJc0VudW1lcmFibGUuY2FsbChvYmplY3QsIGtleSkpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIE1lcmdlcyBvYmplY3RzIGludG8gYSB0YXJnZXQgb2JqZWN0IC0gYSByZWN1cnNpdmUgT2JqZWN0LmFzc2lnbi4gSXQgc3RlcHMgaW50byBvYmplY3RzIGFuZCBzdWJcclxuICogb2JqZWN0cy4gRXZlcnkgb3RoZXIgdmFsdWUgaXMgcmVwbGFjZWQgYnkgdGhlIHZhbHVlIGZyb20gdGhlIHNvdXJjZSBvYmplY3QuXHJcbiAqXHJcbiAqIExpa2UgT2JqZWN0LmFzc2lnbiBpdCBjb3BpZXMgb3duIGVudW1lcmFibGUgcHJvcGVydGllcyAtIHN0cmluZyBhbmQgc3ltYm9sIGtleXMgYWxpa2UgLSwgaWdub3Jlc1xyXG4gKiBudWxsIGFuZCB1bmRlZmluZWQgc291cmNlcyBhbmQgcmV0dXJucyB0aGUgdGFyZ2V0LiBVbmxpa2UgT2JqZWN0LmFzc2lnbiBpdCBzdGVwcyBpbnRvIGEgcHJvcGVydHlcclxuICogd2hlbiB0YXJnZXQgYW5kIHNvdXJjZSBib3RoIGhvbGQgYW4gb2JqZWN0LCBpbnN0ZWFkIG9mIHJlcGxhY2luZyBpdC5cclxuICpcclxuICogQSBjbGFzcyBpbnN0YW5jZSBjb3VudHMgYXMgYW4gb2JqZWN0IGhlcmUgYW5kIGlzIG1lcmdlZCBwcm9wZXJ0eSBieSBwcm9wZXJ0eSBqdXN0IGxpa2UgYSBzaW1wbGVcclxuICogb25lLiBUaGUgdGFyZ2V0IGtlZXBzIGl0cyBvd24gcHJvdG90eXBlLCBvbmx5IHRoZSBwcm9wZXJ0aWVzIG9mIHRoZSBzb3VyY2UgYXJlIGFwcGxpZWQgdG8gaXQgLSBhXHJcbiAqIG1lcmdlIG5ldmVyIHR1cm5zIHRoZSB0YXJnZXQgaW50byBhbiBpbnN0YW5jZSBvZiB0aGUgY2xhc3Mgb2YgdGhlIHNvdXJjZS5cclxuICpcclxuICogQW4gQXJyYXksIFNldCwgTWFwLCBEYXRlIG9yIFJlZ0V4cCBpcyBhbHdheXMgcmVwbGFjZWQgYXMgYSB3aG9sZSwgbmV2ZXIgbWVyZ2VkIGVudHJ5IGJ5IGVudHJ5LlxyXG4gKiBUaGF0IGFscmVhZHkgYXBwbGllcyB3aGVuIG9ubHkgb25lIG9mIGJvdGggc2lkZXMgaG9sZHMgb25lLiBUaGUgcmVzdWx0IHRoZXJlZm9yZSBjYXJyaWVzIHRoZVxyXG4gKiBjb250YWluZXIgb2YgdGhlIHNvdXJjZSB3aXRoIGl0cyBvd24gbGVuZ3RoIC0gbm90aGluZyBvZiB0aGUgdGFyZ2V0IHN1cnZpdmVzIGl0LCBub3QgZXZlbiBhblxyXG4gKiBvYmplY3Qgc2l0dGluZyBhdCB0aGUgc2FtZSBpbmRleCBvciB1bmRlciB0aGUgc2FtZSBrZXkuXHJcbiAqXHJcbiAqIEEga2V5IHdob3NlIHZhbHVlIGlzIGEgc3ltYm9sIGlzIHNraXBwZWQsIG9uIHRoZSB0YXJnZXQgc2lkZSBhcyB3ZWxsIGFzIG9uIHRoZSBzb3VyY2Ugc2lkZS4gQVxyXG4gKiBzeW1ib2wgY2FycmllcyBubyBkYXRhLCBzbyBzdWNoIGEgcHJvcGVydHkgaXMgbGVmdCB1bnRvdWNoZWQuXHJcbiAqXHJcbiAqIFRoZSBrZXkgX19wcm90b19fIGlzIHNraXBwZWQuIE9iamVjdC5hc3NpZ24gd291bGQgb25seSByZXBvaW50IHRoZSBwcm90b3R5cGUgb2YgdGhlIHRhcmdldCwgYnV0XHJcbiAqIG1lcmdpbmcgaW50byBpdCB3b3VsZCB3YWxrIGludG8gT2JqZWN0LnByb3RvdHlwZSBhbmQgbGVhayBpbnRvIGV2ZXJ5IG9iamVjdC5cclxuICpcclxuICogVGhlIHRhcmdldCBpcyBtb2RpZmllZCBpbiBwbGFjZS4gQSBzdWIgb2JqZWN0IG9mIGEgc291cmNlIHRoYXQgaGFzIG5vIGNvdW50ZXJwYXJ0IGluIHRoZSB0YXJnZXQgaXNcclxuICogdGFrZW4gb3ZlciBieSByZWZlcmVuY2UsIGp1c3QgbGlrZSBPYmplY3QuYXNzaWduIGRvZXMuXHJcbiAqXHJcbiAqIEBwYXJhbSB7b2JqZWN0fSB0YXJnZXQgdGhlIHRhcmdldCBvYmplY3QgdG8gbWVyZ2UgaW50bywgYSBuZXcgb2JqZWN0IHdoZW4gZmFsc3lcclxuICogQHBhcmFtIHsuLi5vYmplY3R9IHNvdXJjZXMgdGhlIHNvdXJjZSBvYmplY3RzLCBhcHBsaWVkIGluIG9yZGVyXHJcbiAqIEByZXR1cm5zIHtvYmplY3R9IHRoZSB0YXJnZXQgb2JqZWN0XHJcbiAqXHJcbiAqIEBleGFtcGxlXHJcbiAqIG1lcmdlKHthIDogMX0sIHtiIDogMn0pOyAgICAgICAgICAgICAgICAgICAgICAgICAgLy8ge2EgOiAxLCBiIDogMn1cclxuICogbWVyZ2Uoe2EgOiB7eCA6IDF9fSwge2EgOiB7eSA6IDJ9fSk7ICAgICAgICAgICAgICAvLyB7YSA6IHt4IDogMSwgeSA6IDJ9fVxyXG4gKiBtZXJnZSh7YSA6IFsxLCAyLCAzXX0sIHthIDogWzldfSk7ICAgICAgICAgICAgICAgIC8vIHthIDogWzldfSwgcmVwbGFjZWQgYXMgYSB3aG9sZVxyXG4gKiBtZXJnZSh7YSA6IG5ldyBGb28oMSl9LCB7YSA6IG5ldyBCYXIoMil9KTsgICAgICAgIC8vIGEgc3RheXMgYSBGb28sIGNhcnJ5aW5nIHRoZSBwcm9wZXJ0aWVzIG9mIGJvdGhcclxuICogbWVyZ2Uoe30sIHNvdXJjZTEsIHNvdXJjZTIsIHNvdXJjZTMpO1xyXG4gKi9cclxuZXhwb3J0IGNvbnN0IG1lcmdlID0gKHRhcmdldCwgLi4uc291cmNlcykgPT4ge1xyXG5cdGlmICghdGFyZ2V0KSB0YXJnZXQgPSB7fTtcclxuXHJcblx0c291cmNlc1xyXG5cdFx0LmZpbHRlcigoc291cmNlKSA9PiAhaXNOdWxsT3JVbmRlZmluZWQoc291cmNlKSlcclxuXHRcdC5mb3JFYWNoKChzb3VyY2UpID0+IHtcclxuXHRcdFx0Y29uc3Qga2V5cyA9IGFzc2lnbmFibGVLZXlzKHNvdXJjZSk7XHJcblx0XHRcdGtleXNcclxuXHRcdFx0XHQuZmlsdGVyKChrZXkpID0+IGtleSAhPSBcIl9fcHJvdG9fX1wiKVxyXG5cdFx0XHRcdC5maWx0ZXIoKGtleSkgPT4gdHlwZW9mIHRhcmdldFtrZXldICE9PSBcInN5bWJvbFwiKVxyXG5cdFx0XHRcdC5maWx0ZXIoKGtleSkgPT4gdHlwZW9mIHNvdXJjZVtrZXldICE9PSBcInN5bWJvbFwiKVxyXG5cdFx0XHRcdC5mb3JFYWNoKChrZXkpID0+IHtcclxuXHRcdFx0XHRcdGNvbnN0IHZhbHVlID0gc291cmNlW2tleV07XHJcblx0XHRcdFx0XHRjb25zdCBjdXJyZW50ID0gdGFyZ2V0W2tleV07XHJcblxyXG5cdFx0XHRcdFx0aWYoY3VycmVudCA9PSBudWxsICkgdGFyZ2V0W2tleV0gPSB2YWx1ZTtcclxuXHRcdFx0XHRcdGVsc2UgaWYoIHR5cGVvZiBjdXJyZW50ICE9PSB0eXBlb2YgdmFsdWUgKSB0YXJnZXRba2V5XSA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0ZWxzZSBpZiAoY3VycmVudCBpbnN0YW5jZW9mIEFycmF5IHx8IHZhbHVlIGluc3RhbmNlb2YgQXJyYXkpIHRhcmdldFtrZXldID0gdmFsdWU7XHJcblx0XHRcdFx0XHRlbHNlIGlmIChjdXJyZW50IGluc3RhbmNlb2YgU2V0IHx8IHZhbHVlIGluc3RhbmNlb2YgU2V0KSB0YXJnZXRba2V5XSA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0ZWxzZSBpZiAoY3VycmVudCBpbnN0YW5jZW9mIE1hcCB8fCB2YWx1ZSBpbnN0YW5jZW9mIE1hcCkgdGFyZ2V0W2tleV0gPSB2YWx1ZTtcclxuXHRcdFx0XHRcdGVsc2UgaWYgKGN1cnJlbnQgaW5zdGFuY2VvZiBEYXRlIHx8IHZhbHVlIGluc3RhbmNlb2YgRGF0ZSkgdGFyZ2V0W2tleV0gPSB2YWx1ZTtcclxuXHRcdFx0XHRcdGVsc2UgaWYgKGN1cnJlbnQgaW5zdGFuY2VvZiBSZWdFeHAgfHwgdmFsdWUgaW5zdGFuY2VvZiBSZWdFeHApIHRhcmdldFtrZXldID0gdmFsdWU7XHJcblx0XHRcdFx0XHRlbHNlIGlmIChpc09iamVjdChjdXJyZW50KSAmJiBpc09iamVjdCh2YWx1ZSkpIG1lcmdlKGN1cnJlbnQsIHZhbHVlKTtcclxuXHRcdFx0XHRcdGVsc2UgdGFyZ2V0W2tleV0gPSB2YWx1ZTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRyZXR1cm4gdGFyZ2V0O1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIERlY2lkZXMgd2hldGhlciBhIHNpbmdsZSBwcm9wZXJ0eSBpcyB0YWtlbiBvdmVyIGJ5IHtAbGluayBmaWx0ZXJ9LlxyXG4gKlxyXG4gKiBAY2FsbGJhY2sgUHJvcGVydHlGaWx0ZXJcclxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgbmFtZSBvZiB0aGUgcHJvcGVydHlcclxuICogQHBhcmFtIHsqfSB2YWx1ZSB2YWx1ZSBvZiB0aGUgcHJvcGVydHlcclxuICogQHBhcmFtIHtvYmplY3R9IGNvbnRleHQgdGhlIG9iamVjdCB0aGUgcHJvcGVydHkgYmVsb25ncyB0b1xyXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gdHJ1ZSB0byBrZWVwIHRoZSBwcm9wZXJ0eVxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBCdWlsZHMgYSB7QGxpbmsgUHJvcGVydHlGaWx0ZXJ9IGFjY2VwdGluZyBvciByZWplY3RpbmcgYSBmaXhlZCBsaXN0IG9mIHByb3BlcnR5IG5hbWVzLlxyXG4gKlxyXG4gKiBAcGFyYW0ge29iamVjdH0gb3B0aW9uc1xyXG4gKiBAcGFyYW0ge0FycmF5PHN0cmluZz59IG9wdGlvbnMubmFtZXMgdGhlIHByb3BlcnR5IG5hbWVzIHRvIGRlY2lkZSBvblxyXG4gKiBAcGFyYW0ge2Jvb2xlYW59IG9wdGlvbnMuYWxsb3dlZCB0cnVlIHR1cm5zIHRoZSBsaXN0IGludG8gYW4gYWxsb3cgbGlzdCwgZmFsc2UgaW50byBhIGRlbnkgbGlzdFxyXG4gKiBAcmV0dXJucyB7UHJvcGVydHlGaWx0ZXJ9XHJcbiAqXHJcbiAqIEBleGFtcGxlXHJcbiAqIGNvbnN0IGRlbnkgPSBidWlsZFByb3BlcnR5RmlsdGVyKHtuYW1lcyA6IFtcInBhc3N3b3JkXCJdLCBhbGxvd2VkIDogZmFsc2V9KTtcclxuICogZmlsdGVyKHVzZXIsIGRlbnkpOyAgIC8vIGV2ZXJ5IHByb3BlcnR5IGJ1dCBwYXNzd29yZFxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IGJ1aWxkUHJvcGVydHlGaWx0ZXIgPSAoeyBuYW1lcywgYWxsb3dlZCB9KSA9PiB7XHJcblx0cmV0dXJuIChuYW1lLCB2YWx1ZSwgY29udGV4dCkgPT4ge1xyXG5cdFx0cmV0dXJuIG5hbWVzLmluY2x1ZGVzKG5hbWUpID09PSBhbGxvd2VkO1xyXG5cdH07XHJcbn07XHJcblxyXG4vKipcclxuICogUmVidWlsZHMgYW4gQXJyYXksIFNldCBvciBNYXAgd2l0aCBpdHMgdmFsdWVzIGZpbHRlcmVkLiBBIGNvbnRhaW5lciBrZWVwcyBhbGwgb2YgaXRzIGVudHJpZXMgLVxyXG4gKiBvbmx5IHRoZSB2YWx1ZXMgaW5zaWRlIGdldCBmaWx0ZXJlZC4gVGhlIGtleXMgb2YgYSBNYXAgc3RheSB1bnRvdWNoZWQsIHJlcGxhY2luZyB0aGVtIHdvdWxkIGJyZWFrXHJcbiAqIGV2ZXJ5IGxvb2t1cCBhZ2FpbnN0IHRoZSByZXN1bHQuXHJcbiAqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBwYXJhbSB7QXJyYXl8U2V0fE1hcH0gdmFsdWVcclxuICogQHBhcmFtIHtQcm9wZXJ0eUZpbHRlcn0gcHJvcEZpbHRlclxyXG4gKiBAcGFyYW0ge2Jvb2xlYW59IGRlZXBcclxuICogQHBhcmFtIHtXZWFrTWFwfSBjb3BpZXMgbWFwcyBhbiBvcmlnaW5hbCBvbnRvIGl0cyBmaWx0ZXJlZCBjb3B5XHJcbiAqIEByZXR1cm5zIHtBcnJheXxTZXR8TWFwfVxyXG4gKi9cclxuY29uc3QgZmlsdGVyQ29udGFpbmVyID0gKHZhbHVlLCBwcm9wRmlsdGVyLCBkZWVwLCBjb3BpZXMpID0+IHtcclxuXHRpZiAodmFsdWUgaW5zdGFuY2VvZiBBcnJheSkge1xyXG5cdFx0Y29uc3QgY29weSA9IFtdO1xyXG5cdFx0Y29waWVzLnNldCh2YWx1ZSwgY29weSk7XHJcblx0XHRmb3IgKGNvbnN0IGVudHJ5IG9mIHZhbHVlKSBjb3B5LnB1c2goZmlsdGVyVmFsdWUoZW50cnksIHByb3BGaWx0ZXIsIGRlZXAsIGNvcGllcykpO1xyXG5cclxuXHRcdHJldHVybiBjb3B5O1xyXG5cdH1cclxuXHJcblx0aWYgKHZhbHVlIGluc3RhbmNlb2YgU2V0KSB7XHJcblx0XHRjb25zdCBjb3B5ID0gbmV3IFNldCgpO1xyXG5cdFx0Y29waWVzLnNldCh2YWx1ZSwgY29weSk7XHJcblx0XHRmb3IgKGNvbnN0IGVudHJ5IG9mIHZhbHVlKSBjb3B5LmFkZChmaWx0ZXJWYWx1ZShlbnRyeSwgcHJvcEZpbHRlciwgZGVlcCwgY29waWVzKSk7XHJcblxyXG5cdFx0cmV0dXJuIGNvcHk7XHJcblx0fVxyXG5cclxuXHRjb25zdCBjb3B5ID0gbmV3IE1hcCgpO1xyXG5cdGNvcGllcy5zZXQodmFsdWUsIGNvcHkpO1xyXG5cdGZvciAoY29uc3QgW2tleSwgZW50cnldIG9mIHZhbHVlKSBjb3B5LnNldChrZXksIGZpbHRlclZhbHVlKGVudHJ5LCBwcm9wRmlsdGVyLCBkZWVwLCBjb3BpZXMpKTtcclxuXHJcblx0cmV0dXJuIGNvcHk7XHJcbn07XHJcblxyXG4vKipcclxuICogRmlsdGVycyBhIHNpbmdsZSB2YWx1ZSwgZGlzcGF0Y2hpbmcgb24gd2hhdCBpdCBpcy5cclxuICpcclxuICogQHByaXZhdGVcclxuICogQHBhcmFtIHsqfSB2YWx1ZVxyXG4gKiBAcGFyYW0ge1Byb3BlcnR5RmlsdGVyfSBwcm9wRmlsdGVyXHJcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gZGVlcFxyXG4gKiBAcGFyYW0ge1dlYWtNYXB9IGNvcGllcyBtYXBzIGFuIG9yaWdpbmFsIG9udG8gaXRzIGZpbHRlcmVkIGNvcHlcclxuICogQHJldHVybnMgeyp9IHRoZSBmaWx0ZXJlZCB2YWx1ZSwgb3IgdGhlIHZhbHVlIGl0c2VsZiB3aGVuIHRoZXJlIGlzIG5vdGhpbmcgdG8gZmlsdGVyXHJcbiAqL1xyXG5jb25zdCBmaWx0ZXJWYWx1ZSA9ICh2YWx1ZSwgcHJvcEZpbHRlciwgZGVlcCwgY29waWVzKSA9PiB7XHJcblx0aWYgKHZhbHVlID09PSBudWxsIHx8IHR5cGVvZiB2YWx1ZSAhPT0gXCJvYmplY3RcIikgcmV0dXJuIHZhbHVlO1xyXG5cdGlmICh2YWx1ZSBpbnN0YW5jZW9mIERhdGUgfHwgdmFsdWUgaW5zdGFuY2VvZiBSZWdFeHApIHJldHVybiB2YWx1ZTsgLy8gY2Fycnkgbm8gcHJvcGVydGllcyB0byBmaWx0ZXJcclxuXHJcblx0Ly8gYSB2YWx1ZSBzZWVuIGJlZm9yZSBjbG9zZXMgYSBjeWNsZSAtIGl0cyBjb3B5IHN0YW5kcyBpbiwgc28gbm90aGluZyB1bmZpbHRlcmVkIGxlYWtzIGJhY2sgaW5cclxuXHRpZiAoY29waWVzLmhhcyh2YWx1ZSkpIHJldHVybiBjb3BpZXMuZ2V0KHZhbHVlKTtcclxuXHJcblx0aWYgKHZhbHVlIGluc3RhbmNlb2YgQXJyYXkgfHwgdmFsdWUgaW5zdGFuY2VvZiBTZXQgfHwgdmFsdWUgaW5zdGFuY2VvZiBNYXApIHJldHVybiBmaWx0ZXJDb250YWluZXIodmFsdWUsIHByb3BGaWx0ZXIsIGRlZXAsIGNvcGllcyk7XHJcblxyXG5cdHJldHVybiBmaWx0ZXJPYmplY3QodmFsdWUsIHByb3BGaWx0ZXIsIGRlZXAsIGNvcGllcyk7XHJcbn07XHJcblxyXG4vKipcclxuICogQnVpbGRzIHRoZSBmaWx0ZXJlZCBjb3B5IG9mIGFuIG9iamVjdC4gVGhlIGNvcHkgaXMgcmVnaXN0ZXJlZCBiZWZvcmUgaXQgaXMgZmlsbGVkLCBzbyBhIGN5Y2xlXHJcbiAqIHJ1bm5pbmcgYmFjayBpbnRvIGl0IHJlc29sdmVzIHRvIHRoZSBjb3B5IGluc3RlYWQgb2YgdGhlIG9yaWdpbmFsLlxyXG4gKlxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAcGFyYW0ge29iamVjdH0gZGF0YVxyXG4gKiBAcGFyYW0ge1Byb3BlcnR5RmlsdGVyfSBwcm9wRmlsdGVyXHJcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gZGVlcFxyXG4gKiBAcGFyYW0ge1dlYWtNYXB9IGNvcGllcyBtYXBzIGFuIG9yaWdpbmFsIG9udG8gaXRzIGZpbHRlcmVkIGNvcHlcclxuICogQHJldHVybnMge29iamVjdH1cclxuICovXHJcbmNvbnN0IGZpbHRlck9iamVjdCA9IChkYXRhLCBwcm9wRmlsdGVyLCBkZWVwLCBjb3BpZXMpID0+IHtcclxuXHRjb25zdCByZXN1bHQgPSB7fTtcclxuXHRjb3BpZXMuc2V0KGRhdGEsIHJlc3VsdCk7XHJcblxyXG5cdGZvciAoY29uc3QgbmFtZSBpbiBkYXRhKSB7XHJcblx0XHRjb25zdCB2YWx1ZSA9IGRhdGFbbmFtZV07XHJcblx0XHRpZiAocHJvcEZpbHRlcihuYW1lLCB2YWx1ZSwgZGF0YSkpe1xyXG5cdFx0XHRyZXN1bHRbbmFtZV0gPSBkZWVwID8gZmlsdGVyVmFsdWUodmFsdWUsIHByb3BGaWx0ZXIsIGRlZXAsIGNvcGllcykgOiB2YWx1ZTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHJldHVybiByZXN1bHQ7XHJcbn07XHJcblxyXG4vKipcclxuICogQnVpbGRzIGEgbmV3IG9iamVjdCBob2xkaW5nIHRoZSBwcm9wZXJ0aWVzIGEgZmlsdGVyIGFjY2VwdHMuXHJcbiAqXHJcbiAqIFRoZSBmaWx0ZXIgaXMgY2FsbGVkIGZvciBldmVyeSBlbnVtZXJhYmxlIHByb3BlcnR5LCBpbmhlcml0ZWQgb25lcyBpbmNsdWRlZCAtIGZpbHRlcmluZyBhIHdpbmRvd1xyXG4gKiByZWxpZXMgb24gdGhhdCwgc2luY2UgbW9zdCBvZiBpdHMgbWVtYmVycyBzaXQgb24gdGhlIHByb3RvdHlwZS5cclxuICpcclxuICogV2l0aCBkZWVwIHRoZSBmaWx0ZXIgaXMgYXBwbGllZCB0byBzdWIgb2JqZWN0cyBhcyB3ZWxsLiBBcnJheSwgU2V0IGFuZCBNYXAgYXJlIHJlYnVpbHQgd2l0aCB0aGVpclxyXG4gKiB2YWx1ZXMgZmlsdGVyZWQsIGtlZXBpbmcgYWxsIG9mIHRoZWlyIGVudHJpZXMgYW5kLCBmb3IgYSBNYXAsIGl0cyBrZXlzLiBEYXRlIGFuZCBSZWdFeHAgYXJlIHRha2VuXHJcbiAqIG92ZXIgYXMgdGhleSBhcmUuIEEgY3ljbGljIHJlZmVyZW5jZSByZXNvbHZlcyB0byB0aGUgZmlsdGVyZWQgY29weSwgc28gdGhlIHJlc3VsdCBuZXZlciBjYXJyaWVzIGFcclxuICogcmVmZXJlbmNlIGludG8gdGhlIHVudG91Y2hlZCBvcmlnaW5hbC5cclxuICpcclxuICogV2l0aG91dCBkZWVwIHRoZSBhY2NlcHRlZCB2YWx1ZXMgYXJlIHRha2VuIG92ZXIgYXMgdGhleSBhcmUsIHN1YiBvYmplY3RzIGJ5IHJlZmVyZW5jZS5cclxuICpcclxuICogQHBhcmFtIHtvYmplY3R9IGRhdGEgdGhlIG9iamVjdCB0byBiZSBmaWx0ZXJlZFxyXG4gKiBAcGFyYW0ge1Byb3BlcnR5RmlsdGVyfSBwcm9wRmlsdGVyIGRlY2lkZXMgcGVyIHByb3BlcnR5LCBzZWUge0BsaW5rIGJ1aWxkUHJvcGVydHlGaWx0ZXJ9XHJcbiAqIEBwYXJhbSB7b2JqZWN0fSBbb3B0aW9uc11cclxuICogQHBhcmFtIHtib29sZWFufSBbb3B0aW9ucy5kZWVwPWZhbHNlXSBmaWx0ZXIgc3ViIG9iamVjdHMgdG9vXHJcbiAqIEByZXR1cm5zIHtvYmplY3R9IGEgbmV3IG9iamVjdFxyXG4gKlxyXG4gKiBAZXhhbXBsZVxyXG4gKiBjb25zdCBkZW55ID0gYnVpbGRQcm9wZXJ0eUZpbHRlcih7bmFtZXMgOiBbXCJzZWNyZXRcIl0sIGFsbG93ZWQgOiBmYWxzZX0pO1xyXG4gKlxyXG4gKiBmaWx0ZXIoe3NlY3JldCA6IFwieFwiLCBhIDogMX0sIGRlbnkpOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8ge2EgOiAxfVxyXG4gKiBmaWx0ZXIoe3N1YiA6IHtzZWNyZXQgOiBcInhcIiwgYSA6IDF9fSwgZGVueSwge2RlZXAgOiB0cnVlfSk7ICAgICAgLy8ge3N1YiA6IHthIDogMX19XHJcbiAqL1xyXG5leHBvcnQgY29uc3QgZmlsdGVyID0gKGRhdGEsIHByb3BGaWx0ZXIsIHsgZGVlcCA9IGZhbHNlIH0gPSB7fSkgPT4gZmlsdGVyT2JqZWN0KGRhdGEsIHByb3BGaWx0ZXIsIGRlZXAsIG5ldyBXZWFrTWFwKCkpO1xyXG5cclxuLyoqXHJcbiAqIERlZmluZXMgYSBjb25zdGFudCwgbm9uIGVudW1lcmFibGUgcHJvcGVydHkuXHJcbiAqXHJcbiAqIEBwYXJhbSB7b2JqZWN0fSBvIHRoZSBvYmplY3QgdG8gZGVmaW5lIHRoZSBwcm9wZXJ0eSBvblxyXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBuYW1lIG9mIHRoZSBwcm9wZXJ0eVxyXG4gKiBAcGFyYW0geyp9IHZhbHVlIHRoZSB2YWx1ZSwgbmVpdGhlciB3cml0YWJsZSBub3IgY29uZmlndXJhYmxlXHJcbiAqIEByZXR1cm5zIHt2b2lkfVxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IGRlZlZhbHVlID0gKG8sIG5hbWUsIHZhbHVlKSA9PiB7XHJcblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIG5hbWUsIHtcclxuXHRcdHZhbHVlLFxyXG5cdFx0d3JpdGFibGU6IGZhbHNlLFxyXG5cdFx0Y29uZmlndXJhYmxlOiBmYWxzZSxcclxuXHRcdGVudW1lcmFibGU6IGZhbHNlLFxyXG5cdH0pO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIERlZmluZXMgYSByZWFkIG9ubHksIG5vbiBlbnVtZXJhYmxlIHByb3BlcnR5IGJhY2tlZCBieSBhIGdldHRlci5cclxuICpcclxuICogQHBhcmFtIHtvYmplY3R9IG8gdGhlIG9iamVjdCB0byBkZWZpbmUgdGhlIHByb3BlcnR5IG9uXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIG5hbWUgb2YgdGhlIHByb3BlcnR5XHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGdldCByZXR1cm5zIHRoZSB2YWx1ZSBvZiB0aGUgcHJvcGVydHlcclxuICogQHJldHVybnMge3ZvaWR9XHJcbiAqL1xyXG5leHBvcnQgY29uc3QgZGVmR2V0ID0gKG8sIG5hbWUsIGdldCkgPT4ge1xyXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCBuYW1lLCB7XHJcblx0XHRnZXQsXHJcblx0XHRjb25maWd1cmFibGU6IGZhbHNlLFxyXG5cdFx0ZW51bWVyYWJsZTogZmFsc2UsXHJcblx0fSk7XHJcbn07XHJcblxyXG4vKipcclxuICogRGVmaW5lcyBhIG5vbiBlbnVtZXJhYmxlIHByb3BlcnR5IGJhY2tlZCBieSBhIGdldHRlciBhbmQgYSBzZXR0ZXIuXHJcbiAqXHJcbiAqIEBwYXJhbSB7b2JqZWN0fSBvIHRoZSBvYmplY3QgdG8gZGVmaW5lIHRoZSBwcm9wZXJ0eSBvblxyXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBuYW1lIG9mIHRoZSBwcm9wZXJ0eVxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBnZXQgcmV0dXJucyB0aGUgdmFsdWUgb2YgdGhlIHByb3BlcnR5XHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IHNldCB0YWtlcyB0aGUgbmV3IHZhbHVlIG9mIHRoZSBwcm9wZXJ0eVxyXG4gKiBAcmV0dXJucyB7dm9pZH1cclxuICovXHJcbmV4cG9ydCBjb25zdCBkZWZHZXRTZXQgPSAobywgbmFtZSwgZ2V0LCBzZXQpID0+IHtcclxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkobywgbmFtZSwge1xyXG5cdFx0Z2V0LFxyXG5cdFx0c2V0LFxyXG5cdFx0Y29uZmlndXJhYmxlOiBmYWxzZSxcclxuXHRcdGVudW1lcmFibGU6IGZhbHNlLFxyXG5cdH0pO1xyXG59O1xyXG5cclxuZXhwb3J0IGRlZmF1bHQge1xyXG5cdGlzTnVsbE9yVW5kZWZpbmVkLFxyXG5cdGlzT2JqZWN0LFxyXG5cdGlzUHJpbWl0aXZlLFxyXG5cdGVxdWFsUG9qbyxcclxuXHRpc1Bvam8sXHJcblx0YXBwZW5kLFxyXG5cdG1lcmdlLFxyXG5cdGZpbHRlcixcclxuXHRidWlsZFByb3BlcnR5RmlsdGVyLFxyXG5cdGRlZlZhbHVlLFxyXG5cdGRlZkdldCxcclxuXHRkZWZHZXRTZXQsXHJcbn07XHJcbiIsIi8qKlxuICogUHJpdmF0ZSBzdGF0ZSBmb3IgYW4gb2JqZWN0LCBoZWxkIG91dHNpZGUgb2YgaXQuXG4gKlxuICogVGhlIHZhbHVlcyBsaXZlIGluIGEgV2Vha01hcCBrZXllZCBieSB0aGUgb2JqZWN0LCBzbyBub3RoaW5nIGlzIGFkZGVkIHRvIHRoZSBvYmplY3QgaXRzZWxmIGFuZFxuICogbm90aGluZyBzaG93cyB1cCBpbiBPYmplY3Qua2V5cyBvciBKU09OLiBPbmNlIHRoZSBvYmplY3QgaXMgZ29uZSBpdHMgc3RhdGUgaXMgY29sbGVjdGFibGUgdG9vLlxuICpcbiAqIEBtb2R1bGUgUHJpdmF0ZVByb3BlcnR5XG4gKi9cbmNvbnN0IFBSSVZBVEVfUFJPUEVSVElFUyA9IG5ldyBXZWFrTWFwKCk7XG5cbi8qKlxuICogVGhlIHN0b3JlIGJlbG9uZ2luZyB0byBhbiBvYmplY3QuIENyZWF0ZWQgb24gdGhlIGZpcnN0IGNhbGwsIHRoZSBzYW1lIG9uZSBmcm9tIHRoZW4gb24uXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IG9ialxuICogQHJldHVybnMge29iamVjdH0gdGhlIHN0b3JlLCB3cml0YWJsZSBkaXJlY3RseVxuICovXG5leHBvcnQgY29uc3QgcHJpdmF0ZVN0b3JlID0gKG9iaikgPT4ge1xuXHRpZihQUklWQVRFX1BST1BFUlRJRVMuaGFzKG9iaikpXG5cdFx0cmV0dXJuIFBSSVZBVEVfUFJPUEVSVElFUy5nZXQob2JqKTtcblxuXHRjb25zdCBkYXRhID0ge307XG5cdFBSSVZBVEVfUFJPUEVSVElFUy5zZXQob2JqLCBkYXRhKTtcblx0cmV0dXJuIGRhdGE7XG59O1xuXG4vKipcbiAqIFJlYWRzIG9yIHdyaXRlcyBwcml2YXRlIHN0YXRlLCBkZXBlbmRpbmcgb24gaG93IG1hbnkgYXJndW1lbnRzIGl0IGlzIGNhbGxlZCB3aXRoLlxuICpcbiAqIFBhc3NpbmcgdW5kZWZpbmVkIGFzIHRoZSB2YWx1ZSBzdGlsbCBjb3VudHMgYXMgYSB3cml0ZSAtIHdoYXQgZGVjaWRlcyBpcyB0aGUgbnVtYmVyIG9mIGFyZ3VtZW50cyxcbiAqIG5vdCB0aGVpciBjb250ZW50LlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBvYmogdGhlIG9iamVjdCB0aGUgc3RhdGUgYmVsb25ncyB0b1xuICogQHBhcmFtIHtzdHJpbmd9IFtuYW1lXSBuYW1lIG9mIHRoZSBwcm9wZXJ0eVxuICogQHBhcmFtIHsqfSBbdmFsdWVdIHRoZSB2YWx1ZSB0byB3cml0ZVxuICogQHJldHVybnMgeyp9IHRoZSB3aG9sZSBzdG9yZSB3aXRoIG9uZSBhcmd1bWVudCwgdGhlIHZhbHVlIHdpdGggdHdvLCBub3RoaW5nIHdpdGggdGhyZWVcbiAqIEB0aHJvd3Mge0Vycm9yfSB3aGVuIGNhbGxlZCB3aXRoIG1vcmUgdGhhbiB0aHJlZSBhcmd1bWVudHNcbiAqXG4gKiBAZXhhbXBsZVxuICogcHJpdmF0ZVByb3BlcnR5KGluc3RhbmNlLCBcImNvdW50XCIsIDEpOyAgIC8vIHdyaXRlXG4gKiBwcml2YXRlUHJvcGVydHkoaW5zdGFuY2UsIFwiY291bnRcIik7ICAgICAgLy8gMVxuICogcHJpdmF0ZVByb3BlcnR5KGluc3RhbmNlKTsgICAgICAgICAgICAgICAvLyB7Y291bnQgOiAxfVxuICovXG5leHBvcnQgY29uc3QgcHJpdmF0ZVByb3BlcnR5ID0gZnVuY3Rpb24ob2JqLCBuYW1lLCB2YWx1ZSkge1xuXHRjb25zdCBkYXRhID0gcHJpdmF0ZVN0b3JlKG9iaik7XG5cdGlmKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpXG5cdFx0cmV0dXJuIGRhdGE7XG5cdGVsc2UgaWYoYXJndW1lbnRzLmxlbmd0aCA9PT0gMilcblx0XHRyZXR1cm4gZGF0YVtuYW1lXTtcblx0ZWxzZSBpZihhcmd1bWVudHMubGVuZ3RoID09PSAzKVxuXHRcdGRhdGFbbmFtZV0gPSB2YWx1ZTtcblx0ZWxzZVxuXHRcdHRocm93IG5ldyBFcnJvcihcIk5vdCBhbGxvd2VkIHNpemUgb2YgYXJndW1lbnRzIVwiKTtcbn07XG5cbi8qKlxuICogQnVpbGRzIGEgZnVuY3Rpb24gcmVhZGluZyBhbmQgd3JpdGluZyBvbmUgZml4ZWQgcHJvcGVydHksIHNvIHRoZSBuYW1lIGlzIHdyaXR0ZW4gb25jZSBpbnN0ZWFkIG9mXG4gKiBhdCBldmVyeSBjYWxsLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB2YXJuYW1lIG5hbWUgb2YgdGhlIHByb3BlcnR5XG4gKiBAcmV0dXJucyB7RnVuY3Rpb259IGNhbGxlZCB3aXRoIChzZWxmKSBpdCByZWFkcywgY2FsbGVkIHdpdGggKHNlbGYsIHZhbHVlKSBpdCB3cml0ZXNcbiAqXG4gKiBAZXhhbXBsZVxuICogY29uc3QgY291bnQgPSBwcml2YXRlUHJvcGVydHlBY2Nlc3NvcihcImNvdW50XCIpO1xuICogY291bnQoaW5zdGFuY2UsIDEpOyAgIC8vIHdyaXRlXG4gKiBjb3VudChpbnN0YW5jZSk7ICAgICAgLy8gMVxuICovXG5leHBvcnQgY29uc3QgcHJpdmF0ZVByb3BlcnR5QWNjZXNzb3IgPSAodmFybmFtZSkgPT4ge1xuXHRyZXR1cm4gZnVuY3Rpb24oc2VsZiwgdmFsdWUpe1xuXHRcdGlmKGFyZ3VtZW50cy5sZW5ndGggPT0gMilcblx0XHRcdHByaXZhdGVQcm9wZXJ0eShzZWxmLCB2YXJuYW1lLCB2YWx1ZSk7XG5cdFx0ZWxzZVxuXHRcdFx0cmV0dXJuIHByaXZhdGVQcm9wZXJ0eShzZWxmLCB2YXJuYW1lKTtcblx0fTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHtwcml2YXRlUHJvcGVydHksIHByaXZhdGVQcm9wZXJ0eUFjY2Vzc29yLCBwcml2YXRlU3RvcmV9O1xuIiwiLyoqXG4gKiBUd28gd2F5cyBvZiBidWlsZGluZyBhIHByb21pc2UgdGhhdCBzb21ldGhpbmcgb3V0c2lkZSBvZiBpdCBzZXR0bGVzLlxuICpcbiAqIHtAbGluayB0aW1lb3V0UHJvbWlzZX0gcnVucyBhIGZ1bmN0aW9uIG9uY2UgYSB0aW1lb3V0IGhhcyBwYXNzZWQgYW5kIGxldHMgdGhlIHdob2xlIGNoYWluIGJlaGluZFxuICogaXQgYmUgY2FuY2VsZWQuIHtAbGluayBsYXp5UHJvbWlzZX0gaGFuZHMgb3V0IGEgcHJvbWlzZSB0b2dldGhlciB3aXRoIGl0cyByZXNvbHZlIGFuZCByZWplY3QsIGZvclxuICogdGhlIGNhc2VzIHdoZXJlIHRoZSBzZXR0bGluZyBpcyBkcml2ZW4gZnJvbSBzb21ld2hlcmUgZWxzZSAtIGEgZnJhbWV3b3JrIGNhbGxiYWNrLCBhbiBldmVudCxcbiAqIGZvcmVpZ24gY29kZSAtIGFuZCBwYWNraW5nIGFsbCBvZiB0aGF0IGludG8gdGhlIGV4ZWN1dG9yIHdvdWxkIG9ubHkgYmxvdyB0aGUgY29kZSB1cCBvciBpcyBub3RcbiAqIHBvc3NpYmxlIGF0IGFsbC5cbiAqXG4gKiBUaGUgdHdvIGNhcnJ5IGRpZmZlcmVudCBzdGF0ZSBvbiBwdXJwb3NlOiBhIHRpbWVvdXRQcm9taXNlIHJlcG9ydHMgaXRzIGNhbmNlbGxhdGlvbiB0aHJvdWdoIGFcbiAqIHJlamVjdGlvbiBhbmQgYW4gQWJvcnRTaWduYWwsIGEgbGF6eVByb21pc2UgcmVwb3J0cyBpdHMgb3V0Y29tZSB0aHJvdWdoIHJlc29sdmVkLCBlcnJvciBhbmQgdmFsdWUuXG4gKlxuICogQG1vZHVsZSBQcm9taXNlVXRpbHNcbiAqL1xuaW1wb3J0IHsgZGVmVmFsdWUsIGRlZkdldCB9IGZyb20gXCIuL09iamVjdFV0aWxzLmpzXCI7XG5cbi8qKlxuICogVGhlIHJlYXNvbiBhbiBhYm9ydGVkIG9wZXJhdGlvbiByZWplY3RzIHdpdGguIEEgRE9NRXhjZXB0aW9uIG5hbWVkIEFib3J0RXJyb3IgaXMgd2hhdFxuICogQWJvcnRDb250cm9sbGVyIGl0c2VsZiB1c2VzLCBhbiBFcnJvciBjYXJyeWluZyB0aGUgc2FtZSBuYW1lIHN0YW5kcyBpbiB3aGVyZSBpdCBpcyBtaXNzaW5nLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcmV0dXJucyB7RXJyb3J8RE9NRXhjZXB0aW9ufVxuICovXG5jb25zdCBhYm9ydEVycm9yID0gKCkgPT4ge1xuXHRpZiAodHlwZW9mIERPTUV4Y2VwdGlvbiAhPT0gXCJ1bmRlZmluZWRcIikgcmV0dXJuIG5ldyBET01FeGNlcHRpb24oXCJUaGUgb3BlcmF0aW9uIHdhcyBhYm9ydGVkLlwiLCBcIkFib3J0RXJyb3JcIik7XG5cblx0LyogaXN0YW5idWwgaWdub3JlIG5leHQgLSBldmVyeSBicm93c2VyIHRoZSBzdWl0ZSBydW5zIGluIGJyaW5ncyBET01FeGNlcHRpb24sIHNvIHRoaXMgbGluZSBvbmx5XG5cdCAgIHN0YW5kcyBpbiBmb3IgZW52aXJvbm1lbnRzIHRoZSB0ZXN0IHJ1biBjYW5ub3QgcmVhY2ggKi9cblx0cmV0dXJuIE9iamVjdC5hc3NpZ24obmV3IEVycm9yKFwiVGhlIG9wZXJhdGlvbiB3YXMgYWJvcnRlZC5cIiksIHsgbmFtZTogXCJBYm9ydEVycm9yXCIgfSk7XG59O1xuXG4vKipcbiAqIFRoZSByZWFzb24gYSBzaWduYWwgY2Fycmllcy4gYWJvcnQoKSBmaWxscyBpdCBpbiBvbiBpdHMgb3duLCBvbGRlciBpbXBsZW1lbnRhdGlvbnMga25vdyB0aGVcbiAqIG1ldGhvZCBidXQgbm90IHRoZSBwcm9wZXJ0eS5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtBYm9ydFNpZ25hbH0gc2lnbmFsXG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuY29uc3QgYWJvcnRSZWFzb24gPSAoc2lnbmFsKSA9PiAodHlwZW9mIHNpZ25hbC5yZWFzb24gPT09IFwidW5kZWZpbmVkXCIgPyBhYm9ydEVycm9yKCkgOiBzaWduYWwucmVhc29uKTtcblxuLyoqXG4gKiBBZGRzIHRoZSBjYW5jZWwgYXBpIHRvIGEgcHJvbWlzZSBhbmQgdG8gZXZlcnkgcHJvbWlzZSBkZXJpdmVkIGZyb20gaXQuIEFsbCBvZiB0aGVtIHNoYXJlIG9uZVxuICogY29udHJvbGxlciwgc28gYSBjaGFpbiBjYW4gYmUgY2FuY2VsZWQgZnJvbSBhbnkgb2YgaXRzIGxpbmtzLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge1Byb21pc2V9IHByb21pc2VcbiAqIEBwYXJhbSB7QWJvcnRDb250cm9sbGVyfSBjb250cm9sbGVyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYW5jZWxcbiAqIEByZXR1cm5zIHtQcm9taXNlfSB0aGUgcHJvbWlzZSBpdHNlbGZcbiAqL1xuY29uc3QgY2FuY2VsYWJsZSA9IChwcm9taXNlLCBjb250cm9sbGVyLCBjYW5jZWwpID0+IHtcblx0ZGVmVmFsdWUocHJvbWlzZSwgXCJjYW5jZWxcIiwgY2FuY2VsKTtcblx0ZGVmR2V0KHByb21pc2UsIFwic2lnbmFsXCIsICgpID0+IGNvbnRyb2xsZXIuc2lnbmFsKTtcblx0ZGVmR2V0KHByb21pc2UsIFwiY2FuY2VsZWRcIiwgKCkgPT4gY29udHJvbGxlci5zaWduYWwuYWJvcnRlZCk7XG5cblx0Ly8gdGhlbiBoYXMgdG8gaGFuZCBib3RoIGhhbmRsZXJzIHRocm91Z2ggYW5kIHJldHVybiB0aGUgZGVyaXZlZCBwcm9taXNlIC0gY2F0Y2gsIGZpbmFsbHkgYW5kXG5cdC8vIGF3YWl0IGFyZSBkZWZpbmVkIGluIHRlcm1zIG9mIHRoZW4sIHNvIGFueXRoaW5nIGxlc3Mgc2lsZW50bHkgYnJlYWtzIHRob3NlIGFzIHdlbGxcblx0Y29uc3QgdGhlbiA9IHByb21pc2UudGhlbjtcblx0ZGVmVmFsdWUocHJvbWlzZSwgXCJ0aGVuXCIsIChvbkZ1bGZpbGxlZCwgb25SZWplY3RlZCkgPT4gY2FuY2VsYWJsZSh0aGVuLmNhbGwocHJvbWlzZSwgb25GdWxmaWxsZWQsIG9uUmVqZWN0ZWQpLCBjb250cm9sbGVyLCBjYW5jZWwpKTtcblxuXHRyZXR1cm4gcHJvbWlzZTtcbn07XG5cbi8qKlxuICogQ2FsbHMgYSBmdW5jdGlvbiBhZnRlciBhIHRpbWVvdXQgYW5kIHNldHRsZXMgd2l0aCB3aGF0ZXZlciBpdCBwcm9kdWNlcy5cbiAqXG4gKiBUaGUgZnVuY3Rpb24gaXMgY2FsbGVkIHdpdGggcmVzb2x2ZSwgcmVqZWN0IGFuZCB0aGUgQWJvcnRTaWduYWwgb2YgdGhlIHByb21pc2UsIHNvIHdvcmsgc3RhcnRlZFxuICogaW5zaWRlIGl0IGNhbiBiZSBhYm9ydGVkIGFsb25nIHdpdGggaXQuIEFuIGV4Y2VwdGlvbiB0aHJvd24gYnkgdGhlIGZ1bmN0aW9uIHJlamVjdHMgdGhlIHByb21pc2VcbiAqIGluc3RlYWQgb2YgZXNjYXBpbmcgaW50byB0aGUgdGltZXIuXG4gKlxuICogVGhlIHByb21pc2UgYnJpbmdzIGl0cyBvd24gQWJvcnRDb250cm9sbGVyLiBjYW5jZWwoKSBjbGVhcnMgYSBwZW5kaW5nIHRpbWVvdXQgYW5kIHJlamVjdHMgd2l0aCBhblxuICogQWJvcnRFcnJvciwgd2hpY2ggdHJhdmVscyBkb3duIHRoZSB3aG9sZSBjaGFpbiAtIG5vIHRoZW4gaGFuZGxlciBiZWhpbmQgaXQgcnVucy4gY2FuY2VsKCkgc2l0cyBvblxuICogZXZlcnkgcHJvbWlzZSBkZXJpdmVkIGZyb20gaXQgYW5kIGRvZXMgbm90aGluZyBvbmNlIHRoZSBwcm9taXNlIGhhcyBzZXR0bGVkLlxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuIGNhbGxlZCB3aXRoIChyZXNvbHZlLCByZWplY3QsIHNpZ25hbCkgb25jZSB0aGUgdGltZW91dCBoYXMgcGFzc2VkXG4gKiBAcGFyYW0ge251bWJlcn0gbXMgdGhlIHRpbWVvdXQgaW4gbWlsbGlzZWNvbmRzXG4gKiBAcmV0dXJucyB7UHJvbWlzZX0gYSBwcm9taXNlIGNhcnJ5aW5nIGNhbmNlbCgpLCBzaWduYWwgYW5kIGNhbmNlbGVkXG4gKlxuICogQGV4YW1wbGVcbiAqIGNvbnN0IHByb21pc2UgPSB0aW1lb3V0UHJvbWlzZSgocmVzb2x2ZSkgPT4gcmVzb2x2ZShcImRvbmVcIiksIDEwMDApO1xuICogYXdhaXQgcHJvbWlzZTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gXCJkb25lXCJcbiAqXG4gKiBAZXhhbXBsZVxuICogY29uc3QgcHJvbWlzZSA9IHRpbWVvdXRQcm9taXNlKChyZXNvbHZlKSA9PiByZXNvbHZlKFwiZG9uZVwiKSwgMTAwMCk7XG4gKiBwcm9taXNlLnRoZW4oKCkgPT4gY29uc29sZS5sb2coXCJuZXZlciBydW5zXCIpKTtcbiAqIHByb21pc2UuY2FuY2VsKCk7XG4gKiBhd2FpdCBwcm9taXNlOyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB0aHJvd3MgQWJvcnRFcnJvclxuICovXG5leHBvcnQgY29uc3QgdGltZW91dFByb21pc2UgPSAoZm4sIG1zKSA9PiB7XG5cdGNvbnN0IGNvbnRyb2xsZXIgPSBuZXcgQWJvcnRDb250cm9sbGVyKCk7XG5cdGNvbnN0IHNpZ25hbCA9IGNvbnRyb2xsZXIuc2lnbmFsO1xuXHRsZXQgdGltZW91dCA9IG51bGw7XG5cdGxldCBzZXR0bGVkID0gZmFsc2U7XG5cblx0Y29uc3QgcHJvbWlzZSA9IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcblx0XHQvLyB0aGUgdGltZW91dCBpcyBjbGVhcmVkIG9uIGV2ZXJ5IHdheSBvdXQsIGEgY2FuY2VsZWQgcHJvbWlzZSBtdXN0IG5vdCBrZWVwIHRoZSB0aW1lciBhbGl2ZVxuXHRcdGNvbnN0IHNldHRsZSA9IChoYW5kbGVyKSA9PiAodmFsdWUpID0+IHtcblx0XHRcdGlmIChzZXR0bGVkKSByZXR1cm47XG5cblx0XHRcdHNldHRsZWQgPSB0cnVlO1xuXHRcdFx0aWYgKHRpbWVvdXQgIT09IG51bGwpIHtcblx0XHRcdFx0Y2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuXHRcdFx0XHR0aW1lb3V0ID0gbnVsbDtcblx0XHRcdH1cblx0XHRcdGhhbmRsZXIodmFsdWUpO1xuXHRcdH07XG5cblx0XHRjb25zdCBvblJlc29sdmUgPSBzZXR0bGUocmVzb2x2ZSk7XG5cdFx0Y29uc3Qgb25SZWplY3QgPSBzZXR0bGUocmVqZWN0KTtcblxuXHRcdHNpZ25hbC5hZGRFdmVudExpc3RlbmVyKFwiYWJvcnRcIiwgKCkgPT4gb25SZWplY3QoYWJvcnRSZWFzb24oc2lnbmFsKSksIHsgb25jZTogdHJ1ZSB9KTtcblxuXHRcdHRpbWVvdXQgPSBzZXRUaW1lb3V0KCgpID0+IHtcblx0XHRcdHRpbWVvdXQgPSBudWxsO1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0Zm4ob25SZXNvbHZlLCBvblJlamVjdCwgc2lnbmFsKTtcblx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0XHRcdG9uUmVqZWN0KGVycm9yKTtcblx0XHRcdH1cblx0XHR9LCBtcyk7XG5cdH0pO1xuXG5cdHJldHVybiBjYW5jZWxhYmxlKHByb21pc2UsIGNvbnRyb2xsZXIsIChyZWFzb24pID0+IHtcblx0XHRpZiAoc2V0dGxlZCB8fCBzaWduYWwuYWJvcnRlZCkgcmV0dXJuO1xuXG5cdFx0Y29udHJvbGxlci5hYm9ydCh0eXBlb2YgcmVhc29uID09PSBcInVuZGVmaW5lZFwiID8gYWJvcnRFcnJvcigpIDogcmVhc29uKTtcblx0fSk7XG59O1xuXG4vKipcbiAqIEJ1aWxkcyBhIHByb21pc2UgdG9nZXRoZXIgd2l0aCB0aGUgdHdvIGZ1bmN0aW9ucyBzZXR0bGluZyBpdC5cbiAqXG4gKiBUaGUgcG9pbnQgaXMgdG8gaGF2ZSB0aGUgcHJvbWlzZSBhbmQgaXRzIHJlc29sdmUgYW5kIHJlamVjdCBhcGFydCBmcm9tIGVhY2ggb3RoZXI6IHdoYXRldmVyXG4gKiBzZXR0bGVzIGl0IGRvZXMgbm90IGhhdmUgdG8gc2l0IGluc2lkZSB0aGUgZXhlY3V0b3IuIFRoYXQga2VlcHMgYSBwcm9taXNlIHVzYWJsZSB3aGVyZSB0aGVcbiAqIHNldHRsaW5nIGlzIGRyaXZlbiBieSBhIGZyYW1ld29yayBjYWxsYmFjaywgYW4gZXZlbnQgb3IgYW55IG90aGVyIGZvcmVpZ24gY29kZSB0aGUgZXhlY3V0b3IgaGFzIG5vXG4gKiB3YXkgb2YgcmVhY2hpbmcuXG4gKlxuICogVGhlIHByb21pc2UgY2FycmllcyB0aHJlZSByZWFkIG9ubHkgcHJvcGVydGllczpcbiAqXG4gKiAtIHJlc29sdmVkIHNheXMgdGhlIHByb21pc2UgaGFzIGJlZW4gc2V0dGxlZC4gSXQgc2F5cyBub3RoaW5nIGFib3V0IHRoZSBvdXRjb21lIC0gaXQgaXMgdHJ1ZSBmb3IgYVxuICogICBmYWlsdXJlIGp1c3QgYXMgd2VsbC5cbiAqIC0gZXJyb3IgdGVsbHMgdGhlIHR3byBhcGFydC5cbiAqIC0gdmFsdWUgaG9sZHMgd2hhdGV2ZXIgdGhlIHByb21pc2Ugd2FzIHNldHRsZWQgd2l0aDogdGhlIHJlc3VsdCBhZnRlciBhIHJlc29sdmUsIHRoZSByZWFzb24gYWZ0ZXJcbiAqICAgYSByZWplY3QuIGVycm9yIGlzIHdoYXQgZGVjaWRlcyBob3cgdG8gcmVhZCBpdC5cbiAqXG4gKiBBbiBFcnJvciBhbHdheXMgbGVhZHMgdG8gYSByZWplY3Rpb24sIGluIGJvdGggZGlyZWN0aW9ucyAtIGhhbmRpbmcgb25lIHRvIHJlc29sdmUgcmVqZWN0cyB0aGVcbiAqIHByb21pc2UganVzdCBsaWtlIHJlamVjdCB3b3VsZC4gQSByZWFzb24gdGhhdCBpcyBubyBFcnJvciBpcyB3cmFwcGVkIGludG8gb25lLCBhbmQgYSByZWplY3RcbiAqIHdpdGhvdXQgYSByZWFzb24gZ2V0cyBhbiBFcnJvciBvZiBpdHMgb3duLCBzbyB0aGVyZSBpcyBhbHdheXMgYSBtZXNzYWdlIHRvIHJlYWQuXG4gKlxuICogQm90aCBmdW5jdGlvbnMgc2V0dGxlIHRoZSBwcm9taXNlIG9uY2UuIEEgc2Vjb25kIGNhbGwgdGhyb3dzIGluc3RlYWQgb2Ygc2V0dGxpbmcgYWdhaW4sIHNvIHRoZVxuICogdGhyZWUgcHJvcGVydGllcyBjYW4gbmV2ZXIgZW5kIHVwIGRpc2FncmVlaW5nIHdpdGggdGhlIHByb21pc2UuXG4gKlxuICogQHJldHVybnMge1Byb21pc2V9IGEgcHJvbWlzZSBjYXJyeWluZyByZXNvbHZlKCksIHJlamVjdCgpLCB2YWx1ZSwgZXJyb3IgYW5kIHJlc29sdmVkXG4gKiBAdGhyb3dzIHtFcnJvcn0gZnJvbSByZXNvbHZlIG9yIHJlamVjdCB3aGVuIHRoZSBwcm9taXNlIGhhcyBhbHJlYWR5IGJlZW4gc2V0dGxlZFxuICpcbiAqIEBleGFtcGxlXG4gKiBjb25zdCBwcm9taXNlID0gbGF6eVByb21pc2UoKTtcbiAqIGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRcIiwgKCkgPT4gcHJvbWlzZS5yZXNvbHZlKGVsZW1lbnQpLCB7b25jZSA6IHRydWV9KTtcbiAqIGF3YWl0IHByb21pc2U7XG4gKlxuICogQGV4YW1wbGVcbiAqIGNvbnN0IHByb21pc2UgPSBsYXp5UHJvbWlzZSgpO1xuICogcHJvbWlzZS5yZWplY3QoXCJubyBjb25uZWN0aW9uXCIpOyAgIC8vIHJlamVjdHMgd2l0aCBhbiBFcnJvciBjYXJyeWluZyB0aGF0IG1lc3NhZ2VcbiAqIHByb21pc2UucmVzb2x2ZWQ7ICAgICAgICAgICAgICAgICAgLy8gdHJ1ZSAtIHNldHRsZWQsIG5vdCBzdWNjZXNzZnVsXG4gKiBwcm9taXNlLmVycm9yOyAgICAgICAgICAgICAgICAgICAgIC8vIHRydWVcbiAqIHByb21pc2UudmFsdWU7ICAgICAgICAgICAgICAgICAgICAgLy8gXCJubyBjb25uZWN0aW9uXCJcbiAqL1xuZXhwb3J0IGNvbnN0IGxhenlQcm9taXNlID0gKCkgPT4ge1xuXHRsZXQgcHJvbWlzZVJlc29sdmUgPSBudWxsO1xuXHRsZXQgcHJvbWlzZVJlamVjdCA9IG51bGw7XG5cdGxldCByZXNvbHZlZCA9IGZhbHNlO1xuXHRsZXQgZXJyb3IgPSBmYWxzZTtcblx0bGV0IHZhbHVlID0gdW5kZWZpbmVkO1xuXG5cdGNvbnN0IHByb21pc2UgPSBuZXcgUHJvbWlzZSgociwgZSkgPT4ge1xuXHRcdHByb21pc2VSZXNvbHZlID0gcjtcblx0XHRwcm9taXNlUmVqZWN0ID0gKGFuRXJyb3IpID0+IGUoYW5FcnJvciBpbnN0YW5jZW9mIEVycm9yID8gYW5FcnJvciA6IG5ldyBFcnJvcihhbkVycm9yID09IG51bGwgPyBcIlByb21pc2UgcmVqZWN0ZWQgd2l0aCBubyByZWFzb25cIiA6IGFuRXJyb3IpKTtcblx0fSk7XG5cblx0ZGVmVmFsdWUocHJvbWlzZSwgXCJyZXNvbHZlXCIsIChyZXN1bHQpID0+IHtcblx0XHRpZiAocmVzb2x2ZWQpIHRocm93IG5ldyBFcnJvcihcIlByb21pc2UgYWxyZWFkeSByZXNvbHZlZCFcIik7XG5cdFx0cmVzb2x2ZWQgPSB0cnVlO1xuXHRcdHZhbHVlID0gcmVzdWx0O1xuXHRcdGlmICh2YWx1ZSBpbnN0YW5jZW9mIEVycm9yKSB7XG5cdFx0XHRlcnJvciA9IHRydWU7XG5cdFx0XHRwcm9taXNlUmVqZWN0KHZhbHVlKTtcblx0XHR9IGVsc2UgcHJvbWlzZVJlc29sdmUodmFsdWUpO1xuXHR9KTtcblx0ZGVmVmFsdWUocHJvbWlzZSwgXCJyZWplY3RcIiwgKHJlc3VsdCkgPT4ge1xuXHRcdGlmIChyZXNvbHZlZCkgdGhyb3cgbmV3IEVycm9yKFwiUHJvbWlzZSBhbHJlYWR5IHJlc29sdmVkIVwiKTtcblx0XHRyZXNvbHZlZCA9IHRydWU7XG5cdFx0dmFsdWUgPSByZXN1bHQ7XG5cdFx0ZXJyb3IgPSB0cnVlO1xuXHRcdHByb21pc2VSZWplY3QocmVzdWx0KTtcblx0fSk7XG5cblx0ZGVmR2V0KHByb21pc2UsIFwidmFsdWVcIiwgKCkgPT4gdmFsdWUpO1xuXHRkZWZHZXQocHJvbWlzZSwgXCJlcnJvclwiLCAoKSA9PiBlcnJvcik7XG5cdGRlZkdldChwcm9taXNlLCBcInJlc29sdmVkXCIsICgpID0+IHJlc29sdmVkKTtcblxuXHRyZXR1cm4gcHJvbWlzZTtcbn07XG5leHBvcnQgZGVmYXVsdCB7XG5cdGxhenlQcm9taXNlLFxuXHR0aW1lb3V0UHJvbWlzZSxcbn07XG4iLCIvKipcbiAqIENyZWF0aW9uIG9mIHJhbmRvbSBVVUlEcy5cbiAqXG4gKiBAbW9kdWxlIFVVSURcbiAqL1xuLy90aGUgc29sdXRpb24gaXMgZm91bmQgaGVyZTogaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTA1MDM0L2hvdy10by1jcmVhdGUtYS1ndWlkLXV1aWRcblxuaW1wb3J0IEdMT0JBTCBmcm9tIFwiLi9HbG9iYWwuanNcIjtcblxuLyoqXG4gKiBUaGUgbGF5b3V0IG9mIGEgdmVyc2lvbiA0IFVVSUQuIHggaXMgYSByYW5kb20gaGV4IGRpZ2l0LCB5IGlzIHRoZSB2YXJpYW50IGRpZ2l0IGFuZCBiZWNvbWVzIG9uZSBvZlxuICogOCwgOSwgYSBvciBiLlxuICpcbiAqIEB0eXBlIHtzdHJpbmd9XG4gKi9cbmV4cG9ydCBjb25zdCBVVUlEX1NDSEVNQSA9IFwieHh4eHh4eHgteHh4eC00eHh4LXl4eHgteHh4eHh4eHh4eHh4XCI7XG5cbi8qKlxuICogQ3JlYXRlcyBhIHJhbmRvbSBVVUlEIG9mIHZlcnNpb24gNC5cbiAqXG4gKiBUaGUgZGlnaXRzIGNvbWUgZnJvbSBjcnlwdG8uZ2V0UmFuZG9tVmFsdWVzLCBub3QgZnJvbSBNYXRoLnJhbmRvbS4gUmVxdWlyZXMgYSBjcnlwdG8gb24gdGhlIGdsb2JhbFxuICogc2NvcGUsIHdoaWNoIGV2ZXJ5IGJyb3dzZXIgYW5kIGV2ZXJ5IHdlYiB3b3JrZXIgYnJpbmdzLlxuICpcbiAqIEByZXR1cm5zIHtzdHJpbmd9IDM2IGNoYXJhY3RlcnMsIGZvbGxvd2luZyB7QGxpbmsgVVVJRF9TQ0hFTUF9XG4gKlxuICogQGV4YW1wbGVcbiAqIHV1aWQoKTsgICAvLyBcIjFiOWQ2YmNkLWJiZmQtNGIyZC05YjVkLWFiOGRmYmJkNGJlZFwiXG4gKi9cbmV4cG9ydCBjb25zdCB1dWlkID0gKCkgPT4ge1xuXHRjb25zdCBidWYgPSBuZXcgVWludDMyQXJyYXkoNCk7XG5cdEdMT0JBTC5jcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKGJ1Zik7XG5cdGxldCBpZHggPSAtMTtcblx0cmV0dXJuIFVVSURfU0NIRU1BLnJlcGxhY2UoL1t4eV0vZywgKGMpID0+IHtcblx0XHRpZHgrKztcblx0XHRjb25zdCByID0gKGJ1ZltpZHggPj4gM10gPj4gKChpZHggJSA4KSAqIDQpKSAmIDE1O1xuXHRcdGNvbnN0IHYgPSBjID09IFwieFwiID8gciA6IChyICYgMHgzKSB8IDB4ODtcblx0XHRyZXR1cm4gdi50b1N0cmluZygxNik7XG5cdH0pO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgeyB1dWlkIH07XG4iLCIvKipcclxuICogU21hbGwgY2hlY2tzIG9uIHBsYWluIHZhbHVlcy5cclxuICpcclxuICogbm9WYWx1ZSBhbnN3ZXJzIHRoZSBzYW1lIHF1ZXN0aW9uIGFzIE9iamVjdFV0aWxzLmlzTnVsbE9yVW5kZWZpbmVkIGFuZCBpcyBrZXB0IGFzIGl0cyBvd24gZnVuY3Rpb25cclxuICogb24gcHVycG9zZTogdGhpcyBtb2R1bGUgaXMgdGhlIG9uZSB0byByZWFjaCBmb3Igd2hlbiBhbGwgdGhhdCBpcyBuZWVkZWQgaXMgYSBsb29rIGF0IGEgdmFsdWUsIGFuZFxyXG4gKiBpdCBzdGF5cyBmcmVlIG9mIGFueSBkZXBlbmRlbmN5IG9uIE9iamVjdFV0aWxzLiBUaGUgZHVwbGljYXRpb24gaXMgdGhlIHByaWNlIGZvciB0aGF0LCBhbmQgaXQgaXNcclxuICogYWNjZXB0ZWQgLSBib3RoIGFyZSB0d28gbGluZXMgYW5kIG5laXRoZXIgaXMgZ29pbmcgdG8gY2hhbmdlLlxyXG4gKlxyXG4gKiBAbW9kdWxlIFZhbHVlSGVscGVyXHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIENoZWNrcyB3aGV0aGVyIGEgdmFsdWUgaXMgbnVsbCBvciB1bmRlZmluZWQuXHJcbiAqXHJcbiAqIEBwYXJhbSB7Kn0gdmFsdWVcclxuICogQHJldHVybnMge2Jvb2xlYW59XHJcbiAqL1xyXG5leHBvcnQgY29uc3Qgbm9WYWx1ZSA9ICh2YWx1ZSkgPT4ge1xyXG5cdHJldHVybiB2YWx1ZSA9PSBudWxsIHx8IHR5cGVvZiB2YWx1ZSA9PT0gXCJ1bmRlZmluZWRcIjtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDaGVja3Mgd2hldGhlciBhIHN0cmluZyBjYXJyaWVzIG5vdGhpbmcgdG8gd29yayB3aXRoIC0gbnVsbCwgdW5kZWZpbmVkLCBlbXB0eSBvciB3aGl0ZXNwYWNlIG9ubHkuXHJcbiAqXHJcbiAqIEV4cGVjdHMgYSBzdHJpbmcgZm9yIGV2ZXJ5dGhpbmcgZWxzZSBhbmQgdGhyb3dzIG9uIGEgdmFsdWUgd2l0aG91dCB0cmltLCBhIG51bWJlciBmb3IgaW5zdGFuY2UuXHJcbiAqXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZVxyXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cclxuICpcclxuICogQGV4YW1wbGVcclxuICogZW1wdHlPckJsYW5rKFwiICBcIik7ICAgICAvLyB0cnVlXHJcbiAqIGVtcHR5T3JCbGFuayhudWxsKTsgICAgIC8vIHRydWVcclxuICogZW1wdHlPckJsYW5rKFwidGVzdFwiKTsgICAvLyBmYWxzZVxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IGVtcHR5T3JCbGFuayA9ICh2YWx1ZSkgPT4ge1xyXG5cdHJldHVybiBub1ZhbHVlKHZhbHVlKSB8fCB2YWx1ZS50cmltKCkubGVuZ3RoID09IDA7XHJcbn07XHJcblxyXG4vKipcclxuICogQGRlcHJlY2F0ZWQgdXNlIHtAbGluayBlbXB0eU9yQmxhbmt9XHJcbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZVxyXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cclxuICovXHJcbmV4cG9ydCBjb25zdCBlbXRweU9yTm9WYWx1ZVN0cmluZyA9ICh2YWx1ZSkgPT4ge1xyXG5cdGNvbnNvbGUud2FybihcImVtdHB5T3JOb1ZhbHVlU3RyaW5nIGlzIGRlcHJlY2F0ZWQhIHVzZSBlbXB0eU9yQmxhbmtcIik7XHJcblx0cmV0dXJuIGVtcHR5T3JCbGFuayh2YWx1ZSk7XHJcbn07XHJcblxyXG5cclxuZXhwb3J0IGRlZmF1bHQge1xyXG5cdG5vVmFsdWUsXHJcblx0ZW1wdHlPckJsYW5rLFxyXG5cdGVtdHB5T3JOb1ZhbHVlU3RyaW5nXHJcbn07IiwiLyoqXG4gKiBFbnRyeSBwb2ludCBvZiB0aGUgcGFja2FnZS5cbiAqXG4gKiBJbXBvcnRpbmcgaXQgYWxzbyBwdWxscyBpbiB0aGUgamF2YXNjcmlwdCBtb2R1bGUsIHdoaWNoIGV4dGVuZHMgU3RyaW5nIGFuZCBNYXAgLSBzZWUgdGhlIG5vdGVcbiAqIHRoZXJlLiBSZWFkeSwgU2VydmljZUhlbHBlciBhbmQgdGhlIFhtbFRvSnNvbiBjb252ZXJ0ZXIgYXJlIG5vdCBwYXJ0IG9mIHRoaXMgc3VyZmFjZSBhbmQgaGF2ZSB0byBiZVxuICogaW1wb3J0ZWQgZnJvbSB0aGVpciBvd24gZmlsZS5cbiAqXG4gKiBAbW9kdWxlIGRlZmF1bHRqcy1jb21tb24tdXRpbHNcbiAqL1xuaW1wb3J0IFwiLi9qYXZhc2NyaXB0L2luZGV4LmpzXCI7XG5pbXBvcnQgT2JqZWN0VXRpbHMgZnJvbSBcIi4vT2JqZWN0VXRpbHMuanNcIjtcbmltcG9ydCBHTE9CQUwgZnJvbSBcIi4vR2xvYmFsLmpzXCI7XG5pbXBvcnQgRXNjYXBlciBmcm9tIFwiLi9Fc2NhcGVyLmpzXCI7XG5pbXBvcnQgVmFsdWVIZWxwZXIgZnJvbSBcIi4vVmFsdWVIZWxwZXIuanNcIjtcbmltcG9ydCBQcm9taXNlVXRpbHMgZnJvbSBcIi4vUHJvbWlzZVV0aWxzLmpzXCI7XG5pbXBvcnQgUHJpdmF0ZVByb3BlcnR5IGZyb20gXCIuL1ByaXZhdGVQcm9wZXJ0eS5qc1wiO1xuaW1wb3J0IFVVSUQgZnJvbSBcIi4vVVVJRC5qc1wiO1xuXG5leHBvcnQge1xuXHRHTE9CQUwgLFxuXHRPYmplY3RVdGlscyxcblx0RXNjYXBlcixcblx0VmFsdWVIZWxwZXIsXG5cdFByb21pc2VVdGlscyxcblx0UHJpdmF0ZVByb3BlcnR5LFxuXHRVVUlEXG59OyIsIi8qKlxyXG4gKiBBZGRzIHRvT2JqZWN0KCkgdG8gZXZlcnkgTWFwIC0gc2VlIHRoZSBub3RlIG9uIHBhdGNoaW5nIHByb3RvdHlwZXMgaW4gLi9pbmRleC5qcy5cclxuICpcclxuICogQSBuZXN0ZWQgTWFwIGlzIGNvbnZlcnRlZCBhbG9uZyB3aXRoIGl0LiBFdmVyeSBrZXkgYmVjb21lcyBhIHByb3BlcnR5IG5hbWUsIHNvIGEga2V5IHRoYXQgaXMgbm9cclxuICogc3RyaW5nIGlzIHR1cm5lZCBpbnRvIG9uZSB0aGUgd2F5IGphdmFzY3JpcHQgZG9lcyBpdCAtIGFuIG9iamVjdCBrZXkgZW5kcyB1cCBhcyBcIltvYmplY3QgT2JqZWN0XVwiLFxyXG4gKiBhbmQgdHdvIGtleXMgY29sbGFwc2luZyBvbnRvIHRoZSBzYW1lIG5hbWUgb3ZlcndyaXRlIGVhY2ggb3RoZXIuXHJcbiAqXHJcbiAqIE9ubHkgZGVmaW5lZCB3aGVuIG5vdGhpbmcgZWxzZSBjYXJyaWVzIHRoYXQgbmFtZSBhbHJlYWR5LlxyXG4gKlxyXG4gKiBAcmV0dXJucyB7b2JqZWN0fVxyXG4gKlxyXG4gKiBAZXhhbXBsZVxyXG4gKiBuZXcgTWFwKFtbXCJhXCIsIDFdLCBbXCJiXCIsIG5ldyBNYXAoW1tcImNcIiwgMl1dKV1dKS50b09iamVjdCgpOyAgIC8vIHthIDogMSwgYiA6IHtjIDogMn19XHJcbiAqL1xyXG5pZiAoIU1hcC5wcm90b3R5cGUudG9PYmplY3QpXHJcblx0TWFwLnByb3RvdHlwZS50b09iamVjdCA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdGNvbnN0IG9iamVjdCA9IHt9O1xyXG5cdFx0Zm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgdGhpcy5lbnRyaWVzKCkpIG9iamVjdFtrZXldID0gdmFsdWUgaW5zdGFuY2VvZiBNYXAgPyB2YWx1ZS50b09iamVjdCgpIDogdmFsdWU7XHJcblxyXG5cdFx0cmV0dXJuIG9iamVjdDtcclxuXHR9O1xyXG4iLCIvKipcclxuICogQWRkcyBoYXNoY29kZSgpIHRvIGV2ZXJ5IHN0cmluZyAtIHNlZSB0aGUgbm90ZSBvbiBwYXRjaGluZyBwcm90b3R5cGVzIGluIC4vaW5kZXguanMuXHJcbiAqXHJcbiAqIFRoZSBoYXNoIGlzIHRoZSBvbmUgamF2YSB1c2VzIGZvciBpdHMgc3RyaW5nczogaCA9IDMxICogaCArIGNoYXIsIGtlcHQgaW5zaWRlIDMyIHNpZ25lZCBiaXRzLiBJdFxyXG4gKiBpcyBtZWFudCBmb3IgYnVja2V0aW5nIGFuZCBmb3IgdGVsbGluZyB0ZXh0cyBhcGFydCBjaGVhcGx5LCBub3QgZm9yIGFueXRoaW5nIHdoZXJlIGNvbGxpc2lvbnNcclxuICogbWF0dGVyIC0gdHdvIGRpZmZlcmVudCB0ZXh0cyBjYW4gc2hhcmUgYSBoYXNoLCBhbmQgaXQgaXMgbm8gY3J5cHRvZ3JhcGhpYyBkaWdlc3QuXHJcbiAqXHJcbiAqIE9ubHkgZGVmaW5lZCB3aGVuIG5vdGhpbmcgZWxzZSBjYXJyaWVzIHRoYXQgbmFtZSBhbHJlYWR5LlxyXG4gKlxyXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBhIDMyIGJpdCBzaWduZWQgaW50ZWdlciwgMCBmb3IgdGhlIGVtcHR5IHN0cmluZ1xyXG4gKlxyXG4gKiBAZXhhbXBsZVxyXG4gKiBcInRlc3RcIi5oYXNoY29kZSgpOyAgIC8vIDM1NTY0OThcclxuICovXHJcbmlmICghU3RyaW5nLnByb3RvdHlwZS5oYXNoY29kZSlcclxuXHRTdHJpbmcucHJvdG90eXBlLmhhc2hjb2RlID0gZnVuY3Rpb24oKSB7XHJcblx0XHRpZiAodGhpcy5sZW5ndGggPT09IDApXHJcblx0XHRcdHJldHVybiAwO1xyXG5cdFx0XHJcblx0XHRsZXQgaGFzaCA9IDA7XHJcblx0XHRjb25zdCBsZW5ndGggPSB0aGlzLmxlbmd0aDtcclxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0Y29uc3QgYyA9IHRoaXMuY2hhckNvZGVBdChpKTtcclxuXHRcdFx0aGFzaCA9ICgoaGFzaCA8PCA1KSAtIGhhc2gpICsgYztcclxuXHRcdFx0aGFzaCB8PSAwOyAvLyBDb252ZXJ0IHRvIDMyYml0IGludGVnZXJcclxuXHRcdH1cclxuXHRcdHJldHVybiBoYXNoO1xyXG5cdH07IiwiLyoqXHJcbiAqIEV4dGVuc2lvbnMgdG8gdGhlIGJ1aWx0IGluIGphdmFzY3JpcHQgdHlwZXMuXHJcbiAqXHJcbiAqIEltcG9ydGluZyB0aGlzIG1vZHVsZSBwYXRjaGVzIHByb3RvdHlwZXMgLSB0aGF0IGlzIHdoYXQgaXQgaXMgZm9yLCBhbmQgaXQgaXMgZGVsaWJlcmF0ZS4gVGhlXHJcbiAqIHBhY2thZ2UgaW1wb3J0cyBpdCBmcm9tIGl0cyBvd24gZW50cnkgcG9pbnQsIHNvIGFueXRoaW5nIHVzaW5nIGl0IGdldHMgdGhlIGV4dGVuc2lvbnMgd2l0aG91dFxyXG4gKiBhc2tpbmcgZm9yIHRoZW0gc2VwYXJhdGVseS4gVGhleSBhcmUgbWVhbnQgdG8gcmVhZCBsaWtlIHBhcnQgb2YgdGhlIGxhbmd1YWdlIGF0IHRoZSBjYWxsIHNpdGU6XHJcbiAqIFwidGV4dFwiLmhhc2hjb2RlKCkgaW5zdGVhZCBvZiBoYXNoY29kZShcInRleHRcIikuXHJcbiAqXHJcbiAqIEV2ZXJ5IGV4dGVuc2lvbiBpcyBhZGRlZCBvbmx5IHdoZW4gdGhlIHR5cGUgZG9lcyBub3QgYWxyZWFkeSBjYXJyeSB0aGF0IG5hbWUsIHNvIGEgbmV3ZXIgZW5naW5lXHJcbiAqIG9yIGFub3RoZXIgbGlicmFyeSBkZWZpbmluZyB0aGUgc2FtZSBtZW1iZXIga2VlcHMgdGhlIHVwcGVyIGhhbmQgYW5kIG5vdGhpbmcgaXMgb3ZlcndyaXR0ZW4uXHJcbiAqXHJcbiAqIEBtb2R1bGUgamF2YXNjcmlwdFxyXG4gKi9cclxuaW1wb3J0IFwiLi9TdHJpbmcuanNcIjtcclxuaW1wb3J0IFwiLi9NYXAuanNcIjsiLCIvKipcbiAqIFRoZSB2ZXJzaW9uIG9mIHRoaXMgcGFja2FnZS5cbiAqXG4gKiBHZW5lcmF0ZWQgZnJvbSBwYWNrYWdlLmpzb24gYnkgc2NyaXB0cy9nZW5lcmF0ZS12ZXJzaW9uLmpzIGJlZm9yZSBldmVyeSBidWlsZC4gRG8gbm90IGVkaXQgLSB0aGVcbiAqIG5leHQgYnVpbGQgb3ZlcndyaXRlcyBpdC5cbiAqXG4gKiBAbW9kdWxlIHZlcnNpb25cbiAqL1xuZXhwb3J0IGNvbnN0IFZFUlNJT04gPSBcIjEuMC4wXCI7XG5cbmV4cG9ydCBkZWZhdWx0IFZFUlNJT047XG4iLCIvLyBUaGUgbW9kdWxlIGNhY2hlXG52YXIgX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fID0ge307XG5cbi8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG5mdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuXHR2YXIgY2FjaGVkTW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXTtcblx0aWYgKGNhY2hlZE1vZHVsZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0cmV0dXJuIGNhY2hlZE1vZHVsZS5leHBvcnRzO1xuXHR9XG5cdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG5cdHZhciBtb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdID0ge1xuXHRcdC8vIG5vIG1vZHVsZS5pZCBuZWVkZWRcblx0XHQvLyBubyBtb2R1bGUubG9hZGVkIG5lZWRlZFxuXHRcdGV4cG9ydHM6IHt9XG5cdH07XG5cblx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG5cdF9fd2VicGFja19tb2R1bGVzX19bbW9kdWxlSWRdKG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG5cdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG5cdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbn1cblxuIiwiLy8gZGVmaW5lIGdldHRlciBmdW5jdGlvbnMgZm9yIGhhcm1vbnkgZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5kID0gKGV4cG9ydHMsIGRlZmluaXRpb24pID0+IHtcblx0Zm9yKHZhciBrZXkgaW4gZGVmaW5pdGlvbikge1xuXHRcdGlmKF9fd2VicGFja19yZXF1aXJlX18ubyhkZWZpbml0aW9uLCBrZXkpICYmICFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywga2V5KSkge1xuXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIGtleSwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGRlZmluaXRpb25ba2V5XSB9KTtcblx0XHR9XG5cdH1cbn07IiwiX193ZWJwYWNrX3JlcXVpcmVfXy5vID0gKG9iaiwgcHJvcCkgPT4gKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApKSIsIi8vIGRlZmluZSBfX2VzTW9kdWxlIG9uIGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uciA9IChleHBvcnRzKSA9PiB7XG5cdGlmKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC50b1N0cmluZ1RhZykge1xuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBTeW1ib2wudG9TdHJpbmdUYWcsIHsgdmFsdWU6ICdNb2R1bGUnIH0pO1xuXHR9XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG59OyIsImltcG9ydCB7IEdMT0JBTCwgT2JqZWN0VXRpbHMsIEVzY2FwZXIsIFZhbHVlSGVscGVyLCBQcm9taXNlVXRpbHMsIFByaXZhdGVQcm9wZXJ0eSwgVVVJRCB9IGZyb20gXCIuL3NyYy9pbmRleC5qc1wiO1xuaW1wb3J0IHsgVkVSU0lPTiB9IGZyb20gXCIuL3NyYy92ZXJzaW9uLmpzXCI7XG5cbkdMT0JBTC5kZWZhdWx0anMgPSBHTE9CQUwuZGVmYXVsdGpzIHx8IHt9O1xuR0xPQkFMLmRlZmF1bHRqcy5jb21tb24gPSBHTE9CQUwuZGVmYXVsdGpzLmNvbW1vbiB8fCB7fTtcbkdMT0JBTC5kZWZhdWx0anMuY29tbW9uLnV0aWxzID0gR0xPQkFMLmRlZmF1bHRqcy5jb21tb24udXRpbHMgfHwge1xuXHRWRVJTSU9OLFxuXHRHTE9CQUwsXG5cdE9iamVjdFV0aWxzLFxuXHRFc2NhcGVyLFxuXHRWYWx1ZUhlbHBlcixcblx0UHJvbWlzZVV0aWxzLFxuXHRQcml2YXRlUHJvcGVydHksXG5cdFVVSUQsXG59O1xuXG5leHBvcnQgeyBHTE9CQUwsIE9iamVjdFV0aWxzLCBFc2NhcGVyLCBWYWx1ZUhlbHBlciwgUHJvbWlzZVV0aWxzLCBQcml2YXRlUHJvcGVydHksIFVVSUQgfTtcbiJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==