import ts from "typescript";
import {getLogger} from "@ui5/logger";
const {SyntaxKind} = ts;
import {toPosStr, UnsupportedModuleError} from "./util.js";
const log = getLogger("linter:ui5Types:amdTranspiler:replaceNodeInParent");

export interface NodeReplacement {
	original: ts.Node;
	substitute: ts.Node;
}

/**
 * Replaces a node in its parent with another node
 */
export default function (
	parent: ts.Node, replacement: NodeReplacement, nodeFactory: ts.NodeFactory
): ts.Node {
	const {original, substitute} = replacement;
	log.verbose(
		`Replacing child of ${ts.SyntaxKind[parent.kind]}\n` +
		`  Old: ${ts.SyntaxKind[original.kind]}\n` +
		`  New: ${ts.SyntaxKind[substitute.kind]}`);

	switch (parent.kind) {
		case SyntaxKind.ExpressionStatement:
			return replaceInExpressionStatement(parent as ts.ExpressionStatement, replacement, nodeFactory);
		case SyntaxKind.ParenthesizedExpression:
			return replaceInParenthesizedExpression(parent as ts.ParenthesizedExpression, replacement, nodeFactory);
		case SyntaxKind.CallExpression:
			return replaceInCallExpression(parent as ts.CallExpression, replacement, nodeFactory);
		case SyntaxKind.NewExpression:
			return replaceInNewExpression(parent as ts.NewExpression, replacement, nodeFactory);
		case SyntaxKind.BinaryExpression:
			return replaceInBinaryExpression(parent as ts.BinaryExpression, replacement, nodeFactory);
		case SyntaxKind.ConditionalExpression:
			return replaceInConditionalExpression(parent as ts.ConditionalExpression, replacement, nodeFactory);
		case SyntaxKind.PrefixUnaryExpression:
			return replaceInPrefixUnaryExpression(parent as ts.PrefixUnaryExpression, replacement, nodeFactory);
		case SyntaxKind.PostfixUnaryExpression:
			return replaceInPostfixUnaryExpression(parent as ts.PostfixUnaryExpression, replacement, nodeFactory);
		case SyntaxKind.YieldExpression:
			return replaceInYieldExpression(parent as ts.YieldExpression, replacement, nodeFactory);
		case SyntaxKind.AwaitExpression:
			return replaceInAwaitExpression(parent as ts.AwaitExpression, replacement, nodeFactory);
		case SyntaxKind.VariableStatement:
			return replaceInVariableStatement(parent as ts.VariableStatement, replacement, nodeFactory);
		case SyntaxKind.VariableDeclaration:
			return replaceInVariableDeclaration(parent as ts.VariableDeclaration, replacement, nodeFactory);
		case SyntaxKind.VariableDeclarationList:
			return replaceInVariableDeclarationList(parent as ts.VariableDeclarationList, replacement, nodeFactory);
		case SyntaxKind.PropertyAssignment:
			return replaceInPropertyAssignment(parent as ts.PropertyAssignment, replacement, nodeFactory);
		case SyntaxKind.PropertyDeclaration:
			return replaceInPropertyDeclaration(parent as ts.PropertyDeclaration, replacement, nodeFactory);
		case SyntaxKind.IfStatement:
			return replaceInIfStatement(parent as ts.IfStatement, replacement, nodeFactory);
		case SyntaxKind.WhileStatement:
			return replaceInWhileStatement(parent as ts.WhileStatement, replacement, nodeFactory);
		case SyntaxKind.DoStatement:
			return replaceInDoStatement(parent as ts.DoStatement, replacement, nodeFactory);
		case SyntaxKind.ForStatement:
			return replaceInForStatement(parent as ts.ForStatement, replacement, nodeFactory);
		case SyntaxKind.ReturnStatement:
			return replaceInReturnStatement(parent as ts.ReturnStatement, replacement, nodeFactory);
		case SyntaxKind.ArrayLiteralExpression:
			return replaceInArrayLiteralExpression(parent as ts.ArrayLiteralExpression, replacement, nodeFactory);
		case SyntaxKind.ObjectLiteralExpression:
			return replaceInObjectLiteralExpression(parent as ts.ObjectLiteralExpression, replacement, nodeFactory);
		case SyntaxKind.PropertyAccessExpression:
			return replaceInPropertyAccessExpression(parent as ts.PropertyAccessExpression, replacement, nodeFactory);
		case SyntaxKind.ElementAccessExpression:
			return replaceInElementAccessExpression(parent as ts.ElementAccessExpression, replacement, nodeFactory);
		case SyntaxKind.Block:
			return replaceInBlock(parent as ts.Block, replacement, nodeFactory);
		case SyntaxKind.ArrowFunction:
			return replaceInArrowFunction(parent as ts.ArrowFunction, replacement, nodeFactory);
		case SyntaxKind.FunctionExpression:
			return replaceInFunctionExpression(parent as ts.FunctionExpression, replacement, nodeFactory);
		case SyntaxKind.FunctionDeclaration:
			return replaceInFunctionDeclaration(parent as ts.FunctionDeclaration, replacement, nodeFactory);
		case SyntaxKind.MethodDeclaration:
			return replaceInMethodDeclaration(parent as ts.MethodDeclaration, replacement, nodeFactory);
		case SyntaxKind.ClassDeclaration:
			return replaceInClassDeclaration(parent as ts.ClassDeclaration, replacement, nodeFactory);
		case SyntaxKind.ComputedPropertyName:
			return replaceInComputedPropertyName(parent as ts.ComputedPropertyName, replacement, nodeFactory);
		case SyntaxKind.Parameter:
			return replaceInParameterDeclaration(parent as ts.ParameterDeclaration, replacement, nodeFactory);
		case SyntaxKind.SourceFile:
			return replaceInSourceFile(parent as ts.SourceFile, replacement, nodeFactory);
		default:
			throw new UnsupportedModuleError(
				`Unsupported parent node type for replacement operation: ${ts.SyntaxKind[parent.kind]} at ` +
				`${toPosStr(parent)}`);
	}
}

