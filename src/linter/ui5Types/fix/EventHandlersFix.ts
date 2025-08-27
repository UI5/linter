import ts, {Program} from "typescript";
import {PositionInfo} from "../../LinterContext.js";
import {Attribute, Position, SaxEventType} from "sax-wasm";
import XmlEnabledFix from "./XmlEnabledFix.js";
import {type AttributeDeclaration} from "../../xmlTemplate/xmlNodes.js";
import {ChangeAction, ChangeSet} from "../../../utils/textChanges.js";
import SourceFileMetadataCollector from "../SourceFileMetadataCollector.js";

export default class EventHandlersFix extends XmlEnabledFix {
	protected sourcePosition: PositionInfo | undefined;
	protected startPos: number | undefined;
	protected trailingCommaPos: number | undefined;
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

	// Finds the closest path relative to the viewPath.
	// That way, if there are multiple controls with the same namespace and name,
	// there's a chance to find the correct one. If more than one matches are found, then return undefined.
	private getClosestPath(sourcePaths: Set<string>, viewPath: string): string | undefined {
		if (!sourcePaths.size) {
			return undefined;
		} else if (sourcePaths.size === 1) {
			return Array.from(sourcePaths)[0];
		}

		const viewPathChunks = viewPath.split("/");
		let longestPrefixLength = 0;
		let closestPath: string | undefined;
		let hasMultipleWithSameLength = false;

		for (const sourcePath of sourcePaths) {
			const sourcePathChunks = sourcePath.split("/");
			// Find the common prefix length between the view path and the source path
			const commonPrefix = viewPathChunks.filter((chunk, index) => chunk === sourcePathChunks[index]);
			const commonPrefixLength = commonPrefix.length;

			if (commonPrefixLength > longestPrefixLength) {
				longestPrefixLength = commonPrefixLength;
				closestPath = sourcePath;
				hasMultipleWithSameLength = false;
			} else if (commonPrefixLength === longestPrefixLength && commonPrefixLength > 0) {
				hasMultipleWithSameLength = true;
			}
		}

		// Return undefined if multiple paths have the same longest prefix length
		return hasMultipleWithSameLength ? undefined : closestPath;
	}

	methodExistsInController(
		tsProgram: Program,
		checker: ts.TypeChecker,
		metadataCollector: SourceFileMetadataCollector,
		currentFilePath: string
	): void {
		const findClassDeclaration = (node: ts.Node): ts.ClassLikeDeclaration | undefined => {
			if (ts.isClassLike(node)) {
				return node;
			}
			return ts.forEachChild(node, findClassDeclaration);
		};

		const sourcePaths = metadataCollector.getMetadata()
			.controllerNamespace.byNamespace.get(this.controllerName!);
		const controllerPath = sourcePaths && this.getClosestPath(sourcePaths, currentFilePath);
		const sourceFile = controllerPath && tsProgram.getSourceFile(controllerPath);
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
			this.startPos = toPosition(node.value.start);
		}

		return this.hasAvailableController;
	}

	visitAutofixNode(_node: ts.Node, _position: number, _sourceFile: ts.SourceFile) {
		// Abstraction requires this method, but it's actually not needed here
		return true;
	}

	getAffectedSourceCodeRange() {
		if (this.startPos === undefined) {
			throw new Error("Start position is not defined");
		}
		return {
			start: this.startPos,
			end: 0,
		};
	}

	generateChanges(): ChangeSet | ChangeSet[] | undefined {
		if (typeof this.startPos === "number") {
			return {
				action: ChangeAction.INSERT,
				start: this.startPos,
				value: ".",
			};
		}
	}
}
