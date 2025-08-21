import ts from "typescript";
import anyTest, {TestFn} from "ava";
import sinonGlobal from "sinon";
import esmock from "esmock";
import autofix, {AutofixResource} from "../../../src/autofix/autofix.js";
import {ChangeAction, InsertChange} from "../../../src/utils/textChanges.js";
import LinterContext, {PositionInfo} from "../../../src/linter/LinterContext.js";
import {MESSAGE} from "../../../src/linter/messages.js";
import type {addDependencies} from "../../../src/autofix/amdImports.js";
import {createResource} from "@ui5/fs/resourceFactory";
import XmlEnabledFix from "../../../src/linter/ui5Types/fix/XmlEnabledFix.js";
import {SaxEventType} from "sax-wasm";

const test = anyTest as TestFn<{
	sinon: sinonGlobal.SinonSandbox;
	addDependenciesStub: sinonGlobal.SinonStub<Parameters<typeof addDependencies>, ReturnType<typeof addDependencies>>;
	autofix: typeof autofix;
	linterContext: LinterContext;
}>;

test.beforeEach(async (t) => {
	t.context.sinon = sinonGlobal.createSandbox();

	t.context.addDependenciesStub = t.context.sinon.stub();

	t.context.autofix = await esmock("../../../src/autofix/autofix.js", {
		"../../../src/autofix/amdImports.ts": {
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

class TestFix extends XmlEnabledFix {
	constructor(private position: PositionInfo) {
		super();
	}

	visitLinterNode() {
		return true;
	}

	getNodeSearchParameters() {
		return {
			nodeTypes: [ts.SyntaxKind.PropertyAccessExpression, ts.SyntaxKind.ElementAccessExpression],
			xmlEventTypes: [SaxEventType.Attribute],
			position: this.position,
		};
	}

	visitAutofixNode() {
		return true;
	}

	visitAutofixXmlNode() {
		return true;
	}

	getAffectedSourceCodeRange() {
		return [];
	}

	getNewGlobalAccess() {
		return undefined;
	}

	getNewModuleDependencies() {
		return undefined;
	}

	generateChanges(): InsertChange[] {
		return [{
			action: ChangeAction.INSERT,
			start: 10,
			value: "(",
		}, {
			action: ChangeAction.INSERT,
			start: 1,
			value: ")",
		}];
	}

	setIdentifierForDependency() {
		// noop
	}

	setIdentifierForGlobal() {
		// noop
	}
}

test("autofix (JS): Parsing error after applying fixes", async (t) => {
	const {autofix, linterContext} = t.context;

	const resources = new Map<string, AutofixResource>();
	resources.set("/resources/file.js", {
		resource: createResource({
			path: "/resources/file.js",
			string: "sap.ui.define(() => new sap.m.Button())",
		}),
		messages: [
			// Note: Message details don't need to be correct in this test case
			// as we stub the addDependencies function
			{
				id: MESSAGE.NO_GLOBALS,
				position: {
					line: 1,
					column: 1,
				},
				args: {},
				fix: new TestFix({
					line: 1,
					column: 1,
				}),
				ui5TypeInfo: undefined,
			},
		],
	});

	const result = await autofix({
		rootDir: "/",
		context: linterContext,
		resources,
	});

	t.truthy(result);
	t.deepEqual(Array.from(result.keys()), []);

	t.deepEqual(linterContext.generateLintResults(), [
		{
			coverageInfo: [],
			errorCount: 0,
			fatalErrorCount: 0,
			warningCount: 1,
			filePath: "/resources/file.js",
			messages: [
				{
					column: undefined,
					line: undefined,
					message: `Syntax error after applying autofix for '/resources/file.js'. ` +
						`This is likely a UI5 linter internal issue. Please check the verbose log. ` +
						`Please report this using the bug report template: ` +
						`https://github.com/UI5/linter/issues/new?template=bug-report.md`,
					ruleId: "autofix-error",
					severity: 1,
					ui5TypeInfo: undefined,
				},
			],
		},
	]);
});

test("autofix (XML): Parsing error after applying fixes", async (t) => {
	const {autofix, linterContext} = t.context;

	const resources = new Map<string, AutofixResource>();
	resources.set("/resources/file.view.xml", {
		resource: createResource({
			path: "/resources/file.view.xml",
			string: "<mvc:View xmlns:mvc='sap.ui.core.mvc' xmlns='sap.m'><Button text='Test'/></mvc:View>",
		}),
		messages: [
			// Note: Message details don't need to be correct in this test case
			// as we stub the addDependencies function
			{
				id: MESSAGE.DEPRECATED_PROPERTY,
				position: {
					line: 1,
					column: 1,
				},
				args: {},
				fix: new TestFix({
					line: 1,
					column: 11,
				}),
				ui5TypeInfo: undefined,
			},
		],
	});
	const result = await autofix({
		rootDir: "/",
		context: linterContext,
		resources,
	});

	t.truthy(result);
	t.deepEqual(Array.from(result.keys()), []);

	t.deepEqual(linterContext.generateLintResults(), [
		{
			coverageInfo: [],
			errorCount: 0,
			fatalErrorCount: 0,
			warningCount: 1,
			filePath: "/resources/file.view.xml",
			messages: [
				{
					column: undefined,
					line: undefined,
					message: `Syntax error after applying autofix for '/resources/file.view.xml'. ` +
						`This is likely a UI5 linter internal issue. Please check the verbose log. ` +
						`Please report this using the bug report template: ` +
						`https://github.com/UI5/linter/issues/new?template=bug-report.md`,
					ruleId: "autofix-error",
					severity: 1,
					ui5TypeInfo: undefined,
				},
			],
		},
	]);
});
