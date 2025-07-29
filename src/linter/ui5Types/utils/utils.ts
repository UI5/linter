import ts from "typescript";
import {getUniqueName, isValidIdentifierName} from "./UniqueNameCreator.js";
import {getUi5TypeInfoFromSymbol} from "../Ui5TypeInfo.js";
import Ui5TypeInfoMatcher from "../Ui5TypeInfoMatcher.js";

export function isSourceFileOfTypeScriptLib(sourceFile: ts.SourceFile) {
	return sourceFile.fileName.startsWith("/types/typescript/lib/");
}

export function isSourceFileOfPseudoModuleType(sourceFile: ts.SourceFile) {
	return sourceFile.fileName.startsWith("/types/@ui5/linter/types/pseudo-modules/");
}

/**
 * Returns the text of a PropertyName node.
 * This function will not return the source code text of the node, but the text that can be
 * used to check against when looking for a specific property.
 *
 * If the text can't be determined, undefined is returned.
 * This may happen in the following cases:
 * - A ComputedPropertyName with a non-string literal-like expression
 * - A BigIntLiteral, which technically is a PropertyName, but is not valid in this context
 *
 * @param node
 * @returns text of the given node or undefined
 */
export function getPropertyNameText(node: ts.PropertyName): string | undefined {
	if (
		ts.isStringLiteralLike(node) || ts.isNumericLiteral(node) || ts.isIdentifier(node) ||
		ts.isPrivateIdentifier(node)
	) {
		return node.text;
	} else if (ts.isComputedPropertyName(node)) {
		if (ts.isStringLiteralLike(node.expression) || ts.isNumericLiteral(node.expression)) {
			return node.expression.text;
		}
	}

	return undefined;
}

/**
 * Searches for the symbol of an argument within the given construct signatures.
 * The first match is returned.
 *
 * Returns undefined if the argument is not found in any of the construct signatures.
 *
 * @param constructSignatures construct signatures to search in
 * @param argumentPosition position of the argument in the signature
 * @returns symbol of the found property or undefined
 */
export function getSymbolForArgumentInConstructSignatures(
	constructSignatures: readonly ts.Signature[],
	argumentPosition: number
): ts.Symbol | undefined {
	for (const constructSignature of constructSignatures) {
		const propertySymbol = constructSignature.getParameters()[argumentPosition];
		if (propertySymbol) {
			return propertySymbol;
		}
	}
	return undefined;
}

/**
 * Searches for the symbol of a property within the given construct signatures.
 * The first match is returned.
 *
 * Returns undefined if the property is not found in any of the construct signatures.
 *
 * @param constructSignatures construct signatures to search in
 * @param argumentPosition position of the signature parameter to search in
 * @param propertyName property name to search for
 * @returns symbol of the found property or undefined
 */
export function getSymbolForPropertyInConstructSignatures(
	constructSignatures: readonly ts.Signature[],
	argumentPosition: number,
	propertyName: string
): ts.Symbol | undefined {
	for (const constructSignature of constructSignatures) {
		const propertySymbol = constructSignature
			.getTypeParameterAtPosition(argumentPosition)
			.getProperty(propertyName);
		if (propertySymbol) {
			return propertySymbol;
		}
	}
	return undefined;
}

/**
 * Searches for a class member with the given name.
 * If no modifiers are passed, any member with the given name is returned.
 * If modifiers are passed, only members with at least the given modifiers are returned.
 *
 * Returns undefined if no matching member is found.
 *
 * @param node
 * @param memberName
 * @param modifiers
 * @returns
 */
export function findClassMember(
	node: ts.ClassDeclaration, memberName: string,
	modifiers: {modifier: ts.ModifierSyntaxKind; not?: boolean}[] = []
): ts.ClassElement | undefined {
	return node.members.find((member) => {
		if (!member.name) {
			// Constructor does not have a name
			return false;
		}
		const name = getPropertyNameText(member.name);
		if (name !== memberName) {
			return false;
		}
		if (modifiers.length === 0) {
			// No modifiers passed, so we match any member
			return true;
		}
		if (!ts.canHaveModifiers(member)) {
			// Only match if no modifiers are expected.
			// This is only the case for constructor declarations, but they are already filtered out above.
			// Still, this check is here for type checking and in case new node types are added.
			return modifiers.length === 0;
		}
		return modifiers.every(({modifier, not}) => {
			const result = member.modifiers?.some(({kind}) => kind === modifier);
			return not ? !result : result;
		});
	});
}

