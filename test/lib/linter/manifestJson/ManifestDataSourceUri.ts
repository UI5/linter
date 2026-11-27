import anyTest, {TestFn} from "ava";
import path from "node:path";
import {fileURLToPath} from "node:url";
import sinonGlobal from "sinon";
import {createMockedLinterModules} from "../_linterHelper.js";
import SharedLanguageService from "../../../../src/linter/ui5Types/SharedLanguageService.js";
import {RULES} from "../../../../src/linter/messages.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesBasePath = path.join(__dirname, "..", "..", "..", "fixtures", "linter", "manifestJson");

const test = anyTest as TestFn<{
	sinon: sinonGlobal.SinonSandbox;
	lintFile: Awaited<ReturnType<typeof createMockedLinterModules>>["lintModule"]["lintFile"];
	sharedLanguageService: SharedLanguageService;
}>;

test.beforeEach(async (t) => {
	t.context.sinon = sinonGlobal.createSandbox();
	const {lintModule: {lintFile}} = await createMockedLinterModules(t.context.sinon);
	t.context.lintFile = lintFile;
	t.context.sharedLanguageService = new SharedLanguageService();
});

test.afterEach.always((t) => {
	t.context.sinon.restore();
});

test.serial("reports absolute dataSources uri when sap.cloud/service is set", async (t) => {
	const rootDir = path.join(fixturesBasePath, "absolute-data-source-uri");
	const res = await t.context.lintFile({
		rootDir,
		filePatterns: ["manifest.json"],
		details: true,
	}, t.context.sharedLanguageService);

	t.is(res.length, 1);
	t.is(res[0].messages.length, 1);
	t.is(res[0].messages[0].ruleId, RULES["no-absolute-data-source-uri"]);
});

test.serial("does not report when sap.cloud/service is missing", async (t) => {
	const rootDir = path.join(fixturesBasePath, "relative-data-source-uri-no-sap-cloud");
	const res = await t.context.lintFile({
		rootDir,
		filePatterns: ["manifest.json"],
		details: true,
	}, t.context.sharedLanguageService);

	t.is(res.length, 0);
});
