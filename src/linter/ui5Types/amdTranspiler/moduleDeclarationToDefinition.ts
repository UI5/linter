import ts from "typescript";
import {getLogger} from "@ui5/logger";
import {ModuleDeclaration} from "./parseModuleDeclaration.js";
import rewriteExtendCall, {UnsupportedExtendCall} from "./rewriteExtendCall.js";
import {UnsupportedModuleError, toPosStr} from "./util.js";
import pruneNode from "./pruneNode.js";
import {resolveUniqueName} from "../utils/utils.js";
const {SyntaxKind} = ts;

const log = getLogger("linter:ui5Types:amdTranspiler:moduleDeclarationToDefinition");

export interface ModuleDefinition {
	name?: string;
	body: ts.Statement[];
	imports: ts.ImportDeclaration[];
	oldFactoryBlock?: ts.Block;
	moveComments: [ts.Node, ts.Node][];
}

export default function (
	moduleDeclaration: ModuleDeclaration, sourceFile: ts.SourceFile, nodeFactory: ts.NodeFactory
): ModuleDefinition {
	const {imports, identifiers: importIdentifiers} = collectImports(moduleDeclaration, nodeFactory);
	const {body, oldFactoryBlock, moveComments} =
		getModuleBody(moduleDeclaration, sourceFile, nodeFactory, importIdentifiers);
	/* Ignore module name and export flag for now */
	return {
		imports,
		body,
		oldFactoryBlock,
		moveComments,
	};
}

/** Convert dependencies declaration to import statements:
 * a) If dependencies is an ArrayExpression, extract the values and create import statements.
 * 	If factory is a Function extract the names of the parameters and use them for the imports.
 * 		If no parameter is found, assume it's a side effect import.
 * 	If factory is an Identifier, derive import identifier names from the import module name for later usage
 * b) If dependencies is an Identifier, abort with an error.
*/
function collectImports(
	moduleDeclaration: ModuleDeclaration,
	nodeFactory: ts.NodeFactory
): {imports: ts.ImportDeclaration[]; identifiers: ts.Identifier[]} {
	const imports: ts.ImportDeclaration[] = [];
	const identifiers: ts.Identifier[] = [];
	if (!moduleDeclaration.dependencies) {
		// No dependencies declared
		return {imports, identifiers};
	}

	let factoryParams: ts.Identifier[] | undefined;
	let factoryRequiresCallWrapper = false;
	if (moduleDeclaration.factory) {
		if (ts.isFunctionExpression(moduleDeclaration.factory) ||
			ts.isArrowFunction(moduleDeclaration.factory) ||
			ts.isFunctionDeclaration(moduleDeclaration.factory)) {
			// Extract parameter names
			factoryParams = moduleDeclaration.factory.parameters.map((param) => {
				if (!ts.isIdentifier(param.name)) {
					// Indicates destructuring in factory signature. This is not (yet?) supported
					throw new UnsupportedModuleError(
						`Unexpected parameter type ${ts.SyntaxKind[param.kind]} ` +
						`at ${toPosStr(param)}`);
				}
				return param.name;
			});
		} else if (ts.isIdentifier(moduleDeclaration.factory)) {
			factoryRequiresCallWrapper = true;
		}
	}

	if (ts.isIdentifier(moduleDeclaration.dependencies)) {
		throw new UnsupportedModuleError(`Unable to determine dependencies for module. Can't parse variable at ` +
			`${toPosStr(moduleDeclaration.dependencies)}`);
	}

	// Create import statements based on factory parameters
	moduleDeclaration.dependencies.elements.forEach((dep, i) => {
		// Create import statements
		let moduleSpecifier: ts.StringLiteral;
		if (!ts.isStringLiteralLike(dep)) {
			log.verbose(`Skipping non-string dependency entry of type ${ts.SyntaxKind[dep.kind]} at ` +
				toPosStr(dep));
			return;
		}
		if (ts.isNoSubstitutionTemplateLiteral(dep)) {
			moduleSpecifier = nodeFactory.createStringLiteral(dep.text);
			// Set range to the original range to preserve source mapping capability
			ts.setTextRange(moduleSpecifier, dep);
		} else {
			moduleSpecifier = dep;
		}
		let identifier: ts.Identifier | undefined;
		if (factoryRequiresCallWrapper) {
			// Generate variable name based on import module
			// Later this variable will be used to call the factory function
			identifier = nodeFactory.createUniqueName(resolveUniqueName(dep.text));
		} else if (factoryParams?.[i]) {
			// Use factory parameter identifier as import identifier
			identifier = factoryParams[i];
		} // else: Side effect imports. No identifier needed

		let importClause;
		if (identifier) {
			identifiers.push(identifier);
			importClause = nodeFactory.createImportClause(false, identifier, undefined);
		}

		imports.push(nodeFactory.createImportDeclaration(
			undefined,
			importClause,
			moduleSpecifier
		));
	});
	pruneNode(moduleDeclaration.dependencies);

	return {imports, identifiers};
}

