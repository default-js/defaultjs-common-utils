import ObjectProperty from "../../../src/ObjectProperty.js";

describe("ObjectProperty remove Tests", () => {
	const testData = () => {
		return {
			key1 : "value-1",
			key2 : {
					key21 : "value-2-1"		
			},
			key3 : undefined,
			key4 : null
		};
	};
	
	beforeAll(() => {});
	
	it("- key1", () => {
		const data = testData();
		const property = ObjectProperty.load(data, "key1");
		property.remove();
		expect(data.key1).toBeUndefined();
		expect("key1" in data).toBe(false);
	});
	
	it("- key2", () => {
		const data = testData();
		const property = ObjectProperty.load(data, "key2");
		property.remove();
		expect(data.key2).toBeUndefined();
		expect("key2" in data).toBe(false);
	});
	
	it("- key3 -> value is undefined", () => {
		const data = testData();
		const property = ObjectProperty.load(data, "key3");
		property.remove();
		expect(data.key3).toBeUndefined();
		expect("key3" in data).toBe(false);
	});
	
	it("- key4 -> value is null", () => {
		const data = testData();
		const property = ObjectProperty.load(data, "key4");
		property.remove();
		expect(data.key4).toBeUndefined();
		expect("key4" in data).toBe(false);
	});
	
	afterAll(() => {});
});