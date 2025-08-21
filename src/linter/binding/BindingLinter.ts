import LinterContext, {PositionInfo, ResourcePath} from "../LinterContext.js";
import {MESSAGE} from "../messages.js";
import {RequireDeclaration} from "../xmlTemplate/Parser.js";
import BindingParser, {
	AggregationBindingInfo, BindingInfo, ExpressionBinding, FilterInfo, PropertyBindingInfo, SorterInfo,
} from "./lib/BindingParser.js";

const ODATA_EXPRESSION_ADDONS_MODULE = "sap/ui/model/odata/ODataExpressionAddons";
const ODATA_FUNCTION_MODULE_MAP: Record<string, string> = {
	compare: "sap/ui/model/odata/v4/ODataUtils",
	fillUriTemplate: "sap/ui/thirdparty/URITemplate",
	uriEncode: "sap/ui/model/odata/ODataUtils",
} as const;

export default class BindingLinter {
	#resourcePath: string;
	#context: LinterContext;
	#isJsBindingString: boolean;

	constructor(resourcePath: ResourcePath, context: LinterContext, isJsBindingString = false) {
		this.#resourcePath = resourcePath;
		this.#context = context;
		this.#isJsBindingString = isJsBindingString;
	}

	#parseBinding(binding: string): BindingInfo | string | undefined {
		// Do not unescape (3rd argument), as we're only interested in the binding
		const bindingInfo = BindingParser.complexParser(binding, null, false, true, true, true);
		return bindingInfo;
	}

	#analyzeCommonBindingParts(
		bindingInfo: BindingInfo | string, requireDeclarations: RequireDeclaration[], position: PositionInfo) {
		let path, events;
		if (typeof bindingInfo === "string") {
			path = bindingInfo;
		} else {
			path = bindingInfo.path;
			events = bindingInfo.events;
		}
		if (events && typeof events === "object") {
			for (const eventHandler of Object.values(events)) {
				this.checkForGlobalReference(eventHandler, requireDeclarations, position);
			}
		}

		if (path) {
			// Check for computed annotations (@@ syntax)
			const atAtIndex = path.indexOf("@@");
			if (atAtIndex >= 0) {
				const openingBracketIndex = path.indexOf("(", atAtIndex); // opening bracket is optional
				const computationFunction = path.slice(
					atAtIndex + 2, openingBracketIndex !== -1 ? openingBracketIndex : undefined
				);
				// Exclude built-in functions for currency and units of measure from global check.
				// See: https://github.com/SAP/openui5/blob/e1de19f9a09a0e7a112d63a8f8d4b04afa96620c/src/sap.ui.core/src/sap/ui/model/odata/v4/ODataMetaModel.js#L1268-L1274
				if (computationFunction !== "requestCurrencyCodes" && computationFunction !== "requestUnitsOfMeasure") {
					this.checkForGlobalReference(computationFunction, requireDeclarations, position);
				}
			}
		}

		if (typeof bindingInfo === "object" && "tokens" in bindingInfo) {
			this.#lintExpressionBindingTokens(bindingInfo, requireDeclarations, position);
		}
	}

	#analyzePropertyBinding(
		bindingInfo: PropertyBindingInfo | string, requireDeclarations: RequireDeclaration[], position: PositionInfo) {
		if (typeof bindingInfo === "string") {
			return;
		}
		const {formatter, type} = bindingInfo;
		if (formatter) {
			// If the binding is defined as a string and inside a JS/TS sourcefile,
			// the imports cannot be used for resolving formatter references:
			if (this.#isJsBindingString) {
				requireDeclarations = [];
			}
			if (Array.isArray(formatter)) {
				formatter.forEach((formatterItem) => {
					this.checkForGlobalReference(formatterItem, requireDeclarations, position);
				});
			} else {
				this.checkForGlobalReference(formatter, requireDeclarations, position);
			}
		}
		if (type) {
			this.checkForGlobalReference(type, requireDeclarations, position);
		}
	}

	#analyzeAggregationBinding(
		bindingInfo: AggregationBindingInfo | string, requireDeclarations: RequireDeclaration[], position: PositionInfo
	) {
		if (typeof bindingInfo === "string") {
			return;
		}
		const {factory, groupHeaderFactory, filters, sorter} = bindingInfo;
		if (factory) {
			this.checkForGlobalReference(factory, requireDeclarations, position);
		}
		if (groupHeaderFactory) {
			this.checkForGlobalReference(groupHeaderFactory, requireDeclarations, position);
		}
		if (filters) {
			this.#analyzeFilters(filters, requireDeclarations, position);
		}
		if (sorter) {
			this.#analyzeSorter(sorter, requireDeclarations, position);
		}
	}

	#analyzeFilters(
		filters: FilterInfo | FilterInfo[], requireDeclarations: RequireDeclaration[], position: PositionInfo) {
		if (Array.isArray(filters)) {
			for (const filter of filters) {
				this.#analyzeFilters(filter, requireDeclarations, position);
			}
			return;
		}
		const {test, filters: nestedFilters, condition} = filters;
		if (test) {
			this.checkForGlobalReference(test, requireDeclarations, position);
		}
		if (nestedFilters) {
			this.#analyzeFilters(nestedFilters, requireDeclarations, position);
		}
		if (condition) {
			this.#analyzeFilters(condition, requireDeclarations, position);
		}
	}

	#analyzeSorter(
		sorter: SorterInfo | SorterInfo[], requireDeclarations: RequireDeclaration[], position: PositionInfo) {
		if (Array.isArray(sorter)) {
			for (const sorterItem of sorter) {
				this.#analyzeSorter(sorterItem, requireDeclarations, position);
			}
			return;
		}
		const {group, comparator} = sorter;
		if (group && typeof group !== "boolean") {
			this.checkForGlobalReference(group, requireDeclarations, position);
		}
		if (comparator) {
			this.checkForGlobalReference(comparator, requireDeclarations, position);
		}
	}

	checkForGlobalReference(ref: string, requireDeclarations: RequireDeclaration[], position: PositionInfo) {
		// Global reference detected
		const variableName = this.getGlobalReference(ref, requireDeclarations);
		if (!variableName) {
			return;
		}
		this.#context.addLintingMessage(this.#resourcePath, {id: MESSAGE.NO_GLOBALS, args: {
			variableName,
			namespace: ref,
		}, position});
	}

	getGlobalReference(ref: string, requireDeclarations: RequireDeclaration[]): string | null {
		if (ref.startsWith(".")) {
			// Ignore empty reference or reference to the controller (as indicated by the leading dot)
			return null;
		}
		const parts = ref.split(".");
		let variableName;
		if (parts.length) {
			variableName = parts[0];
		} else {
			variableName = ref;
		}
		const requireDeclaration = requireDeclarations.find((decl) =>
			decl.variableName === variableName ||
			decl.moduleName === parts.join("/"));
		if (requireDeclaration) {
			// Local reference detected
			return null;
		}

		// Global reference detected
		return variableName;
	}

	lintPropertyBinding(
		bindingDefinition: string, requireDeclarations: RequireDeclaration[],
		position: PositionInfo, reportParsingError = true
	): {bindingInfo: BindingInfo | string | undefined; errorMessage: string | undefined} {
		let bindingInfo, errorMessage;
		try {
			bindingInfo = this.#parseBinding(bindingDefinition);
			if (bindingInfo) {
				this.#lintPropertyBindingInfo(bindingInfo, requireDeclarations, position);
			}
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : String(err);
			if (reportParsingError) {
				this.reportParsingError(errorMessage, position);
			}
		}
		return {bindingInfo, errorMessage};
	}

	#lintPropertyBindingInfo(
		bindingInfo: BindingInfo | string, requireDeclarations: RequireDeclaration[], position: PositionInfo
	) {
		this.#analyzeCommonBindingParts(bindingInfo, requireDeclarations, position);
		this.#analyzePropertyBinding(bindingInfo, requireDeclarations, position);

		// Recursively check all parts of the property binding
		if (typeof bindingInfo === "object" && bindingInfo.parts) {
			for (const part of bindingInfo.parts) {
				this.#lintPropertyBindingInfo(part, requireDeclarations, position);
			}
		}
	}

	lintAggregationBinding(
		bindingDefinition: string, requireDeclarations: RequireDeclaration[], position: PositionInfo) {
		try {
			const bindingInfo = this.#parseBinding(bindingDefinition);
			if (typeof bindingInfo === "object") {
				this.#lintAggregationBindingInfo(bindingInfo, requireDeclarations, position);
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			this.reportParsingError(message, position);
		}
	}

	#lintAggregationBindingInfo(
		bindingInfo: BindingInfo | string, requireDeclarations: RequireDeclaration[], position: PositionInfo
	) {
		this.#analyzeCommonBindingParts(bindingInfo, requireDeclarations, position);
		this.#analyzeAggregationBinding(bindingInfo, requireDeclarations, position);
		// As XML templating interprets all bindings as property bindings we also have to run the
		// property binding analysis here.
		// Note: This also covers the analysis of commons binding parts such as events and path
		this.#analyzePropertyBinding(bindingInfo, requireDeclarations, position);

		// Recursively check all parts of the aggregation binding
		if (typeof bindingInfo === "object" && bindingInfo.parts) {
			for (const part of bindingInfo.parts) {
				this.#lintAggregationBindingInfo(part, requireDeclarations, position);
			}
		}
	}

	#lintExpressionBindingTokens(
		expressionBinding: ExpressionBinding, requireDeclarations: RequireDeclaration[], position: PositionInfo
	) {
		const {tokens} = expressionBinding;
		for (let i = 0; i < tokens.length; i++) {
			const token = tokens[i];
			if (token.id !== "IDENTIFIER" || token.value !== "odata" || tokens[i + 1]?.id !== ".") {
				continue;
			}
			const functionToken = tokens[i + 2];
			if (functionToken?.id !== "IDENTIFIER") {
				// Can't happen. A "." must be followed by an IDENTIFIER
				continue;
			}
			const functionName = functionToken.value;
			if (functionName in ODATA_FUNCTION_MODULE_MAP) {
				const expectedModuleName = ODATA_FUNCTION_MODULE_MAP[functionName];
				if (
					// There must be either an import for the corresponding module
					// or for the ODataExpressionAddons module
					!requireDeclarations.some((decl) =>
						decl.moduleName === expectedModuleName || decl.moduleName === ODATA_EXPRESSION_ADDONS_MODULE)
				) {
					this.#context.addLintingMessage(
						this.#resourcePath, {id: MESSAGE.NO_ODATA_GLOBALS, position}
					);
				}
			}
			i += 2; // Skip the next two tokens as we already checked them
		}
	}

	reportParsingError(message: string, position: PositionInfo) {
		this.#context.addLintingMessage(this.#resourcePath, {id: MESSAGE.PARSING_ERROR, args: {message}, position});
	}
}
