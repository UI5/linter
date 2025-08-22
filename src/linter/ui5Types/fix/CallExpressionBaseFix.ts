import ts from "typescript";
import {PositionInfo} from "../../LinterContext.js";
import {
	countChildNodesRecursive, findNodeRecursive, isReturnValueUsed,
} from "../utils/utils.js";
import BaseFix, {BaseFixParams} from "./BaseFix.js";
import {FixHelpers} from "./Fix.js";
import {Ui5TypeInfo} from "../Ui5TypeInfo.js";
import {isSideEffectFree} from "../utils/sideEffects.js";

export interface CallExpressionBaseFixParams extends BaseFixParams {
	/**
	 * Validation: If set to true, the fix will only be applied if the return value of the code does not use the
	 * return value of the call expression.
	 */
	mustNotUseReturnValue?: boolean;
}

export default abstract class CallExpressionBaseFix extends BaseFix {
	protected nodeTypes = [ts.SyntaxKind.CallExpression];
	protected containedCallExpressionCount = 0;

	constructor(protected params: CallExpressionBaseFixParams, ui5TypeInfo: Ui5TypeInfo) {
		super(params, ui5TypeInfo);
	}

	visitLinterNode(node: ts.Node, sourcePosition: PositionInfo, helpers: FixHelpers) {
		if (!ts.isCallExpression(node)) {
			return false;
		}
		// If requested, check whether the return value of the call expression is assigned to a variable,
		// passed to another function or used elsewhere.
		if (this.params.mustNotUseReturnValue && isReturnValueUsed(node)) {
			return false;
		}
		const containedCallExpression = findNodeRecursive<ts.CallExpression>(node.expression, this.nodeTypes);
		if (containedCallExpression) {
			// Call expression fixes must not affect other call expressions, unless the contained call expression
			// is side-effect free, e.g. sap.ui.getCore().method()
			if (isSideEffectFree(containedCallExpression, helpers.checker)) {
				this.containedCallExpressionCount = 1;
			} else {
				return false;
			}
		}
		this.sourcePosition = sourcePosition;
		return true;
	}

	visitAutofixNode(node: ts.Node, position: number, sourceFile: ts.SourceFile) {
		if (!ts.isCallExpression(node)) {
			return false;
		}

		const count = countChildNodesRecursive(node.expression, this.nodeTypes);
		if (count !== this.containedCallExpressionCount) {
			// The number of call expressions does not match the expected count
			// Reject this node and wait for it's child
			return false;
		}

		this.startPos = node.getStart(sourceFile);
		this.endPos = node.getEnd();
		return true;
	}
}
