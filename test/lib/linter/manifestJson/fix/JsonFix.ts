import test from "ava";
import {JsonFix} from "../../../../../src/linter/manifestJson/fix/JsonFix.js";
import ts from "typescript";
import {FixHelpers} from "../../../../../src/linter/ui5Types/fix/Fix.js";

/* This unit test file covers the abstract class JsonFix.ts: */

// Minimal concrete subclass for testing:
class TestJsonFix extends JsonFix {
	calculateSourceCodeRange() {
		// noop
	}
}

test("JsonFix - All methods", (t) => {
	const fix = new TestJsonFix();

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
	const linterNodeResult = fix.visitLinterNode({} as ts.Node, {line: 0, column: 0}, {} as FixHelpers);
	t.true(linterNodeResult);

	// visitAutofixNode()
	const autofixNodeResult = fix.visitAutofixNode({} as ts.Node, 0, {} as ts.SourceFile);
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
