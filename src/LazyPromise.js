import {defValue, defGet} from "./ObjectUtils"

class LazyPromise extends Promise {
	constructor() {
		let promiseResolve = null;
		let promiseError = null;
		super((r, e) => {
			promiseResolve = r;
			promiseError = e;
		});

		let resolved = false;
		let error = false;
		let value = undefined;

		defValue(this, "resolve", (result) => {
			value = result;
			resolved = true;
			if (value instanceof Error) {
				error = true;
				promiseError(value);
			} else promiseResolve(value);
		});

		defGet(this, "value", () => value);
		defGet(this, "error", () => error);
		defGet(this, "resolved", () => resolved);
	}
};

new LazyPromise();

export default LazyPromise;
