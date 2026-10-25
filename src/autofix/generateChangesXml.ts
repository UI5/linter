import {Resource} from "@ui5/fs";
import {Position, SaxEventType, Tag} from "sax-wasm";
import {parseXml} from "../utils/xmlParser.js";
import Fix from "../linter/ui5Types/fix/Fix.js";
import XmlEnabledFix from "../linter/ui5Types/fix/XmlEnabledFix.js";
import {RawLintMessage} from "../linter/LinterContext.js";
import {ChangeSet} from "../utils/textChanges.js";
import {removeConflictingFixes} from "./utils.js";
// import {getLogger} from "@ui5/logger";

// const log = getLogger("linter:autofix:generateChangesXml");

interface NodeSearchInfo {
	position: Position;
	fix: XmlEnabledFix;
	xmlEventTypes: number;
}

export default async function generateChangesXml(
	messages: RawLintMessage[],
	changeSets: ChangeSet[], content: string, resource: Resource) {
	const lines = content.split("\n");

	const nodeSearchInfo = new Set<NodeSearchInfo>();

	// Collect all fixes from the messages
	for (const {fix} of messages) {
		if (!fix || !(fix instanceof XmlEnabledFix)) {
			continue;
		}
		// Map "position for search" (calculated from the transpiled AST using the source map) to the absolute
		// position in the XML file
		const {position: fixStart, xmlEventTypes = 0} = fix.getNodeSearchParameters();
		if (!xmlEventTypes) {
			throw new Error(`Fix ${fix.constructor.name} does not provide xmlEventTypes for autofix`);
		}

		nodeSearchInfo.add({
			fix,
			xmlEventTypes,
			position: {
				line: fixStart.line - 1, // Convert to 0-based line
				character: fixStart.column - 1, // Convert to 0-based column
			},
		});
	}

	const toPositionCallback = function (pos: Position) {
		return toPosition(pos, lines);
	};

	const matchedFixes = new Set<Fix>();
	await parseXml(resource.getStream(), (_, data) => {
		const tag = data as Tag;
		for (const nodeInfo of nodeSearchInfo) {
			const {position, fix, xmlEventTypes} = nodeInfo;
			if (xmlEventTypes & SaxEventType.Attribute) {
				tag.attributes.forEach((attr) => {
					if (attr.name.start.line === position.line && attr.name.start.character === position.character &&
						fix.visitAutofixXmlNode(attr, toPositionCallback)) {
						matchedFixes.add(fix);
						nodeSearchInfo.delete(nodeInfo);
					}
				});
			}
			if (xmlEventTypes & SaxEventType.OpenTag &&
				tag.openStart.line === position.line &&
				tag.openStart.character === position.character) {
				fix.visitAutofixXmlNode(tag, toPositionCallback);
			}
		}
	}, SaxEventType.OpenTag); // The OpenTag event contains all Attributes in the yielded data

	removeConflictingFixes(matchedFixes);

	// TBD: Collect dependencies etc.

	for (const fix of matchedFixes) {
		const changes = fix.generateChanges?.();
		if (Array.isArray(changes)) {
			for (const change of changes) {
				changeSets.push(change);
			}
		} else if (changes) {
			changeSets.push(changes);
		}
	}
}

export function toPosition(position: Position, lines: string[]) {
	let pos: number;
	if (position.line === 0) {
		pos = position.character;
	} else {
		pos = 0;
		for (let i = 0; i < position.line; i++) {
			pos += lines[i].length + 1; // +1 for the newline character we used to split the lines with
		}
		pos += position.character;
	}
	return pos;
}
