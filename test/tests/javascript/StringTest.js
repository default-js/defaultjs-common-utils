import "../../../src/javascript/String.js";

describe("String extension tests:", function() {	
	it("hashcode() -> int", () => {				
		expect(typeof "foo".hashcode()).toBe("number");
	});
	
	it("equal hashcodes", () => {
		expect("foo".hashcode()).toBe("foo".hashcode());
	});
	
	it("not equal hashcodes", () => {
		expect("foo".hashcode() == "bar".hashcode()).toBe(false);
	});
	
	it("not equal hashcodes 2", () => {
		expect("foo".hashcode() == "oof".hashcode()).toBe(false);
		expect("foo".hashcode() == "ofo".hashcode()).toBe(false);
	});
	
});