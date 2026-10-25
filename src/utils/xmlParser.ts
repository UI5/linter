import {Readable} from "node:stream";
import {SaxEventType, SAXParser, Tag, Text} from "sax-wasm";
import {finished} from "node:stream/promises";
import fs from "node:fs/promises";
import {createRequire} from "node:module";
import {Directive} from "../linter/LinterContext.js";
import {Semaphore} from "./Semaphore.js";
const require = createRequire(import.meta.url);

export function isSaxParserToJSON(tag: unknown): tag is Tag {
	return tag instanceof Tag;
}

export function isSaxText(tag: unknown): tag is Text {
	return tag instanceof Text;
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
const pool: SAXParser[] = [];

let saxWasmBuffer: Buffer;
export async function getPooledSAXParser(): Promise<SAXParser> {
	if (!saxWasmBuffer) {
		const saxPath = require.resolve("sax-wasm/lib/sax-wasm.wasm");
		saxWasmBuffer = await fs.readFile(saxPath);
	}

	if (pool.length) {
		return pool.pop()!;
	}
	const parser = new SAXParser();
	if (!await parser.prepareWasm(saxWasmBuffer)) {
		throw new Error("Unknown error during WASM Initialization");
	}
	return parser;
}

type Handler = typeof SAXParser.prototype.eventHandler;
// Higher limits perform better on XML only paths but worse on E2E.
// A limit of 2 strikes a reasonable balance.
const semaphore = new Semaphore(2);
export async function parseXml(contentStream: Readable, parseHandler: Handler, events?: number) {
	events ??= SaxEventType.CloseTag | SaxEventType.OpenTag | SaxEventType.Comment;
	using _ = await semaphore.acquireLease();
	const parser = await getPooledSAXParser();
	parser.events = events;

	const webStream = Readable.toWeb(contentStream) as ReadableStream<Uint8Array>;
	for await (const [event, detail] of parser.parse(webStream.getReader())) {
		parseHandler?.(event, detail);
	}

	await finished(contentStream);
	pool.push(parser);
}
