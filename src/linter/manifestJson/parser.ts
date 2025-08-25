import type {
	SAPJSONSchemaForWebApplicationManifestFile,
} from "../../manifest.d.ts";
import jsonMap, {Mapping, Pointers} from "json-source-map";

export interface jsonSourceMapType {
	data: SAPJSONSchemaForWebApplicationManifestFile;
	pointers: Pointers;
}

export function parseManifest(manifest: string) {
	const json = jsonMap.parse(manifest);
	const data = json.data as SAPJSONSchemaForWebApplicationManifestFile;
	const pointers = json.pointers;
	return {data, pointers};
}

function findAdjacentPropertyPointer(
	pointers: Pointers,
	targetPointer: Mapping,
	targetKey: string,
	direction: "previous" | "next"
) {
	const parentKey = targetKey.substring(0, targetKey.lastIndexOf("/") + 1);
	const targetPos = targetPointer.value.pos;
	let bestPointer: Mapping | undefined;
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
	pointers: Pointers, targetPointer: Mapping, targetKey: string
) {
	return findAdjacentPropertyPointer(pointers, targetPointer, targetKey, "previous");
}

export function getNextPropertyPointer(
	pointers: Pointers, targetPointer: Mapping, targetKey: string
) {
	return findAdjacentPropertyPointer(pointers, targetPointer, targetKey, "next");
}
