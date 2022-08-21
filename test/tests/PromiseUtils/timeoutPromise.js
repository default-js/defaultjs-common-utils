import {lazyPromise} from "../../../src/PromiseUtils";

describe("timeoutPromise", function() {
	
	beforeAll(async () => {});
	
    it("instanceof Promise", async () => {
		const promise = timeoutPromise();
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

	afterAll(async () => {});
});