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

	/**
	 * This will prepare the start and end pos of the removal.
	 * This is needed to ensure there are no empty lines or whitespaces left after removal.
	 */
	calculateRemovalPositions(tag: SaxTag, attr: Attribute): {startPos: PositionDetail; endPos: PositionDetail} {
		let startPos, endPos: PositionDetail | undefined;

		const attrIndex = tag.attributes.indexOf(attr);
		const previousAttr = attrIndex > 0 ? tag.attributes[attrIndex - 1] : undefined;

		if (!previousAttr) {
			// If there is no previous attribute (attribute is first), we remove the current attribute
			// and all whitespace until the end of the tag name.
			startPos = {
				line: tag.openStart.line,
				character: tag.openStart.character + tag.name.length + 1,
			};
		} else {
			// If there is a previous attribute, we remove the current attribute
			// and all whitespace until the previous attribute.
			switch (previousAttr.type) {
				case AttributeType.SingleQuoted:
				case AttributeType.DoubleQuoted:
					startPos = {
						line: previousAttr.value.end.line,
						character: previousAttr.value.end.character + 1,
					};
					break;
				case AttributeType.NoQuotes:
					startPos = {
						line: previousAttr.value.end.line,
						character: previousAttr.value.end.character,
					};
					break;
				case AttributeType.NoValue:
					startPos = {
						line: previousAttr.name.end.line,
						character: previousAttr.name.end.character,
					};
					break;
			}
		}
		switch (attr.type) {
			case AttributeType.SingleQuoted:
			case AttributeType.DoubleQuoted:
				endPos = {
					line: attr.value.end.line,
					character: attr.value.end.character + 1,
				};
				break;
			case AttributeType.NoQuotes:
				endPos = {
					line: attr.value.end.line,
					character: attr.value.end.character,
				};
				break;
			case AttributeType.NoValue:
				endPos = {
					line: attr.name.end.line,
					character: attr.name.end.character,
				};
				break;
		}

		// These two if statements are a workaround for edge cases
		// since sax-wasm parses wrong positions for NoValue single-character attributes.
		// TODO: Remove once it's fixed (https://github.com/justinwilaby/sax-wasm/issues/139).
		if (previousAttr && previousAttr.type === AttributeType.NoValue && previousAttr.name.value.length === 1) {
			startPos = {
				line: previousAttr.name.start.line,
				character: previousAttr.name.start.character + 1,
			};
		}
		if (attr.type === AttributeType.NoValue && attr.name.value.length === 1) {
			endPos = {
				line: attr.name.start.line,
				character: attr.name.start.character + 1,
			};
		}

		// Edge case: no space w/ NoValues or NoQuotes
		const edgeCaseStartPos = this._handleEdgeCase(tag, attrIndex);
		if (edgeCaseStartPos) {
			startPos = edgeCaseStartPos;
		}

		if (!startPos) {
			throw new Error("Could not calculate start position for attribute removal");
		}
		if (!endPos) {
			throw new Error("Could not calculate end position for attribute removal");
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

	_handleEdgeCase(tag: SaxTag, attrIndex: number): PositionDetail | undefined {
		// Edge Case 1: attr=abc attr="def"ignore=xyz
		// --> attr=abc ignore=xyz
		// Edge Case 2: attr attr="def"ignore=xyz
		// --> attr ignore=xyz
		const attr = tag.attributes[attrIndex];
		const previousAttr = attrIndex > 0 ? tag.attributes[attrIndex - 1] : undefined;
		const subsequentAttr = tag.attributes[attrIndex + 1];

		if (!subsequentAttr) {
			return undefined;
		}
		if (subsequentAttr.name.end.line != attr.value.end.line) {
			return undefined;
		}
		if (subsequentAttr.name.start.character != attr.value.end.character + 1) {
			return undefined;
		}

		if (!previousAttr) {
			return {
				line: tag.openStart.line,
				character: tag.openStart.character + tag.name.length + 2,
			};
		} else if (previousAttr.type === AttributeType.NoValue) {
			return {
				line: previousAttr.name.end.line,
				character: previousAttr.name.end.character + 1,
			};
		} else if (previousAttr.type === AttributeType.NoQuotes) {
			return {
				line: previousAttr.value.end.line,
				character: previousAttr.value.end.character + 1,
			};
		}
	}
}
