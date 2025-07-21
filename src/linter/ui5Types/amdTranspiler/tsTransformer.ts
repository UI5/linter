import ts from "typescript";
import {getLogger} from "@ui5/logger";
import parseModuleDeclaration from "./parseModuleDeclaration.js";
import moduleDeclarationToDefinition, {ModuleDefinition} from "./moduleDeclarationToDefinition.js";
import parseRequire from "./parseRequire.js";
import {transformAsyncRequireCall, transformSyncRequireCall} from "./requireExpressionToTransformation.js";
import pruneNode, {UnsafeNodeRemoval} from "./pruneNode.js";
import replaceNodeInParent, {NodeReplacement} from "./replaceNodeInParent.js";
import {toPosStr, UnsupportedModuleError} from "./util.js";
import rewriteExtendCall, {UnsupportedExtendCall} from "./rewriteExtendCall.js";
import insertNodesInParent from "./insertNodesInParent.js";
import LinterContext, {LintMetadata} from "../../LinterContext.js";
import {findDirectives} from "../directives.js";

const log = getLogger("linter:ui5Types:amdTranspiler:TsTransformer");

// Augment typescript's Node interface to add a property for marking nodes for removal
declare module "typescript" {
	interface Node {
		_remove?: boolean;
	}
}

interface NodeComments {
	leading: ts.CommentRange[];
	trailing: ts.CommentRange[];
}

function removeCommentFromSourceFile(sourceFile: ts.SourceFile, comment: ts.CommentRange) {
	sourceFile.text =
			sourceFile.text.slice(0, comment.pos).padEnd(comment.end, " ") +
			sourceFile.text.slice(comment.end);
}

function isBlockLike(node: ts.Node): node is ts.BlockLike {
	return ts.isSourceFile(node) || ts.isBlock(node) || ts.isModuleBlock(node) || ts.isCaseOrDefaultClause(node);
}

/**
 * Creates a TypeScript "transformer" that will be applied to each source file, doing the actual transpilation
 * The source file is expected to be classic UI5 JavaScript, using UI5s's AMD loader and other UI5 specific API.
 * Modern JavaScript language features are generally supported, however there might be gaps in the implementation
 * at the time of writing this comment.
 *
 * If a transformation of a specific API (such as "sap.ui.define") is not possible for some reason, an "Unsupported*"
 * error is thrown. In that case, the rest of the module is still processed. However it's possible that the result
 * will be equal to the input.
*/
export function createTransformer(
	program: ts.Program, resourcePath: string, context: LinterContext
): ts.TransformerFactory<ts.SourceFile> {
	return function transformer(tContext: ts.TransformationContext) {
		return (sourceFile: ts.SourceFile): ts.SourceFile => {
			return transform(program, sourceFile, tContext, resourcePath, context);
		};
	};
}

