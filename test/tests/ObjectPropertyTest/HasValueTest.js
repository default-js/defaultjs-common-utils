import ObjectProperty from "../../../src/ObjectProperty.js";
import ObjectUtils from "../../../src/ObjectUtils.js";

describe("ObjectProperty hasValue Tests", () => {

	describe("falsy values count as values", () => {
		// 0, "" and false are data - only undefined means there is nothing. null is a value too, it
		// says explicitly that there is none, which is different from a key never having been set
		const FALSY = [
			{name : "zero", value : 0},
			{name : "empty string", value : ""},
			{name : "false", value : false},
			{name : "NaN", value : NaN},
			{name : "0n", value : 0n},
			{name : "null", value : null},
		];

		for(const {name, value} of FALSY){
			it(`- ${name}`, () => {
				const property = ObjectProperty.load({key : value}, "key");

				expect(property.hasValue).withContext(`hasValue for ${name}`).toBeTrue();
				expect(property.keyDefined).toBeTrue();
			});
		}
	});

	describe("no value", () => {

		it("- undefined", () => {
			const property = ObjectProperty.load({key : undefined}, "key");

			expect(property.hasValue).toBeFalse();
			expect(property.keyDefined).toBeTrue();
		});

		it("- missing key", () => {
			const property = ObjectProperty.load({}, "key");

			expect(property.hasValue).toBeFalse();
			expect(property.keyDefined).toBeFalse();
		});
	});

	describe("append keeps a falsy value", () => {
		// hasValue decides whether append replaces or builds an array, so a falsy value used to be
		// dropped silently here
		it("- zero", () => {
			expect(ObjectUtils.append("key", 2, {key : 0})).toEqual({key : [0, 2]});
		});

		it("- empty string", () => {
			expect(ObjectUtils.append("key", 2, {key : ""})).toEqual({key : ["", 2]});
		});

		it("- false", () => {
			expect(ObjectUtils.append("key", 2, {key : false})).toEqual({key : [false, 2]});
		});

		it("- a truthy value still works", () => {
			expect(ObjectUtils.append("key", 2, {key : 1})).toEqual({key : [1, 2]});
		});

		it("- appends to an existing array", () => {
			expect(ObjectUtils.append("key", 3, {key : [0, 2]})).toEqual({key : [0, 2, 3]});
		});

		it("- appends to null", () => {
			expect(ObjectUtils.append("key", 2, {key : null})).toEqual({key : [null, 2]});
		});

		it("- replaces undefined", () => {
			expect(ObjectUtils.append("key", 2, {key : undefined})).toEqual({key : 2});
		});

		it("- ignores an undefined value", () => {
			expect(ObjectUtils.append("key", undefined, {key : 0})).toEqual({key : 0});
		});
	});

	describe("value", () => {

		it("- reads a falsy value", () => {
			expect(ObjectProperty.load({key : 0}, "key").value).toBe(0);
			expect(ObjectProperty.load({key : ""}, "key").value).toBe("");
			expect(ObjectProperty.load({key : false}, "key").value).toBeFalse();
		});

		it("- writes a falsy value", () => {
			const data = {};
			const property = ObjectProperty.load(data, "key");
			property.value = 0;

			expect(data.key).toBe(0);
			expect(property.hasValue).toBeTrue();
		});
	});
});
