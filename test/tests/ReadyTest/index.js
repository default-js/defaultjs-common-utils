import ready from "../../../src/Ready.js";
import {lazyPromise} from "../../../src/PromiseUtils.js";

/**
 * Ready is lazyPromise now and only kept as an entry point of its own, so an existing import keeps
 * working. These specs cover the surface a Ready caller relied on plus the points where lazyPromise
 * behaves differently than the old implementation did - the behaviour in depth belongs to
 * lazyPromise and is covered there.
 */
describe("Ready Tests", () => {
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

	describe("the alias", () => {

		it("- is lazyPromise", () => {
			expect(ready).toBe(lazyPromise);
		});
	});

	describe("the fresh promise", () => {

		it("- is a promise", () => {
			expect(ready() instanceof Promise).toBeTrue();
		});

		it("- carries resolve and reject", () => {
			const promise = ready();

			expect(typeof promise.resolve).toBe("function");
			expect(typeof promise.reject).toBe("function");
		});

		it("- is neither settled nor failed", () => {
			const promise = ready();

			expect(promise.resolved).toBeFalse();
			expect(promise.error).toBeFalse();
		});

		it("- stays pending until it is settled", async () => {
			const result = await settle(ready(), 50);

			expect(result.status).toBe("pending");
		});
	});

	describe("resolve", () => {

		it("- settles the promise", async () => {
			const promise = ready();
			promise.resolve();
			const result = await settle(promise);

			expect(result.status).toBe("resolved");
		});

		it("- sets resolved and leaves error alone", async () => {
			const promise = ready();
			promise.resolve();
			await settle(promise);

			expect(promise.resolved).toBeTrue();
			expect(promise.error).toBeFalse();
		});

		it("- runs a then handler", async () => {
			const promise = ready();

			let ran = false;
			const done = promise.then(() => ran = true);
			promise.resolve();
			await done;

			expect(ran).toBeTrue();
		});

		it("- throws when called twice", async () => {
			const promise = ready();
			promise.resolve();

			expect(() => promise.resolve()).toThrowError(Error);
			expect((await settle(promise)).status).toBe("resolved");
		});
	});

	describe("reject", () => {

		it("- settles the promise as rejected", async () => {
			const promise = ready();
			promise.reject();
			const result = await settle(promise);

			expect(result.status).toBe("rejected");
		});

		it("- sets error", async () => {
			const promise = ready();
			promise.reject();
			await settle(promise);

			expect(promise.error).toBeTrue();
		});

		it("- sets resolved as well", async () => {
			// deliberate - resolved means settled and says nothing about the outcome, error is what
			// tells a failure from a success
			const promise = ready();
			promise.reject();
			await settle(promise);

			expect(promise.resolved).toBeTrue();
		});

		it("- does not run a then handler", async () => {
			const promise = ready();

			let ran = false;
			const done = promise.then(() => ran = true).catch(() => {});
			promise.reject();
			await done;

			expect(ran).toBeFalse();
		});

		it("- throws when called twice", async () => {
			const promise = ready();
			promise.reject();

			expect(() => promise.reject()).toThrowError(Error);
			expect((await settle(promise)).status).toBe("rejected");
		});
	});

	describe("what a Ready caller gains", () => {
		// the old implementation took no argument in either direction and dropped what it got

		it("- resolve carries a value", async () => {
			const promise = ready();
			promise.resolve("value");
			const result = await settle(promise);

			expect(result.value).toBe("value");
			expect(promise.value).toBe("value");
		});

		it("- reject carries a reason", async () => {
			const promise = ready();
			const reason = new Error("test");
			promise.reject(reason);
			const result = await settle(promise);

			expect(result.error).toBe(reason);
		});

		it("- resolve without a value still settles with undefined", async () => {
			const promise = ready();
			promise.resolve();
			const result = await settle(promise);

			expect(result.status).toBe("resolved");
			expect(result.value).toBeUndefined();
		});
	});

	describe("what a Ready caller has to watch out for", () => {

		it("- resolving with an Error rejects instead", async () => {
			// lazyPromise reads an Error as a failure, the old Ready had no such rule. Anything handing
			// an Error to resolve gets a rejected promise now.
			const promise = ready();
			const reason = new Error("test");
			promise.resolve(reason);
			const result = await settle(promise);

			expect(result.status).toBe("rejected");
			expect(result.error).toBe(reason);
			expect(promise.error).toBeTrue();
		});

		it("- the flags cannot be written from outside", () => {
			// the old Ready carried plain properties, so a caller could set them
			const promise = ready();

			expect(() => promise.resolved = true).toThrowError(TypeError);
			expect(() => promise.error = true).toThrowError(TypeError);
			expect(promise.resolved).toBeFalse();
		});

		it("- resolve and reject cannot be replaced", () => {
			const promise = ready();

			expect(() => promise.resolve = () => {}).toThrowError(TypeError);
			expect(() => promise.reject = () => {}).toThrowError(TypeError);
		});

		it("- resolve stays the same function after being called", () => {
			// the old Ready swapped it for a no-op, so holding on to it stopped working
			const promise = ready();
			const before = promise.resolve;
			promise.resolve();

			expect(promise.resolve).toBe(before);
		});

		it("- the flags do not show up in Object.keys or JSON", () => {
			// they used to serialize along with any object carrying a Ready promise
			const promise = ready();

			expect(Object.keys(promise)).toEqual([]);
			expect(JSON.stringify({promise})).toBe(`{"promise":{}}`);
		});
	});

	describe("both called", () => {
		// the old Ready let the second call rewrite the flags, which left them contradicting the
		// promise. A guard settles that now.

		it("- rejecting after resolving throws and changes nothing", async () => {
			const promise = ready();
			promise.resolve();

			expect(() => promise.reject()).toThrowError(Error);
			const result = await settle(promise);

			expect(result.status).toBe("resolved");
			expect(promise.error).toBeFalse();
		});

		it("- resolving after rejecting throws and keeps the rejection", async () => {
			const promise = ready();
			promise.reject();

			expect(() => promise.resolve()).toThrowError(Error);
			const result = await settle(promise);

			expect(result.status).toBe("rejected");
			expect(promise.error).toBeTrue();
		});
	});

	describe("independence", () => {

		it("- two promises do not share their state", async () => {
			const first = ready();
			const second = ready();

			first.resolve();
			await settle(first);

			expect(first.resolved).toBeTrue();
			expect(second.resolved).toBeFalse();
			expect((await settle(second, 50)).status).toBe("pending");
		});
	});
});
