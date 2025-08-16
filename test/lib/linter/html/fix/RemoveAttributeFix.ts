/* This test file is designed to test generic use cases of RemoveAttributeFix.
These include not only UI5 use cases. We want to test the functionality of
removing any kind of attribute inside any kind of HTML construct. */

import anyTest, {TestFn} from "ava";
import sinonGlobal from "sinon";
import esmock from "esmock";
import RemoveAttributeFix from "../../../../../src/linter/html/fix/RemoveAttributeFix.js";
import {extractHTMLTags} from "../../../../../src/linter/html/parser.js";
import {Readable} from "node:stream";
import autofix, {AutofixResource} from "../../../../../src/autofix/autofix.js";
import LinterContext, {RawLintMessage} from "../../../../../src/linter/LinterContext.js";
import {addDependencies} from "../../../../../src/autofix/amdImports.js";
import {createResource} from "@ui5/fs/resourceFactory";
import {MESSAGE} from "../../../../../src/linter/messages.js";
import Fix from "../../../../../src/linter/ui5Types/fix/Fix.js";

const test = anyTest as TestFn<{
	sinon: sinonGlobal.SinonSandbox;
	addDependenciesStub: sinonGlobal.SinonStub<Parameters<typeof addDependencies>, ReturnType<typeof addDependencies>>;
	autofix: typeof autofix;
	linterContext: LinterContext;
}>;

test.beforeEach(async (t) => {
	t.context.sinon = sinonGlobal.createSandbox();
	t.context.addDependenciesStub = t.context.sinon.stub();
	t.context.autofix = await esmock("../../../../../src/autofix/autofix.js", {
		"../../../../../src/autofix/amdImports.ts": {
			addDependencies: t.context.addDependenciesStub,
		},
	});
	t.context.linterContext = new LinterContext({
		rootDir: "/",
		fix: true,
	});
});

test.afterEach.always((t) => {
	t.context.sinon.restore();
});

const _extractTagsFromString = async (htmlString: string) => {
	const stream = new Readable();
	stream.push(htmlString);
	stream.push(null);
	const {extractedTags} = await extractHTMLTags(stream);
	return extractedTags;
};

const _runAutofix = async (fix: Fix | Fix[], input: string,
	tcontext: {autofix: typeof autofix; linterContext: LinterContext}) => {
	const {autofix, linterContext} = tcontext;
	const resources = new Map<string, AutofixResource>();
	const messages: RawLintMessage[] = [];
	const fixes = Array.isArray(fix) ? fix : [fix];
	fixes.forEach((f) => {
		messages.push({
			id: MESSAGE.NO_GLOBALS, // arbitrary, will be overwritten
			position: { // arbitrary, will be overwritten
				line: 0,
				column: 0,
			},
			args: {},
			fix: f,
			ui5TypeInfo: undefined,
		});
	});
	resources.set("/resources/test.html", {
		resource: createResource({
			path: "/resources/test.html",
			string: input,
		}),
		messages: messages,
	});
	const result = await autofix({
		rootDir: "/",
		context: linterContext,
		resources,
	});
	return result;
};

test("Remove Attribute from HTML tag", async (t) => {
	const input = `<!Doctype HTML>
<html>
<head>
	<script remove="me">
	</script>
</head>
<body>
</body>
</html>`;

	const expectedOutput = `<!Doctype HTML>
<html>
<head>
	<script>
	</script>
</head>
<body>
</body>
</html>`;

	// ----- Parse and select attribute -----
	const extractedTags = await _extractTagsFromString(input);
	const scriptTag = extractedTags.scriptTags[0];
	const attrToRemove = scriptTag.attributes[0];

	// ----- Create fix -----
	const fix = new RemoveAttributeFix(scriptTag, attrToRemove);

	// ----- Run Autofix -----
	const result = await _runAutofix(fix, input, t.context);

	// ----- Compare Autofix output with expected output -----
	t.truthy(result);
	t.is(Array.from(result.values())[0], expectedOutput, "Autofix output should match expected output");
});

test("Remove Multiple Attributes from HTML tag", async (t) => {
	const input = `<!Doctype HTML>
<html>
<head>
	<script remove="me"
		keep="me"
		remove="meToo">
	</script>
</head>
<body>
</body>
</html>`;

	const expectedOutput = `<!Doctype HTML>
<html>
<head>
	<script
		keep="me">
	</script>
</head>
<body>
</body>
</html>`;

	// ----- Parse and select attribute -----
	const extractedTags = await _extractTagsFromString(input);
	const scriptTag = extractedTags.scriptTags[0];
	const attrToRemove1 = scriptTag.attributes[0];
	const attrToRemove2 = scriptTag.attributes[2];

	// ----- Create fix -----
	const fix1 = new RemoveAttributeFix(scriptTag, attrToRemove1);
	const fix2 = new RemoveAttributeFix(scriptTag, attrToRemove2);

	// ----- Run Autofix -----
	const result = await _runAutofix([fix1, fix2], input, t.context);

	// ----- Compare Autofix output with expected output -----
	t.truthy(result);
	t.is(Array.from(result.values())[0], expectedOutput, "Autofix output should match expected output");
});

