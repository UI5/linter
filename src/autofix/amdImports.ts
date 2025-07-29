import ts from "typescript";
import path from "node:path/posix";
import {getLogger} from "@ui5/logger";
import {ChangeAction, ChangeSet, ExistingModuleDeclarationInfo} from "./autofix.js";
import {getPropertyNameText} from "../linter/ui5Types/utils/utils.js";
import {RequireExpression} from "../linter/ui5Types/amdTranspiler/parseRequire.js";
import {ModuleDeclaration} from "../linter/ui5Types/amdTranspiler/parseModuleDeclaration.js";

const log = getLogger("linter:autofix");
const LINE_LENGTH_LIMIT = 200;

function resolveRelativeDependency(dependency: string, moduleName: string): string {
	return path.resolve("/" + path.dirname(moduleName), dependency).substring(1);
}

interface DependencyMapValue {
	node: ts.StringLiteralLike;
	index: number;
	leadingComma?: ts.Token<ts.SyntaxKind.CommaToken>;
	trailingComma?: ts.Token<ts.SyntaxKind.CommaToken>;
}

export const NO_PARAM_FOR_DEPENDENCY = Symbol("noParamForDependency");
export const UNSUPPORTED_PARAM_FOR_DEPENDENCY = Symbol("unsupportedParamForDependency");
type ModuleName = string;
export type Dependencies = Map<ModuleName,
	string | typeof NO_PARAM_FOR_DEPENDENCY | typeof UNSUPPORTED_PARAM_FOR_DEPENDENCY>;

export function hasBody(moduleDeclaration: ModuleDeclaration | RequireExpression): boolean {
	if ("factory" in moduleDeclaration) {
		return !!moduleDeclaration.factory;
	} else if ("callback" in moduleDeclaration) {
		return !!moduleDeclaration.callback;
	}
	log.verbose(`Encountered a module declaration with no factory or callback`);
	return false;
}

export function getFactoryBody(moduleDeclaration: ExistingModuleDeclarationInfo): ts.Node | undefined {
	const {moduleDeclaration: declaration} = moduleDeclaration;
	if ("factory" in declaration && declaration.factory && "body" in declaration.factory) {
		return declaration.factory.body;
	} else if ("callback" in declaration && declaration.callback) {
		return declaration.callback.body;
	}
	log.verbose(`Encountered a module declaration with no factory or callback`);
	return undefined;
}

export function getDependencies(moduleDeclaration: ModuleDeclaration | RequireExpression, resourcePath: string) {
	const dependencies: Dependencies = new Map(); // Module name to identifier
	if (!moduleDeclaration.dependencies) {
		return dependencies;
	}
	const factory = "factory" in moduleDeclaration ? moduleDeclaration.factory : moduleDeclaration.callback;
	if (!factory || !ts.isFunctionLike(factory)) {
		throw new Error("Invalid factory function in module declaration");
	}
	const dependencyArray = moduleDeclaration.dependencies;
	const moduleName =
		resourcePath.startsWith("/resources/") ? resourcePath.substring("/resources/".length) : undefined;
	for (let i = 0; i < dependencyArray.elements.length; i++) {
		const element = dependencyArray.elements[i];
		if (!ts.isStringLiteralLike(element)) {
			continue;
		}
		let dependencyText = element.text;
		if (moduleName && dependencyText.startsWith(".")) {
			dependencyText = resolveRelativeDependency(dependencyText, moduleName);
		}

		if (!dependencies.has(dependencyText)) {
			const param = factory.parameters[i];
			let identifier;
			if (!param) {
				identifier = NO_PARAM_FOR_DEPENDENCY;
			} else if (ts.isIdentifier(param.name)) {
				identifier = param.name.text;
			} else {
				// Some sort of binding pattern, e.g. ({foo, bar}) => { or ([foo, bar]) => {
				identifier = UNSUPPORTED_PARAM_FOR_DEPENDENCY;
			}
			dependencies.set(dependencyText, identifier);
		}
	}
	return dependencies;
}

