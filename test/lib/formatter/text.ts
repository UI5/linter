import path from "path";
import anyTest, {TestFn} from "ava";
import {Text} from "../../../src/formatter/text.js";
import {LintResult} from "../../../src/linter/LinterContext.js";

const test = anyTest as TestFn<{
	lintResults: LintResult[];
	fakePath: string;
}>;

test.beforeEach((t) => {
	t.context.fakePath = path.join("/", "tmp", "test");
	t.context.lintResults = [{
		filePath: "Test.js",
		messages: [{
			ruleId: "no-deprecated-api",
			severity: 2,
			line: 5,
			column: 1,
			message: "Call to deprecated function 'attachInit' of class 'Core'",
			messageDetails: "(since 1.118) - Please use {@link sap.ui.core.Core.ready Core.ready} instead.",
		}],
		coverageInfo: [],
		errorCount: 1,
		fatalErrorCount: 0,
		warningCount: 0,
	}];
});

test("Test Text Formatter (with '--details true')", (t) => {
	const {lintResults, fakePath} = t.context;
	const textFormatter = new Text(fakePath);
	let res = textFormatter.format(lintResults, true, false);
	res = res.replaceAll(path.resolve(fakePath) + path.sep, "<base path>/");
	t.snapshot(res);
});

test("Test Text Formatter (with '--details false')", (t) => {
	const {lintResults, fakePath} = t.context;
	const textFormatter = new Text(fakePath);
	let res = textFormatter.format(lintResults, false, false);
	res = res.replaceAll(path.resolve(fakePath) + path.sep, "<base path>/");
	t.snapshot(res);
});

test("Test Text Formatter (with one fatal error)", (t) => {
	const {fakePath} = t.context;
	const textFormatter = new Text(fakePath);
	let res = textFormatter.format([{
		filePath: "Test.js",
		messages: [{
			ruleId: "rule3",
			severity: 2,
			line: 5,
			column: 1,
			message: "Another fatal message",
			messageDetails: "Another message detail",
		}],
		coverageInfo: [],
		errorCount: 1,
		fatalErrorCount: 1,
		warningCount: 0,
	}], true, false);
	res = res.replaceAll(path.resolve(fakePath) + path.sep, "<base path>/");
	t.snapshot(res);
});

test("Test Text Formatter (with no findings)", (t) => {
	const {fakePath} = t.context;
	const textFormatter = new Text(fakePath);
	const res = textFormatter.format([], false, false);
	t.snapshot(res);
});

test("Test Text Formatter (with two fatal errors)", (t) => {
	const {fakePath} = t.context;
	const textFormatter = new Text(fakePath);
	let res = textFormatter.format([{
		filePath: "Test.js",
		messages: [{
			ruleId: "rule3",
			severity: 2,
			line: 5,
			column: 1,
			message: "Another fatal message",
			messageDetails: "Another message detail",
		}],
		coverageInfo: [],
		errorCount: 1,
		fatalErrorCount: 2,
		warningCount: 0,
	}], true, false);
	res = res.replaceAll(path.resolve(fakePath) + path.sep, "<base path>/");
	t.snapshot(res);
});