/** Convert factory to module body:
 * 	a) If factory is a FunctionExpression or ArrowFunctionExpression, extract the body and create default
 * 		export for it's return value
 * 	b) If factory is any other kind of _value_, use it directly
 * 	c) If factory is an Identifier, create a function and call it with all dependencies
 *
 * Then create default export:
 * 	a) If factory body contains a single return statement, use its argument for the default export
 * 	b) If factory body contains multiple return statements, wrap the whole body
 * 		in a function and use that for the default export
 */
function getModuleBody(
	moduleDeclaration: ModuleDeclaration,
	sourceFile: ts.SourceFile,
	nodeFactory: ts.NodeFactory,
	importIdentifiers: ts.Identifier[]
): {body: ts.Statement[]; oldFactoryBlock?: ts.Block; moveComments: [ts.Node, ts.Node][]} {
	if (!moduleDeclaration.factory) {
		return {body: [], moveComments: []};
	}
	let oldFactoryBlock: ts.Block | undefined;
	let body: ts.Statement[];
	const moveComments: [ts.Node, ts.Node][] = [];
	if ((ts.isFunctionExpression(moduleDeclaration.factory) ||
		ts.isArrowFunction(moduleDeclaration.factory) ||
		ts.isFunctionDeclaration(moduleDeclaration.factory))) {
		if (!moduleDeclaration.factory.body) {
			// Empty function body, no export
			body = [];
		} else if (ts.isBlock(moduleDeclaration.factory.body)) {
			const factoryBody = moduleDeclaration.factory.body.statements;
			/* Convert factory to module body:
				a) If body contains a single return statement, add all nodes to body but wrap
					the return statement's argument with a default export
				b) If body contains multiple return statements, wrap body in an iife
					use that for the body, wrapped in a default export declaration
			*/

			const returnStatements = collectReturnStatementsInScope(moduleDeclaration.factory, 2);
			if (returnStatements.length > 1) {
				log.verbose(`Multiple return statements found in factory at ${toPosStr(moduleDeclaration.factory)}`);
				let factoryCall: ts.CallExpression;
				if (ts.isFunctionExpression(moduleDeclaration.factory) ||
					ts.isArrowFunction(moduleDeclaration.factory)) {
					// Wrap factory in iife
					factoryCall = nodeFactory.createCallExpression(
						moduleDeclaration.factory, undefined, importIdentifiers);
				} else if (ts.isFunctionDeclaration(moduleDeclaration.factory) && moduleDeclaration.factory.name) {
					// Call the declaration
					factoryCall = nodeFactory.createCallExpression(
						moduleDeclaration.factory.name, undefined, importIdentifiers);
				} else {
					throw new UnsupportedModuleError(
						`Unable to call factory of type ${ts.SyntaxKind[moduleDeclaration.factory.kind]} at ` +
						toPosStr(moduleDeclaration.factory));
				}
				body = [createDefaultExport(nodeFactory, factoryCall)];
			} else {
				oldFactoryBlock = moduleDeclaration.factory.body;
				body = [];
				// One return statement in scope
				for (const node of factoryBody) {
					if (ts.isReturnStatement(node) && node.expression) {
						if (ts.isCallExpression(node.expression)) {
							let classDeclaration: ts.ClassDeclaration | undefined;
							try {
								classDeclaration = rewriteExtendCall(nodeFactory,
									node.expression, [
										nodeFactory.createToken(ts.SyntaxKind.ExportKeyword),
										nodeFactory.createToken(ts.SyntaxKind.DefaultKeyword),
									]);
							} catch (err) {
								if (err instanceof UnsupportedExtendCall) {
									log.verbose(`Failed to transform extend call: ${err.message}`);
								} else {
									throw err;
								}
							}
							if (classDeclaration) {
								body.push(classDeclaration);
								moveComments.push([node, classDeclaration]);
							} else {
								body.push(createDefaultExport(nodeFactory, node.expression));
							}
						} else {
							const defaultExport = createDefaultExport(nodeFactory, node.expression);
							body.push(defaultExport);
							moveComments.push([node, defaultExport]);
							// body.push(factory.createExportAssignment(undefined, undefined,
							// 	node.expression));
						}
					} else if (ts.isExpressionStatement(node) && ts.isStringLiteral(node.expression) &&
						node.expression.text === "use strict") {
						// Ignore "use strict" directive
						continue;
					} else {
						body.push(node);
					}
				}

				pruneNode(moduleDeclaration.factory);
			}
		} else if (ts.isCallExpression(moduleDeclaration.factory.body)) {
			// Arrow function with expression body
			let classDeclaration: ts.ClassDeclaration | undefined;
			try {
				classDeclaration = rewriteExtendCall(nodeFactory,
					moduleDeclaration.factory.body, [
						nodeFactory.createToken(ts.SyntaxKind.ExportKeyword),
						nodeFactory.createToken(ts.SyntaxKind.DefaultKeyword),
					]);
			} catch (err) {
				if (err instanceof UnsupportedExtendCall) {
					log.verbose(`Failed to transform extend call: ${err.message}`);
				} else {
					throw err;
				}
			}
			if (classDeclaration) {
				body = [classDeclaration];
			} else {
				// Export expression directly
				body = [createDefaultExport(nodeFactory, moduleDeclaration.factory.body)];
			}
		} else {
			// Export expression directly
			body = [createDefaultExport(nodeFactory, moduleDeclaration.factory.body)];
		}
	} else if (ts.isClassDeclaration(moduleDeclaration.factory) ||
		ts.isLiteralExpression(moduleDeclaration.factory) ||
		ts.isArrayLiteralExpression(moduleDeclaration.factory) ||
		ts.isObjectLiteralExpression(moduleDeclaration.factory) ||
		ts.isPropertyAccessExpression(moduleDeclaration.factory)) {
		// Use factory directly
		body = [createDefaultExport(nodeFactory, moduleDeclaration.factory)];
	} else { // Identifier
		throw new Error(`FIXME: Unsupported factory type ${ts.SyntaxKind[moduleDeclaration.factory.kind]} at ` +
			toPosStr(moduleDeclaration.factory));
	}
	return {body, oldFactoryBlock, moveComments};
}

