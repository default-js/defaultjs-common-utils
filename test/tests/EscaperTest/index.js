import Escaper from "@src/Escaper";

describe("Escaper Tests", () => {
	const ESCAPER = new Escaper([
		{char: "\\", escaped: "\\\\"},
		{char: "\"", escaped: "\\\""}
	]);
	
	const UNESCAPED = "test \\ and \"test\" test";
	const ESCAPED = "test \\\\ and \\\"test\\\" test";
	beforeAll(() => {});
	
	
	it("escape", () => {
		expect(ESCAPER.escape(UNESCAPED)).toBe(ESCAPED);
	});	
	
	it("unescape", () => {
		expect(ESCAPER.unescape(ESCAPED)).toBe(UNESCAPED);
	});
	
	it("escape / unescape for regexp", () => {
		const regexcontent = "test ()[]{}^?.\\ test"
		const escaper = Escaper.REGEXP_ESCAPER();
		const escaped = escaper.escape(regexcontent);
		try{
			new RegExp(escaped)
		}
		catch(error){
			fail(error);
		}
		
		const unescaped = escaper.unescape(escaped);
		expect(unescaped).toBe(regexcontent);
	});
	
	
	afterAll(() => {
	});
});