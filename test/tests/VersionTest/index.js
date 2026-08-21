import { VERSION } from "../../../src/version.js";
import project from "../../../package.json";

/**
 * src/version.js is generated from package.json before every build. These specs catch a version.js
 * that was not regenerated after the version was raised.
 */
describe("Version Tests", () => {

	it("- matches the version of package.json", () => {
		expect(VERSION).toBe(project.version);
	});

	it("- is a version, not a placeholder", () => {
		expect(VERSION).toMatch(/^\d+\.\d+\.\d+/);
	});

	it("- reaches the browser export", async () => {
		await import("../../../browser.js");

		expect(window.defaultjs.common.utils.VERSION).toBe(project.version);
	});
});