function replaceNodeInArray<T extends ts.NodeArray<ts.Node>>(
	original: ts.Node, substitute: ts.Node, array: T
): T {
	// First create a flat copy of the array
	const newArray = array.slice();

	const index = array.indexOf(original);
	if (index < 0) {
		throw new Error(`Node not found in array`);
	}
	newArray[index] = substitute;
	return newArray as unknown as T;
}

function replaceInExpressionStatement(
	node: ts.ExpressionStatement, {substitute}: NodeReplacement, nodeFactory: ts.NodeFactory
): ts.ExpressionStatement {
	if (!ts.isExpression(substitute)) {
		throw new UnsupportedModuleError(
			`Unexpected replacement type for ExpressionStatement (expected Expression): ` +
			`${ts.SyntaxKind[substitute.kind]} at ${toPosStr(node)}`);
	}
	return nodeFactory.updateExpressionStatement(node, substitute);
}

function replaceInParenthesizedExpression(
	node: ts.ParenthesizedExpression, {substitute}: NodeReplacement, nodeFactory: ts.NodeFactory
): ts.ParenthesizedExpression {
	if (!ts.isExpression(substitute)) {
		throw new UnsupportedModuleError(
			`Unexpected replacement type for ParenthesizedExpression (expected Expression): ` +
			`${ts.SyntaxKind[substitute.kind]} at ${toPosStr(node)}`);
	}
	return nodeFactory.updateParenthesizedExpression(node, substitute);
}

