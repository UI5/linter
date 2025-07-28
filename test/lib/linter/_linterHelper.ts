import anyTest, {ExecutionContext, TestFn} from "ava";
import sinonGlobal, {SinonSpy, SinonStub} from "sinon";
import util from "util";
import {readdirSync} from "node:fs";
import path from "node:path";
import esmock from "esmock";
import SourceFileLinter from "../../../src/linter/ui5Types/SourceFileLinter.js";
import type {LinterOptions, LintResult} from "../../../src/linter/LinterContext.js";
import SharedLanguageService from "../../../src/linter/ui5Types/SharedLanguageService.js";
import autofix, {AutofixOptions, AutofixResult} from "../../../src/autofix/autofix.js";
import {RULES} from "../../../src/linter/messages.js";

// Override getDeprecationText as we do not have control over the deprecated texts and they could
// change anytime creating false positive failing tests. That way is ensured consistent and testable behavior.
SourceFileLinter.prototype.getDeprecationText = () => "Deprecated test message";

util.inspect.defaultOptions.depth = 4; // Increase AVA's printing depth since coverageInfo objects are on level 4

const test = anyTest as TestFn<{
	sinon: sinonGlobal.SinonSandbox;
	lintFile: SinonStub<[LinterOptions, SharedLanguageService], Promise<LintResult[]>>;
	autofixSpy: SinonSpy<[AutofixOptions], Promise<AutofixResult>>;
	sharedLanguageService: SharedLanguageService; // Has to be defined by the actual test
}>;

export async function createMockedLinterModules(sinon: sinonGlobal.SinonSandbox = sinonGlobal) {
	const typeLinterModule = await esmock("../../../src/linter/ui5Types/TypeLinter.js", {
		"../../../src/linter/ui5Types/SourceFileLinter.js": SourceFileLinter,
	});

	const autofixSpy =
		sinon.stub<Parameters<typeof autofix>, ReturnType<typeof autofix>>()
			.callsFake((options: AutofixOptions) => autofix(options));

	const writeFileStub = sinon.stub().resolves();

	const lintWorkspaceModule = await esmock("../../../src/linter/lintWorkspace.js", {
		"../../../src/linter/ui5Types/TypeLinter.js": typeLinterModule,
		"../../../src/autofix/autofix.js": autofixSpy,
		"node:fs/promises": {
			// Prevent tests from update fixtures on the filesystem (autofix)
			writeFile: writeFileStub,
		},
	});

	const lintModule = await esmock("../../../src/linter/linter.js", {
		"../../../src/linter/lintWorkspace.js": lintWorkspaceModule,
	});

	const indexModule = await esmock("../../../src/index.js", {
		"../../../src/linter/linter.js": lintModule,
	});

	return {lintModule, indexModule, autofixSpy, writeFileStub};
}

// Helper function to compare file paths since we don't want to store those in the snapshots
export function assertExpectedLintResults(
	t: ExecutionContext, res: LintResult[], basePath: string, filePaths: string[]) {
	res.forEach((lintResult) => {
		// Normalize file paths to POSIX format
		if (!filePaths.includes(lintResult.filePath) &&
			!filePaths.includes(path.posix.normalize(lintResult.filePath.replace(/\\/g, "/")))) {
			t.fail(
				`Unexpected lint result for file ${lintResult.filePath}. Expected: ${filePaths.join(", ")}. ` +
				`Result: ${JSON.stringify(lintResult)}`
			);
		}
	});
}

let hooksDefined = false;

function defineHooks() {
	if (hooksDefined) {
		return;
	}
	test.before(async (t) => {
		t.context.sharedLanguageService = new SharedLanguageService();

		// Workaround for debugging purposes:
		// For some files, such as lintWorkspace.ts and autofix.ts the original files are not displayed
		// when debugging them. Strangely this only happens for the first test run and just mocking the
		// files initial before the first test run works around the issue.
		await createMockedLinterModules();
	});

	test.beforeEach(async (t) => {
		const {lintModule: {lintFile}, autofixSpy} = await createMockedLinterModules();
		t.context.lintFile = lintFile;
		t.context.autofixSpy = autofixSpy;
	});
	hooksDefined = true;
}

