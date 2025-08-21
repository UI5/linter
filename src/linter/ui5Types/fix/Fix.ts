import ts from "typescript";
import {PositionInfo} from "../../LinterContext.js";
import {ChangeSet} from "../../../utils/textChanges.js";
import {SaxEventType} from "sax-wasm";
import {JSONSchemaForSAPUI5Namespace} from "../../../manifest.js";

export interface ModuleDependencyRequest {
	moduleName: string;
	usagePosition: number;
	preferredIdentifier?: string;
	blockNewImport?: boolean;
}

export interface ObsoleteModuleDependency {
	moduleName: string;
	usagePosition: number;
}

export interface GlobalAccessRequest {
	globalName: string;
	usagePosition: number;
}

export interface SourceCodeRange {
	start: number;
	end: number;
}

export interface NodeSearchParameters {
	nodeTypes: ts.SyntaxKind[];
	xmlEventTypes?: SaxEventType[];
	position: PositionInfo;
}

export interface FixHelpers {
	checker: ts.TypeChecker;
	manifestContent?: string;
	libraryDependencies: JSONSchemaForSAPUI5Namespace["dependencies"]["libs"];
}

export default abstract class Fix {
	/**
	 * Visit the node this fix has been created for in the (transpiled) linter AST
	 * Returns true if the provided node can be used for the fix
	 */
	abstract visitLinterNode(node: ts.Node, sourcePosition: PositionInfo, helpers: FixHelpers): boolean;

	/**
	 * Provide parameters for the autofix process to find the relevant node in the source AST
	 */
	abstract getNodeSearchParameters(): NodeSearchParameters;

	/**
	 * Visit the first matched node in the source-AST used during autofix (not transpiled, no types available)
	 * Returns true if the provided node can be used for the fix
	 */
	abstract visitAutofixNode(node: ts.Node, position: number, sourceFile: ts.SourceFile): boolean;

	/**
	 * Get the positions in the source code that will be modified by this change. This will be used for
	 * detecting conflicts with other fixes.
	 */
	getAffectedSourceCodeRange?(): SourceCodeRange | SourceCodeRange[] | undefined;

	getNewModuleDependencies?(): ModuleDependencyRequest | ModuleDependencyRequest[] | undefined;
	getObsoleteModuleDependencies?(): ObsoleteModuleDependency | ObsoleteModuleDependency[] | undefined;
	getNewGlobalAccess?(): GlobalAccessRequest | GlobalAccessRequest[] | undefined;

	setIdentifierForDependency?(identifier: string, moduleName: string): void;
	setIdentifierForGlobal?(identifier: string, globalName: string): void;
	generateChanges?(): ChangeSet | ChangeSet[] | undefined;
}
