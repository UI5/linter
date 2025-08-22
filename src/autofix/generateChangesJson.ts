import {JsonFix} from "../linter/manifestJson/fix/JsonFix.js";
import {RawLintMessage} from "../linter/LinterContext.js";
import {ChangeSet} from "../utils/textChanges.js";

export default function generateChangesJson(
	messages: RawLintMessage[],
	changeSets: ChangeSet[]
) {
	// Process each message that has a fix
	for (const {fix} of messages) {
		if (!(fix instanceof JsonFix)) {
			continue; // Skip messages without fix or with non-JSON fix
		}

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