function replaceInCallExpression(
	node: ts.CallExpression, {original, substitute}: NodeReplacement, nodeFactory: ts.NodeFactory
): ts.CallExpression {
	if (node.expression === original) {
		// Replace expression
		if (!ts.isExpression(substitute)) {
			throw new UnsupportedModuleError(
				`Unexpected replacement type for CallExpression (expected Expression): ` +
				`${ts.SyntaxKind[substitute.kind]} at ${toPosStr(node)}`);
		}
		return nodeFactory.updateCallExpression(
			node,
			substitute,
			node.typeArguments,
			node.arguments);
	} else if (node.arguments.includes(original as ts.Expression)) {
		// Replace argument
		const args = replaceNodeInArray(original, substitute, node.arguments);
		return nodeFactory.updateCallExpression(
			node,
			node.expression,
			node.typeArguments,
			args);
	} else {
		throw new UnsupportedModuleError(
			`Unexpected child node for CallExpression replacement: ${ts.SyntaxKind[original.kind]} at ` +
			`${toPosStr(original)}`);
	}
}

function replaceInNewExpression(
	node: ts.NewExpression, {original, substitute}: NodeReplacement, nodeFactory: ts.NodeFactory
): ts.NewExpression {
	if (node.expression === original) {
		// Replace expression
		if (!ts.isExpression(substitute)) {
			throw new UnsupportedModuleError(
				`Unexpected replacement type for NewExpression (expected Expression): ` +
				`${ts.SyntaxKind[substitute.kind]} at ${toPosStr(node)}`);
		}
		return nodeFactory.updateNewExpression(
			node,
			substitute,
			node.typeArguments,
			node.arguments);
	} else if (node.arguments?.includes(original as ts.Expression)) {
		// Replace argument
		const args = replaceNodeInArray(original, substitute, node.arguments);
		return nodeFactory.updateNewExpression(
			node,
			node.expression,
			node.typeArguments,
			args);
	} else {
		throw new UnsupportedModuleError(
			`Unexpected child node for NewExpression replacement: ${ts.SyntaxKind[original.kind]} at ` +
			`${toPosStr(original)}`);
	}
}

function replaceInBinaryExpression(
	node: ts.BinaryExpression, {original, substitute}: NodeReplacement, nodeFactory: ts.NodeFactory
): ts.BinaryExpression {
	if (!ts.isExpression(substitute)) {
		throw new UnsupportedModuleError(
			`Unexpected replacement type for BinaryExpression (expected Expression): ` +
			`${ts.SyntaxKind[substitute.kind]} at ${toPosStr(node)}`);
	}
	if (node.left === original) {
		// Replace left
		return nodeFactory.updateBinaryExpression(
			node,
			substitute,
			node.operatorToken,
			node.right);
	} else { // Must be right
		// Replace right
		return nodeFactory.updateBinaryExpression(
			node,
			node.left,
			node.operatorToken,
			substitute);
	}
}

function replaceInConditionalExpression(
	node: ts.ConditionalExpression, {original, substitute}: NodeReplacement, nodeFactory: ts.NodeFactory
): ts.ConditionalExpression {
	if (!ts.isExpression(substitute)) {
		throw new UnsupportedModuleError(
			`Unexpected replacement type for ConditionalExpression (expected Expression): ` +
			`${ts.SyntaxKind[substitute.kind]} at ${toPosStr(node)}`);
	}
	if (node.condition === original) {
		// Replace condition
		return nodeFactory.updateConditionalExpression(
			node,
			substitute,
			node.questionToken,
			node.whenTrue,
			node.colonToken,
			node.whenFalse);
	} else if (node.whenTrue === original) {
		// Replace whenTrue
		return nodeFactory.updateConditionalExpression(
			node,
			node.condition,
			node.questionToken,
			substitute,
			node.colonToken,
			node.whenFalse);
	} else { // Must be whenFalse
		// Replace whenFalse
		return nodeFactory.updateConditionalExpression(
			node,
			node.condition,
			node.questionToken,
			node.whenTrue,
			node.colonToken,
			substitute);
	}
}

