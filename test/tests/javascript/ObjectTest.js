import "../../../src/javascript/Object.js";

describe("Object extension tests:", function () {
	it("Object.isPrimitive()", () => {
		expect(Object.isPrimitive("test")).toBe(true);
		expect(Object.isPrimitive(0)).toBe(true);
		expect(Object.isPrimitive(0.1)).toBe(true);
		expect(Object.isPrimitive(true)).toBe(true);
		expect(Object.isPrimitive(BigInt("1"))).toBe(true);
		expect(Object.isPrimitive({})).toBe(false);
		expect(Object.isPrimitive([])).toBe(false);
		expect(Object.isPrimitive(new Array())).toBe(false);
		expect(Object.isPrimitive(new Map())).toBe(false);
		expect(Object.isPrimitive(new Set())).toBe(false);
		expect(Object.isPrimitive(new Date())).toBe(false);
	});

	it("Object.isObject()", () => {
		expect(Object.isObject({ test: "value" })).toBe(true);
		expect(Object.isObject({ test: "value", fn: () => {} })).toBe(true);
		expect(Object.isObject(new Array())).toBe(false);
		expect(Object.isObject([])).toBe(false);
		expect(Object.isObject("")).toBe(false);
	});

	it("Object.isPojo()", () => {
		expect(Object.isPojo({ test: "value" })).toBe(true);
		expect(Object.isPojo({ test: "value", fn: () => {} })).toBe(false);
		expect(Object.isPojo(new Array())).toBe(false);
		expect(Object.isPojo([])).toBe(false);
		expect(Object.isPojo("")).toBe(false);
	});

	it("Object.equalPojo() - two empty objects", () => {
		const a = {};
		const b = {};
		expect(Object.equalPojo(a,b)).toBe(true);
	});
	it("Object.equalPojo() - two simple objects", () => {
		const a = { test: "value", array: ["test", 1], hashset: new Set(["test", 1]), map : new Map([["key1","value1"],["key2","value2"]]) };
		const b = { test: "value", array: ["test", 1], hashset: new Set(["test", 1]), map : new Map([["key1","value1"],["key2","value2"]]) };
		expect(Object.equalPojo(a,b)).toBe(true);
	});

	it("Object.equalPojo() - two simple objects -> not equal", () => {
		const a = { test: "value", array: ["test", 1], hashset: new Set(["test", 1]), map : new Map([["key1","value1"],["key1","value1"]]) };
		const b = { test: "value", array: ["test", 1], hashset: new Set(["test", 1]), map : new Map([["key1","value1"],["key2","value2"]]) };
		expect(Object.equalPojo(a,b)).toBe(false);
	});

	it("Object.equalPojo() - two functions", () => {
		const a = () => {};
		const b = a;
		expect(Object.equalPojo(a,b)).toBe(true);
	});

	it("Object.equalPojo() - with Array", () => {
		const a = () => {};
		const b = a;
		expect(Object.equalPojo(a,b)).toBe(true);
	});
});
