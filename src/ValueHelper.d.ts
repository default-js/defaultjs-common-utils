/**
 * Small checks on plain values.
 */

/** Checks whether a value is null or undefined. */
export function noValue(value: unknown): boolean;

/**
 * Checks whether a string carries nothing to work with - null, undefined, empty or whitespace only.
 * Expects a string for everything else and throws on a value without trim.
 */
export function emptyOrBlank(value: string | null | undefined): boolean;

/** @deprecated use {@link emptyOrBlank} */
export function emtpyOrNoValueString(value: string | null | undefined): boolean;

declare const ValueHelper: {
	noValue: typeof noValue;
	emptyOrBlank: typeof emptyOrBlank;
	emtpyOrNoValueString: typeof emtpyOrNoValueString;
};

export default ValueHelper;
