import type {jsonSourceMapType, jsonMapPointers} from "./parser.js";
import LinterContext, {
	CoverageInfo, PositionInfo, ResourcePath,
} from "../LinterContext.js";
import {MESSAGE} from "../messages.js";
import {MessageArgs} from "../MessageArgs.js";

interface ReporterCoverageInfo extends CoverageInfo {
	node: string;
}

export default class ManifestReporter {
	#resourcePath: ResourcePath;
	#pointers: jsonMapPointers;
	#context: LinterContext;

	constructor(resourcePath: ResourcePath, context: LinterContext, manifest: jsonSourceMapType) {
		this.#resourcePath = resourcePath;
		this.#pointers = manifest.pointers;
		this.#context = context;
	}

	addMessage<M extends MESSAGE>(id: M, args: MessageArgs[M], node: string): void;
	addMessage<M extends MESSAGE>(id: M, node: string): void;
	addMessage<M extends MESSAGE>(
		id: M, argsOrNode?: MessageArgs[M] | string, node?: string
	) {
		if (!argsOrNode) {
			throw new Error("Invalid arguments: Missing second argument");
		}
		let args: MessageArgs[M];
		if (typeof argsOrNode === "string") {
			node = argsOrNode;
			args = null as unknown as MessageArgs[M];
		} else if (!node) {
			throw new Error("Invalid arguments: Missing 'node'");
		} else {
			args = argsOrNode;
		}

		this.#context.addLintingMessage(this.#resourcePath, {id, args, position: this.#getPosition(node)});
	}

	addCoverageInfo({node, message, category}: ReporterCoverageInfo) {
		const location = this.#getPositionsForNode(node);
		this.#context.addCoverageInfo(this.#resourcePath, {
			category,
			// One-based to be aligned with most IDEs
			line: location.key.line,
			column: location.key.column,
			endLine: location.valueEnd.line,
			endColumn: location.valueEnd.column,
			message,
		});
	}

	#getPositionsForNode(path: string) {
		const location = this.#pointers[path];

		return location || {key: 1, keyEnd: 1, value: 1, valueEnd: 1};
	}

	#getPosition(path: string): PositionInfo {
		let line = 1;
		let column = 1;

		const location = this.#pointers[path];

		if (location) {
			line = location.key.line + 1;
			column = location.key.column + 1;
		}

		return {
			line,
			column,
		};
	}
}
