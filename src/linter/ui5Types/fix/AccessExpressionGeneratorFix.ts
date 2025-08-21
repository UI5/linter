import {ChangeAction} from "../../../utils/textChanges.js";
import {Ui5TypeInfo} from "../Ui5TypeInfo.js";
import AccessExpressionBaseFix, {AccessExpressionBaseFixParams} from "./AccessExpressionBaseFix.js";

export interface AccessExpressionGeneratorFixParams extends AccessExpressionBaseFixParams {
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
	 * the whole access expression
	 *
	 * If the return value is undefined, no change will be generated
	 */
	generator: (identifierNames: string[]) => string | undefined;
}

/**
 * Fix a property access. This could also be the property access of a call expression, allowing for a more general
 * replacement in cases where the arguments or other conditions of the call expression do not matter.
 */
export default class AccessExpressionGeneratorFix extends AccessExpressionBaseFix {
	constructor(protected params: AccessExpressionGeneratorFixParams, ui5TypeInfo: Ui5TypeInfo) {
		super(params, ui5TypeInfo);
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
		if (this.startPos === undefined || this.endPos === undefined) {
			throw new Error("Start and end position are not defined");
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

		// If a generator function is provided, use it to generate the change
		const value = this.params.generator(identifiers);
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
