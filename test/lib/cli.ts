import anyTest, {TestFn} from "ava";
import sinon, {SinonStub} from "sinon";
import {Argv} from "yargs";
import esmock, {MockFunction} from "esmock";
import {fileURLToPath} from "node:url";
import {readFileSync} from "node:fs";

const test = anyTest as TestFn<{
	argvGetter: SinonStub;
	yargsInstance: Argv & {
		parserConfiguration: SinonStub;
		version: SinonStub;
		scriptName: SinonStub;
		command: SinonStub;
		terminalWidth: SinonStub;
		wrap: SinonStub;
		argv: () => unknown;
	};
	yargs: SinonStub;
	setVersionInfo: SinonStub;
	getFormattedVersion: SinonStub;
	cliBase: SinonStub;
	readdir: SinonStub;
	cli: MockFunction;
}>;

const pkgJsonPath = new URL("../../package.json", import.meta.url);
const pkg = JSON.parse((readFileSync(pkgJsonPath) as unknown) as string);

test.beforeEach(async (t) => {
	t.context.argvGetter = sinon.stub();
	t.context.yargsInstance = {
		parserConfiguration: sinon.stub(),
		version: sinon.stub(),
		scriptName: sinon.stub(),
		command: sinon.stub(),
		terminalWidth: sinon.stub().returns(123),
		wrap: sinon.stub(),
		get argv() {
			t.context.argvGetter();
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			return {} as any;
		},
	} as typeof t.context.yargsInstance;

	t.context.yargs = sinon.stub().returns(t.context.yargsInstance).named("yargs");

	t.context.setVersionInfo = sinon.stub().named("setVersionInfo");
	t.context.getFormattedVersion = sinon.stub().returns("1.2.3 (from /path/to/cli.js)").named("getFormattedVersion");
	t.context.cliBase = sinon.stub().named("cliBase");

	t.context.cli = await esmock.p("../../src/cli.js", {
		"yargs": t.context.yargs,
		"../../src/cli/version.js": {
			setVersionInfo: t.context.setVersionInfo,
			getFormattedVersion: t.context.getFormattedVersion,
		},
		"../../src/cli/base.js": t.context.cliBase,
		"module": {
			createRequire: sinon.stub().callsFake(() => sinon.stub().returns(pkg)),
		},
	});
});

test.afterEach.always((t) => {
	sinon.restore();
	esmock.purge(t.context.cli);
	// process.env.NODE_ENV = t.context.originalNodeEnv;
});

test.serial("CLI", async (t) => {
	const {
		cli, argvGetter, yargsInstance, yargs,
		setVersionInfo, cliBase, getFormattedVersion,
	} = t.context;

	await cli("module");

	t.is(yargs.callCount, 1);
	t.deepEqual(yargs.getCall(0).args, [[]]);

	t.is(yargsInstance.parserConfiguration.callCount, 1);
	t.deepEqual(yargsInstance.parserConfiguration.getCall(0).args, [{
		"parse-numbers": false,
	}]);

	t.is(setVersionInfo.callCount, 1);
	t.deepEqual(setVersionInfo.getCall(0).args, [
		pkg.version, fileURLToPath(new URL("../../bin/ui5lint.js", import.meta.url)),
	]);

	t.is(getFormattedVersion.callCount, 1);
	t.deepEqual(getFormattedVersion.getCall(0).args, []);

	t.is(yargsInstance.version.callCount, 1);
	t.deepEqual(yargsInstance.version.getCall(0).args, [
		getFormattedVersion.getCall(0).returnValue,
	]);

	t.is(yargsInstance.scriptName.callCount, 1);
	t.deepEqual(yargsInstance.scriptName.getCall(0).args, ["ui5lint"]);

	t.is(cliBase.callCount, 1);
	t.deepEqual(cliBase.getCall(0).args, [yargsInstance]);

	t.is(yargsInstance.command.callCount, 0);

	t.is(yargsInstance.terminalWidth.callCount, 1);
	t.deepEqual(yargsInstance.terminalWidth.getCall(0).args, []);

	t.is(yargsInstance.wrap.callCount, 1);
	t.deepEqual(yargsInstance.wrap.getCall(0).args, [123]);

	t.is(argvGetter.callCount, 1);
	t.deepEqual(argvGetter.getCall(0).args, []);

	sinon.assert.callOrder(
		yargs,
		yargsInstance.parserConfiguration,
		setVersionInfo,
		yargsInstance.version,
		yargsInstance.scriptName,
		cliBase,
		yargsInstance.terminalWidth,
		yargsInstance.wrap,
		argvGetter
	);
});
