/**
 * Writes the version of package.json into src/version.js.
 *
 * Runs before every build. The result is checked in, so the version is right in the package too and
 * not only inside a bundle - nothing has to be replaced while packing.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = resolve(root, "src/version.js");

const { version } = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));

const content = `/**
 * The version of this package.
 *
 * Generated from package.json by scripts/generate-version.js before every build. Do not edit - the
 * next build overwrites it.
 *
 * @module version
 */
export const VERSION = "${version}";

export default VERSION;
`;

// only write when something changed, so a build does not touch the working tree for nothing
if (existsSync(target) && readFileSync(target, "utf8") === content) console.log(`version.js is up to date (${version})`);
else {
	writeFileSync(target, content);
	console.log(`version.js written (${version})`);
}