export function createDependencyInfo(dependencyArray: ts.ArrayLiteralExpression | undefined, resourcePath: string) {
	const moduleName =
		resourcePath.startsWith("/resources/") ? resourcePath.substring("/resources/".length) : undefined;
	const dependencyMap = new Map<string, DependencyMapValue>();
	const quoteStyleCount = {
		"`": 0,
		"'": 0,
		"\"": 0, // Double quotes will be prioritized if tied
	};
	if (dependencyArray) {
		let syntaxList: ts.SyntaxList | undefined;
		for (const child of dependencyArray.getChildren()) {
			if (child.kind === ts.SyntaxKind.SyntaxList) {
				syntaxList = child as ts.SyntaxList;
				break;
			}
		}
		if (!syntaxList) {
			throw new Error("SyntaxList not found in dependencies array");
		}

		let previousComma: ts.Token<ts.SyntaxKind.CommaToken> | undefined;
		let previousDependency: DependencyMapValue | undefined;
		for (const child of syntaxList.getChildren()) {
			if (child.kind === ts.SyntaxKind.CommaToken) {
				if (previousDependency) {
					previousDependency.trailingComma = child as ts.Token<ts.SyntaxKind.CommaToken>;
					previousDependency = undefined;
				}
				previousComma = child as ts.Token<ts.SyntaxKind.CommaToken>;
			}

			if (!ts.isStringLiteralLike(child)) {
				continue;
			}
			// In case of duplicate imports, we only use the first one.
			// As the map is only used for a lookup for reusing existing imports and not
			// as a exhaustive list of dependencies, this is fine.
			let dependencyText = child.text;
			if (moduleName && dependencyText.startsWith(".")) {
				dependencyText = resolveRelativeDependency(dependencyText, moduleName);
			}

			if (!dependencyMap.has(dependencyText)) {
				previousDependency = {node: child, index: dependencyArray.elements.indexOf(child)};
				if (previousComma) {
					previousDependency.leadingComma = previousComma;
					previousComma = undefined;
				}
				dependencyMap.set(dependencyText, previousDependency);
			}

			// Check which quote style format is used for existing dependencies
			// and use the same for the new dependencies (majority wins):
			if (child.getText().startsWith("'")) {
				quoteStyleCount["'"]++;
			} else if (child.getText().startsWith("\"")) {
				quoteStyleCount["\""]++;
			} else if (ts.isNoSubstitutionTemplateLiteral(child)) {
				quoteStyleCount["`"]++;
			}
		}
	}
	const mostUsedQuoteStyle = Object.entries(quoteStyleCount).reduce((a, b) => a[1] > b[1] ? a : b)[0];
	return {dependencyMap, mostUsedQuoteStyle};
}

function getParameterSyntax(
	node: ts.ArrowFunction | ts.FunctionDeclaration | ts.FunctionExpression
): {syntaxList: ts.SyntaxList; hasParens: boolean} {
	let syntaxList: ts.SyntaxList | undefined;
	let hasParens = false;
	for (const child of node.getChildren()) {
		if (child.kind === ts.SyntaxKind.SyntaxList) {
			syntaxList = child as ts.SyntaxList;
		}
		if (child.kind === ts.SyntaxKind.OpenParenToken || child.kind === ts.SyntaxKind.CloseParenToken) {
			hasParens = true;
		}
	}
	if (syntaxList) {
		return {syntaxList, hasParens};
	} else {
		throw new Error("SyntaxList not found in factory function");
	}
}

