import LinterContext, {DirectiveAction, DirectiveScope} from "../LinterContext.js";
import {deprecatedLibraries, deprecatedThemeLibraries} from "../../utils/deprecations.js";
import {DataWithPosition, fromYaml, getPosition} from "data-with-position";
import {MESSAGE} from "../messages.js";

interface YamlWithPosInfo extends DataWithPosition {
	framework?: {
		libraries?: {
			name: string;
		}[];
	};
	positionKey?: {
		end: {
			column: number;
			line: number;
		};
		start: {
			column: number;
			line: number;
		};
	};
}
// This regex is derived from the single-line variant defined in ui5types/directives.ts
const DIRECTIVE_REGEX = /#\s*ui5lint-(enable|disable)(?:-((?:next-)?line))?([ \t]+(?:[\w-]+[ \t]*,[ \t]*)*(?:[ \t]*[\w-]+))?[ \t]*,?[ \t]*(?:--.*)?$/mg;

export default class YamlLinter {
	#content;
	#resourcePath;
	#context: LinterContext;

	constructor(resourcePath: string, content: string, context: LinterContext) {
		this.#content = content;
		this.#resourcePath = resourcePath;
		this.#context = context;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async lint() {
		try {
			// Split Yaml file into part documents by '---' separator
			const allDocuments: string[] = this.#content.split(/(?:\r\n|\r|\n)---/g);

			// Calculate the starting line number of each part document
			let lineNumberOffset = 0;
			allDocuments.forEach((document: string) => {
				// Parse content only of the current part
				const parsedYamlWithPosInfo: YamlWithPosInfo = this.#parseYaml(document);
				// Analyze part content with line number offset
				this.#analyzeYaml(parsedYamlWithPosInfo, lineNumberOffset);
				this.#collectDirectives(document, lineNumberOffset);

				// Update line number offset for next part
				lineNumberOffset += document.split(/\r\n|\r|\n/g).length;
			});
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			this.#context.addLintingMessage(this.#resourcePath, {id: MESSAGE.PARSING_ERROR, args: {message}});
		}
	}

	#parseYaml(content: string): YamlWithPosInfo {
		// Create JS object from YAML content with position information
		return fromYaml(content) as YamlWithPosInfo;
	}

	#analyzeYaml(yaml: YamlWithPosInfo, offset: number) {
		// Check for deprecated libraries
		yaml?.framework?.libraries?.forEach((lib) => {
			const libraryName = lib.name.toString();
			if (deprecatedLibraries.includes(libraryName) || deprecatedThemeLibraries.includes(libraryName)) {
				const positionInfo = getPosition(lib);
				this.#context.addLintingMessage(
					this.#resourcePath,
					{
						id: MESSAGE.DEPRECATED_LIBRARY,
						args: {
							libraryName,
						},
						position: {
							line: positionInfo.start.line + offset,
							column: positionInfo.start.column,
						},
					}
				);
			}
		});
	}

	#collectDirectives(content: string, offset: number) {
		const matches = content.matchAll(DIRECTIVE_REGEX);
		for (const match of matches) {
			const action = (match[1] ?? match[4]) as DirectiveAction;
			const scope = (match[2] ?? match[5]) as DirectiveScope;
			const rules = match[3] ?? match[6];

			let ruleNames = rules?.split(",") ?? [];
			ruleNames = ruleNames.map((rule) => rule.trim());

			// Determine line and column of match
			const left = content.slice(0, match.index);
			const line = (left.match(/\n/g) ?? []).length + 1 + offset;
			const lastIndexOf = left.lastIndexOf("\n") + 1;
			const column = match.index - lastIndexOf + 1;

			this.#context.addDirective(this.#resourcePath, {
				action,
				scope, ruleNames,
				line,
				column,
			});
		}
	}
}
