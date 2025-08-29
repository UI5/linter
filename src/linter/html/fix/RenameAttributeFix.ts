import {Attribute, PositionDetail} from "sax-wasm";
import {ChangeAction, ChangeSet} from "../../../utils/textChanges.js";
import {HtmlFix} from "./HtmlFix.js";
import {ToPositionCallback} from "../../ui5Types/fix/XmlEnabledFix.js";

/**
 * Fix to rename the identifier of an attribute in an HTML tag.
 * @param attribute The identifier to be renamed.
 * @param newName The new identifier for the attribute.
 */
export default class RenameAttributeFix extends HtmlFix {
	private startPositionDetail: PositionDetail;
	private endPositionDetail: PositionDetail;

	constructor(attribute: Attribute, private newName: string) {
		super();
		this.startPositionDetail = attribute.name.start;
		this.endPositionDetail = attribute.name.end;
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
			action: ChangeAction.REPLACE,
			start: this.startPos,
			end: this.endPos,
			value: this.newName,
		};
	}
}