export function addDependencies(
	defineCall: ts.CallExpression, moduleDeclarationInfo: ExistingModuleDeclarationInfo,
	changeSet: ChangeSet[],
	resourcePath: string,
	removedDependencies: Set<string>
) {
	const {moduleDeclaration, importRequests} = moduleDeclarationInfo;

	if (importRequests.size === 0) {
		return;
	}

	const factory = "factory" in moduleDeclaration ? moduleDeclaration.factory : moduleDeclaration.callback;

	if (!factory || !ts.isFunctionLike(factory)) {
		throw new Error("Invalid factory function");
	}

	const moduleName = "moduleName" in moduleDeclaration ? moduleDeclaration.moduleName : undefined;

	const dependencies = moduleDeclaration.dependencies?.elements;
	const remainingDependencies: ts.Expression[] = [];
	const {dependencyMap, mostUsedQuoteStyle} = createDependencyInfo(moduleDeclaration.dependencies, resourcePath);
	const removedDepsIndices = dependencies?.reduce((acc, dep, index) => {
		if (ts.isPropertyName(dep) && removedDependencies.has(getPropertyNameText(dep) ?? "")) {
			acc.push(index);
		} else {
			// If the dependency is not removed, we need to keep it
			remainingDependencies.push(dep);
		}

		return acc;
	}, [] as number[]) ?? [];
	let numberOfDependencies = remainingDependencies.length;

	const parameters = factory.parameters.filter((_dep, index) => !removedDepsIndices.includes(index));
	const parameterSyntax = getParameterSyntax(factory);

	const newDependencies: {
		moduleName: string;
		identifier: string;
		existingDependency?: DependencyMapValue;
		dependencyExists?: boolean;
	}[] = [];

	// Prefer using the second element for separator detection as the first one might not have a line-break before it
	const depsSeparator = extractIdentifierSeparator(
		dependencies?.[1]?.getFullText() ?? dependencies?.[0]?.getFullText() ?? "");
	const identifiersSeparator = extractIdentifierSeparator(
		factory.parameters[1]?.getFullText() ??
		factory.parameters[0]?.getFullText() ?? "");

	// Calculate after which index we can add new dependencies / parameters
	let insertDependenciesAfterIndex = Math.min(parameters.length, remainingDependencies.length) - 1;
	const insertParametersAfterIndex = insertDependenciesAfterIndex;

	// Check whether requested imports are already available in the list of dependencies
	for (const [dependencyModuleName, importRequest] of importRequests) {
		const existingDependency = removedDependencies.has(dependencyModuleName) ?
			undefined :
				dependencyMap.get(dependencyModuleName);
		// Add a new dependency
		newDependencies.push({
			existingDependency,
			moduleName: dependencyModuleName,
			identifier: importRequest.identifier,
		});
	}

	// Sort by existing dependency index, then by module name
	// Sorting by index is needed to properly check for re-using existing dependencies
	newDependencies.sort((a, b) => {
		if (a.existingDependency && b.existingDependency) {
			return a.existingDependency.index - b.existingDependency.index;
		} else if (a.existingDependency) {
			return -1;
		} else if (b.existingDependency) {
			return 1;
		} else {
			return a.moduleName.localeCompare(b.moduleName);
		}
	});

	// Check whether existing dependencies without factory parameters can be reused or need to be re-added
	newDependencies.forEach((newDependency) => {
		const existingDependency = newDependency.existingDependency;
		if (!existingDependency) {
			return;
		}
		if (existingDependency.index === insertDependenciesAfterIndex + 1) {
			// The dependency is already in the correct position, so we can skip adding it again
			insertDependenciesAfterIndex++;
			newDependency.dependencyExists = true;
		} else {
			// We need to remove the existing dependency and re-add it at the correct position

			let start = existingDependency.node.getFullStart();
			let end = existingDependency.node.getEnd();

			// Leading comma means, it's not the first dependency, so we also remove the comma before
			// the dependency
			if (existingDependency.leadingComma) {
				start = existingDependency.leadingComma.getFullStart();
			} else if (existingDependency.trailingComma) {
				// First dependency, but there might be more, so we also remove the comma after the dependency
				end = existingDependency.trailingComma.getEnd();
			}
			changeSet.push({action: ChangeAction.DELETE, start, end});
			dependencyMap.delete(newDependency.moduleName);

			// Update number of dependencies
			numberOfDependencies--;

			remainingDependencies.splice(existingDependency.index, 1);

			// Ensure that the new dependency will be the same, e.g. in case it is a relative path
			newDependency.moduleName = existingDependency.node.text;
		}
	});

	// Add new dependencies
	if (newDependencies.length) {
		const newDependencyValue = newDependencies.filter(($) => !$.dependencyExists).map((newDependency) => {
			return `${mostUsedQuoteStyle}${newDependency.moduleName}${mostUsedQuoteStyle}`;
		}).join(depsSeparator.trailing);

		if (newDependencyValue) {
			const insertAfterDependencyElement = remainingDependencies[insertDependenciesAfterIndex];
			if (insertAfterDependencyElement || (dependencies && insertDependenciesAfterIndex === -1)) {
				const existingDependenciesLeft = insertDependenciesAfterIndex > -1 && numberOfDependencies > 0;
				const existingDependenciesRight = insertDependenciesAfterIndex === -1 && numberOfDependencies > 0;
				let value = existingDependenciesLeft ? depsSeparator.trailing : depsSeparator.leading;
				value += newDependencyValue;
				if (existingDependenciesRight) {
					if (depsSeparator.trailing.includes("\n")) {
						value += ",";
					} else {
						// Ensure to add a new space in case there are no line-breaks for separation
						value += ", ";
					}
				}
				const start = insertAfterDependencyElement?.getEnd() ?? dependencies?.pos;
				if (start === undefined) {
					throw new Error("Cannot determine start position for inserting dependencies");
				}
				changeSet.push({
					action: ChangeAction.INSERT,
					start,
					value: formatDependencies(value, depsSeparator.trailing, {pos: start, node: defineCall}),
				});
			} else {
				// No dependencies array found, add a new one right before the factory function
				const start = (moduleName ? defineCall.arguments[1] : defineCall.arguments[0]).getStart();
				changeSet.push({
					action: ChangeAction.INSERT,
					start,
					value: `[${formatDependencies(newDependencyValue, depsSeparator.trailing,
						{pos: start, node: defineCall})}], `,
				});
			}
		}

		let newParametersValue = newDependencies.map((newDependency) => {
			return newDependency.identifier;
		}).join(identifiersSeparator.trailing);

		if (!parameterSyntax.hasParens) {
			changeSet.push({
				action: ChangeAction.INSERT,
				start: parameterSyntax.syntaxList.getStart(),
				value: "(",
			});
			newParametersValue += ")";
		}

		const insertAfterParameterDeclaration = parameters[insertParametersAfterIndex];

		const existingParameterLeft = insertParametersAfterIndex > -1 && parameters.length > 0;
		const existingParameterRight = insertParametersAfterIndex === -1 && parameters.length > 0;

		let value = existingParameterLeft ? (identifiersSeparator.trailing + newParametersValue) : newParametersValue;
		value += existingParameterRight ? ", " : "";

		const start = insertAfterParameterDeclaration?.getEnd() ?? parameterSyntax.syntaxList.getStart();
		changeSet.push({
			action: ChangeAction.INSERT,
			start,
			value: formatDependencies(value, identifiersSeparator.trailing, {pos: start, node: defineCall}),
		});
	}
}