/**
 * Checks whether the given class member is a method or function.
 * This includes the type lookup of a referenced function.
 *
 * @param node
 * @param methodName
 * @param checker
 * @returns
 */
export function isClassMethod(
	node: ts.ClassElement, checker: ts.TypeChecker
): boolean {
	if (ts.isMethodDeclaration(node)) {
		return true;
	}
	if (!ts.isPropertyDeclaration(node) || !node.initializer) {
		return false;
	}
	if (ts.isFunctionExpression(node.initializer) || ts.isArrowFunction(node.initializer)) {
		return true;
	};
	if (ts.isIdentifier(node.initializer)) {
		const symbol = checker.getSymbolAtLocation(node.initializer);
		if (symbol?.valueDeclaration && ts.isFunctionDeclaration(symbol.valueDeclaration)) {
			return true;
		}
	}
	return false;
}

/**
 * Returns the PropertyAssignment of the given property name in the given ObjectLiteralExpression.
 * If the property is not found, undefined is returned.
 *
 * @param propertyName
 * @param node
 * @returns
 */
export function getPropertyAssignmentInObjectLiteralExpression(
	propertyName: string, node: ts.ObjectLiteralExpression
): ts.PropertyAssignment | undefined {
	return getPropertyAssignmentsInObjectLiteralExpression([propertyName], node)[0];
}

/**
 * Returns the PropertyAssignments of the given property names in the given ObjectLiteralExpression.
 * The order of the returned array matches the order of the propertyNames array and may contain undefined
 * values for properties that are not found.
 *
 * @param propertyNames
 * @param node
 * @returns
 */
export function getPropertyAssignmentsInObjectLiteralExpression(
	propertyNames: string[], node: ts.ObjectLiteralExpression
): (ts.PropertyAssignment | undefined)[] {
	const properties: (ts.PropertyAssignment | undefined)[] = [];
	let propertiesFound = 0;
	for (const property of node.properties) {
		if (!ts.isPropertyAssignment(property)) {
			continue;
		}
		const name = getPropertyNameText(property.name);
		for (let i = 0; i < propertyNames.length; i++) {
			if (name === propertyNames[i] && !properties[i]) {
				properties[i] = property;
				propertiesFound++;
				if (propertiesFound === propertyNames.length) {
					return properties;
				}
			}
		}
	}
	// Fill array with undefined for missing properties
	for (let i = 0; i < propertyNames.length; i++) {
		properties[i] ??= undefined;
	}
	return properties;
}

const JS_KEYWORDS_TO_AVOID = new Set(["object"]);

export function resolveUniqueName(inputName: string, existingIdentifiers?: Set<string>): string {
	const parts = inputName.split("/");
	const identifier = parts[parts.length - 1];
	let name = null;
	if (identifier === "jquery") {
		name = "jQuery";
	} else if (identifier === "library") {
		const potentialLibraryName = parts[parts.length - 2];

		// Relative imports contain a dot and should not be mistaken for a library name
		if (!potentialLibraryName.includes(".")) {
			name = potentialLibraryName + "Library";
		}
	}

	name = name ?? camelize(identifier);
	if (existingIdentifiers?.has(name) ||
		!isValidIdentifierName(name) ||
		JS_KEYWORDS_TO_AVOID.has(name.toLowerCase())) {
		name = getUniqueName(Array.from(existingIdentifiers ?? []), inputName, "/");
	}
	return name;
}

// Camelize a string by replacing invalid identifier characters
function camelize(str: string): string {
	return str.replace(/[^\p{ID_Start}\p{ID_Continue}]+([\p{ID_Start}\p{ID_Continue}])/gu, (_match, nextChar) => {
		return typeof nextChar === "string" ? nextChar.toUpperCase() : "";
	});
}

