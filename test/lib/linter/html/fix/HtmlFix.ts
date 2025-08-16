/* eslint-disable @typescript-eslint/no-explicit-any */
import test from "ava";
import {HtmlFix} from "../../../../../src/linter/html/fix/HtmlFix.js";

/* This unit test file covers the abstract class HtmlFix.ts: */

// Minimal concrete subclass for testing:
class TestHtmlFix extends HtmlFix {
	calculateSourceCodeRange() {
		// noop
	}
}

test("Unit test HtmlFix.ts - all methods", (t) => {
	const fix = new TestHtmlFix();

	// getNodeSearchParameters()
	const params = fix.getNodeSearchParameters();
	t.deepEqual(params, {
		nodeTypes: [],
		position: {
			line: 0,
			column: 0,
		},
	});

	// visitLinterNode()
	const linterNodeResult = fix.visitLinterNode({} as any, {} as any, {} as any);
	t.true(linterNodeResult);

	// visitAutofixNode()
	const autofixNodeResult = fix.visitAutofixNode({} as any, 0, {} as any);
	t.true(autofixNodeResult);

	// getAffectedSourceCodeRange()
	t.is(fix.getAffectedSourceCodeRange(), undefined);
	fix.startPos = 1;
	t.is(fix.getAffectedSourceCodeRange(), undefined);
	fix.startPos = undefined;
	fix.endPos = 2;
	t.is(fix.getAffectedSourceCodeRange(), undefined);

	// getAffectedSourceCodeRange()
	fix.startPos = 10;
	fix.endPos = 20;
	t.deepEqual(fix.getAffectedSourceCodeRange(), {start: 10, end: 20});
});
