import xmlToJson from "../../../src/converter/XmlToJson.js";

describe("XmlToJson Tests", () => {
	const basepath = "/data/xmltojson";

	const loadXmlFileAsJson = async (file) => {
		const response = await fetch(new URL(`${basepath}/${file}`, location).toString());
		return xmlToJson(await response.text());
	};

	const attributes = {"@attribute-1" : "attribute-1", "@attribute-2" : "attribute-2"};

	// a DOMParser does not throw on malformed xml - it hands back a document describing the error,
	// carrying a parsererror element. Its markup differs per browser, only its presence is portable.
	const isParserError = (json) => JSON.stringify(json).includes("parsererror");

	beforeAll(() => {});

	describe("elements", () => {

		it("takes the root element as the only key", () => {
			expect(xmlToJson("<a>text</a>")).toEqual({a : "text"});
		});

		it("reduces an element without attributes and children to its text", () => {
			expect(xmlToJson("<a><b>text</b></a>")).toEqual({a : {b : "text"}});
		});

		it("nests child elements", () => {
			expect(xmlToJson("<a><b><c>text</c></b></a>")).toEqual({a : {b : {c : "text"}}});
		});

		it("returns an empty string for an empty element", () => {
			expect(xmlToJson("<a><b/></a>")).toEqual({a : {b : ""}});
		});

		it("ignores whitespace between elements", () => {
			expect(xmlToJson("<a>\n\t<b>text</b>\n</a>")).toEqual({a : {b : "text"}});
		});

		it("reads a CDATA section as text", () => {
			expect(xmlToJson("<a><b><![CDATA[text]]></b></a>")).toEqual({a : {b : "text"}});
		});
	});

	describe("attributes", () => {

		it("prefixes an attribute with @", () => {
			expect(xmlToJson(`<a><b attribute-1="attribute-1" attribute-2="attribute-2"/></a>`)).toEqual({a : {b : attributes}});
		});

		it("keeps the text of an element carrying attributes under @", () => {
			expect(xmlToJson(`<a><b attribute-1="attribute-1">text</b></a>`)).toEqual({a : {b : {"@attribute-1" : "attribute-1", "@" : "text"}}});
		});

		it("keeps attributes next to child elements", () => {
			expect(xmlToJson(`<a attribute-1="attribute-1"><b>text</b></a>`)).toEqual({a : {"@attribute-1" : "attribute-1", b : "text"}});
		});
	});

	describe("attribute names with a leading @", () => {
		// @ is no valid NameStartChar in xml, so an attribute named @test makes the document
		// malformed - the parser rejects it before the converter ever sees an attribute. The @ of
		// ATTRIBUTE_PREFIX can therefore never collide with an attribute name coming from the source.

		it("reports a parser error instead of data", () => {
			expect(isParserError(xmlToJson(`<a @test="test"/>`))).toBeTrue();
		});

		it("does not surface the attribute as a key", () => {
			const json = JSON.stringify(xmlToJson(`<a @test="test"/>`));

			expect(json.includes("@@test")).withContext("double prefixed key").toBeFalse();
			expect(json.includes(`"@test":"test"`)).withContext("attribute taken over as data").toBeFalse();
		});

		it("reports a parser error on a nested element", () => {
			expect(isParserError(xmlToJson(`<test><node-3 @test="test"></node-3></test>`))).toBeTrue();
		});

		it("reports a parser error next to a well formed attribute", () => {
			const result = xmlToJson(`<a test="1" @test="2"/>`);

			expect(isParserError(result)).toBeTrue();
			// the whole document is rejected, the well formed attribute does not survive either
			expect(JSON.stringify(result).includes(`"@test":"1"`)).toBeFalse();
		});

		it("reports a parser error for an attribute named @", () => {
			expect(isParserError(xmlToJson(`<a @="test"/>`))).toBeTrue();
		});

		it("reports a parser error for an element named @test", () => {
			expect(isParserError(xmlToJson(`<a><@test>x</@test></a>`))).toBeTrue();
		});

		it("takes the same attribute without the @ as data", () => {
			// the counterpart - a well formed name is what turns into a @ prefixed key
			expect(xmlToJson(`<a test="test"/>`)).toEqual({a : {"@test" : "test"}});
		});
	});

	describe("repeated elements", () => {
		// a repeated element turns into an array - the second occurrence is the one that has to
		// trigger the conversion and land in the array itself
		it("keeps both entries of a element occurring twice", () => {
			expect(xmlToJson("<a><b>1</b><b>2</b></a>")).toEqual({a : {b : ["1", "2"]}});
		});

		it("keeps every entry of a element occurring three times", () => {
			expect(xmlToJson("<a><b>1</b><b>2</b><b>3</b></a>")).toEqual({a : {b : ["1", "2", "3"]}});
		});

		it("keeps every entry of a element occurring five times", () => {
			expect(xmlToJson("<a><b>1</b><b>2</b><b>3</b><b>4</b><b>5</b></a>")).toEqual({a : {b : ["1", "2", "3", "4", "5"]}});
		});

		it("does not build an array for a element occurring once", () => {
			expect(xmlToJson("<a><b>1</b></a>")).toEqual({a : {b : "1"}});
		});

		it("keeps repeated elements holding attributes", () => {
			const xml = `<a><b attribute-1="attribute-1">1</b><b attribute-1="attribute-1">2</b></a>`;

			expect(xmlToJson(xml)).toEqual({
				a : {
					b : [
						{"@attribute-1" : "attribute-1", "@" : "1"},
						{"@attribute-1" : "attribute-1", "@" : "2"},
					],
				},
			});
		});

		it("keeps repeated elements next to other elements", () => {
			expect(xmlToJson("<a><b>1</b><c>x</c><b>2</b></a>")).toEqual({a : {b : ["1", "2"], c : "x"}});
		});
	});

	describe("xml-1.xml", () => {

		it("converts the whole document", async () => {
			const xmlAsJson = await loadXmlFileAsJson("xml-1.xml");

			expect(xmlAsJson).toEqual({
				test : {
					string : "string",
					"node-1" : {...attributes, "@" : "string"},
					"node-2" : {
						...attributes,
						"node-child" : [
							{...attributes, "@" : "node-child-1"},
							{...attributes, "@" : "node-child-2"},
							{...attributes, "@" : "node-child-3"},
							{...attributes, "@" : "node-child-4"},
							{...attributes, "@" : "node-child-5"},
							{...attributes, "@" : "node-child-6"},
						],
						"@" : "string",
					},
					"string-list" : ["string-1", "string-2", "string-3", "string-4", "string-5"],
					"node-3" : {"@test" : "test"},
				},
			});
		});

		it("is valid xml", async () => {
			const xmlAsJson = await loadXmlFileAsJson("xml-1.xml");

			expect(isParserError(xmlAsJson)).toBeFalse();
		});
	});

	afterAll(() => {});
});
