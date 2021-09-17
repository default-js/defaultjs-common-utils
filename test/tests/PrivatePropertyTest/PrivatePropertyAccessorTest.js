import {privatePropertyAccessor} from "../../../src/PrivateProperty";

describe("ObjectUtils privatePropertyAccessor Tests", () => {
	
	beforeAll(() =>{});	
	
	it("private Property at pojo", () => {
        const object = {};

		const accessor = privatePropertyAccessor("test");
		accessor(object, "value");
		const value = accessor(object);


		expect(value).toBe("value");
	});	
    
    it("private Property at class", () => {

		const accessor = privatePropertyAccessor("test");

		const Clazz = class {
			constructor(){
				accessor(this, true);
			}

			doTest(){
				const value = accessor(this);
				expect(value).toBeTrue();
			}
		};

		const test = new Clazz();
		expect(test.hidden).toBeUndefined();
		test.doTest();
	});
	
	
	afterAll(() => {});
});