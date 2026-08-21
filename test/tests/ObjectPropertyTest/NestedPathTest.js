import ObjectProperty from "../../../src/ObjectProperty.js";

/**
 * Covers the dotted path of ObjectProperty.load - what it creates on the way, what it refuses to
 * create and what happens when a step of the path is not an object.
 */
describe("ObjectProperty nested path Tests", () => {

	describe("creating the path", () => {

		it("- creates a missing step", () => {
			const data = {};
			const property = ObjectProperty.load(data, "key1.key2");

			expect(data).toEqual({key1 : {}});
			expect(property.key).toBe("key2");
			expect(property.hasValue).toBeFalse();
		});

		it("- creates every missing step of a deep path", () => {
			const data = {};
			ObjectProperty.load(data, "key1.key2.key3");

			expect(data).toEqual({key1 : {key2 : {}}});
		});

		it("- keeps an existing step", () => {
			const data = {key1 : {existing : "value"}};
			ObjectProperty.load(data, "key1.key2").value = "written";

			expect(data).toEqual({key1 : {existing : "value", key2 : "written"}});
		});

		it("- returns null for a missing step with create=false", () => {
			expect(ObjectProperty.load({}, "key1.key2", false)).toBeNull();
		});

		it("- replaces a step holding null", () => {
			// null says there is nothing here, so it is treated like a missing step and gets created
			const data = {key1 : null};
			const property = ObjectProperty.load(data, "key1.key2");

			expect(data).toEqual({key1 : {}});
			expect(property.key).toBe("key2");
			expect(property.hasValue).toBeFalse();
		});

		it("- writes through a step that held null", () => {
			const data = {key1 : null};
			ObjectProperty.load(data, "key1.key2").value = "written";

			expect(data).toEqual({key1 : {key2 : "written"}});
		});

		it("- replaces every step holding null on a deep path", () => {
			const data = {key1 : null};
			ObjectProperty.load(data, "key1.key2.key3");

			expect(data).toEqual({key1 : {key2 : {}}});
		});

		it("- returns null for a step holding null with create=false", () => {
			const data = {key1 : null};

			expect(ObjectProperty.load(data, "key1.key2", false)).toBeNull();
			expect(data).toEqual({key1 : null});
		});

		it("- creates nothing with create=false", () => {
			const data = {};
			ObjectProperty.load(data, "key1.key2", false);

			expect(data).toEqual({});
		});

		it("- ignores create=false for a path without a step", () => {
			// a single key addresses the object itself, there is nothing to create
			const property = ObjectProperty.load({}, "key1", false);

			expect(property).not.toBeNull();
			expect(property.key).toBe("key1");
		});

		it("- trims whitespace around every part of the path", () => {
			const data = {};
			const property = ObjectProperty.load(data, " key1 . key2 ");

			expect(data).toEqual({key1 : {}});
			expect(property.key).toBe("key2");
		});
	});

	describe("a step that is not an object", () => {
		// a primitive carries no property that could be written, so load reports the broken path
		// instead of handing out a property that blows up later. null is not part of this - it says
		// there is nothing here and is treated like a missing step.

		it("- throws for a number", () => {
			expect(() => ObjectProperty.load({key1 : 0}, "key1.key2")).toThrowError(TypeError);
		});

		it("- throws for a string", () => {
			expect(() => ObjectProperty.load({key1 : "value"}, "key1.key2")).toThrowError(TypeError);
		});

		it("- throws for a boolean", () => {
			expect(() => ObjectProperty.load({key1 : true}, "key1.key2")).toThrowError(TypeError);
		});

		it("- throws with create=false as well", () => {
			// a broken step is not a missing one - null would claim the path could be created
			expect(() => ObjectProperty.load({key1 : 0}, "key1.key2", false)).toThrowError(TypeError);
		});

		it("- names the failing step and the whole path", () => {
			expect(() => ObjectProperty.load({key1 : {key2 : 0}}, "key1.key2.key3")).toThrowError(
				TypeError,
				`cannot descend into "key2" of path "key1.key2.key3" - a number is no object`,
			);
		});

		it("- lets the last step be a primitive", () => {
			// only a step that has to be walked into needs to be an object
			const property = ObjectProperty.load({key1 : 0}, "key1");

			expect(property.value).toBe(0);
			expect(property.hasValue).toBeTrue();
		});
	});

	describe("an object as a step", () => {

		it("- walks into an array by index", () => {
			expect(ObjectProperty.load({key1 : [1, 2]}, "key1.1").value).toBe(2);
		});

		it("- writes into an array by index", () => {
			const data = {key1 : [1, 2]};
			ObjectProperty.load(data, "key1.0").value = 9;

			expect(data).toEqual({key1 : [9, 2]});
		});

		it("- appends a new index onto an array", () => {
			const data = {key1 : [1, 2]};
			ObjectProperty.load(data, "key1.2").append = 3;

			expect(data).toEqual({key1 : [1, 2, 3]});
		});

		it("- walks through an array into an object", () => {
			expect(ObjectProperty.load({key1 : [{key2 : 1}]}, "key1.0.key2").value).toBe(1);
		});

		it("- writes a named property onto an array", () => {
			// an array is an object and takes a named property like any other one. It lands beside
			// the entries, so nothing iterating the array will see it.
			const data = {key1 : [1]};
			ObjectProperty.load(data, "key1.key2").value = "written";

			expect(data.key1.key2).toBe("written");
			expect(data.key1.length).toBe(1);
			expect(JSON.stringify(data)).toBe(`{"key1":[1]}`);
		});

		it("- writes a named property onto a Map", () => {
			// same for every other object - a Map is walked into, not filled through set()
			const data = {key1 : new Map()};
			ObjectProperty.load(data, "key1.key2").value = "written";

			expect(data.key1.key2).toBe("written");
			expect(data.key1.size).toBe(0);
		});
	});

	describe("__proto__ as a step", () => {

		it("- writes onto the prototype", () => {
			// intended - a dotted path is allowed to reach a prototype and extend it
			const data = {};

			try{
				ObjectProperty.load(data, "__proto__.marker").value = "written";

				expect({}.marker).toBe("written");
				expect(data.marker).toBe("written");
			}
			finally{
				delete Object.prototype.marker;
			}

			expect({}.marker).toBeUndefined();
		});
	});
});
