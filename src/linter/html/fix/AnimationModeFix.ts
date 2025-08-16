import {Attribute, PositionDetail} from "sax-wasm";
import {ChangeAction, ChangeSet} from "../../../autofix/autofix.js";
import {HtmlFix} from "./HtmlFix.js";
import {ToPositionCallback} from "../../ui5Types/fix/XmlEnabledFix.js";

/**
 * Special fix to change the animation mode attribute in HTML tags.
 * @param attribute The animation mode attribute to be fixed.
 */
export default class AnimationModeFix extends HtmlFix {
	private nameStartPositionDetail: PositionDetail;
	private nameEndPositionDetail: PositionDetail;
	private valueStartPositionDetail: PositionDetail;
	private valueEndPositionDetail: PositionDetail;
	private oldValue: string;
	private nameStartPos: number | undefined;
	private nameEndPos: number | undefined;
	private valueStartPos: number | undefined;
	private valueEndPos: number | undefined;

	constructor(attribute: Attribute) {
		super();
		this.nameStartPositionDetail = attribute.name.start;
		this.nameEndPositionDetail = attribute.name.end;
		this.valueStartPositionDetail = attribute.value.start;
		this.valueEndPositionDetail = attribute.value.end;
		this.oldValue = attribute.value.value;
	}

	calculateSourceCodeRange(toPosition: ToPositionCallback) {
		this.nameStartPos = toPosition(this.nameStartPositionDetail);
		this.nameEndPos = toPosition(this.nameEndPositionDetail);
		this.valueStartPos = toPosition(this.valueStartPositionDetail);
		this.valueEndPos = toPosition(this.valueEndPositionDetail);

		// We need to provide the overall range of our change so that the autofix
		// can check for conflicts with outer fixes.
		// The actual changes will be defined in the generateChanges method.
		this.startPos = this.nameStartPos;
		this.endPos = this.valueEndPos;
	}

	generateChanges(): ChangeSet[] {
		if (this.nameStartPos === undefined || this.nameEndPos === undefined ||
			this.valueStartPos === undefined || this.valueEndPos === undefined) {
			throw new Error("Required positions are not defined");
		}

		// This will replace the legacy attribute name
		// to "data-sap-ui-animation-mode":
		const nameChange: ChangeSet = {
			action: ChangeAction.REPLACE,
			start: this.nameStartPos,
			end: this.nameEndPos,
			value: "data-sap-ui-animation-mode",
		};

		// This will replace the value of the animation mode attribute
		// to "full" or "minimal" based on the old value:
		const newValue = AnimationModeFix.getAnimationModeValue(this.oldValue);
		const valueChange: ChangeSet = {
			action: ChangeAction.REPLACE,
			start: this.valueStartPos,
			end: this.valueEndPos,
			value: newValue,
		};

		return [nameChange, valueChange];
	}

	private static getAnimationModeValue(animationValue: string): string {
		const lowerCaseValue = animationValue.toLowerCase();
		return lowerCaseValue === "true" || lowerCaseValue === "x" ? "full" : "minimal";
	}
}
