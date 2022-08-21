import ValueHelper from "../../../src/ValueHelper";

describe("ValueHelper - ", function() {
	
	beforeAll(async () => {	});
	
	
	it("no value", async () => {		
		expect(ValueHelper.noValue(null)).toBe(true);
		expect(ValueHelper.noValue(undefined)).toBe(true);
		expect(!ValueHelper.noValue(0)).toBe(true);
		expect(!ValueHelper.noValue(false)).toBe(true);
		expect(!ValueHelper.noValue(true)).toBe(true);
		expect(!ValueHelper.noValue("")).toBe(true);
		expect(!ValueHelper.noValue("test")).toBe(true);
		expect(!ValueHelper.noValue({})).toBe(true);
		expect(!ValueHelper.noValue({key:"test"})).toBe(true);
	});
	
	it("no value", async () => {		
		expect(ValueHelper.emtpyOrNoValueString(null)).toBe(true);
		expect(ValueHelper.emtpyOrNoValueString(undefined)).toBe(true);
		expect(ValueHelper.emtpyOrNoValueString("")).toBe(true);
		expect(ValueHelper.emtpyOrNoValueString(" ")).toBe(true);
		expect(!ValueHelper.emtpyOrNoValueString("test")).toBe(true);
	});	
	
	
	afterAll(async () => {});
});