export function isAssignment(node: ts.AccessExpression): boolean {
	let currentNode: ts.Node | undefined = node;
	while (ts.isPropertyAccessExpression(currentNode) || ts.isElementAccessExpression(currentNode)) {
		if (!currentNode.parent) {
			return false;
		}
		if (ts.isBinaryExpression(currentNode.parent)) {
			return currentNode.parent.left === currentNode &&
				currentNode.parent.operatorToken.kind === ts.SyntaxKind.EqualsToken;
		}
		currentNode = currentNode.parent;
	}
	return false;
}

export function isReturnValueUsed(node: ts.Node): boolean {
	let isReturnValueUsed = false;
	while (node && !isReturnValueUsed) {
		if (!ts.isReturnStatement(node) && !ts.isThrowStatement(node) && node.parent && ts.isBlock(node.parent)) {
			// If the node is not a return statement, but is part of a block, we can assume that it is not used
			break;
		}
		if (node.parent && ts.isConditionalExpression(node.parent) && node === node.parent.condition) {
			// If the node is part of a conditional expression, and is the condition, the return value is used
			// Other positions in the conditional expression depend on how the whole expression is used
			// Example: `method() ? 1 : 2;`
			isReturnValueUsed = true;
			break;
		}

		if (node.parent && (ts.isIfStatement(node.parent) || ts.isWhileStatement(node.parent) ||
			ts.isDoStatement(node.parent) || ts.isSwitchStatement(node.parent)) && node !== node.parent.expression) {
			// If the node is part of an if or while statement, but not the condition we can assume
			// that the return value is not used
			// Example: `while(1 === 1) method();` does not use the return value of `method()`
			break;
		}
		if (node.parent && ts.isForStatement(node.parent) && node === node.parent.statement) {
			// If the node is part of a for statement but part of the statement, we can assume
			// that the return value is not used
			// Example: `for (let i = 0; i < 10; i++) method();` does not use the return value of `method()`
			break;
		}

		if (ts.isVariableDeclaration(node) ||
			ts.isBinaryExpression(node) ||
			ts.isIfStatement(node) ||
			ts.isWhileStatement(node) ||
			ts.isDoStatement(node) ||
			ts.isForStatement(node) ||
			ts.isSwitchStatement(node) ||
			ts.isVariableStatement(node) ||
			ts.isParenthesizedExpression(node) ||
			ts.isReturnStatement(node) ||
			ts.isThrowStatement(node) ||
			// () => jQuery.sap.log.error("FOO"); Explicit return in an arrow function
			(ts.isArrowFunction(node) && !ts.isBlock(node.body)) ||
			// Argument of a function call
			(ts.isCallExpression(node) && ts.isCallExpression(node.parent) &&
				node.parent.arguments.some((arg) => arg === node)) ||
				// Chaining
				(ts.isPropertyAccessExpression(node) &&
					ts.isCallExpression(node.expression) &&
					ts.isPropertyAccessExpression(node.expression.parent) &&
					ts.isCallExpression(node.expression.parent.expression))
		) {
			isReturnValueUsed = true;
		}
		node = node.parent;
	}

	return isReturnValueUsed;
}

export function isConditionalAccess(node: ts.Node): boolean {
	const parent = node.parent;
	if (!parent) {
		return false;
	}
	switch (parent.kind) {
		case ts.SyntaxKind.IfStatement:
			return (parent as ts.IfStatement).expression === node;
		case ts.SyntaxKind.ConditionalExpression:
			return (parent as ts.ConditionalExpression).condition === node;
		case ts.SyntaxKind.BinaryExpression:
			if ((parent as ts.BinaryExpression).operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
				return true;
			}
	}

	let currentNode = node;
	while (currentNode && (ts.isPropertyAccessExpression(currentNode) || ts.isElementAccessExpression(currentNode))) {
		if (currentNode.questionDotToken) {
			return true;
		}
		currentNode = currentNode.expression;
	}

	return false;
}

