import LinterContext from "../LinterContext.js";
import {deprecatedLibraries} from "../../utils/deprecations.js";
import {SaxEventType, Tag as SaxTag} from "sax-wasm";
import {parseXml} from "../../utils/xmlParser.js";
import {ReadStream} from "node:fs";
import {MESSAGE} from "../messages.js";

export default class DotLibraryLinter {
	#contentStream;
	#resourcePath;
	#context: LinterContext;

	constructor(resourcePath: string, contentStream: ReadStream, context: LinterContext) {
		this.#contentStream = contentStream;
		this.#resourcePath = resourcePath;
		this.#context = context;
	}

	async lint() {
		try {
			const dotLibraryDependencyTags = await this.#parseDotLibrary(this.#contentStream);
			this.#analyzeDeprecatedLibs(dotLibraryDependencyTags);
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			this.#context.addLintingMessage(this.#resourcePath, {id: MESSAGE.PARSING_ERROR, args: {message}});
		}
	}

	async #parseDotLibrary(contentStream: ReadStream): Promise<Iterable<SaxTag>> {
		const libs = new Set();
		const tagsStack: string[] = [];
		const libNamePath = ["library", "dependencies", "dependency"];
		await parseXml(contentStream, (event, tag) => {
			const saxTag = tag as SaxTag;
			if (!saxTag.selfClosing && event === SaxEventType.OpenTag) {
				tagsStack.push(saxTag.name);
				return;
			}
			tagsStack.pop();

			if (saxTag.name === "libraryName") {
				const isMatchingPath = libNamePath.length === tagsStack.length &&
					libNamePath.every((lib, index) => lib === tagsStack[index]);
				if (isMatchingPath) {
					libs.add(saxTag);
				}
			}
		}, SaxEventType.OpenTag | SaxEventType.CloseTag);
		// Prefer iterators to avoid eager consumption and an unnecessary array
		return libs.values() as Iterable<SaxTag>;
	}

	#analyzeDeprecatedLibs(libs: Iterable<SaxTag>) {
		// Check for deprecated libraries
		for (const lib of libs) {
			const libraryName = lib.textNodes[0]?.value;

			if (!deprecatedLibraries.includes(libraryName)) {
				continue;
			}
			this.#context.addLintingMessage(
				this.#resourcePath,
				{
					id: MESSAGE.DEPRECATED_LIBRARY,
					args: {libraryName},
					position: {
						line: lib.openStart.line + 1,
						column: lib.openStart.character + 1,
					},
				}
			);
		}
	}
}
