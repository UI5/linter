import {Attribute, Position, Tag} from "sax-wasm";
import Fix from "./Fix.js";

export type SaxNodeTypes = Tag | Attribute;
export type ToPositionCallback = (pos: Position) => number;

export default abstract class XmlEnabledFix extends Fix {
	abstract visitAutofixXmlNode(node: SaxNodeTypes, toPosition: ToPositionCallback): boolean;
}
