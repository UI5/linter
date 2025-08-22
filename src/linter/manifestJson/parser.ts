import type {
	SAPJSONSchemaForWebApplicationManifestFile,
} from "../../manifest.d.ts";
import jsonMap from "json-source-map";

interface locType {
	line: number;
	column: number;
	pos: number;
}

interface JsonMapPointerLocation {
	key: locType;
	keyEnd: locType;
	value: locType;
	valueEnd: locType;
}

export type jsonMapPointers = Record<string, JsonMapPointerLocation>;

export interface jsonSourceMapType {
	data: SAPJSONSchemaForWebApplicationManifestFile;
	pointers: jsonMapPointers;
}

export function parseManifest(manifest: string): jsonSourceMapType {
	return jsonMap.parse<jsonSourceMapType>(manifest);
}

function findAdjacentPropertyPointer(
	pointers: jsonMapPointers,
	targetPointer: JsonMapPointerLocation,
	targetKey: string,
	direction: "previous" | "next"
): JsonMapPointerLocation | undefined {
	const parentKey = targetKey.substring(0, targetKey.lastIndexOf("/") + 1);
	const targetPos = targetPointer.value.pos;
	let bestPointer: JsonMapPointerLocation | undefined;
	let bestPos = direction === "previous" ? -1 : Infinity;

	for (const [key, pointer] of Object.entries(pointers)) {
		if (key === targetKey) {
			continue; // Skip the target key itself
		}
		if (!key.startsWith(parentKey)) {
			continue; // Skip keys that are not direct children of the same parent
		}
		// Check if it's a sibling property (same parent, no additional nesting)
		const keyWithoutParent = key.substring(parentKey.length);
		if (keyWithoutParent.includes("/")) {
			continue; // Skip nested properties
		}
		if (
			(direction === "previous" && pointer.value.pos < targetPos && pointer.value.pos > bestPos) ||
			(direction === "next" && pointer.value.pos > targetPos && pointer.value.pos < bestPos)
		) {
			bestPos = pointer.value.pos;
			bestPointer = pointer;
		}
	}

	return bestPointer;
}

export function getPreviousPropertyPointer(
	pointers: jsonMapPointers, targetPointer: JsonMapPointerLocation, targetKey: string
): JsonMapPointerLocation | undefined {
	return findAdjacentPropertyPointer(pointers, targetPointer, targetKey, "previous");
}

export function getNextPropertyPointer(
	pointers: jsonMapPointers, targetPointer: JsonMapPointerLocation, targetKey: string
): JsonMapPointerLocation | undefined {
	return findAdjacentPropertyPointer(pointers, targetPointer, targetKey, "next");
}