function replaceInPrefixUnaryExpression(
	node: ts.PrefixUnaryExpression, {substitute}: NodeReplacement, nodeFactory: ts.NodeFactory
): ts.PrefixUnaryExpression {
	if (!ts.isExpression(substitute)) {
		throw new UnsupportedModuleError(
			`Unexpected replacement type for PrefixUnaryExpression (expected Expression): ` +
			`${ts.SyntaxKind[substitute.kind]} at ${toPosStr(node)}`);
	}
	return nodeFactory.updatePrefixUnaryExpression(
		node,
		substitute);
}

function replaceInPostfixUnaryExpression(
	node: ts.PostfixUnaryExpression, {substitute}: NodeReplacement, nodeFactory: ts.NodeFactory
): ts.PostfixUnaryExpression {
	if (!ts.isExpression(substitute)) {
		throw new UnsupportedModuleError(
			`Unexpected replacement type for PostfixUnaryExpression (expected Expression): ` +
			`${ts.SyntaxKind[substitute.kind]} at ${toPosStr(node)}`);
	}
	return nodeFactory.updatePostfixUnaryExpression(
		node,
		substitute);
}

function replaceInYieldExpression(
	node: ts.YieldExpression, {substitute}: NodeReplacement, nodeFactory: ts.NodeFactory
): ts.YieldExpression {
	if (!ts.isExpression(substitute)) {
		throw new UnsupportedModuleError(
			`Unexpected replacement type for YieldExpression (expected Expression): ` +
			`${ts.SyntaxKind[substitute.kind]} at ${toPosStr(node)}`);
	}
	return nodeFactory.updateYieldExpression(
		node,
		node.asteriskToken,
		substitute);
}

function replaceInAwaitExpression(
	node: ts.AwaitExpression, {substitute}: NodeReplacement, nodeFactory: ts.NodeFactory
): ts.AwaitExpression {
	if (!ts.isExpression(substitute)) {
		throw new UnsupportedModuleError(
			`Unexpected replacement type for AwaitExpression (expected Expression): ` +
			`${ts.SyntaxKind[substitute.kind]} at ${toPosStr(node)}`);
	}
	return nodeFactory.updateAwaitExpression(
		node,
		substitute);
}

function replaceInVariableStatement(
	node: ts.VariableStatement, {original, substitute}: NodeReplacement, nodeFactory: ts.NodeFactory
): ts.VariableStatement {
	const declarationList = replaceNodeInArray(original, substitute, node.declarationList.declarations);
	return nodeFactory.updateVariableStatement(
		node,
		node.modifiers,
		nodeFactory.updateVariableDeclarationList(
			node.declarationList,
			declarationList));
}

function replaceInVariableDeclaration(
	node: ts.VariableDeclaration, {substitute}: NodeReplacement, nodeFactory: ts.NodeFactory
): ts.VariableDeclaration {
	if (!ts.isExpression(substitute)) {
		throw new UnsupportedModuleError(
			`Unexpected replacement type for VariableDeclaration (expected Expression): ` +
			`${ts.SyntaxKind[substitute.kind]} at ${toPosStr(node)}`);
	}
	return nodeFactory.updateVariableDeclaration(
		node,
		node.name,
		node.exclamationToken,
		node.type,
		substitute);
}

function replaceInVariableDeclarationList(
	node: ts.VariableDeclarationList, {original, substitute}: NodeReplacement, nodeFactory: ts.NodeFactory
): ts.VariableDeclarationList {
	const declarations = replaceNodeInArray(original, substitute, node.declarations);
	return nodeFactory.updateVariableDeclarationList(node, declarations);
}

function replaceInPropertyAssignment(
	node: ts.PropertyAssignment, {substitute}: NodeReplacement, nodeFactory: ts.NodeFactory
): ts.PropertyAssignment {
	if (!ts.isExpression(substitute)) {
		throw new UnsupportedModuleError(
			`Unexpected replacement type for PropertyAssignment (expected Expression): ` +
			`${ts.SyntaxKind[substitute.kind]} at ${toPosStr(node)}`);
	}
	return nodeFactory.updatePropertyAssignment(
		node,
		node.name,
		substitute);
}

