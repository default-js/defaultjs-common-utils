import ObjectProperty from "../../../src/ObjectProperty.js";

/**
 * Covers the append setter and the keyDefined getter of ObjectProperty. The falsy values are covered
 * by HasValueTest, this one is about what append builds and how keyDefined differs from hasValue.
 */
describe("ObjectProperty append Tests", () => {

	describe("append", () => {

		it("- takes the value when there is none", () => {
			const data = {};
			ObjectProperty.load(data, "key").append = 1;

			expect(data).toEqual({key : 1});
		});

		it("- builds an array from the second value", () => {
			const data = {key : 1};
			ObjectProperty.load(data, "key").append = 2;

			expect(data).toEqual({key : [1, 2]});
		});

		it("- pushes onto an existing array", () => {
			const data = {key : [1, 2]};
			ObjectProperty.load(data, "key").append = 3;

			expect(data).toEqual({key : [1, 2, 3]});
		});

		it("- keeps pushing onto the array it built", () => {
			const data = {key : 1};
			const property = ObjectProperty.load(data, "key");
			property.append = 2;
			property.append = 3;

			expect(data).toEqual({key : [1, 2, 3]});
		});

		it("- appends into a nested path", () => {
			const data = {};
			ObjectProperty.load(data, "key1.key2").append = 1;
			ObjectProperty.load(data, "key1.key2").append = 2;

			expect(data).toEqual({key1 : {key2 : [1, 2]}});
		});

		it("- replaces undefined", () => {
			const data = {key : undefined};
			ObjectProperty.load(data, "key").append = 1;

			expect(data).toEqual({key : 1});
		});

		it("- appends to null", () => {
			// null is a value, so it takes part in the array
			const data = {key : null};
			ObjectProperty.load(data, "key").append = 1;

			expect(data).toEqual({key : [null, 1]});
		});

		it("- appends an undefined value", () => {
			// the setter does not judge the value - it only decides between setting, wrapping into an
			// array and pushing. Dropping an undefined value is the job of ObjectUtils.append.
			const data = {key : 1};
			ObjectProperty.load(data, "key").append = undefined;

			expect(data.key).toEqual([1, undefined]);
		});

		it("- appends an array as one entry", () => {
			const data = {key : 1};
			ObjectProperty.load(data, "key").append = [2, 3];

			expect(data).toEqual({key : [1, [2, 3]]});
		});
	});

	describe("keyDefined", () => {

		it("- is true for a key holding undefined", () => {
			// the difference to hasValue - the key exists, it just has no value
			const property = ObjectProperty.load({key : undefined}, "key");

			expect(property.keyDefined).toBeTrue();
			expect(property.hasValue).toBeFalse();
		});

		it("- is false for a missing key", () => {
			const property = ObjectProperty.load({}, "key");

			expect(property.keyDefined).toBeFalse();
			expect(property.hasValue).toBeFalse();
		});

		it("- is true for an inherited property", () => {
			// deliberate - keyDefined answers for the whole prototype chain, because a path is allowed
			// to address a prototype. hasValue is the one asking whether something is stored.
			const property = ObjectProperty.load({}, "toString");

			expect(property.keyDefined).toBeTrue();
			expect(property.hasValue).toBeTrue();
		});
	});

	describe("value", () => {

		it("- writes into a missing key", () => {
			const data = {};
			ObjectProperty.load(data, "key").value = "written";

			expect(data).toEqual({key : "written"});
		});

		it("- overwrites an existing value", () => {
			const data = {key : "old"};
			ObjectProperty.load(data, "key").value = "written";

			expect(data).toEqual({key : "written"});
		});
	});

	describe("remove", () => {

		it("- removes a nested key and keeps its siblings", () => {
			const data = {key1 : {key2 : 1, key3 : 2}};
			ObjectProperty.load(data, "key1.key2").remove();

			expect(data).toEqual({key1 : {key3 : 2}});
		});

		it("- does nothing for a missing key", () => {
			const data = {key1 : 1};
			ObjectProperty.load(data, "key2").remove();

			expect(data).toEqual({key1 : 1});
		});

		it("- leaves the key undefined afterwards", () => {
			const data = {key : 1};
			const property = ObjectProperty.load(data, "key");
			property.remove();

			expect(property.keyDefined).toBeFalse();
			expect(property.hasValue).toBeFalse();
		});
	});
});