export function extractNamespace(
	node: ts.PropertyAccessExpression | ts.ElementAccessExpression | ts.CallExpression
): string {
	const propAccessChain: string[] = [];
	propAccessChain.push(node.expression.getText());

	let scanNode: ts.Node = node;
	while (ts.isPropertyAccessExpression(scanNode)) {
		if (!ts.isIdentifier(scanNode.name)) {
			throw new Error(
				`Unexpected PropertyAccessExpression node: Expected name to be identifier but got ` +
				ts.SyntaxKind[scanNode.name.kind]);
		}
		propAccessChain.push(scanNode.name.text);
		scanNode = scanNode.parent;
	}
	return propAccessChain.join(".");
}

export function isGlobalThis(nodeType: string) {
	return [
		"Window & typeof globalThis",
		"typeof globalThis",
		// "Window", // top and parent will resolve to this string, however they are still treated as type 'any'
	].includes(nodeType);
}

export function getSymbolModuleDeclaration(symbol: ts.Symbol) {
	let parent = symbol.valueDeclaration?.parent;
	while (parent && !ts.isModuleDeclaration(parent)) {
		parent = parent.parent;
	}
	return parent;
}

/**
 * Extracts the sap.ui API namespace from a symbol name and a module declaration
 * (from @sapui5/types sap.ui.core.d.ts), e.g. sap.ui.view.
 */
export function extractSapUiNamespace(symbolName: string, moduleDeclaration: ts.ModuleDeclaration): string | undefined {
	const namespace: string[] = [];
	let currentModuleDeclaration: ts.Node | undefined = moduleDeclaration;
	while (
		currentModuleDeclaration &&
		ts.isModuleDeclaration(currentModuleDeclaration) &&
		currentModuleDeclaration.flags & ts.NodeFlags.Namespace
	) {
		namespace.unshift(currentModuleDeclaration.name.text);
		currentModuleDeclaration = currentModuleDeclaration.parent?.parent;
	}

	if (!namespace.length) {
		return undefined;
	} else {
		namespace.push(symbolName);
		return namespace.join(".");
	}
}

/**
 * Recursively count all child nodes matching the filter
 */
export function countChildNodesRecursive(node: ts.Node, filterKinds: ts.SyntaxKind[] = []): number {
	let count = 0;
	function countNodes(currentNode: ts.Node) {
		if (filterKinds.length === 0 || filterKinds.includes(currentNode.kind)) {
			count++;
		}
		currentNode.forEachChild(countNodes);
	}
	countNodes(node); // Include the root node in the count
	return count;
}

export function findNodeRecursive<T extends ts.Node>(node: ts.Node, filterKinds: ts.SyntaxKind[] = []): T | undefined {
	let foundNode: T | undefined;
	function findNode(currentNode: ts.Node) {
		if (filterKinds.length === 0 || filterKinds.includes(currentNode.kind)) {
			foundNode = currentNode as T;
			return;
		}
		currentNode.forEachChild(findNode);
	}
	findNode(node); // Include the root node in the search
	return foundNode;
}

let CachedSideEffectFreeApiMatcher: Ui5TypeInfoMatcher<boolean> | undefined;

function getSideEffectFreeApiMatcher(): Ui5TypeInfoMatcher<boolean> {
	if (!CachedSideEffectFreeApiMatcher) {
		const m = new Ui5TypeInfoMatcher<boolean>("sap.ui.core");
		m.declareNamespace("sap", [
			m.namespace("ui", [
				m.function("getCore", true),
			]),
		]);
		m.declareModule("sap/ui/Core", [
			m.class("Core", [
				m.method("getConfiguration", true),
			]),
		]);
		CachedSideEffectFreeApiMatcher = m;
	}
	return CachedSideEffectFreeApiMatcher;
}

export function isSideEffectFree(node: ts.CallExpression, checker: ts.TypeChecker): boolean {
	// Get UI5 Type info for the given node

	const exprType = checker.getTypeAtLocation(node.expression);
	if (!exprType.symbol) {
		return false;
	}
	const ui5TypeInfo = getUi5TypeInfoFromSymbol(exprType.symbol);
	if (!ui5TypeInfo) {
		return false;
	}
	// Check whether the call expression is a side effect free function
	return !!getSideEffectFreeApiMatcher().match(ui5TypeInfo);
}
