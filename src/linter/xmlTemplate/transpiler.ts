import {SaxEventType, Tag as SaxTag, Text as SaxText} from "sax-wasm";
import {ReadStream} from "node:fs";
import {taskStart} from "../../utils/perf.js";
import LinterContext, {TranspileResult} from "../LinterContext.js";
import Parser from "./Parser.js";
import {getLogger} from "@ui5/logger";
import {MESSAGE} from "../messages.js";
import {loadApiExtract, ApiExtract} from "../../utils/ApiExtract.js";
import ControllerByIdInfo from "./ControllerByIdInfo.js";
import {parseXml} from "../../utils/xmlParser.js";

const log = getLogger("linter:xmlTemplate:transpiler");

let apiExtract: ApiExtract;

export default async function transpileXml(
	resourcePath: string, contentStream: ReadStream, context: LinterContext, controllerByIdInfo: ControllerByIdInfo
): Promise<TranspileResult | undefined> {
	await init();
	try {
		const taskEnd = taskStart("Transpile XML", resourcePath, true);
		const res = await transpileXmlToJs(resourcePath, contentStream, context, controllerByIdInfo);
		taskEnd();
		if (!res.source) {
			log.verbose(`XML transpiler returned no result for ${resourcePath}`);
			return res;
		}
		return res;
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		context.addLintingMessage(resourcePath, MESSAGE.PARSING_ERROR, {message});
	}
}

let initializing: Promise<void>;
async function init() {
	// eslint-disable-next-line @typescript-eslint/no-misused-promises
	if (initializing) {
		return initializing;
	}
	const taskEnd = taskStart("XML Transpiler initialization");

	return initializing = loadApiExtract().then((apiExtractRes) => {
		apiExtract = apiExtractRes;
		taskEnd();
	});
}

async function transpileXmlToJs(
	resourcePath: string, contentStream: ReadStream, context: LinterContext, controllerByIdInfo: ControllerByIdInfo
): Promise<TranspileResult> {
	const parser = new Parser(resourcePath, apiExtract, context, controllerByIdInfo);

	await parseXml(contentStream, (event, data) => {
		if (data instanceof SaxTag) {
			if (event === SaxEventType.OpenTag) {
				parser.pushTag(data.toJSON() as SaxTag);
			} else if (event === SaxEventType.CloseTag) {
				parser.popTag(data.toJSON() as SaxTag);
			}
		} else if (data instanceof SaxText && event === SaxEventType.Comment) {
			parser.parseComment(data.toJSON() as SaxText);
		}
	});

	return parser.generate();
}
