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
export const noValue = (value) => {
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
export const emptyOrBlank = (value) => {
	return noValue(value) || value.trim().length == 0;
};

/**
 * @deprecated use {@link emptyOrBlank}
 * @param {string} value
 * @returns {boolean}
 */
export const emtpyOrNoValueString = (value) => {
	console.warn("emtpyOrNoValueString is deprecated! use emptyOrBlank");
	return emptyOrBlank(value);
};


export default {
	noValue,
	emptyOrBlank,
	emtpyOrNoValueString
};