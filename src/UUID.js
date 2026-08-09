/**
 * Creation of random UUIDs.
 *
 * @module UUID
 */
//the solution is found here: https://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid

import GLOBAL from "./Global.js";

/**
 * The layout of a version 4 UUID. x is a random hex digit, y is the variant digit and becomes one of
 * 8, 9, a or b.
 *
 * @type {string}
 */
export const UUID_SCHEMA = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";

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
export const uuid = () => {
	const buf = new Uint32Array(4);
	GLOBAL.crypto.getRandomValues(buf);
	let idx = -1;
	return UUID_SCHEMA.replace(/[xy]/g, (c) => {
		idx++;
		const r = (buf[idx >> 3] >> ((idx % 8) * 4)) & 15;
		const v = c == "x" ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
};

export default { uuid };