export function removeDependencies(
	dependenciesToRemove: Set<string>,
	moduleDeclarationInfo: ExistingModuleDeclarationInfo,
	changeSet: ChangeSet[],
	resourcePath: string,
	declaredIdentifiers: Set<string>) {
	const {moduleDeclaration} = moduleDeclarationInfo;
	const {dependencies} = moduleDeclaration;
	const factory = "factory" in moduleDeclaration ? moduleDeclaration.factory : moduleDeclaration.callback;
	const {dependencyMap} = createDependencyInfo(dependencies, resourcePath);

	[...dependencyMap]
		.filter(([moduleName]) => dependenciesToRemove.has(moduleName))
		.forEach(([, existingDependency]) => {
			// Update module dependencies removal
			const {index} = existingDependency;
			if (index >= 0 && dependencies?.elements[index]) {
				// Update node information
				const newElements = [...dependencies.elements];
				newElements.splice(index, 1);
				ts.factory.updateArrayLiteralExpression(dependencies,
					ts.factory.createNodeArray(newElements));

				// Update the source
				let start = existingDependency.node.getFullStart();
				let end = existingDependency.node.getEnd();

				if (existingDependency.leadingComma) {
					start = existingDependency.leadingComma.getFullStart();
				} else if (existingDependency.trailingComma) {
					end = existingDependency.trailingComma.getEnd();
				}

				changeSet.push({action: ChangeAction.DELETE, start, end});
			}

			// Update identifiers
			if (index >= 0 &&
				factory &&
				(
					ts.isFunctionExpression(factory) || ts.isFunctionDeclaration(factory) ||
					ts.isArrowFunction(factory)
				) &&
				factory.parameters[index]) {
				const syntaxList = getParameterSyntax(factory);
				const syntaxChildren = syntaxList.syntaxList.getChildren();
				const identifier = factory.parameters[index].getText();
				const newParams = [...factory.parameters];
				const [removedParam] = newParams.splice(index, 1);
				const removedParamIndex = syntaxChildren.indexOf(removedParam);

				let start = removedParam.getFullStart();
				let end = removedParam.getEnd();
				if (syntaxChildren[removedParamIndex - 1]?.kind === ts.SyntaxKind.CommaToken) {
					start = syntaxChildren[removedParamIndex - 1].getFullStart();
				} else if (syntaxChildren[removedParamIndex + 1]?.kind === ts.SyntaxKind.CommaToken) {
					end = syntaxChildren[removedParamIndex + 1].getEnd();
				}

				// Update the source
				changeSet.push({action: ChangeAction.DELETE, start, end});

				// Update the factory function node info
				if (ts.isFunctionExpression(factory)) {
					ts.factory.updateFunctionExpression(
						factory, factory.modifiers, factory.asteriskToken, factory.name,
						factory.typeParameters, ts.factory.createNodeArray(newParams), factory.type, factory.body);
				} else if (ts.isFunctionDeclaration(factory)) {
					ts.factory.updateFunctionDeclaration(
						factory, factory.modifiers, factory.asteriskToken, factory.name,
						factory.typeParameters, ts.factory.createNodeArray(newParams), factory.type, factory.body);
				} else if (ts.isArrowFunction(factory)) {
					ts.factory.updateArrowFunction(
						factory, factory.modifiers, factory.typeParameters, ts.factory.createNodeArray(newParams),
						factory.type, factory.equalsGreaterThanToken, factory.body);
				}

				// Update identifiers Set
				if (identifier && declaredIdentifiers.has(identifier)) {
					declaredIdentifiers.delete(identifier);
				}
			}
		});
}

