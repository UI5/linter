import ts from "typescript";
import {PositionInfo} from "../../LinterContext.js";
import {Attribute, Position, SaxEventType} from "sax-wasm";
import XmlEnabledFix from "./XmlEnabledFix.js";
import {ChangeAction, ChangeSet} from "../../../utils/textChanges.js";
import SourceFileMetadataCollector from "../SourceFileMetadataCollector.js";

export default class EventHandlersFix extends XmlEnabledFix {
	protected sourcePosition: PositionInfo | undefined;
	protected startPos: number | undefined;
	private isMethodInController = false;

	constructor(
		private methodName: string,
		private controllerName: string,
		sourcePosition?: PositionInfo
	) {
		super();
		if (sourcePosition) {
			this.sourcePosition = sourcePosition;
		}
	}

	visitLinterNode() {
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
		checker: ts.TypeChecker,
		metadataCollector: SourceFileMetadataCollector,
		currentFilePath: string
	): void {
		const {controllerInfo: controllerMetadata} = metadataCollector.getMetadata();
		const sourcePaths = controllerMetadata.nameToPath.get(this.controllerName);
		const controllerPath = sourcePaths && this.getClosestPath(sourcePaths, currentFilePath);
		const classDeclaration = controllerPath && controllerMetadata.classNodeByPath.get(controllerPath);
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

			this.isMethodInController = !!curType;
			return;
		}

		return;
	}

	visitAutofixXmlNode(
		node: Attribute,
		toPosition: (pos: Position) => number
	) {
		if (this.isMethodInController) {
			this.startPos = toPosition(node.value.start);
		}

		return this.isMethodInController;
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
			end: this.startPos + 1,
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
