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
export const privateStore = (obj) => {
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
export const privateProperty = function(obj, name, value) {
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
export const privatePropertyAccessor = (varname) => {
	return function(self, value){
		if(arguments.length == 2)
			privateProperty(self, varname, value);
		else
			return privateProperty(self, varname);
	};
};

export default {privateProperty, privatePropertyAccessor, privateStore};
