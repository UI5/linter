import anyTest, {TestFn} from "ava";
import sinon, {SinonStub} from "sinon";
import esmock, {MockFunction} from "esmock";

const test = anyTest as TestFn<{
	verboseLogStub: SinonStub;
	setLogLevelStub: SinonStub;
	isLogLevelEnabledStub: SinonStub;
	getFormattedVersionStub: SinonStub;
	logger: MockFunction & {
		initLogger: (args:
			{loglevel?: string; verbose?: boolean; perf?: boolean; silent?: boolean}) => Promise<void> | void;
	};
}>;

test.beforeEach(async (t) => {
	t.context.verboseLogStub = sinon.stub();
	t.context.setLogLevelStub = sinon.stub();
	t.context.isLogLevelEnabledStub = sinon.stub().returns(true);
	t.context.getFormattedVersionStub = sinon.stub().returns("1.0.0");
	t.context.logger = await esmock("../../../../src/cli/middlewares/logger.js", {
		"../../../../src/cli/version.js": {
			getFormattedVersion: t.context.getFormattedVersionStub,
		},
		"@ui5/logger": {
			getLogger: () => ({
				verbose: t.context.verboseLogStub,
			}),
			setLogLevel: t.context.setLogLevelStub,
			isLogLevelEnabled: t.context.isLogLevelEnabledStub,
		},
	});
});

test.serial("init logger", async (t) => {
	const {logger, setLogLevelStub, isLogLevelEnabledStub, verboseLogStub, getFormattedVersionStub} = t.context;
	await logger.initLogger({});
	t.is(setLogLevelStub.callCount, 0, "setLevel has not been called");
	t.is(isLogLevelEnabledStub.callCount, 1, "isLogLevelEnabled has been called once");
	t.is(isLogLevelEnabledStub.firstCall.firstArg, "verbose",
		"isLogLevelEnabled has been called with expected argument");
	t.is(getFormattedVersionStub.callCount, 1, "getFormattedVersion has been called once");
	t.is(verboseLogStub.callCount, 2, "log.verbose has been called twice");
	t.is(verboseLogStub.firstCall.firstArg, "using ui5lint version 1.0.0",
		"log.verbose has been called with expected argument on first call");
	t.is(verboseLogStub.secondCall.firstArg, `using node version ${process.version}`,
		"log.verbose has been called with expected argument on second call");
});

test.serial("With log-level flag", async (t) => {
	const {logger, setLogLevelStub} = t.context;
	await logger.initLogger({loglevel: "silly"});
	t.is(setLogLevelStub.callCount, 1, "setLevel has been called once");
	t.is(setLogLevelStub.getCall(0).args[0], "silly", "sets log level to silly");
});

test.serial("With default log-level flag", async (t) => {
	const {logger, setLogLevelStub} = t.context;
	await logger.initLogger({loglevel: "info"});
	t.is(setLogLevelStub.callCount, 0, "setLevel has not been called");
});

test.serial("With verbose flag", async (t) => {
	const {logger, setLogLevelStub} = t.context;
	await logger.initLogger({verbose: true});
	t.is(setLogLevelStub.callCount, 1, "setLevel has been called once");
	t.is(setLogLevelStub.getCall(0).args[0], "verbose", "sets log level to verbose");
});

test.serial("With perf flag", async (t) => {
	const {logger, setLogLevelStub} = t.context;
	await logger.initLogger({perf: true});
	t.is(setLogLevelStub.callCount, 1, "setLevel has been called once");
	t.is(setLogLevelStub.getCall(0).args[0], "perf", "sets log level to perf");
});

test.serial("With silent flag", async (t) => {
	const {logger, setLogLevelStub} = t.context;
	await logger.initLogger({silent: true});
	t.is(setLogLevelStub.callCount, 1, "setLevel has been called once");
	t.is(setLogLevelStub.getCall(0).args[0], "silent", "sets log level to silent");
});

test.serial("With log-level and verbose flag", async (t) => {
	const {logger, setLogLevelStub} = t.context;
	await logger.initLogger({loglevel: "silly", verbose: true});
	t.is(setLogLevelStub.callCount, 2, "setLevel has been called twice");
	t.is(setLogLevelStub.getCall(0).args[0], "verbose", "sets log level to verbose");
	t.is(setLogLevelStub.getCall(1).args[0], "silly", "sets log level to verbose");
});

test.serial("With log-level, verbose, perf and silent flag", async (t) => {
	const {logger, setLogLevelStub} = t.context;
	await logger.initLogger({loglevel: "silly", verbose: true, perf: true, silent: true});
	t.is(setLogLevelStub.callCount, 4, "setLevel has been called four times");
	t.is(setLogLevelStub.getCall(0).args[0], "silent", "sets log level to silent");
	t.is(setLogLevelStub.getCall(1).args[0], "perf", "sets log level to perf");
	t.is(setLogLevelStub.getCall(2).args[0], "verbose", "Third sets log level to verbose");
	t.is(setLogLevelStub.getCall(3).args[0], "silly", "sets log level to verbose");
});
