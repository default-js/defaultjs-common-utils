import {privateProperty} from "../../../src/PrivateProperty";

describe("ObjectUtils privateProperty Tests", () => {
	
	beforeAll(() =>{});	
	
	it("private Property at pojo", () => {
        const object = {};
		privateProperty(object, "test", "value");
		const value = privateProperty(object, "test");
		expect(value).toBe("value");
	});	
    
    it("private Property at class", () => {
		const Clazz = class {
			constructor(){
				privateProperty(this, "test", true);
			}

			doTest(){
				const value = privateProperty(this, "test");
				expect(value).toBeTrue();
			}
		};

		const test = new Clazz();
		expect(test.hidden).toBeUndefined();
		test.doTest();
	});
	
	
	afterAll(() => {});
});