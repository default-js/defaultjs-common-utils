import Escaper, {REGEXP_ESCAPER, MODES} from "../../../src/Escaper.js";

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

	describe("one pass over the text", () => {
		// every rule is applied while walking the text once, so what a replacement inserts sits behind
		// the position the walk continues at and no other rule can reach it

		it("does not let a rule touch what an earlier one inserted", () => {
			const escaper = new Escaper([{char : "a", escaped : "XY"}, {char : "Y", escaped : "Z"}], true);

			expect(escaper.escape("a")).toBe("XY");
			expect(escaper.escape("aY")).toBe("XYZ");
		});

		it("keeps a multi character replacement intact", () => {
			const escaper = new Escaper([{char : "aa", escaped : "xyz"}, {char : "y", escaped : "Q"}], true);

			expect(escaper.escape("aa")).toBe("xyz");
			expect(escaper.escape("aay")).toBe("xyzQ");
			expect(escaper.escape("yaa")).toBe("Qxyz");
		});

		it("does not depend on the order for rules that cannot overlap", () => {
			const map = [{char : "a", escaped : "1"}, {char : "b", escaped : "2"}];
			const reversed = [{char : "b", escaped : "2"}, {char : "a", escaped : "1"}];

			expect(new Escaper(map, true).escape("ab")).toBe("12");
			expect(new Escaper(reversed, true).escape("ab")).toBe("12");
		});

		it("lets the map order decide between rules matching at the same place", () => {
			// documented precedence - the entry written first wins
			expect(new Escaper([{char : "a", escaped : "1"}, {char : "aa", escaped : "2"}], true).escape("aa")).toBe("11");
			expect(new Escaper([{char : "aa", escaped : "2"}, {char : "a", escaped : "1"}], true).escape("aa")).toBe("2");
		});
	});

	describe("multi character entries", () => {
		// char is a text to look for, not a single character

		it("escapes and unescapes a multi character entry", () => {
			const escaper = new Escaper([{char : "aa", escaped : "xyz"}], true);

			expect(escaper.escape("baab")).toBe("bxyzb");
			expect(escaper.unescape("bxyzb")).toBe("baab");
		});

		it("takes the matches from left to right", () => {
			const escaper = new Escaper([{char : "aa", escaped : "xyz"}], true);

			expect(escaper.escape("aaa")).toBe("xyza");
			expect(escaper.escape("aaaa")).toBe("xyzxyz");
		});

		it("matches a metacharacter in char literally", () => {
			const escaper = new Escaper([{char : "a.a", escaped : "Q"}], true);

			expect(escaper.escape("a.a")).toBe("Q");
			expect(escaper.escape("aba")).withContext("the dot must not match any character").toBe("aba");
		});
	});

	describe("the escaped value is inserted literally", () => {
		// String.replace reads $&, $`, $', $1 and $$ in a replacement string - taking the value from a
		// callback keeps them out of the way

		it("keeps a $ pattern as written", () => {
			expect(new Escaper([{char : "a", escaped : "$&"}], true).escape("a")).toBe("$&");
			expect(new Escaper([{char : "a", escaped : "$`"}], true).escape("zaz")).toBe("z$`z");
			expect(new Escaper([{char : "a", escaped : "$1"}], true).escape("a")).toBe("$1");
			expect(new Escaper([{char : "a", escaped : "$$"}], true).escape("a")).toBe("$$");
		});

		it("keeps a $ pattern while unescaping", () => {
			expect(new Escaper([{char : "$x", escaped : "Q"}], true).unescape("Q")).toBe("$x");
		});
	});

	describe("at - one directional entries", () => {
		// an entry may take part in one direction only. Without at it takes part in both.
		const CHARMAP = (at) => [at ? {char : "a", escaped : "X", at} : {char : "a", escaped : "X"}];

		it("takes part in both directions without at", () => {
			const escaper = new Escaper(CHARMAP(), true);

			expect(escaper.escape("a")).toBe("X");
			expect(escaper.unescape("X")).toBe("a");
		});

		it('at "escape" escapes but does not unescape', () => {
			const escaper = new Escaper(CHARMAP("escape"), true);

			expect(escaper.escape("aa")).toBe("XX");
			expect(escaper.unescape("XX")).withContext("unescape has to leave it alone").toBe("XX");
		});

		it('at "unescape" unescapes but does not escape', () => {
			const escaper = new Escaper(CHARMAP("unescape"), true);

			expect(escaper.escape("aa")).withContext("escape has to leave it alone").toBe("aa");
			expect(escaper.unescape("XX")).toBe("aa");
		});

		it("rejects an entry carrying an unknown at", () => {
			// a typo used to remove the entry from both directions without a word
			expect(() => new Escaper(CHARMAP("both"), true)).toThrowError(TypeError);
			expect(() => new Escaper(CHARMAP("escaping"), true)).toThrowError(TypeError);
			expect(() => new Escaper([{char : "a", escaped : "X", at : ""}], true)).toThrowError(TypeError);
		});

		it("takes an at in any case", () => {
			// at is compared in lower case, so the spelling of the direction does not matter
			for(const at of ["escape", "Escape", "ESCAPE", "eScApE"]){
				const escaper = new Escaper(CHARMAP(at), true);

				expect(escaper.escape("a")).withContext(`escape with at ${JSON.stringify(at)}`).toBe("X");
				expect(escaper.unescape("X")).withContext(`unescape with at ${JSON.stringify(at)}`).toBe("X");
			}

			for(const at of ["unescape", "Unescape", "UNESCAPE", "UnEsCaPe"]){
				const escaper = new Escaper(CHARMAP(at), true);

				expect(escaper.escape("a")).withContext(`escape with at ${JSON.stringify(at)}`).toBe("a");
				expect(escaper.unescape("X")).withContext(`unescape with at ${JSON.stringify(at)}`).toBe("a");
			}
		});

		it("takes MODES as at", () => {
			expect(new Escaper(CHARMAP(MODES.escape), true).escape("a")).toBe("X");
			expect(new Escaper(CHARMAP(MODES.unescape), true).unescape("X")).toBe("a");
		});

		it("takes an at that is explicitly undefined", () => {
			const escaper = new Escaper([{char : "a", escaped : "X", at : undefined}], true);

			expect(escaper.escape("a")).toBe("X");
			expect(escaper.unescape("X")).toBe("a");
		});

		it("mixes directions within one map", () => {
			const escaper = new Escaper(
				[
					{char : "a", escaped : "X", at : "escape"},
					{char : "b", escaped : "Y", at : "unescape"},
					{char : "c", escaped : "Z"},
				],
				true,
			);

			expect(escaper.escape("abc")).toBe("XbZ");
			expect(escaper.unescape("XYZ")).toBe("Xbc");
		});
	});

	describe("case sensitivity", () => {
		const CHARMAP = [{char : "a", escaped : "X"}];

		it("keeps the case apart when switched on", () => {
			const escaper = new Escaper(CHARMAP, true);

			expect(escaper.escape("aA")).toBe("XA");
			expect(escaper.unescape("Xx")).toBe("ax");
		});

		it("ignores the case when switched off", () => {
			const escaper = new Escaper(CHARMAP, false);

			expect(escaper.escape("aA")).toBe("XX");
			expect(escaper.unescape("Xx")).toBe("aa");
		});

		it("ignores the case without the argument", () => {
			// deliberate - an escaper is built for a counterpart, and where that one works case
			// insensitively the case carries no information to preserve
			const escaper = new Escaper(CHARMAP);

			expect(escaper.escape("aA")).toBe("XX");
			expect(escaper.unescape("x")).toBe("a");
		});

		it("does not carry the case through a roundtrip", () => {
			// the consequence of the above - the escaped text knows no case, so unescape hands back
			// what the map says, not what went in
			const escaper = new Escaper(CHARMAP);

			expect(escaper.unescape(escaper.escape("A"))).toBe("a");
			expect(escaper.unescape(escaper.escape("aA"))).toBe("aa");
		});
	});

	describe("an unusable char map", () => {
		// the constructor is the place to notice - a map is written once and used many times

		it("rejects a map that is no array", () => {
			expect(() => new Escaper(undefined, true)).toThrowError(TypeError, /has to be an array/);
			expect(() => new Escaper(null, true)).toThrowError(TypeError, /has to be an array/);
			expect(() => new Escaper("abc", true)).toThrowError(TypeError, /has to be an array/);
			expect(() => new Escaper({}, true)).toThrowError(TypeError, /has to be an array/);
		});

		it("names the type of the map it got", () => {
			expect(() => new Escaper(undefined, true)).toThrowError(TypeError, /not undefined/);
			expect(() => new Escaper(null, true)).toThrowError(TypeError, /not null/);
			expect(() => new Escaper("abc", true)).toThrowError(TypeError, /not string/);
		});

		it("rejects an entry that is no object", () => {
			expect(() => new Escaper([null], true)).toThrowError(TypeError, /entry 0 is no object/);
			expect(() => new Escaper(["a"], true)).toThrowError(TypeError, /entry 0 is no object/);
			expect(() => new Escaper([undefined], true)).toThrowError(TypeError, /entry 0 is no object/);
		});

		it("rejects a char that is no string", () => {
			expect(() => new Escaper([{escaped : "X"}], true)).toThrowError(TypeError, /char has to be a string/);
			expect(() => new Escaper([{char : 1, escaped : "X"}], true)).toThrowError(TypeError, /char has to be a string/);
		});

		it("rejects an empty char", () => {
			// it would compile into a regex matching at every position
			expect(() => new Escaper([{char : "", escaped : "X"}], true)).toThrowError(TypeError, /char must not be empty/);
		});

		it("rejects an escaped that is no string", () => {
			expect(() => new Escaper([{char : "a"}], true)).toThrowError(TypeError, /escaped has to be a string/);
			expect(() => new Escaper([{char : "a", escaped : 1}], true)).toThrowError(TypeError, /escaped has to be a string/);
		});

		it("rejects an at that is no string", () => {
			// the lower casing must not run before it is clear there is a string to lower case
			for(const at of [null, 1, true, {}, []]){
				expect(() => new Escaper([{char : "a", escaped : "X", at}], true))
					.withContext(`at ${JSON.stringify(at)}`)
					.toThrowError(TypeError, /entry 0: at has to be a string or undefined/);
			}
		});

		it("takes an entry without an at", () => {
			// the normal case - it must not fall into the check meant for a wrong at
			expect(() => new Escaper([{char : "a", escaped : "X"}], true)).not.toThrow();
			expect(() => new Escaper([{char : "a", escaped : "X", at : undefined}], true)).not.toThrow();
		});

		it("reports every problem at once", () => {
			const build = () =>
				new Escaper(
					[
						{char : "a", escaped : "X"},
						{char : "", escaped : "Y"},
						{char : 1},
						null,
						{char : "b", escaped : "Z", at : "escaping"},
					],
					true,
				);

			expect(build).toThrowError(TypeError, /entry 1: char must not be empty/);
			expect(build).toThrowError(TypeError, /entry 2: char has to be a string/);
			expect(build).toThrowError(TypeError, /entry 2: escaped has to be a string/);
			expect(build).toThrowError(TypeError, /entry 3 is no object/);
			expect(build).toThrowError(TypeError, /entry 4: at has to be/);
		});

		it("says nothing about a sound entry", () => {
			try{
				new Escaper([{char : "a", escaped : "X"}, {char : "", escaped : "Y"}], true);
				fail("expected the map to be rejected");
			}
			catch(error){
				expect(error.message).not.toContain("entry 0");
			}
		});

		it("takes an empty map", () => {
			expect(() => new Escaper([], true)).not.toThrow();
		});
	});

	describe("an empty escaped value", () => {
		// escaping a character to nothing drops it, and that cannot be undone - such an entry only
		// takes part in escaping

		it("drops the character while escaping", () => {
			const escaper = new Escaper([{char : "a", escaped : ""}], true);

			expect(escaper.escape("banana")).toBe("bnn");
		});

		it("takes no part in unescaping", () => {
			const escaper = new Escaper([{char : "a", escaped : ""}], true);

			// an entry taking part with an empty text to look for would match at every position and
			// scatter its replacement through the whole text
			expect(escaper.unescape("bnn")).toBe("bnn");
			expect(escaper.unescape("xyz")).toBe("xyz");
			expect(escaper.unescape("")).toBe("");
		});

		it("leaves the other entries working in both directions", () => {
			const escaper = new Escaper([{char : "a", escaped : ""}, {char : "b", escaped : "Y"}], true);

			expect(escaper.escape("ab")).toBe("Y");
			expect(escaper.unescape("Y")).toBe("b");
		});
	});

	describe("input that is no string", () => {

		it("rejects it at escape", () => {
			const escaper = new Escaper([{char : "a", escaped : "X"}], true);

			expect(() => escaper.escape(null)).toThrowError(TypeError, "Expected a string");
			expect(() => escaper.escape(undefined)).toThrowError(TypeError, "Expected a string");
			expect(() => escaper.escape(123)).toThrowError(TypeError, "Expected a string");
			expect(() => escaper.escape({})).toThrowError(TypeError, "Expected a string");
		});

		it("rejects it at unescape", () => {
			const escaper = new Escaper([{char : "a", escaped : "X"}], true);

			expect(() => escaper.unescape(null)).toThrowError(TypeError, "Expected a string");
			expect(() => escaper.unescape(undefined)).toThrowError(TypeError, "Expected a string");
			expect(() => escaper.unescape(123)).toThrowError(TypeError, "Expected a string");
			expect(() => escaper.unescape({})).toThrowError(TypeError, "Expected a string");
		});

		it("takes an empty string", () => {
			const escaper = new Escaper([{char : "a", escaped : "X"}], true);

			expect(escaper.escape("")).toBe("");
			expect(escaper.unescape("")).toBe("");
		});
	});

	describe("REGEXP_ESCAPER as a singleton", () => {

		it("hands out the same instance every time", () => {
			expect(Escaper.REGEXP_ESCAPER()).toBe(Escaper.REGEXP_ESCAPER());
		});

		it("is the same instance as the named export", () => {
			expect(Escaper.REGEXP_ESCAPER()).toBe(REGEXP_ESCAPER);
		});
	});

	describe("empty results", () => {

		it("leaves the text alone for an empty map", () => {
			const escaper = new Escaper([], true);

			expect(escaper.escape("abc")).toBe("abc");
			expect(escaper.unescape("abc")).toBe("abc");
		});

		it("leaves a text without a match alone", () => {
			const escaper = new Escaper([{char : "a", escaped : "X"}], true);

			expect(escaper.escape("zzz")).toBe("zzz");
			expect(escaper.unescape("zzz")).toBe("zzz");
		});

		it("replaces across line breaks", () => {
			const escaper = new Escaper([{char : "a", escaped : "X"}], true);

			expect(escaper.escape("a\na")).toBe("X\nX");
			expect(escaper.unescape("X\nX")).toBe("a\na");
		});
	});

	describe("REGEXP_ESCAPER", () => {
		// every character carrying a meaning inside a regular expression
		const METACHARS = ["\\", "?", "*", "+", "|", "[", "]", "{", "}", "(", ")", ".", "^", "$"];

		it("escapes every metacharacter", () => {
			const escaper = Escaper.REGEXP_ESCAPER();

			for(const char of METACHARS){
				const text = `a${char}b`;
				const escaped = escaper.escape(text);

				expect(escaped).withContext(`escaping ${JSON.stringify(text)}`).toBe(`a\\${char}b`);
			}
		});

		it("builds a regexp matching the text itself", () => {
			const escaper = Escaper.REGEXP_ESCAPER();

			for(const char of METACHARS){
				const text = `a${char}b`;

				let regexp = null;
				try{
					regexp = new RegExp(`^${escaper.escape(text)}$`);
				}
				catch(error){
					fail(`${JSON.stringify(text)} does not compile: ${error}`);
					continue;
				}

				expect(regexp.test(text)).withContext(`${JSON.stringify(text)} against ${regexp}`).toBeTrue();
			}
		});

		it("takes the meaning out of a quantifier and an alternation", () => {
			const escaper = Escaper.REGEXP_ESCAPER();
			// an unescaped metacharacter would still compile, so only a counterexample uncovers it
			const cases = [
				{text : "a|b", other : "a"},
				{text : "ab+", other : "abbb"},
				{text : "ab*", other : "ab"},
				{text : "ab?", other : "a"},
				{text : "a.b", other : "axb"},
				{text : "a{1,2}", other : "aa"},
				{text : "(ab)", other : "ab"},
				{text : "[ab]", other : "a"},
			];

			for(const {text, other} of cases){
				const regexp = new RegExp(`^${escaper.escape(text)}$`);

				expect(regexp.test(text)).withContext(`${JSON.stringify(text)} against itself`).toBeTrue();
				expect(regexp.test(other)).withContext(`${JSON.stringify(text)} against ${JSON.stringify(other)}`).toBeFalse();
			}
		});

		it("unescapes back to the original text", () => {
			const escaper = Escaper.REGEXP_ESCAPER();

			for(const char of METACHARS){
				const text = `a${char}b`;

				expect(escaper.unescape(escaper.escape(text))).withContext(`roundtrip of ${JSON.stringify(text)}`).toBe(text);
			}
		});

		it("escapes a backslash only once", () => {
			const escaper = Escaper.REGEXP_ESCAPER();
			// the backslash rule runs first, a rule behind it must not escape the backslash it inserts
			expect(escaper.escape("a.b")).toBe("a\\.b");
			expect(escaper.escape("\\")).toBe("\\\\");
			expect(escaper.escape("\\.")).toBe("\\\\\\.");
		});
	});


	afterAll(() => {
	});
});