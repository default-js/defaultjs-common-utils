/**
 * Conversion of xml into plain javascript objects.
 */

/** What a converted node becomes: its text, or an object of attributes, children and text. */
export type XmlJson = string | { [key: string]: XmlJson | XmlJson[] };

/**
 * Converts xml into a plain object. An attribute lands under "@" plus its name, the text of an
 * element under "@" alone, a repeated element becomes an array.
 *
 * Malformed xml does not throw - the parser hands back a document describing the error, and that is
 * converted like any other one. Needs a DOMParser.
 */
declare function xmlToJson(content: string | Document | Node): XmlJson;

export default xmlToJson;
