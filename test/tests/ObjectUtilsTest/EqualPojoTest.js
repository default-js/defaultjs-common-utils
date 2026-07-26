import ObjectUtils from "../../../src/ObjectUtils";

const equalPojo = ObjectUtils.equalPojo;

describe("ObjectUtils equalPojo Tests", function() {

	beforeAll(function(done){
		done();
	});


	describe("primitives", function(){

		it("compares equal primitives", function(){
			expect(equalPojo(1, 1)).toBe(true);
			expect(equalPojo("a", "a")).toBe(true);
			expect(equalPojo(true, true)).toBe(true);
			expect(equalPojo(null, null)).toBe(true);
			expect(equalPojo(undefined, undefined)).toBe(true);
			expect(equalPojo(10n, 10n)).toBe(true);
		});

		it("compares different primitives", function(){
			expect(equalPojo(1, 2)).toBe(false);
			expect(equalPojo("a", "b")).toBe(false);
			expect(equalPojo(true, false)).toBe(false);
			expect(equalPojo(null, undefined)).toBe(false);
			expect(equalPojo(1, "1")).toBe(false);
			expect(equalPojo(0, null)).toBe(false);
		});

		it("compares a primitive against an object", function(){
			expect(equalPojo(1, {})).toBe(false);
			expect(equalPojo({}, 1)).toBe(false);
			expect(equalPojo(null, {})).toBe(false);
			expect(equalPojo("a", ["a"])).toBe(false);
		});
	});


	describe("simple objects", function(){

		it("compares flat objects", function(){
			expect(equalPojo({a : 1, b : "x"}, {a : 1, b : "x"})).toBe(true);
			expect(equalPojo({a : 1}, {a : 2})).toBe(false);
			expect(equalPojo({a : 1}, {a : 1, b : 2})).toBe(false);
		});

		it("compares nested objects", function(){
			expect(equalPojo({a : {b : {c : 1}}}, {a : {b : {c : 1}}})).toBe(true);
			expect(equalPojo({a : {b : {c : 1}}}, {a : {b : {c : 2}}})).toBe(false);
		});

		it("does not accept a different key set of the same size", function(){
			expect(equalPojo({x : 1, y : undefined}, {x : 1, z : undefined})).toBe(false);
			expect(equalPojo({x : 1, y : 2}, {x : 1, z : 2})).toBe(false);
		});

		it("compares an object without prototype", function(){
			const a = Object.create(null);
			const b = Object.create(null);
			a.value = 1;
			b.value = 1;

			expect(equalPojo(a, b)).toBe(true);
			expect(equalPojo(a, {value : 1})).toBe(false);
		});

		it("ignores non enumerable properties", function(){
			const a = {value : 1};
			Object.defineProperty(a, "hidden", {value : "a", enumerable : false});

			expect(equalPojo(a, {value : 1})).toBe(true);
		});
	});


	describe("Array", function(){

		it("compares arrays by position", function(){
			expect(equalPojo([1, 2, 3], [1, 2, 3])).toBe(true);
			expect(equalPojo([1, 2, 3], [3, 2, 1])).toBe(false);
			expect(equalPojo([], [])).toBe(true);
		});

		it("compares arrays of different length", function(){
			expect(equalPojo([1, 2], [1, 2, 3])).toBe(false);
			expect(equalPojo([1, 2, 3], [1, 2])).toBe(false);
			expect(equalPojo([], [1])).toBe(false);
		});

		it("compares arrays holding objects", function(){
			expect(equalPojo([{id : 1}, {id : 2}], [{id : 1}, {id : 2}])).toBe(true);
			expect(equalPojo([{id : 1}], [{id : 9}])).toBe(false);
		});

		it("does not accept an object looking like an array", function(){
			expect(equalPojo([1, 2], {0 : 1, 1 : 2})).toBe(false);
		});
	});


	describe("Set", function(){

		it("compares sets regardless of order", function(){
			expect(equalPojo(new Set([1, 2, 3]), new Set([3, 1, 2]))).toBe(true);
			expect(equalPojo(new Set(), new Set())).toBe(true);
		});

		it("compares sets by content", function(){
			expect(equalPojo(new Set([1]), new Set([2]))).toBe(false);
			expect(equalPojo(new Set([1, 2]), new Set([1, 3]))).toBe(false);
		});

		it("compares sets of different size", function(){
			expect(equalPojo(new Set([1]), new Set([1, 2]))).toBe(false);
			expect(equalPojo(new Set([1, 2, 3]), new Set())).toBe(false);
		});

		it("compares sets holding objects", function(){
			expect(equalPojo(new Set([{id : 1}]), new Set([{id : 1}]))).toBe(true);
			expect(equalPojo(new Set([{id : 1}]), new Set([{id : 9}]))).toBe(false);
			expect(equalPojo(new Set([{id : 1}, {id : 2}]), new Set([{id : 2}, {id : 1}]))).toBe(true);
		});

		it("does not accept an array against a set", function(){
			expect(equalPojo([1, 2], new Set([1, 2]))).toBe(false);
		});
	});


	describe("Map", function(){

		it("compares maps regardless of order", function(){
			expect(equalPojo(new Map([["a", 1], ["b", 2]]), new Map([["b", 2], ["a", 1]]))).toBe(true);
			expect(equalPojo(new Map(), new Map())).toBe(true);
		});

		it("compares maps by value", function(){
			expect(equalPojo(new Map([["a", 1]]), new Map([["a", 2]]))).toBe(false);
		});

		it("compares maps by key", function(){
			expect(equalPojo(new Map([["a", 1]]), new Map([["b", 1]]))).toBe(false);
		});

		it("compares maps of different size", function(){
			expect(equalPojo(new Map([["a", 1]]), new Map([["a", 1], ["b", 2]]))).toBe(false);
			expect(equalPojo(new Map([["a", 1], ["b", 2]]), new Map([["a", 1]]))).toBe(false);
		});

		it("compares maps holding objects", function(){
			expect(equalPojo(new Map([["a", {id : 1}]]), new Map([["a", {id : 1}]]))).toBe(true);
			expect(equalPojo(new Map([["a", {id : 1}]]), new Map([["a", {id : 9}]]))).toBe(false);
		});

		it("compares maps using objects as keys", function(){
			expect(equalPojo(new Map([[{id : 1}, "x"]]), new Map([[{id : 1}, "x"]]))).toBe(true);
			expect(equalPojo(new Map([[{id : 1}, "x"]]), new Map([[{id : 9}, "x"]]))).toBe(false);
		});
	});


	describe("Date and RegExp", function(){

		it("compares dates by time", function(){
			expect(equalPojo(new Date("2020-01-01"), new Date("2020-01-01"))).toBe(true);
			expect(equalPojo(new Date("2020-01-01"), new Date("1999-01-01"))).toBe(false);
		});

		it("compares invalid dates", function(){
			expect(equalPojo(new Date("nonsense"), new Date("nonsense"))).toBe(true);
			expect(equalPojo(new Date("nonsense"), new Date("2020-01-01"))).toBe(false);
		});

		it("compares regular expressions by source and flags", function(){
			expect(equalPojo(/abc/gi, /abc/gi)).toBe(true);
			expect(equalPojo(/abc/g, /abc/i)).toBe(false);
			expect(equalPojo(/abc/g, /xyz/g)).toBe(false);
		});

		it("does not accept a date against another type", function(){
			expect(equalPojo(new Date("2020-01-01"), {})).toBe(false);
			expect(equalPojo(new Date(0), 0)).toBe(false);
		});
	});


	describe("objects out of reach", function(){

		it("compares class instances by prototype and own properties", function(){
			const Class = class {
				constructor(value){ this.value = value; }
			};
			const Other = class {
				constructor(value){ this.value = value; }
			};

			expect(equalPojo(new Class(1), new Class(1))).toBe(true);
			expect(equalPojo(new Class(1), new Class(2))).toBe(false);
			expect(equalPojo(new Class(1), new Other(1))).toBe(false);
			expect(equalPojo(new Class(1), {value : 1})).toBe(false);
		});

		it("compares errors and promises by identity", function(){
			const error = new Error("a");
			const promise = Promise.resolve(1);

			expect(equalPojo(error, error)).toBe(true);
			expect(equalPojo(new Error("a"), new Error("a"))).toBe(false);
			expect(equalPojo(promise, promise)).toBe(true);
			expect(equalPojo(Promise.resolve(1), Promise.resolve(1))).toBe(false);
		});

		it("compares functions and symbols by identity", function(){
			const fn = () => {};
			const symbol = Symbol("s");

			expect(equalPojo(fn, fn)).toBe(true);
			expect(equalPojo(() => {}, () => {})).toBe(false);
			expect(equalPojo(symbol, symbol)).toBe(true);
			expect(equalPojo(Symbol("s"), Symbol("s"))).toBe(false);
		});
	});


	describe("cyclic structures", function(){

		it("compares objects referencing themselves", function(){
			const a = {value : 1};
			a.self = a;
			const b = {value : 1};
			b.self = b;

			expect(equalPojo(a, b)).toBe(true);
		});

		it("compares cyclic objects differing in a value", function(){
			const a = {value : 1};
			a.self = a;
			const b = {value : 2};
			b.self = b;

			expect(equalPojo(a, b)).toBe(false);
		});

		it("compares cycles running through an array", function(){
			const a = {value : 1};
			a.list = [a];
			const b = {value : 1};
			b.list = [b];

			expect(equalPojo(a, b)).toBe(true);
		});

		it("compares cycles running through a map and a set", function(){
			const a = {value : 1};
			a.map = new Map([["self", a]]);
			a.set = new Set([a]);
			const b = {value : 1};
			b.map = new Map([["self", b]]);
			b.set = new Set([b]);

			expect(equalPojo(a, b)).toBe(true);
		});
	});


	afterAll(function() {
	});
});
