import xmlToJson from "../../../src/converter/XmlToJson";

describe("XmlToJson Tests", () => {
	const basepath = "/data/xmltojson";

	const loadXmlFileAsJson = async (file) => {
		const response = await fetch(new URL(`${basepath}/${file}`, location).toString());
		return xmlToJson(await response.text());
	};

	beforeAll(() => {});

	it("xml-1.xml", async () => {
		const file = "xml-1.xml";
		const xmlAsJson = await loadXmlFileAsJson(file);
		console.log(xmlAsJson);
	});

	afterAll(() => {});
});
