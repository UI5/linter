import test from "ava";
import {createVirtualLanguageServiceHost} from "../../../../src/linter/ui5Types/host.js";
import LinterContext from "../../../../src/linter/LinterContext.js";
import SharedLanguageService from "../../../../src/linter/ui5Types/SharedLanguageService.js";

// List of TypeScript library files that are loaded by default in the virtual language service host.
const LIB_TYPE_FILES = [
	"/types/typescript/lib/lib.es5.d.ts",
	"/types/typescript/lib/lib.es2015.d.ts",
	"/types/typescript/lib/lib.es2016.d.ts",
	"/types/typescript/lib/lib.es2017.d.ts",
	"/types/typescript/lib/lib.es2018.d.ts",
	"/types/typescript/lib/lib.es2019.d.ts",
	"/types/typescript/lib/lib.es2020.d.ts",
	"/types/typescript/lib/lib.es2021.d.ts",
	"/types/typescript/lib/lib.es2022.d.ts",
	"/types/typescript/lib/lib.dom.d.ts",
	"/types/typescript/lib/lib.es2015.core.d.ts",
	"/types/typescript/lib/lib.es2015.collection.d.ts",
	"/types/typescript/lib/lib.es2015.generator.d.ts",
	"/types/typescript/lib/lib.es2015.iterable.d.ts",
	"/types/typescript/lib/lib.es2015.promise.d.ts",
	"/types/typescript/lib/lib.es2015.proxy.d.ts",
	"/types/typescript/lib/lib.es2015.reflect.d.ts",
	"/types/typescript/lib/lib.es2015.symbol.d.ts",
	"/types/typescript/lib/lib.es2015.symbol.wellknown.d.ts",
	"/types/typescript/lib/lib.es2016.array.include.d.ts",
	"/types/typescript/lib/lib.es2016.intl.d.ts",
	"/types/typescript/lib/lib.es2017.arraybuffer.d.ts",
	"/types/typescript/lib/lib.es2017.date.d.ts",
	"/types/typescript/lib/lib.es2017.object.d.ts",
	"/types/typescript/lib/lib.es2017.sharedmemory.d.ts",
	"/types/typescript/lib/lib.es2017.string.d.ts",
	"/types/typescript/lib/lib.es2017.intl.d.ts",
	"/types/typescript/lib/lib.es2017.typedarrays.d.ts",
	"/types/typescript/lib/lib.es2018.asyncgenerator.d.ts",
	"/types/typescript/lib/lib.es2018.asynciterable.d.ts",
	"/types/typescript/lib/lib.es2018.intl.d.ts",
	"/types/typescript/lib/lib.es2018.promise.d.ts",
	"/types/typescript/lib/lib.es2018.regexp.d.ts",
	"/types/typescript/lib/lib.es2019.array.d.ts",
	"/types/typescript/lib/lib.es2019.object.d.ts",
	"/types/typescript/lib/lib.es2019.string.d.ts",
	"/types/typescript/lib/lib.es2019.symbol.d.ts",
	"/types/typescript/lib/lib.es2019.intl.d.ts",
	"/types/typescript/lib/lib.es2020.bigint.d.ts",
	"/types/typescript/lib/lib.es2020.date.d.ts",
	"/types/typescript/lib/lib.es2020.promise.d.ts",
	"/types/typescript/lib/lib.es2020.sharedmemory.d.ts",
	"/types/typescript/lib/lib.es2020.string.d.ts",
	"/types/typescript/lib/lib.es2020.symbol.wellknown.d.ts",
	"/types/typescript/lib/lib.es2020.intl.d.ts",
	"/types/typescript/lib/lib.es2020.number.d.ts",
	"/types/typescript/lib/lib.es2021.promise.d.ts",
	"/types/typescript/lib/lib.es2021.string.d.ts",
	"/types/typescript/lib/lib.es2021.weakref.d.ts",
	"/types/typescript/lib/lib.es2021.intl.d.ts",
	"/types/typescript/lib/lib.es2022.array.d.ts",
	"/types/typescript/lib/lib.es2022.error.d.ts",
	"/types/typescript/lib/lib.es2022.intl.d.ts",
	"/types/typescript/lib/lib.es2022.object.d.ts",
	"/types/typescript/lib/lib.es2022.string.d.ts",
	"/types/typescript/lib/lib.es2022.regexp.d.ts",
	"/types/typescript/lib/lib.decorators.d.ts",
	"/types/typescript/lib/lib.decorators.legacy.d.ts",
];

