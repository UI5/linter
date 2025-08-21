import ts from "typescript";
import {ChangeAction} from "../../../utils/textChanges.js";
import CallExpressionBaseFix, {CallExpressionBaseFixParams} from "./CallExpressionBaseFix.js";
import {FixScope} from "./BaseFix.js";
import {Ui5TypeInfo} from "../Ui5TypeInfo.js";

export interface CallExpressionFixParams extends CallExpressionBaseFixParams {
	/**
	 * Which scope, i.e. number of access expressions (counting from the call expression) should the replacement
	 * affect.
	 *
	 * Examples for the code "sap.module.method()":
	 * - "scope = 0" will replace the whole "sap.module.method()"
	 * - "scope = 1" will replace "sap.module.method"
	 * - "scope = 2" will replace "sap.module"
	 *
	 * If not set, the default value is 1.
	 */
	scope?: number | FixScope;
	/**
	 * Whether to add a "new" keyword before the expression
	 */
	newExpression?: boolean;

	/**
	 * Property access on the module or global
	 *
	 * Example: Migrating "module.property" to "otherModule.otherProperty"
	 * would require this to be set to "otherProperty"
	 */
	propertyAccess?: string;
}

export default class CallExpressionFix extends CallExpressionBaseFix {
	constructor(protected params: CallExpressionFixParams, ui5TypeInfo: Ui5TypeInfo) {
		super(params, ui5TypeInfo);
	}

	visitAutofixNode(node: ts.Node, position: number, sourceFile: ts.SourceFile) {
		if (!super.visitAutofixNode(node, position, sourceFile)) {
			return false;
		}
		if (!ts.isCallExpression(node)) {
			return false;
		}
		let relevantNode: ts.AccessExpression | ts.CallExpression | ts.Identifier = node;
		for (let i = 0; i < (this.params.scope ?? 1); i++) {
			if (ts.isIdentifier(relevantNode)) {
				// If the current node is an identifier, we can not go further
				return false;
			}
			if (!ts.isPropertyAccessExpression(relevantNode.expression) &&
				!ts.isElementAccessExpression(relevantNode.expression) &&
				!ts.isIdentifier(relevantNode.expression)) {
				return false;
			}
			relevantNode = relevantNode.expression;
		}

		if (!this.requestsModuleOrGlobal) {
			// If no module or global is requested, we assume the current property access should stay.
			// Therefore, ignore the expression of the "relevant node" and start at the name
			if (!ts.isPropertyAccessExpression(relevantNode)) {
				// We can't replace an element access expression like this
				return false;
			}
			this.startPos = relevantNode.name.getStart(sourceFile);
		} else {
			this.startPos = relevantNode.getStart(sourceFile);
		}
		this.endPos = relevantNode.getEnd();
		return true;
	}

	generateChanges() {
		if (this.startPos === undefined || this.endPos === undefined) {
			throw new Error("Start or end position is not defined");
		}
		let value;

		if (this.requestsModuleOrGlobal) {
			const identifier = this.getIdentifiersForSingleRequest(this.params.moduleName, this.params.globalName);
			if (!identifier) {
				return;
			}

			value = identifier;
			if (this.params.propertyAccess) {
				// If a property is defined, we need to access it on the identifier
				value = `${value}.${this.params.propertyAccess}`;
			}
		} else {
			value = this.params.propertyAccess ?? "";
		}
		if (this.params.newExpression) {
			// If the newExpression flag is set, we need to add a "new" keyword before the expression
			value = `new ${value}`;
		}
		return {
			action: ChangeAction.REPLACE,
			start: this.startPos,
			end: this.endPos,
			value,
		};
	}
}
