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
			id: MESSAGE.NO_GLOBALS, // arbitrary
			position: {
				line: 0, // arbitrary
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

test("Remove Second Attribute from HTML tag", async (t) => {
	const input = `<!Doctype HTML>
<html>
<head>
	<script keep="me"
		remove="me">
	</script>
</head>
<body>
</body>
</html>`;

	const expectedOutput = `<!Doctype HTML>
<html>
<head>
	<script keep="me">
	</script>
</head>
<body>
</body>
</html>`;

	// ----- Parse and select attribute -----
	const extractedTags = await _extractTagsFromString(input);
	const scriptTag = extractedTags.scriptTags[0];
	const attrToRemove = scriptTag.attributes[1];

	// ----- Create fix -----
	const fix = new RemoveAttributeFix(scriptTag, attrToRemove);

	// ----- Run Autofix -----
	const result = await _runAutofix(fix, input, t.context);

	// ----- Compare Autofix output with expected output -----
	t.truthy(result);
	t.is(Array.from(result.values())[0], expectedOutput, "Autofix output should match expected output");
});

// TODO: Test
// - Remove multiple attributes
// - Remove attributes with different amounts of whitespace
// - Remove special attributes (e.g. no quotes, no value, single characters)
