/*
 * This is a modified copy of the sap/base/security/encodeXML.js module from OpenUI5
 * https://github.com/UI5/openui5/blob/1794b121ecc986fcfeb59648d0270963aced36ac/src/sap.ui.core/src/sap/base/security/encodeXML.js
 */

/*
 * Encoding according to the Secure Programming Guide
 */

/**
 * Encodes XML / HTML strings to prevent XSS exploits.
 * Use this method as Tagged Template Literal syntax:
 * @example const encoded = encodeXML`<div>${userInput}</div>`;
 * @returns string
 */
export default function encodeXML(strings: TemplateStringsArray, ...values: string[]): string {
	return strings.reduce((result, str, i) => {
		const escapedValue = values[i] ? values[i].replace(rHtml, fnHtml) : "";
		return result + str + escapedValue;
	}, "");
};

/**
 * RegExp and escape function for HTML escaping
 */
/* eslint-disable no-control-regex -- special characters are really needed here! */
const rHtml = /[\x00-\x2b\x2f\x3a-\x40\x5b-\x5e\x60\x7b-\xff\u2028\u2029]/g,
	rHtmlReplace = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/,
	mHtmlLookup: Record<string, string> = {
		"<": "&lt;",
		">": "&gt;",
		"&": "&amp;",
		"\"": "&quot;",
	};

const fnHtml = function (sChar: string): string {
	// check if a property with the value of sChar as name exists in mHtmlLookup
	let sEncoded = mHtmlLookup[sChar];
	if (!sEncoded) {
		if (rHtmlReplace.test(sChar)) {
			sEncoded = "&#xfffd;";
		} else {
			sEncoded = "&#x" + sChar.charCodeAt(0).toString(16) + ";";
		}
		mHtmlLookup[sChar] = sEncoded;
	}
	return sEncoded;
};
