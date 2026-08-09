/**
 * Conversion of xml into plain javascript objects.
 *
 * @module XmlToJson
 */

// an attribute becomes a property carrying this prefix, the text of an element the prefix on its
// own. The two cannot collide: no well formed attribute name may start with an @.
const ATTRIBUTE_PREFIX = "@";
const TEXTCONTENT = "@";

/**
 * @private
 * @param {string} content
 * @returns {Document} a document describing the error when the xml is malformed - DOMParser does not
 *   throw for that
 */
const parse = (content) => {
	const parser = new DOMParser();
	return parser.parseFromString(content, "application/xml");
};

/**
 * @private
 * @param {Node} node
 * @returns {object|string} the text of the node when it carries neither attributes nor child
 *   elements, an object otherwise
 */
const xmlToJson = (node) => {
	// Create the return object
	if (node.nodeType == 3 || node.nodeType == 4) return node.textContent.trim();

	const hasAttributes = node.attributes && node.attributes.length > 0;
	const hasChildNodes = node.childElementCount > 0;

	if (!hasAttributes && !hasChildNodes) return node.textContent.trim();

	// process childs
	const obj = {};
	let textContent = "";
	// element do attributes
	if (hasAttributes) {
		for (let attribute of node.attributes) obj[`${ATTRIBUTE_PREFIX}${attribute.nodeName}`] = attribute.nodeValue;
	}

	for (let item of node.childNodes) {
		if (item.nodeType == 1) {
			const nodeName = item.nodeName;
			const data = xmlToJson(item);
			if (typeof obj[nodeName] === "undefined") {
				obj[nodeName] = data;
			} else if (!Array.isArray(obj[nodeName])) {
				const old = obj[nodeName];
				obj[nodeName] = [];
				obj[nodeName].push(old, data);
			} else obj[nodeName].push(data);
		} else if (item.nodeType == 3 || item.nodeType == 4) textContent = `${textContent}${item.textContent}`;
	}

	textContent = textContent.trim();
	if (textContent.length > 0) obj[TEXTCONTENT] = textContent;

	return obj;
};

/**
 * Converts xml into a plain object.
 *
 * An element without attributes and without child elements becomes its text. Everything else becomes
 * an object: an attribute lands under "@" plus its name, the text of the element under "@" alone,
 * and a child element under its own name. An element occurring more than once becomes an array,
 * keeping the order of the document.
 *
 * Malformed xml does not throw - the parser hands back a document describing the error, and that is
 * converted like any other one. Check the result for a parsererror if the source is not trusted.
 *
 * @param {string|Document|Node} content xml as text, or an already parsed node
 * @returns {object|string}
 *
 * @example
 * xmlToJson("<a><b>text</b></a>");                  // {a : {b : "text"}}
 * xmlToJson(`<a id="1">text</a>`);                  // {a : {"@id" : "1", "@" : "text"}}
 * xmlToJson("<a><b>1</b><b>2</b></a>");             // {a : {b : ["1", "2"]}}
 */
export default (content) => {
	if (typeof content === "string") content = parse(content);

	return xmlToJson(content);
};
