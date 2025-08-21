import ts from "typescript";
import {ChangeAction} from "../../../utils/textChanges.js";
import {PositionInfo} from "../../LinterContext.js";
import CallExpressionBaseFix, {CallExpressionBaseFixParams} from "./CallExpressionBaseFix.js";
import {FixHelpers} from "./Fix.js";
import {Ui5TypeInfo} from "../Ui5TypeInfo.js";

export interface CallExpressionGeneratorFixParams<GeneratorContext extends object> extends CallExpressionBaseFixParams {
	/**
	 * Validation: If set to true, the fix will only be applied if the return value of the code does not use the
	 * return value of the call expression.
	 */
	mustNotUseReturnValue?: boolean;

	/**
	 * Modules to import. If this parameter is specified, the standalone parameters "moduleName" and
	 * "preferredIdentifier" must not be provided.
	*/
	moduleImports?: {
		moduleName: string;
		preferredIdentifier?: string;
	}[];

	/**
	 * Names of a global variable to use in the fix (e.g. "document"). If this parameter is specified, parameter
	 * "globalName" must not be provided.
	 *
	 * The fix will be provided with the identifier names or property access strings to use via
	 * the setIdentifierForGlobal method.
	 *
	 * For example, if there is already a conflicting identifier within the same file,
	 * the fix will be provided with an alternative like "globalThis.document"
	 */
	globalNames?: string[];

	/**
	 * The generator function will be used to determine the value of the replacement, affecting
	 * the whole call expression
	 *
	 * If the return value is undefined, no change will be generated.
	 *
	 * @param ctx - The context object that can be used to store information between validation and generation
	 * @param identifierNames - The names of the identifiers that were set for the requested modules and/or global
	 * 	identifiers. If both, modules and globals are requested, the array will first contain the module identifier
	 * 	names in the order they have been requested, followed by the globals.
	 * @param args - The arguments of the call expression, as string representations of the source code, including
	 * 	line breaks and comments.
	 */
	generator: (
		ctx: GeneratorContext, identifierNames: string[], ...args: string[]
	) => string | undefined;

	/**
	 * Validate the arguments of the call expression, optionally using the provided checker
	 *
	 * This hook may also collect information that affects the generator. For that, it can store
	 * information in the provided context object, which can be retrieved later in the generator function
	 */
	validateArguments?: (ctx: GeneratorContext, helpers: FixHelpers, ...args: ts.Expression[]) => boolean;
}

export default class CallExpressionGeneratorFix<GeneratorContext extends object> extends CallExpressionBaseFix {
	protected generatorArgs: string[] | undefined;
	protected generatorContext = {} as GeneratorContext;

	constructor(protected params: CallExpressionGeneratorFixParams<GeneratorContext>, ui5TypeInfo: Ui5TypeInfo) {
		super(params, ui5TypeInfo);
	}

	visitLinterNode(node: ts.Node, sourcePosition: PositionInfo, helpers: FixHelpers) {
		if (!super.visitLinterNode(node, sourcePosition, helpers)) {
			return false;
		}
		if (!ts.isCallExpression(node)) {
			return false;
		}
		if (this.params.validateArguments) {
			if (!this.params.validateArguments(this.generatorContext, helpers, ...node.arguments)) {
				return false;
			}
		}
		return true;
	}

	visitAutofixNode(node: ts.Node, position: number, sourceFile: ts.SourceFile) {
		if (!super.visitAutofixNode(node, position, sourceFile)) {
			return false;
		}
		if (!ts.isCallExpression(node)) {
			return false;
		}

		// Collect arguments for the generator function
		this.generatorArgs = node.arguments.map((arg) => {
			return arg.getFullText();
		});
		return true;
	}

	getNewModuleDependencies() {
		if (this.params.moduleName && this.params.moduleImports) {
			throw new Error(
				"Parameters 'moduleName' and 'moduleImports' are both defined. Only one may be used at a time.");
		} else if (this.params.moduleName) {
			return super.getNewModuleDependencies();
		} else if (!this.params.moduleImports) {
			return;
		}

		const usagePosition = this.startPos;
		if (usagePosition === undefined) {
			throw new Error("Start position is not defined");
		}
		return this.params.moduleImports.map((moduleImport) => {
			return {
				...moduleImport,
				usagePosition,
			};
		});
	}

	getNewGlobalAccess() {
		if (this.params.globalName && this.params.globalNames) {
			throw new Error(
				"Parameters 'globalName' and 'globalNames' are both defined. Only one may be used at a time.");
		} else if (this.params.globalName) {
			return super.getNewGlobalAccess();
		} else if (!this.params.globalNames) {
			return;
		}
		const usagePosition = this.startPos;
		if (usagePosition === undefined) {
			throw new Error("Start position is not defined");
		}

		return this.params.globalNames.map((globalName) => {
			return {
				globalName,
				usagePosition,
			};
		});
	}

	generateChanges() {
		if (this.startPos === undefined || this.endPos === undefined || !this.generatorArgs) {
			throw new Error("Start, end position or arguments are not defined");
		}

		let moduleNames: string[] | undefined;
		if (this.params.moduleName) {
			moduleNames = [this.params.moduleName];
		} else if (this.params.moduleImports) {
			moduleNames = this.params.moduleImports.map((moduleImport) => moduleImport.moduleName);
		}

		const globalNames = this.params.globalName ? [this.params.globalName] : this.params.globalNames;

		const identifiers = this.getIdentifiersForMultipleRequests(moduleNames, globalNames);
		if (!identifiers) {
			return;
		}

		const value = this.params.generator(
			this.generatorContext, identifiers, ...this.generatorArgs);
		if (value === undefined) {
			return;
		}
		return {
			action: ChangeAction.REPLACE,
			start: this.startPos,
			end: this.endPos,
			value,
		};
	}
}
