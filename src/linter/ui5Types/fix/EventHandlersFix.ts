import ts, { Program } from "typescript";
import {ChangeSet} from "../../../autofix/autofix.js";
import {PositionInfo} from "../../LinterContext.js";
import {Attribute, Position, SaxEventType} from "sax-wasm";
import XmlEnabledFix from "./XmlEnabledFix.js";
import type {AttributeDeclaration} from "../../xmlTemplate/Parser.js";
import SharedLanguageService from "../SharedLanguageService.js";

export default class EventHandlersFix extends XmlEnabledFix {
	protected sourcePosition: PositionInfo | undefined;
	protected startPos: number | undefined;
	protected endPos: number | undefined;
	protected trailingCommaPos: number | undefined;

	constructor() {
		super();
	}

	visitLinterNode(_node: ts.Node | AttributeDeclaration, sourcePosition: PositionInfo) {
		this.sourcePosition = sourcePosition;
		return true;
	}

	getNodeSearchParameters() {
		if (this.sourcePosition === undefined) {
			throw new Error("Position for search is not defined");
		}
		return {
			nodeTypes: [ts.SyntaxKind.PropertyAssignment],
			xmlEventTypes: [SaxEventType.Attribute],
			position: this.sourcePosition,
		};
	}

	// TODO:
	// 1. Get all JS source files. They're potential controllers
	// 		Currently are included only the ones with autofix!
	// 2. Extract module name from XMLView
	// 3. Find corresponding JS controller for each XMLView
	// 4. Check the if controller has certain methods. Consider also inheritance chain
	getClassNode(
		controllerName: string,
		tsProgram: Program,
		checker: ts.TypeChecker
	) {
		const findClassDeclaration = (node: ts.Node): ts.ClassLikeDeclaration | undefined => {
			if (ts.isClassLike(node)) {
				return node;
			}
			return ts.forEachChild(node, findClassDeclaration);
		};

		const sourceFile = tsProgram.getSourceFile(controllerName);

		if (!sourceFile) {
			return;
		}

		const classDeclaration = findClassDeclaration(sourceFile);
		let classType;
		if (classDeclaration) {
			classType = checker.getTypeAtLocation(classDeclaration);
			console.log(classType.getProperty("onPressFancyButton")); // Current class method
			console.log(classType.getProperty("onBaseControllerHandler")); // Inherited method
			console.log(classType.getProperty("byId")); // sap.ui.core.mvc.Controller methods
		}

		return classType;
	}

	visitAutofixXmlNode(
		node: Attribute,
		toPosition: (pos: Position) => number,
		sharedLanguageService?: SharedLanguageService
	) {
		const program = sharedLanguageService?.getProgram();
		const checker = program?.getTypeChecker();

		const classNode = this.getClassNode("/ambiguousEventHandlers/Main.controller.js", program, checker);

		this.startPos = toPosition(node.name.start);
		this.endPos = toPosition(node.value.end) + 1; // TODO: +1 might be incorrect if no quotes are used
		return true;
	}

	visitAutofixNode(_node: ts.Node, _position: number, _sourceFile: ts.SourceFile) {
		// Abstraction requires this method, but it's actually not needed here
		return true;
	}

	getAffectedSourceCodeRange() {
		if (this.startPos === undefined || this.endPos === undefined) {
			throw new Error("Start and end position are not defined");
		}
		return {
			start: this.startPos,
			end: this.endPos,
		};
	}

	generateChanges(): ChangeSet | ChangeSet[] | undefined {
		console.log("zzzz");
		// throw new Error("Method 'generateChanges' must be implemented in subclasses");
	}
}
