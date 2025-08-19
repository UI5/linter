import ts from "typescript";

export function toPosStr(node: ts.Node) {
	const {line, character: column} = node.getSourceFile().getLineAndCharacterOfPosition(node.getStart());
	return `${line + 1}:${column + 1}`;
}

export class UnsupportedModuleError extends Error {
	constructor(message: string) {
		super(message);
		this.name = this.constructor.name;
	}
}
