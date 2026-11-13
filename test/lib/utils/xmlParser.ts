import test from "ava";
import {parseXml} from "../../../src/utils/xmlParser.js";
import {ReadStream} from "node:fs";
import {Readable} from "node:stream";
import {SaxEventType, Tag as SaxTag} from "sax-wasm";

test("Test xmlParser with .library", async (t) => {
	const sampleDotLibrary = `<?xml version="1.0" ?>
<library xmlns="http://www.sap.com/sap.ui.library.xsd">
	<name>library.with.custom.paths</name>
	<vendor>SAP SE</vendor>
	<version>1.0</version>
	<copyright>any</copyright>
	<dependencies>
		<dependency>
			<libraryName>sap.ui.core</libraryName>
		</dependency>
		<dependency>
			<libraryName>sap.ca.scfld.md</libraryName>
		</dependency>
		<dependency>
			<libraryName>sap.ca.scfld.md</libraryName>
		</dependency>
		<dependency>
			<libraryName>sap.ca.ui</libraryName>
		</dependency>
	</dependencies>
</library>`;

	// Convert raw .library content into stream
	const contentStream = new Readable() as ReadStream;
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	contentStream._read = () => {};
	contentStream.push(sampleDotLibrary);
	contentStream.push(null);

	// Call SAXParser with the contentStream
	const libs: SaxTag[] = [];
	await parseXml(contentStream, (_, tag) => {
		const saxTag = tag as SaxTag;
		if (saxTag.value === "libraryName") {
			libs.push(saxTag);
		}
	}, SaxEventType.CloseTag);

	// Test parsed results
	t.is(libs.length, 4, "Parsed .library XML should contain 4 libraries");
	t.is(libs[0].textNodes[0].value, "sap.ui.core", "First library should be 'sap.ui.core'");
});
