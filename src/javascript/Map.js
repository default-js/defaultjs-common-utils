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
