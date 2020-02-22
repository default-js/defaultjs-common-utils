import "../../browser.js";

describe("Browser export Tests", function() {
	
	beforeAll(function(done){		
		done();
	});
	
	
	it("ObjectUtils available", function(done){
		
		expect(defaultjs.common.utils.ObjectUtils).toBeDefined();
		expect(window.defaultjs.common.utils.ObjectUtils).toBeDefined();
		
		//test if functions available
		expect(typeof defaultjs.common.utils.ObjectUtils.isPojo === "function").toBe(true);
		expect(typeof defaultjs.common.utils.ObjectUtils.append === "function").toBe(true);
		expect(typeof defaultjs.common.utils.ObjectUtils.merge === "function").toBe(true);
		
		done();
	});
	

	afterAll(function() {
	});
});