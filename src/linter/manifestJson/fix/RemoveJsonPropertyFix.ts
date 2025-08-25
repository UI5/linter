import {Pointers} from "json-source-map";
import {ChangeAction, ChangeSet} from "../../../utils/textChanges.js";
import {getNextPropertyPointer, getPreviousPropertyPointer} from "../parser.js";
import {JsonFix} from "./JsonFix.js";

interface RemoveJsonPropertyFixOptions {
	key: string;
	pointers: Pointers;
	removeEmptyDirectParent?: boolean;
}

export default class RemoveJsonPropertyFix extends JsonFix {
	constructor(options: RemoveJsonPropertyFixOptions) {
		super();
		this.calculatePositions(options.key, options.pointers, options.removeEmptyDirectParent);
	}

	calculatePositions(key: string, pointers: Pointers, removeParent = false) {
		const currentPointer = pointers[key];
		if (!currentPointer) {
			throw new TypeError(`Cannot find JSON pointer: '${key}'`);
		}
		if (!currentPointer.key) {
			throw new Error(`Unsupported removal of non-property value: '${key}'`);
		}
		const previousPointer = getPreviousPropertyPointer(pointers, currentPointer, key);
		if (previousPointer) {
			// Start removal from end of previous property to include the comma
			this.startPos = previousPointer.valueEnd.pos;
			this.endPos = currentPointer.valueEnd.pos;
			return;
		}
		const nextPointer = getNextPropertyPointer(pointers, currentPointer, key);
		if (nextPointer) {
			// End the removal at the start of the next property to include the comma
			this.startPos = currentPointer.key.pos;
			this.endPos = nextPointer.key!.pos; // Key is present, as it's a sibling property
			return;
		}

		const parentKey = key.substring(0, key.lastIndexOf("/"));
		const parentPointer = pointers[parentKey];
		if (!parentPointer) {
			throw new TypeError(`Cannot find parent JSON pointer: '${parentKey}' (for '${key}')`);
		}

		// Never remove the root object (empty string key)
		if (removeParent && parentKey) {
			this.calculatePositions(parentKey, pointers);
			return;
		}

		// Empty the parent object to remove the property and potential whitespace
		this.startPos = parentPointer.value.pos + 1; // Skip opening brace '{'
		this.endPos = parentPointer.valueEnd.pos - 1; // Skip closing brace '}'
	}

	generateChanges(): ChangeSet | ChangeSet[] | undefined {
		if (this.startPos === undefined || this.endPos === undefined) {
			return undefined;
		}
		return {
			action: ChangeAction.DELETE,
			start: this.startPos,
			end: this.endPos,
		};
	}
}
