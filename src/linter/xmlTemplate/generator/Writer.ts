import {encode, SourceMapMappings, SourceMapSegment} from "@jridgewell/sourcemap-codec";
import {EncodedSourceMap} from "@jridgewell/trace-mapping";
import {Position} from "../xmlNodes.js";
const NL = "\n";

interface Mapping {
	generated: Position;
	original: Position;
}

export default class Writer {
	#buf = "";
	// #map: GenMapping;
	#mappings = new Set<Mapping>();
	lineOffset = 0;
	columnOffset = 0;
	#sourceName: string;
	#targetName: string;

	constructor(targetName: string, sourceName: string) {
		// this.#map = new GenMapping({
		// 	file: targetName,
		// });
		this.#targetName = targetName;
		this.#sourceName = sourceName;
	}

	write(str: string, start?: Position, end?: Position) {
		if (str === null || str === "") {
			return;
		}
		if (start) {
			this.#addMapping(start);
		}

		const strSplit = str.split(NL);
		this.lineOffset += strSplit.length - 1;
		this.columnOffset += strSplit[strSplit.length - 1].length;
		this.#buf += str;

		if (end) {
			this.#addMapping(end);
		}
	}

	writeln(str: string, start?: Position, end?: Position) {
		this.write(str, start, end);
		this.#buf += NL;
		this.lineOffset += 1;
		this.columnOffset = 0;
	}

	// ln version only so we don't need to worry about the column offset
	prependln(str: string, start?: Position, end?: Position) {
		const strSplit = str.split(NL);
		const lineOffset = strSplit.length - 1;
		const columnOffset = strSplit[strSplit.length - 1].length;

		this.#shiftMappings(lineOffset + 1); // Adding one for the additional new line we'll be adding

		if (start) {
			this.#addMapping(start, {
				line: 0,
				column: 0,
			});
		}

		this.lineOffset += lineOffset + 1; // Adding one for the additional new line
		this.#buf = str + NL + this.#buf;

		if (end) {
			this.#addMapping(end, {
				line: lineOffset,
				column: columnOffset,
			});
		}
	}

	getString() {
		return this.#buf;
	}

	/**
	 * Generate the final source map for the generated code.
	 *
	 * Important notes:
	 * * Default aggregations will be mapped to the control that started it
	 */
	getSourceMap(): EncodedSourceMap {
		const mappings: SourceMapMappings = [];
		this.#mappings.forEach((mapping) => {
			let missingLineMappings = mapping.generated.line - mappings.length + 1;
			if (missingLineMappings > 0) {
				while (missingLineMappings--) {
					mappings.push([]);
				}
			}
			// [generatedColumn, sourceIndex, sourceLine, sourceColumn, nameIndex]
			const segment: SourceMapSegment = [
				mapping.generated.column,
				0,
				mapping.original.line,
				mapping.original.column,
			];
			mappings[mapping.generated.line].push(segment);
		});

		return {
			version: 3,
			names: [],
			file: this.#targetName,
			sources: [this.#sourceName],
			mappings: encode(mappings),
		};
	}

	getLength() {
		return this.#buf.length;
	}

	#addMapping(sourcePos: Position, targetPos?: Position) {
		this.#mappings.add({
			generated: targetPos ?? {
				line: this.lineOffset,
				column: this.columnOffset,
			},
			original: sourcePos,
		});
	}

	#shiftMappings(offset: number) {
		// Add offset to all mappings
		this.#mappings.forEach((mapping) => {
			mapping.generated.line += offset;
		});
	}
}