function replaceInPropertyDeclaration(
	node: ts.PropertyDeclaration, {substitute}: NodeReplacement, nodeFactory: ts.NodeFactory
): ts.PropertyDeclaration {
	if (!ts.isExpression(substitute)) {
		throw new UnsupportedModuleError(
			`Unexpected replacement type for PropertyDeclaration (expected Expression): ` +
			`${ts.SyntaxKind[substitute.kind]} at ${toPosStr(node)}`);
	}
	return nodeFactory.updatePropertyDeclaration(
		node,
		node.modifiers,
		node.name,
		node.questionToken ?? node.exclamationToken,
		node.type,
		substitute);
}

function replaceInIfStatement(
	node: ts.IfStatement, {original, substitute}: NodeReplacement, nodeFactory: ts.NodeFactory
): ts.IfStatement {
	if (node.expression === original) {
		// Replace expression
		if (!ts.isExpression(substitute)) {
			throw new UnsupportedModuleError(
				`Unexpected replacement type for IfStatement (expected Expression): ` +
				`${ts.SyntaxKind[substitute.kind]} at ${toPosStr(node)}`);
		}
		return nodeFactory.updateIfStatement(
			node,
			substitute,
			node.thenStatement,
			node.elseStatement);
	} else if (node.thenStatement === original) {
		// Replace statement
		if (!ts.isStatement(substitute)) {
			throw new UnsupportedModuleError(
				`Unexpected replacement type for IfStatement (expected Statement): ` +
				`${ts.SyntaxKind[substitute.kind]} at ${toPosStr(node)}`);
		}
		return nodeFactory.updateIfStatement(
			node,
			node.expression,
			substitute,
			node.elseStatement);
	} else { // Must be elseStatement
		// Replace statement
		if (!ts.isStatement(substitute)) {
			throw new UnsupportedModuleError(
				`Unexpected replacement type for IfStatement (expected Statement): ` +
				`${ts.SyntaxKind[substitute.kind]} at ${toPosStr(node)}`);
		}
		return nodeFactory.updateIfStatement(
			node,
			node.expression,
			node.thenStatement,
			substitute);
	}
}

function replaceInWhileStatement(
	node: ts.WhileStatement, {original, substitute}: NodeReplacement, nodeFactory: ts.NodeFactory
): ts.WhileStatement {
	if (node.expression === original) {
		// Replace expression
		if (!ts.isExpression(substitute)) {
			throw new UnsupportedModuleError(
				`Unexpected replacement type for WhileStatement (expected Expression): ` +
				`${ts.SyntaxKind[substitute.kind]} at ${toPosStr(node)}`);
		}
		return nodeFactory.updateWhileStatement(
			node,
			substitute,
			node.statement);
	} else { // Must be statement
		// Replace statement
		if (!ts.isStatement(substitute)) {
			throw new UnsupportedModuleError(
				`Unexpected replacement type for WhileStatement (expected Statement): ` +
				`${ts.SyntaxKind[substitute.kind]} at ${toPosStr(node)}`);
		}
		return nodeFactory.updateWhileStatement(
			node,
			node.expression,
			substitute);
	}
}

function replaceInDoStatement(
	node: ts.DoStatement, {original, substitute}: NodeReplacement, nodeFactory: ts.NodeFactory
): ts.DoStatement {
	if (node.statement === original) {
		// Replace statement
		if (!ts.isStatement(substitute)) {
			throw new UnsupportedModuleError(
				`Unexpected replacement type for DoStatement (expected Statement): ` +
				`${ts.SyntaxKind[substitute.kind]} at ${toPosStr(node)}`);
		}
		return nodeFactory.updateDoStatement(
			node,
			substitute,
			node.expression);
	} else { // Must be expression
		// Replace expression
		if (!ts.isExpression(substitute)) {
			throw new UnsupportedModuleError(
				`Unexpected replacement type for DoStatement (expected Expression): ` +
				`${ts.SyntaxKind[substitute.kind]} at ${toPosStr(node)}`);
		}
		return nodeFactory.updateDoStatement(
			node,
			node.statement,
			substitute);
	}
}

