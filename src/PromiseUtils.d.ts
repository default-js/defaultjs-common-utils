/**
 * Two ways of building a promise that something outside of it settles.
 */

/** A promise carrying the two functions settling it, plus what happened to it. */
export interface LazyPromise<T = any> extends Promise<T> {
	/**
	 * Settles the promise. An Error rejects it instead of resolving.
	 *
	 * @throws {Error} when the promise has already been settled
	 */
	resolve(result?: T | Error): void;
	/**
	 * Rejects the promise. A reason that is no Error is wrapped into one, no reason at all gets an
	 * Error of its own.
	 *
	 * @throws {Error} when the promise has already been settled
	 */
	reject(reason?: unknown): void;
	/** whatever the promise was settled with - the result after a resolve, the reason after a reject */
	readonly value: any;
	/** tells a failure from a success */
	readonly error: boolean;
	/** the promise has been settled. Says nothing about the outcome. */
	readonly resolved: boolean;
}

/** A promise that can be canceled, along with every promise derived from it. */
export interface CancelablePromise<T = any> extends Promise<T> {
	/** Cancels the promise, rejecting it with an AbortError. Does nothing once it has settled. */
	cancel(reason?: unknown): void;
	/** the signal of the promise, aborted by cancel */
	readonly signal: AbortSignal;
	readonly canceled: boolean;

	then<TResult1 = T, TResult2 = never>(
		onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
		onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
	): CancelablePromise<TResult1 | TResult2>;
	catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null): CancelablePromise<T | TResult>;
	finally(onfinally?: (() => void) | null): CancelablePromise<T>;
}

/**
 * Calls a function once a timeout has passed and settles with whatever it produces. An exception
 * thrown by the function rejects the promise.
 */
export function timeoutPromise<T = any>(
	fn: (resolve: (value: T) => void, reject: (reason?: unknown) => void, signal: AbortSignal) => void,
	ms: number,
): CancelablePromise<T>;

/** Builds a promise together with the two functions settling it. */
export function lazyPromise<T = any>(): LazyPromise<T>;

declare const PromiseUtils: {
	lazyPromise: typeof lazyPromise;
	timeoutPromise: typeof timeoutPromise;
};

export default PromiseUtils;