function extractIdentifierSeparator(input: string) {
	const match = /^(\s)+/.exec(input);
	let leading = "";
	if (match?.[0].includes("\n")) {
		// Only use the leading whitespace if it contains a line-break
		// Otherwise a single space might be used because the extraction is
		// done on the 2nd element in the array, if it exists
		leading = match[0];
	}
	return {
		leading,
		trailing: match ? `,${match[0]}` : ", ",
	};
}

function formatDependencies(input: string, depsSeparator: string, posInfo: {pos: number; node: ts.Node}) {
	const {node, pos} = posInfo;
	const {character} = node.getSourceFile().getLineAndCharacterOfPosition(pos);

	let offset = character + 1;

	// If the input is multiline, we don't need to format it
	if (depsSeparator.includes("\n") || (input.length + offset) <= LINE_LENGTH_LIMIT) {
		return input;
	}

	const inputChunks = input.split(",");
	let finalString = "";
	let curLineLength = 0;
	inputChunks.forEach((chunk) => {
		if ((curLineLength + chunk.length + offset) > LINE_LENGTH_LIMIT) {
			curLineLength = 0;
			finalString += `\n`;
			// The offset is important only for the first line
			offset = 0;
		}

		finalString += `${chunk},`;
		curLineLength += chunk.length;
	});

	return finalString.substring(0, finalString.length - 1); // Cut the last comma
}
