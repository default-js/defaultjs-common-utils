import {timeoutPromise} from "../../../src/PromiseUtils.js";

const TIMEOUT = 20;
// long enough that the timeout never fires on its own during a cancel test
const NEVER = 5000;

// resolves either with the outcome of the promise or with the marker, so a promise that stays
// pending shows up as a failed expectation instead of a timing out spec
const settle = (promise, ms = 200) => {
	const pending = new Promise((resolve) => setTimeout(() => resolve({status : "pending"}), ms));
	const outcome = promise.then(
		(value) => ({status : "resolved", value}),
		(error) => ({status : "rejected", error}),
	);

	return Promise.race([outcome, pending]);
};

describe("timeoutPromise", function() {

	it("instanceof Promise", async () => {
		const promise = timeoutPromise((resolve) => resolve(), TIMEOUT);
		expect(promise instanceof Promise).toBeTrue();
		await promise;
	});

	it("calls the function after the timeout", async () => {
		let called = false;
		const promise = timeoutPromise((resolve) => {
			called = true;
			resolve("test");
		}, TIMEOUT);

		expect(called).toBeFalse();
		expect(await promise).toBe("test");
		expect(called).toBeTrue();
	});

	it("passes the signal to the function", async () => {
		let received = null;
		const promise = timeoutPromise((resolve, reject, signal) => {
			received = signal;
			resolve();
		}, TIMEOUT);

		await promise;
		expect(received).toBe(promise.signal);
	});

	describe("rejection", function() {

		it("is reachable by catch", async () => {
			const promise = timeoutPromise((resolve, reject) => reject(new Error("test")), TIMEOUT);

			let caught = null;
			await promise.catch((error) => caught = error);
			expect(caught instanceof Error).toBeTrue();
			expect(caught.message).toBe("test");
		});

		it("is reachable by await", async () => {
			const promise = timeoutPromise((resolve, reject) => reject(new Error("test")), TIMEOUT);
			const result = await settle(promise);

			expect(result.status).toBe("rejected");
			expect(result.error.message).toBe("test");
		});

		it("catches an exception thrown by the function", async () => {
			const promise = timeoutPromise(() => { throw new Error("test"); }, TIMEOUT);
			const result = await settle(promise);

			expect(result.status).toBe("rejected");
			expect(result.error.message).toBe("test");
		});
	});

	describe("chaining", function() {

		it("then returns a promise", async () => {
			const promise = timeoutPromise((resolve) => resolve(1), TIMEOUT);
			const chained = promise.then((value) => value + 1).then((value) => value * 10);

			expect(chained instanceof Promise).toBeTrue();
			expect(await chained).toBe(20);
		});

		it("finally runs", async () => {
			const promise = timeoutPromise((resolve) => resolve(1), TIMEOUT);

			let ran = false;
			await promise.finally(() => ran = true);
			expect(ran).toBeTrue();
		});
	});

	describe("cancel", function() {

		it("rejects with an AbortError", async () => {
			const promise = timeoutPromise((resolve) => resolve("test"), NEVER);
			promise.cancel();
			const result = await settle(promise);

			expect(result.status).toBe("rejected");
			expect(result.error.name).toBe("AbortError");
			expect(promise.canceled).toBeTrue();
		});

		it("rejects with a given reason", async () => {
			const promise = timeoutPromise((resolve) => resolve("test"), NEVER);
			promise.cancel(new Error("test"));
			const result = await settle(promise);

			expect(result.status).toBe("rejected");
			expect(result.error.message).toBe("test");
		});

		it("aborts the whole chain", async () => {
			const promise = timeoutPromise((resolve) => resolve("test"), NEVER);

			let ran = false;
			const chain = promise.then(() => ran = true).then(() => ran = true);
			promise.cancel();
			const result = await settle(chain);

			expect(result.status).toBe("rejected");
			expect(result.error.name).toBe("AbortError");
			expect(ran).toBeFalse();
		});

		it("works from a derived promise", async () => {
			const promise = timeoutPromise((resolve) => resolve("test"), NEVER);
			const chain = promise.then((value) => value);

			expect(typeof chain.cancel).toBe("function");
			chain.cancel();
			const result = await settle(chain);

			expect(result.status).toBe("rejected");
			expect(result.error.name).toBe("AbortError");
			expect(promise.canceled).toBeTrue();
			await settle(promise);
		});

		it("aborts the signal", async () => {
			const promise = timeoutPromise((resolve) => resolve("test"), NEVER);

			let aborted = false;
			promise.signal.addEventListener("abort", () => aborted = true);
			promise.cancel();
			await settle(promise);

			expect(aborted).toBeTrue();
			expect(promise.signal.aborted).toBeTrue();
		});

		it("is ignored once the promise has settled", async () => {
			const promise = timeoutPromise((resolve) => resolve("test"), TIMEOUT);
			await promise;

			promise.cancel();
			const result = await settle(promise);

			expect(result.status).toBe("resolved");
			expect(result.value).toBe("test");
			expect(promise.canceled).toBeFalse();
		});
	});
});
