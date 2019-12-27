import ObjectUtils from "@src/ObjectUtils";

describe("ObjectUtils isPojo Tests", function() {
	
	beforeAll(function(done){		
		done();
	});
	
	
	it("isPojo({}) == true", function(done){
		expect(ObjectUtils.isPojo({})).toBe(true);
		done();
	});	
	
	it("isPojo([]) == false", function(done){
		expect(ObjectUtils.isPojo([])).toBe(false);
		done();
	});
	
	it("isPojo(new Map()) == false", function(done){
		expect(ObjectUtils.isPojo(new Map())).toBe(false);
		done();
	});	
	
	
	afterAll(function() {
	});
});