/**
 * Creation of random UUIDs.
 */

/** The layout of a version 4 UUID. x is a random hex digit, y becomes one of 8, 9, a or b. */
export const UUID_SCHEMA: string;

/**
 * Creates a random UUID of version 4. The digits come from crypto.getRandomValues, so a crypto on the
 * global scope is required.
 */
export function uuid(): string;

declare const UUID: {
	uuid: typeof uuid;
};

export default UUID;
