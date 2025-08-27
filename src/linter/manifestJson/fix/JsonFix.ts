import ts from "typescript";
import Fix, {FixHelpers, NodeSearchParameters, SourceCodeRange} from "../../ui5Types/fix/Fix.js";
import {PositionInfo} from "../../LinterContext.js";

export abstract class JsonFix extends Fix {
	startPos: number | undefined;
	endPos: number | undefined;

	visitLinterNode(_node: ts.Node, _sourcePosition: PositionInfo, _helpers: FixHelpers): boolean {
		// JSON fixes don't use the linter node
		return true;
	}

	getNodeSearchParameters(): NodeSearchParameters {
		// JSON fixes don't use the node search parameters
		return {
			nodeTypes: [],
			position: {
				line: 0,
				column: 0,
			},
		};
	}

	visitAutofixNode(_node: ts.Node, _position: number, _sourceFile: ts.SourceFile): boolean {
		// JSON fixes don't use the TypeScript node
		return true;
	}

	getAffectedSourceCodeRange(): SourceCodeRange | undefined {
		if (this.startPos === undefined || this.endPos === undefined) {
			return undefined;
		}
		return {
			start: this.startPos,
			end: this.endPos,
		};
	}
}
