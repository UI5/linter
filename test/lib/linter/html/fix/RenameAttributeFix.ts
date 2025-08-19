/* This test file is designed to test generic use cases of RenameAttributeFix.
These include not only UI5 use cases. We want to test the functionality of
renaming any kind of attribute inside any kind of HTML construct. */

import anyTest, {TestFn} from "ava";
import sinonGlobal from "sinon";
import esmock from "esmock";
import {extractHTMLTags} from "../../../../../src/linter/html/parser.js";
import {Readable} from "node:stream";
import autofix, {AutofixResource} from "../../../../../src/autofix/autofix.js";
import LinterContext, {RawLintMessage} from "../../../../../src/linter/LinterContext.js";
import {addDependencies} from "../../../../../src/autofix/amdImports.js";
import {createResource} from "@ui5/fs/resourceFactory";
import {MESSAGE} from "../../../../../src/linter/messages.js";
import Fix from "../../../../../src/linter/ui5Types/fix/Fix.js";
import RenameAttributeFix from "../../../../../src/linter/html/fix/RenameAttributeFix.js";

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

test("Rename Attribute from HTML tag", async (t) => {
	const input = `<!Doctype HTML>
<html>
<head>
	<script rename-me="abc">
	</script>
</head>
<body>
</body>
</html>`;

	const expectedOutput = `<!Doctype HTML>
<html>
<head>
	<script i-was-renamed="abc">
	</script>
</head>
<body>
</body>
</html>`;

	// ----- Parse and select attribute -----
	const extractedTags = await _extractTagsFromString(input);
	const scriptTag = extractedTags.scriptTags[0];
	const attrToRename = scriptTag.attributes[0];

	// ----- Create fix -----
	const fix = new RenameAttributeFix(attrToRename, "i-was-renamed");

	// ----- Run Autofix -----
	const result = await _runAutofix(fix, input, t.context);

	// ----- Compare Autofix output with expected output -----
	t.truthy(result);
	t.is(Array.from(result.values())[0], expectedOutput, "Autofix output should match expected output");
});

test("Rename Multiple Attributes from HTML tag", async (t) => {
	const input = `<!Doctype HTML>
<html>
<head>
	<script rename-me="abc"
		keep="me"
		rename-me-2="abc">
	</script>
</head>
<body>
</body>
</html>`;

	const expectedOutput = `<!Doctype HTML>
<html>
<head>
	<script i-was-renamed="abc"
		keep="me"
		i-was-renamed-2="abc">
	</script>
</head>
<body>
</body>
</html>`;

	// ----- Parse and select attribute -----
	const extractedTags = await _extractTagsFromString(input);
	const scriptTag = extractedTags.scriptTags[0];
	const attrToRename1 = scriptTag.attributes[0];
	const attrToRename2 = scriptTag.attributes[2];

	// ----- Create fix -----
	const fix1 = new RenameAttributeFix(attrToRename1, "i-was-renamed");
	const fix2 = new RenameAttributeFix(attrToRename2, "i-was-renamed-2");

	// ----- Run Autofix -----
	const result = await _runAutofix([fix1, fix2], input, t.context);

	// ----- Compare Autofix output with expected output -----
	t.truthy(result);
	t.is(Array.from(result.values())[0], expectedOutput, "Autofix output should match expected output");
});

test("Rename Attributes with special syntax from HTML tag", async (t) => {
	// This tests the handling of special syntax:
	// rename-me = no quotes around the value
	// rename-me-2 = no value after the attribute name
	// empty-value = empty value inside quotes
	// x = single character as attribute name
	// , = single character as attribute name with no value

	const input = `<!Doctype HTML>
<html>
<head>
	<script rename-me=abc
		keep="me"
		rename-me-2
		2keep="me"
		empty-value=""
		3keep="me"
		x="abc"
		4keep="me"
		,>
	</script>
</head>
<body>
</body>
</html>`;

	const expectedOutput = `<!Doctype HTML>
<html>
<head>
	<script i-was-renamed=abc
		keep="me"
		i-was-renamed-2
		2keep="me"
		i-was-renamed-3=""
		3keep="me"
		i-was-renamed-4="abc"
		4keep="me"
		i-was-renamed-5>
	</script>
</head>
<body>
</body>
</html>`;

	// ----- Parse and select attribute -----
	const extractedTags = await _extractTagsFromString(input);
	const scriptTag = extractedTags.scriptTags[0];
	const attroToRename1 = scriptTag.attributes[0];
	const attroToRename2 = scriptTag.attributes[2];
	const attroToRename3 = scriptTag.attributes[4];
	const attroToRename4 = scriptTag.attributes[6];
	const attroToRename5 = scriptTag.attributes[8];

	// ----- Create fix -----
	const fix1 = new RenameAttributeFix(attroToRename1, "i-was-renamed");
	const fix2 = new RenameAttributeFix(attroToRename2, "i-was-renamed-2");
	const fix3 = new RenameAttributeFix(attroToRename3, "i-was-renamed-3");
	const fix4 = new RenameAttributeFix(attroToRename4, "i-was-renamed-4");
	const fix5 = new RenameAttributeFix(attroToRename5, "i-was-renamed-5");

	// ----- Run Autofix -----
	const result = await _runAutofix([fix1, fix2, fix3, fix4, fix5], input, t.context);

	// ----- Compare Autofix output with expected output -----
	t.truthy(result);
	t.is(Array.from(result.values())[0], expectedOutput, "Autofix output should match expected output");
});

