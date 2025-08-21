import ts from "typescript";
import {ChangeAction, ChangeSet} from "../../../utils/textChanges.js";
import {Attribute, Position} from "sax-wasm";
import PropertyAssignmentBaseFix from "./PropertyAssignmentBaseFix.js";
import {getPropertyAssignmentInObjectLiteralExpression} from "../utils/utils.js";
import {PositionInfo} from "../../LinterContext.js";
import {FixHelpers} from "./Fix.js";

export interface PropertyAssignmentFixParams {
	/**
	 * Property name to replace the property access with.
	 * If not defined, the complete property assignment will be removed.
	 */
	property?: string;
};

/**
 * Fix a global property access. Requires a module name which will be imported and replaces the defined property access.
 * The property access is in the order of the AST, e.g. ["core", "ui", "sap"]
 */
export default class PropertyAssignmentFix extends PropertyAssignmentBaseFix {
	constructor(private params: PropertyAssignmentFixParams) {
		super();
	}

	visitLinterNode(node: ts.Node, sourcePosition: PositionInfo, _helpers: FixHelpers) {
		if (!super.visitLinterNode(node, sourcePosition, _helpers)) {
			return false;
		}
		if (!ts.isPropertyAssignment(node)) {
			return false;
		}

		if (this.params.property) {
			// If a property name is defined, check whether it conflicts with existing assignments
			const conflictingNode = getPropertyAssignmentInObjectLiteralExpression(this.params.property, node.parent);
			if (conflictingNode) {
				return false;
			}
		}
		return true;
	}

	visitAutofixNode(node: ts.Node, position: number, sourceFile: ts.SourceFile) {
		if (!super.visitAutofixNode(node, position, sourceFile)) {
			return false;
		}
		if (!ts.isPropertyAssignment(node)) {
			return false;
		}
		if (this.params.property) {
			// Only replace the property name, not the whole assignment
			node = node.name;
			this.startPos = node.getStart();
			this.endPos = node.getEnd();
		}
		return true;
	}

	visitAutofixXmlNode(node: Attribute, toPosition: (pos: Position) => number) {
		if (!super.visitAutofixXmlNode(node, toPosition)) {
			return false;
		}
		if (this.params.property) {
			// Only replace the property name, not the whole assignment
			this.endPos = toPosition(node.name.end);
		}
		return true;
	}

	generateChanges(): ChangeSet {
		if (this.startPos === undefined || this.endPos === undefined) {
			throw new Error("Start and end position are not defined");
		}
		if (this.params.property) {
			return {
				action: ChangeAction.REPLACE,
				start: this.startPos,
				end: this.endPos,
				value: this.params.property,
			};
		} else {
			return {
				action: ChangeAction.DELETE,
				start: this.startPos,
				end: this.trailingCommaPos ?? this.endPos,
			};
		}
	}
}
