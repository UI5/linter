import {Attribute, PositionDetail, Tag as SaxTag} from "sax-wasm";
import {ChangeAction, ChangeSet} from "../../../autofix/autofix.js";
import {HtmlFix} from "./HtmlFix.js";
import {ToPositionCallback} from "../../ui5Types/fix/XmlEnabledFix.js";

/**
 * @param tag The surrounding tag from which the attribute should be removed.
 * @param attr The attribute to be removed.
 */
export default class RemoveAttributeFix extends HtmlFix {
	private startPositionDetail: PositionDetail;
	private endPositionDetail: PositionDetail;

	constructor(tag: SaxTag, attr: Attribute) {
		super();
		const {startPos, endPos} = this.calculateRemovalPositions(tag, attr);
		this.startPositionDetail = startPos;
		this.endPositionDetail = endPos;
	}

	calculateRemovalPositions(tag: SaxTag, attr: Attribute): {startPos: PositionDetail; endPos: PositionDetail} {
		// This will prepare the start and end pos of the removal.
		// If there is a previous attribute, we need to remove
		// the current attribute and all whitespace until the previous attribute.
		// This is needed to ensure there are no empty lines or whitespaces left after removal.
		const i = tag.attributes.indexOf(attr);
		const previousAttr = i > 0 ? tag.attributes[i - 1] : undefined;
		const startPos = previousAttr ?
				{
					line: previousAttr.value.end.line,
					character: previousAttr.value.end.character + 1,
				} :
				{
					line: attr.name.start.line,
					character: attr.name.start.character,
				};
		const endPos = {
			line: attr.value.end.line,
			character: attr.value.end.character + 1, // +1 to include the closing quote
		};
		return {startPos, endPos};
	}

	calculateSourceCodeRange(toPosition: ToPositionCallback) {
		this.startPos = toPosition(this.startPositionDetail);
		this.endPos = toPosition(this.endPositionDetail);
	}

	generateChanges(): ChangeSet {
		if (this.startPos === undefined || this.endPos === undefined) {
			throw new Error("Start and end position are not defined");
		}
		return {
			action: ChangeAction.DELETE,
			start: this.startPos,
			end: this.endPos,
		};
	}
}
