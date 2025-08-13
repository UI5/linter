import ts from "typescript";

export function toPosStr(node: ts.Node) {
	const {line, character: column} = node.getSourceFile().getLineAndCharacterOfPosition(node.getStart());
	return `${line + 1}:${column + 1}`;
}

export function parseJSDocComments(sourceFile: ts.SourceFile) {
	const jsdocComments: {
		comment: string;
		tags: ts.JSDocTag[];
		node: ts.Node;
	}[] = [];

	function visit(node: ts.Node) {
		// Get JSDoc comments for this node
		const jsDocNodes = ts.getJSDocCommentsAndTags(node);

		if (jsDocNodes.length > 0) {
			for (const jsdoc of jsDocNodes) {
				if (ts.isJSDoc(jsdoc)) {
					jsdocComments.push({
						comment: jsdoc.comment ? ts.getTextOfJSDocComment(jsdoc.comment) ?? "" : "",
						tags: jsdoc.tags ? Array.from(jsdoc.tags) : [],
						node: node,
					});
				}
			}
		}

		ts.forEachChild(node, visit);
	}

	visit(sourceFile);
	return jsdocComments;
}

export class UnsupportedModuleError extends Error {
	constructor(message: string) {
		super(message);
		this.name = this.constructor.name;
	}
}