function transform(
	program: ts.Program, sourceFile: ts.SourceFile, tContext: ts.TransformationContext, resourcePath: string,
	context: LinterContext
): ts.SourceFile {
	log.verbose(`Transforming ${resourcePath}`);
	const checker = program.getTypeChecker();
	const {factory: nodeFactory} = tContext;
	const moduleDefinitions: ModuleDefinition[] = [];
	// TODO: Filter duplicate imports, maybe group by module definition
	const requireImports: ts.ImportDeclaration[] = [];
	const requireFunctions: ts.FunctionDeclaration[] = [];
	const nodeReplacements = new Map<ts.Node, NodeReplacement[]>();
	const nodeInsertions = new Map<ts.BlockLike, Map<ts.Statement, ts.Statement[]>>();
	const commentRemovals: ts.CommentRange[] = [];

	function replaceNode(node: ts.Node, substitute: ts.Node) {
		let replacements = nodeReplacements.get(node.parent);
		if (!replacements) {
			replacements = [];
			nodeReplacements.set(node.parent, replacements);
		}
		replacements.push({original: node, substitute});
	}

	function insertNodeAfter(referenceNode: ts.Statement, nodeToBeInserted: ts.Statement) {
		if (!isBlockLike(referenceNode.parent)) {
			// Only BlockLike nodes can have statements
			throw new Error(
				`Unsupported insertion of node into parent with type ${ts.SyntaxKind[referenceNode.parent.kind]} ` +
				`at ${toPosStr(referenceNode.parent)}`);
		}
		let insertionsMap = nodeInsertions.get(referenceNode.parent);
		if (!insertionsMap) {
			insertionsMap = new Map();
			nodeInsertions.set(referenceNode.parent, insertionsMap);
		}
		let insertions = insertionsMap.get(referenceNode);
		if (!insertions) {
			insertions = [];
			insertionsMap.set(referenceNode, insertions);
		}
		insertions.push(nodeToBeInserted);
	}

	const metadata = context.getMetadata(resourcePath);
	findDirectives(sourceFile, metadata);

	// For now, only resolve relative imoprts in productive code.
	// (In test code, issues with externally configured resource roots are
	// more likely)
	const defaultModuleID =
		resourcePath.startsWith("/resources/") ?
				resourcePath.slice("/resources/".length, -2) : // extract runtime module ID
			undefined;

	// Visit the AST depth-first and collect module definitions
	function visit(nodeIn: ts.Node): ts.VisitResult<ts.Node> {
		const node = ts.visitEachChild(nodeIn, visit, tContext);
		if (ts.isCallExpression(node) &&
			ts.isPropertyAccessExpression(node.expression)) {
			if (matchPropertyAccessExpression(node.expression, "sap.ui.define")) {
				try {
					const moduleDeclaration = parseModuleDeclaration(node.arguments, checker);
					const moduleDefinition = moduleDeclarationToDefinition(moduleDeclaration, sourceFile,
						nodeFactory, defaultModuleID);
					moduleDefinitions.push(moduleDefinition);
					if (moduleDefinition.imports.length) {
						moduleDefinition.imports.forEach((importStatement) =>
							addModuleMetadata(metadata, "sap.ui.define", importStatement));
					} else {
						// Empty sap.ui.define (no imports, no body)
						addModuleMetadata(metadata, "sap.ui.define");
					}
					pruneNode(node); // Mark the define call for removal
				} catch (err) {
					if (err instanceof UnsupportedModuleError) {
						log.verbose(`Failed to transform sap.ui.define call in ${resourcePath}: ${err.message}`);
					} else {
						throw err;
					}
				}
			} else if (matchPropertyAccessExpression(node.expression, "sap.ui.require")) {
				try {
					const requireExpression = parseRequire(node.arguments, checker);
					if (requireExpression.async) {
						const res = transformAsyncRequireCall(node, requireExpression, nodeFactory);
						requireImports.push(...res.imports);
						res.imports.forEach((importStatement) =>
							addModuleMetadata(metadata, "sap.ui.require", importStatement));
						if (res.callback) {
							replaceNode(node, res.callback);
							if (res.errback) {
								requireFunctions.push(res.errback);
							}
						} else {
							// async sap.ui.require without a callback (import only)
							try {
								pruneNode(node);
							} catch (err) {
								if (err instanceof UnsafeNodeRemoval) {
									// If removal is not possible, replace the CallExpression with "undefined"
									// (i.e. the original return value)
									replaceNode(node, nodeFactory.createIdentifier("undefined"));
								} else {
									throw err;
								}
							}
						}
					} else {
						const res = transformSyncRequireCall(node, requireExpression, nodeFactory);
						requireImports.push(res.import);
						addModuleMetadata(metadata, "sap.ui.require", res.import);
						replaceNode(node, res.requireStatement);
					}
				} catch (err) {
					if (err instanceof UnsupportedModuleError) {
						log.verbose(`Failed to transform sap.ui.require call in ${resourcePath}: ${err.message}`);
					} else {
						throw err;
					}
				}
			} else {
				let variableStatement: ts.VariableStatement | undefined;
				let className: string | undefined;

				// Check if class is assigned to a variable.
				// If so, use the local variable name as class name and remove the variable declaration
				if (
					ts.isVariableDeclaration(node.parent) &&
					ts.isVariableDeclarationList(node.parent.parent) &&
					ts.isVariableStatement(node.parent.parent.parent)
				) {
					variableStatement = node.parent.parent.parent;
					className = node.parent.name.getText();
				}

				// For now, only rewrite extend calls in expressions and variable statements
				if (variableStatement || ts.isExpressionStatement(node.parent)) {
					try {
						const classDeclaration = rewriteExtendCall(nodeFactory, node, undefined, className);
						if (classDeclaration) {
							if (variableStatement) {
								if (variableStatement.declarationList.declarations.length > 1) {
									// The variable statement contains more than just our class variable
									// and we can't replace the variable declaration with the class declaration
									// (not valid).

									// So we remove the single declaration within the variable statement...
									pruneNode(node.parent);

									// ... and insert the class declaration after the variable statement
									insertNodeAfter(variableStatement, classDeclaration);

									// Also: Move comments from the variable declaration to the class declaration
									moveCommentsToNode(node.parent, classDeclaration, sourceFile);
								} else {
									// The variable statement only contains our class variable, so we can replace
									// the whole statement node with the new class declaration.
									replaceNode(variableStatement, classDeclaration);
								}
							} else if (ts.isExpressionStatement(node.parent)) {
								replaceNode(node.parent, classDeclaration);
							}
						}
					} catch (err) {
						if (err instanceof UnsupportedExtendCall) {
							log.verbose(`Failed to transform extend call: ${err.message}`);
						} else {
							throw err;
						}
					}
				}
			}
		}
		return node;
	}
	let processedSourceFile = ts.visitNode(sourceFile, visit) as ts.SourceFile;

	const statements = [
		...requireImports,
		...processedSourceFile.statements as unknown as ts.Statement[],
		...requireFunctions,
	];
	moduleDefinitions.forEach(({imports, body}) => {
		// Add imports of each module definition to the top of the program
		statements.unshift(...imports);
		// Add the module definition body to the end of the program
		statements.push(...body);
	});

	// Update the AST with extracted nodes from the module definitions and require expressions
	processedSourceFile = nodeFactory.updateSourceFile(processedSourceFile, statements);

	// Enforce calculating the line starts so that later modifications and new comments result in a correct source map
	processedSourceFile.getLineStarts();

	// Get full source text to find comments
	const fullSourceText = processedSourceFile.getFullText();

	moduleDefinitions.forEach(({oldFactoryBlock, moveComments}) => {
		// Make sure to move comments from removed nodes to the new ones
		// (e.g. when a "return" statement becomes a "export default class" statement)
		if (moveComments) {
			for (const [from, to] of moveComments) {
				moveCommentsToNode(from, to);
			}
		}
		if (!oldFactoryBlock) {
			return;
		}

		const lastFactoryBlockChild = oldFactoryBlock.getChildren().slice(-1)[0];
		if (lastFactoryBlockChild.kind === ts.SyntaxKind.CloseBraceToken) {
			// Make sure that comments at the end of the factory block are preserved

			const comments = getCommentsFromNode(lastFactoryBlockChild);
			comments.leading.forEach((comment) => {
				commentRemovals.push(comment);
				const commentText = getCommentText(comment, sourceFile);
				if (!(comment.kind === ts.SyntaxKind.MultiLineCommentTrivia && commentText.startsWith("*"))) {
					// For now, do not move JSDoc comments as they might contribute invalid type information
					// to the TypeScript type checker.
					// Instead, the comments will be removed completely.
					const lastStatement = processedSourceFile.statements[processedSourceFile.statements.length - 1];
					ts.addSyntheticTrailingComment(
						lastStatement, comment.kind, commentText, comment.hasTrailingNewLine);
				}
			});
		}

		// After updating the source file, the top level statements get a new parent.
		// We need to update the insertions and replacements maps to reflect the new parent nodes.
		const insertionsMap = nodeInsertions.get(oldFactoryBlock);
		if (insertionsMap) {
			nodeInsertions.set(processedSourceFile, insertionsMap);
		}
		const replacements = nodeReplacements.get(oldFactoryBlock);
		if (replacements) {
			nodeReplacements.set(processedSourceFile, replacements);
		}
	});

	function addModuleMetadata(metadata: LintMetadata, importType: string, importStatement?: ts.ImportDeclaration) {
		if (!metadata.transformedImports) {
			metadata.transformedImports = new Map<string, Set<string>>();
		}
		const curResource = metadata.transformedImports.get(importType) ?? new Set<string>();
		if (importStatement && ts.isStringLiteral(importStatement.moduleSpecifier)) {
			curResource.add(importStatement.moduleSpecifier.text);
		}
		metadata.transformedImports.set(importType, curResource);
	}

	function getCommentsFromNode(node: ts.Node, sourceFile?: ts.SourceFile): NodeComments {
		const sourceText = sourceFile?.getFullText() ?? fullSourceText;
		const leadingComments = ts.getLeadingCommentRanges(sourceText, node.getFullStart()) ?? [];
		const trailingComments = ts.getTrailingCommentRanges(sourceText, node.getEnd()) ?? [];
		return {
			leading: leadingComments,
			trailing: trailingComments,
		};
	}

	function getCommentText(comment: ts.CommentRange, sourceFile?: ts.SourceFile): string {
		const sourceText = sourceFile?.getFullText() ?? fullSourceText;
		const fullCommentText = sourceText.substring(comment.pos, comment.end);
		if (comment.kind === ts.SyntaxKind.SingleLineCommentTrivia) {
			// Remove leading "//"
			return fullCommentText.replace(/^\/\//, "");
		} else if (comment.kind === ts.SyntaxKind.MultiLineCommentTrivia) {
			// Remove leading "/*" and trailing "*/"
			return fullCommentText.replace(/^\/\*/, "").replace(/\*\/$/, "");
		} else {
			return fullCommentText;
		}
	}

	function moveCommentsToNode(from: ts.Node, to: ts.Node, sourceFile?: ts.SourceFile) {
		// Note: Moving synthetic comments becomes relevant when a newly created node is replaced with another new node.
		// Currently this doesn't seem to be the case, but in future it might be.
		ts.moveSyntheticComments(to, from);

		const comments = getCommentsFromNode(from, sourceFile);
		comments.leading.forEach((comment) => {
			commentRemovals.push(comment);
			const commentText = getCommentText(comment, sourceFile);
			if (!(comment.kind === ts.SyntaxKind.MultiLineCommentTrivia && commentText.startsWith("*"))) {
				// For now, do not move JSDoc comments as they might contribute invalid type information
				// to the TypeScript type checker.
				// Instead, the comments will be removed completely.
				ts.addSyntheticLeadingComment(to, comment.kind, commentText, comment.hasTrailingNewLine);
			}
		});
		comments.trailing.forEach((comment) => {
			commentRemovals.push(comment);
			const commentText = getCommentText(comment, sourceFile);
			if (!(comment.kind === ts.SyntaxKind.MultiLineCommentTrivia && commentText.startsWith("*"))) {
				// For now, do not move JSDoc comments as they might contribute invalid type information
				// to the TypeScript type checker.
				// Instead, the comments will be removed completely.
				ts.addSyntheticTrailingComment(to, comment.kind, commentText, comment.hasTrailingNewLine);
			}
		});
	}

	// Visit the AST breadth-first and apply all modifications (removal, replacement, insertion)
	function applyModifications(node: ts.Node): ts.VisitResult<ts.Node | undefined> {
		if (node._remove) {
			// console.log(`Cleanup: Removing node ${ts.SyntaxKind[node.kind]}`);
			return undefined;
		}

		// Lookup for replacements before applying insertions as the node will change
		// and afterwards the replacements would not be found anymore
		const replacements = nodeReplacements.get(node);

		if (ts.isSourceFile(node) || ts.isBlock(node)) {
			const insertionsMap = nodeInsertions.get(node);
			if (insertionsMap) {
				const updatedNode = insertNodesInParent(node, insertionsMap, nodeFactory);
				if (updatedNode) {
					node = updatedNode;
				}
			}
		}
		if (replacements) {
			for (const replacement of replacements) {
				// Move comments to the new node
				moveCommentsToNode(replacement.original, replacement.substitute);
				// Replace it
				node = replaceNodeInParent(node, replacement, nodeFactory);
			}
		}
		return ts.visitEachChild(node, applyModifications, tContext);
	}
	processedSourceFile = ts.visitNode(processedSourceFile, applyModifications) as ts.SourceFile;

	// Remove comments at the very end as the instance of processedSourceFile might change
	// during applyModifications (e.g. when replacing a node)
	for (const comment of commentRemovals) {
		removeCommentFromSourceFile(processedSourceFile, comment);
	}

	return processedSourceFile;
}

// TODO PERF: Use a match array instead of string to be able to match individual parts of the property access chain
// early (i.e. exist immediately if the last expression does not match the last match)
function matchPropertyAccessExpression(node: ts.PropertyAccessExpression, match: string): boolean {
	const propAccessChain: string[] = [];
	propAccessChain.push(node.expression.getText());

	let scanNode: ts.Node = node;
	while (ts.isPropertyAccessExpression(scanNode)) {
		propAccessChain.push(scanNode.name.getText());
		scanNode = scanNode.parent;
	}
	return propAccessChain.join(".") === match;
}
