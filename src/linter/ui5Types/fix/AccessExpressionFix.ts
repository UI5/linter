import ts from "typescript";
import {ChangeAction} from "../../../utils/textChanges.js";
import AccessExpressionBaseFix, {AccessExpressionBaseFixParams} from "./AccessExpressionBaseFix.js";
import {FixScope} from "./BaseFix.js";
import {Ui5TypeInfo} from "../Ui5TypeInfo.js";

export interface AccessExpressionFixParams extends AccessExpressionBaseFixParams {
	/**
	 * Which scope, i.e. number of access expression counting from the root should the replacement affect.
	 * Examples for the code "sap.module.property":
	 * - "scope = 0" will replace the whole "sap.module.property"
	 * - "scope = 1" will replace "sap.module.method"
	 * - "scope = 2" will replace "sap.module"
	 *
	 * If not set, the default value is 0.
	 */
	scope?: number | FixScope;

	/**
	 * Property access on the module or global
	 *
	 * Example: Migrating "module.property" to "otherModule.otherProperty"
	 * would require this to be set to "otherProperty"
	 */
	propertyAccess?: string;
}

/**
 * Fix a property access. This could also be the property access of a call expression, allowing for a more general
 * replacement in cases where the arguments or other conditions of the call expression do not matter.
 */
export default class AccessExpressionFix extends AccessExpressionBaseFix {
	constructor(protected params: AccessExpressionFixParams, ui5TypeInfo: Ui5TypeInfo) {
		super(params, ui5TypeInfo);
	}

	visitAutofixNode(node: ts.Node, position: number, sourceFile: ts.SourceFile) {
		if (!super.visitAutofixNode(node, position, sourceFile)) {
			return false;
		}
		if (!ts.isPropertyAccessExpression(node) && !ts.isElementAccessExpression(node)) {
			return false;
		}

		let relevantNode: ts.Node = node;
		for (let i = 0; i < (this.params.scope ?? 0); i++) {
			if (!ts.isPropertyAccessExpression(relevantNode) &&
				!ts.isElementAccessExpression(relevantNode)) {
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
			throw new Error("Start and end position are not defined");
		}

		let value;
		if (this.requestsModuleOrGlobal) {
			const identifier = this.getIdentifiersForSingleRequest(this.params.moduleName, this.params.globalName);
			if (!identifier) {
				// Requests could not be fulfilled, do not generate a change
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
		return {
			action: ChangeAction.REPLACE,
			start: this.startPos,
			end: this.endPos,
			value,
		};
	}
}