test("Rename Attributes with surrounding whitespace from HTML tag", async (t) => {
	const input = `<!Doctype HTML>
<html>
<head>
	<script   rename-me="abc"
		keep="me"
		    rename-me-2="abc">
	</script>
</head>
<body>
</body>
</html>`;

	const expectedOutput = `<!Doctype HTML>
<html>
<head>
	<script   i-was-renamed="abc"
		keep="me"
		    i-was-renamed-2="abc">
	</script>
</head>
<body>
</body>
</html>`;

	// ----- Parse and select attribute -----
	const extractedTags = await _extractTagsFromString(input);
	const scriptTag = extractedTags.scriptTags[0];
	const attrToRename1 = scriptTag.attributes[0];
	const attrToRename2 = scriptTag.attributes[2];

	// ----- Create fix -----
	const fix1 = new RenameAttributeFix(attrToRename1, "i-was-renamed");
	const fix2 = new RenameAttributeFix(attrToRename2, "i-was-renamed-2");

	// ----- Run Autofix -----
	const result = await _runAutofix([fix1, fix2], input, t.context);

	// ----- Compare Autofix output with expected output -----
	t.truthy(result);
	t.is(Array.from(result.values())[0], expectedOutput, "Autofix output should match expected output");
});

test("Rename Attributes with special whitespace from HTML tag", async (t) => {
	// This tests the handling of whitespace between attribute names and values:
	// x & y & z are single character attributes
	const input = `<!Doctype HTML>
<html>
<head>
	<script rename-me ="abc"
		keep="me"
		rename-me-2= "abc"
		2keep="me"
		rename-me-3 = "abc"
		3keep="me"
		x ="abc"
		4keep="me"
		y= "abc"
		5keep="me"
		z = "abc"
		6keep="me">
	</script>
</head>
<body>
</body>
</html>`;

	const expectedOutput = `<!Doctype HTML>
<html>
<head>
	<script i-was-renamed ="abc"
		keep="me"
		i-was-renamed-2= "abc"
		2keep="me"
		i-was-renamed-3 = "abc"
		3keep="me"
		i-was-renamed-4 ="abc"
		4keep="me"
		i-was-renamed-5= "abc"
		5keep="me"
		i-was-renamed-6 = "abc"
		6keep="me">
	</script>
</head>
<body>
</body>
</html>`;

	// ----- Parse and select attribute -----
	const extractedTags = await _extractTagsFromString(input);
	const scriptTag = extractedTags.scriptTags[0];
	const attrToRename1 = scriptTag.attributes[0];
	const attrToRename2 = scriptTag.attributes[2];
	const attrToRename3 = scriptTag.attributes[4];
	const attrToRename4 = scriptTag.attributes[6];
	const attrToRename5 = scriptTag.attributes[8];
	const attrToRename6 = scriptTag.attributes[10];

	// ----- Create fix -----
	const fix1 = new RenameAttributeFix(attrToRename1, "i-was-renamed");
	const fix2 = new RenameAttributeFix(attrToRename2, "i-was-renamed-2");
	const fix3 = new RenameAttributeFix(attrToRename3, "i-was-renamed-3");
	const fix4 = new RenameAttributeFix(attrToRename4, "i-was-renamed-4");
	const fix5 = new RenameAttributeFix(attrToRename5, "i-was-renamed-5");
	const fix6 = new RenameAttributeFix(attrToRename6, "i-was-renamed-6");

	// ----- Run Autofix -----
	const result = await _runAutofix([fix1, fix2, fix3, fix4, fix5, fix6], input, t.context);

	// ----- Compare Autofix output with expected output -----
	t.truthy(result);
	t.is(Array.from(result.values())[0], expectedOutput, "Autofix output should match expected output");
});