test("Remove Attributes with special syntax from HTML tag", async (t) => {
	// This tests the handling of special syntax:
	// no-quotes = no quotes around the value
	// no-value = no value after the attribute name
	// x = single character as attribute name
	// , = single character as attribute name with no value

	const input = `<!Doctype HTML>
<html>
<head>
	<script no-quotes=remove
		keep="me"
		no-value
		2keep="me"
		x="remove"
		3keep="me"
		,>
	</script>
</head>
<body>
</body>
</html>`;

	const expectedOutput = `<!Doctype HTML>
<html>
<head>
	<script
		keep="me"
		2keep="me"
		3keep="me">
	</script>
</head>
<body>
</body>
</html>`;

	// ----- Parse and select attribute -----
	const extractedTags = await _extractTagsFromString(input);
	const scriptTag = extractedTags.scriptTags[0];
	const attrToRemove1 = scriptTag.attributes[0];
	const attrToRemove2 = scriptTag.attributes[2];
	const attrToRemove3 = scriptTag.attributes[4];
	const attrToRemove4 = scriptTag.attributes[6];

	// ----- Create fix -----
	const fix1 = new RemoveAttributeFix(scriptTag, attrToRemove1);
	const fix2 = new RemoveAttributeFix(scriptTag, attrToRemove2);
	const fix3 = new RemoveAttributeFix(scriptTag, attrToRemove3);
	const fix4 = new RemoveAttributeFix(scriptTag, attrToRemove4);

	// ----- Run Autofix -----
	const result = await _runAutofix([fix1, fix2, fix3, fix4], input, t.context);

	// ----- Compare Autofix output with expected output -----
	t.truthy(result);
	t.is(Array.from(result.values())[0], expectedOutput, "Autofix output should match expected output");
});

test("Remove Attributes with surrounding whitespace from HTML tag", async (t) => {
	const input = `<!Doctype HTML>
<html>
<head>
	<script   remove="me"
		keep="me"
		    remove="meToo">
	</script>
</head>
<body>
</body>
</html>`;

	const expectedOutput = `<!Doctype HTML>
<html>
<head>
	<script
		keep="me">
	</script>
</head>
<body>
</body>
</html>`;

	// ----- Parse and select attribute -----
	const extractedTags = await _extractTagsFromString(input);
	const scriptTag = extractedTags.scriptTags[0];
	const attrToRemove1 = scriptTag.attributes[0];
	const attrToRemove2 = scriptTag.attributes[2];

	// ----- Create fix -----
	const fix1 = new RemoveAttributeFix(scriptTag, attrToRemove1);
	const fix2 = new RemoveAttributeFix(scriptTag, attrToRemove2);

	// ----- Run Autofix -----
	const result = await _runAutofix([fix1, fix2], input, t.context);

	// ----- Compare Autofix output with expected output -----
	t.truthy(result);
	t.is(Array.from(result.values())[0], expectedOutput, "Autofix output should match expected output");
});

test("Remove Attributes with special whitespace from HTML tag", async (t) => {
	// This tests the handling of whitespace between attribute names and values:
	// x & y & z are single character attributes
	const input = `<!Doctype HTML>
<html>
<head>
	<script remove ="me"
		keep="me"
		remove= "meToo"
		2keep="me"
		remove = "meToo2"
		3keep="me"
		x ="remove"
		4keep="me"
		y= "remove"
		5keep="me"
		z = "remove"
		6keep="me">
	</script>
</head>
<body>
</body>
</html>`;

	const expectedOutput = `<!Doctype HTML>
<html>
<head>
	<script
		keep="me"
		2keep="me"
		3keep="me"
		4keep="me"
		5keep="me"
		6keep="me">
	</script>
</head>
<body>
</body>
</html>`;

	// ----- Parse and select attribute -----
	const extractedTags = await _extractTagsFromString(input);
	const scriptTag = extractedTags.scriptTags[0];
	const attrToRemove1 = scriptTag.attributes[0];
	const attrToRemove2 = scriptTag.attributes[2];
	const attrToRemove3 = scriptTag.attributes[4];
	const attrToRemove4 = scriptTag.attributes[6];
	const attrToRemove5 = scriptTag.attributes[8];
	const attrToRemove6 = scriptTag.attributes[10];

	// ----- Create fix -----
	const fix1 = new RemoveAttributeFix(scriptTag, attrToRemove1);
	const fix2 = new RemoveAttributeFix(scriptTag, attrToRemove2);
	const fix3 = new RemoveAttributeFix(scriptTag, attrToRemove3);
	const fix4 = new RemoveAttributeFix(scriptTag, attrToRemove4);
	const fix5 = new RemoveAttributeFix(scriptTag, attrToRemove5);
	const fix6 = new RemoveAttributeFix(scriptTag, attrToRemove6);

	// ----- Run Autofix -----
	const result = await _runAutofix([fix1, fix2, fix3, fix4, fix5, fix6], input, t.context);

	// ----- Compare Autofix output with expected output -----
	t.truthy(result);
	t.is(Array.from(result.values())[0], expectedOutput, "Autofix output should match expected output");
});

