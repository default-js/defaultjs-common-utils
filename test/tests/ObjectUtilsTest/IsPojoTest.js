import ObjectUtils from "@src/ObjectUtils";

describe("ObjectUtils isPojo Tests", function() {
	
	beforeAll(function(done){		
		done();
	});
	
	
	
	
	it("isPojo({}) == true", function(){
		expect(ObjectUtils.isPojo({})).toBe(true);
	});	
	
	it("isPojo([]) == false", function(){
		expect(ObjectUtils.isPojo([])).toBe(false);
	});
	
	it("isPojo(new Map()) == false", function(){
		expect(ObjectUtils.isPojo(new Map())).toBe(false);
	});	
	
	it("isPojo(new Class()) == false", function(){
		const Class = class {
			constructor(){}
		};
		
		expect(ObjectUtils.isPojo(new Class())).toBe(false);
	});	
	
	
	afterAll(function() {
	});
});