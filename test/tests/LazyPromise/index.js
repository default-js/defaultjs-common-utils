import LazyPromise from "@src/LazyPromise";

describe("LazyPromise", function() {
	
	beforeAll(async () => {});
	
    it("instanceof Promise", async () => {
		const promise = new LazyPromise();
        expect(promise instanceof Promise).toBeTrue();
	});
	
	it("resolve", async () => {
		const promise = new LazyPromise();
        expect(promise.resolved).toBeFalse();
        promise.resolve("test");
        expect(promise.resolved).toBeTrue();
        expect(promise.error).toBeFalse();
        expect(promise.value).toBe("test");
	});

    it("error", async () => {
		const promise = new LazyPromise();
        expect(promise.resolved).toBeFalse();
        promise.resolve(new Error("test"));
        expect(promise.resolved).toBeTrue();
        expect(promise.error).toBeTrue();
        expect(promise.value instanceof Error).toBeTrue();
	});
	

	afterAll(async () => {});
});