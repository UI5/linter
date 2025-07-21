import ts from "typescript";
import Fix from "./Fix.js";
import CallExpressionFix, {CallExpressionFixParams} from "./CallExpressionFix.js";
import AccessExpressionFix, {AccessExpressionFixParams} from "./AccessExpressionFix.js";
import type Ui5TypeInfoMatcher from "../Ui5TypeInfoMatcher.js";
import {getModuleTypeInfo, Ui5TypeInfo, Ui5TypeInfoKind} from "../Ui5TypeInfo.js";
import {AmbientModuleCache} from "../AmbientModuleCache.js";
import getGlobalFixInfo, {GlobalFixInfo} from "./getGlobalFixInfo.js";
import CallExpressionGeneratorFix, {CallExpressionGeneratorFixParams} from "./CallExpressionGeneratorFix.js";
import AccessExpressionGeneratorFix, {AccessExpressionGeneratorFixParams} from "./AccessExpressionGeneratorFix.js";
import PropertyAssignmentFix, {PropertyAssignmentFixParams} from "./PropertyAssignmentFix.js";
import PropertyAssignmentGeneratorFix, {
	PropertyAssignmentGeneratorFixParams,
} from "./PropertyAssignmentGeneratorFix.js";
import ObsoleteImportFix, {ObsoleteImportFixParams} from "./ObsoleteImportFix.js";
import {JqueryTypeInfo} from "../getJqueryTypeInfo.js";

const AUTOFIX_COLLECTIONS = [
	"sapUiCoreFixes",
	"jqueryFixes",
	"sapMFixes",
	"sapUiLayoutFixes",
	"sapUiCompFixes",
	"globalFixes",
];

interface FixCollection {
	default: FixTypeInfoMatcher;
};

export type FixCallback<T extends Fix = Fix> = (ui5TypeInfo: Ui5TypeInfo) => T;
export type FixTypeInfoMatcher = Ui5TypeInfoMatcher<FixCallback>;

export default class FixFactory {
	private constructor(
		private checker: ts.TypeChecker,
		private ambientModuleCache: AmbientModuleCache,
		private collections: Map<string, FixTypeInfoMatcher>
	) {}

	static async create(checker: ts.TypeChecker, ambientModuleCache: AmbientModuleCache) {
		const collections = new Map<string, FixTypeInfoMatcher>();
		for (const collectionName of AUTOFIX_COLLECTIONS) {
			const {default: filter} = await import(`./collections/${collectionName}.js`) as FixCollection;
			const libraryName = filter.getLibraryName();
			if (!libraryName) {
				throw new Error(
					`Fix collection ${collectionName} must define a library name in the constructor`);
			}
			collections.set(libraryName, filter);
		}
		return new FixFactory(checker, ambientModuleCache, collections);
	}

	getFix(node: ts.Node, ui5TypeInfo: Ui5TypeInfo): Fix | undefined {
		const moduleTypeInfo = getModuleTypeInfo(ui5TypeInfo);
		let collection;
		if (moduleTypeInfo) {
			collection = moduleTypeInfo.library;
		} else {
			// If no module type info is available, we assume it's a global fix
			collection = "global";
		}
		const filter = this.collections.get(collection);
		if (!filter) {
			return; // No collection found for the library
		}

		const fixCallback = filter.match(ui5TypeInfo);
		if (!fixCallback) {
			return;
		}
		return fixCallback(ui5TypeInfo);
	}

	getJqueryTypeInfoForFix(
		node: ts.AccessExpression | ts.CallExpression, ui5TypeInfo: Ui5TypeInfo
	): JqueryTypeInfo | undefined {
		const filter = this.collections.get("jquery")!;

		// Search up the AST for a node matching with a fix
		while (!filter.match(ui5TypeInfo)) {
			if (ui5TypeInfo.kind === Ui5TypeInfoKind.Module || !ui5TypeInfo.parent) {
				// We reached the module type info, but it does not match the filter
				return;
			}
			ui5TypeInfo = ui5TypeInfo.parent;
			if (ts.isCallExpression(node)) {
				node = node.expression as ts.AccessExpression;
			}
			node = node.expression as ts.AccessExpression;
		}
		return {
			ui5TypeInfo,
			node,
		};
	}

	getGlobalFixInfo(node: ts.CallExpression | ts.AccessExpression): GlobalFixInfo | undefined {
		return getGlobalFixInfo(node, this.ambientModuleCache);
	}
}

export function accessExpressionFix(params: AccessExpressionFixParams): FixCallback<AccessExpressionFix> {
	return (ui5TypeInfo: Ui5TypeInfo) => new AccessExpressionFix(params, ui5TypeInfo);
}

export function accessExpressionGeneratorFix(
	params: AccessExpressionGeneratorFixParams
): FixCallback<AccessExpressionGeneratorFix> {
	return (ui5TypeInfo: Ui5TypeInfo) => new AccessExpressionGeneratorFix(params, ui5TypeInfo);
}

export function callExpressionFix(params: CallExpressionFixParams): FixCallback<CallExpressionFix> {
	return (ui5TypeInfo: Ui5TypeInfo) => new CallExpressionFix(params, ui5TypeInfo);
}

export function callExpressionGeneratorFix<GeneratorContext extends object = object>(
	params: CallExpressionGeneratorFixParams<GeneratorContext>
): FixCallback<CallExpressionGeneratorFix<GeneratorContext>> {
	return (ui5TypeInfo: Ui5TypeInfo) => new CallExpressionGeneratorFix<GeneratorContext>(params, ui5TypeInfo);
}

export function propertyAssignmentFix(params: PropertyAssignmentFixParams): FixCallback<PropertyAssignmentFix> {
	return (_ui5TypeInfo: Ui5TypeInfo) => new PropertyAssignmentFix(params);
}

export function propertyAssignmentGeneratorFix<GeneratorContext extends object = object>(
	params: PropertyAssignmentGeneratorFixParams<GeneratorContext>
): FixCallback<PropertyAssignmentGeneratorFix<GeneratorContext>> {
	return (_ui5TypeInfo: Ui5TypeInfo) => new PropertyAssignmentGeneratorFix(params);
}

export function obsoleteImportFix(params: ObsoleteImportFixParams): FixCallback<ObsoleteImportFix> {
	return (_ui5TypeInfo: Ui5TypeInfo) => new ObsoleteImportFix(params);
}
