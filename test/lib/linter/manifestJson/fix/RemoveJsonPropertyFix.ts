import test, {ExecutionContext} from "ava";
import jsonMap from "json-source-map";
import RemoveJsonPropertyFix from "../../../../../src/linter/manifestJson/fix/RemoveJsonPropertyFix.js";
import {applyChanges} from "../../../../../src/utils/textChanges.js";

interface AssertPropertyRemovalOptions {
	source: string;
	removalKey: string;
	expected: string;
	removeEmptyDirectParent?: boolean;
}

function assertPropertyRemoval(
	t: ExecutionContext, {source, removalKey, expected, removeEmptyDirectParent}: AssertPropertyRemovalOptions
) {
	const {pointers} = jsonMap.parse(source);
	const fix = new RemoveJsonPropertyFix({key: removalKey, pointers: pointers, removeEmptyDirectParent});

	let changes = fix.generateChanges() ?? [];
	if (changes && !Array.isArray(changes)) {
		changes = [changes];
	}

	const output = applyChanges(source, changes);
	t.is(output, expected);
	t.notThrows(() => JSON.parse(output), "Output should be valid JSON");
}

test("Should remove property without adjacent properties", (t) => {
	assertPropertyRemoval(t, {
		source: `{ "text": "Hello World" }`,
		removalKey: "/text",
		expected: `{}`,
	});
});

test("Should remove property without adjacent properties (multi-line)", (t) => {
	assertPropertyRemoval(t, {
		source: `{
			"text": "Hello World"
		}`,
		removalKey: "/text",
		expected: `{}`,
	});
});

test("Should remove property with adjacent property before", (t) => {
	assertPropertyRemoval(t, {
		source: `{ "before": true, "text": "Hello World" }`,
		removalKey: "/text",
		expected: `{ "before": true }`,
	});
});

test("Should remove property with adjacent property before (multi-line)", (t) => {
	assertPropertyRemoval(t, {
		source: `{
			"before": true,
			"text": "Hello World"
		}`,
		removalKey: "/text",
		expected: `{
			"before": true
		}`,
	});
});

test("Should remove property with adjacent property after", (t) => {
	assertPropertyRemoval(t, {
		source: `{ "text": "Hello World", "after": true }`,
		removalKey: "/text",
		expected: `{ "after": true }`,
	});
});

test("Should remove property with adjacent property after (multi-line)", (t) => {
	assertPropertyRemoval(t, {
		source: `{
			"text": "Hello World",
			"after": true
		}`,
		removalKey: "/text",
		expected: `{
			"after": true
		}`,
	});
});

test("Should remove property with adjacent properties before/after", (t) => {
	assertPropertyRemoval(t, {
		source: `{ "before": true, "text": "Hello World", "after": true }`,
		removalKey: "/text",
		expected: `{ "before": true, "after": true }`,
	});
});

test("Should remove property with adjacent properties before/after (multi-line)", (t) => {
	assertPropertyRemoval(t, {
		source: `{
			"before": true,
			"text": "Hello World",
			"after": true
		}`,
		removalKey: "/text",
		expected: `{
			"before": true,
			"after": true
		}`,
	});
});

test("Should remove empty parent", (t) => {
	assertPropertyRemoval(t, {
		source: `{ "settings": { "text": "Hello World" } }`,
		removalKey: "/settings/text",
		expected: `{}`,
		removeEmptyDirectParent: true,
	});
});

test("Should remove empty parent (multi-line)", (t) => {
	assertPropertyRemoval(t, {
		source: `{
			"settings": {
				"text": "Hello World"
			}
		}`,
		removalKey: "/settings/text",
		expected: `{}`,
		removeEmptyDirectParent: true,
	});
});

test("Should only remove direct empty parent", (t) => {
	assertPropertyRemoval(t, {
		source: `{ "entry": { "settings": { "text": "Hello World" } } }`,
		removalKey: "/entry/settings/text",
		expected: `{ "entry": {} }`,
		removeEmptyDirectParent: true,
	});
});

test("Should only remove direct empty parent (multi-line)", (t) => {
	assertPropertyRemoval(t, {
		source: `{
			"entry": {
				"settings": {
					"text": "Hello World"
				}
			}
		}`,
		removalKey: "/entry/settings/text",
		expected: `{
			"entry": {}
		}`,
		removeEmptyDirectParent: true,
	});
});

test("Should not remove empty parent if parent has adjacent property before", (t) => {
	assertPropertyRemoval(t, {
		source: `{ "entry": { "before": true, "settings": { "text": "Hello World" } } }`,
		removalKey: "/entry/settings/text",
		expected: `{ "entry": { "before": true } }`,
		removeEmptyDirectParent: true,
	});
});

