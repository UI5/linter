// This file is a modified copy of parts of ui5-builder/lib/processors/jsdoc/lib/transformApiJson.cjs
// Its purpose is to try to resolve links in lint messages, derived from JSDoc annotations.

function JSDocUtil():
{formatTextBlock: (src: string, linkFormatter: (target: string, text: string) => string) => string} {
	function format(src: string, linkFormatter: (target: string, text: string) => string): string {
		/*
		 * regexp to recognize important places in the text
		 *
		 * Capturing groups of the RegExp:
		 *   group 1: begin of a pre block
		 *   group 2: end of a pre block
		 *   group 3: begin of a header, implicitly ends a paragraph
		 *   group 4: end of a header, implicitly starts a new paragraph
		 *   group 5: target portion of an inline @link tag
		 *   group 6: (optional) text portion of an inline link tag
		 *   group 7: an empty line which implicitly starts a new paragraph
		 *
		 *      [-- <pre> block -] [---- some header ----] [---- an inline [@link ...} tag ----]
		 *      [---------- an empty line ---------]
		 */
		const r =
			/(<pre>)|(<\/pre>)|(<h[\d+]>)|(<\/h[\d+]>)|\{@link\s+([^}\s]+)(?:\s+([^}]*))?\}|((?:\r\n|\r|\n)[ \t]*(?:\r\n|\r|\n))/gi;
		let inpre = false;
		src = src || "";
		src = src.replace(r, function (match, pre, endpre, header, endheader, linkTarget: string, linkText: string) {
			if (pre) {
				inpre = true;
			} else if (endpre) {
				inpre = false;
			}
			if (linkTarget) {
				if (!inpre) {
					return linkFormatter(linkTarget, linkText);
				}
			}
			return match;
		}
		);
		return src;
	}
	return {
		formatTextBlock: format,
	};
}

function formatUrlToLink(sTarget: string, sText: string): string {
	return `${sText} (${sTarget})`;
}

function createLink({name, type, className, text = name, hrefAppend = "", ui5Url}:
Record<string, string>): string {
	let sLink;
	// handling module's
	if (
		className !== undefined &&
		(name.startsWith("module:") || className.startsWith("module:"))
	) {
		name = name.replace(/^module:/, "");
	}
	// Build the link
	// Replace # with its encoded value "%23", as some browsers might not escape it
	sLink = type ? `${className}%23${type}/${name}` : name;
	if (hrefAppend) {
		sLink += hrefAppend;
	}
	return `${text} (${ui5Url}/api/${sLink})`;
}

