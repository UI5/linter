import anyTest, {TestFn} from "ava";
import sinonGlobal from "sinon";
import path from "node:path";
import {fileURLToPath} from "node:url";
import esmock from "esmock";
import {
	createTestsForFixtures, assertExpectedLintResults,
	createMockedLinterModules, preprocessLintResultsForSnapshot,
} from "./_linterHelper.js";
import {UI5LinterEngine} from "../../../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesBasePath = path.join(__dirname, "..", "..", "fixtures", "linter");
const fixturesGeneralPath = path.join(fixturesBasePath, "general");
const fixturesProjectsPath = path.join(fixturesBasePath, "projects");

const test = anyTest as TestFn<{
	sinon: sinonGlobal.SinonSandbox;
	linterEngine: UI5LinterEngine;
}>;

test.before(async (t) => {
	t.context.sinon = sinonGlobal.createSandbox();

	const {indexModule: {UI5LinterEngine}} = await createMockedLinterModules(t.context.sinon);
	t.context.linterEngine = new UI5LinterEngine();
});
test.afterEach.always((t) => {
	t.context.sinon.restore();
});

// Define tests for each file in the fixtures/linter/general directory
createTestsForFixtures(fixturesGeneralPath);

// Test project fixtures individually
test.serial("lint: All files of com.ui5.troublesome.app", async (t) => {
	const projectPath = path.join(fixturesProjectsPath, "com.ui5.troublesome.app");
	const {linterEngine} = t.context;

	const res = await linterEngine.lint({
		rootDir: projectPath,
		filePatterns: [],
		coverage: true,
		details: true,
	});

	t.snapshot(preprocessLintResultsForSnapshot(res));
});

test.serial("lint: Some files of com.ui5.troublesome.app (without details / coverage)", async (t) => {
	const projectPath = path.join(fixturesProjectsPath, "com.ui5.troublesome.app");
	const filePaths = [
		// Minimatch requires POSIX
		path.posix.join("webapp", "controller", "BaseController.js"),
		path.posix.join("webapp", "controller", "App.controller.js"),
		path.posix.join("webapp", "Component.js"),
	];
	const {linterEngine} = t.context;

	const res = await linterEngine.lint({
		rootDir: projectPath,
		filePatterns: filePaths,
	});

	assertExpectedLintResults(t, res, projectPath, [
		path.join("webapp", "model", "models.js"),
		// Comparing files requires platform specific separators,
		// so, translating POSIX to platform specific.
		...filePaths.map((filename) => filename.replaceAll("/", path.sep)),
	]);

	t.snapshot(preprocessLintResultsForSnapshot(res));
});

test.serial("lint: Only /webapp folder from com.ui5.troublesome.app (without details / coverage)", async (t) => {
	const projectPath = path.join(fixturesProjectsPath, "com.ui5.troublesome.app");
	const filePaths = [
		// Minimatch requires POSIX
		"webapp/",
	];
	const {linterEngine} = t.context;

	const res = await linterEngine.lint({
		rootDir: projectPath,
		filePatterns: filePaths,
	});

	t.snapshot(preprocessLintResultsForSnapshot(res));
});

test.serial("lint: One file of com.ui5.troublesome.app (without details / coverage)", async (t) => {
	const projectPath = path.join(fixturesProjectsPath, "com.ui5.troublesome.app");
	const filePaths = [
		// Minimatch requires POSIX
		path.posix.join("webapp", "controller", "App.controller.js"),
	];
	const {linterEngine} = t.context;

	const res = await linterEngine.lint({
		rootDir: projectPath,
		filePatterns: filePaths,
	});

	assertExpectedLintResults(t, res, projectPath, [
		// Comparing files requires platform specific separators,
		// so, translating POSIX to platform specific.
		...filePaths.map((filename) => filename.replaceAll("/", path.sep)),
	]);

	t.snapshot(preprocessLintResultsForSnapshot(res));
});

test.serial("lint: com.ui5.troublesome.app with unmatched patterns", async (t) => {
	const projectPath = path.join(fixturesProjectsPath, "com.ui5.troublesome.app");

	const {linterEngine} = t.context;

	await t.throwsAsync(linterEngine.lint({
		rootDir: projectPath,
		config: "ui5lint.config.unmatched-patterns.mjs",
	}), {
		message: `Specified file patterns 'unmatched-pattern1', ` +
			`'unmatched-pattern2', 'unmatched-pattern3' did not match any resource`,
	});
});

