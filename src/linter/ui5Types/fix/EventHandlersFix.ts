import ts, {Program} from "typescript";
import {ChangeAction, ChangeSet} from "../../../autofix/autofix.js";
import LinterContext, {PositionInfo} from "../../LinterContext.js";
import {Attribute, Position, SaxEventType} from "sax-wasm";
import XmlEnabledFix from "./XmlEnabledFix.js";
import type {AttributeDeclaration} from "../../xmlTemplate/Parser.js";
import SharedLanguageService from "../SharedLanguageService.js";

export default class EventHandlersFix extends XmlEnabledFix {
	protected sourcePosition: PositionInfo | undefined;
	protected startPos: number | undefined;
	protected endPos: number | undefined;
	protected trailingCommaPos: number | undefined;
	protected methodName: string | undefined;

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

	methodExistsInController(
		controllerName: string,
		context: LinterContext,
		methodName: string,
		tsProgram?: Program,
		checker?: ts.TypeChecker
	) {
		if (tsProgram === undefined || checker === undefined) {
			return false;
		}

		const findClassDeclaration = (node: ts.Node): ts.ClassLikeDeclaration | undefined => {
			if (ts.isClassLike(node)) {
				return node;
			}
			return ts.forEachChild(node, findClassDeclaration);
		};

		const sourceFile = tsProgram.getSourceFiles().find((sourceFile) => {
			if (sourceFile.fileName.endsWith(".js")) {
				const metadata = context.getMetadata(sourceFile.fileName);
				return metadata.namespace && metadata.namespace === controllerName;
			}
		});

		if (!sourceFile) {
			return false;
		}

		const classDeclaration = findClassDeclaration(sourceFile);
		let classType;
		// If it's an "eventHandler" object in the controller
		const methodNameChunks = methodName.split(".");
		let curName = methodNameChunks.shift();
		if (classDeclaration && curName) {
			classType = checker.getTypeAtLocation(classDeclaration);
			let curType = classType.getProperty(curName);

			while (methodNameChunks.length && curType) {
				curName = methodNameChunks.shift();
				const aaa = checker.getTypeOfSymbolAtLocation(curType, classDeclaration);
				curType = aaa.getProperty(curName ?? "");
			}

			return !!curType;
		}

		return false;
	}

	visitAutofixXmlNode(
		node: Attribute,
		toPosition: (pos: Position) => number,
		xmlHelpers: {
			controllerName: string;
			sharedLanguageService: SharedLanguageService;
			context: LinterContext;
		}
	) {
		const {controllerName, context, sharedLanguageService} = xmlHelpers;
		const program = sharedLanguageService?.getProgram();
		const checker = program?.getTypeChecker();

		const methodName = node.value.value.split("(")[0]; // If method with args, take just the name
		const isAvailableMethod = this.methodExistsInController(
			controllerName, context, methodName, program, checker);

		if (isAvailableMethod) {
			this.methodName = node.value.value;
			this.startPos = toPosition(node.value.start);
			this.endPos = toPosition(node.value.end);
		}

		return isAvailableMethod;
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
		if (this.methodName) {
			return {
				action: ChangeAction.REPLACE,
				start: this.startPos!,
				end: this.endPos!,
				value: `.${this.methodName}`,
			};
		}
	}
}
