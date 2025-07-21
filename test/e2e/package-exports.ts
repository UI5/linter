import test from "ava";
import {createRequire} from "node:module";

// Using CommonsJS require since JSON module imports are still experimental
const require = createRequire(import.meta.url);

test.serial("Package exports: export of package.json", (t) => {
	t.truthy(require("@ui5/linter/package.json").version);
});

// Check number of defined exports
test.serial("Package exports: check number of exports", (t) => {
	const packageJson = require("@ui5/linter/package.json");
	t.is(Object.keys(packageJson.exports).length, 3);
});

// Public API contract (exported modules)
test.serial("Package exports: @ui5/linter", async (t) => {
	const actual = await import("@ui5/linter");
	const expected = await import("../../lib/index.js");
	t.is(actual, expected, "Correct module exported");
});

test.serial("Package exports: @ui5/linter/Ui5TypeInfoMatcher", async (t) => {
	const actual = await import("@ui5/linter/Ui5TypeInfoMatcher");
	const expected = await import("../../lib/linter/ui5Types/Ui5TypeInfoMatcher.js");
	t.is(actual, expected, "Correct module exported");
});