test.serial("lint: com.ui5.troublesome.app with files property in ui5lint.config", async (t) => {
	const projectPath = path.join(fixturesProjectsPath, "com.ui5.troublesome.app");

	const {linterEngine} = t.context;

	const res = await linterEngine.lint({
		rootDir: projectPath,
		config: "ui5lint.config.matched-patterns.mjs",
	});

	t.snapshot(preprocessLintResultsForSnapshot(res));
});

test.serial("lint: All files of library.with.custom.paths", async (t) => {
	const projectPath = path.join(fixturesProjectsPath, "library.with.custom.paths");
	const {linterEngine} = t.context;

	const res = await linterEngine.lint({
		rootDir: projectPath,
		filePatterns: [],
		coverage: true,
		details: true,
	});

	t.snapshot(preprocessLintResultsForSnapshot(res));
});

test.serial("lint: Ignore files from library.with.custom.paths", async (t) => {
	const projectPath = path.join(fixturesProjectsPath, "library.with.custom.paths");
	const {linterEngine} = t.context;

	const res = await linterEngine.lint({
		rootDir: projectPath,
		filePatterns: [],
		coverage: true,
		details: true,
		ignorePatterns: [
			"src/",
			"!src/main/",
			"./ui5.yaml", // Relative paths starting with "./" should match the same as without it
		],
	});

	t.snapshot(preprocessLintResultsForSnapshot(res));
});

test.serial("lint: All files of library with sap.f namespace", async (t) => {
	const projectPath = path.join(fixturesProjectsPath, "sap.f");
	const {linterEngine} = t.context;

	const res = await linterEngine.lint({
		rootDir: projectPath,
		filePatterns: [],
		coverage: true,
		details: true,
	});

	t.snapshot(preprocessLintResultsForSnapshot(res));
});

test.serial("lint: All files of mocked minimal sap.ui.core library", async (t) => {
	// This sap.ui.core library contains a minimal version of the base classes of UI5
	// so that the linter can be tested with having them available in the project instead
	// of just having the type definitions.

	const projectPath = path.join(fixturesProjectsPath, "sap.ui.core");
	const {linterEngine} = t.context;

	const res = await linterEngine.lint({
		rootDir: projectPath,
		filePatterns: [],
		coverage: true,
		details: true,
	});

	t.snapshot(preprocessLintResultsForSnapshot(res));
});

test.serial("lint: File out of the namespace of sap.ui.core", async (t) => {
	const projectPath = path.join(fixturesProjectsPath, "sap.ui.core");
	const {linterEngine} = t.context;

	const res = await linterEngine.lint({
		rootDir: projectPath,
		filePatterns: ["src/ui5loader.js"],
		coverage: true,
		details: true,
	});

	t.snapshot(preprocessLintResultsForSnapshot(res));
});

test.serial("lint: All files of library with sap.ui.suite namespace", async (t) => {
	const projectPath = path.join(fixturesProjectsPath, "sap.ui.suite");
	const {linterEngine} = t.context;

	const res = await linterEngine.lint({
		rootDir: projectPath,
		filePatterns: [],
		coverage: true,
		details: true,
	});

	t.snapshot(preprocessLintResultsForSnapshot(res));
});

test.serial("lint: All files of library with sap.ui.unified namespace", async (t) => {
	const projectPath = path.join(fixturesProjectsPath, "sap.ui.unified");
	const {linterEngine} = t.context;

	const res = await linterEngine.lint({
		rootDir: projectPath,
	});

	t.snapshot(preprocessLintResultsForSnapshot(res));
});

test.serial("lint: All files of com.ui5.troublesome.app with custom config", async (t) => {
	const projectPath = path.join(fixturesProjectsPath, "com.ui5.troublesome.app");
	const {linterEngine} = t.context;

	const res = await linterEngine.lint({
		rootDir: projectPath,
		filePatterns: [],
		coverage: true,
		details: true,
		config: "./ui5lint-custom.config.cjs",
	});

	t.snapshot(preprocessLintResultsForSnapshot(res));
});

test.serial("lint: com.ui5.troublesome.app with custom UI5 config", async (t) => {
	const projectPath = path.join(fixturesProjectsPath, "com.ui5.troublesome.app");
	const {linterEngine} = t.context;

	const res = await linterEngine.lint({
		rootDir: projectPath,
		filePatterns: [],
		coverage: true,
		details: true,
		ui5Config: "./configs/ui5-custom.yaml",
	});

	t.snapshot(preprocessLintResultsForSnapshot(res));
});