function replaceInForStatement(
	node: ts.ForStatement, {original, substitute}: NodeReplacement, nodeFactory: ts.NodeFactory
): ts.ForStatement {
	if (node.initializer === original) {
		// Replace initializer
		if (!ts.isForInitializer(substitute)) {
			throw new UnsupportedModuleError(
				`Unexpected replacement type for ForStatement (expected ForInitializer): ` +
				`${ts.SyntaxKind[substitute.kind]} at ${toPosStr(node)}`);
		}
		return nodeFactory.updateForStatement(
			node,
			substitute,
			node.condition,
			node.incrementor,
			node.statement);
	} else if (node.condition === original) {
		// Replace condition
		if (!ts.isExpression(substitute)) {
			throw new UnsupportedModuleError(
				`Unexpected replacement type for ForStatement (expected Expression): ` +
				`${ts.SyntaxKind[substitute.kind]} at ${toPosStr(node)}`);
		}
		return nodeFactory.updateForStatement(
			node,
			node.initializer,
			substitute,
			node.incrementor,
			node.statement);
	} else if (node.incrementor === original) {
		// Replace incrementor
		if (!ts.isExpression(substitute)) {
			throw new UnsupportedModuleError(
				`Unexpected replacement type for ForStatement (expected Expression): ` +
				`${ts.SyntaxKind[substitute.kind]} at ${toPosStr(node)}`);
		}
		return nodeFactory.updateForStatement(
			node,
			node.initializer,
			node.condition,
			substitute,
			node.statement);
	} else { // Must be statement
		// Replace statement
		if (!ts.isStatement(substitute)) {
			throw new UnsupportedModuleError(
				`Unexpected replacement type for ForStatement (expected Statement): ` +
				`${ts.SyntaxKind[substitute.kind]} at ${toPosStr(node)}`);
		}
		return nodeFactory.updateForStatement(
			node,
			node.initializer,
			node.condition,
			node.incrementor,
			substitute);
	}
}

function replaceInReturnStatement(
	node: ts.ReturnStatement, {substitute}: NodeReplacement, nodeFactory: ts.NodeFactory
): ts.ReturnStatement {
	if (!ts.isExpression(substitute)) {
		throw new UnsupportedModuleError(
			`Unexpected replacement type for ReturnStatement (expected Expression): ` +
			`${ts.SyntaxKind[substitute.kind]} at ${toPosStr(node)}`);
	}
	return nodeFactory.updateReturnStatement(node, substitute);
}

function replaceInArrayLiteralExpression(
	node: ts.ArrayLiteralExpression, {original, substitute}: NodeReplacement, nodeFactory: ts.NodeFactory
): ts.ArrayLiteralExpression {
	const elements = replaceNodeInArray(original, substitute, node.elements);
	return nodeFactory.updateArrayLiteralExpression(node, elements);
}

function replaceInObjectLiteralExpression(
	node: ts.ObjectLiteralExpression, {original, substitute}: NodeReplacement, nodeFactory: ts.NodeFactory
): ts.ObjectLiteralExpression {
	const properties = replaceNodeInArray(original, substitute, node.properties);
	return nodeFactory.updateObjectLiteralExpression(node, properties);
}

