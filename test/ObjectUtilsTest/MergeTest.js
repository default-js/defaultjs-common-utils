import ObjectUtils from "@src/ObjectUtils";

describe("ObjectUtils merge Tests", function() {
	
	beforeAll(function(done){		
		done();
	});
	
	
	it("merge object B into object A", function(done){
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
	
	afterAll(function() {
	});
});