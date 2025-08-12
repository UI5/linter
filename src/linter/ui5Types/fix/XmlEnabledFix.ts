import {Attribute, Position, Tag} from "sax-wasm";
import Fix from "./Fix.js";
import SharedLanguageService from "../SharedLanguageService.js";
import LinterContext from "../../LinterContext.js";

export type SaxNodeTypes = Tag | Attribute;
export type ToPositionCallback = (pos: Position) => number;

export default abstract class XmlEnabledFix extends Fix {
	abstract visitAutofixXmlNode(
		node: SaxNodeTypes,
		toPosition: ToPositionCallback,
		xmlHelpers: Record<string, unknown> & {
			sharedLanguageService?: SharedLanguageService;
			context?: LinterContext;
		},
	): boolean;
}
