import "../../../src/javascript/Object.js";

describe("Object extension tests:", function () {
	it("isPrimitive()", () => {
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

	it("isObject()", () => {
		expect({ test: "value" }.isObject()).toBe(true);
		expect({ test: "value", fn: () => {} }.isObject()).toBe(true);
		expect(new Array().isObject()).toBe(false);
		expect([].isObject()).toBe(false);
		expect("".isObject()).toBe(false);
	});

	it("isPojo()", () => {
		expect({ test: "value" }.isPojo()).toBe(true);
		expect({ test: "value", fn: () => {} }.isPojo()).toBe(false);
		expect(new Array().isPojo()).toBe(false);
		expect([].isPojo()).toBe(false);
		expect("".isPojo()).toBe(false);
	});

	it("equalPojo() - two empty objects", () => {
		const a = {};
		const b = {};
		expect(a.equalPojo(b)).toBe(true);
	});
	it("equalPojo() - two simple objects", () => {
		const a = { test: "value", array: ["test", 1], hashset: new Set(["test", 1]), map : new Map([["key1","value1"],["key2","value2"]]) };
		const b = { test: "value", array: ["test", 1], hashset: new Set(["test", 1]), map : new Map([["key1","value1"],["key2","value2"]]) };
		expect(a.equalPojo(b)).toBe(true);
	});

	it("equalPojo() - two simple objects -> not equal", () => {
		const a = { test: "value", array: ["test", 1], hashset: new Set(["test", 1]), map : new Map([["key1","value1"],["key1","value1"]]) };
		const b = { test: "value", array: ["test", 1], hashset: new Set(["test", 1]), map : new Map([["key1","value1"],["key2","value2"]]) };
		expect(a.equalPojo(b)).toBe(false);
	});

	it("equalPojo() - two functions", () => {
		const a = () => {};
		const b = a;
		expect(a.equalPojo(b)).toBe(true);
	});

	it("equalPojo() - with Array", () => {
		const a = () => {};
		const b = a;
		expect(a.equalPojo(b)).toBe(true);
	});
});
