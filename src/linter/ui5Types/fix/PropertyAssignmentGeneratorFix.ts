import ts from "typescript";
import {ChangeAction, ChangeSet} from "../../../utils/textChanges.js";
import {PositionInfo} from "../../LinterContext.js";
import {FixHelpers} from "./Fix.js";
import PropertyAssignmentBaseFix from "./PropertyAssignmentBaseFix.js";
import {Attribute, Position} from "sax-wasm";

export interface PropertyAssignmentGeneratorFixParams<GeneratorContext extends object> {
	/**
	 * Validate the property assignment, optionally using the checker provided in the fix helpers.
	 *
	 * This hook may also collect information that affects the generator. For that, it can store
	 * information in the provided context object, which can be retrieved later in the generator function
	 */
	validatePropertyAssignment?: (
		ctx: GeneratorContext, helpers: FixHelpers, propertyAssignment: ts.PropertyAssignment
	) => boolean;

	/**
	 * The generator function will be used to determine the value of the replacement, affecting
	 * the whole call expression
	 *
	 * If the return value is undefined, no change will be generated.
	 *
	 * @param ctx - The context object that can be used to store information between validation and generation
	 * @param propertyName -
	 * 	The name of the property that is being accessed, as a string representation of the source code,
	 * @param propertyInitializer -
	 * 	The initializer of the property assignment, as a string representation of the source code.
	 */
	generator: (
		ctx: GeneratorContext, propertyName: string, propertyInitializer: string
	) => string | undefined;
};

/**
 * Fix a global property access. Requires a module name which will be imported and replaces the defined property access.
 * The property access is in the order of the AST, e.g. ["core", "ui", "sap"]
 */
export default class PropertyAssignmentGeneratorFix<GeneratorContext extends object> extends PropertyAssignmentBaseFix {
	protected generatorContext = {} as GeneratorContext;
	protected propertyName: string | undefined;
	protected propertyInitializer: string | undefined;

	constructor(private params: PropertyAssignmentGeneratorFixParams<GeneratorContext>) {
		super();
	}

	visitLinterNode(node: ts.Node, sourcePosition: PositionInfo, helpers: FixHelpers) {
		if (!super.visitLinterNode(node, sourcePosition, helpers)) {
			return false;
		}
		if (!ts.isPropertyAssignment(node) || !ts.isIdentifier(node.name)) {
			return false;
		}
		if (this.params.validatePropertyAssignment) {
			if (!this.params.validatePropertyAssignment(this.generatorContext, helpers, node)) {
				return false;
			}
		}

		this.sourcePosition = sourcePosition;
		return true;
	}

	visitAutofixNode(node: ts.Node, position: number, sourceFile: ts.SourceFile) {
		if (!super.visitAutofixNode(node, position, sourceFile)) {
			return false;
		}
		if (!ts.isPropertyAssignment(node)) {
			return false;
		}

		this.propertyName = node.name.getFullText();
		this.propertyInitializer = node.initializer.getFullText();
		return true;
	}

	visitAutofixXmlNode(node: Attribute, toPosition: (pos: Position) => number) {
		if (!super.visitAutofixXmlNode(node, toPosition)) {
			return false;
		}
		this.propertyName = node.name.value;
		this.propertyInitializer = node.value.value;
		return true;
	}

	generateChanges(): ChangeSet | ChangeSet[] | undefined {
		if (this.startPos === undefined || this.endPos === undefined) {
			throw new Error("Start and end position are not defined");
		}
		if (this.propertyName === undefined || this.propertyInitializer === undefined) {
			throw new Error("Property name or initializer is not defined");
		}
		const value = this.params.generator(this.generatorContext, this.propertyName, this.propertyInitializer);
		if (value === undefined) {
			return;
		}
		if (value !== "") {
			return {
				action: ChangeAction.REPLACE,
				start: this.startPos,
				end: this.endPos,
				value,
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
