import ObjectUtils from "../../../src/ObjectUtils.js";

describe("ObjectUtils merge Tests", function() {
	
	beforeAll(function(done){		
		done();
	});
	
	
	it("merge object B into object A", function(done){
		const A = {
			A1 : "A1",
			A2 : "A2",
			A3 : "A3",
			A4 : null,
			A5 : undefined
		};
		
		const B = {
			B1 : "B1",
			B2 : "B2",
			B3 : "B3"
		};
		
		const result = ObjectUtils.merge(A, B);
		
		expect(result).toBeDefined();
		expect(result).toEqual(A);
		expect(result).toBe(A);
		
		expect(result.A1).toBe("A1");
		expect(result.A2).toBe("A2");
		expect(result.A3).toBe("A3");
		expect(result.A4).toBe(null);
		expect(result.A5).toBe(undefined);
		
		expect(result.B1).toBe("B1");
		expect(result.B2).toBe("B2");
		expect(result.B3).toBe("B3");
		done();
	});
	
	
	it("merge object B and object C into object A", function(done){
		const A = {
			A1 : "A1",
			A2 : "A2",
			A3 : "A3"
		};
		
		const B = {
			B1 : "B1",
			B2 : "B2",
			B3 : "B3"
		};
		
		const C = {
			C1 : "C1",
			C2 : "C2",
			C3 : "C3"
		};
		
		const result = ObjectUtils.merge(A, B, C);
		
		expect(result).toBeDefined();
		expect(result).toEqual(A);
		expect(result).toBe(A);
		
		expect(result.A1).toBe("A1");
		expect(result.A2).toBe("A2");
		expect(result.A3).toBe("A3");
		
		expect(result.B1).toBe("B1");
		expect(result.B2).toBe("B2");
		expect(result.B3).toBe("B3");

		expect(result.C1).toBe("C1");
		expect(result.C2).toBe("C2");
		expect(result.C3).toBe("C3");
		
		done();
	});
	
	it("merge object B with object into object A", function(done){
		const A = {
			A1 : "A1",
			A2 : "A2",
			A3 : "A3"
		};
		
		const B = {
			B1 : "B1",
			B2 : "B2",
			B3 : "B3",
			sub : {
				C1 : "C1",
				C2 : "C2",
				C3 : "C3"
			}
		};
		
		const result = ObjectUtils.merge(A, B);
		
		expect(result).toBeDefined();
		expect(result).toEqual(A);
		expect(result).toBe(A);
		
		expect(result.A1).toBe("A1");
		expect(result.A2).toBe("A2");
		expect(result.A3).toBe("A3");
		
		expect(result.B1).toBe("B1");
		expect(result.B2).toBe("B2");
		expect(result.B3).toBe("B3");

		expect(result.sub.C1).toBe("C1");
		expect(result.sub.C2).toBe("C2");
		expect(result.sub.C3).toBe("C3");
		
		done();
	});
	
	it("merge object B into object A, B has the same properties as A", function(done){
		const A = {
			A1 : "A1",
			A2 : "A2",
			A3 : "A3"
		};
		
		const B = {
			A1 : "A-B1",
			A2 : "A-B2",
			A3 : "A-B3",
			B1 : "B1",
			B2 : "B2",
			B3 : "B3",
		};
		
		const result = ObjectUtils.merge(A, B);
		
		expect(result).toBeDefined();
		expect(result).toEqual(A);
		expect(result).toBe(A);
		
		expect(result.A1).toBe("A-B1");
		expect(result.A2).toBe("A-B2");
		expect(result.A3).toBe("A-B3");
		
		expect(result.B1).toBe("B1");
		expect(result.B2).toBe("B2");
		expect(result.B3).toBe("B3");		
		done();
	});

	it("merge null into object A", async () => {
		const A = {
			A1 : "A1",
			A2 : "A2",
			A3 : "A3",
			A4 : null,
			A5 : undefined
		};


		const result = ObjectUtils.merge(A, null);

	});

	it("merge does not pollute the prototype", function(){
		const source = JSON.parse('{"__proto__":{"pwned":"yes"}}');
		const result = ObjectUtils.merge({}, source);

		expect({}.pwned).toBeUndefined();
		expect(result.pwned).toBeUndefined();
		expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
	});

	it("merge steps into a sub object instead of replacing it", function(){
		const A = {sub : {A1 : "A1", A2 : "A2"}};
		const B = {sub : {A2 : "B2", B1 : "B1"}};

		const result = ObjectUtils.merge(A, B);

		expect(result.sub.A1).toBe("A1");
		expect(result.sub.A2).toBe("B2");
		expect(result.sub.B1).toBe("B1");
	});

	it("merge replaces a sub object by a plain value", function(){
		const A = {sub : {A1 : "A1"}};
		const B = {sub : "text"};

		const result = ObjectUtils.merge(A, B);

		expect(result.sub).toBe("text");
	});

	it("merge replaces arrays instead of merging them", function(){
		const A = {list : [1, 2, 3]};
		const B = {list : [9]};

		const result = ObjectUtils.merge(A, B);

		expect(result.list).toEqual([9]);
	});

	it("merge keeps sources carrying functions", function(){
		const fn = () => {};
		const result = ObjectUtils.merge({}, {name : "x", callback : fn});

		expect(result.name).toBe("x");
		expect(result.callback).toBe(fn);
	});

	it("merge copies own enumerable properties only", function(){
		const symbol = Symbol("s");
		const source = {visible : 1, [symbol] : 2};
		Object.defineProperty(source, "hidden", {value : 3, enumerable : false});

		const result = ObjectUtils.merge({}, source);

		expect(result.visible).toBe(1);
		expect(result[symbol]).toBe(2);
		expect(result.hidden).toBeUndefined();
	});

	it("merge skips a property holding a symbol", function(){
		const symbol = Symbol("s");

		// symbol on the source side is not taken over
		expect(ObjectUtils.merge({}, {value : symbol}).value).toBeUndefined();

		// symbol on the target side is not overwritten
		expect(ObjectUtils.merge({value : symbol}, {value : 99}).value).toBe(symbol);
	});

	afterAll(function() {
	});
});