test("Rename Unquoted Attributes with special whitespace from HTML tag", async (t) => {
	// This tests the handling of whitespace between attribute names and unquoted values:
	// x & y & z are single character attributes
	const input = `<!Doctype HTML>
<html>
<head>
	<script rename-me =abc
		keep="me"
		rename-me-2= abc
		2keep="me"
		rename-me-3 = abc
		3keep="me"
		x =abc
		4keep="me"
		y= abc
		5keep="me"
		z = abc
		6keep="me">
	</script>
</head>
<body>
</body>
</html>`;

	const expectedOutput = `<!Doctype HTML>
<html>
<head>
	<script i-was-renamed =abc
		keep="me"
		i-was-renamed-2= abc
		2keep="me"
		i-was-renamed-3 = abc
		3keep="me"
		i-was-renamed-4 =abc
		4keep="me"
		i-was-renamed-5= abc
		5keep="me"
		i-was-renamed-6 = abc
		6keep="me">
	</script>
</head>
<body>
</body>
</html>`;

	// ----- Parse and select attribute -----
	const extractedTags = await _extractTagsFromString(input);
	const scriptTag = extractedTags.scriptTags[0];
	const attrToRename1 = scriptTag.attributes[0];
	const attrToRename2 = scriptTag.attributes[2];
	const attrToRename3 = scriptTag.attributes[4];
	const attrToRename4 = scriptTag.attributes[6];
	const attrToRename5 = scriptTag.attributes[8];
	const attrToRename6 = scriptTag.attributes[10];

	// ----- Create fix -----
	const fix1 = new RenameAttributeFix(attrToRename1, "i-was-renamed");
	const fix2 = new RenameAttributeFix(attrToRename2, "i-was-renamed-2");
	const fix3 = new RenameAttributeFix(attrToRename3, "i-was-renamed-3");
	const fix4 = new RenameAttributeFix(attrToRename4, "i-was-renamed-4");
	const fix5 = new RenameAttributeFix(attrToRename5, "i-was-renamed-5");
	const fix6 = new RenameAttributeFix(attrToRename6, "i-was-renamed-6");

	// ----- Run Autofix -----
	const result = await _runAutofix([fix1, fix2, fix3, fix4, fix5, fix6], input, t.context);

	// ----- Compare Autofix output with expected output -----
	t.truthy(result);
	t.is(Array.from(result.values())[0], expectedOutput, "Autofix output should match expected output");
});

test("Rename NoValue Single Character Attributes from HTML tag", async (t) => {
	// This tests the handling of edge cases where attributes have no value and are single characters:
	const input = `<!Doctype HTML>
<html>
<head>
	<script rename-me
		keep="me"
		rename-me-2
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
	<script i-was-renamed
		keep="me"
		i-was-renamed-2
		2keep="me"
		i-was-renamed-3
		i-was-renamed-4
		i-was-renamed-5
		3keep="me">
	</script>
</head>
<body>
</body>
</html>`;

	// ----- Parse and select attribute -----
	const extractedTags = await _extractTagsFromString(input);
	const scriptTag = extractedTags.scriptTags[0];
	const attroToRename1 = scriptTag.attributes[0];
	const attroToRename2 = scriptTag.attributes[2];
	const attroToRename3 = scriptTag.attributes[4];
	const attroToRename4 = scriptTag.attributes[5];
	const attroToRename5 = scriptTag.attributes[6];

	// ----- Create fix -----
	const fix1 = new RenameAttributeFix(attroToRename1, "i-was-renamed");
	const fix2 = new RenameAttributeFix(attroToRename2, "i-was-renamed-2");
	const fix3 = new RenameAttributeFix(attroToRename3, "i-was-renamed-3");
	const fix4 = new RenameAttributeFix(attroToRename4, "i-was-renamed-4");
	const fix5 = new RenameAttributeFix(attroToRename5, "i-was-renamed-5");

	// ----- Run Autofix -----
	const result = await _runAutofix([fix1, fix2, fix3, fix4, fix5], input, t.context);

	// ----- Compare Autofix output with expected output -----
	t.truthy(result);
	t.is(Array.from(result.values())[0], expectedOutput, "Autofix output should match expected output");
});