function replaceInPropertyAccessExpression(
	node: ts.PropertyAccessExpression, {original, substitute}: NodeReplacement, nodeFactory: ts.NodeFactory
): ts.PropertyAccessExpression {
	if (node.name === original) {
		// Replace name
		if (!ts.isIdentifier(substitute)) {
			throw new UnsupportedModuleError(
				`Unexpected replacement type for PropertyAccessExpression (expected Identifier): ` +
				`${ts.SyntaxKind[substitute.kind]} at ${toPosStr(node)}`);
		}
		return nodeFactory.updatePropertyAccessExpression(
			node,
			node.expression,
			substitute);
	} else {
		if (!ts.isExpression(substitute)) {
			throw new UnsupportedModuleError(
				`Unexpected replacement type for PropertyAccessExpression (expected Expression): ` +
				`${ts.SyntaxKind[substitute.kind]} at ${toPosStr(node)}`);
		}
		return nodeFactory.updatePropertyAccessExpression(
			node,
			substitute,
			node.name);
	}
}

function replaceInBlock(
	node: ts.Block, {original, substitute}: NodeReplacement, nodeFactory: ts.NodeFactory
): ts.Block {
	const statements = replaceNodeInArray(original, substitute, node.statements);
	return nodeFactory.updateBlock(node, statements);
}

function replaceInElementAccessExpression(
	node: ts.ElementAccessExpression, {original, substitute}: NodeReplacement, nodeFactory: ts.NodeFactory
): ts.ElementAccessExpression {
	if (node.expression === original) {
		if (!ts.isExpression(substitute)) {
			throw new UnsupportedModuleError(
				`Unexpected replacement type for ElementAccessExpression (expected Expression): ` +
				`${ts.SyntaxKind[substitute.kind]} at ${toPosStr(node)}`);
		}
		return nodeFactory.updateElementAccessExpression(
			node,
			substitute,
			node.argumentExpression);
	} else {
		if (!ts.isExpression(substitute)) {
			throw new UnsupportedModuleError(
				`Unexpected replacement type for ElementAccessExpression (expected Expression): ` +
				`${ts.SyntaxKind[substitute.kind]} at ${toPosStr(node)}`);
		}
		return nodeFactory.updateElementAccessExpression(
			node,
			node.expression,
			substitute);
	}
}

function replaceInArrowFunction(
	node: ts.ArrowFunction, {substitute}: NodeReplacement, nodeFactory: ts.NodeFactory
): ts.ArrowFunction {
	if (!ts.isBlock(substitute) && !ts.isExpression(substitute)) {
		throw new UnsupportedModuleError(
			`Unexpected replacement type for ArrowFunction (expected Block or Expression): ` +
			`${ts.SyntaxKind[substitute.kind]} at ${toPosStr(node)}`);
	}
	return nodeFactory.updateArrowFunction(
		node,
		node.modifiers,
		node.typeParameters,
		node.parameters,
		node.type,
		node.equalsGreaterThanToken,
		substitute);
}

function replaceInFunctionExpression(
	node: ts.FunctionExpression, {substitute}: NodeReplacement, nodeFactory: ts.NodeFactory
): ts.FunctionExpression {
	if (!ts.isBlock(substitute)) {
		throw new UnsupportedModuleError(
			`Unexpected replacement type for FunctionExpression (expected Block): ` +
			`${ts.SyntaxKind[substitute.kind]} at ${toPosStr(node)}`);
	}
	return nodeFactory.updateFunctionExpression(
		node,
		node.modifiers,
		node.asteriskToken,
		node.name,
		node.typeParameters,
		node.parameters,
		node.type,
		substitute);
}
function replaceInFunctionDeclaration(
	node: ts.FunctionDeclaration, {substitute}: NodeReplacement, nodeFactory: ts.NodeFactory
): ts.FunctionDeclaration {
	if (!ts.isBlock(substitute)) {
		throw new UnsupportedModuleError(
			`Unexpected replacement type for FunctionDeclaration (expected Block): ` +
			`${ts.SyntaxKind[substitute.kind]} at ${toPosStr(node)}`);
	}
	return nodeFactory.updateFunctionDeclaration(
		node,
		node.modifiers,
		node.asteriskToken,
		node.name,
		node.typeParameters,
		node.parameters,
		node.type,
		substitute);
}

