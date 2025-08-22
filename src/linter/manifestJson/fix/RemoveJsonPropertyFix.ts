import {ChangeAction, ChangeSet} from "../../../utils/textChanges.js";
import {getNextPropertyPointer, getPreviousPropertyPointer, jsonMapPointers} from "../parser.js";
import {JsonFix} from "./JsonFix.js";

export default class RemoveJsonPropertyFix extends JsonFix {
	constructor(removalKey: string, pointers: jsonMapPointers) {
		super();
		this.calculatePositions(removalKey, pointers);
	}

	calculatePositions(removalKey: string, pointers: jsonMapPointers) {
		const currentPointer = pointers[removalKey];
		const previousPointer = getPreviousPropertyPointer(pointers, currentPointer, removalKey);
		if (previousPointer) {
			// Start remove from end of previous property to include the comma
			this.startPos = previousPointer.valueEnd.pos;
			this.endPos = currentPointer.valueEnd.pos;
			return;
		}
		const nextPointer = getNextPropertyPointer(pointers, currentPointer, removalKey);
		if (nextPointer) {
			// End the removal at the start of the next property to include the comma
			this.startPos = currentPointer.key.pos;
			this.endPos = nextPointer.key.pos;
			return;
		}

		// Object can be removed completely
		const parentKey = removalKey.substring(0, removalKey.lastIndexOf("/"));
		this.calculatePositions(parentKey, pointers);
	}

	generateChanges(): ChangeSet | ChangeSet[] | undefined {
		if (!this.startPos || !this.endPos) {
			return undefined;
		}
		return {
			action: ChangeAction.DELETE,
			start: this.startPos,
			end: this.endPos,
		};
	}
}
