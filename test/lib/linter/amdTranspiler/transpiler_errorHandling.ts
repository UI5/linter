import anyTest, {TestFn} from "ava";
import sinonGlobal from "sinon";
import LinterContext from "../../../../src/linter/LinterContext.js";
import {UnsupportedModuleError} from "../../../../src/linter/ui5Types/amdTranspiler/util.js";
import {UnsafeNodeRemoval} from "../../../../src/linter/ui5Types/amdTranspiler/pruneNode.js";
import esmock from "esmock";

const test = anyTest as TestFn<{
	sinon: sinonGlobal.SinonSandbox;
	log: {verbose: sinonGlobal.SinonStub};
	transformFunctionStub: sinonGlobal.SinonStub;
	transpileAmdToEsm: typeof import("../../../../src/linter/ui5Types/amdTranspiler/transpiler.js").default;
}>;

test.beforeEach(async (t) => {
	const sinon = t.context.sinon = sinonGlobal.createSandbox();
	t.context.transformFunctionStub = sinon.stub();
	t.context.log = {
		verbose: sinon.stub(),
	};
	t.context.transpileAmdToEsm = await esmock("../../../../src/linter/ui5Types/amdTranspiler/transpiler.js", {
		"../../../../src/linter/ui5Types/amdTranspiler/tsTransformer.js": {
			createTransformer: () => () => t.context.transformFunctionStub,
		},
		"@ui5/logger": {
			getLogger: sinon.stub().withArgs("linter:ui5Types:amdTranspiler:transpiler").returns(t.context.log),
		},
	});
});

test.serial("Error: Unexpected Error during transformation", (t) => {
	const {transpileAmdToEsm, transformFunctionStub} = t.context;

	const context = new LinterContext({
		rootDir: "/",
		namespace: "my/app",
	});

	// Stub the createTransformer function so that the transpiler has to handle an unexpected error
	transformFunctionStub.throws(new Error("TEST: Unexpected error from createTransformer"));

	t.throws(() => transpileAmdToEsm("/resources/my/app/x.js", "const x = 1;", context), {
		message: "TEST: Unexpected error from createTransformer",
	});
});

test.serial("Error: Unexpected UnsupportedModuleError during transformation", (t) => {
	const {transpileAmdToEsm, transformFunctionStub, log} = t.context;

	const context = new LinterContext({
		rootDir: "/",
		namespace: "my/app",
	});

	const inputSource = "const x = 1;";

	// Stub the createTransformer function so that the transpiler has to handle an unexpected UnsupportedModuleError
	// Usually all UnsupportedModuleError are handled internally so that they are not thrown, but the catch clause
	// is a safety net in case an error is thrown anyway
	const error = new UnsupportedModuleError("TEST");
	transformFunctionStub.throws(error);

	const {source, map} = transpileAmdToEsm("/resources/my/app/x.js", inputSource, context);

	t.is(source, inputSource);
	t.is(map, "");

	t.is(log.verbose.callCount, 3);
	t.deepEqual(log.verbose.getCall(0).args, ["Failed to transform module x.js: TEST"]);
	t.deepEqual(log.verbose.getCall(1).args, ["Stack trace:"]);
	t.deepEqual(log.verbose.getCall(2).args, [error.stack]);
});

test.serial("Error: Unexpected UnsupportedModuleError during transformation (strict = true)", (t) => {
	const {transpileAmdToEsm, transformFunctionStub} = t.context;

	const context = new LinterContext({
		rootDir: "/",
		namespace: "my/app",
	});

	const inputSource = "const x = 1;";

	// Stub the createTransformer function so that the transpiler has to handle an unexpected UnsupportedModuleError
	// Usually all UnsupportedModuleError are handled internally so that they are not thrown, but the catch clause
	// is a safety net in case an error is thrown anyway
	transformFunctionStub.throws(new UnsupportedModuleError("TEST"));

	t.throws(() => transpileAmdToEsm("/resources/my/app/x.js", inputSource, context, true), {
		message: "TEST",
		instanceOf: UnsupportedModuleError,
	});
});

test.serial("Error: Unexpected TypeScript Debug Failure during transformation", (t) => {
	const {transpileAmdToEsm, transformFunctionStub, log} = t.context;

	const context = new LinterContext({
		rootDir: "/",
		namespace: "my/app",
	});

	const inputSource = "const x = 1;";

	// Stub the createTransformer function so that the transpiler has to handle an unexpected error from TypeScript
	const error = new Error("Debug Failure. TEST");
	transformFunctionStub.throws(error);

	const {source, map} = transpileAmdToEsm("/resources/my/app/x.js", inputSource, context);

	t.is(source, inputSource);
	t.is(map, "");

	t.is(log.verbose.callCount, 3);
	t.deepEqual(log.verbose.getCall(0).args, ["AST transformation failed for module x.js: Debug Failure. TEST"]);
	t.deepEqual(log.verbose.getCall(1).args, ["Stack trace:"]);
	t.deepEqual(log.verbose.getCall(2).args, [error.stack]);
});

test.serial("Error: Unexpected TypeScript Debug Failure during transformation (strict = true)", (t) => {
	const {transpileAmdToEsm, transformFunctionStub} = t.context;

	const context = new LinterContext({
		rootDir: "/",
		namespace: "my/app",
	});

	const inputSource = "const x = 1;";

	// Stub the createTransformer function so that the transpiler has to handle an unexpected error from TypeScript
	transformFunctionStub.throws(new Error("Debug Failure. TEST"));

	t.throws(() => transpileAmdToEsm("/resources/my/app/x.js", inputSource, context, true), {
		message: "Debug Failure. TEST",
	});
});

test.serial("Error: UnsafeNodeRemoval with ConditionalExpression", (t) => {
	const {transpileAmdToEsm, transformFunctionStub, log} = t.context;

	const context = new LinterContext({
		rootDir: "/",
		namespace: "my/app",
	});

	const inputSource = "const x = condition ? valueA : valueB;";

	const error = new UnsafeNodeRemoval(
		"Cannot remove ConditionalExpression with only one part marked for removal at [1,10]");
	transformFunctionStub.throws(error);

	const {source, map} = transpileAmdToEsm("/resources/my/app/x.js", inputSource, context);

	t.is(source, inputSource);
	t.is(map, "");

	// Verify that the appropriate log.verbose messages are called
	t.is(log.verbose.callCount, 3);
	t.deepEqual(log.verbose.getCall(0).args,
		["Failed to transform module x.js: Cannot remove ConditionalExpression" +
			" with only one part marked for removal at [1,10]"]);
	t.deepEqual(log.verbose.getCall(1).args, ["Stack trace:"]);
	t.deepEqual(log.verbose.getCall(2).args, [error.stack]);
});
