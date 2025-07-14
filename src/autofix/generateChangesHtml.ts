import {HtmlFix} from "../linter/html/fix/HtmlFix.js";
import {RawLintMessage} from "../linter/LinterContext.js";
import {ChangeSet} from "./autofix.js";
import {toPosition} from "./generateChangesXml.js";
import {Position} from "sax-wasm";

export default function generateChangesXml(
	messages: RawLintMessage[],
	changeSets: ChangeSet[], content: string
) {
	const lines = content.split("\n");
	const toPositionCallback = function (pos: Position) {
		return toPosition(pos, lines);
	};

	// Process each message that has a fix
	for (const {fix} of messages) {
		if (!(fix instanceof HtmlFix)) {
			continue; // Skip messages without fix or with non-HTML fix
		}

		// Allow the fix to calculate its source code range, based on the line/column positions
		fix.calculateSourceCodeRange(toPositionCallback);

		const changes = fix.generateChanges?.();
		if (changes) {
			if (Array.isArray(changes)) {
				changeSets.push(...changes);
			} else {
				changeSets.push(changes);
			}
		}
	}
}