// Helper function to create linting tests for all files in a directory
export function createTestsForFixtures(fixturesPath: string, fix = false) {
	defineHooks();
	try {
		const testFiles = readdirSync(fixturesPath, {withFileTypes: true, recursive: true}).filter((dirEntries) => {
			return dirEntries.isFile() && dirEntries.name !== ".DS_Store";
		}).map((dirEntries) => {
			return path.posix.join(
				// Resolve relative path OS dependant, but do the join in POSIX format
				path.relative(fixturesPath, dirEntries.parentPath || dirEntries.path),
				dirEntries.name
			);
		});
		if (!testFiles.length) {
			throw new Error(`Failed to find any fixtures in directory ${fixturesPath}`);
		}
		if (fixturesPath.includes("AsyncComponentFlags") || fixturesPath.includes("renderer")) {
			const dirName = path.basename(fixturesPath);
			testDefinition({
				testName: dirName,
				namespace: "mycomp",
				fileName: dirName,
				fixturesPath,
				filePaths: testFiles,
				fix,
			});
		} else {
			for (const fileName of testFiles) {
				if (!fileName.endsWith(".js") &&
					!fileName.endsWith(".ts") &&
					!fileName.endsWith(".xml") &&
					!fileName.endsWith(".json") &&
					!fileName.endsWith(".html") &&
					!fileName.endsWith(".yaml")) {
					// Ignore non-JavaScript, non-TypeScript, non-XML, non-JSON, non-HTML and non-YAML files
					continue;
				}

				testDefinition({
					testName: fileName,
					fileName,
					fixturesPath,
					filePaths: [fileName],
					fix,
				});
			}
		}
	} catch (err) {
		if (err instanceof Error) {
			throw new Error(
				`Failed to list files of directory ${fixturesPath}: ${err.message}`, {cause: err});
		}
		throw err;
	}
}

function testDefinition(
	{testName, fileName, fixturesPath, filePaths, namespace, fix}:
	{testName: string; fileName: string; fixturesPath: string;
		filePaths: string[]; namespace?: string; fix?: boolean;}) {
	let defineTest = test.serial;

	if (fileName.startsWith("_")) {
		// Skip tests for files starting with underscore
		defineTest = defineTest.skip as typeof test;
		testName = fileName.slice(1);
	} else if (fileName.startsWith("only_")) {
		// Only run test when file starts with only_
		defineTest = defineTest.only as typeof test;
		testName = fileName.slice(5);
	}
	// Executing linting in parallel might lead to OOM errors in the CI
	// Therefore always use serial
	defineTest(`General: ${testName}`, async (t) => {
		const {lintFile} = t.context;

		const posixFilePaths = filePaths.map((fileName) => path.posix.join(...fileName.split("\\")));
		const res = await lintFile({
			rootDir: fixturesPath,
			namespace,
			filePatterns: posixFilePaths,
			coverage: true,
			details: true,
			fix,
		}, t.context.sharedLanguageService);
		assertExpectedLintResults(t, res, fixturesPath,
			posixFilePaths.map((fileName) => namespace ? path.posix.join("resources", namespace, fileName) : fileName));

		const parsingErrors = new Map<string, string[]>();
		const autofixErrors = new Map<string, string[]>();
		res.forEach((result) => {
			const resultFileName = path.basename(result.filePath);
			if (resultFileName === fileName) {
				// Use "clean" testName instead of the fileName which might contain modifiers like "only_"
				result.filePath = testName;
			} else {
				// Use only the file name without the directory (which might contain modifiers)
				result.filePath = resultFileName;
			}

			for (const msg of result.messages) {
				if (msg.ruleId === RULES["parsing-error"]) {
					if (parsingErrors.has(result.filePath)) {
						parsingErrors.get(result.filePath)!.push(msg.message);
					} else {
						parsingErrors.set(result.filePath, [msg.message]);
					}
				} else if (msg.ruleId === RULES["autofix-error"]) {
					if (autofixErrors.has(result.filePath)) {
						autofixErrors.get(result.filePath)!.push(msg.message);
					} else {
						autofixErrors.set(result.filePath, [msg.message]);
					}
				}
			}
		});

		if (parsingErrors.size) {
			for (const [filePath, errors] of parsingErrors) {
				t.snapshot(errors, `Parsing Errors: ${filePath}`);
			}
		}

		if (autofixErrors.size) {
			for (const [filePath, errors] of autofixErrors) {
				t.snapshot(errors, `Autofix Errors: ${filePath}`);
			}
		}

		if (fix) {
			t.truthy(t.context.autofixSpy.callCount >= 1);
			for (let i = t.context.autofixSpy.callCount - 1; i >= 0; i--) {
				const autofixResult = await t.context.autofixSpy.getCall(i).returnValue;
				const autofixResultEntries = Array.from(autofixResult.entries());
				autofixResultEntries.sort((a, b) => a[0].localeCompare(b[0]));
				for (const [filePath, content] of autofixResultEntries) {
					t.snapshot(content, `AutofixResult iteration #${i}: ${filePath}`);
				}
			}
		}

		t.snapshot(res, `LintResult: ${testName}`);
	});
}

export function preprocessLintResultsForSnapshot(res: LintResult[]) {
	res.forEach((message) => {
		// Convert to posix paths to align snapshots across platforms
		message.filePath = message.filePath.replace(/\\/g, "/");
	});
	return res;
}

export function runLintRulesTests(filePath: string, fixturesPath?: string, fix = false) {
	if (!fixturesPath) {
		const __dirname = path.dirname(filePath);
		const fileName = path.basename(filePath, ".ts");
		fixturesPath = path.join(__dirname, "..", "..", "..", "fixtures", "linter", "rules", fileName);
	}

	createTestsForFixtures(fixturesPath, fix);
}