test.serial("lint: com.ui5.troublesome.app with custom UI5 config which does NOT exist", async (t) => {
	const projectPath = path.join(fixturesProjectsPath, "com.ui5.troublesome.app");
	const {linterEngine} = t.context;
	const ui5Config = "./configs/ui5-DOES-NOT-EXIST.yaml";

	await t.throwsAsync(linterEngine.lint({
		rootDir: projectPath,
		filePatterns: [],
		coverage: true,
		details: true,
		ui5Config,
	}), {message: `Unable to find UI5 config file '${ui5Config}'`});
});

test.serial("lint: getProjectGraph with different directory structures", async (t) => {
	const graphFromObjectStub = t.context.sinon.stub().resolves();
	const {__localFunctions__} = await esmock("../../../src/linter/linter.js", {
		"@ui5/project/graph": {
			graphFromObject: graphFromObjectStub,
		},
	});

	const {getProjectGraph} = __localFunctions__;

	const basePath = path.join(fixturesProjectsPath, "legacy-dirs");

	// Legacy app structures
	const appA = path.join(basePath, "legacy.app.a");
	const appB = path.join(basePath, "legacy.app.b");
	const libA = path.join(basePath, "legacy.lib.a");
	const libB = path.join(basePath, "legacy.lib.b");
	const libC = path.join(basePath, "legacy.lib.c");

	await getProjectGraph(appA);
	await getProjectGraph(appB);
	await getProjectGraph(libA);
	await getProjectGraph(libB);
	await getProjectGraph(libC);

	t.is(graphFromObjectStub.callCount, 5);
	t.deepEqual(graphFromObjectStub.getCall(0).args[0], {
		dependencyTree: {
			dependencies: [],
			id: "ui5-linter-target",
			path: appA,
			version: "1.0.0",
		},
		resolveFrameworkDependencies: false,
		rootConfigPath: undefined,
		rootConfiguration: {
			metadata: {
				name: "ui5-linter-project",
			},
			resources: {
				configuration: {
					paths: {
						webapp: "WebContent",
					},
				},
			},
			specVersion: "4.0",
			type: "application",
		},
	});
	t.deepEqual(graphFromObjectStub.getCall(1).args[0], {
		dependencyTree: {
			dependencies: [],
			id: "ui5-linter-target",
			path: appB,
			version: "1.0.0",
		},
		resolveFrameworkDependencies: false,
		rootConfigPath: undefined,
		rootConfiguration: {
			metadata: {
				name: "ui5-linter-project",
			},
			resources: {
				configuration: {
					paths: {
						webapp: "src/main/webapp",
					},
				},
			},
			specVersion: "4.0",
			type: "application",
		},
	});
	t.deepEqual(graphFromObjectStub.getCall(2).args[0], {
		dependencyTree: {
			dependencies: [],
			id: "ui5-linter-target",
			path: libA,
			version: "1.0.0",
		},
		resolveFrameworkDependencies: false,
		rootConfigPath: undefined,
		rootConfiguration: {
			metadata: {
				name: "ui5-linter-project",
			},
			resources: {
				configuration: {
					paths: {
						src: "src/main/jslib",
						test: "src/test/jslib",
					},
				},
			},
			specVersion: "4.0",
			type: "library",
		},
	});
	t.deepEqual(graphFromObjectStub.getCall(3).args[0], {
		dependencyTree: {
			dependencies: [],
			id: "ui5-linter-target",
			path: libB,
			version: "1.0.0",
		},
		resolveFrameworkDependencies: false,
		rootConfigPath: undefined,
		rootConfiguration: {
			metadata: {
				name: "ui5-linter-project",
			},
			resources: {
				configuration: {
					paths: {
						src: "src/main/uilib",
						test: "src/test/uilib",
					},
				},
			},
			specVersion: "4.0",
			type: "library",
		},
	});
	t.deepEqual(graphFromObjectStub.getCall(4).args[0], {
		dependencyTree: {
			dependencies: [],
			id: "ui5-linter-target",
			path: libC,
			version: "1.0.0",
		},
		resolveFrameworkDependencies: false,
		rootConfigPath: undefined,
		rootConfiguration: {
			metadata: {
				name: "ui5-linter-project",
			},
			resources: {
				configuration: {
					paths: {
						src: "src/main/js",
						test: "src/test/js",
					},
				},
			},
			specVersion: "4.0",
			type: "library",
		},
	});
});

// Test project fixtures individually
test.serial("lint: Relative rootDir path throws an exception", async (t) => {
	const projectPath = path.join(fixturesProjectsPath, "com.ui5.troublesome.app");
	const {linterEngine} = t.context;

	await t.throwsAsync(() => {
		return linterEngine.lint({
			rootDir: path.relative(__dirname, projectPath),
			filePatterns: [],
			coverage: true,
			details: true,
		});
	});
});