test("createVirtualLanguageServiceHost: Empty project", async (t) => {
	const sharedLanguageService = new SharedLanguageService();

	const fileContents = new Map<string, string>([
		["/resources/test/test.js", ""],
	]);
	const sourceMaps = new Map<string, string>();
	const context = new LinterContext({
		rootDir: "/",
		namespace: "test",
	});
	const projectScriptVersion = sharedLanguageService.getNextProjectScriptVersion();

	const host = await createVirtualLanguageServiceHost(
		{}, fileContents, sourceMaps, context, projectScriptVersion, undefined
	);

	sharedLanguageService.acquire(host);

	const program = sharedLanguageService.getProgram();

	// Check for the minimum loaded files. This needs to be adjusted when the default compiler options
	// are changed or additional type definitions are added.
	const sourceFileNames = program.getSourceFiles().map((sf) => sf.fileName);
	t.deepEqual(sourceFileNames, [
		...LIB_TYPE_FILES,
		"/resources/test/test.js",
		"/types/@types/jquery/JQueryStatic.d.ts",
		"/types/@types/jquery/JQuery.d.ts",
		"/types/@types/jquery/misc.d.ts",
		"/types/@types/jquery/legacy.d.ts",
		"/types/@types/jquery/index.d.ts",
		"/types/@types/qunit/index.d.ts",
		"/types/@types/sizzle/index.d.ts",
		"/types/@ui5/linter/types/jquery.sap.mobile.d.ts",
		"/types/@ui5/linter/types/jquery.sap.d.ts",
		"/types/@ui5/linter/types/index.d.ts",
		"/types/@sapui5/types/types/sap.ui.core.d.ts",
		"/types/@ui5/linter/types/pseudo-modules/sap.ui.core.d.ts",
		"/types/@ui5/linter/types/sapui5/sap.ui.core.d.ts",
	]);
});

test("createVirtualLanguageServiceHost: Minimal project with sap/m/Button import", async (t) => {
	const sharedLanguageService = new SharedLanguageService();

	const fileContents = new Map<string, string>([
		["/resources/test/test.js", "sap.ui.define(['sap/m/Button'], function() {});"],
	]);
	const sourceMaps = new Map<string, string>();
	const context = new LinterContext({
		rootDir: "/",
		namespace: "test",
	});
	const projectScriptVersion = sharedLanguageService.getNextProjectScriptVersion();

	const host = await createVirtualLanguageServiceHost(
		{}, fileContents, sourceMaps, context, projectScriptVersion, undefined
	);

	sharedLanguageService.acquire(host);

	const program = sharedLanguageService.getProgram();

	// Check for the minimum loaded files. This needs to be adjusted when the default compiler options
	// are changed or additional type definitions are added.
	const sourceFileNames = program.getSourceFiles().map((sf) => sf.fileName);
	t.deepEqual(sourceFileNames, [
		...LIB_TYPE_FILES,
		"/types/@sapui5/types/types/sap.ui.core.d.ts",
		"/types/@ui5/linter/types/pseudo-modules/sap.ui.core.d.ts",
		"/types/@ui5/linter/types/sapui5/sap.ui.core.d.ts",
		"/types/@sapui5/types/types/sap.ui.unified.d.ts",
		"/types/@ui5/linter/types/pseudo-modules/sap.ui.unified.d.ts",
		"/types/@ui5/linter/types/sapui5/sap.ui.unified.d.ts",
		"/types/@sapui5/types/types/sap.m.d.ts",
		"/types/@ui5/linter/types/pseudo-modules/sap.m.d.ts",
		"/types/@ui5/linter/types/sapui5/sap.m.d.ts",
		"/resources/test/test.js",
		"/types/@types/jquery/JQueryStatic.d.ts",
		"/types/@types/jquery/JQuery.d.ts",
		"/types/@types/jquery/misc.d.ts",
		"/types/@types/jquery/legacy.d.ts",
		"/types/@types/jquery/index.d.ts",
		"/types/@types/qunit/index.d.ts",
		"/types/@types/sizzle/index.d.ts",
		"/types/@ui5/linter/types/jquery.sap.mobile.d.ts",
		"/types/@ui5/linter/types/jquery.sap.d.ts",
		"/types/@ui5/linter/types/index.d.ts",
	]);
});

test("createVirtualLanguageServiceHost: getScriptFileNames returns sorted files", async (t) => {
	const sharedLanguageService = new SharedLanguageService();

	// Create file contents in a specific order
	const fileContents = new Map<string, string>([
		["/resources/test/z.js", "// Last file"],
		["/resources/test/a.js", "// First file"],
		["/resources/test/m.js", "// Middle file"],
	]);

	const sourceMaps = new Map<string, string>();
	const context = new LinterContext({
		rootDir: "/",
		namespace: "test",
	});

	const projectScriptVersion = sharedLanguageService.getNextProjectScriptVersion();
	const host = await createVirtualLanguageServiceHost(
		{}, fileContents, sourceMaps, context, projectScriptVersion, undefined
	);
	const scriptFileNames = host.getScriptFileNames();

	// Verify the files are actually sorted
	const expectedOrder = [
		"/resources/test/a.js",
		"/resources/test/m.js",
		"/resources/test/z.js",
	];

	// Check that our test files are in the correct sorted order
	t.deepEqual(scriptFileNames, expectedOrder);
});