/**
 * Collect all return statements in the provided node's function scope
 */
function collectReturnStatementsInScope(node: ts.Node, maxCount?: number): ts.ReturnStatement[] {
	const returnStatements: ts.ReturnStatement[] = [];
	function visitNode(node: ts.Node) {
		switch (node.kind) {
			case SyntaxKind.ReturnStatement:
				returnStatements.push(node as ts.ReturnStatement);
				return;

				// Do not traverse into nodes that declare a new function scope
			case SyntaxKind.FunctionDeclaration:
			case SyntaxKind.FunctionExpression:
			case SyntaxKind.ArrowFunction:
			case SyntaxKind.MethodDeclaration:
			case SyntaxKind.ModuleDeclaration:
			case SyntaxKind.Constructor:
			case SyntaxKind.SetAccessor:
			case SyntaxKind.GetAccessor:
				return;
		}
		if (maxCount && returnStatements.length >= maxCount) {
			return;
		}
		ts.forEachChild(node, visitNode);
	}

	ts.forEachChild(node, visitNode);
	return returnStatements;
}

function createDefaultExport(factory: ts.NodeFactory, node: ts.Node): ts.Statement {
	if (ts.isLiteralExpression(node)) {
		// Use factory directly
		return factory.createExportAssignment(undefined, undefined, node);
	}
	const exportModifiers = [
		factory.createToken(ts.SyntaxKind.ExportKeyword),
		factory.createToken(ts.SyntaxKind.DefaultKeyword),
	];
	switch (node.kind) {
		case SyntaxKind.CallExpression:
		case SyntaxKind.ArrayLiteralExpression:
		case SyntaxKind.ObjectLiteralExpression:
		case SyntaxKind.ArrowFunction:
		case SyntaxKind.Identifier:
		case SyntaxKind.PropertyAccessExpression:
		case SyntaxKind.NewExpression:
			return factory.createExportAssignment(undefined, undefined, node as ts.Expression);
		case SyntaxKind.ClassDeclaration:
			return factory.updateClassDeclaration(
				(node as ts.ClassDeclaration),
				exportModifiers,
				(node as ts.ClassDeclaration).name,
				(node as ts.ClassDeclaration).typeParameters,
				(node as ts.ClassDeclaration).heritageClauses,
				(node as ts.ClassDeclaration).members);
		case SyntaxKind.FunctionDeclaration:
			return factory.updateFunctionDeclaration(
				(node as ts.FunctionDeclaration),
				exportModifiers,
				(node as ts.FunctionDeclaration).asteriskToken,
				(node as ts.FunctionDeclaration).name,
				(node as ts.FunctionDeclaration).typeParameters,
				(node as ts.FunctionDeclaration).parameters,
				(node as ts.FunctionDeclaration).type,
				(node as ts.FunctionDeclaration).body);
		case SyntaxKind.FunctionExpression:
			return factory.createFunctionDeclaration(
				exportModifiers,
				(node as ts.FunctionExpression).asteriskToken,
				(node as ts.FunctionExpression).name,
				(node as ts.FunctionExpression).typeParameters,
				(node as ts.FunctionExpression).parameters,
				(node as ts.FunctionExpression).type,
				(node as ts.FunctionExpression).body);
		default:
			throw new UnsupportedModuleError(
				`Unable to create default export assignment for node of type ${SyntaxKind[node.kind]} at ` +
				toPosStr(node));
	}
}