test("Remove Unquoted Attributes with special whitespace from HTML tag", async (t) => {
	// This tests the handling of whitespace between attribute names and unquoted values:
	// x & y & z are single character attributes
	const input = `<!Doctype HTML>
<html>
<head>
	<script remove =me
		keep="me"
		remove= meToo
		2keep="me"
		remove = meToo2
		3keep="me"
		x =remove
		4keep="me"
		y= remove
		5keep="me"
		z = remove
		6keep="me">
	</script>
</head>
<body>
</body>
</html>`;

	const expectedOutput = `<!Doctype HTML>
<html>
<head>
	<script
		keep="me"
		2keep="me"
		3keep="me"
		4keep="me"
		5keep="me"
		6keep="me">
	</script>
</head>
<body>
</body>
</html>`;

	// ----- Parse and select attribute -----
	const extractedTags = await _extractTagsFromString(input);
	const scriptTag = extractedTags.scriptTags[0];
	const attrToRemove1 = scriptTag.attributes[0];
	const attrToRemove2 = scriptTag.attributes[2];
	const attrToRemove3 = scriptTag.attributes[4];
	const attrToRemove4 = scriptTag.attributes[6];
	const attrToRemove5 = scriptTag.attributes[8];
	const attrToRemove6 = scriptTag.attributes[10];

	// ----- Create fix -----
	const fix1 = new RemoveAttributeFix(scriptTag, attrToRemove1);
	const fix2 = new RemoveAttributeFix(scriptTag, attrToRemove2);
	const fix3 = new RemoveAttributeFix(scriptTag, attrToRemove3);
	const fix4 = new RemoveAttributeFix(scriptTag, attrToRemove4);
	const fix5 = new RemoveAttributeFix(scriptTag, attrToRemove5);
	const fix6 = new RemoveAttributeFix(scriptTag, attrToRemove6);

	// ----- Run Autofix -----
	const result = await _runAutofix([fix1, fix2, fix3, fix4, fix5, fix6], input, t.context);

	// ----- Compare Autofix output with expected output -----
	t.truthy(result);
	t.is(Array.from(result.values())[0], expectedOutput, "Autofix output should match expected output");
});

test("Remove NoValue Single Character Attributes from HTML tag", async (t) => {
	// This tests the handling of edge cases where attributes have no value and are single characters:
	const input = `<!Doctype HTML>
<html>
<head>
	<script remove-me
		keep="me"
		remove-me-2
		2keep="me"
		,
		,
		.
		3keep="me">
	</script>
</head>
<body>
</body>
</html>`;

	const expectedOutput = `<!Doctype HTML>
<html>
<head>
	<script
		keep="me"
		2keep="me"
		3keep="me">
	</script>
</head>
<body>
</body>
</html>`;

	// ----- Parse and select attribute -----
	const extractedTags = await _extractTagsFromString(input);
	const scriptTag = extractedTags.scriptTags[0];
	const attroToRemove1 = scriptTag.attributes[0];
	const attroToRemove2 = scriptTag.attributes[2];
	const attroToRemove3 = scriptTag.attributes[4];
	const attroToRemove4 = scriptTag.attributes[5];
	const attroToRemove5 = scriptTag.attributes[6];

	// ----- Create fix -----
	const fix1 = new RemoveAttributeFix(scriptTag, attroToRemove1);
	const fix2 = new RemoveAttributeFix(scriptTag, attroToRemove2);
	const fix3 = new RemoveAttributeFix(scriptTag, attroToRemove3);
	const fix4 = new RemoveAttributeFix(scriptTag, attroToRemove4);
	const fix5 = new RemoveAttributeFix(scriptTag, attroToRemove5);

	// ----- Run Autofix -----
	const result = await _runAutofix([fix1, fix2, fix3, fix4, fix5], input, t.context);

	// ----- Compare Autofix output with expected output -----
	t.truthy(result);
	t.is(Array.from(result.values())[0], expectedOutput, "Autofix output should match expected output");
});
