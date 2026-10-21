import {Pointers} from "json-source-map";
import {ChangeAction, ChangeSet} from "../../../utils/textChanges.js";
import {JsonFix} from "./JsonFix.js";

interface ReplaceJsonValueFixOptions {
	key: string;
	pointers: Pointers;
	value: string;
}

export default class ReplaceJsonValueFix extends JsonFix {
	#value: string;

	constructor(options: ReplaceJsonValueFixOptions) {
		super();
		this.#value = JSON.stringify(options.value);
		this.calculatePositions(options.key, options.pointers);
	}

	calculatePositions(key: string, pointers: Pointers) {
		const currentPointer = pointers[key];
		if (!currentPointer) {
			throw new Error(`Cannot find JSON pointer: '${key}'`);
		}
		if (!currentPointer.value) {
			throw new Error(`Cannot replace non-value pointer: '${key}'`);
		}
		this.startPos = currentPointer.value.pos;
		this.endPos = currentPointer.valueEnd.pos;
	}

	generateChanges(): ChangeSet | ChangeSet[] | undefined {
		if (this.startPos === undefined || this.endPos === undefined) {
			return undefined;
		}
		return {
			action: ChangeAction.REPLACE,
			start: this.startPos,
			end: this.endPos,
			value: this.#value,
		};
	}
}