function replaceInMethodDeclaration(
	node: ts.MethodDeclaration, {substitute}: NodeReplacement, nodeFactory: ts.NodeFactory
): ts.MethodDeclaration {
	if (!ts.isBlock(substitute)) {
		throw new UnsupportedModuleError(
			`Unexpected replacement type for MethodDeclaration (expected Block): ` +
			`${ts.SyntaxKind[substitute.kind]} at ${toPosStr(node)}`);
	}
	return nodeFactory.updateMethodDeclaration(
		node,
		node.modifiers,
		node.asteriskToken,
		node.name,
		node.questionToken,
		node.typeParameters,
		node.parameters,
		node.type,
		substitute);
}

function replaceInClassDeclaration(
	node: ts.ClassDeclaration, {original, substitute}: NodeReplacement, nodeFactory: ts.NodeFactory
): ts.ClassDeclaration {
	if (node.heritageClauses?.includes(original as ts.HeritageClause)) {
		if (!ts.isHeritageClause(substitute)) {
			throw new UnsupportedModuleError(
				`Unexpected replacement type for ClassDeclaration (expected HeritageClause): ` +
				`${ts.SyntaxKind[substitute.kind]} at ${toPosStr(node)}`);
		}
		const heritageClauses = replaceNodeInArray(original, substitute, node.heritageClauses);
		return nodeFactory.updateClassDeclaration(
			node,
			node.modifiers,
			node.name,
			node.typeParameters,
			heritageClauses,
			node.members);
	} else if (node.members.includes(original as ts.ClassElement)) {
		if (!ts.isClassElement(substitute)) {
			throw new UnsupportedModuleError(
				`Unexpected replacement type for ClassDeclaration (expected ClassElement): ` +
				`${ts.SyntaxKind[substitute.kind]} at ${toPosStr(node)}`);
		}
		const members = replaceNodeInArray(original, substitute, node.members);
		return nodeFactory.updateClassDeclaration(
			node,
			node.modifiers,
			node.name,
			node.typeParameters,
			node.heritageClauses,
			members);
	} else {
		throw new UnsupportedModuleError(
			`Unexpected child node for ClassDeclaration replacement: ${ts.SyntaxKind[original.kind]} at ` +
			`${toPosStr(original)}`);
	}
}

function replaceInComputedPropertyName(
	node: ts.ComputedPropertyName, {substitute}: NodeReplacement, nodeFactory: ts.NodeFactory
): ts.ComputedPropertyName {
	if (!ts.isExpression(substitute)) {
		throw new UnsupportedModuleError(
			`Unexpected replacement type for ComputedPropertyName (expected Expression): ` +
			`${ts.SyntaxKind[substitute.kind]} at ${toPosStr(node)}`);
	}
	return nodeFactory.updateComputedPropertyName(node, substitute);
}

function replaceInParameterDeclaration(
	node: ts.ParameterDeclaration, {substitute}: NodeReplacement, nodeFactory: ts.NodeFactory
): ts.ParameterDeclaration {
	if (!ts.isExpression(substitute)) {
		throw new UnsupportedModuleError(
			`Unexpected replacement type for ParameterDeclaration (expected Expression): ` +
			`${ts.SyntaxKind[substitute.kind]} at ${toPosStr(node)}`);
	}
	return nodeFactory.updateParameterDeclaration(
		node,
		node.modifiers,
		node.dotDotDotToken,
		node.name,
		node.questionToken,
		node.type,
		substitute);
}

function replaceInSourceFile(
	node: ts.SourceFile, {original, substitute}: NodeReplacement, nodeFactory: ts.NodeFactory
): ts.SourceFile {
	const statements = replaceNodeInArray(original, substitute, node.statements);
	return nodeFactory.updateSourceFile(node, statements);
}
