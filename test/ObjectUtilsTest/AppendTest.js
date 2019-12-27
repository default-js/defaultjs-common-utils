import ObjectUtils from "@src/ObjectUtils";

describe("ObjectUtils append Tests", function() {
	
	beforeAll(function(done){		
		done();
	});
	
	
	it("append new property", function(done){
		const object = {};
		ObjectUtils.append("key", "value", object);
		
		expect(object.key).toBe("value");
		done();
	});	
	
	it("append duplicated property", function(done){
		const object = {
			key : "value1"
		};
		ObjectUtils.append("key", "value2", object);
		
		expect(object.key instanceof Array).toBe(true);
		expect(object.key.length).toBe(2);
		expect(object.key[0]).toBe("value1");
		expect(object.key[1]).toBe("value2");
		done();
	});
	
	it("append new property with undefined value -> it dosnt append propery", function(done){
		const object = {};
		ObjectUtils.append("key", undefined, object);
		
		expect(object.key).toBeUndefined();
		expect(Object.hasOwnProperty("key", object)).toBe(false);
		done();
	});
	
	it("append duplicated property with undefined value -> it dosnt append propery", function(done){
		const object = {
			key : "value1"
		};
		ObjectUtils.append("key", undefined, object);
		
		expect(object.key instanceof Array).toBe(false);
		expect(object.key).toBe("value1");
		done();
	});
	
	
	afterAll(function() {
	});
});