function _preProcessLinksInTextBlock(sText: string, ui5Url: string, ui5Version: string): string {
	const linkFormatter = function (sTarget: string, sText: string): string {
		let aMatch;
		// keep the full target in the fallback text
		sText = sText || sTarget;

		if (sTarget === "module" && sText.startsWith(":")) {
			const textChunks = sText.split(" ");
			sTarget += textChunks[0];
			sText = textChunks[1] || textChunks[0].substring(1);
		} else if (sTarget === "topic" && sText.startsWith(":")) {
			sTarget += sText.split(" ")[0];
			sText = sText.split(" ").slice(1).join(" ");
		}

		// If the link has a protocol, do not modify, but open in a new window
		if (/:\/\//.test(sTarget)) {
			return formatUrlToLink(sTarget, sText);
		}
		// topic:xxx Topic
		aMatch = sTarget.match(
			/^topic:(\w{32}(?:#\w*)?(?:\/\w*)?)$/
		);
		if (aMatch) {
			return formatUrlToLink(`${ui5Url}/#/topic/${aMatch[1]}`, sText);
		}
		// demo:xxx Demo, open the demonstration page in a new window
		aMatch = sTarget.match(/^demo:([a-zA-Z0-9/.]*)$/);
		if (aMatch) {
			return formatUrlToLink(`${ui5Url}/${ui5Version}/#/test-resources/${aMatch[1]}`, sText);
		}
		// sap.x.Xxx.prototype.xxx - In case of prototype we have a link to method
		aMatch = sTarget.match(
			/([a-zA-Z0-9.$_]+?)\.prototype\.([a-zA-Z0-9.$_]+)$/
		);
		if (aMatch) {
			return createLink({
				name: aMatch[2],
				type: "methods",
				className: aMatch[1],
				text: sText,
				ui5Url: `${ui5Url}/${ui5Version}/#`,
			});
		}
		// Heuristics: Extend is always a static method
		// sap.x.Xxx.extend
		// module:sap/x/Xxx.extend
		aMatch = sTarget.match(
			/^(module:)?([a-zA-Z0-9.$_/]+?)\.extend$/
		);
		if (aMatch) {
			const [, sModule, sClass] = aMatch;
			return createLink({
				name: sTarget.replace(/^module:/, ""),
				type: "methods",
				className: (sModule ? sModule : "") + sClass,
				text: sText,
				ui5Url: `${ui5Url}/${ui5Version}/#`,
			});
		}
		// Constructor links are handled in special manner by the SDK
		// sap.x.Xxx.constructor
		// sap.x.Xxx#constructor
		// module:sap/x/Xxx.constructor
		// #constructor
		aMatch = sTarget.match(
			/^(module:)?([a-zA-Z0-9.$_/]+?)?[.#]constructor$/i
		);
		if (aMatch) {
			const [, sModule, sClass] = aMatch;
			let sName = "";
			if (sClass) {
				sName = (sModule ? sModule : "") + sClass;
			}
			return createLink({
				name: sName,
				hrefAppend: "#constructor",
				text: sText,
				ui5Url: `${ui5Url}/${ui5Version}/#`,
			});
		}
		// #.setText - local static method
		// #setText - local instance method
		// #.setText.from - local nested method
		aMatch = sTarget.match(/^#(\.)?([a-zA-Z0-9.$_]+)$/);
		if (aMatch) {
			return createLink({
				name: aMatch[2],
				type: "methods",
				className: "",
				text: sText,
				ui5Url: `${ui5Url}/${ui5Version}/#`,
			});
		}
		// #annotation:TextArrangement - local annotation
		aMatch = sTarget.match(/^#annotation:([a-zA-Z0-9$_]+)$/);
		if (aMatch) {
			return createLink({
				name: aMatch[1],
				type: "annotations",
				className: "",
				text: sText,
				ui5Url: `${ui5Url}/${ui5Version}/#`,
			});
		}
		// Annotation links
		// sap.ui.comp.smartfield.SmartField#annotation:TextArrangement
		// sap.ui.comp.smartfield.SmartField.annotation:TextArrangement
		// module:sap/ui/comp/smartfield/SmartField.annotation:TextArrangement
		// module:sap/ui/comp/smartfield/SmartField#annotation:TextArrangement
		aMatch = sTarget.match(
			/^(module:)?([a-zA-Z0-9.$_/]+?)[.#]annotation:([a-zA-Z0-9$_]+)$/
		);
		if (aMatch) {
			const [, sModule, sClass, sAnnotation] = aMatch;
			return createLink({
				name: sAnnotation,
				type: "annotations",
				className: (sModule ? sModule : "") + sClass,
				text: sText,
				ui5Url: `${ui5Url}/${ui5Version}/#`,
			});
		}
		// #event:press - local event
		aMatch = sTarget.match(/^#event:([a-zA-Z0-9$_]+)$/);
		if (aMatch) {
			return createLink({
				name: aMatch[1],
				type: "events",
				className: "",
				text: sText,
				ui5Url: `${ui5Url}/${ui5Version}/#`,
			});
		}
		// Event links
		// sap.m.Button#event:press
		// sap.m.Button.event:press
		// module:sap/m/Button.event:press
		// module:sap/m/Button#event:press
		aMatch = sTarget.match(
			/^(module:)?([a-zA-Z0-9.$_/]+?)[.#]event:([a-zA-Z0-9$_]+)$/
		);
		if (aMatch) {
			const [, sModule, sClass, sEvent] = aMatch;
			return createLink({
				name: sEvent,
				type: "events",
				className: (sModule ? sModule : "") + sClass,
				text: sText,
				ui5Url: `${ui5Url}/${ui5Version}/#`,
			});
		}
		// sap.m.Button#setText - instance method
		// module:sap/m/Button#setText
		aMatch = sTarget.match(
			/^(module:)?([a-zA-Z0-9.$_/]+)#([a-zA-Z0-9.$_]+)$/
		);
		if (aMatch) {
			const [, sModule, sClass, sMethod] = aMatch;
			return createLink({
				name: sMethod,
				type: "methods",
				className: (sModule ? sModule : "") + sClass,
				text: sText,
				ui5Url: `${ui5Url}/${ui5Version}/#`,
			});
		}
		// module:sap/m/Button.setText
		aMatch = sTarget.match(
			/^(module:)([a-zA-Z0-9.$_/]+)\.([a-zA-Z0-9.$_]+)$/
		);
		if (aMatch) {
			const [, sModule, sClass, sMethod] = aMatch;
			return createLink({
				name: `${sClass}.${sMethod}`,
				type: "methods",
				className: (sModule ? sModule : "") + sClass,
				text: sText,
				ui5Url: `${ui5Url}/${ui5Version}/#`,
			});
		}

		const aTarget = sTarget.split(".");
		if (aTarget.length >= 3) {
			const constructorName = aTarget.find((el) => el.toLowerCase() !== el);
			let index = aTarget.indexOf(constructorName ?? "");
			index = (index === -1) ? aTarget.length : (index + 1);
			// Lacking of complimentary information for the type, then construct the
			// link to the class name, so the user could find the information on their own.
			return createLink({
				name: aTarget.slice(0, index).join("."),
				text: sText,
				ui5Url: `${ui5Url}/${ui5Version}/#`,
			});
		}

		// Possible forward reference - we will treat them as symbol link
		return createLink({name: sTarget, text: sText, ui5Url: `${ui5Url}/${ui5Version}/#`});
	};

	return JSDocUtil().formatTextBlock(sText, linkFormatter);
}

export function resolveLinks(description?: string, ui5Url = "https://ui5.sap.com", ui5Version = "1.136"): string {
	if (!description) {
		return "";
	}

	return _preProcessLinksInTextBlock(description, ui5Url, ui5Version);
}
