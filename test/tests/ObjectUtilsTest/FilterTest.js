import ObjectUtils from "@src/ObjectUtils";

describe("ObjectUtils filter Tests", function() {
	
	beforeAll(() => {});
	
	it("filter window -> name:[], allowed = true -> results in empty object", () => {		
		const filter = ObjectUtils.buildPropertyFilter({names : [], allowed: true});
		const data = ObjectUtils.filter(window, filter);
		
		expect(Object.getOwnPropertyNames(data).length).toBe(0);		
	});
	
	it("filter window -> name: [document, location, XMLHttpRequest, fetch], allowed false", () => {				
		const filter = ObjectUtils.buildPropertyFilter({names : ["document", "location", "XMLHttpRequest", "fetch", "window"], allowed: false});
		const data = ObjectUtils.filter(window, filter, false);
		
		expect(Object.getOwnPropertyNames(data).length > 0).toBe(true);
		expect(data["document"]).toBeUndefined();
		expect(data["location"]).toBeUndefined();
		expect(data["XMLHttpRequest"]).toBeUndefined();
		expect(data["fetch"]).toBeUndefined();	
		expect(data["window"]).toBeUndefined();
	});
	
	
	
	it("filter window -> name: [document, location, XMLHttpRequest, fetch], allowed false, deep filter", () => {
		const test = {
			a : 1,
			b : 2,
			c : 3
		};
		test.d = test;
						
		const filter = ObjectUtils.buildPropertyFilter({names : ["b","c"], allowed: false});	
		const data = ObjectUtils.filter(test, filter, true);
		
		expect(Object.getOwnPropertyNames(data).length > 0).toBe(true);
		expect(data["a"]).toBeDefined();
		expect(data["b"]).toBeUndefined();
		expect(data["c"]).toBeUndefined();
		expect(data["d"]).toBeDefined();	
		expect(data.d).toBe(test);	
	});
	
	afterAll(() => {});
});