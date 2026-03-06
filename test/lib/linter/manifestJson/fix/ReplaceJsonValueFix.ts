import test, {ExecutionContext} from "ava";
import jsonMap from "json-source-map";
import type {Pointers} from "json-source-map";
import ReplaceJsonValueFix from "../../../../../src/linter/manifestJson/fix/ReplaceJsonValueFix.js";
import {applyChanges} from "../../../../../src/utils/textChanges.js";

interface AssertValueReplaceOptions {
	source: string;
	replaceKey: string;
	value: string;
	expected: string;
}

function assertValueReplacement(
	t: ExecutionContext, {source, replaceKey, value, expected}: AssertValueReplaceOptions
) {
	const {pointers} = jsonMap.parse(source);
	const fix = new ReplaceJsonValueFix({key: replaceKey, pointers, value});

	let changes = fix.generateChanges() ?? [];
	if (!Array.isArray(changes)) {
		changes = [changes];
	}

	const output = applyChanges(source, changes);
	t.is(output, expected);
	t.notThrows(() => JSON.parse(output), "Output should be valid JSON");
}

test("Should replace simple property value", (t) => {
	assertValueReplacement(t, {
		source: `{ "text": "Hello World" }`,
		replaceKey: "/text",
		value: "Updated",
		expected: `{ "text": "Updated" }`,
	});
});

test("Should replace nested property value", (t) => {
	assertValueReplacement(t, {
		source: `{
			"settings": {
				"text": "Hello World"
			}
		}`,
		replaceKey: "/settings/text",
		value: "Updated",
		expected: `{
			"settings": {
				"text": "Updated"
			}
		}`,
	});
});

test("Should replace value with leading slash", (t) => {
	assertValueReplacement(t, {
		source: `{ "uri": "/sap/opu/odata/sap/ZMY_SRV/" }`,
		replaceKey: "/uri",
		value: "sap/opu/odata/sap/ZMY_SRV/",
		expected: `{ "uri": "sap/opu/odata/sap/ZMY_SRV/" }`,
	});
});

test("Should replace value with escaped content", (t) => {
	assertValueReplacement(t, {
		source: `{ "text": "Hello World" }`,
		replaceKey: "/text",
		value: "Line 1\nLine 2",
		expected: `{ "text": "Line 1\\nLine 2" }`,
	});
});

test("Should throw when pointer does not exist", (t) => {
	const {pointers} = jsonMap.parse(`{ "text": "Hello World" }`);
	t.throws(() => {
		new ReplaceJsonValueFix({key: "/missing", pointers, value: "Updated"});
	}, {message: "Cannot find JSON pointer: '/missing'"});
});

test("Should throw when pointer has no value", (t) => {
	const pointers = {
		"/text": {
			key: {line: 0, column: 0, pos: 0},
			keyEnd: {line: 0, column: 0, pos: 0},
			value: undefined,
			valueEnd: undefined,
		},
	} as unknown as Pointers;

	t.throws(() => {
		new ReplaceJsonValueFix({key: "/text", pointers, value: "Updated"});
	}, {message: "Cannot replace non-value pointer: '/text'"});
});

test("Should return undefined when positions are missing", (t) => {
	const {pointers} = jsonMap.parse(`{ "text": "Hello World" }`);
	const fix = new ReplaceJsonValueFix({key: "/text", pointers, value: "Updated"});
	fix.startPos = undefined;
	fix.endPos = undefined;

	t.is(fix.generateChanges(), undefined);
});
