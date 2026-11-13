import test from "ava";
import {ReadStream} from "node:fs";
import {Readable} from "node:stream";
import LinterContext from "../../../../src/linter/LinterContext.js";
import DotLibraryLinter from "../../../../src/linter/dotLibrary/DotLibraryLinter.js";

async function lintDotLibrary(chunks: string[]) {
	const resourcePath = "/.library";
	const context = new LinterContext({rootDir: "/"});
	// Buffer chunks preserve the write boundaries seen by the SAX parser.
	const stream = Readable.from(chunks.map((chunk) => Buffer.from(chunk))) as ReadStream;
	await new DotLibraryLinter(resourcePath, stream, context).lint();
	return context.generateLintResult(resourcePath).messages;
}

test.serial("Deprecated library findings are preserved across stream chunks", async (t) => {
	const chunks = [
		`<library><dependencies>
<dependency><libraryName>sap.ui.commons</libraryName></dependency>`,
		`<dependency><libraryName>sap.ui.core</libraryName></dependency></dependencies></library>`,
	];
	const singleChunkMessages = await lintDotLibrary([chunks.join("")]);
	t.is(singleChunkMessages.length, 1);
	t.is(singleChunkMessages[0].ruleId, "no-deprecated-library");
	t.is(singleChunkMessages[0].message, "Use of deprecated library 'sap.ui.commons'");

	// The deprecated library's tag must remain readable after subsequent parser writes.
	const multipleChunkMessages = await lintDotLibrary(chunks);
	t.deepEqual(multipleChunkMessages, singleChunkMessages);
});
