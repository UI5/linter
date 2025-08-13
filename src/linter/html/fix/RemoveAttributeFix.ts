import {Attribute, AttributeType, PositionDetail, Tag as SaxTag} from "sax-wasm";
import {ChangeAction, ChangeSet} from "../../../autofix/autofix.js";
import {HtmlFix} from "./HtmlFix.js";
import {ToPositionCallback} from "../../ui5Types/fix/XmlEnabledFix.js";

/**
 * Fix to remove an attribute from an HTML tag.
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

	// TODO: Remove
	// calculateRemovalPositions(tag: SaxTag, attr: Attribute): {startPos: PositionDetail; endPos: PositionDetail} {
	// 	// This will prepare the start and end pos of the removal.
	// 	// If there is a previous attribute, we need to remove
	// 	// the current attribute and all whitespace until the previous attribute.
	// 	// This is needed to ensure there are no empty lines or whitespaces left after removal.
	// 	const attrIndex = tag.attributes.indexOf(attr);
	// 	const previousAttr = attrIndex > 0 ? tag.attributes[attrIndex - 1] : undefined;
	// 	const startPos = previousAttr ?
	// 			{
	// 				line: previousAttr.value.end.line,
	// 				character: previousAttr.value.end.character + 1,
	// 			} :
	// 			{
	// 				line: attr.name.start.line,
	// 				character: attr.name.start.character,
	// 			};
	// 	const endPos = {
	// 		line: attr.value.end.line,
	// 		character: attr.value.end.character + 1,
	// 	};
	// 	return {startPos, endPos};
	// }

	calculateRemovalPositions(tag: SaxTag, attr: Attribute): {startPos: PositionDetail; endPos: PositionDetail} {
		let startPos, endPos: PositionDetail | undefined;
		// This will prepare the start and end pos of the removal.
		// If there is a previous attribute, we need to remove
		// the current attribute and all whitespace until the previous attribute.
		// This is needed to ensure there are no empty lines or whitespaces left after removal.

		const attrIndex = tag.attributes.indexOf(attr);
		const previousAttr = attrIndex > 0 ? tag.attributes[attrIndex - 1] : undefined;

		if (!previousAttr) {
			// TODO: refactor (= attribute is first in tag)
			startPos = {
				line: attr.name.start.line,
				character: attr.name.start.character,
			};
			endPos = {
				line: attr.value.end.line,
				character: attr.value.end.character + (attr.type === AttributeType.NoQuotes ? 0 : 1),
			};
		} else {
			// TODO: add handling of JSX (try to handle, if not possible: catch & ignore)
			// TODO: add handling of single-character attributes w/o values (eg: ,)
			if (previousAttr.type === AttributeType.NoQuotes) {
				startPos = {
					line: previousAttr.value.end.line,
					character: previousAttr.value.end.character,
				};
			} else if (previousAttr.type === AttributeType.DoubleQuoted ||
				previousAttr.type === AttributeType.SingleQuoted) {
				startPos = {
					line: previousAttr.value.end.line,
					character: previousAttr.value.end.character + 1,
				};
			} else if (previousAttr.type === AttributeType.NoValue) {
				startPos = {
					line: previousAttr.name.end.line,
					character: previousAttr.name.end.character,
				};
			}

			if (attr.type === AttributeType.NoQuotes) {
				endPos = {
					line: attr.value.end.line,
					character: attr.value.end.character,
				};
			} else if (attr.type === AttributeType.DoubleQuoted || attr.type === AttributeType.SingleQuoted) {
				endPos = {
					line: attr.value.end.line,
					character: attr.value.end.character + 1,
				};
			} else if (attr.type === AttributeType.NoValue) {
				endPos = {
					line: attr.name.end.line,
					character: attr.name.end.character,
				};
			}
		}
		if (!startPos || !endPos) {
			throw new Error("Could not calculate start and end position for attribute removal");
		}
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
