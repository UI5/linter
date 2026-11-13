import test from "ava";
import {ReadStream} from "node:fs";
import {Readable} from "node:stream";
import LinterContext from "../../../../src/linter/LinterContext.js";
import transpileHtml from "../../../../src/linter/html/transpiler.js";

async function lintHtml(chunks: string[]) {
	const resourcePath = "/index.html";
	const context = new LinterContext({rootDir: "/"});
	// Buffer chunks preserve the write boundaries seen by the SAX parser.
	const stream = Readable.from(chunks.map((chunk) => Buffer.from(chunk))) as ReadStream;
	await transpileHtml(resourcePath, stream, context);
	return context.generateLintResult(resourcePath).messages;
}

test.serial("Bootstrap findings are preserved across stream chunks", async (t) => {
	const chunks = [
		`<html><head>
<script id="sap-ui-bootstrap" src="resources/sap-ui-core.js" data-sap-ui-theme="sap_bluecrystal"></script>`,
		`<script src="something-else.js"></script></head><body></body></html>`,
	];
	const singleChunkMessages = await lintHtml([chunks.join("")]);
	t.true(singleChunkMessages.some((message) => message.ruleId === "no-deprecated-theme"));

	// The bootstrap tag is retained while the next chunk overwrites SAX event memory.
	const multipleChunkMessages = await lintHtml(chunks);
	t.deepEqual(multipleChunkMessages, singleChunkMessages);
});

test.serial("Stylesheet findings are preserved across stream chunks", async (t) => {
	const chunks = [
		`<html><head>
<link rel="stylesheet" href="resources/sap/m/themes/sap_bluecrystal/library.css">`,
		`<script src="something-else.js"></script></head><body></body></html>`,
	];
	const singleChunkMessages = await lintHtml([chunks.join("")]);
	t.true(singleChunkMessages.some((message) => message.ruleId === "no-deprecated-theme"));

	const multipleChunkMessages = await lintHtml(chunks);
	t.deepEqual(multipleChunkMessages, singleChunkMessages);
});
