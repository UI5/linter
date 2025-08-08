import ts from "typescript";
import Fix, {FixHelpers, NodeSearchParameters, SourceCodeRange} from "../../ui5Types/fix/Fix.js";
import {ToPositionCallback} from "../../ui5Types/fix/XmlEnabledFix.js";
import {PositionInfo} from "../../LinterContext.js";

export abstract class HtmlFix extends Fix {
	startPos: number | undefined;
	endPos: number | undefined;

	visitLinterNode(_node: ts.Node, _sourcePosition: PositionInfo, _helpers: FixHelpers): boolean {
		// HTML fixes don't use the linter node
		return true;
	}

	getNodeSearchParameters(): NodeSearchParameters {
		// HTML fixes don't use the node search parameters
		return {
			nodeTypes: [],
			position: {
				line: 0,
				column: 0,
			},
		};
	}

	visitAutofixNode(_node: ts.Node, _position: number, _sourceFile: ts.SourceFile): boolean {
		// HTML fixes don't use the TypeScript node
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

	abstract calculateSourceCodeRange(toPosition: ToPositionCallback): void;
}
