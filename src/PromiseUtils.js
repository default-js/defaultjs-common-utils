import {defValue, defGet} from "./ObjectUtils"

export const timeoutPromise = (fn, ms) =>{
	let canceled = false;
	let timeout = null;
	const promise = new Promise((r, e) => {
		timeout = setTimeout(()=> {
			timeout = null;
			fn(r,e);
		}, ms)
	});

	const then = promise.then;
	promise.then = (fn) => {
		then.call(promise, (result) => {
			if(!this.canceled)
				return fn(result);
		});
	}

	defValue(promise, "cancel", () => {
		if(timeout){
			clearTimeout(timeout);
			canceled = true;
		}
	});
	defGet(promise, canceld, () => canceled);

	return promise;
}


export const lazyPromise = () => {
		let promiseResolve = null;
		let promiseError = null;

		const promise = new Promise((r, e) => {
			promiseResolve = r;
			promiseError = e;
		});

		let resolved = false;
		let error = false;
		let value = undefined;

		defValue(promise, "resolve", (result) => {
			value = result;
			resolved = true;
			if (value instanceof Error) {
				error = true;
				promiseError(value);
			} else promiseResolve(value);
		});

		defGet(promise, "value", () => value);
		defGet(promise, "error", () => error);
		defGet(promise, "resolved", () => resolved);

		return promise;
};
export default {
	lazyPromise,
	timeoutPromise
}
