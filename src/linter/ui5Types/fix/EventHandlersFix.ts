import ts, {Program} from "typescript";
import {PositionInfo} from "../../LinterContext.js";
import {Attribute, Position, SaxEventType} from "sax-wasm";
import XmlEnabledFix from "./XmlEnabledFix.js";
import {type AttributeDeclaration} from "../../xmlTemplate/Parser.js";
import {ChangeAction, ChangeSet} from "../../../utils/textChanges.js";
import SourceFileMetadataCollector from "../SourceFileMetadataCollector.js";

export default class EventHandlersFix extends XmlEnabledFix {
	protected sourcePosition: PositionInfo | undefined;
	protected startPos: number | undefined;
	protected endPos: number | undefined;
	protected trailingCommaPos: number | undefined;
	private fullMethodSignature: string | undefined;
	private hasAvailableController = false;

	constructor(
		private methodName: string,
		private controllerName?: string
	) {
		super();
	}

	visitLinterNode(_node: ts.Node | AttributeDeclaration, sourcePosition: PositionInfo) {
		this.sourcePosition = sourcePosition;
		// If controller name is not present we cannot determine which is the actual controller, so skip further checks
		return !!this.controllerName;
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
		tsProgram?: Program,
		checker?: ts.TypeChecker,
		metadataCollector?: SourceFileMetadataCollector
	): void {
		if (tsProgram === undefined || checker === undefined || metadataCollector === undefined) {
			return;
		}

		const findClassDeclaration = (node: ts.Node): ts.ClassLikeDeclaration | undefined => {
			if (ts.isClassLike(node)) {
				return node;
			}
			return ts.forEachChild(node, findClassDeclaration);
		};

		const sourcePath = metadataCollector.getMetadata()
			.controllerNamespace.byNamespace.get(this.controllerName!);
		const sourceFile = sourcePath && tsProgram.getSourceFile(sourcePath);
		const classDeclaration = sourceFile && findClassDeclaration(sourceFile);
		if (!classDeclaration) {
			return;
		}

		let classType;
		// If it's an "eventHandler" object in the controller
		const methodNameChunks = this.methodName.split(".");
		let curName = methodNameChunks.shift();
		if (classDeclaration && curName) {
			classType = checker.getTypeAtLocation(classDeclaration);
			let curType = classType.getProperty(curName);

			while (methodNameChunks.length && curType) {
				curName = methodNameChunks.shift();
				const symbolType = checker.getTypeOfSymbolAtLocation(curType, classDeclaration);
				curType = symbolType.getProperty(curName ?? "");
			}

			this.hasAvailableController = !!curType;
			return;
		}

		return;
	}

	visitAutofixXmlNode(
		node: Attribute,
		toPosition: (pos: Position) => number
	) {
		if (this.hasAvailableController) {
			this.fullMethodSignature = node.value.value;
			this.startPos = toPosition(node.value.start);
			this.endPos = toPosition(node.value.end);
		}

		return this.hasAvailableController;
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
		if (this.fullMethodSignature) {
			return {
				action: ChangeAction.REPLACE,
				start: this.startPos!,
				end: this.endPos!,
				value: `.${this.fullMethodSignature}`,
			};
		}
	}
}
