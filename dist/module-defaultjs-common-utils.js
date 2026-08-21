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
/*!******************!*\
  !*** ./index.js ***!
  \******************/
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




})();

/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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O1dBQzdEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUNOZ0g7O0FBRXRCIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vQGRlZmF1bHQtanMvZGVmYXVsdGpzLWNvbW1vbi11dGlscy8uL3NyYy9Fc2NhcGVyLmpzIiwid2VicGFjazovL0BkZWZhdWx0LWpzL2RlZmF1bHRqcy1jb21tb24tdXRpbHMvLi9zcmMvR2xvYmFsLmpzIiwid2VicGFjazovL0BkZWZhdWx0LWpzL2RlZmF1bHRqcy1jb21tb24tdXRpbHMvLi9zcmMvT2JqZWN0UHJvcGVydHkuanMiLCJ3ZWJwYWNrOi8vQGRlZmF1bHQtanMvZGVmYXVsdGpzLWNvbW1vbi11dGlscy8uL3NyYy9PYmplY3RVdGlscy5qcyIsIndlYnBhY2s6Ly9AZGVmYXVsdC1qcy9kZWZhdWx0anMtY29tbW9uLXV0aWxzLy4vc3JjL1ByaXZhdGVQcm9wZXJ0eS5qcyIsIndlYnBhY2s6Ly9AZGVmYXVsdC1qcy9kZWZhdWx0anMtY29tbW9uLXV0aWxzLy4vc3JjL1Byb21pc2VVdGlscy5qcyIsIndlYnBhY2s6Ly9AZGVmYXVsdC1qcy9kZWZhdWx0anMtY29tbW9uLXV0aWxzLy4vc3JjL1VVSUQuanMiLCJ3ZWJwYWNrOi8vQGRlZmF1bHQtanMvZGVmYXVsdGpzLWNvbW1vbi11dGlscy8uL3NyYy9WYWx1ZUhlbHBlci5qcyIsIndlYnBhY2s6Ly9AZGVmYXVsdC1qcy9kZWZhdWx0anMtY29tbW9uLXV0aWxzLy4vc3JjL2luZGV4LmpzIiwid2VicGFjazovL0BkZWZhdWx0LWpzL2RlZmF1bHRqcy1jb21tb24tdXRpbHMvLi9zcmMvamF2YXNjcmlwdC9NYXAuanMiLCJ3ZWJwYWNrOi8vQGRlZmF1bHQtanMvZGVmYXVsdGpzLWNvbW1vbi11dGlscy8uL3NyYy9qYXZhc2NyaXB0L1N0cmluZy5qcyIsIndlYnBhY2s6Ly9AZGVmYXVsdC1qcy9kZWZhdWx0anMtY29tbW9uLXV0aWxzLy4vc3JjL2phdmFzY3JpcHQvaW5kZXguanMiLCJ3ZWJwYWNrOi8vQGRlZmF1bHQtanMvZGVmYXVsdGpzLWNvbW1vbi11dGlscy93ZWJwYWNrL2Jvb3RzdHJhcCIsIndlYnBhY2s6Ly9AZGVmYXVsdC1qcy9kZWZhdWx0anMtY29tbW9uLXV0aWxzL3dlYnBhY2svcnVudGltZS9kZWZpbmUgcHJvcGVydHkgZ2V0dGVycyIsIndlYnBhY2s6Ly9AZGVmYXVsdC1qcy9kZWZhdWx0anMtY29tbW9uLXV0aWxzL3dlYnBhY2svcnVudGltZS9oYXNPd25Qcm9wZXJ0eSBzaG9ydGhhbmQiLCJ3ZWJwYWNrOi8vQGRlZmF1bHQtanMvZGVmYXVsdGpzLWNvbW1vbi11dGlscy93ZWJwYWNrL3J1bnRpbWUvbWFrZSBuYW1lc3BhY2Ugb2JqZWN0Iiwid2VicGFjazovL0BkZWZhdWx0LWpzL2RlZmF1bHRqcy1jb21tb24tdXRpbHMvLi9pbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIFJlcGxhY2luZyBjaGFyYWN0ZXJzIGluIGEgdGV4dCBhbmQgdGFraW5nIHRoZSByZXBsYWNlbWVudCBiYWNrIG91dC5cbiAqXG4gKiBAbW9kdWxlIEVzY2FwZXJcbiAqL1xuXG4vLyB0aGUgb25lIGxpc3Qgb2YgY2hhcmFjdGVycyBjYXJyeWluZyBhIG1lYW5pbmcgaW5zaWRlIGEgcmVndWxhciBleHByZXNzaW9uLiBxdW90ZSBhbmQgdGhlIG1hcCBvZlxuLy8gUkVHRVhQX0VTQ0FQRVIgYXJlIGJvdGggZGVyaXZlZCBmcm9tIGl0LCBzbyBhIGNoYXJhY3RlciBjYW4gbmV2ZXIgYmUgaW4gb25lIGFuZCBtaXNzaW5nIGluIHRoZVxuLy8gb3RoZXIuXG5jb25zdCBSRUdFWENIQVJTID0gW1wiXFxcXFwiLCBcIj9cIiwgXCIqXCIsIFwiK1wiLCBcInxcIiwgXCJbXCIsIFwiXVwiLCBcIntcIiwgXCJ9XCIsIFwiKFwiLCBcIilcIiwgXCIuXCIsIFwiXlwiLCBcIiRcIl07XG5cbmNvbnN0IFJFR0VYUVVPVEUgPSBuZXcgUmVnRXhwKGBbJHtSRUdFWENIQVJTLm1hcCgoY2hhcikgPT4gXCJcXFxcXCIgKyBjaGFyKS5qb2luKFwiXCIpfV1gLCBcImdcIik7XG5cbi8qKlxuICogVGFrZXMgdGhlIHJlZ2V4IG1lYW5pbmcgb3V0IG9mIGEgdGV4dCwgc28gYSBmaWx0ZXIgaXMgbWF0Y2hlZCBhcyB0aGUgbGl0ZXJhbCB0ZXh0IGl0IGlzLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge3N0cmluZ30gYVRleHRcbiAqIEByZXR1cm5zIHtzdHJpbmd9XG4gKi9cbmNvbnN0IHF1b3RlID0gKGFUZXh0KSA9PiBhVGV4dC5yZXBsYWNlKFJFR0VYUVVPVEUsIChjaGFyKSA9PiBcIlxcXFxcIiArIGNoYXIpO1xuXG4vKipcbiAqIFRoZSB0d28gZGlyZWN0aW9ucyBhbiBlbnRyeSBvZiBhIGNoYXIgbWFwIGNhbiB0YWtlIHBhcnQgaW4uXG4gKlxuICogTWVhbnQgZm9yIHRoZSBhdCBvZiBhIHtAbGluayBDaGFyTWFwRW50cnl9LiBUaGUgdmFsdWVzIGFyZSB0aGUgcGxhaW4gdGV4dHMgXCJlc2NhcGVcIiBhbmQgXCJ1bmVzY2FwZVwiLFxuICogYW5kIGFuIGF0IGlzIGNvbXBhcmVkIGluIGxvd2VyIGNhc2UsIHNvIFwiRXNjYXBlXCIgYW5kIFwiRVNDQVBFXCIgbmFtZSB0aGUgc2FtZSBkaXJlY3Rpb24uIFdyaXRpbmcgdGhlXG4gKiB0ZXh0IGJ5IGhhbmQgaXMgdGhlcmVmb3JlIGZpbmUgLSBNT0RFUyBpcyB0aGUgc2FmZXIgd2F5IHRvIHNwZWxsIGl0LCBub3QgdGhlIG9ubHkgb25lLlxuICpcbiAqIEZyb3plbjogdGhlIHZhbHVlcyBhcmUgcGFydCBvZiB0aGUgY29udHJhY3QsIGFuZCBhIGNoYW5nZWQgb25lIHdvdWxkIHNpbGVudGx5IG1vdmUgd2hhdCBhIG1hcCBtZWFucy5cbiAqXG4gKiBAcmVhZG9ubHlcbiAqIEBlbnVtIHtzdHJpbmd9XG4gKlxuICogQGV4YW1wbGVcbiAqIG5ldyBFc2NhcGVyKFtcbiAqICAgICB7Y2hhciA6IFwiJlwiLCBlc2NhcGVkIDogXCImYW1wO1wifSxcbiAqICAgICB7Y2hhciA6IFwiJlwiLCBlc2NhcGVkIDogXCImIzM4O1wiLCBhdCA6IE1PREVTLnVuZXNjYXBlfSxcbiAqIF0sIHRydWUpO1xuICovXG5leHBvcnQgY29uc3QgTU9ERVMgPSBPYmplY3QuZnJlZXplKHtcblx0LyoqIHRoZSBlbnRyeSB0YWtlcyBwYXJ0IHdoaWxlIGVzY2FwaW5nICovXG5cdGVzY2FwZTogXCJlc2NhcGVcIi50b0xvd2VyQ2FzZSgpLFxuXHQvKiogdGhlIGVudHJ5IHRha2VzIHBhcnQgd2hpbGUgdW5lc2NhcGluZyAqL1xuXHR1bmVzY2FwZTogXCJ1bmVzY2FwZVwiLnRvTG93ZXJDYXNlKClcbn0pO1xuXG4vKipcbiAqIENvbGxlY3RzIGV2ZXJ5dGhpbmcgd3Jvbmcgd2l0aCBvbmUgZW50cnkgb2YgYSBjaGFyIG1hcC5cbiAqXG4gKiBjaGFyIGhhcyB0byBuYW1lIHNvbWV0aGluZyB0byBsb29rIGZvciwgc28gYW4gZW1wdHkgb25lIGlzIHJlamVjdGVkIC0gaXQgd291bGQgY29tcGlsZSBpbnRvIGFcbiAqIHJlZ2V4IG1hdGNoaW5nIGF0IGV2ZXJ5IHBvc2l0aW9uLiBBbiBlbXB0eSBlc2NhcGVkIGlzIGFsbG93ZWQ6IGRyb3BwaW5nIGEgY2hhcmFjdGVyIGlzIGEgc2Vuc2libGVcbiAqIHRoaW5nIHRvIGVzY2FwZSB0bywgaXQganVzdCBjYW5ub3QgYmUgdW5kb25lLCBzbyBzdWNoIGFuIGVudHJ5IG9ubHkgdGFrZXMgcGFydCBpbiBlc2NhcGluZy5cbiAqXG4gKiBhdCBpcyByZWFkIGluIGxvd2VyIGNhc2UsIHNvIG9ubHkgYSBkaXJlY3Rpb24gdGhhdCBpcyBub3Qgb25lIG9mIHRoZSB0d28gYXQgYWxsIGlzIGEgcHJvYmxlbS5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHsqfSBpdGVtXG4gKiBAcGFyYW0ge251bWJlcn0gaW5kZXggcG9zaXRpb24gaW4gdGhlIGNoYXIgbWFwLCB0byBwb2ludCBhdCB0aGUgZW50cnkgaW4gdGhlIG1lc3NhZ2VcbiAqIEByZXR1cm5zIHtBcnJheTxzdHJpbmc+fSBvbmUgdGV4dCBwZXIgcHJvYmxlbSwgZW1wdHkgd2hlbiB0aGUgZW50cnkgaXMgZmluZVxuICovXG5jb25zdCBwcm9ibGVtc09mRW50cnkgPSAoaXRlbSwgaW5kZXgpID0+IHtcblx0aWYgKGl0ZW0gPT09IG51bGwgfHwgdHlwZW9mIGl0ZW0gIT09IFwib2JqZWN0XCIpIHJldHVybiBbYGVudHJ5ICR7aW5kZXh9IGlzIG5vIG9iamVjdGBdO1xuXG5cdGNvbnN0IHByb2JsZW1zID0gW107XG5cdGlmICh0eXBlb2YgaXRlbS5jaGFyICE9PSBcInN0cmluZ1wiKSBwcm9ibGVtcy5wdXNoKGBlbnRyeSAke2luZGV4fTogY2hhciBoYXMgdG8gYmUgYSBzdHJpbmdgKTtcblx0ZWxzZSBpZiAoaXRlbS5jaGFyLmxlbmd0aCA9PT0gMCkgcHJvYmxlbXMucHVzaChgZW50cnkgJHtpbmRleH06IGNoYXIgbXVzdCBub3QgYmUgZW1wdHlgKTtcblxuXHRpZiAodHlwZW9mIGl0ZW0uZXNjYXBlZCAhPT0gXCJzdHJpbmdcIikgcHJvYmxlbXMucHVzaChgZW50cnkgJHtpbmRleH06IGVzY2FwZWQgaGFzIHRvIGJlIGEgc3RyaW5nYCk7XG5cdFxuXHQvLyBubyBhdCBhdCBhbGwgaXMgdGhlIG5vcm1hbCBjYXNlIC0gb25seSBsb29rIGNsb3NlciBvbmNlIHRoZXJlIGlzIG9uZSwgb3RoZXJ3aXNlIHRoZSBsb3dlciBjYXNpbmdcblx0Ly8gYmVsb3cgd291bGQgcnVuIGFnYWluc3QgdW5kZWZpbmVkXG5cdGlmICh0eXBlb2YgaXRlbS5hdCAhPT0gXCJ1bmRlZmluZWRcIikge1xuXHRcdGlmICh0eXBlb2YgaXRlbS5hdCAhPT0gXCJzdHJpbmdcIikgcHJvYmxlbXMucHVzaChgZW50cnkgJHtpbmRleH06IGF0IGhhcyB0byBiZSBhIHN0cmluZyBvciB1bmRlZmluZWRgKTtcblx0XHRlbHNlIGlmIChpdGVtLmF0LnRvTG93ZXJDYXNlKCkgIT09IE1PREVTLmVzY2FwZSAmJiBpdGVtLmF0LnRvTG93ZXJDYXNlKCkgIT09IE1PREVTLnVuZXNjYXBlKVxuXHRcdFx0cHJvYmxlbXMucHVzaChgZW50cnkgJHtpbmRleH06IGF0IGhhcyB0byBiZSBcIiR7TU9ERVMuZXNjYXBlfVwiIG9yIFwiJHtNT0RFUy51bmVzY2FwZX1cIiwgbm90ICR7SlNPTi5zdHJpbmdpZnkoaXRlbS5hdCl9YCk7XG5cdH1cblxuXHRyZXR1cm4gcHJvYmxlbXM7XG59O1xuXG4vKipcbiAqIENoZWNrcyBhIHdob2xlIGNoYXIgbWFwIGFuZCByZXBvcnRzIGV2ZXJ5IHByb2JsZW0gYXQgb25jZSAtIGZpeGluZyBhIG1hcCBvbmUgdGhyb3duIGVycm9yIGF0IGFcbiAqIHRpbWUgaXMgbm8gZnVuLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0geyp9IGFDaGFyTWFwXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqIEB0aHJvd3Mge1R5cGVFcnJvcn0gd2hlbiB0aGUgbWFwIGlzIG5vIGFycmF5IG9yIGFueSBvZiBpdHMgZW50cmllcyBpcyB1bnVzYWJsZVxuICovXG5jb25zdCB2YWxpZGF0ZUNoYXJNYXAgPSAoYUNoYXJNYXApID0+IHtcblx0aWYgKCFBcnJheS5pc0FycmF5KGFDaGFyTWFwKSkgdGhyb3cgbmV3IFR5cGVFcnJvcihgRXNjYXBlcjogdGhlIGNoYXIgbWFwIGhhcyB0byBiZSBhbiBhcnJheSwgbm90ICR7YUNoYXJNYXAgPT09IG51bGwgPyBcIm51bGxcIiA6IHR5cGVvZiBhQ2hhck1hcH1gKTtcblxuXHRjb25zdCBwcm9ibGVtcyA9IGFDaGFyTWFwLmZsYXRNYXAocHJvYmxlbXNPZkVudHJ5KTtcblx0aWYgKHByb2JsZW1zLmxlbmd0aCA+IDApIHRocm93IG5ldyBUeXBlRXJyb3IoYEVzY2FwZXI6IHVudXNhYmxlIGNoYXIgbWFwXFxuXFx0JHtwcm9ibGVtcy5qb2luKFwiXFxuXFx0XCIpfWApO1xufTtcblxuLyoqXG4gKiBCdWlsZHMgdGhlIGxpc3Qgb2YgcmVwbGFjZW1lbnRzIGZvciBvbmUgZGlyZWN0aW9uLiBBbiBlbnRyeSB0YWtlcyBwYXJ0IGluIGEgZGlyZWN0aW9uIHdoZW4gaXRcbiAqIGNhcnJpZXMgbm8gYXQgYXQgYWxsIG9yIG5hbWVzIHRoYXQgZGlyZWN0aW9uLCBhbmQgd2hlbiB0aGUgdGV4dCBpdCBoYXMgdG8gbG9vayBmb3IgaW4gdGhhdFxuICogZGlyZWN0aW9uIGlzIG5vdCBlbXB0eSAtIHRoZXJlIGlzIG5vdGhpbmcgdG8gc2VhcmNoIGZvciBvdGhlcndpc2UuXG4gKlxuICogVGhlIG9yZGVyIG9mIHRoZSBtYXAgaXMga2VwdDogaXQgZGVjaWRlcyB3aGljaCBlbnRyeSB3aW5zIHdoZXJlIHR3byBvZiB0aGVtIGNhbiBtYXRjaCBhdCB0aGUgc2FtZVxuICogcG9zaXRpb24uXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7QXJyYXk8Q2hhck1hcEVudHJ5Pn0gYUNoYXJNYXBcbiAqIEBwYXJhbSB7TU9ERVN9IG1vZGUgdGhlIGRpcmVjdGlvbiB0byBidWlsZCBmb3JcbiAqIEByZXR1cm5zIHtBcnJheX0gZW50cmllcyBvZiB7ZmlsdGVyLCB2YWx1ZX0sIGZpbHRlciBiZWluZyB0aGUgbGl0ZXJhbCB0ZXh0IHRvIGxvb2sgZm9yXG4gKi9cbmNvbnN0IGJ1aWxkTWFwcGluZ0xpc3QgPSAoYUNoYXJNYXAsIG1vZGUpID0+IHtcblx0Y29uc3QgZnJvbSA9IG1vZGUgPT0gTU9ERVMuZXNjYXBlID8gXCJjaGFyXCIgOiBcImVzY2FwZWRcIjtcblx0Y29uc3QgdG8gPSBtb2RlID09IE1PREVTLmVzY2FwZSA/IFwiZXNjYXBlZFwiIDogXCJjaGFyXCI7XG5cblx0cmV0dXJuIGFDaGFyTWFwXG5cdFx0LmZpbHRlcigoaXRlbSkgPT4gIWl0ZW0uYXQgfHwgaXRlbS5hdC50b0xvd2VyQ2FzZSgpID09IG1vZGUpXG5cdFx0LmZpbHRlcigoaXRlbSkgPT4gaXRlbVtmcm9tXS5sZW5ndGggPiAwKVxuXHRcdC5tYXAoKGl0ZW0pID0+IHtcblx0XHRcdHJldHVybiB7IGZpbHRlcjogaXRlbVtmcm9tXSwgdmFsdWU6IGl0ZW1bdG9dIH07XG5cdFx0fSk7XG59O1xuXG4vKipcbiAqIENvbXBpbGVzIG9uZSByZWdleCBjb3ZlcmluZyBldmVyeSBmaWx0ZXIgb2YgYSBkaXJlY3Rpb24sIHNvIGEgdGV4dCBjYW4gYmUgd2Fsa2VkIGluIGEgc2luZ2xlIHBhc3MuXG4gKlxuICogRXZlcnkgZmlsdGVyIGJlY29tZXMgYSBjYXB0dXJlIGdyb3VwIG9mIGl0cyBvd24uIFdoaWNoIGdyb3VwIHRvb2sgcGFydCBpbiBhIG1hdGNoIHRlbGxzIHdoaWNoXG4gKiByZXBsYWNlbWVudCBiZWxvbmdzIHRvIGl0IC0gdGhhdCBvbmx5IHdvcmtzIGJlY2F1c2UgcXVvdGUgZXNjYXBlcyAoIGFuZCApLCBzbyBhIGZpbHRlciBjYW4gbmV2ZXJcbiAqIGJyaW5nIGEgZ3JvdXAgb2YgaXRzIG93biBhbmQgc2hpZnQgdGhlIG51bWJlcmluZy5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtBcnJheX0gdGhlRmlsdGVyc1xuICogQHBhcmFtIHtib29sZWFufSBpc0Nhc2VTZW5zaXRpdmVcbiAqIEByZXR1cm5zIHtSZWdFeHB8bnVsbH0gbnVsbCB3aGVuIHRoZXJlIGlzIG5vdGhpbmcgdG8gbG9vayBmb3JcbiAqL1xuY29uc3QgYnVpbGRNYXRjaGVyID0gKHRoZUZpbHRlcnMsIGlzQ2FzZVNlbnNpdGl2ZSkgPT4ge1xuXHQvLyBhbiBlbXB0eSBhbHRlcm5hdGlvbiB3b3VsZCBjb21waWxlIGludG8gYSByZWdleCBtYXRjaGluZyBhdCBldmVyeSBwb3NpdGlvblxuXHRpZiAodGhlRmlsdGVycy5sZW5ndGggPT09IDApIHJldHVybiBudWxsO1xuXG5cdGNvbnN0IHNvdXJjZSA9IHRoZUZpbHRlcnMubWFwKChpdGVtKSA9PiBgKCR7cXVvdGUoaXRlbS5maWx0ZXIpfSlgKS5qb2luKFwifFwiKTtcblxuXHQvLyBubyBtIGZsYWcgLSB0aGUgZmlsdGVycyBhcmUgcXVvdGVkIGxpdGVyYWxzLCBeIGFuZCAkIG5ldmVyIHJlYWNoIHRoZSByZWdleCBhcyBhbmNob3JzXG5cdHJldHVybiBuZXcgUmVnRXhwKHNvdXJjZSwgaXNDYXNlU2Vuc2l0aXZlID8gXCJnXCIgOiBcImdpXCIpO1xufTtcblxuLyoqXG4gKiBSZXBsYWNlcyBldmVyeSBmaWx0ZXIgb2YgYSBkaXJlY3Rpb24gaW4gb25lIHBhc3Mgb3ZlciB0aGUgdGV4dC5cbiAqXG4gKiBPbmUgcGFzcyBpcyB3aGF0IGtlZXBzIHRoZSBydWxlcyBhcGFydDogd2hhdGV2ZXIgYSByZXBsYWNlbWVudCBpbnNlcnRzIGlzIGJlaGluZCB0aGUgcG9zaXRpb24gdGhlXG4gKiB3YWxrIGNvbnRpbnVlcyBhdCwgc28gbm8gb3RoZXIgcnVsZSBjYW4gZXZlciBzZWUgaXQuIFRoZSByZXBsYWNlbWVudCBjb21lcyBmcm9tIGEgY2FsbGJhY2ssIHdob3NlXG4gKiByZXR1cm4gdmFsdWUgU3RyaW5nLnJlcGxhY2UgdGFrZXMgbGl0ZXJhbGx5IC0gYSB2YWx1ZSBjYXJyeWluZyAkJiwgJGAgb3IgJDEgaXMgaW5zZXJ0ZWQgYXMgd3JpdHRlbi5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtzdHJpbmd9IGFUZXh0XG4gKiBAcGFyYW0ge0FycmF5fSB0aGVGaWx0ZXJzXG4gKiBAcGFyYW0ge1JlZ0V4cHxudWxsfSBhTWF0Y2hlclxuICogQHJldHVybnMge3N0cmluZ31cbiAqL1xuY29uc3QgbWFwcGluZyA9IChhVGV4dCwgdGhlRmlsdGVycywgYU1hdGNoZXIpID0+IHtcblx0aWYgKGFNYXRjaGVyID09PSBudWxsKSByZXR1cm4gYVRleHQ7XG5cblx0cmV0dXJuIGFUZXh0LnJlcGxhY2UoYU1hdGNoZXIsICguLi5hcmdzKSA9PiB7XG5cdFx0Ly8gdGhlIHdob2xlIG1hdGNoIGNvbWVzIGZpcnN0LCB0aGVuIG9uZSBlbnRyeSBwZXIgZ3JvdXAsIHRoZW4gb2Zmc2V0IGFuZCB0ZXh0IC0gZXhhY3RseSBvbmVcblx0XHQvLyBvZiB0aGUgZ3JvdXBzIHRvb2sgcGFydFxuXHRcdGNvbnN0IGdyb3VwcyA9IGFyZ3Muc2xpY2UoMSwgMSArIHRoZUZpbHRlcnMubGVuZ3RoKTtcblx0XHRyZXR1cm4gdGhlRmlsdGVyc1tncm91cHMuZmluZEluZGV4KChncm91cCkgPT4gdHlwZW9mIGdyb3VwICE9PSBcInVuZGVmaW5lZFwiKV0udmFsdWU7XG5cdH0pO1xufTtcblxuLyoqXG4gKiBPbmUgZW50cnkgb2YgYSBjaGFyIG1hcC5cbiAqXG4gKiBAdHlwZWRlZiB7b2JqZWN0fSBDaGFyTWFwRW50cnlcbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBjaGFyIHRoZSB0ZXh0IHRvIGxvb2sgZm9yIHdoaWxlIGVzY2FwaW5nLCBtdXN0IG5vdCBiZSBlbXB0eVxuICogQHByb3BlcnR5IHtzdHJpbmd9IGVzY2FwZWQgd2hhdCBpdCBpcyByZXBsYWNlZCB3aXRoLiBBbiBlbXB0eSBvbmUgZHJvcHMgdGhlIHRleHQsIHdoaWNoIGNhbm5vdCBiZVxuICogICB1bmRvbmUgLSBzdWNoIGFuIGVudHJ5IHRha2VzIHBhcnQgaW4gZXNjYXBpbmcgb25seS5cbiAqIEBwcm9wZXJ0eSB7TU9ERVN9IFthdF0gbGltaXRzIHRoZSBlbnRyeSB0byBvbmUgZGlyZWN0aW9uLCB7QGxpbmsgTU9ERVN9LmVzY2FwZSBvclxuICogICB7QGxpbmsgTU9ERVN9LnVuZXNjYXBlLiBDb21wYXJlZCBpbiBsb3dlciBjYXNlLCBzbyB0aGUgc3BlbGxpbmcgb2YgdGhlIGRpcmVjdGlvbiBkb2VzIG5vdCBtYXR0ZXIuXG4gKiAgIFRha2luZyBwYXJ0IGluIGJvdGggaXMgdGhlIGRlZmF1bHQuIEFueXRoaW5nIGVsc2UgaXMgcmVqZWN0ZWQuXG4gKi9cblxuLyoqXG4gKiBSZXBsYWNlcyB0ZXh0cyBieSBhIGNoYXIgbWFwIGFuZCB0YWtlcyB0aGUgcmVwbGFjZW1lbnQgYmFjayBvdXQuXG4gKlxuICogQm90aCBkaXJlY3Rpb25zIHdhbGsgdGhlIHRleHQgb25jZSwgc28gYSByZXBsYWNlbWVudCBpcyBuZXZlciB0b3VjaGVkIGFnYWluIGJ5IGFub3RoZXIgZW50cnkuIFdoZXJlXG4gKiB0d28gZW50cmllcyBjYW4gbWF0Y2ggYXQgdGhlIHNhbWUgcGxhY2UsIHRoZSBvbmUgd3JpdHRlbiBmaXJzdCBpbiB0aGUgbWFwIHdpbnMuXG4gKlxuICogY2hhciBhbmQgZXNjYXBlZCBhcmUgdGV4dHMsIG5vdCBzaW5nbGUgY2hhcmFjdGVycyAtIGFuIGVudHJ5IG1heSBsb29rIGZvciBcImFhXCIgYW5kIHJlcGxhY2UgaXQgd2l0aFxuICogXCJ4eXpcIi4gQSBjaGFyYWN0ZXIgY2FycnlpbmcgYSBtZWFuaW5nIGluIGEgcmVndWxhciBleHByZXNzaW9uIGlzIG1hdGNoZWQgbGl0ZXJhbGx5LlxuICpcbiAqIEFuIGVudHJ5IG1heSBuYW1lIGEgZGlyZWN0aW9uIHRocm91Z2ggdGhlIGF0IG9mIGl0cyB7QGxpbmsgQ2hhck1hcEVudHJ5fSwgc2VlIHtAbGluayBNT0RFU30uXG4gKlxuICogQGV4YW1wbGVcbiAqIGNvbnN0IGVzY2FwZXIgPSBuZXcgRXNjYXBlcihbXG4gKiAgICAge2NoYXIgOiBcIlxcXFxcIiwgZXNjYXBlZCA6IFwiXFxcXFxcXFxcIn0sXG4gKiAgICAge2NoYXIgOiBcIlxcXCJcIiwgZXNjYXBlZCA6IFwiXFxcXFxcXCJcIn0sXG4gKiBdLCB0cnVlKTtcbiAqXG4gKiBlc2NhcGVyLmVzY2FwZShgc2F5IFwiaGlcImApOyAgICAgIC8vICdzYXkgXFxcXFwiaGlcXFxcXCInXG4gKiBlc2NhcGVyLnVuZXNjYXBlKCdzYXkgXFxcXFwiaGlcXFxcXCInKTsgICAvLyAnc2F5IFwiaGlcIidcbiAqL1xuY2xhc3MgRXNjYXBlciB7XG5cblx0LyoqXG5cdCAqIFRoZSByZXBsYWNlbWVudHMgb2YgdGhlIGVzY2FwZSBkaXJlY3Rpb24sIGluIHRoZSBvcmRlciBvZiB0aGUgY2hhciBtYXAuXG5cdCAqXG5cdCAqIEBwcml2YXRlXG5cdCAqIEB0eXBlIHtBcnJheTx7ZmlsdGVyIDogc3RyaW5nLCB2YWx1ZSA6IHN0cmluZ30+fVxuXHQgKi9cblx0I2VzY2FwZU1hcCA9IG51bGw7XG5cblx0LyoqXG5cdCAqIFRoZSByZXBsYWNlbWVudHMgb2YgdGhlIHVuZXNjYXBlIGRpcmVjdGlvbi4gU2hvcnRlciB0aGFuIHRoZSBlc2NhcGUgb25lIHdoZW5ldmVyIGFuIGVudHJ5IG5hbWVzXG5cdCAqIGEgZGlyZWN0aW9uIG9yIGRyb3BzIGl0cyB0ZXh0LlxuXHQgKlxuXHQgKiBAcHJpdmF0ZVxuXHQgKiBAdHlwZSB7QXJyYXk8e2ZpbHRlciA6IHN0cmluZywgdmFsdWUgOiBzdHJpbmd9Pn1cblx0ICovXG5cdCN1bmVzY2FwZU1hcCA9IG51bGw7XG5cblx0LyoqXG5cdCAqIFRoZSBjb21waWxlZCByZWdleCBjb3ZlcmluZyBldmVyeSBmaWx0ZXIgb2YgdGhlIGVzY2FwZSBkaXJlY3Rpb24sIG51bGwgd2hlbiB0aGVyZSBpcyBub3RoaW5nIHRvXG5cdCAqIGxvb2sgZm9yLiBJdHMgY2FwdHVyZSBncm91cHMgbGluZSB1cCB3aXRoICNlc2NhcGVNYXAuXG5cdCAqXG5cdCAqIEBwcml2YXRlXG5cdCAqIEB0eXBlIHtSZWdFeHB8bnVsbH1cblx0ICovXG5cdCNlc2NhcGVNYXRjaGVyID0gbnVsbDtcblxuXHQvKipcblx0ICogVGhlIHNhbWUgZm9yIHRoZSB1bmVzY2FwZSBkaXJlY3Rpb24sIGxpbmVkIHVwIHdpdGggI3VuZXNjYXBlTWFwLlxuXHQgKlxuXHQgKiBAcHJpdmF0ZVxuXHQgKiBAdHlwZSB7UmVnRXhwfG51bGx9XG5cdCAqL1xuXHQjdW5lc2NhcGVNYXRjaGVyID0gbnVsbDtcblxuXHQvKipcblx0ICogQHBhcmFtIHtBcnJheTxDaGFyTWFwRW50cnk+fSBlc2NhcGVNYXBcblx0ICogQHBhcmFtIHtib29sZWFufSBbaXNDYXNlU2Vuc2l0aXZlPWZhbHNlXSBsZWF2aW5nIGl0IG91dCBnaXZlcyBhIGNhc2UgaW5zZW5zaXRpdmUgZXNjYXBlciwgd2hpY2hcblx0ICogICBhbHNvIG1hdGNoZXMgdGhlIG90aGVyIGNhc2Ugb2YgYSBjaGFyIGFuZCB0aGVyZWZvcmUgZG9lcyBub3QgY2FycnkgdGhlIGNhc2UgdGhyb3VnaCBhXG5cdCAqICAgcm91bmR0cmlwXG5cdCAqIEB0aHJvd3Mge1R5cGVFcnJvcn0gd2hlbiB0aGUgbWFwIGlzIG5vIGFycmF5IG9yIGFueSBvZiBpdHMgZW50cmllcyBpcyB1bnVzYWJsZS4gRXZlcnkgcHJvYmxlbSBvZlxuXHQgKiAgIHRoZSBtYXAgaXMgcmVwb3J0ZWQgYXQgb25jZS5cblx0ICovXG5cdGNvbnN0cnVjdG9yKGVzY2FwZU1hcCwgaXNDYXNlU2Vuc2l0aXZlKSB7XG5cdFx0dmFsaWRhdGVDaGFyTWFwKGVzY2FwZU1hcCk7XG5cdFx0dGhpcy4jZXNjYXBlTWFwID0gYnVpbGRNYXBwaW5nTGlzdChlc2NhcGVNYXAsIE1PREVTLmVzY2FwZSk7XG5cdFx0dGhpcy4jdW5lc2NhcGVNYXAgPSBidWlsZE1hcHBpbmdMaXN0KGVzY2FwZU1hcCwgTU9ERVMudW5lc2NhcGUpO1xuXHRcdHRoaXMuI2VzY2FwZU1hdGNoZXIgPSBidWlsZE1hdGNoZXIodGhpcy4jZXNjYXBlTWFwLCBpc0Nhc2VTZW5zaXRpdmUpO1xuXHRcdHRoaXMuI3VuZXNjYXBlTWF0Y2hlciA9IGJ1aWxkTWF0Y2hlcih0aGlzLiN1bmVzY2FwZU1hcCwgaXNDYXNlU2Vuc2l0aXZlKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBSZXBsYWNlcyBldmVyeSBjaGFyIG9mIHRoZSBtYXAgd2l0aCBpdHMgZXNjYXBlZCB0ZXh0LlxuXHQgKlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gYVRleHRcblx0ICogQHJldHVybnMge3N0cmluZ31cblx0ICogQHRocm93cyB7VHlwZUVycm9yfSB3aGVuIHRoZSBhcmd1bWVudCBpcyBubyBzdHJpbmdcblx0ICovXG5cdGVzY2FwZShhVGV4dCkge1xuXHRcdGlmICh0eXBlb2YgYVRleHQgIT09IFwic3RyaW5nXCIpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJFeHBlY3RlZCBhIHN0cmluZ1wiKTtcblx0XHRyZXR1cm4gbWFwcGluZyhhVGV4dCwgdGhpcy4jZXNjYXBlTWFwLCB0aGlzLiNlc2NhcGVNYXRjaGVyKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBSZXBsYWNlcyBldmVyeSBlc2NhcGVkIHRleHQgb2YgdGhlIG1hcCB3aXRoIGl0cyBjaGFyLlxuXHQgKlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gYVRleHRcblx0ICogQHJldHVybnMge3N0cmluZ31cblx0ICogQHRocm93cyB7VHlwZUVycm9yfSB3aGVuIHRoZSBhcmd1bWVudCBpcyBubyBzdHJpbmdcblx0ICovXG5cdHVuZXNjYXBlKGFUZXh0KSB7XG5cdFx0aWYgKHR5cGVvZiBhVGV4dCAhPT0gXCJzdHJpbmdcIikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkV4cGVjdGVkIGEgc3RyaW5nXCIpO1xuXHRcdHJldHVybiBtYXBwaW5nKGFUZXh0LCB0aGlzLiN1bmVzY2FwZU1hcCwgdGhpcy4jdW5lc2NhcGVNYXRjaGVyKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBUaGUgZXNjYXBlciBmb3IgcmVndWxhciBleHByZXNzaW9ucywgc2VlIHtAbGluayBSRUdFWFBfRVNDQVBFUn0uXG5cdCAqXG5cdCAqIEByZXR1cm5zIHtFc2NhcGVyfSBhbHdheXMgdGhlIHNhbWUgaW5zdGFuY2Vcblx0ICovXG5cdHN0YXRpYyBSRUdFWFBfRVNDQVBFUigpIHtcblx0XHRyZXR1cm4gUkVHRVhQX0VTQ0FQRVI7XG5cdH1cbn1cblxuLyoqXG4gKiBFc2NhcGVyIHRha2luZyB0aGUgbWVhbmluZyBvdXQgb2YgZXZlcnkgY2hhcmFjdGVyIGEgcmVndWxhciBleHByZXNzaW9uIHJlYWRzIHNwZWNpYWxseSwgc28gYSB0ZXh0XG4gKiBjYW4gYmUgcHV0IGludG8gYSBwYXR0ZXJuIGFuZCBtYXRjaGVkIGxpdGVyYWxseS5cbiAqXG4gKiBAdHlwZSB7RXNjYXBlcn1cbiAqXG4gKiBAZXhhbXBsZVxuICogY29uc3QgcGF0dGVybiA9IG5ldyBSZWdFeHAoYF4ke1JFR0VYUF9FU0NBUEVSLmVzY2FwZShcImErYlwiKX0kYCk7XG4gKiBwYXR0ZXJuLnRlc3QoXCJhK2JcIik7ICAgLy8gdHJ1ZVxuICogcGF0dGVybi50ZXN0KFwiYWFiXCIpOyAgIC8vIGZhbHNlXG4gKi9cbi8vIGhhcyB0byBjb21lIGFmdGVyIHRoZSBjbGFzcyAtIHRoZSBzaW5nbGV0b24gaXMgYnVpbHQgd2hpbGUgdGhlIG1vZHVsZSBpcyBldmFsdWF0ZWQsIGFuZCBhIGNsYXNzXG4vLyBzdGF5cyBpbiBpdHMgdGVtcG9yYWwgZGVhZCB6b25lIHVudGlsIGl0cyBkZWNsYXJhdGlvbiBoYXMgcnVuXG5leHBvcnQgY29uc3QgUkVHRVhQX0VTQ0FQRVIgPSBuZXcgRXNjYXBlcihcblx0UkVHRVhDSEFSUy5tYXAoKGNoYXIpID0+IHtcblx0XHRyZXR1cm4geyBjaGFyLCBlc2NhcGVkOiBcIlxcXFxcIiArIGNoYXIgfTtcblx0fSksXG4pO1xuXG5leHBvcnQgZGVmYXVsdCBFc2NhcGVyO1xuIiwiLyoqXG4gKiBUaGUgZ2xvYmFsIHNjb3BlIG9mIHRoZSBjdXJyZW50IGVudmlyb25tZW50LlxuICpcbiAqIFJlc29sdmVkIG9uY2Ugd2hlbiB0aGUgbW9kdWxlIGlzIGxvYWRlZDogZ2xvYmFsVGhpcywgdGhlbiBnbG9iYWwsIHdpbmRvdyBhbmQgc2VsZiBmb3IgZW5naW5lcyBub3RcbiAqIGtub3dpbmcgaXQgeWV0LiBBbiBlbXB0eSBvYmplY3Qgd2hlbiBub25lIG9mIHRoZW0gZXhpc3RzLCBzbyByZWFkaW5nIGZyb20gaXQgbmV2ZXIgdGhyb3dzLlxuICpcbiAqIEBtb2R1bGUgR2xvYmFsXG4gKlxuICogQGV4YW1wbGVcbiAqIEdMT0JBTC5jcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKGJ1ZmZlcik7XG4gKi9cbmNvbnN0IEdMT0JBTCA9ICgoKSA9PiB7XG5cdGlmKHR5cGVvZiBnbG9iYWxUaGlzICE9PSBcInVuZGVmaW5lZFwiKSByZXR1cm4gZ2xvYmFsVGhpcztcblx0aWYodHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIikgcmV0dXJuIGdsb2JhbDtcblx0aWYodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIikgcmV0dXJuIHdpbmRvdztcblx0aWYodHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIpIHJldHVybiBzZWxmO1xuXHRyZXR1cm4ge307XG59KSgpO1xuXG5leHBvcnQgZGVmYXVsdCBHTE9CQUw7XG4iLCIvKipcclxuICogT25seSBhbiBvYmplY3QgY2FuIGNhcnJ5IGEgcHJvcGVydHksIHNvIGEgcGF0aCBzdG9wcyBhdCBhIHByaW1pdGl2ZSBpbnN0ZWFkIG9mIGhhbmRpbmcgb3V0IGFcclxuICogcHJvcGVydHkgdGhhdCBjYW5ub3QgYmUgcmVhZCBvciB3cml0dGVuLiBBbiBBcnJheSwgTWFwIG9yIERhdGUgcGFzc2VzIC0gdGhleSBhcmUgb2JqZWN0cyBhbmQgdGFrZVxyXG4gKiBhIHByb3BlcnR5IGxpa2UgYW55IG90aGVyIG9uZSwgd2hpY2ggaXMgd2hhdCBtYWtlcyBhIHBhdGggbGlrZSBcImxpc3QuMFwiIHdvcmsuXHJcbiAqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgdGhlIHZhbHVlIGEgc3RlcCBvZiB0aGUgcGF0aCByZXNvbHZlZCB0b1xyXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZSB0aGUgbmFtZSBvZiB0aGF0IHN0ZXBcclxuICogQHBhcmFtIHtzdHJpbmd9IGtleSB0aGUgd2hvbGUgcGF0aCwgdG8gdGVsbCB3aGljaCBvbmUgb2Ygc2V2ZXJhbCBzdGVwcyBmYWlsZWRcclxuICogQHJldHVybnMge3ZvaWR9XHJcbiAqIEB0aHJvd3Mge1R5cGVFcnJvcn0gd2hlbiB0aGUgc3RlcCBjYXJyaWVzIG5vIG9iamVjdFxyXG4gKi9cclxuY29uc3QgYXNzZXJ0RGVzY2VuZGFibGUgPSAodmFsdWUsIG5hbWUsIGtleSkgPT4ge1xyXG5cdGlmKHZhbHVlICE9PSBudWxsICYmIHR5cGVvZiB2YWx1ZSA9PT0gXCJvYmplY3RcIilcclxuXHRcdHJldHVybjtcclxuXHJcblx0Y29uc3QgdHlwZSA9IHZhbHVlID09PSBudWxsID8gXCJudWxsXCIgOiBgYSAke3R5cGVvZiB2YWx1ZX1gO1xyXG5cdHRocm93IG5ldyBUeXBlRXJyb3IoYGNhbm5vdCBkZXNjZW5kIGludG8gXCIke25hbWV9XCIgb2YgcGF0aCBcIiR7a2V5fVwiIC0gJHt0eXBlfSBpcyBubyBvYmplY3RgKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBPbmUgcHJvcGVydHkgb2YgYW4gb2JqZWN0LCBhZGRyZXNzZWQgYnkgbmFtZSwgdG9nZXRoZXIgd2l0aCB0aGUgb2JqZWN0IGNhcnJ5aW5nIGl0LlxyXG4gKlxyXG4gKiBCdWlsdCB0aHJvdWdoIHtAbGluayBPYmplY3RQcm9wZXJ0eS5sb2FkfSwgd2hpY2ggd2Fsa3MgYSBkb3R0ZWQgcGF0aCBhbmQgaGFuZHMgYmFjayB0aGUgcHJvcGVydHkgYXRcclxuICogaXRzIGVuZC5cclxuICpcclxuICogQGV4YW1wbGVcclxuICogY29uc3QgcHJvcGVydHkgPSBPYmplY3RQcm9wZXJ0eS5sb2FkKHthIDoge2IgOiAxfX0sIFwiYS5iXCIpO1xyXG4gKiBwcm9wZXJ0eS52YWx1ZTsgICAgICAvLyAxXHJcbiAqIHByb3BlcnR5LnZhbHVlID0gMjsgIC8vIHdyaXRlcyBpbnRvIHRoZSBvYmplY3RcclxuICovXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE9iamVjdFByb3BlcnR5IHtcclxuXHQvKipcclxuXHQgKiBAcGFyYW0ge3N0cmluZ30ga2V5IG5hbWUgb2YgdGhlIHByb3BlcnR5XHJcblx0ICogQHBhcmFtIHtvYmplY3R9IGNvbnRleHQgdGhlIG9iamVjdCBjYXJyeWluZyBpdFxyXG5cdCAqL1xyXG5cdGNvbnN0cnVjdG9yKGtleSwgY29udGV4dCl7XHJcblx0XHR0aGlzLmtleSA9IGtleTtcclxuXHRcdHRoaXMuY29udGV4dCA9IGNvbnRleHQ7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBXaGV0aGVyIHRoZSBrZXkgaXMgcmVhY2hhYmxlIG9uIHRoZSBjb250ZXh0IGF0IGFsbC5cclxuXHQgKlxyXG5cdCAqIFRoaXMgYW5zd2VycyBmb3IgdGhlIHdob2xlIHByb3RvdHlwZSBjaGFpbiwgbm90IG9ubHkgZm9yIG93biBwcm9wZXJ0aWVzIC0gbG9hZCh7fSwgXCJ0b1N0cmluZ1wiKVxyXG5cdCAqIHJlcG9ydHMgdHJ1ZS4gVGhhdCBpcyBkZWxpYmVyYXRlOiBhIHBhdGggbWF5IGFkZHJlc3MgYSBwcm90b3R5cGUgYW5kIGV4dGVuZCBpdCwgc28gYW4gaW5oZXJpdGVkXHJcblx0ICoga2V5IGlzIGEga2V5IGxpa2UgYW55IG90aGVyIGhlcmUuIFVzZSBoYXNWYWx1ZSB0byBhc2sgd2hldGhlciBzb21ldGhpbmcgaXMgYWN0dWFsbHkgc3RvcmVkLlxyXG5cdCAqXHJcblx0ICogQHJldHVybnMge2Jvb2xlYW59XHJcblx0ICovXHJcblx0Z2V0IGtleURlZmluZWQoKXtcclxuXHRcdHJldHVybiB0aGlzLmtleSBpbiB0aGlzLmNvbnRleHQ7XHJcblx0fVxyXG5cdFxyXG5cdC8qKlxyXG5cdCAqIFdoZXRoZXIgc29tZXRoaW5nIGlzIHN0b3JlZCB1bmRlciB0aGUga2V5LiBPbmx5IHVuZGVmaW5lZCBjb3VudHMgYXMgbm90aGluZyAtIDAsIFwiXCIsIGZhbHNlIGFuZFxyXG5cdCAqIG51bGwgYXJlIHZhbHVlcy5cclxuXHQgKlxyXG5cdCAqIEByZXR1cm5zIHtib29sZWFufVxyXG5cdCAqL1xyXG5cdGdldCBoYXNWYWx1ZSgpe1xyXG5cdFx0cmV0dXJuIHR5cGVvZiB0aGlzLmNvbnRleHRbdGhpcy5rZXldICE9PSBcInVuZGVmaW5lZFwiO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQHJldHVybnMgeyp9IHRoZSBzdG9yZWQgdmFsdWUsIHVuZGVmaW5lZCB3aGVuIHRoZXJlIGlzIG5vbmVcclxuXHQgKi9cclxuXHRnZXQgdmFsdWUoKXtcclxuXHRcdHJldHVybiB0aGlzLmNvbnRleHRbdGhpcy5rZXldO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQHBhcmFtIHsqfSBkYXRhXHJcblx0ICovXHJcblx0c2V0IHZhbHVlKGRhdGEpe1xyXG5cdFx0dGhpcy5jb250ZXh0W3RoaXMua2V5XSA9IGRhdGE7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBBZGRzIGEgdmFsdWUgbmV4dCB0byB3aGF0IGlzIGFscmVhZHkgdGhlcmU6IHdyaXRlcyBpdCB3aGVuIHRoZSBrZXkgaG9sZHMgbm90aGluZywgdHVybnMgdGhlXHJcblx0ICogdmFsdWUgaW50byBhbiBhcnJheSBvZiBib3RoIHdoZW4gaXQgaG9sZHMgb25lLCBhbmQgcHVzaGVzIG9udG8gdGhlIGFycmF5IHdoZW4gaXQgaG9sZHMgb25lXHJcblx0ICogYWxyZWFkeS5cclxuXHQgKlxyXG5cdCAqIFRoZSB2YWx1ZSBpdHNlbGYgaXMgbm90IGxvb2tlZCBhdCAtIGFwcGVuZGluZyB1bmRlZmluZWQgcHV0cyB1bmRlZmluZWQgaW50byB0aGUgYXJyYXkuXHJcblx0ICpcclxuXHQgKiBAcGFyYW0geyp9IGRhdGFcclxuXHQgKlxyXG5cdCAqIEBleGFtcGxlXHJcblx0ICogcHJvcGVydHkuYXBwZW5kID0gMTsgICAvLyB7a2V5IDogMX1cclxuXHQgKiBwcm9wZXJ0eS5hcHBlbmQgPSAyOyAgIC8vIHtrZXkgOiBbMSwgMl19XHJcblx0ICogcHJvcGVydHkuYXBwZW5kID0gMzsgICAvLyB7a2V5IDogWzEsIDIsIDNdfVxyXG5cdCAqL1xyXG5cdHNldCBhcHBlbmQoZGF0YSkge1xyXG5cdFx0aWYoIXRoaXMuaGFzVmFsdWUpXHJcblx0XHRcdHRoaXMudmFsdWUgPSBkYXRhO1xyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdGNvbnN0IHZhbHVlID0gdGhpcy52YWx1ZTtcclxuXHRcdFx0aWYodmFsdWUgaW5zdGFuY2VvZiBBcnJheSlcclxuXHRcdFx0XHR2YWx1ZS5wdXNoKGRhdGEpO1xyXG5cdFx0XHRlbHNlXHJcblx0XHRcdFx0dGhpcy52YWx1ZSA9IFt0aGlzLnZhbHVlLCBkYXRhXTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIERlbGV0ZXMgdGhlIGtleSBmcm9tIHRoZSBvYmplY3QuIERvZXMgbm90aGluZyB3aGVuIGl0IGlzIG5vdCB0aGVyZS5cclxuXHQgKlxyXG5cdCAqIEByZXR1cm5zIHt2b2lkfVxyXG5cdCAqL1xyXG5cdHJlbW92ZSgpe1xyXG5cdFx0ZGVsZXRlIHRoaXMuY29udGV4dFt0aGlzLmtleV07XHJcblx0fVxyXG5cdFxyXG5cdC8qKlxyXG5cdCAqIExvYWRzIHRoZSBwcm9wZXJ0eSBhIGRvdHRlZCBwYXRoIGFkZHJlc3Nlcy4gRXZlcnkgcGFydCBvZiB0aGUgcGF0aCBpcyB0cmltbWVkLCBzbyBcIiBhIC4gYiBcIlxyXG5cdCAqIGFkZHJlc3NlcyB0aGUgc2FtZSBwcm9wZXJ0eSBhcyBcImEuYlwiLlxyXG5cdCAqXHJcblx0ICogQSBtaXNzaW5nIHN0ZXAgaXMgY3JlYXRlZCB3aXRoIGNyZWF0ZSwgb3RoZXJ3aXNlIHRoZSBwYXRoIGlzIHJlcG9ydGVkIGFzIG5vdCBsb2FkYWJsZS4gQSBzdGVwXHJcblx0ICogaG9sZGluZyBzb21ldGhpbmcgdGhhdCBpcyBubyBvYmplY3QgY2Fubm90IGJlIHdhbGtlZCBpbnRvIGF0IGFsbCAtIHRoYXQgaXMgYSBicm9rZW4gcGF0aCwgbm90IGFcclxuXHQgKiBtaXNzaW5nIG9uZSwgYW5kIGl0IGlzIHJlcG9ydGVkIGFzIGFuIGVycm9yIHJlZ2FyZGxlc3Mgb2YgY3JlYXRlLlxyXG5cdCAqXHJcblx0ICogQHBhcmFtIHtvYmplY3R9IGRhdGEgdGhlIG9iamVjdCB0byB3YWxrXHJcblx0ICogQHBhcmFtIHtzdHJpbmd9IGtleSBuYW1lIG9mIHRoZSBwcm9wZXJ0eSwgYSBkb3R0ZWQgcGF0aCBhZGRyZXNzZXMgYSBuZXN0ZWQgb25lXHJcblx0ICogQHBhcmFtIHtib29sZWFufSBbY3JlYXRlPXRydWVdIGNyZWF0ZSBhIG1pc3Npbmcgc3RlcCBvbiB0aGUgd2F5XHJcblx0ICogQHJldHVybnMge09iamVjdFByb3BlcnR5fG51bGx9IG51bGwgd2hlbiBhIHN0ZXAgaXMgbWlzc2luZyBhbmQgY3JlYXRlIGlzIGZhbHNlXHJcblx0ICogQHRocm93cyB7VHlwZUVycm9yfSB3aGVuIGEgc3RlcCBvZiB0aGUgcGF0aCBob2xkcyBzb21ldGhpbmcgdGhhdCBpcyBubyBvYmplY3RcclxuXHQgKlxyXG5cdCAqIEBleGFtcGxlXHJcblx0ICogT2JqZWN0UHJvcGVydHkubG9hZCh7YSA6IHtiIDogMX19LCBcImEuYlwiKS52YWx1ZTsgICAvLyAxXHJcblx0ICogT2JqZWN0UHJvcGVydHkubG9hZCh7bGlzdCA6IFsxLCAyXX0sIFwibGlzdC4xXCIpLnZhbHVlOyAgIC8vIDIsIGFuIGFycmF5IGlzIGFuIG9iamVjdFxyXG5cdCAqIE9iamVjdFByb3BlcnR5LmxvYWQoe30sIFwiYS5iXCIsIGZhbHNlKTsgICAgICAgICAgICAgLy8gbnVsbFxyXG5cdCAqIE9iamVjdFByb3BlcnR5LmxvYWQoe2EgOiAwfSwgXCJhLmJcIik7ICAgICAgICAgICAgICAgLy8gdGhyb3dzLCAwIGlzIG5vIG9iamVjdFxyXG5cdCAqL1xyXG5cdHN0YXRpYyBsb2FkKGRhdGEsIGtleSwgY3JlYXRlPXRydWUpIHtcclxuXHRcdGxldCBjb250ZXh0ID0gZGF0YTtcclxuXHRcdGNvbnN0IGtleXMgPSBrZXkuc3BsaXQoXCIuXCIpO1xyXG5cdFx0bGV0IG5hbWUgPSBrZXlzLnNoaWZ0KCkudHJpbSgpO1xyXG5cdFx0d2hpbGUoa2V5cy5sZW5ndGggPiAwKXtcclxuXHRcdFx0aWYodHlwZW9mIGNvbnRleHRbbmFtZV0gPT09IFwidW5kZWZpbmVkXCIgfHwgY29udGV4dFtuYW1lXSA9PT0gbnVsbCl7XHJcblx0XHRcdFx0aWYoIWNyZWF0ZSlcclxuXHRcdFx0XHRcdHJldHVybiBudWxsO1xyXG5cclxuXHRcdFx0XHRjb250ZXh0W25hbWVdID0ge31cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0YXNzZXJ0RGVzY2VuZGFibGUoY29udGV4dFtuYW1lXSwgbmFtZSwga2V5KTtcclxuXHRcdFx0Y29udGV4dCA9IGNvbnRleHRbbmFtZV07XHJcblx0XHRcdG5hbWUgPSBrZXlzLnNoaWZ0KCkudHJpbSgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiBuZXcgT2JqZWN0UHJvcGVydHkobmFtZSwgY29udGV4dCk7XHJcblx0fVxyXG59OyIsIi8qKlxyXG4gKiBVdGlsaXRpZXMgdG8gaW5zcGVjdCwgY29tcGFyZSwgbWVyZ2UgYW5kIGZpbHRlciBqYXZhc2NyaXB0IG9iamVjdHMuXHJcbiAqXHJcbiAqIFNldmVyYWwgZnVuY3Rpb25zIHNoYXJlIG9uZSBub3Rpb24gb2YgZGF0YTogcHJpbWl0aXZlcywgc2ltcGxlIG9iamVjdHMsIEFycmF5LCBEYXRlLCBSZWdFeHAsIE1hcFxyXG4gKiBhbmQgU2V0LiB7QGxpbmsgaXNQb2pvfSBkZWNpZGVzIHdoZXRoZXIgYSB2YWx1ZSBzdGF5cyB3aXRoaW4gaXQsIHtAbGluayBlcXVhbFBvam99IGNvbXBhcmVzIHRob3NlXHJcbiAqIHR5cGVzIGJ5IHZhbHVlLCBhbmQge0BsaW5rIG1lcmdlfSB0cmVhdHMgZXZlcnl0aGluZyBvdXRzaWRlIG9mIGl0IGFzIGEgdmFsdWUgdG8gYmUgcmVwbGFjZWQuXHJcbiAqXHJcbiAqIEBtb2R1bGUgT2JqZWN0VXRpbHNcclxuICovXHJcbmltcG9ydCBPYmplY3RQcm9wZXJ0eSBmcm9tIFwiLi9PYmplY3RQcm9wZXJ0eS5qc1wiO1xyXG5cclxuLyoqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBwYXJhbSB7QXJyYXl9IGFcclxuICogQHBhcmFtIHtBcnJheX0gYlxyXG4gKiBAcGFyYW0ge1dlYWtNYXB9IHNlZW4gcGFpcnMgY3VycmVudGx5IHVuZGVyIGNvbXBhcmlzb25cclxuICogQHJldHVybnMge2Jvb2xlYW59XHJcbiAqL1xyXG5jb25zdCBlcXVhbEFycmF5ID0gKGEsIGIsIHNlZW4pID0+IHtcclxuXHRpZiAoYS5sZW5ndGggIT09IGIubGVuZ3RoKSByZXR1cm4gZmFsc2U7XHJcblxyXG5cdGNvbnN0IGxlbmd0aCA9IGEubGVuZ3RoO1xyXG5cdGZvciAobGV0IGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIGlmICghaW50ZXJuYWxFcXVhbFBvam8oYVtpXSwgYltpXSwgc2VlbikpIHJldHVybiBmYWxzZTtcclxuXHJcblx0cmV0dXJuIHRydWU7XHJcbn07XHJcblxyXG4vKipcclxuICogQSBzZXQgaXMgdW5vcmRlcmVkLCBzbyBldmVyeSBlbnRyeSBvZiBhIGhhcyB0byBmaW5kIGl0cyBvd24gcGFydG5lciBpbiBiLlxyXG4gKlxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAcGFyYW0ge1NldH0gYVxyXG4gKiBAcGFyYW0ge1NldH0gYlxyXG4gKiBAcGFyYW0ge1dlYWtNYXB9IHNlZW4gcGFpcnMgY3VycmVudGx5IHVuZGVyIGNvbXBhcmlzb25cclxuICogQHJldHVybnMge2Jvb2xlYW59XHJcbiAqL1xyXG5jb25zdCBlcXVhbFNldCA9IChhLCBiLCBzZWVuKSA9PiB7XHJcblx0aWYgKGEuc2l6ZSAhPT0gYi5zaXplKSByZXR1cm4gZmFsc2U7XHJcblxyXG5cdGNvbnN0IHJlbWFpbmluZyA9IEFycmF5LmZyb20oYik7XHJcblx0Zm9yIChjb25zdCBlbnRyeUEgb2YgYSkge1xyXG5cdFx0Y29uc3QgaW5kZXggPSByZW1haW5pbmcuZmluZEluZGV4KChlbnRyeUIpID0+IGludGVybmFsRXF1YWxQb2pvKGVudHJ5QSwgZW50cnlCLCBzZWVuKSk7XHJcblx0XHRpZiAoaW5kZXggPCAwKSByZXR1cm4gZmFsc2U7XHJcblxyXG5cdFx0cmVtYWluaW5nLnNwbGljZShpbmRleCwgMSk7XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gdHJ1ZTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBBIG1hcCBpcyB1bm9yZGVyZWQgYXMgd2VsbCBhbmQgaXRzIGtleXMgbWF5IGJlIG9iamVjdHMsIHNvIHRoZSBrZXlzIGdldCBjb21wYXJlZCBieSB2YWx1ZSB0b28uXHJcbiAqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBwYXJhbSB7TWFwfSBhXHJcbiAqIEBwYXJhbSB7TWFwfSBiXHJcbiAqIEBwYXJhbSB7V2Vha01hcH0gc2VlbiBwYWlycyBjdXJyZW50bHkgdW5kZXIgY29tcGFyaXNvblxyXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cclxuICovXHJcbmNvbnN0IGVxdWFsTWFwID0gKGEsIGIsIHNlZW4pID0+IHtcclxuXHRpZiAoYS5zaXplICE9PSBiLnNpemUpIHJldHVybiBmYWxzZTtcclxuXHJcblx0Y29uc3QgcmVtYWluaW5nID0gQXJyYXkuZnJvbShiKTtcclxuXHRmb3IgKGNvbnN0IFtrZXlBLCB2YWx1ZUFdIG9mIGEpIHtcclxuXHRcdGNvbnN0IGluZGV4ID0gcmVtYWluaW5nLmZpbmRJbmRleCgoW2tleUIsIHZhbHVlQl0pID0+IGludGVybmFsRXF1YWxQb2pvKGtleUEsIGtleUIsIHNlZW4pICYmIGludGVybmFsRXF1YWxQb2pvKHZhbHVlQSwgdmFsdWVCLCBzZWVuKSk7XHJcblx0XHRpZiAoaW5kZXggPCAwKSByZXR1cm4gZmFsc2U7XHJcblxyXG5cdFx0cmVtYWluaW5nLnNwbGljZShpbmRleCwgMSk7XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gdHJ1ZTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDb21wYXJlcyB0d28gb2JqZWN0cyBieSBwcm90b3R5cGUgYW5kIGJ5IHRoZWlyIG93biBlbnVtZXJhYmxlIHByb3BlcnRpZXMuXHJcbiAqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBwYXJhbSB7b2JqZWN0fSBhXHJcbiAqIEBwYXJhbSB7b2JqZWN0fSBiXHJcbiAqIEBwYXJhbSB7V2Vha01hcH0gc2VlbiBwYWlycyBjdXJyZW50bHkgdW5kZXIgY29tcGFyaXNvblxyXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cclxuICovXHJcbmNvbnN0IGVxdWFsT2JqZWN0ID0gKGEsIGIsIHNlZW4pID0+IHtcclxuXHRpZiAoT2JqZWN0LmdldFByb3RvdHlwZU9mKGEpICE9PSBPYmplY3QuZ2V0UHJvdG90eXBlT2YoYikpIHJldHVybiBmYWxzZTtcclxuXHJcblx0Y29uc3QgcHJvcGVydGllc0EgPSBPYmplY3Qua2V5cyhhKTtcclxuXHRjb25zdCBwcm9wZXJ0aWVzQiA9IE9iamVjdC5rZXlzKGIpO1xyXG5cdGlmIChwcm9wZXJ0aWVzQS5sZW5ndGggIT09IHByb3BlcnRpZXNCLmxlbmd0aCkgcmV0dXJuIGZhbHNlO1xyXG5cclxuXHRmb3IgKGNvbnN0IGtleSBvZiBwcm9wZXJ0aWVzQSkge1xyXG5cdFx0Ly8gZXF1YWwga2V5IGNvdW50cyBhbG9uZSB3b3VsZCBsZXQge3g6MSwgeTp1bmRlZmluZWR9IHBhc3MgYWdhaW5zdCB7eDoxLCB6OnVuZGVmaW5lZH1cclxuXHRcdGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKGIsIGtleSkpIHJldHVybiBmYWxzZTtcclxuXHRcdGlmICghaW50ZXJuYWxFcXVhbFBvam8oYVtrZXldLCBiW2tleV0sIHNlZW4pKSByZXR1cm4gZmFsc2U7XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gdHJ1ZTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBBIGN5Y2xpYyBzdHJ1Y3R1cmUgY2FuIG9ubHkgYmUgZGVjaWRlZCBjby1pbmR1Y3RpdmVseTogYSBwYWlyIGFscmVhZHkgdW5kZXIgY29tcGFyaXNvbiBjb3VudHMgYXNcclxuICogZXF1YWwsIG90aGVyd2lzZSB0aGUgd2FsayB3b3VsZCBuZXZlciBjb21lIGJhY2suXHJcbiAqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBwYXJhbSB7V2Vha01hcH0gc2VlbiBwYWlycyBjdXJyZW50bHkgdW5kZXIgY29tcGFyaXNvblxyXG4gKiBAcGFyYW0ge29iamVjdH0gYVxyXG4gKiBAcGFyYW0ge29iamVjdH0gYlxyXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gdHJ1ZSB3aGVuIHRoaXMgcGFpciBpcyBhbHJlYWR5IGJlaW5nIGNvbXBhcmVkIGZ1cnRoZXIgdXAgdGhlIHN0YWNrXHJcbiAqL1xyXG5jb25zdCBpc0NvbXBhcmluZyA9IChzZWVuLCBhLCBiKSA9PiB7XHJcblx0Y29uc3QgcGFydG5lcnMgPSBzZWVuLmdldChhKTtcclxuXHRyZXR1cm4gISFwYXJ0bmVycyAmJiBwYXJ0bmVycy5oYXMoYik7XHJcbn07XHJcblxyXG4vKipcclxuICogTm90ZXMgYSBwYWlyIGFzIGJlaW5nIGNvbXBhcmVkLCBzbyBhIGN5Y2xlIHJ1bm5pbmcgdGhyb3VnaCBpdCB0ZXJtaW5hdGVzLlxyXG4gKlxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAcGFyYW0ge1dlYWtNYXB9IHNlZW4gcGFpcnMgY3VycmVudGx5IHVuZGVyIGNvbXBhcmlzb25cclxuICogQHBhcmFtIHtvYmplY3R9IGFcclxuICogQHBhcmFtIHtvYmplY3R9IGJcclxuICogQHJldHVybnMge3ZvaWR9XHJcbiAqL1xyXG5jb25zdCByZW1lbWJlckNvbXBhcmluZyA9IChzZWVuLCBhLCBiKSA9PiB7XHJcblx0Y29uc3QgcGFydG5lcnMgPSBzZWVuLmdldChhKTtcclxuXHRpZiAocGFydG5lcnMpIHBhcnRuZXJzLmFkZChiKTtcclxuXHRlbHNlIHNlZW4uc2V0KGEsIG5ldyBXZWFrU2V0KFtiXSkpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENoZWNrcyB3aGV0aGVyIGEgdmFsdWUgaXMgbnVsbCBvciB1bmRlZmluZWQuXHJcbiAqXHJcbiAqIFZhbHVlSGVscGVyLm5vVmFsdWUgYW5zd2VycyB0aGUgc2FtZSBxdWVzdGlvbi4gQm90aCBhcmUga2VwdCBvbiBwdXJwb3NlLCBzbyBWYWx1ZUhlbHBlciBzdGF5cyBmcmVlXHJcbiAqIG9mIGEgZGVwZW5kZW5jeSBvbiB0aGlzIG1vZHVsZSAtIHNlZSB0aGUgbm90ZSB0aGVyZS5cclxuICpcclxuICogQHBhcmFtIHsqfSBvYmplY3QgdGhlIHZhbHVlIHRvIGJlIHRlc3RpbmdcclxuICogQHJldHVybnMge2Jvb2xlYW59XHJcbiAqL1xyXG5leHBvcnQgY29uc3QgaXNOdWxsT3JVbmRlZmluZWQgPSAob2JqZWN0KSA9PiB7XHJcblx0cmV0dXJuIG9iamVjdCA9PSBudWxsIHx8IHR5cGVvZiBvYmplY3QgPT09IFwidW5kZWZpbmVkXCI7XHJcbn07XHJcblxyXG4vKipcclxuICogQ2hlY2tzIHdoZXRoZXIgYSB2YWx1ZSBpcyBhIHByaW1pdGl2ZS5cclxuICpcclxuICogbnVsbCBhbmQgdW5kZWZpbmVkIGNvdW50IGFzIHByaW1pdGl2ZXMuIEEgc3ltYm9sIGRvZXMgbm90IC0gaXQgaXMgdHJlYXRlZCBhcyBhbiBvcGFxdWUgdmFsdWVcclxuICogdGhyb3VnaG91dCB0aGlzIG1vZHVsZSwgc28gdGhhdCB7QGxpbmsgaXNQb2pvfSBrZWVwcyByZWplY3RpbmcgaXQgYXMgZGF0YS5cclxuICpcclxuICogQHBhcmFtIHsqfSBvYmplY3QgdGhlIHZhbHVlIHRvIGJlIHRlc3RpbmdcclxuICogQHJldHVybnMge2Jvb2xlYW59XHJcbiAqL1xyXG5leHBvcnQgY29uc3QgaXNQcmltaXRpdmUgPSAob2JqZWN0KSA9PiB7XHJcblx0aWYgKG9iamVjdCA9PSBudWxsKSByZXR1cm4gdHJ1ZTtcclxuXHJcblx0Y29uc3QgdHlwZSA9IHR5cGVvZiBvYmplY3Q7XHJcblx0c3dpdGNoICh0eXBlKSB7XHJcblx0XHRjYXNlIFwibnVtYmVyXCI6XHJcblx0XHRjYXNlIFwiYmlnaW50XCI6XHJcblx0XHRjYXNlIFwiYm9vbGVhblwiOlxyXG5cdFx0Y2FzZSBcInN0cmluZ1wiOlxyXG5cdFx0Y2FzZSBcInVuZGVmaW5lZFwiOlxyXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHR9XHJcblxyXG5cdHJldHVybiBmYWxzZTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDaGVja3Mgd2hldGhlciBhIHZhbHVlIGlzIGFuIG9iamVjdC5cclxuICpcclxuICogRXZlcnkgb2JqZWN0IGNvdW50cywgQXJyYXksIE1hcCwgRGF0ZSBhbmQgY2xhc3MgaW5zdGFuY2VzIGluY2x1ZGVkLiBVc2Uge0BsaW5rIGlzUG9qb30gdG8gYXNrIGZvclxyXG4gKiBhIHNpbXBsZSBkYXRhIG9iamVjdCBpbnN0ZWFkLlxyXG4gKlxyXG4gKiBAcGFyYW0geyp9IG9iamVjdCB0aGUgdmFsdWUgdG8gYmUgdGVzdGluZ1xyXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cclxuICovXHJcbmV4cG9ydCBjb25zdCBpc09iamVjdCA9IChvYmplY3QpID0+IHtcclxuXHRpZiAoaXNOdWxsT3JVbmRlZmluZWQob2JqZWN0KSkgcmV0dXJuIGZhbHNlO1xyXG5cclxuXHRyZXR1cm4gdHlwZW9mIG9iamVjdCA9PT0gXCJvYmplY3RcIjtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDb21wYXJlcyB0d28gdmFsdWVzIGJ5IHZhbHVlLlxyXG4gKlxyXG4gKiBUaGUgdHlwZXMgY29tcGFyZWQgYnkgdmFsdWUgYXJlIHRoZSBvbmVzIHtAbGluayBpc1Bvam99IGFjY2VwdHMgYXMgZGF0YTogcHJpbWl0aXZlcywgc2ltcGxlXHJcbiAqIG9iamVjdHMsIEFycmF5LCBEYXRlLCBSZWdFeHAsIE1hcCBhbmQgU2V0LiBBIERhdGUgaXMgY29tcGFyZWQgYnkgaXRzIHRpbWUsIGEgUmVnRXhwIGJ5IHNvdXJjZSBhbmRcclxuICogZmxhZ3MuIFNldCBhbmQgTWFwIGFyZSB1bm9yZGVyZWQsIHNvIHRoZWlyIGVudHJpZXMgYXJlIG1hdGNoZWQgYnkgdmFsdWUgaW5zdGVhZCBvZiBieSBwb3NpdGlvbixcclxuICogYW5kIHRoZSBrZXlzIG9mIGEgTWFwIHRha2UgcGFydCBpbiB0aGF0IGNvbXBhcmlzb24uXHJcbiAqXHJcbiAqIFNpbXBsZSBvYmplY3RzIGFuZCBjbGFzcyBpbnN0YW5jZXMgbmVlZCB0aGUgc2FtZSBwcm90b3R5cGUgYW5kIHRoZSBzYW1lIG93biBlbnVtZXJhYmxlXHJcbiAqIHByb3BlcnRpZXMuIEV2ZXJ5IG90aGVyIG9iamVjdCAtIEVycm9yLCBQcm9taXNlLCBXZWFrTWFwIGFuZCB0aGUgbGlrZSAtIGtlZXBzIGl0cyBzdGF0ZSBvdXQgb2ZcclxuICogcmVhY2gsIHNvIHRob3NlIGNvbXBhcmUgYnkgaWRlbnRpdHkgb25seS4gRnVuY3Rpb25zIGFuZCBzeW1ib2xzIGRvIGFzIHdlbGwuXHJcbiAqXHJcbiAqIEN5Y2xpYyBzdHJ1Y3R1cmVzIGFyZSBzdXBwb3J0ZWQuXHJcbiAqXHJcbiAqIEBwYXJhbSB7Kn0gYVxyXG4gKiBAcGFyYW0geyp9IGJcclxuICogQHJldHVybnMge2Jvb2xlYW59XHJcbiAqXHJcbiAqIEBleGFtcGxlXHJcbiAqIGVxdWFsUG9qbyh7YSA6IFsxLCAyXX0sIHthIDogWzEsIDJdfSk7ICAgICAgICAgICAgICAgLy8gdHJ1ZVxyXG4gKiBlcXVhbFBvam8obmV3IFNldChbMSwgMl0pLCBuZXcgU2V0KFsyLCAxXSkpOyAgICAgICAgIC8vIHRydWUsIGEgc2V0IGlzIHVub3JkZXJlZFxyXG4gKiBlcXVhbFBvam8obmV3IERhdGUoMCksIG5ldyBEYXRlKDEpKTsgICAgICAgICAgICAgICAgIC8vIGZhbHNlXHJcbiAqIGVxdWFsUG9qbyhuZXcgRXJyb3IoXCJ4XCIpLCBuZXcgRXJyb3IoXCJ4XCIpKTsgICAgICAgICAgIC8vIGZhbHNlLCBjb21wYXJlZCBieSBpZGVudGl0eVxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IGVxdWFsUG9qbyA9IChhLCBiKSA9PiBpbnRlcm5hbEVxdWFsUG9qbyhhLCBiLCBuZXcgV2Vha01hcCgpKTtcclxuXHJcblxyXG4vKipcclxuKiBAcGFyYW0geyp9IGFcclxuICogQHBhcmFtIHsqfSBiXHJcbiAqIEBwYXJhbSB7V2Vha01hcH0gc2VlbiBpbnRlcm5hbCwgdHJhY2tzIHRoZSBwYWlycyBjdXJyZW50bHkgdW5kZXIgY29tcGFyaXNvblxyXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cclxuICovXHJcbmNvbnN0IGludGVybmFsRXF1YWxQb2pvID0gKGEsIGIsIHNlZW4pID0+IHtcclxuXHRpZiAoaXNOdWxsT3JVbmRlZmluZWQoYSkgfHwgaXNOdWxsT3JVbmRlZmluZWQoYikpIHJldHVybiBhID09PSBiO1xyXG5cdGlmIChhID09PSBiKSByZXR1cm4gdHJ1ZTtcclxuXHRpZiAoaXNQcmltaXRpdmUoYSkgfHwgaXNQcmltaXRpdmUoYikpIHJldHVybiBhID09PSBiO1xyXG5cclxuXHRjb25zdCB0eXBlQSA9IHR5cGVvZiBhO1xyXG5cdGlmICh0eXBlQSAhPT0gdHlwZW9mIGIpIHJldHVybiBmYWxzZTtcclxuXHRpZiAodHlwZUEgIT09IFwib2JqZWN0XCIpIHJldHVybiBhID09PSBiOyAvLyBmdW5jdGlvbiBhbmQgc3ltYm9sXHJcblxyXG5cdGlmIChpc0NvbXBhcmluZyhzZWVuLCBhLCBiKSkgcmV0dXJuIHRydWU7XHJcblx0cmVtZW1iZXJDb21wYXJpbmcoc2VlbiwgYSwgYik7XHJcblxyXG5cdGlmKGEgaW5zdGFuY2VvZiBEYXRlKSByZXR1cm4gIGIgaW5zdGFuY2VvZiBEYXRlID8gT2JqZWN0LmlzKGEuZ2V0VGltZSgpLCBiLmdldFRpbWUoKSkgOiBmYWxzZTtcclxuXHRlbHNlIGlmKGEgaW5zdGFuY2VvZiBSZWdFeHApIHJldHVybiBiIGluc3RhbmNlb2YgUmVnRXhwID8gKGEuc291cmNlID09PSBiLnNvdXJjZSAmJiBhLmZsYWdzID09PSBiLmZsYWdzKSA6IGZhbHNlO1xyXG5cdGVsc2UgaWYoYSBpbnN0YW5jZW9mIEFycmF5KSByZXR1cm4gYiBpbnN0YW5jZW9mIEFycmF5ID8gZXF1YWxBcnJheShhLCBiLCBzZWVuKSA6IGZhbHNlO1xyXG5cdGVsc2UgaWYoYSBpbnN0YW5jZW9mIFNldCkgcmV0dXJuIGIgaW5zdGFuY2VvZiBTZXQgPyBlcXVhbFNldChhLCBiLCBzZWVuKSA6IGZhbHNlO1xyXG5cdGVsc2UgaWYoYSBpbnN0YW5jZW9mIE1hcCkgcmV0dXJuIGIgaW5zdGFuY2VvZiBNYXAgPyBlcXVhbE1hcChhLCBiLCBzZWVuKSA6IGZhbHNlO1xyXG5cdGVsc2UgaWYgKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChhKSAhPT0gXCJbb2JqZWN0IE9iamVjdF1cIikgcmV0dXJuIGZhbHNlO1x0XHJcblx0ZWxzZSByZXR1cm4gZXF1YWxPYmplY3QoYSwgYiwgc2Vlbik7XHJcbn07XHJcblxyXG4vKipcclxuICogQSBwbGFpbiBvYmplY3Qgb3ducyBlaXRoZXIgbm8gcHJvdG90eXBlIGF0IGFsbCBvciBhIHByb3RvdHlwZSB0aGF0IGl0c2VsZiBoYXMgbm9uZS4gQ2hlY2tpbmcgdGhlXHJcbiAqIGNoYWluIGxlbmd0aCBpbnN0ZWFkIG9mIGNvbXBhcmluZyBhZ2FpbnN0IE9iamVjdC5wcm90b3R5cGUga2VlcHMgdGhpcyB3b3JraW5nIGFjcm9zcyByZWFsbXMsXHJcbiAqIHdoZXJlIGFuIGlmcmFtZSBicmluZ3MgaXRzIG93biBPYmplY3QucHJvdG90eXBlLlxyXG4gKlxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAcGFyYW0geyp9IG9iamVjdFxyXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cclxuICovXHJcbmNvbnN0IGlzUGxhaW5PYmplY3QgPSAob2JqZWN0KSA9PiB7XHJcblx0aWYgKG9iamVjdCA9PT0gbnVsbCB8fCB0eXBlb2Ygb2JqZWN0ICE9PSBcIm9iamVjdFwiKSByZXR1cm4gZmFsc2U7XHJcblx0Y29uc3QgcHJvdG90eXBlID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKG9iamVjdCk7XHJcblx0cmV0dXJuIHByb3RvdHlwZSA9PT0gbnVsbCB8fCBPYmplY3QuZ2V0UHJvdG90eXBlT2YocHJvdG90eXBlKSA9PT0gbnVsbDtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBXYWxrcyBhIHZhbHVlIGFuZCBkZWNpZGVzIHdoZXRoZXIgZXZlcnl0aGluZyByZWFjaGFibGUgZnJvbSBpdCBpcyBkYXRhLlxyXG4gKlxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAcGFyYW0geyp9IHZhbHVlXHJcbiAqIEBwYXJhbSB7V2Vha1NldH0gW3NlZW5dIHZhbHVlcyBhbHJlYWR5IHdhbGtlZCwgY2xvc2VzIGN5Y2xlc1xyXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cclxuICovXHJcbmNvbnN0IGlzRGF0YVZhbHVlID0gKHZhbHVlLCBzZWVuID0gbmV3IFdlYWtTZXQoKSkgPT4ge1xyXG5cdGlmIChpc1ByaW1pdGl2ZSh2YWx1ZSkpIHJldHVybiB0cnVlO1xyXG5cdGVsc2UgaWYgKHZhbHVlIGluc3RhbmNlb2YgRGF0ZSkgcmV0dXJuIHRydWU7XHJcblx0ZWxzZSBpZiAodmFsdWUgaW5zdGFuY2VvZiBSZWdFeHApIHJldHVybiB0cnVlO1xyXG5cclxuXHRpZiAoc2Vlbi5oYXModmFsdWUpKSByZXR1cm4gdHJ1ZTtcclxuXHRzZWVuLmFkZCh2YWx1ZSk7XHJcblxyXG5cdGlmICh2YWx1ZSBpbnN0YW5jZW9mIEFycmF5KSByZXR1cm4gdmFsdWUuZXZlcnkoKGVudHJ5KSA9PiBpc0RhdGFWYWx1ZShlbnRyeSwgc2VlbikpO1xyXG5cdGVsc2UgaWYgKHZhbHVlIGluc3RhbmNlb2YgTWFwKSB7XHJcblx0XHRmb3IgKGNvbnN0IFtrZXksIGVudHJ5XSBvZiB2YWx1ZSkge1xyXG5cdFx0XHRpZiAoIWlzRGF0YVZhbHVlKGtleSwgc2VlbikgfHwgIWlzRGF0YVZhbHVlKGVudHJ5LCBzZWVuKSkgcmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHRydWU7XHJcblx0fSBlbHNlIGlmICh2YWx1ZSBpbnN0YW5jZW9mIFNldCkge1xyXG5cdFx0Zm9yIChjb25zdCBlbnRyeSBvZiB2YWx1ZSkge1xyXG5cdFx0XHRpZiAoIWlzRGF0YVZhbHVlKGVudHJ5LCBzZWVuKSkgcmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHRydWU7XHJcblx0fSBlbHNlIGlmICghaXNQbGFpbk9iamVjdCh2YWx1ZSkpXHJcblx0XHRyZXR1cm4gZmFsc2U7IC8vIGNsYXNzIGluc3RhbmNlcyBhbmQgZXZlcnkgb3RoZXIgZXhvdGljIG9iamVjdFxyXG5cdGVsc2Uge1xyXG5cdFx0Zm9yIChjb25zdCBrZXkgb2YgT2JqZWN0LmtleXModmFsdWUpKSB7XHJcblx0XHRcdGlmICghaXNEYXRhVmFsdWUodmFsdWVba2V5XSwgc2VlbikpIHJldHVybiBmYWxzZTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gdHJ1ZTtcclxuXHR9XHJcbn07XHJcblxyXG4vKipcclxuICogQ2hlY2tzIHdoZXRoZXIgYW4gb2JqZWN0IGlzIGEgcHVyZSBkYXRhIG9iamVjdC5cclxuICpcclxuICogVGhlIG9iamVjdCBpdHNlbGYgaGFzIHRvIGJlIGEgc2ltcGxlIG9iamVjdCAtIG5vIEFycmF5LCBNYXAgb3Igc29tZXRoaW5nIGVsc2UuIEV2ZXJ5IHZhbHVlXHJcbiAqIHJlYWNoYWJsZSBmcm9tIGl0IGhhcyB0byBiZSBkYXRhIGFzIHdlbGw6IHByaW1pdGl2ZXMsIHNpbXBsZSBvYmplY3RzLCBBcnJheSwgRGF0ZSwgUmVnRXhwLCBNYXAgb3JcclxuICogU2V0LiBGdW5jdGlvbnMgYW5kIGNsYXNzIGluc3RhbmNlcyBhcmUgcmVqZWN0ZWQgYXQgYW55IGRlcHRoLCBpbmNsdWRpbmcgaW5zaWRlIGFycmF5cyBhbmQgaW5zaWRlXHJcbiAqIHRoZSBrZXlzIGFuZCB2YWx1ZXMgb2YgYSBNYXAgb3IgU2V0LlxyXG4gKlxyXG4gKiBPbmx5IG93biBlbnVtZXJhYmxlIHByb3BlcnRpZXMgYXJlIGluc3BlY3RlZC4gQ3ljbGljIHJlZmVyZW5jZXMgYXJlIGFsbG93ZWQuXHJcbiAqXHJcbiAqIEBwYXJhbSB7Kn0gb2JqZWN0IHRoZSBvYmplY3QgdG8gYmUgdGVzdGluZ1xyXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cclxuICpcclxuICogQGV4YW1wbGVcclxuICogaXNQb2pvKHthIDoge2IgOiBbMSwgbmV3IERhdGUoKV19fSk7ICAgLy8gdHJ1ZVxyXG4gKiBpc1Bvam8oe2EgOiAoKSA9PiB7fX0pOyAgICAgICAgICAgICAgICAvLyBmYWxzZSwgYSBmdW5jdGlvbiBpcyBubyBkYXRhXHJcbiAqIGlzUG9qbyh7YSA6IFt7YiA6IG5ldyBGb28oKX1dfSk7ICAgICAgIC8vIGZhbHNlLCByZWplY3RlZCBhdCBhbnkgZGVwdGhcclxuICogaXNQb2pvKFtdKTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gZmFsc2UsIHRoZSBvYmplY3QgaXRzZWxmIGhhcyB0byBiZSBhIHNpbXBsZSBvbmVcclxuICovXHJcbmV4cG9ydCBjb25zdCBpc1Bvam8gPSAob2JqZWN0KSA9PiB7XHJcblx0aWYgKGlzTnVsbE9yVW5kZWZpbmVkKG9iamVjdCkgfHwgIWlzUGxhaW5PYmplY3Qob2JqZWN0KSkgcmV0dXJuIGZhbHNlO1xyXG5cclxuXHRyZXR1cm4gaXNEYXRhVmFsdWUob2JqZWN0KTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBBcHBlbmRzIGEgcHJvcGVydHkgdmFsdWUgdG8gYW4gb2JqZWN0LiBJZiB0aGUgcHJvcGVydHkgYWxyZWFkeSBob2xkcyBhIHZhbHVlLCBpdCBpcyBjb252ZXJ0ZWRcclxuICogaW50byBhbiBhcnJheSBjYXJyeWluZyBib3RoLiBBbiB1bmRlZmluZWQgdmFsdWUgaXMgaWdub3JlZC5cclxuICpcclxuICogVGhlIGtleSBtYXkgYWRkcmVzcyBhIG5lc3RlZCBwcm9wZXJ0eSBieSBhIGRvdHRlZCBwYXRoLCBtaXNzaW5nIHN0ZXBzIGFyZSBjcmVhdGVkIG9uIHRoZSB3YXkuXHJcbiAqXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBhS2V5IG5hbWUgb2YgdGhlIHByb3BlcnR5LCBhIGRvdHRlZCBwYXRoIGFkZHJlc3NlcyBhIG5lc3RlZCBvbmVcclxuICogQHBhcmFtIHsqfSBhRGF0YSBwcm9wZXJ0eSB2YWx1ZVxyXG4gKiBAcGFyYW0ge29iamVjdH0gYU9iamVjdCB0aGUgb2JqZWN0IHRvIGFwcGVuZCB0aGUgcHJvcGVydHkgdG9cclxuICogQHJldHVybnMge29iamVjdH0gdGhlIGNoYW5nZWQgb2JqZWN0XHJcbiAqXHJcbiAqIEBleGFtcGxlXHJcbiAqIGFwcGVuZChcImFcIiwgMSwge30pOyAgICAgICAgICAgICAvLyB7YSA6IDF9XHJcbiAqIGFwcGVuZChcImFcIiwgMiwge2EgOiAxfSk7ICAgICAgICAvLyB7YSA6IFsxLCAyXX1cclxuICogYXBwZW5kKFwiYS5iXCIsIDEsIHt9KTsgICAgICAgICAgIC8vIHthIDoge2IgOiAxfX1cclxuICovXHJcbmV4cG9ydCBjb25zdCBhcHBlbmQgPSAoYUtleSwgYURhdGEsIGFPYmplY3QpID0+IHtcclxuXHRpZiAodHlwZW9mIGFEYXRhICE9PSBcInVuZGVmaW5lZFwiKSB7XHJcblx0XHRjb25zdCBwcm9wZXJ0eSA9IE9iamVjdFByb3BlcnR5LmxvYWQoYU9iamVjdCwgYUtleSwgdHJ1ZSk7XHJcblx0XHRwcm9wZXJ0eS5hcHBlbmQgPSBhRGF0YTtcclxuXHR9XHJcblx0cmV0dXJuIGFPYmplY3Q7XHJcbn07XHJcblxyXG4vKipcclxuICogT3duIGVudW1lcmFibGUga2V5cywgc3RyaW5ncyBhbmQgc3ltYm9scyBhbGlrZSAtIHRoZSBzYW1lIHNldCBPYmplY3QuYXNzaWduIGNvcGllcy5cclxuICpcclxuICogQHByaXZhdGVcclxuICogQHBhcmFtIHsqfSBzb3VyY2VcclxuICogQHJldHVybnMge0FycmF5PHN0cmluZ3xzeW1ib2w+fVxyXG4gKi9cclxuY29uc3QgYXNzaWduYWJsZUtleXMgPSAoc291cmNlKSA9PiB7XHJcblx0Y29uc3Qgb2JqZWN0ID0gT2JqZWN0KHNvdXJjZSk7XHJcblx0cmV0dXJuIFJlZmxlY3Qub3duS2V5cyhvYmplY3QpLmZpbHRlcigoa2V5KSA9PiBPYmplY3QucHJvdG90eXBlLnByb3BlcnR5SXNFbnVtZXJhYmxlLmNhbGwob2JqZWN0LCBrZXkpKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBNZXJnZXMgb2JqZWN0cyBpbnRvIGEgdGFyZ2V0IG9iamVjdCAtIGEgcmVjdXJzaXZlIE9iamVjdC5hc3NpZ24uIEl0IHN0ZXBzIGludG8gb2JqZWN0cyBhbmQgc3ViXHJcbiAqIG9iamVjdHMuIEV2ZXJ5IG90aGVyIHZhbHVlIGlzIHJlcGxhY2VkIGJ5IHRoZSB2YWx1ZSBmcm9tIHRoZSBzb3VyY2Ugb2JqZWN0LlxyXG4gKlxyXG4gKiBMaWtlIE9iamVjdC5hc3NpZ24gaXQgY29waWVzIG93biBlbnVtZXJhYmxlIHByb3BlcnRpZXMgLSBzdHJpbmcgYW5kIHN5bWJvbCBrZXlzIGFsaWtlIC0sIGlnbm9yZXNcclxuICogbnVsbCBhbmQgdW5kZWZpbmVkIHNvdXJjZXMgYW5kIHJldHVybnMgdGhlIHRhcmdldC4gVW5saWtlIE9iamVjdC5hc3NpZ24gaXQgc3RlcHMgaW50byBhIHByb3BlcnR5XHJcbiAqIHdoZW4gdGFyZ2V0IGFuZCBzb3VyY2UgYm90aCBob2xkIGFuIG9iamVjdCwgaW5zdGVhZCBvZiByZXBsYWNpbmcgaXQuXHJcbiAqXHJcbiAqIEEgY2xhc3MgaW5zdGFuY2UgY291bnRzIGFzIGFuIG9iamVjdCBoZXJlIGFuZCBpcyBtZXJnZWQgcHJvcGVydHkgYnkgcHJvcGVydHkganVzdCBsaWtlIGEgc2ltcGxlXHJcbiAqIG9uZS4gVGhlIHRhcmdldCBrZWVwcyBpdHMgb3duIHByb3RvdHlwZSwgb25seSB0aGUgcHJvcGVydGllcyBvZiB0aGUgc291cmNlIGFyZSBhcHBsaWVkIHRvIGl0IC0gYVxyXG4gKiBtZXJnZSBuZXZlciB0dXJucyB0aGUgdGFyZ2V0IGludG8gYW4gaW5zdGFuY2Ugb2YgdGhlIGNsYXNzIG9mIHRoZSBzb3VyY2UuXHJcbiAqXHJcbiAqIEFuIEFycmF5LCBTZXQsIE1hcCwgRGF0ZSBvciBSZWdFeHAgaXMgYWx3YXlzIHJlcGxhY2VkIGFzIGEgd2hvbGUsIG5ldmVyIG1lcmdlZCBlbnRyeSBieSBlbnRyeS5cclxuICogVGhhdCBhbHJlYWR5IGFwcGxpZXMgd2hlbiBvbmx5IG9uZSBvZiBib3RoIHNpZGVzIGhvbGRzIG9uZS4gVGhlIHJlc3VsdCB0aGVyZWZvcmUgY2FycmllcyB0aGVcclxuICogY29udGFpbmVyIG9mIHRoZSBzb3VyY2Ugd2l0aCBpdHMgb3duIGxlbmd0aCAtIG5vdGhpbmcgb2YgdGhlIHRhcmdldCBzdXJ2aXZlcyBpdCwgbm90IGV2ZW4gYW5cclxuICogb2JqZWN0IHNpdHRpbmcgYXQgdGhlIHNhbWUgaW5kZXggb3IgdW5kZXIgdGhlIHNhbWUga2V5LlxyXG4gKlxyXG4gKiBBIGtleSB3aG9zZSB2YWx1ZSBpcyBhIHN5bWJvbCBpcyBza2lwcGVkLCBvbiB0aGUgdGFyZ2V0IHNpZGUgYXMgd2VsbCBhcyBvbiB0aGUgc291cmNlIHNpZGUuIEFcclxuICogc3ltYm9sIGNhcnJpZXMgbm8gZGF0YSwgc28gc3VjaCBhIHByb3BlcnR5IGlzIGxlZnQgdW50b3VjaGVkLlxyXG4gKlxyXG4gKiBUaGUga2V5IF9fcHJvdG9fXyBpcyBza2lwcGVkLiBPYmplY3QuYXNzaWduIHdvdWxkIG9ubHkgcmVwb2ludCB0aGUgcHJvdG90eXBlIG9mIHRoZSB0YXJnZXQsIGJ1dFxyXG4gKiBtZXJnaW5nIGludG8gaXQgd291bGQgd2FsayBpbnRvIE9iamVjdC5wcm90b3R5cGUgYW5kIGxlYWsgaW50byBldmVyeSBvYmplY3QuXHJcbiAqXHJcbiAqIFRoZSB0YXJnZXQgaXMgbW9kaWZpZWQgaW4gcGxhY2UuIEEgc3ViIG9iamVjdCBvZiBhIHNvdXJjZSB0aGF0IGhhcyBubyBjb3VudGVycGFydCBpbiB0aGUgdGFyZ2V0IGlzXHJcbiAqIHRha2VuIG92ZXIgYnkgcmVmZXJlbmNlLCBqdXN0IGxpa2UgT2JqZWN0LmFzc2lnbiBkb2VzLlxyXG4gKlxyXG4gKiBAcGFyYW0ge29iamVjdH0gdGFyZ2V0IHRoZSB0YXJnZXQgb2JqZWN0IHRvIG1lcmdlIGludG8sIGEgbmV3IG9iamVjdCB3aGVuIGZhbHN5XHJcbiAqIEBwYXJhbSB7Li4ub2JqZWN0fSBzb3VyY2VzIHRoZSBzb3VyY2Ugb2JqZWN0cywgYXBwbGllZCBpbiBvcmRlclxyXG4gKiBAcmV0dXJucyB7b2JqZWN0fSB0aGUgdGFyZ2V0IG9iamVjdFxyXG4gKlxyXG4gKiBAZXhhbXBsZVxyXG4gKiBtZXJnZSh7YSA6IDF9LCB7YiA6IDJ9KTsgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHthIDogMSwgYiA6IDJ9XHJcbiAqIG1lcmdlKHthIDoge3ggOiAxfX0sIHthIDoge3kgOiAyfX0pOyAgICAgICAgICAgICAgLy8ge2EgOiB7eCA6IDEsIHkgOiAyfX1cclxuICogbWVyZ2Uoe2EgOiBbMSwgMiwgM119LCB7YSA6IFs5XX0pOyAgICAgICAgICAgICAgICAvLyB7YSA6IFs5XX0sIHJlcGxhY2VkIGFzIGEgd2hvbGVcclxuICogbWVyZ2Uoe2EgOiBuZXcgRm9vKDEpfSwge2EgOiBuZXcgQmFyKDIpfSk7ICAgICAgICAvLyBhIHN0YXlzIGEgRm9vLCBjYXJyeWluZyB0aGUgcHJvcGVydGllcyBvZiBib3RoXHJcbiAqIG1lcmdlKHt9LCBzb3VyY2UxLCBzb3VyY2UyLCBzb3VyY2UzKTtcclxuICovXHJcbmV4cG9ydCBjb25zdCBtZXJnZSA9ICh0YXJnZXQsIC4uLnNvdXJjZXMpID0+IHtcclxuXHRpZiAoIXRhcmdldCkgdGFyZ2V0ID0ge307XHJcblxyXG5cdHNvdXJjZXNcclxuXHRcdC5maWx0ZXIoKHNvdXJjZSkgPT4gIWlzTnVsbE9yVW5kZWZpbmVkKHNvdXJjZSkpXHJcblx0XHQuZm9yRWFjaCgoc291cmNlKSA9PiB7XHJcblx0XHRcdGNvbnN0IGtleXMgPSBhc3NpZ25hYmxlS2V5cyhzb3VyY2UpO1xyXG5cdFx0XHRrZXlzXHJcblx0XHRcdFx0LmZpbHRlcigoa2V5KSA9PiBrZXkgIT0gXCJfX3Byb3RvX19cIilcclxuXHRcdFx0XHQuZmlsdGVyKChrZXkpID0+IHR5cGVvZiB0YXJnZXRba2V5XSAhPT0gXCJzeW1ib2xcIilcclxuXHRcdFx0XHQuZmlsdGVyKChrZXkpID0+IHR5cGVvZiBzb3VyY2Vba2V5XSAhPT0gXCJzeW1ib2xcIilcclxuXHRcdFx0XHQuZm9yRWFjaCgoa2V5KSA9PiB7XHJcblx0XHRcdFx0XHRjb25zdCB2YWx1ZSA9IHNvdXJjZVtrZXldO1xyXG5cdFx0XHRcdFx0Y29uc3QgY3VycmVudCA9IHRhcmdldFtrZXldO1xyXG5cclxuXHRcdFx0XHRcdGlmKGN1cnJlbnQgPT0gbnVsbCApIHRhcmdldFtrZXldID0gdmFsdWU7XHJcblx0XHRcdFx0XHRlbHNlIGlmKCB0eXBlb2YgY3VycmVudCAhPT0gdHlwZW9mIHZhbHVlICkgdGFyZ2V0W2tleV0gPSB2YWx1ZTtcclxuXHRcdFx0XHRcdGVsc2UgaWYgKGN1cnJlbnQgaW5zdGFuY2VvZiBBcnJheSB8fCB2YWx1ZSBpbnN0YW5jZW9mIEFycmF5KSB0YXJnZXRba2V5XSA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0ZWxzZSBpZiAoY3VycmVudCBpbnN0YW5jZW9mIFNldCB8fCB2YWx1ZSBpbnN0YW5jZW9mIFNldCkgdGFyZ2V0W2tleV0gPSB2YWx1ZTtcclxuXHRcdFx0XHRcdGVsc2UgaWYgKGN1cnJlbnQgaW5zdGFuY2VvZiBNYXAgfHwgdmFsdWUgaW5zdGFuY2VvZiBNYXApIHRhcmdldFtrZXldID0gdmFsdWU7XHJcblx0XHRcdFx0XHRlbHNlIGlmIChjdXJyZW50IGluc3RhbmNlb2YgRGF0ZSB8fCB2YWx1ZSBpbnN0YW5jZW9mIERhdGUpIHRhcmdldFtrZXldID0gdmFsdWU7XHJcblx0XHRcdFx0XHRlbHNlIGlmIChjdXJyZW50IGluc3RhbmNlb2YgUmVnRXhwIHx8IHZhbHVlIGluc3RhbmNlb2YgUmVnRXhwKSB0YXJnZXRba2V5XSA9IHZhbHVlO1xyXG5cdFx0XHRcdFx0ZWxzZSBpZiAoaXNPYmplY3QoY3VycmVudCkgJiYgaXNPYmplY3QodmFsdWUpKSBtZXJnZShjdXJyZW50LCB2YWx1ZSk7XHJcblx0XHRcdFx0XHRlbHNlIHRhcmdldFtrZXldID0gdmFsdWU7XHJcblx0XHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0cmV0dXJuIHRhcmdldDtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBEZWNpZGVzIHdoZXRoZXIgYSBzaW5nbGUgcHJvcGVydHkgaXMgdGFrZW4gb3ZlciBieSB7QGxpbmsgZmlsdGVyfS5cclxuICpcclxuICogQGNhbGxiYWNrIFByb3BlcnR5RmlsdGVyXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIG5hbWUgb2YgdGhlIHByb3BlcnR5XHJcbiAqIEBwYXJhbSB7Kn0gdmFsdWUgdmFsdWUgb2YgdGhlIHByb3BlcnR5XHJcbiAqIEBwYXJhbSB7b2JqZWN0fSBjb250ZXh0IHRoZSBvYmplY3QgdGhlIHByb3BlcnR5IGJlbG9uZ3MgdG9cclxuICogQHJldHVybnMge2Jvb2xlYW59IHRydWUgdG8ga2VlcCB0aGUgcHJvcGVydHlcclxuICovXHJcblxyXG4vKipcclxuICogQnVpbGRzIGEge0BsaW5rIFByb3BlcnR5RmlsdGVyfSBhY2NlcHRpbmcgb3IgcmVqZWN0aW5nIGEgZml4ZWQgbGlzdCBvZiBwcm9wZXJ0eSBuYW1lcy5cclxuICpcclxuICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnNcclxuICogQHBhcmFtIHtBcnJheTxzdHJpbmc+fSBvcHRpb25zLm5hbWVzIHRoZSBwcm9wZXJ0eSBuYW1lcyB0byBkZWNpZGUgb25cclxuICogQHBhcmFtIHtib29sZWFufSBvcHRpb25zLmFsbG93ZWQgdHJ1ZSB0dXJucyB0aGUgbGlzdCBpbnRvIGFuIGFsbG93IGxpc3QsIGZhbHNlIGludG8gYSBkZW55IGxpc3RcclxuICogQHJldHVybnMge1Byb3BlcnR5RmlsdGVyfVxyXG4gKlxyXG4gKiBAZXhhbXBsZVxyXG4gKiBjb25zdCBkZW55ID0gYnVpbGRQcm9wZXJ0eUZpbHRlcih7bmFtZXMgOiBbXCJwYXNzd29yZFwiXSwgYWxsb3dlZCA6IGZhbHNlfSk7XHJcbiAqIGZpbHRlcih1c2VyLCBkZW55KTsgICAvLyBldmVyeSBwcm9wZXJ0eSBidXQgcGFzc3dvcmRcclxuICovXHJcbmV4cG9ydCBjb25zdCBidWlsZFByb3BlcnR5RmlsdGVyID0gKHsgbmFtZXMsIGFsbG93ZWQgfSkgPT4ge1xyXG5cdHJldHVybiAobmFtZSwgdmFsdWUsIGNvbnRleHQpID0+IHtcclxuXHRcdHJldHVybiBuYW1lcy5pbmNsdWRlcyhuYW1lKSA9PT0gYWxsb3dlZDtcclxuXHR9O1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJlYnVpbGRzIGFuIEFycmF5LCBTZXQgb3IgTWFwIHdpdGggaXRzIHZhbHVlcyBmaWx0ZXJlZC4gQSBjb250YWluZXIga2VlcHMgYWxsIG9mIGl0cyBlbnRyaWVzIC1cclxuICogb25seSB0aGUgdmFsdWVzIGluc2lkZSBnZXQgZmlsdGVyZWQuIFRoZSBrZXlzIG9mIGEgTWFwIHN0YXkgdW50b3VjaGVkLCByZXBsYWNpbmcgdGhlbSB3b3VsZCBicmVha1xyXG4gKiBldmVyeSBsb29rdXAgYWdhaW5zdCB0aGUgcmVzdWx0LlxyXG4gKlxyXG4gKiBAcHJpdmF0ZVxyXG4gKiBAcGFyYW0ge0FycmF5fFNldHxNYXB9IHZhbHVlXHJcbiAqIEBwYXJhbSB7UHJvcGVydHlGaWx0ZXJ9IHByb3BGaWx0ZXJcclxuICogQHBhcmFtIHtib29sZWFufSBkZWVwXHJcbiAqIEBwYXJhbSB7V2Vha01hcH0gY29waWVzIG1hcHMgYW4gb3JpZ2luYWwgb250byBpdHMgZmlsdGVyZWQgY29weVxyXG4gKiBAcmV0dXJucyB7QXJyYXl8U2V0fE1hcH1cclxuICovXHJcbmNvbnN0IGZpbHRlckNvbnRhaW5lciA9ICh2YWx1ZSwgcHJvcEZpbHRlciwgZGVlcCwgY29waWVzKSA9PiB7XHJcblx0aWYgKHZhbHVlIGluc3RhbmNlb2YgQXJyYXkpIHtcclxuXHRcdGNvbnN0IGNvcHkgPSBbXTtcclxuXHRcdGNvcGllcy5zZXQodmFsdWUsIGNvcHkpO1xyXG5cdFx0Zm9yIChjb25zdCBlbnRyeSBvZiB2YWx1ZSkgY29weS5wdXNoKGZpbHRlclZhbHVlKGVudHJ5LCBwcm9wRmlsdGVyLCBkZWVwLCBjb3BpZXMpKTtcclxuXHJcblx0XHRyZXR1cm4gY29weTtcclxuXHR9XHJcblxyXG5cdGlmICh2YWx1ZSBpbnN0YW5jZW9mIFNldCkge1xyXG5cdFx0Y29uc3QgY29weSA9IG5ldyBTZXQoKTtcclxuXHRcdGNvcGllcy5zZXQodmFsdWUsIGNvcHkpO1xyXG5cdFx0Zm9yIChjb25zdCBlbnRyeSBvZiB2YWx1ZSkgY29weS5hZGQoZmlsdGVyVmFsdWUoZW50cnksIHByb3BGaWx0ZXIsIGRlZXAsIGNvcGllcykpO1xyXG5cclxuXHRcdHJldHVybiBjb3B5O1xyXG5cdH1cclxuXHJcblx0Y29uc3QgY29weSA9IG5ldyBNYXAoKTtcclxuXHRjb3BpZXMuc2V0KHZhbHVlLCBjb3B5KTtcclxuXHRmb3IgKGNvbnN0IFtrZXksIGVudHJ5XSBvZiB2YWx1ZSkgY29weS5zZXQoa2V5LCBmaWx0ZXJWYWx1ZShlbnRyeSwgcHJvcEZpbHRlciwgZGVlcCwgY29waWVzKSk7XHJcblxyXG5cdHJldHVybiBjb3B5O1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEZpbHRlcnMgYSBzaW5nbGUgdmFsdWUsIGRpc3BhdGNoaW5nIG9uIHdoYXQgaXQgaXMuXHJcbiAqXHJcbiAqIEBwcml2YXRlXHJcbiAqIEBwYXJhbSB7Kn0gdmFsdWVcclxuICogQHBhcmFtIHtQcm9wZXJ0eUZpbHRlcn0gcHJvcEZpbHRlclxyXG4gKiBAcGFyYW0ge2Jvb2xlYW59IGRlZXBcclxuICogQHBhcmFtIHtXZWFrTWFwfSBjb3BpZXMgbWFwcyBhbiBvcmlnaW5hbCBvbnRvIGl0cyBmaWx0ZXJlZCBjb3B5XHJcbiAqIEByZXR1cm5zIHsqfSB0aGUgZmlsdGVyZWQgdmFsdWUsIG9yIHRoZSB2YWx1ZSBpdHNlbGYgd2hlbiB0aGVyZSBpcyBub3RoaW5nIHRvIGZpbHRlclxyXG4gKi9cclxuY29uc3QgZmlsdGVyVmFsdWUgPSAodmFsdWUsIHByb3BGaWx0ZXIsIGRlZXAsIGNvcGllcykgPT4ge1xyXG5cdGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB0eXBlb2YgdmFsdWUgIT09IFwib2JqZWN0XCIpIHJldHVybiB2YWx1ZTtcclxuXHRpZiAodmFsdWUgaW5zdGFuY2VvZiBEYXRlIHx8IHZhbHVlIGluc3RhbmNlb2YgUmVnRXhwKSByZXR1cm4gdmFsdWU7IC8vIGNhcnJ5IG5vIHByb3BlcnRpZXMgdG8gZmlsdGVyXHJcblxyXG5cdC8vIGEgdmFsdWUgc2VlbiBiZWZvcmUgY2xvc2VzIGEgY3ljbGUgLSBpdHMgY29weSBzdGFuZHMgaW4sIHNvIG5vdGhpbmcgdW5maWx0ZXJlZCBsZWFrcyBiYWNrIGluXHJcblx0aWYgKGNvcGllcy5oYXModmFsdWUpKSByZXR1cm4gY29waWVzLmdldCh2YWx1ZSk7XHJcblxyXG5cdGlmICh2YWx1ZSBpbnN0YW5jZW9mIEFycmF5IHx8IHZhbHVlIGluc3RhbmNlb2YgU2V0IHx8IHZhbHVlIGluc3RhbmNlb2YgTWFwKSByZXR1cm4gZmlsdGVyQ29udGFpbmVyKHZhbHVlLCBwcm9wRmlsdGVyLCBkZWVwLCBjb3BpZXMpO1xyXG5cclxuXHRyZXR1cm4gZmlsdGVyT2JqZWN0KHZhbHVlLCBwcm9wRmlsdGVyLCBkZWVwLCBjb3BpZXMpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEJ1aWxkcyB0aGUgZmlsdGVyZWQgY29weSBvZiBhbiBvYmplY3QuIFRoZSBjb3B5IGlzIHJlZ2lzdGVyZWQgYmVmb3JlIGl0IGlzIGZpbGxlZCwgc28gYSBjeWNsZVxyXG4gKiBydW5uaW5nIGJhY2sgaW50byBpdCByZXNvbHZlcyB0byB0aGUgY29weSBpbnN0ZWFkIG9mIHRoZSBvcmlnaW5hbC5cclxuICpcclxuICogQHByaXZhdGVcclxuICogQHBhcmFtIHtvYmplY3R9IGRhdGFcclxuICogQHBhcmFtIHtQcm9wZXJ0eUZpbHRlcn0gcHJvcEZpbHRlclxyXG4gKiBAcGFyYW0ge2Jvb2xlYW59IGRlZXBcclxuICogQHBhcmFtIHtXZWFrTWFwfSBjb3BpZXMgbWFwcyBhbiBvcmlnaW5hbCBvbnRvIGl0cyBmaWx0ZXJlZCBjb3B5XHJcbiAqIEByZXR1cm5zIHtvYmplY3R9XHJcbiAqL1xyXG5jb25zdCBmaWx0ZXJPYmplY3QgPSAoZGF0YSwgcHJvcEZpbHRlciwgZGVlcCwgY29waWVzKSA9PiB7XHJcblx0Y29uc3QgcmVzdWx0ID0ge307XHJcblx0Y29waWVzLnNldChkYXRhLCByZXN1bHQpO1xyXG5cclxuXHRmb3IgKGNvbnN0IG5hbWUgaW4gZGF0YSkge1xyXG5cdFx0Y29uc3QgdmFsdWUgPSBkYXRhW25hbWVdO1xyXG5cdFx0aWYgKHByb3BGaWx0ZXIobmFtZSwgdmFsdWUsIGRhdGEpKXtcclxuXHRcdFx0cmVzdWx0W25hbWVdID0gZGVlcCA/IGZpbHRlclZhbHVlKHZhbHVlLCBwcm9wRmlsdGVyLCBkZWVwLCBjb3BpZXMpIDogdmFsdWU7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRyZXR1cm4gcmVzdWx0O1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEJ1aWxkcyBhIG5ldyBvYmplY3QgaG9sZGluZyB0aGUgcHJvcGVydGllcyBhIGZpbHRlciBhY2NlcHRzLlxyXG4gKlxyXG4gKiBUaGUgZmlsdGVyIGlzIGNhbGxlZCBmb3IgZXZlcnkgZW51bWVyYWJsZSBwcm9wZXJ0eSwgaW5oZXJpdGVkIG9uZXMgaW5jbHVkZWQgLSBmaWx0ZXJpbmcgYSB3aW5kb3dcclxuICogcmVsaWVzIG9uIHRoYXQsIHNpbmNlIG1vc3Qgb2YgaXRzIG1lbWJlcnMgc2l0IG9uIHRoZSBwcm90b3R5cGUuXHJcbiAqXHJcbiAqIFdpdGggZGVlcCB0aGUgZmlsdGVyIGlzIGFwcGxpZWQgdG8gc3ViIG9iamVjdHMgYXMgd2VsbC4gQXJyYXksIFNldCBhbmQgTWFwIGFyZSByZWJ1aWx0IHdpdGggdGhlaXJcclxuICogdmFsdWVzIGZpbHRlcmVkLCBrZWVwaW5nIGFsbCBvZiB0aGVpciBlbnRyaWVzIGFuZCwgZm9yIGEgTWFwLCBpdHMga2V5cy4gRGF0ZSBhbmQgUmVnRXhwIGFyZSB0YWtlblxyXG4gKiBvdmVyIGFzIHRoZXkgYXJlLiBBIGN5Y2xpYyByZWZlcmVuY2UgcmVzb2x2ZXMgdG8gdGhlIGZpbHRlcmVkIGNvcHksIHNvIHRoZSByZXN1bHQgbmV2ZXIgY2FycmllcyBhXHJcbiAqIHJlZmVyZW5jZSBpbnRvIHRoZSB1bnRvdWNoZWQgb3JpZ2luYWwuXHJcbiAqXHJcbiAqIFdpdGhvdXQgZGVlcCB0aGUgYWNjZXB0ZWQgdmFsdWVzIGFyZSB0YWtlbiBvdmVyIGFzIHRoZXkgYXJlLCBzdWIgb2JqZWN0cyBieSByZWZlcmVuY2UuXHJcbiAqXHJcbiAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIHRoZSBvYmplY3QgdG8gYmUgZmlsdGVyZWRcclxuICogQHBhcmFtIHtQcm9wZXJ0eUZpbHRlcn0gcHJvcEZpbHRlciBkZWNpZGVzIHBlciBwcm9wZXJ0eSwgc2VlIHtAbGluayBidWlsZFByb3BlcnR5RmlsdGVyfVxyXG4gKiBAcGFyYW0ge29iamVjdH0gW29wdGlvbnNdXHJcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW29wdGlvbnMuZGVlcD1mYWxzZV0gZmlsdGVyIHN1YiBvYmplY3RzIHRvb1xyXG4gKiBAcmV0dXJucyB7b2JqZWN0fSBhIG5ldyBvYmplY3RcclxuICpcclxuICogQGV4YW1wbGVcclxuICogY29uc3QgZGVueSA9IGJ1aWxkUHJvcGVydHlGaWx0ZXIoe25hbWVzIDogW1wic2VjcmV0XCJdLCBhbGxvd2VkIDogZmFsc2V9KTtcclxuICpcclxuICogZmlsdGVyKHtzZWNyZXQgOiBcInhcIiwgYSA6IDF9LCBkZW55KTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHthIDogMX1cclxuICogZmlsdGVyKHtzdWIgOiB7c2VjcmV0IDogXCJ4XCIsIGEgOiAxfX0sIGRlbnksIHtkZWVwIDogdHJ1ZX0pOyAgICAgIC8vIHtzdWIgOiB7YSA6IDF9fVxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IGZpbHRlciA9IChkYXRhLCBwcm9wRmlsdGVyLCB7IGRlZXAgPSBmYWxzZSB9ID0ge30pID0+IGZpbHRlck9iamVjdChkYXRhLCBwcm9wRmlsdGVyLCBkZWVwLCBuZXcgV2Vha01hcCgpKTtcclxuXHJcbi8qKlxyXG4gKiBEZWZpbmVzIGEgY29uc3RhbnQsIG5vbiBlbnVtZXJhYmxlIHByb3BlcnR5LlxyXG4gKlxyXG4gKiBAcGFyYW0ge29iamVjdH0gbyB0aGUgb2JqZWN0IHRvIGRlZmluZSB0aGUgcHJvcGVydHkgb25cclxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgbmFtZSBvZiB0aGUgcHJvcGVydHlcclxuICogQHBhcmFtIHsqfSB2YWx1ZSB0aGUgdmFsdWUsIG5laXRoZXIgd3JpdGFibGUgbm9yIGNvbmZpZ3VyYWJsZVxyXG4gKiBAcmV0dXJucyB7dm9pZH1cclxuICovXHJcbmV4cG9ydCBjb25zdCBkZWZWYWx1ZSA9IChvLCBuYW1lLCB2YWx1ZSkgPT4ge1xyXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvLCBuYW1lLCB7XHJcblx0XHR2YWx1ZSxcclxuXHRcdHdyaXRhYmxlOiBmYWxzZSxcclxuXHRcdGNvbmZpZ3VyYWJsZTogZmFsc2UsXHJcblx0XHRlbnVtZXJhYmxlOiBmYWxzZSxcclxuXHR9KTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBEZWZpbmVzIGEgcmVhZCBvbmx5LCBub24gZW51bWVyYWJsZSBwcm9wZXJ0eSBiYWNrZWQgYnkgYSBnZXR0ZXIuXHJcbiAqXHJcbiAqIEBwYXJhbSB7b2JqZWN0fSBvIHRoZSBvYmplY3QgdG8gZGVmaW5lIHRoZSBwcm9wZXJ0eSBvblxyXG4gKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBuYW1lIG9mIHRoZSBwcm9wZXJ0eVxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBnZXQgcmV0dXJucyB0aGUgdmFsdWUgb2YgdGhlIHByb3BlcnR5XHJcbiAqIEByZXR1cm5zIHt2b2lkfVxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IGRlZkdldCA9IChvLCBuYW1lLCBnZXQpID0+IHtcclxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkobywgbmFtZSwge1xyXG5cdFx0Z2V0LFxyXG5cdFx0Y29uZmlndXJhYmxlOiBmYWxzZSxcclxuXHRcdGVudW1lcmFibGU6IGZhbHNlLFxyXG5cdH0pO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIERlZmluZXMgYSBub24gZW51bWVyYWJsZSBwcm9wZXJ0eSBiYWNrZWQgYnkgYSBnZXR0ZXIgYW5kIGEgc2V0dGVyLlxyXG4gKlxyXG4gKiBAcGFyYW0ge29iamVjdH0gbyB0aGUgb2JqZWN0IHRvIGRlZmluZSB0aGUgcHJvcGVydHkgb25cclxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgbmFtZSBvZiB0aGUgcHJvcGVydHlcclxuICogQHBhcmFtIHtGdW5jdGlvbn0gZ2V0IHJldHVybnMgdGhlIHZhbHVlIG9mIHRoZSBwcm9wZXJ0eVxyXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBzZXQgdGFrZXMgdGhlIG5ldyB2YWx1ZSBvZiB0aGUgcHJvcGVydHlcclxuICogQHJldHVybnMge3ZvaWR9XHJcbiAqL1xyXG5leHBvcnQgY29uc3QgZGVmR2V0U2V0ID0gKG8sIG5hbWUsIGdldCwgc2V0KSA9PiB7XHJcblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KG8sIG5hbWUsIHtcclxuXHRcdGdldCxcclxuXHRcdHNldCxcclxuXHRcdGNvbmZpZ3VyYWJsZTogZmFsc2UsXHJcblx0XHRlbnVtZXJhYmxlOiBmYWxzZSxcclxuXHR9KTtcclxufTtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IHtcclxuXHRpc051bGxPclVuZGVmaW5lZCxcclxuXHRpc09iamVjdCxcclxuXHRpc1ByaW1pdGl2ZSxcclxuXHRlcXVhbFBvam8sXHJcblx0aXNQb2pvLFxyXG5cdGFwcGVuZCxcclxuXHRtZXJnZSxcclxuXHRmaWx0ZXIsXHJcblx0YnVpbGRQcm9wZXJ0eUZpbHRlcixcclxuXHRkZWZWYWx1ZSxcclxuXHRkZWZHZXQsXHJcblx0ZGVmR2V0U2V0LFxyXG59O1xyXG4iLCIvKipcbiAqIFByaXZhdGUgc3RhdGUgZm9yIGFuIG9iamVjdCwgaGVsZCBvdXRzaWRlIG9mIGl0LlxuICpcbiAqIFRoZSB2YWx1ZXMgbGl2ZSBpbiBhIFdlYWtNYXAga2V5ZWQgYnkgdGhlIG9iamVjdCwgc28gbm90aGluZyBpcyBhZGRlZCB0byB0aGUgb2JqZWN0IGl0c2VsZiBhbmRcbiAqIG5vdGhpbmcgc2hvd3MgdXAgaW4gT2JqZWN0LmtleXMgb3IgSlNPTi4gT25jZSB0aGUgb2JqZWN0IGlzIGdvbmUgaXRzIHN0YXRlIGlzIGNvbGxlY3RhYmxlIHRvby5cbiAqXG4gKiBAbW9kdWxlIFByaXZhdGVQcm9wZXJ0eVxuICovXG5jb25zdCBQUklWQVRFX1BST1BFUlRJRVMgPSBuZXcgV2Vha01hcCgpO1xuXG4vKipcbiAqIFRoZSBzdG9yZSBiZWxvbmdpbmcgdG8gYW4gb2JqZWN0LiBDcmVhdGVkIG9uIHRoZSBmaXJzdCBjYWxsLCB0aGUgc2FtZSBvbmUgZnJvbSB0aGVuIG9uLlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBvYmpcbiAqIEByZXR1cm5zIHtvYmplY3R9IHRoZSBzdG9yZSwgd3JpdGFibGUgZGlyZWN0bHlcbiAqL1xuZXhwb3J0IGNvbnN0IHByaXZhdGVTdG9yZSA9IChvYmopID0+IHtcblx0aWYoUFJJVkFURV9QUk9QRVJUSUVTLmhhcyhvYmopKVxuXHRcdHJldHVybiBQUklWQVRFX1BST1BFUlRJRVMuZ2V0KG9iaik7XG5cblx0Y29uc3QgZGF0YSA9IHt9O1xuXHRQUklWQVRFX1BST1BFUlRJRVMuc2V0KG9iaiwgZGF0YSk7XG5cdHJldHVybiBkYXRhO1xufTtcblxuLyoqXG4gKiBSZWFkcyBvciB3cml0ZXMgcHJpdmF0ZSBzdGF0ZSwgZGVwZW5kaW5nIG9uIGhvdyBtYW55IGFyZ3VtZW50cyBpdCBpcyBjYWxsZWQgd2l0aC5cbiAqXG4gKiBQYXNzaW5nIHVuZGVmaW5lZCBhcyB0aGUgdmFsdWUgc3RpbGwgY291bnRzIGFzIGEgd3JpdGUgLSB3aGF0IGRlY2lkZXMgaXMgdGhlIG51bWJlciBvZiBhcmd1bWVudHMsXG4gKiBub3QgdGhlaXIgY29udGVudC5cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gb2JqIHRoZSBvYmplY3QgdGhlIHN0YXRlIGJlbG9uZ3MgdG9cbiAqIEBwYXJhbSB7c3RyaW5nfSBbbmFtZV0gbmFtZSBvZiB0aGUgcHJvcGVydHlcbiAqIEBwYXJhbSB7Kn0gW3ZhbHVlXSB0aGUgdmFsdWUgdG8gd3JpdGVcbiAqIEByZXR1cm5zIHsqfSB0aGUgd2hvbGUgc3RvcmUgd2l0aCBvbmUgYXJndW1lbnQsIHRoZSB2YWx1ZSB3aXRoIHR3bywgbm90aGluZyB3aXRoIHRocmVlXG4gKiBAdGhyb3dzIHtFcnJvcn0gd2hlbiBjYWxsZWQgd2l0aCBtb3JlIHRoYW4gdGhyZWUgYXJndW1lbnRzXG4gKlxuICogQGV4YW1wbGVcbiAqIHByaXZhdGVQcm9wZXJ0eShpbnN0YW5jZSwgXCJjb3VudFwiLCAxKTsgICAvLyB3cml0ZVxuICogcHJpdmF0ZVByb3BlcnR5KGluc3RhbmNlLCBcImNvdW50XCIpOyAgICAgIC8vIDFcbiAqIHByaXZhdGVQcm9wZXJ0eShpbnN0YW5jZSk7ICAgICAgICAgICAgICAgLy8ge2NvdW50IDogMX1cbiAqL1xuZXhwb3J0IGNvbnN0IHByaXZhdGVQcm9wZXJ0eSA9IGZ1bmN0aW9uKG9iaiwgbmFtZSwgdmFsdWUpIHtcblx0Y29uc3QgZGF0YSA9IHByaXZhdGVTdG9yZShvYmopO1xuXHRpZihhcmd1bWVudHMubGVuZ3RoID09PSAxKVxuXHRcdHJldHVybiBkYXRhO1xuXHRlbHNlIGlmKGFyZ3VtZW50cy5sZW5ndGggPT09IDIpXG5cdFx0cmV0dXJuIGRhdGFbbmFtZV07XG5cdGVsc2UgaWYoYXJndW1lbnRzLmxlbmd0aCA9PT0gMylcblx0XHRkYXRhW25hbWVdID0gdmFsdWU7XG5cdGVsc2Vcblx0XHR0aHJvdyBuZXcgRXJyb3IoXCJOb3QgYWxsb3dlZCBzaXplIG9mIGFyZ3VtZW50cyFcIik7XG59O1xuXG4vKipcbiAqIEJ1aWxkcyBhIGZ1bmN0aW9uIHJlYWRpbmcgYW5kIHdyaXRpbmcgb25lIGZpeGVkIHByb3BlcnR5LCBzbyB0aGUgbmFtZSBpcyB3cml0dGVuIG9uY2UgaW5zdGVhZCBvZlxuICogYXQgZXZlcnkgY2FsbC5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFybmFtZSBuYW1lIG9mIHRoZSBwcm9wZXJ0eVxuICogQHJldHVybnMge0Z1bmN0aW9ufSBjYWxsZWQgd2l0aCAoc2VsZikgaXQgcmVhZHMsIGNhbGxlZCB3aXRoIChzZWxmLCB2YWx1ZSkgaXQgd3JpdGVzXG4gKlxuICogQGV4YW1wbGVcbiAqIGNvbnN0IGNvdW50ID0gcHJpdmF0ZVByb3BlcnR5QWNjZXNzb3IoXCJjb3VudFwiKTtcbiAqIGNvdW50KGluc3RhbmNlLCAxKTsgICAvLyB3cml0ZVxuICogY291bnQoaW5zdGFuY2UpOyAgICAgIC8vIDFcbiAqL1xuZXhwb3J0IGNvbnN0IHByaXZhdGVQcm9wZXJ0eUFjY2Vzc29yID0gKHZhcm5hbWUpID0+IHtcblx0cmV0dXJuIGZ1bmN0aW9uKHNlbGYsIHZhbHVlKXtcblx0XHRpZihhcmd1bWVudHMubGVuZ3RoID09IDIpXG5cdFx0XHRwcml2YXRlUHJvcGVydHkoc2VsZiwgdmFybmFtZSwgdmFsdWUpO1xuXHRcdGVsc2Vcblx0XHRcdHJldHVybiBwcml2YXRlUHJvcGVydHkoc2VsZiwgdmFybmFtZSk7XG5cdH07XG59O1xuXG5leHBvcnQgZGVmYXVsdCB7cHJpdmF0ZVByb3BlcnR5LCBwcml2YXRlUHJvcGVydHlBY2Nlc3NvciwgcHJpdmF0ZVN0b3JlfTtcbiIsIi8qKlxuICogVHdvIHdheXMgb2YgYnVpbGRpbmcgYSBwcm9taXNlIHRoYXQgc29tZXRoaW5nIG91dHNpZGUgb2YgaXQgc2V0dGxlcy5cbiAqXG4gKiB7QGxpbmsgdGltZW91dFByb21pc2V9IHJ1bnMgYSBmdW5jdGlvbiBvbmNlIGEgdGltZW91dCBoYXMgcGFzc2VkIGFuZCBsZXRzIHRoZSB3aG9sZSBjaGFpbiBiZWhpbmRcbiAqIGl0IGJlIGNhbmNlbGVkLiB7QGxpbmsgbGF6eVByb21pc2V9IGhhbmRzIG91dCBhIHByb21pc2UgdG9nZXRoZXIgd2l0aCBpdHMgcmVzb2x2ZSBhbmQgcmVqZWN0LCBmb3JcbiAqIHRoZSBjYXNlcyB3aGVyZSB0aGUgc2V0dGxpbmcgaXMgZHJpdmVuIGZyb20gc29tZXdoZXJlIGVsc2UgLSBhIGZyYW1ld29yayBjYWxsYmFjaywgYW4gZXZlbnQsXG4gKiBmb3JlaWduIGNvZGUgLSBhbmQgcGFja2luZyBhbGwgb2YgdGhhdCBpbnRvIHRoZSBleGVjdXRvciB3b3VsZCBvbmx5IGJsb3cgdGhlIGNvZGUgdXAgb3IgaXMgbm90XG4gKiBwb3NzaWJsZSBhdCBhbGwuXG4gKlxuICogVGhlIHR3byBjYXJyeSBkaWZmZXJlbnQgc3RhdGUgb24gcHVycG9zZTogYSB0aW1lb3V0UHJvbWlzZSByZXBvcnRzIGl0cyBjYW5jZWxsYXRpb24gdGhyb3VnaCBhXG4gKiByZWplY3Rpb24gYW5kIGFuIEFib3J0U2lnbmFsLCBhIGxhenlQcm9taXNlIHJlcG9ydHMgaXRzIG91dGNvbWUgdGhyb3VnaCByZXNvbHZlZCwgZXJyb3IgYW5kIHZhbHVlLlxuICpcbiAqIEBtb2R1bGUgUHJvbWlzZVV0aWxzXG4gKi9cbmltcG9ydCB7IGRlZlZhbHVlLCBkZWZHZXQgfSBmcm9tIFwiLi9PYmplY3RVdGlscy5qc1wiO1xuXG4vKipcbiAqIFRoZSByZWFzb24gYW4gYWJvcnRlZCBvcGVyYXRpb24gcmVqZWN0cyB3aXRoLiBBIERPTUV4Y2VwdGlvbiBuYW1lZCBBYm9ydEVycm9yIGlzIHdoYXRcbiAqIEFib3J0Q29udHJvbGxlciBpdHNlbGYgdXNlcywgYW4gRXJyb3IgY2FycnlpbmcgdGhlIHNhbWUgbmFtZSBzdGFuZHMgaW4gd2hlcmUgaXQgaXMgbWlzc2luZy5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHJldHVybnMge0Vycm9yfERPTUV4Y2VwdGlvbn1cbiAqL1xuY29uc3QgYWJvcnRFcnJvciA9ICgpID0+IHtcblx0aWYgKHR5cGVvZiBET01FeGNlcHRpb24gIT09IFwidW5kZWZpbmVkXCIpIHJldHVybiBuZXcgRE9NRXhjZXB0aW9uKFwiVGhlIG9wZXJhdGlvbiB3YXMgYWJvcnRlZC5cIiwgXCJBYm9ydEVycm9yXCIpO1xuXG5cdC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0IC0gZXZlcnkgYnJvd3NlciB0aGUgc3VpdGUgcnVucyBpbiBicmluZ3MgRE9NRXhjZXB0aW9uLCBzbyB0aGlzIGxpbmUgb25seVxuXHQgICBzdGFuZHMgaW4gZm9yIGVudmlyb25tZW50cyB0aGUgdGVzdCBydW4gY2Fubm90IHJlYWNoICovXG5cdHJldHVybiBPYmplY3QuYXNzaWduKG5ldyBFcnJvcihcIlRoZSBvcGVyYXRpb24gd2FzIGFib3J0ZWQuXCIpLCB7IG5hbWU6IFwiQWJvcnRFcnJvclwiIH0pO1xufTtcblxuLyoqXG4gKiBUaGUgcmVhc29uIGEgc2lnbmFsIGNhcnJpZXMuIGFib3J0KCkgZmlsbHMgaXQgaW4gb24gaXRzIG93biwgb2xkZXIgaW1wbGVtZW50YXRpb25zIGtub3cgdGhlXG4gKiBtZXRob2QgYnV0IG5vdCB0aGUgcHJvcGVydHkuXG4gKlxuICogQHByaXZhdGVcbiAqIEBwYXJhbSB7QWJvcnRTaWduYWx9IHNpZ25hbFxuICogQHJldHVybnMgeyp9XG4gKi9cbmNvbnN0IGFib3J0UmVhc29uID0gKHNpZ25hbCkgPT4gKHR5cGVvZiBzaWduYWwucmVhc29uID09PSBcInVuZGVmaW5lZFwiID8gYWJvcnRFcnJvcigpIDogc2lnbmFsLnJlYXNvbik7XG5cbi8qKlxuICogQWRkcyB0aGUgY2FuY2VsIGFwaSB0byBhIHByb21pc2UgYW5kIHRvIGV2ZXJ5IHByb21pc2UgZGVyaXZlZCBmcm9tIGl0LiBBbGwgb2YgdGhlbSBzaGFyZSBvbmVcbiAqIGNvbnRyb2xsZXIsIHNvIGEgY2hhaW4gY2FuIGJlIGNhbmNlbGVkIGZyb20gYW55IG9mIGl0cyBsaW5rcy5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtQcm9taXNlfSBwcm9taXNlXG4gKiBAcGFyYW0ge0Fib3J0Q29udHJvbGxlcn0gY29udHJvbGxlclxuICogQHBhcmFtIHtGdW5jdGlvbn0gY2FuY2VsXG4gKiBAcmV0dXJucyB7UHJvbWlzZX0gdGhlIHByb21pc2UgaXRzZWxmXG4gKi9cbmNvbnN0IGNhbmNlbGFibGUgPSAocHJvbWlzZSwgY29udHJvbGxlciwgY2FuY2VsKSA9PiB7XG5cdGRlZlZhbHVlKHByb21pc2UsIFwiY2FuY2VsXCIsIGNhbmNlbCk7XG5cdGRlZkdldChwcm9taXNlLCBcInNpZ25hbFwiLCAoKSA9PiBjb250cm9sbGVyLnNpZ25hbCk7XG5cdGRlZkdldChwcm9taXNlLCBcImNhbmNlbGVkXCIsICgpID0+IGNvbnRyb2xsZXIuc2lnbmFsLmFib3J0ZWQpO1xuXG5cdC8vIHRoZW4gaGFzIHRvIGhhbmQgYm90aCBoYW5kbGVycyB0aHJvdWdoIGFuZCByZXR1cm4gdGhlIGRlcml2ZWQgcHJvbWlzZSAtIGNhdGNoLCBmaW5hbGx5IGFuZFxuXHQvLyBhd2FpdCBhcmUgZGVmaW5lZCBpbiB0ZXJtcyBvZiB0aGVuLCBzbyBhbnl0aGluZyBsZXNzIHNpbGVudGx5IGJyZWFrcyB0aG9zZSBhcyB3ZWxsXG5cdGNvbnN0IHRoZW4gPSBwcm9taXNlLnRoZW47XG5cdGRlZlZhbHVlKHByb21pc2UsIFwidGhlblwiLCAob25GdWxmaWxsZWQsIG9uUmVqZWN0ZWQpID0+IGNhbmNlbGFibGUodGhlbi5jYWxsKHByb21pc2UsIG9uRnVsZmlsbGVkLCBvblJlamVjdGVkKSwgY29udHJvbGxlciwgY2FuY2VsKSk7XG5cblx0cmV0dXJuIHByb21pc2U7XG59O1xuXG4vKipcbiAqIENhbGxzIGEgZnVuY3Rpb24gYWZ0ZXIgYSB0aW1lb3V0IGFuZCBzZXR0bGVzIHdpdGggd2hhdGV2ZXIgaXQgcHJvZHVjZXMuXG4gKlxuICogVGhlIGZ1bmN0aW9uIGlzIGNhbGxlZCB3aXRoIHJlc29sdmUsIHJlamVjdCBhbmQgdGhlIEFib3J0U2lnbmFsIG9mIHRoZSBwcm9taXNlLCBzbyB3b3JrIHN0YXJ0ZWRcbiAqIGluc2lkZSBpdCBjYW4gYmUgYWJvcnRlZCBhbG9uZyB3aXRoIGl0LiBBbiBleGNlcHRpb24gdGhyb3duIGJ5IHRoZSBmdW5jdGlvbiByZWplY3RzIHRoZSBwcm9taXNlXG4gKiBpbnN0ZWFkIG9mIGVzY2FwaW5nIGludG8gdGhlIHRpbWVyLlxuICpcbiAqIFRoZSBwcm9taXNlIGJyaW5ncyBpdHMgb3duIEFib3J0Q29udHJvbGxlci4gY2FuY2VsKCkgY2xlYXJzIGEgcGVuZGluZyB0aW1lb3V0IGFuZCByZWplY3RzIHdpdGggYW5cbiAqIEFib3J0RXJyb3IsIHdoaWNoIHRyYXZlbHMgZG93biB0aGUgd2hvbGUgY2hhaW4gLSBubyB0aGVuIGhhbmRsZXIgYmVoaW5kIGl0IHJ1bnMuIGNhbmNlbCgpIHNpdHMgb25cbiAqIGV2ZXJ5IHByb21pc2UgZGVyaXZlZCBmcm9tIGl0IGFuZCBkb2VzIG5vdGhpbmcgb25jZSB0aGUgcHJvbWlzZSBoYXMgc2V0dGxlZC5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBjYWxsZWQgd2l0aCAocmVzb2x2ZSwgcmVqZWN0LCBzaWduYWwpIG9uY2UgdGhlIHRpbWVvdXQgaGFzIHBhc3NlZFxuICogQHBhcmFtIHtudW1iZXJ9IG1zIHRoZSB0aW1lb3V0IGluIG1pbGxpc2Vjb25kc1xuICogQHJldHVybnMge1Byb21pc2V9IGEgcHJvbWlzZSBjYXJyeWluZyBjYW5jZWwoKSwgc2lnbmFsIGFuZCBjYW5jZWxlZFxuICpcbiAqIEBleGFtcGxlXG4gKiBjb25zdCBwcm9taXNlID0gdGltZW91dFByb21pc2UoKHJlc29sdmUpID0+IHJlc29sdmUoXCJkb25lXCIpLCAxMDAwKTtcbiAqIGF3YWl0IHByb21pc2U7ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFwiZG9uZVwiXG4gKlxuICogQGV4YW1wbGVcbiAqIGNvbnN0IHByb21pc2UgPSB0aW1lb3V0UHJvbWlzZSgocmVzb2x2ZSkgPT4gcmVzb2x2ZShcImRvbmVcIiksIDEwMDApO1xuICogcHJvbWlzZS50aGVuKCgpID0+IGNvbnNvbGUubG9nKFwibmV2ZXIgcnVuc1wiKSk7XG4gKiBwcm9taXNlLmNhbmNlbCgpO1xuICogYXdhaXQgcHJvbWlzZTsgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhyb3dzIEFib3J0RXJyb3JcbiAqL1xuZXhwb3J0IGNvbnN0IHRpbWVvdXRQcm9taXNlID0gKGZuLCBtcykgPT4ge1xuXHRjb25zdCBjb250cm9sbGVyID0gbmV3IEFib3J0Q29udHJvbGxlcigpO1xuXHRjb25zdCBzaWduYWwgPSBjb250cm9sbGVyLnNpZ25hbDtcblx0bGV0IHRpbWVvdXQgPSBudWxsO1xuXHRsZXQgc2V0dGxlZCA9IGZhbHNlO1xuXG5cdGNvbnN0IHByb21pc2UgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG5cdFx0Ly8gdGhlIHRpbWVvdXQgaXMgY2xlYXJlZCBvbiBldmVyeSB3YXkgb3V0LCBhIGNhbmNlbGVkIHByb21pc2UgbXVzdCBub3Qga2VlcCB0aGUgdGltZXIgYWxpdmVcblx0XHRjb25zdCBzZXR0bGUgPSAoaGFuZGxlcikgPT4gKHZhbHVlKSA9PiB7XG5cdFx0XHRpZiAoc2V0dGxlZCkgcmV0dXJuO1xuXG5cdFx0XHRzZXR0bGVkID0gdHJ1ZTtcblx0XHRcdGlmICh0aW1lb3V0ICE9PSBudWxsKSB7XG5cdFx0XHRcdGNsZWFyVGltZW91dCh0aW1lb3V0KTtcblx0XHRcdFx0dGltZW91dCA9IG51bGw7XG5cdFx0XHR9XG5cdFx0XHRoYW5kbGVyKHZhbHVlKTtcblx0XHR9O1xuXG5cdFx0Y29uc3Qgb25SZXNvbHZlID0gc2V0dGxlKHJlc29sdmUpO1xuXHRcdGNvbnN0IG9uUmVqZWN0ID0gc2V0dGxlKHJlamVjdCk7XG5cblx0XHRzaWduYWwuYWRkRXZlbnRMaXN0ZW5lcihcImFib3J0XCIsICgpID0+IG9uUmVqZWN0KGFib3J0UmVhc29uKHNpZ25hbCkpLCB7IG9uY2U6IHRydWUgfSk7XG5cblx0XHR0aW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiB7XG5cdFx0XHR0aW1lb3V0ID0gbnVsbDtcblx0XHRcdHRyeSB7XG5cdFx0XHRcdGZuKG9uUmVzb2x2ZSwgb25SZWplY3QsIHNpZ25hbCk7XG5cdFx0XHR9IGNhdGNoIChlcnJvcikge1xuXHRcdFx0XHRvblJlamVjdChlcnJvcik7XG5cdFx0XHR9XG5cdFx0fSwgbXMpO1xuXHR9KTtcblxuXHRyZXR1cm4gY2FuY2VsYWJsZShwcm9taXNlLCBjb250cm9sbGVyLCAocmVhc29uKSA9PiB7XG5cdFx0aWYgKHNldHRsZWQgfHwgc2lnbmFsLmFib3J0ZWQpIHJldHVybjtcblxuXHRcdGNvbnRyb2xsZXIuYWJvcnQodHlwZW9mIHJlYXNvbiA9PT0gXCJ1bmRlZmluZWRcIiA/IGFib3J0RXJyb3IoKSA6IHJlYXNvbik7XG5cdH0pO1xufTtcblxuLyoqXG4gKiBCdWlsZHMgYSBwcm9taXNlIHRvZ2V0aGVyIHdpdGggdGhlIHR3byBmdW5jdGlvbnMgc2V0dGxpbmcgaXQuXG4gKlxuICogVGhlIHBvaW50IGlzIHRvIGhhdmUgdGhlIHByb21pc2UgYW5kIGl0cyByZXNvbHZlIGFuZCByZWplY3QgYXBhcnQgZnJvbSBlYWNoIG90aGVyOiB3aGF0ZXZlclxuICogc2V0dGxlcyBpdCBkb2VzIG5vdCBoYXZlIHRvIHNpdCBpbnNpZGUgdGhlIGV4ZWN1dG9yLiBUaGF0IGtlZXBzIGEgcHJvbWlzZSB1c2FibGUgd2hlcmUgdGhlXG4gKiBzZXR0bGluZyBpcyBkcml2ZW4gYnkgYSBmcmFtZXdvcmsgY2FsbGJhY2ssIGFuIGV2ZW50IG9yIGFueSBvdGhlciBmb3JlaWduIGNvZGUgdGhlIGV4ZWN1dG9yIGhhcyBub1xuICogd2F5IG9mIHJlYWNoaW5nLlxuICpcbiAqIFRoZSBwcm9taXNlIGNhcnJpZXMgdGhyZWUgcmVhZCBvbmx5IHByb3BlcnRpZXM6XG4gKlxuICogLSByZXNvbHZlZCBzYXlzIHRoZSBwcm9taXNlIGhhcyBiZWVuIHNldHRsZWQuIEl0IHNheXMgbm90aGluZyBhYm91dCB0aGUgb3V0Y29tZSAtIGl0IGlzIHRydWUgZm9yIGFcbiAqICAgZmFpbHVyZSBqdXN0IGFzIHdlbGwuXG4gKiAtIGVycm9yIHRlbGxzIHRoZSB0d28gYXBhcnQuXG4gKiAtIHZhbHVlIGhvbGRzIHdoYXRldmVyIHRoZSBwcm9taXNlIHdhcyBzZXR0bGVkIHdpdGg6IHRoZSByZXN1bHQgYWZ0ZXIgYSByZXNvbHZlLCB0aGUgcmVhc29uIGFmdGVyXG4gKiAgIGEgcmVqZWN0LiBlcnJvciBpcyB3aGF0IGRlY2lkZXMgaG93IHRvIHJlYWQgaXQuXG4gKlxuICogQW4gRXJyb3IgYWx3YXlzIGxlYWRzIHRvIGEgcmVqZWN0aW9uLCBpbiBib3RoIGRpcmVjdGlvbnMgLSBoYW5kaW5nIG9uZSB0byByZXNvbHZlIHJlamVjdHMgdGhlXG4gKiBwcm9taXNlIGp1c3QgbGlrZSByZWplY3Qgd291bGQuIEEgcmVhc29uIHRoYXQgaXMgbm8gRXJyb3IgaXMgd3JhcHBlZCBpbnRvIG9uZSwgYW5kIGEgcmVqZWN0XG4gKiB3aXRob3V0IGEgcmVhc29uIGdldHMgYW4gRXJyb3Igb2YgaXRzIG93biwgc28gdGhlcmUgaXMgYWx3YXlzIGEgbWVzc2FnZSB0byByZWFkLlxuICpcbiAqIEJvdGggZnVuY3Rpb25zIHNldHRsZSB0aGUgcHJvbWlzZSBvbmNlLiBBIHNlY29uZCBjYWxsIHRocm93cyBpbnN0ZWFkIG9mIHNldHRsaW5nIGFnYWluLCBzbyB0aGVcbiAqIHRocmVlIHByb3BlcnRpZXMgY2FuIG5ldmVyIGVuZCB1cCBkaXNhZ3JlZWluZyB3aXRoIHRoZSBwcm9taXNlLlxuICpcbiAqIEByZXR1cm5zIHtQcm9taXNlfSBhIHByb21pc2UgY2FycnlpbmcgcmVzb2x2ZSgpLCByZWplY3QoKSwgdmFsdWUsIGVycm9yIGFuZCByZXNvbHZlZFxuICogQHRocm93cyB7RXJyb3J9IGZyb20gcmVzb2x2ZSBvciByZWplY3Qgd2hlbiB0aGUgcHJvbWlzZSBoYXMgYWxyZWFkeSBiZWVuIHNldHRsZWRcbiAqXG4gKiBAZXhhbXBsZVxuICogY29uc3QgcHJvbWlzZSA9IGxhenlQcm9taXNlKCk7XG4gKiBlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsICgpID0+IHByb21pc2UucmVzb2x2ZShlbGVtZW50KSwge29uY2UgOiB0cnVlfSk7XG4gKiBhd2FpdCBwcm9taXNlO1xuICpcbiAqIEBleGFtcGxlXG4gKiBjb25zdCBwcm9taXNlID0gbGF6eVByb21pc2UoKTtcbiAqIHByb21pc2UucmVqZWN0KFwibm8gY29ubmVjdGlvblwiKTsgICAvLyByZWplY3RzIHdpdGggYW4gRXJyb3IgY2FycnlpbmcgdGhhdCBtZXNzYWdlXG4gKiBwcm9taXNlLnJlc29sdmVkOyAgICAgICAgICAgICAgICAgIC8vIHRydWUgLSBzZXR0bGVkLCBub3Qgc3VjY2Vzc2Z1bFxuICogcHJvbWlzZS5lcnJvcjsgICAgICAgICAgICAgICAgICAgICAvLyB0cnVlXG4gKiBwcm9taXNlLnZhbHVlOyAgICAgICAgICAgICAgICAgICAgIC8vIFwibm8gY29ubmVjdGlvblwiXG4gKi9cbmV4cG9ydCBjb25zdCBsYXp5UHJvbWlzZSA9ICgpID0+IHtcblx0bGV0IHByb21pc2VSZXNvbHZlID0gbnVsbDtcblx0bGV0IHByb21pc2VSZWplY3QgPSBudWxsO1xuXHRsZXQgcmVzb2x2ZWQgPSBmYWxzZTtcblx0bGV0IGVycm9yID0gZmFsc2U7XG5cdGxldCB2YWx1ZSA9IHVuZGVmaW5lZDtcblxuXHRjb25zdCBwcm9taXNlID0gbmV3IFByb21pc2UoKHIsIGUpID0+IHtcblx0XHRwcm9taXNlUmVzb2x2ZSA9IHI7XG5cdFx0cHJvbWlzZVJlamVjdCA9IChhbkVycm9yKSA9PiBlKGFuRXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGFuRXJyb3IgOiBuZXcgRXJyb3IoYW5FcnJvciA9PSBudWxsID8gXCJQcm9taXNlIHJlamVjdGVkIHdpdGggbm8gcmVhc29uXCIgOiBhbkVycm9yKSk7XG5cdH0pO1xuXG5cdGRlZlZhbHVlKHByb21pc2UsIFwicmVzb2x2ZVwiLCAocmVzdWx0KSA9PiB7XG5cdFx0aWYgKHJlc29sdmVkKSB0aHJvdyBuZXcgRXJyb3IoXCJQcm9taXNlIGFscmVhZHkgcmVzb2x2ZWQhXCIpO1xuXHRcdHJlc29sdmVkID0gdHJ1ZTtcblx0XHR2YWx1ZSA9IHJlc3VsdDtcblx0XHRpZiAodmFsdWUgaW5zdGFuY2VvZiBFcnJvcikge1xuXHRcdFx0ZXJyb3IgPSB0cnVlO1xuXHRcdFx0cHJvbWlzZVJlamVjdCh2YWx1ZSk7XG5cdFx0fSBlbHNlIHByb21pc2VSZXNvbHZlKHZhbHVlKTtcblx0fSk7XG5cdGRlZlZhbHVlKHByb21pc2UsIFwicmVqZWN0XCIsIChyZXN1bHQpID0+IHtcblx0XHRpZiAocmVzb2x2ZWQpIHRocm93IG5ldyBFcnJvcihcIlByb21pc2UgYWxyZWFkeSByZXNvbHZlZCFcIik7XG5cdFx0cmVzb2x2ZWQgPSB0cnVlO1xuXHRcdHZhbHVlID0gcmVzdWx0O1xuXHRcdGVycm9yID0gdHJ1ZTtcblx0XHRwcm9taXNlUmVqZWN0KHJlc3VsdCk7XG5cdH0pO1xuXG5cdGRlZkdldChwcm9taXNlLCBcInZhbHVlXCIsICgpID0+IHZhbHVlKTtcblx0ZGVmR2V0KHByb21pc2UsIFwiZXJyb3JcIiwgKCkgPT4gZXJyb3IpO1xuXHRkZWZHZXQocHJvbWlzZSwgXCJyZXNvbHZlZFwiLCAoKSA9PiByZXNvbHZlZCk7XG5cblx0cmV0dXJuIHByb21pc2U7XG59O1xuZXhwb3J0IGRlZmF1bHQge1xuXHRsYXp5UHJvbWlzZSxcblx0dGltZW91dFByb21pc2UsXG59O1xuIiwiLyoqXG4gKiBDcmVhdGlvbiBvZiByYW5kb20gVVVJRHMuXG4gKlxuICogQG1vZHVsZSBVVUlEXG4gKi9cbi8vdGhlIHNvbHV0aW9uIGlzIGZvdW5kIGhlcmU6IGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzEwNTAzNC9ob3ctdG8tY3JlYXRlLWEtZ3VpZC11dWlkXG5cbmltcG9ydCBHTE9CQUwgZnJvbSBcIi4vR2xvYmFsLmpzXCI7XG5cbi8qKlxuICogVGhlIGxheW91dCBvZiBhIHZlcnNpb24gNCBVVUlELiB4IGlzIGEgcmFuZG9tIGhleCBkaWdpdCwgeSBpcyB0aGUgdmFyaWFudCBkaWdpdCBhbmQgYmVjb21lcyBvbmUgb2ZcbiAqIDgsIDksIGEgb3IgYi5cbiAqXG4gKiBAdHlwZSB7c3RyaW5nfVxuICovXG5leHBvcnQgY29uc3QgVVVJRF9TQ0hFTUEgPSBcInh4eHh4eHh4LXh4eHgtNHh4eC15eHh4LXh4eHh4eHh4eHh4eFwiO1xuXG4vKipcbiAqIENyZWF0ZXMgYSByYW5kb20gVVVJRCBvZiB2ZXJzaW9uIDQuXG4gKlxuICogVGhlIGRpZ2l0cyBjb21lIGZyb20gY3J5cHRvLmdldFJhbmRvbVZhbHVlcywgbm90IGZyb20gTWF0aC5yYW5kb20uIFJlcXVpcmVzIGEgY3J5cHRvIG9uIHRoZSBnbG9iYWxcbiAqIHNjb3BlLCB3aGljaCBldmVyeSBicm93c2VyIGFuZCBldmVyeSB3ZWIgd29ya2VyIGJyaW5ncy5cbiAqXG4gKiBAcmV0dXJucyB7c3RyaW5nfSAzNiBjaGFyYWN0ZXJzLCBmb2xsb3dpbmcge0BsaW5rIFVVSURfU0NIRU1BfVxuICpcbiAqIEBleGFtcGxlXG4gKiB1dWlkKCk7ICAgLy8gXCIxYjlkNmJjZC1iYmZkLTRiMmQtOWI1ZC1hYjhkZmJiZDRiZWRcIlxuICovXG5leHBvcnQgY29uc3QgdXVpZCA9ICgpID0+IHtcblx0Y29uc3QgYnVmID0gbmV3IFVpbnQzMkFycmF5KDQpO1xuXHRHTE9CQUwuY3J5cHRvLmdldFJhbmRvbVZhbHVlcyhidWYpO1xuXHRsZXQgaWR4ID0gLTE7XG5cdHJldHVybiBVVUlEX1NDSEVNQS5yZXBsYWNlKC9beHldL2csIChjKSA9PiB7XG5cdFx0aWR4Kys7XG5cdFx0Y29uc3QgciA9IChidWZbaWR4ID4+IDNdID4+ICgoaWR4ICUgOCkgKiA0KSkgJiAxNTtcblx0XHRjb25zdCB2ID0gYyA9PSBcInhcIiA/IHIgOiAociAmIDB4MykgfCAweDg7XG5cdFx0cmV0dXJuIHYudG9TdHJpbmcoMTYpO1xuXHR9KTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IHsgdXVpZCB9O1xuIiwiLyoqXHJcbiAqIFNtYWxsIGNoZWNrcyBvbiBwbGFpbiB2YWx1ZXMuXHJcbiAqXHJcbiAqIG5vVmFsdWUgYW5zd2VycyB0aGUgc2FtZSBxdWVzdGlvbiBhcyBPYmplY3RVdGlscy5pc051bGxPclVuZGVmaW5lZCBhbmQgaXMga2VwdCBhcyBpdHMgb3duIGZ1bmN0aW9uXHJcbiAqIG9uIHB1cnBvc2U6IHRoaXMgbW9kdWxlIGlzIHRoZSBvbmUgdG8gcmVhY2ggZm9yIHdoZW4gYWxsIHRoYXQgaXMgbmVlZGVkIGlzIGEgbG9vayBhdCBhIHZhbHVlLCBhbmRcclxuICogaXQgc3RheXMgZnJlZSBvZiBhbnkgZGVwZW5kZW5jeSBvbiBPYmplY3RVdGlscy4gVGhlIGR1cGxpY2F0aW9uIGlzIHRoZSBwcmljZSBmb3IgdGhhdCwgYW5kIGl0IGlzXHJcbiAqIGFjY2VwdGVkIC0gYm90aCBhcmUgdHdvIGxpbmVzIGFuZCBuZWl0aGVyIGlzIGdvaW5nIHRvIGNoYW5nZS5cclxuICpcclxuICogQG1vZHVsZSBWYWx1ZUhlbHBlclxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBDaGVja3Mgd2hldGhlciBhIHZhbHVlIGlzIG51bGwgb3IgdW5kZWZpbmVkLlxyXG4gKlxyXG4gKiBAcGFyYW0geyp9IHZhbHVlXHJcbiAqIEByZXR1cm5zIHtib29sZWFufVxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IG5vVmFsdWUgPSAodmFsdWUpID0+IHtcclxuXHRyZXR1cm4gdmFsdWUgPT0gbnVsbCB8fCB0eXBlb2YgdmFsdWUgPT09IFwidW5kZWZpbmVkXCI7XHJcbn07XHJcblxyXG4vKipcclxuICogQ2hlY2tzIHdoZXRoZXIgYSBzdHJpbmcgY2FycmllcyBub3RoaW5nIHRvIHdvcmsgd2l0aCAtIG51bGwsIHVuZGVmaW5lZCwgZW1wdHkgb3Igd2hpdGVzcGFjZSBvbmx5LlxyXG4gKlxyXG4gKiBFeHBlY3RzIGEgc3RyaW5nIGZvciBldmVyeXRoaW5nIGVsc2UgYW5kIHRocm93cyBvbiBhIHZhbHVlIHdpdGhvdXQgdHJpbSwgYSBudW1iZXIgZm9yIGluc3RhbmNlLlxyXG4gKlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWVcclxuICogQHJldHVybnMge2Jvb2xlYW59XHJcbiAqXHJcbiAqIEBleGFtcGxlXHJcbiAqIGVtcHR5T3JCbGFuayhcIiAgXCIpOyAgICAgLy8gdHJ1ZVxyXG4gKiBlbXB0eU9yQmxhbmsobnVsbCk7ICAgICAvLyB0cnVlXHJcbiAqIGVtcHR5T3JCbGFuayhcInRlc3RcIik7ICAgLy8gZmFsc2VcclxuICovXHJcbmV4cG9ydCBjb25zdCBlbXB0eU9yQmxhbmsgPSAodmFsdWUpID0+IHtcclxuXHRyZXR1cm4gbm9WYWx1ZSh2YWx1ZSkgfHwgdmFsdWUudHJpbSgpLmxlbmd0aCA9PSAwO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEBkZXByZWNhdGVkIHVzZSB7QGxpbmsgZW1wdHlPckJsYW5rfVxyXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWVcclxuICogQHJldHVybnMge2Jvb2xlYW59XHJcbiAqL1xyXG5leHBvcnQgY29uc3QgZW10cHlPck5vVmFsdWVTdHJpbmcgPSAodmFsdWUpID0+IHtcclxuXHRjb25zb2xlLndhcm4oXCJlbXRweU9yTm9WYWx1ZVN0cmluZyBpcyBkZXByZWNhdGVkISB1c2UgZW1wdHlPckJsYW5rXCIpO1xyXG5cdHJldHVybiBlbXB0eU9yQmxhbmsodmFsdWUpO1xyXG59O1xyXG5cclxuXHJcbmV4cG9ydCBkZWZhdWx0IHtcclxuXHRub1ZhbHVlLFxyXG5cdGVtcHR5T3JCbGFuayxcclxuXHRlbXRweU9yTm9WYWx1ZVN0cmluZ1xyXG59OyIsIi8qKlxuICogRW50cnkgcG9pbnQgb2YgdGhlIHBhY2thZ2UuXG4gKlxuICogSW1wb3J0aW5nIGl0IGFsc28gcHVsbHMgaW4gdGhlIGphdmFzY3JpcHQgbW9kdWxlLCB3aGljaCBleHRlbmRzIFN0cmluZyBhbmQgTWFwIC0gc2VlIHRoZSBub3RlXG4gKiB0aGVyZS4gUmVhZHksIFNlcnZpY2VIZWxwZXIgYW5kIHRoZSBYbWxUb0pzb24gY29udmVydGVyIGFyZSBub3QgcGFydCBvZiB0aGlzIHN1cmZhY2UgYW5kIGhhdmUgdG8gYmVcbiAqIGltcG9ydGVkIGZyb20gdGhlaXIgb3duIGZpbGUuXG4gKlxuICogQG1vZHVsZSBkZWZhdWx0anMtY29tbW9uLXV0aWxzXG4gKi9cbmltcG9ydCBcIi4vamF2YXNjcmlwdC9pbmRleC5qc1wiO1xuaW1wb3J0IE9iamVjdFV0aWxzIGZyb20gXCIuL09iamVjdFV0aWxzLmpzXCI7XG5pbXBvcnQgR0xPQkFMIGZyb20gXCIuL0dsb2JhbC5qc1wiO1xuaW1wb3J0IEVzY2FwZXIgZnJvbSBcIi4vRXNjYXBlci5qc1wiO1xuaW1wb3J0IFZhbHVlSGVscGVyIGZyb20gXCIuL1ZhbHVlSGVscGVyLmpzXCI7XG5pbXBvcnQgUHJvbWlzZVV0aWxzIGZyb20gXCIuL1Byb21pc2VVdGlscy5qc1wiO1xuaW1wb3J0IFByaXZhdGVQcm9wZXJ0eSBmcm9tIFwiLi9Qcml2YXRlUHJvcGVydHkuanNcIjtcbmltcG9ydCBVVUlEIGZyb20gXCIuL1VVSUQuanNcIjtcblxuZXhwb3J0IHtcblx0R0xPQkFMICxcblx0T2JqZWN0VXRpbHMsXG5cdEVzY2FwZXIsXG5cdFZhbHVlSGVscGVyLFxuXHRQcm9taXNlVXRpbHMsXG5cdFByaXZhdGVQcm9wZXJ0eSxcblx0VVVJRFxufTsiLCIvKipcclxuICogQWRkcyB0b09iamVjdCgpIHRvIGV2ZXJ5IE1hcCAtIHNlZSB0aGUgbm90ZSBvbiBwYXRjaGluZyBwcm90b3R5cGVzIGluIC4vaW5kZXguanMuXHJcbiAqXHJcbiAqIEEgbmVzdGVkIE1hcCBpcyBjb252ZXJ0ZWQgYWxvbmcgd2l0aCBpdC4gRXZlcnkga2V5IGJlY29tZXMgYSBwcm9wZXJ0eSBuYW1lLCBzbyBhIGtleSB0aGF0IGlzIG5vXHJcbiAqIHN0cmluZyBpcyB0dXJuZWQgaW50byBvbmUgdGhlIHdheSBqYXZhc2NyaXB0IGRvZXMgaXQgLSBhbiBvYmplY3Qga2V5IGVuZHMgdXAgYXMgXCJbb2JqZWN0IE9iamVjdF1cIixcclxuICogYW5kIHR3byBrZXlzIGNvbGxhcHNpbmcgb250byB0aGUgc2FtZSBuYW1lIG92ZXJ3cml0ZSBlYWNoIG90aGVyLlxyXG4gKlxyXG4gKiBPbmx5IGRlZmluZWQgd2hlbiBub3RoaW5nIGVsc2UgY2FycmllcyB0aGF0IG5hbWUgYWxyZWFkeS5cclxuICpcclxuICogQHJldHVybnMge29iamVjdH1cclxuICpcclxuICogQGV4YW1wbGVcclxuICogbmV3IE1hcChbW1wiYVwiLCAxXSwgW1wiYlwiLCBuZXcgTWFwKFtbXCJjXCIsIDJdXSldXSkudG9PYmplY3QoKTsgICAvLyB7YSA6IDEsIGIgOiB7YyA6IDJ9fVxyXG4gKi9cclxuaWYgKCFNYXAucHJvdG90eXBlLnRvT2JqZWN0KVxyXG5cdE1hcC5wcm90b3R5cGUudG9PYmplY3QgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRjb25zdCBvYmplY3QgPSB7fTtcclxuXHRcdGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIHRoaXMuZW50cmllcygpKSBvYmplY3Rba2V5XSA9IHZhbHVlIGluc3RhbmNlb2YgTWFwID8gdmFsdWUudG9PYmplY3QoKSA6IHZhbHVlO1xyXG5cclxuXHRcdHJldHVybiBvYmplY3Q7XHJcblx0fTtcclxuIiwiLyoqXHJcbiAqIEFkZHMgaGFzaGNvZGUoKSB0byBldmVyeSBzdHJpbmcgLSBzZWUgdGhlIG5vdGUgb24gcGF0Y2hpbmcgcHJvdG90eXBlcyBpbiAuL2luZGV4LmpzLlxyXG4gKlxyXG4gKiBUaGUgaGFzaCBpcyB0aGUgb25lIGphdmEgdXNlcyBmb3IgaXRzIHN0cmluZ3M6IGggPSAzMSAqIGggKyBjaGFyLCBrZXB0IGluc2lkZSAzMiBzaWduZWQgYml0cy4gSXRcclxuICogaXMgbWVhbnQgZm9yIGJ1Y2tldGluZyBhbmQgZm9yIHRlbGxpbmcgdGV4dHMgYXBhcnQgY2hlYXBseSwgbm90IGZvciBhbnl0aGluZyB3aGVyZSBjb2xsaXNpb25zXHJcbiAqIG1hdHRlciAtIHR3byBkaWZmZXJlbnQgdGV4dHMgY2FuIHNoYXJlIGEgaGFzaCwgYW5kIGl0IGlzIG5vIGNyeXB0b2dyYXBoaWMgZGlnZXN0LlxyXG4gKlxyXG4gKiBPbmx5IGRlZmluZWQgd2hlbiBub3RoaW5nIGVsc2UgY2FycmllcyB0aGF0IG5hbWUgYWxyZWFkeS5cclxuICpcclxuICogQHJldHVybnMge251bWJlcn0gYSAzMiBiaXQgc2lnbmVkIGludGVnZXIsIDAgZm9yIHRoZSBlbXB0eSBzdHJpbmdcclxuICpcclxuICogQGV4YW1wbGVcclxuICogXCJ0ZXN0XCIuaGFzaGNvZGUoKTsgICAvLyAzNTU2NDk4XHJcbiAqL1xyXG5pZiAoIVN0cmluZy5wcm90b3R5cGUuaGFzaGNvZGUpXHJcblx0U3RyaW5nLnByb3RvdHlwZS5oYXNoY29kZSA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0aWYgKHRoaXMubGVuZ3RoID09PSAwKVxyXG5cdFx0XHRyZXR1cm4gMDtcclxuXHRcdFxyXG5cdFx0bGV0IGhhc2ggPSAwO1xyXG5cdFx0Y29uc3QgbGVuZ3RoID0gdGhpcy5sZW5ndGg7XHJcblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdGNvbnN0IGMgPSB0aGlzLmNoYXJDb2RlQXQoaSk7XHJcblx0XHRcdGhhc2ggPSAoKGhhc2ggPDwgNSkgLSBoYXNoKSArIGM7XHJcblx0XHRcdGhhc2ggfD0gMDsgLy8gQ29udmVydCB0byAzMmJpdCBpbnRlZ2VyXHJcblx0XHR9XHJcblx0XHRyZXR1cm4gaGFzaDtcclxuXHR9OyIsIi8qKlxyXG4gKiBFeHRlbnNpb25zIHRvIHRoZSBidWlsdCBpbiBqYXZhc2NyaXB0IHR5cGVzLlxyXG4gKlxyXG4gKiBJbXBvcnRpbmcgdGhpcyBtb2R1bGUgcGF0Y2hlcyBwcm90b3R5cGVzIC0gdGhhdCBpcyB3aGF0IGl0IGlzIGZvciwgYW5kIGl0IGlzIGRlbGliZXJhdGUuIFRoZVxyXG4gKiBwYWNrYWdlIGltcG9ydHMgaXQgZnJvbSBpdHMgb3duIGVudHJ5IHBvaW50LCBzbyBhbnl0aGluZyB1c2luZyBpdCBnZXRzIHRoZSBleHRlbnNpb25zIHdpdGhvdXRcclxuICogYXNraW5nIGZvciB0aGVtIHNlcGFyYXRlbHkuIFRoZXkgYXJlIG1lYW50IHRvIHJlYWQgbGlrZSBwYXJ0IG9mIHRoZSBsYW5ndWFnZSBhdCB0aGUgY2FsbCBzaXRlOlxyXG4gKiBcInRleHRcIi5oYXNoY29kZSgpIGluc3RlYWQgb2YgaGFzaGNvZGUoXCJ0ZXh0XCIpLlxyXG4gKlxyXG4gKiBFdmVyeSBleHRlbnNpb24gaXMgYWRkZWQgb25seSB3aGVuIHRoZSB0eXBlIGRvZXMgbm90IGFscmVhZHkgY2FycnkgdGhhdCBuYW1lLCBzbyBhIG5ld2VyIGVuZ2luZVxyXG4gKiBvciBhbm90aGVyIGxpYnJhcnkgZGVmaW5pbmcgdGhlIHNhbWUgbWVtYmVyIGtlZXBzIHRoZSB1cHBlciBoYW5kIGFuZCBub3RoaW5nIGlzIG92ZXJ3cml0dGVuLlxyXG4gKlxyXG4gKiBAbW9kdWxlIGphdmFzY3JpcHRcclxuICovXHJcbmltcG9ydCBcIi4vU3RyaW5nLmpzXCI7XHJcbmltcG9ydCBcIi4vTWFwLmpzXCI7IiwiLy8gVGhlIG1vZHVsZSBjYWNoZVxudmFyIF9fd2VicGFja19tb2R1bGVfY2FjaGVfXyA9IHt9O1xuXG4vLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcblx0dmFyIGNhY2hlZE1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF07XG5cdGlmIChjYWNoZWRNb2R1bGUgIT09IHVuZGVmaW5lZCkge1xuXHRcdHJldHVybiBjYWNoZWRNb2R1bGUuZXhwb3J0cztcblx0fVxuXHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuXHR2YXIgbW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXSA9IHtcblx0XHQvLyBubyBtb2R1bGUuaWQgbmVlZGVkXG5cdFx0Ly8gbm8gbW9kdWxlLmxvYWRlZCBuZWVkZWRcblx0XHRleHBvcnRzOiB7fVxuXHR9O1xuXG5cdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuXHRfX3dlYnBhY2tfbW9kdWxlc19fW21vZHVsZUlkXShtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuXHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuXHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG59XG5cbiIsIi8vIGRlZmluZSBnZXR0ZXIgZnVuY3Rpb25zIGZvciBoYXJtb255IGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uZCA9IChleHBvcnRzLCBkZWZpbml0aW9uKSA9PiB7XG5cdGZvcih2YXIga2V5IGluIGRlZmluaXRpb24pIHtcblx0XHRpZihfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZGVmaW5pdGlvbiwga2V5KSAmJiAhX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIGtleSkpIHtcblx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBrZXksIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBkZWZpbml0aW9uW2tleV0gfSk7XG5cdFx0fVxuXHR9XG59OyIsIl9fd2VicGFja19yZXF1aXJlX18ubyA9IChvYmosIHByb3ApID0+IChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKSkiLCIvLyBkZWZpbmUgX19lc01vZHVsZSBvbiBleHBvcnRzXG5fX3dlYnBhY2tfcmVxdWlyZV9fLnIgPSAoZXhwb3J0cykgPT4ge1xuXHRpZih0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2wudG9TdHJpbmdUYWcpIHtcblx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgU3ltYm9sLnRvU3RyaW5nVGFnLCB7IHZhbHVlOiAnTW9kdWxlJyB9KTtcblx0fVxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pO1xufTsiLCJpbXBvcnQgeyBHTE9CQUwsIE9iamVjdFV0aWxzLCBFc2NhcGVyLCBWYWx1ZUhlbHBlciwgUHJvbWlzZVV0aWxzLCBQcml2YXRlUHJvcGVydHksIFVVSUQgfSBmcm9tIFwiLi9zcmMvaW5kZXguanNcIjtcblxuZXhwb3J0IHsgR0xPQkFMLCBPYmplY3RVdGlscywgRXNjYXBlciwgVmFsdWVIZWxwZXIsIFByb21pc2VVdGlscywgUHJpdmF0ZVByb3BlcnR5LCBVVUlEIH07XG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=