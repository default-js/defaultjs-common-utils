import ObjectUtils from "../../../src/ObjectUtils";

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

	it("isPojo(<no object>) == false", function(){
		expect(ObjectUtils.isPojo(null)).toBe(false);
		expect(ObjectUtils.isPojo(undefined)).toBe(false);
		expect(ObjectUtils.isPojo("text")).toBe(false);
		expect(ObjectUtils.isPojo(42)).toBe(false);
		expect(ObjectUtils.isPojo(() => {})).toBe(false);
	});

	it("isPojo(<object without prototype>) == true", function(){
		expect(ObjectUtils.isPojo(Object.create(null))).toBe(true);
	});

	it("isPojo(<object with constructor property>) == true", function(){
		expect(ObjectUtils.isPojo({constructor : "foo"})).toBe(true);
		expect(ObjectUtils.isPojo(JSON.parse('{"constructor":1}'))).toBe(true);
	});

	it("isPojo(<nested data>) == true", function(){
		expect(ObjectUtils.isPojo({a : 1, b : "x", c : null, d : undefined})).toBe(true);
		expect(ObjectUtils.isPojo({a : {b : [1, 2, {c : 3}]}})).toBe(true);
	});

	it("isPojo(<data carrying build-ins>) == true", function(){
		expect(ObjectUtils.isPojo({value : new Date()})).toBe(true);
		expect(ObjectUtils.isPojo({value : /x/})).toBe(true);
		expect(ObjectUtils.isPojo({value : new Map([["a", 1]])})).toBe(true);
		expect(ObjectUtils.isPojo({value : new Set([1, 2])})).toBe(true);
		expect(ObjectUtils.isPojo({value : [new Date(), /y/, new Map()]})).toBe(true);
	});

	it("isPojo(<function at any depth>) == false", function(){
		const fn = () => {};

		expect(ObjectUtils.isPojo({value : fn})).toBe(false);
		expect(ObjectUtils.isPojo({a : {b : {c : fn}}})).toBe(false);
		expect(ObjectUtils.isPojo({tags : ["a", fn]})).toBe(false);
		expect(ObjectUtils.isPojo({nested : [[[fn]]]})).toBe(false);
	});

	it("isPojo(<function inside Map or Set>) == false", function(){
		const fn = () => {};

		expect(ObjectUtils.isPojo({value : new Map([["a", fn]])})).toBe(false);
		expect(ObjectUtils.isPojo({value : new Set([fn])})).toBe(false);
	});

	it("isPojo(<class instance at any depth>) == false", function(){
		const Class = class {
			constructor(){}
		};

		expect(ObjectUtils.isPojo({value : new Class()})).toBe(false);
		expect(ObjectUtils.isPojo({a : {b : new Class()}})).toBe(false);
	});

	it("isPojo(<cyclic data>) == true", function(){
		const data = {a : 1};
		data.self = data;

		expect(ObjectUtils.isPojo(data)).toBe(true);
	});

	it("isPojo(<cyclic data through an array>) == true", function(){
		const data = {a : 1};
		data.list = [data];

		const list = [];
		list.push(list);

		expect(ObjectUtils.isPojo(data)).toBe(true);
		expect(ObjectUtils.isPojo({list : list})).toBe(true);
	});

	it("isPojo(<cyclic data through a Map or Set>) == true", function(){
		const viaMap = {a : 1};
		viaMap.map = new Map([["self", viaMap]]);

		const viaSet = {a : 1};
		viaSet.set = new Set([viaSet]);

		expect(ObjectUtils.isPojo(viaMap)).toBe(true);
		expect(ObjectUtils.isPojo(viaSet)).toBe(true);
	});

	it("isPojo(<cyclic data with function>) == false", function(){
		const data = {a : 1, value : () => {}};
		data.self = data;

		expect(ObjectUtils.isPojo(data)).toBe(false);
	});


	afterAll(function() {
	});
});