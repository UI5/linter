/* This test file is designed to test special use cases with AnimationModeFix.
These include only UI5 use cases. We want to test the functionality of
fixing legacy AnimationMode attributes inside UI5 bootstrap script tags. */

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
import AnimationModeFix from "../../../../../src/linter/html/fix/AnimationModeFix.js";

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

test("Fix legacy AnimationMode Attribute inside UI5 Bootstrap tag (1)", async (t) => {
	// animation = "true" -> animation-mode = "full"
	const input = `<!Doctype HTML>
<html>
<head>
	<script id="sap-ui-bootstrap"
		data-sap-ui-animation="true">
	</script>
</head>
<body>
</body>
</html>`;

	const expectedOutput = `<!Doctype HTML>
<html>
<head>
	<script id="sap-ui-bootstrap"
		data-sap-ui-animation-mode="full">
	</script>
</head>
<body>
</body>
</html>`;

	// ----- Parse and select attribute -----
	const extractedTags = await _extractTagsFromString(input);
	const scriptTag = extractedTags.scriptTags[0];
	const animationModeAttr = scriptTag.attributes[1];

	// ----- Create fix -----
	const fix = new AnimationModeFix(animationModeAttr);

	// ----- Run Autofix -----
	const result = await _runAutofix(fix, input, t.context);

	// ----- Compare Autofix output with expected output -----
	t.truthy(result);
	t.is(Array.from(result.values())[0], expectedOutput, "Autofix output should match expected output");
});

test("Fix legacy AnimationMode Attribute inside UI5 Bootstrap tag (2)", async (t) => {
	// animation = "x" -> animation-mode = "full"
	const input = `<!Doctype HTML>
<html>
<head>
	<script id="sap-ui-bootstrap"
		data-sap-ui-animation="x">
	</script>
</head>
<body>
</body>
</html>`;

	const expectedOutput = `<!Doctype HTML>
<html>
<head>
	<script id="sap-ui-bootstrap"
		data-sap-ui-animation-mode="full">
	</script>
</head>
<body>
</body>
</html>`;

	// ----- Parse and select attribute -----
	const extractedTags = await _extractTagsFromString(input);
	const scriptTag = extractedTags.scriptTags[0];
	const animationModeAttr = scriptTag.attributes[1];

	// ----- Create fix -----
	const fix = new AnimationModeFix(animationModeAttr);

	// ----- Run Autofix -----
	const result = await _runAutofix(fix, input, t.context);

	// ----- Compare Autofix output with expected output -----
	t.truthy(result);
	t.is(Array.from(result.values())[0], expectedOutput, "Autofix output should match expected output");
});

test("Fix legacy AnimationMode Attribute inside UI5 Bootstrap tag (3)", async (t) => {
	// animation = "false" -> animation-mode = "minimal"
	const input = `<!Doctype HTML>
<html>
<head>
	<script id="sap-ui-bootstrap"
		data-sap-ui-animation="false">
	</script>
</head>
<body>
</body>
</html>`;

	const expectedOutput = `<!Doctype HTML>
<html>
<head>
	<script id="sap-ui-bootstrap"
		data-sap-ui-animation-mode="minimal">
	</script>
</head>
<body>
</body>
</html>`;

	// ----- Parse and select attribute -----
	const extractedTags = await _extractTagsFromString(input);
	const scriptTag = extractedTags.scriptTags[0];
	const animationModeAttr = scriptTag.attributes[1];

	// ----- Create fix -----
	const fix = new AnimationModeFix(animationModeAttr);

	// ----- Run Autofix -----
	const result = await _runAutofix(fix, input, t.context);

	// ----- Compare Autofix output with expected output -----
	t.truthy(result);
	t.is(Array.from(result.values())[0], expectedOutput, "Autofix output should match expected output");
});

test("Fix misnamed AnimationMode Attribute inside UI5 Bootstrap tag", async (t) => {
	// animationMode -> animation-mode
	const input = `<!Doctype HTML>
<html>
<head>
	<script id="sap-ui-bootstrap"
		data-sap-ui-animationMode="false">
	</script>
</head>
<body>
</body>
</html>`;

	const expectedOutput = `<!Doctype HTML>
<html>
<head>
	<script id="sap-ui-bootstrap"
		data-sap-ui-animation-mode="minimal">
	</script>
</head>
<body>
</body>
</html>`;

	// ----- Parse and select attribute -----
	const extractedTags = await _extractTagsFromString(input);
	const scriptTag = extractedTags.scriptTags[0];
	const animationModeAttr = scriptTag.attributes[1];

	// ----- Create fix -----
	const fix = new AnimationModeFix(animationModeAttr);

	// ----- Run Autofix -----
	const result = await _runAutofix(fix, input, t.context);

	// ----- Compare Autofix output with expected output -----
	t.truthy(result);
	t.is(Array.from(result.values())[0], expectedOutput, "Autofix output should match expected output");
});
