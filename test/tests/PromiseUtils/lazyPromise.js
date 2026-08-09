import {lazyPromise} from "../../../src/PromiseUtils.js";

describe("lazyPromise", function() {
	// resolves with the outcome instead of throwing, so a promise staying pending shows up as a
	// failed expectation rather than as a timing out spec
	const settle = (promise, ms = 200) => {
		const pending = new Promise((resolve) => setTimeout(() => resolve({status : "pending"}), ms));
		const outcome = promise.then(
			(value) => ({status : "resolved", value}),
			(error) => ({status : "rejected", error}),
		);

		return Promise.race([outcome, pending]);
	};

	beforeAll(async () => {});

    it("instanceof Promise", async () => {
		const promise = lazyPromise();
        expect(promise instanceof Promise).toBeTrue();
	});
	
	it("resolve", async () => {
		const promise = lazyPromise();
        expect(promise.resolved).toBeFalse();
        promise.resolve("test");
        expect(promise.resolved).toBeTrue();
        expect(promise.error).toBeFalse();
        expect(promise.value).toBe("test");
	});

    it("error", async () => {
		const promise = lazyPromise();
        expect(promise.resolved).toBeFalse();        
        promise.catch(() =>{})
        promise.resolve(new Error("test"));
        expect(promise.resolved).toBeTrue();
        expect(promise.error).toBeTrue();
        expect(promise.value instanceof Error).toBeTrue();
	});

    it("lazyPromise case 1", async () => {
		const promise = lazyPromise();
        let ok = false;
        promise.then(async (value) => ok = value );

        expect(promise.resolved).toBeFalse();
        promise.resolve(true);
        await promise;
        expect(promise.resolved).toBeTrue();
        expect(ok).toBeTrue();
	});

	describe("reject", () => {

		it("rejects with the given reason", async () => {
			const promise = lazyPromise();
			const reason = new Error("test");

			promise.reject(reason);
			const result = await settle(promise);

			expect(result.status).toBe("rejected");
			expect(result.error).toBe(reason);
		});

		it("wraps a reason that is no error", async () => {
			// there is always something to read a message from
			const promise = lazyPromise();

			promise.reject("test");
			const result = await settle(promise);

			expect(result.status).toBe("rejected");
			expect(result.error instanceof Error).toBeTrue();
			expect(result.error.message).toBe("test");
		});

		it("hands an error through unchanged", async () => {
			const promise = lazyPromise();
			const reason = new Error("test");

			promise.reject(reason);
			const result = await settle(promise);

			expect(result.error).toBe(reason);
		});

		it("keeps the type of an error subclass", async () => {
			const promise = lazyPromise();
			const reason = new TypeError("test");

			promise.reject(reason);
			const result = await settle(promise);

			expect(result.error).toBe(reason);
			expect(result.error instanceof TypeError).toBeTrue();
		});

		it("builds an error of its own without a reason", async () => {
			const promise = lazyPromise();

			promise.reject();
			const result = await settle(promise);

			expect(result.error instanceof Error).toBeTrue();
			expect(result.error.message).toBe("Promise rejected with no reason");
		});

		it("builds an error of its own for null", async () => {
			const promise = lazyPromise();

			promise.reject(null);
			const result = await settle(promise);

			expect(result.error.message).toBe("Promise rejected with no reason");
		});

		it("keeps the reason in value", async () => {
			const promise = lazyPromise();

			promise.reject("test");
			await settle(promise);

			expect(promise.value).toBe("test");
		});

		it("is reachable by catch", async () => {
			const promise = lazyPromise();
			const reason = new Error("test");

			let caught = null;
			const done = promise.catch((error) => caught = error);
			promise.reject(reason);
			await done;

			expect(caught).toBe(reason);
		});

		it("marks the promise as settled and failed", async () => {
			const promise = lazyPromise();

			expect(promise.resolved).toBeFalse();
			expect(promise.error).toBeFalse();

			promise.reject(new Error("test"));
			await settle(promise);

			expect(promise.resolved).toBeTrue();
			expect(promise.error).toBeTrue();
		});

		it("does not run a then handler", async () => {
			const promise = lazyPromise();

			let ran = false;
			const done = promise.then(() => ran = true).catch(() => {});
			promise.reject(new Error("test"));
			await done;

			expect(ran).toBeFalse();
		});
	});

	describe("settling twice", () => {
		// a promise settles once, and the three properties have to keep saying the same

		it("- throws on a second resolve", () => {
			const promise = lazyPromise();
			promise.resolve("first");

			expect(() => promise.resolve("second")).toThrowError(Error, "Promise already resolved!");
		});

		it("- throws on a second reject", async () => {
			const promise = lazyPromise();
			promise.catch(() => {});
			promise.reject("first");

			expect(() => promise.reject("second")).toThrowError(Error, "Promise already resolved!");
			await settle(promise);
		});

		it("- throws on a reject after a resolve", () => {
			const promise = lazyPromise();
			promise.resolve("first");

			expect(() => promise.reject("second")).toThrowError(Error, "Promise already resolved!");
		});

		it("- throws on a resolve after a reject", async () => {
			const promise = lazyPromise();
			promise.catch(() => {});
			promise.reject("first");

			expect(() => promise.resolve("second")).toThrowError(Error, "Promise already resolved!");
			await settle(promise);
		});

		it("- keeps the first outcome", async () => {
			const promise = lazyPromise();
			promise.resolve("first");
			try{ promise.reject("second"); }
			catch(error){ /* expected */ }
			const result = await settle(promise);

			expect(result.status).toBe("resolved");
			expect(result.value).toBe("first");
		});

		it("- leaves the properties agreeing with the promise", async () => {
			const promise = lazyPromise();
			promise.resolve("first");
			try{ promise.reject("second"); }
			catch(error){ /* expected */ }
			await settle(promise);

			expect(promise.resolved).toBeTrue();
			expect(promise.error).withContext("a fulfilled promise must not report an error").toBeFalse();
			expect(promise.value).toBe("first");
		});
	});

	describe("resolved", () => {

		it("- means settled, not successful", async () => {
			// deliberate - error is what tells a failure from a success
			const promise = lazyPromise();
			promise.catch(() => {});

			expect(promise.resolved).toBeFalse();
			promise.reject("test");
			await settle(promise);

			expect(promise.resolved).toBeTrue();
			expect(promise.error).toBeTrue();
		});
	});

	afterAll(async () => {});
});