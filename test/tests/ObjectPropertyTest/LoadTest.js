import ObjectProperty from "@src/ObjectProperty.js";

describe("ObjectProperty load Tests", () => {
	const testData = () => {
		return {
			key1 : "value-1",
			key2 : {
					key21 : "value-2-1",
					key22 : {
						key221 : "value-2-2-1"
					},
					key23 : undefined,
					key24 : null		
			}
		};
	};
	
	beforeAll(() => {});
	
	it("- key1", () => {
		const data = testData();
		const property = ObjectProperty.load(data, "key1");		
		expect(property).toBeDefined();
		expect(property.context).toBe(data);
		expect(property.key).toBe("key1");
		expect(property.hasValue).toBe(true);
		expect(property.keyDefined).toBe(true);
		expect(property.value).toBe("value-1");
	});
	
	it("- key2.key21", () => {
		const data = testData();
		const property = ObjectProperty.load(data, "key2.key21");		
		expect(property).toBeDefined();
		expect(property.context).toBe(data.key2);
		expect(property.key).toBe("key21");
		expect(property.hasValue).toBe(true);
		expect(property.value).toBe("value-2-1");
	});
	
	
	it("- key2.key22", () => {
		const data = testData();
		const property = ObjectProperty.load(data, "key2.key22");		
		expect(property).toBeDefined();
		expect(property.context).toBe(data.key2);
		expect(property.key).toBe("key22");
		expect(property.hasValue).toBe(true);
		expect(property.value).toBe((data.key2).key22);
	});
	
	it("- key2.key23 -> value: undefined", () => {
		const data = testData();
		const property = ObjectProperty.load(data, "key2.key23");		
		expect(property).toBeDefined();
		expect(property.key).toBe("key23");
		expect(property.hasValue).toBe(false);
		expect(property.value).toBeUndefined();
	});
	
	it("- key2.key24 -> value: null", () => {
		const data = testData();
		const property = ObjectProperty.load(data, "key2.key24");		
		expect(property).toBeDefined();
		expect(property.key).toBe("key24");
		expect(property.hasValue).toBe(false);
		expect(property.value).toBe(null);
	});
	
	it("- key2.key25 -> key is not defined", () => {
		const data = testData();
		const property = ObjectProperty.load(data, "key2.key25");		
		expect(property).toBeDefined();
		expect(property.key).toBe("key25");
		expect(property.hasValue).toBe(false);
		expect(property.keyDefined).toBe(false);
		expect(property.value).toBeUndefined();
	});
	
	it("- key2.key25.key251 -> key25 is not defined (use default create=true)", () => {
		const data = testData();
		const property = ObjectProperty.load(data, "key2.key25.key251");		
		expect(property).toBeDefined();
		expect(property.key).toBe("key251");
		expect(property.hasValue).toBe(false);
		expect(property.keyDefined).toBe(false);
		expect(property.value).toBeUndefined();
		expect(property.context).toBe(data.key2.key25);
	});
	
	it("- key2.key25.key251 -> key25 is not defined (use create=false)", () => {
		const data = testData();
		const property = ObjectProperty.load(data, "key2.key25.key251", false);		
		expect(property).toBe(null);
		expect(data.key2.key25).toBeUndefined();
	});
	
	
	afterAll(() => {});
});