import {Readable} from "node:stream";
import {SaxEventType, Tag as SaxTag, Text as SaxText} from "sax-wasm";
import {extractDirective, parseXml} from "../../utils/xmlParser.js";
import {Directive} from "../LinterContext.js";

interface ExtractedTags {
	scriptTags: SaxTag[];
	stylesheetLinkTags: SaxTag[];
}
function parseTag(event: SaxEventType, tag: SaxTag, extractedTags: ExtractedTags) {
	if (event === SaxEventType.OpenTag &&
		tag.name === "link") {
		if (tag.attributes.some((attr) => {
			return (attr.name.value === "rel" &&
				attr.value.value === "stylesheet");
		})) {
			extractedTags.stylesheetLinkTags.push(tag);
		};
	} else if (event === SaxEventType.CloseTag &&
		tag.name === "script") {
		const isJSScriptTag = tag.attributes.every((attr) => {
			// The "type" attribute of the script tag should be
			// 1. not set (default),
			// 2. an empty string,
			// 3. or a JavaScript MIME type (text/javascript)
			// https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type#attribute_is_not_set_default_an_empty_string_or_a_javascript_mime_type
			return attr.name.value !== "type" ||
				(attr.name.value === "type" &&
					["",
						"module",
						"text/javascript",
						"application/javascript", /* legacy */
					].includes(attr.value.value.toLowerCase()));
		});
		if (isJSScriptTag) {
			extractedTags.scriptTags.push(tag);
		}
	}
}

function parseComment(comment: SaxText, directives: Set<Directive>) {
	const directive = extractDirective(comment);
	if (directive) {
		directives.add(directive);
	}
}

export async function extractHTMLTags(contentStream: Readable) {
	const extractedTags: ExtractedTags = {
		scriptTags: [],
		stylesheetLinkTags: [],
	};
	const directives = new Set<Directive>();
	await parseXml(contentStream, (event, tag) => {
		if (tag instanceof SaxTag) {
			parseTag(event, tag.toJSON() as SaxTag, extractedTags);
		} else if (tag instanceof SaxText && event === SaxEventType.Comment) {
			parseComment(tag.toJSON() as SaxText, directives);
		}
	});
	return {extractedTags, directives};
}
