import type {
	SAPJSONSchemaForWebApplicationManifestFile,
} from "../../manifest.d.ts";
import jsonMap from "json-source-map";

interface locType {
	line: number;
	column: number;
	pos: number;
}

export type jsonMapPointers = Record<string, {key: locType; keyEnd: locType; value: locType; valueEnd: locType}>;

export interface jsonSourceMapType {
	data: SAPJSONSchemaForWebApplicationManifestFile;
	pointers: jsonMapPointers;
}

export function parseManifest(manifest: string): jsonSourceMapType {
	return jsonMap.parse<jsonSourceMapType>(manifest);
}