test("Should not remove empty parent if parent has adjacent property after", (t) => {
	assertPropertyRemoval(t, {
		source: `{ "entry": { "settings": { "text": "Hello World" }, "after": true } }`,
		removalKey: "/entry/settings/text",
		expected: `{ "entry": { "after": true } }`,
		removeEmptyDirectParent: true,
	});
});

test("Should not remove empty parent if parent has adjacent properties before/after", (t) => {
	assertPropertyRemoval(t, {
		source: `{ "entry": { "before": true, "settings": { "text": "Hello World" }, "after": true } }`,
		removalKey: "/entry/settings/text",
		expected: `{ "entry": { "before": true, "after": true } }`,
		removeEmptyDirectParent: true,
	});
});

test("Should not remove empty parent if parent is root", (t) => {
	assertPropertyRemoval(t, {
		source: `{ "text": "Hello World" }`,
		removalKey: "/text",
		expected: `{}`,
		removeEmptyDirectParent: true,
	});
});

test("Should not remove empty parent if parent is root (multi-line)", (t) => {
	assertPropertyRemoval(t, {
		source: `{
			"text": "Hello World"
		}`,
		removalKey: "/text",
		expected: `{}`,
		removeEmptyDirectParent: true,
	});
});

test("Should throw error when removing non-property value (root)", (t) => {
	const source = `"Hello World"`;
	const {pointers} = jsonMap.parse(source);

	t.throws(() => {
		new RemoveJsonPropertyFix({key: "", pointers: pointers});
	}, {instanceOf: Error, message: "Unsupported removal of non-property value: ''"});
});

test("Should throw error when removing non-property value (array element)", (t) => {
	const source = `["value1", "value2"]`;
	const {pointers} = jsonMap.parse(source);

	t.throws(() => {
		new RemoveJsonPropertyFix({key: "/0", pointers: pointers});
	}, {instanceOf: Error, message: "Unsupported removal of non-property value: '/0'"});
});

test("Should throw error when removing non-property value (nested array element)", (t) => {
	const source = `{"items": ["value1", "value2"]}`;
	const {pointers} = jsonMap.parse(source);

	t.throws(() => {
		new RemoveJsonPropertyFix({key: "/items/1", pointers: pointers});
	}, {instanceOf: Error, message: "Unsupported removal of non-property value: '/items/1'"});
});

test("Should handle nonexistent JSON pointer key", (t) => {
	const source = `{"text": "Hello World"}`;
	const {pointers} = jsonMap.parse(source);

	t.throws(() => {
		new RemoveJsonPropertyFix({key: "/nonexistent", pointers: pointers});
	}, {instanceOf: Error, message: "Cannot find JSON pointer: '/nonexistent'"});
});

test("Should handle malformed JSON pointer key", (t) => {
	const source = `{"text": "Hello World"}`;
	const {pointers} = jsonMap.parse(source);

	t.throws(() => {
		new RemoveJsonPropertyFix({key: "text", pointers: pointers}); // Missing leading slash
	}, {instanceOf: Error, message: "Cannot find JSON pointer: 'text'"});
});

test("Should throw error when parent pointer can't be found (direct parent)", (t) => {
	const source = `{ "entry": { "text": "Hello World"} }`;
	const {pointers} = jsonMap.parse(source);

	// Simulate non-existence of parent pointer
	delete pointers["/entry"];

	t.throws(() => {
		new RemoveJsonPropertyFix({key: "/entry/text", pointers: pointers, removeEmptyDirectParent: true});
	}, {instanceOf: Error, message: "Cannot find parent JSON pointer: '/entry' (for '/entry/text')"});
});

test("Should throw error when parent pointer can't be found (parent of parent)", (t) => {
	const source = `{ "entry": { "text": "Hello World"} }`;
	const {pointers} = jsonMap.parse(source);

	// Simulate non-existence of root pointer
	delete pointers[""];

	t.throws(() => {
		new RemoveJsonPropertyFix({key: "/entry/text", pointers: pointers, removeEmptyDirectParent: true});
	}, {instanceOf: Error, message: "Cannot find parent JSON pointer: '' (for '/entry')"});
});

test("Should return undefined when positions are not calculated", (t) => {
	const source = `{"text": "Hello World"}`;
	const {pointers} = jsonMap.parse(source);

	const fix = new RemoveJsonPropertyFix({key: "/text", pointers: pointers});

	// Manually reset positions to simulate error state
	fix.startPos = undefined;
	fix.endPos = undefined;

	const changes = fix.generateChanges();
	t.is(changes, undefined);
});
