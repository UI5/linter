import {Readable} from "node:stream";
import {SaxEventType, SAXParser, Tag, Text} from "sax-wasm";
import {finished} from "node:stream/promises";
import fs from "node:fs/promises";
import {createRequire} from "node:module";
import {Directive} from "../linter/LinterContext.js";
const require = createRequire(import.meta.url);

export function isSaxParserToJSON(tag: unknown): tag is Tag {
	const tagAsSaxParserToJSON = tag as Tag;
	return !!tag &&
		Object.prototype.hasOwnProperty.call(tagAsSaxParserToJSON, "openStart") &&
		Object.prototype.hasOwnProperty.call(tagAsSaxParserToJSON, "openEnd") &&
		Object.prototype.hasOwnProperty.call(tagAsSaxParserToJSON, "closeStart") &&
		Object.prototype.hasOwnProperty.call(tagAsSaxParserToJSON, "closeEnd") &&
		Object.prototype.hasOwnProperty.call(tagAsSaxParserToJSON, "attributes") &&
		Object.prototype.hasOwnProperty.call(tagAsSaxParserToJSON, "textNodes");
}

export function isSaxText(tag: unknown): tag is Text {
	return !!tag &&
		Object.prototype.hasOwnProperty.call(tag, "start") &&
		Object.prototype.hasOwnProperty.call(tag, "end") &&
		Object.prototype.hasOwnProperty.call(tag, "value");
}

/* The following regex is derived from the multi-line variant defined in ui5types/directives.ts
	Note that this regex allows for double-hyphen comments, even though they are "not recommended" in XML and HTML as
	per the spec and might not be allowed in some parsers: https://www.w3.org/TR/REC-xml/#sec-comments
*/
const DIRECTIVE_REGEX = /\s*ui5lint-(enable|disable)(?:-((?:next-)?line))?(\s+(?:[\w-]+\s*,\s*)*(?:\s*[\w-]+))?\s*,?\s*(?:--[\s\S]*?)?$/;
export function extractDirective(comment: Text): Directive | undefined {
	if (!comment.value) {
		return;
	}
	const match = DIRECTIVE_REGEX.exec(comment.value);
	if (!match) {
		return;
	}
	const action = match[1] as Directive["action"];
	const scope = match[2] as Directive["scope"];
	const ruleNames = match[3]?.split(",").map((rule) => rule.trim()) ?? [];

	return {
		action,
		scope,
		ruleNames,
		line: comment.start.line + 1,
		column: comment.start.character + 1,
	};
}

let saxWasmBuffer: Buffer;
export async function initSaxWasm() {
	if (!saxWasmBuffer) {
		const saxPath = require.resolve("sax-wasm/lib/sax-wasm.wasm");
		saxWasmBuffer = await fs.readFile(saxPath);
	}

	return saxWasmBuffer;
}

export async function parseXml(
	contentStream: Readable, parseHandler: typeof SAXParser.prototype.eventHandler,
	events: number = SaxEventType.CloseTag | SaxEventType.OpenTag | SaxEventType.Comment) {
	const saxWasmBuffer = await initSaxWasm();
	const saxParser = new SAXParser(events);

	saxParser.eventHandler = parseHandler;

	// Instantiate and prepare the wasm for parsing
	if (!await saxParser.prepareWasm(saxWasmBuffer)) {
		throw new Error("Unknown error during WASM Initialization");
	}

	// Start the stream
	contentStream.on("data", (chunk: Uint8Array) => {
		try {
			saxParser.write(chunk);
		} catch (err) {
			if (err instanceof Error) {
				// In case of an error, destroy the content stream to make the
				// error bubble up to our callers
				contentStream.destroy(err);
			} else {
				throw err;
			}
		}
	});
	await finished(contentStream);
	saxParser.end();
}
