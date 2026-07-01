import anyTest, {TestFn} from "ava";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createMockedLinterModules, preprocessLintResultsForSnapshot} from "../linter/_linterHelper.js";
import type {UI5LinterEngine} from "../../../src/index.js";
import sinonGlobal, {SinonSpy} from "sinon";
import type {AutofixOptions, AutofixResult} from "../../../src/autofix/autofix.js";

const fixturesProjectsPath = fileURLToPath(new URL("../../fixtures/linter/projects", import.meta.url));

const test = anyTest as TestFn<{
	sinon: sinonGlobal.SinonSandbox;
	linterEngine: UI5LinterEngine;
	autofixSpy: SinonSpy<[AutofixOptions], Promise<AutofixResult>>;
	writeFileStub: sinonGlobal.SinonStub;
}>;

test.beforeEach(async (t) => {
	t.context.sinon = sinonGlobal.createSandbox();

	const {indexModule: {UI5LinterEngine}, autofixSpy, writeFileStub} =
		await createMockedLinterModules(t.context.sinon);
	t.context.linterEngine = new UI5LinterEngine();
	t.context.autofixSpy = autofixSpy;
	t.context.writeFileStub = writeFileStub;
});

test.afterEach.always((t) => {
	t.context.sinon.restore();
});

test.serial("lint: All files of library with sap.ui.unified namespace", async (t) => {
	const projectPath = path.join(fixturesProjectsPath, "sap.ui.unified");
	const {linterEngine} = t.context;

	const res = await linterEngine.lint({
		rootDir: projectPath,
		fix: true,
	});

	t.snapshot(preprocessLintResultsForSnapshot(res));
	t.truthy(t.context.autofixSpy.callCount >= 1);
	let expectedWrites = 0;
	for (let i = t.context.autofixSpy.callCount - 1; i >= 0; i--) {
		const autofixResult = await t.context.autofixSpy.getCall(i).returnValue;
		expectedWrites += autofixResult.size;
		const autofixResultEntries = Array.from(autofixResult.entries());
		autofixResultEntries.sort((a, b) => a[0].localeCompare(b[0]));
		for (const [filePath, content] of autofixResultEntries) {
			t.snapshot(content, `AutofixResult iteration #${i}: ${filePath}`);
		}
	}

	// Ensure that all files are written using an absolute path within the project
	t.is(t.context.writeFileStub.callCount, expectedWrites);
	const writeFilePaths = t.context.writeFileStub.args.map((args) => args[0]);
	for (const writeFilePath of writeFilePaths) {
		t.true(writeFilePath.startsWith(projectPath), `${writeFilePath} should start with ${projectPath}`);
	}
});

test.serial("lint: All files of library with sap.ui.core namespace", async (t) => {
	const projectPath = path.join(fixturesProjectsPath, "sap.ui.core");
	const {linterEngine} = t.context;

	const res = await linterEngine.lint({
		rootDir: projectPath,
		fix: true,
	});

	t.snapshot(preprocessLintResultsForSnapshot(res));
	t.truthy(t.context.autofixSpy.callCount >= 1);
	let expectedWrites = 0;
	for (let i = t.context.autofixSpy.callCount - 1; i >= 0; i--) {
		const autofixResult = await t.context.autofixSpy.getCall(i).returnValue;
		expectedWrites += autofixResult.size;
		const autofixResultEntries = Array.from(autofixResult.entries());
		autofixResultEntries.sort((a, b) => a[0].localeCompare(b[0]));
		for (const [filePath, content] of autofixResultEntries) {
			t.snapshot(content, `AutofixResult iteration #${i}: ${filePath}`);
		}
	}

	// Ensure that all files are written using an absolute path within the project
	t.is(t.context.writeFileStub.callCount, expectedWrites);
	const writeFilePaths = t.context.writeFileStub.args.map((args) => args[0]);
	for (const writeFilePath of writeFilePaths) {
		t.true(writeFilePath.startsWith(projectPath), `${writeFilePath} should start with ${projectPath}`);
	}
});

test.serial("lint: All files of globals application", async (t) => {
	const projectPath = path.join(fixturesProjectsPath, "globals");
	const {linterEngine} = t.context;

	const res = await linterEngine.lint({
		rootDir: projectPath,
		fix: true,
	});

	t.snapshot(preprocessLintResultsForSnapshot(res));
	t.truthy(t.context.autofixSpy.callCount >= 1);
	let expectedWrites = 0;
	for (let i = t.context.autofixSpy.callCount - 1; i >= 0; i--) {
		const autofixResult = await t.context.autofixSpy.getCall(i).returnValue;
		expectedWrites += autofixResult.size;
		const autofixResultEntries = Array.from(autofixResult.entries());
		autofixResultEntries.sort((a, b) => a[0].localeCompare(b[0]));
		for (const [filePath, content] of autofixResultEntries) {
			t.snapshot(content, `AutofixResult iteration #${i}: ${filePath}`);
		}
	}

	// Ensure that all files are written using an absolute path within the project
	t.is(t.context.writeFileStub.callCount, expectedWrites);
	const writeFilePaths = t.context.writeFileStub.args.map((args) => args[0]);
	for (const writeFilePath of writeFilePaths) {
		t.true(writeFilePath.startsWith(projectPath), `${writeFilePath} should start with ${projectPath}`);
	}
});
