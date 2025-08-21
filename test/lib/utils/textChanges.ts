import test from "ava";
import {applyChanges, ChangeAction, ChangeSet} from "../../../src/utils/textChanges.js";

test("applyChanges with INSERT operations", (t) => {
	const content = "Hello world!";
	const changeSet: ChangeSet[] = [
		{
			action: ChangeAction.INSERT,
			start: 5,
			value: " beautiful",
		},
	];

	const result = applyChanges(content, changeSet);
	t.is(result, "Hello beautiful world!", "Should insert text at specified position");
});

test("applyChanges with multiple INSERT operations", (t) => {
	const content = "Hello world!";
	const changeSet: ChangeSet[] = [
		{
			action: ChangeAction.INSERT,
			start: 0,
			value: "Hey, ",
		},
		{
			action: ChangeAction.INSERT,
			start: 12,
			value: " Goodbye!",
		},
	];

	const result = applyChanges(content, changeSet);
	t.is(result, "Hey, Hello world! Goodbye!", "Should insert text at multiple positions");
});

test("applyChanges with REPLACE operation", (t) => {
	const content = "Hello world!";
	const changeSet: ChangeSet[] = [
		{
			action: ChangeAction.REPLACE,
			start: 6,
			end: 11,
			value: "universe",
		},
	];

	const result = applyChanges(content, changeSet);
	t.is(result, "Hello universe!", "Should replace text in specified range");
});

test("applyChanges with multiple REPLACE operations", (t) => {
	const content = "The quick brown fox jumps over the lazy dog";
	const changeSet: ChangeSet[] = [
		{
			action: ChangeAction.REPLACE,
			start: 4,
			end: 9,
			value: "slow",
		},
		{
			action: ChangeAction.REPLACE,
			start: 16,
			end: 19,
			value: "cat",
		},
	];

	const result = applyChanges(content, changeSet);
	t.is(result, "The slow brown cat jumps over the lazy dog", "Should replace text at multiple ranges");
});

test("applyChanges with DELETE operation", (t) => {
	const content = "Hello beautiful world!";
	const changeSet: ChangeSet[] = [
		{
			action: ChangeAction.DELETE,
			start: 5,
			end: 15,
		},
	];

	const result = applyChanges(content, changeSet);
	t.is(result, "Hello world!", "Should delete text in specified range");
});

test("applyChanges with multiple DELETE operations", (t) => {
	const content = "The quick brown fox jumps over the lazy dog";
	const changeSet: ChangeSet[] = [
		{
			action: ChangeAction.DELETE,
			start: 10,
			end: 16,
		},
		{
			action: ChangeAction.DELETE,
			start: 35,
			end: 40,
		},
	];

	const result = applyChanges(content, changeSet);
	t.is(result, "The quick fox jumps over the dog", "Should delete text at multiple ranges");
});

test("applyChanges with mixed operations", (t) => {
	const content = "The quick brown fox";
	const changeSet: ChangeSet[] = [
		{
			action: ChangeAction.INSERT,
			start: 0,
			value: "Oh! ",
		},
		{
			action: ChangeAction.REPLACE,
			start: 10,
			end: 15,
			value: "red",
		},
		{
			action: ChangeAction.DELETE,
			start: 15,
			end: 19,
		},
	];

	const result = applyChanges(content, changeSet);
	t.is(result, "Oh! The quick red", "Should handle mixed INSERT, REPLACE, and DELETE operations");
});

test("applyChanges with nearby operations", (t) => {
	const content = "Hello world!";
	const changeSet: ChangeSet[] = [
		{
			action: ChangeAction.REPLACE,
			start: 0,
			end: 5,
			value: "Hi",
		},
		{
			action: ChangeAction.INSERT,
			start: 6,
			value: "wonderful ",
		},
	];

	const result = applyChanges(content, changeSet);
	t.is(result, "Hi wonderful world!", "Should handle operations that affect nearby positions");
});

test("applyChanges with empty content", (t) => {
	const content = "";
	const changeSet: ChangeSet[] = [
		{
			action: ChangeAction.INSERT,
			start: 0,
			value: "Hello",
		},
	];

	const result = applyChanges(content, changeSet);
	t.is(result, "Hello", "Should handle inserting into empty content");
});

test("applyChanges with empty content and multiple INSERT operations", (t) => {
	const content = "";
	const changeSet: ChangeSet[] = [
		{
			action: ChangeAction.INSERT,
			start: 0,
			value: "Hello",
		},
		{
			action: ChangeAction.INSERT,
			start: 0,
			value: " World",
		},
	];

	const result = applyChanges(content, changeSet);
	t.is(result, "Hello World", "Should handle multiple operations on empty content");
});

test("applyChanges with empty content and multiple operations", (t) => {
	const content = "";
	const changeSet: ChangeSet[] = [
		{
			action: ChangeAction.INSERT,
			start: 0,
			value: "Hello",
		},
		{
			action: ChangeAction.DELETE,
			start: 0,
			end: 0,
		},
	];

	const result = applyChanges(content, changeSet);
	t.is(result, "Hello", "Should handle multiple operations on empty content");
});

test("applyChanges with empty changeSet", (t) => {
	const content = "Hello world!";
	const changeSet: ChangeSet[] = [];

	const result = applyChanges(content, changeSet);
	t.is(result, "Hello world!", "Should return original content when no changes applied");
});

test("applyChanges with INSERT at same position", (t) => {
	const content = "Hello world!";
	const changeSet: ChangeSet[] = [
		{
			action: ChangeAction.INSERT,
			start: 5,
			value: " there",
		},
		{
			action: ChangeAction.INSERT,
			start: 5,
			value: " beautiful",
		},
	];

	const result = applyChanges(content, changeSet);
	t.is(result, "Hello there beautiful world!", "Should handle multiple inserts at same position");
});

test("applyChanges with JavaScript code", (t) => {
	const content = `function hello() {
	console.log("Hello");
}`;
	const changeSet: ChangeSet[] = [
		{
			action: ChangeAction.REPLACE,
			start: 9,
			end: 14,
			value: "greet",
		},
		{
			action: ChangeAction.REPLACE,
			start: 33,
			end: 38,
			value: "Greetings",
		},
	];

	const result = applyChanges(content, changeSet);
	const expected = `function greet() {
	console.log("Greetings");
}`;
	t.is(result, expected, "Should handle complex multi-line code transformations");
});

test("applyChanges with negative start position for INSERT", (t) => {
	const content = "Hello world!";
	const changeSet: ChangeSet[] = [
		{
			action: ChangeAction.INSERT,
			start: -1,
			value: "Hi ",
		},
	];

	// MagicString treats negative positions as end of string for appendRight
	const result = applyChanges(content, changeSet);
	t.is(result, "Hello world!Hi ", "Should handle negative start position by appending at end");
});

test("applyChanges with out-of-bounds start position for INSERT", (t) => {
	const content = "Hello";
	const changeSet: ChangeSet[] = [
		{
			action: ChangeAction.INSERT,
			start: 10, // content length is 5
			value: " world",
		},
	];

	// MagicString allows out-of-bounds positions and appends at the end
	const result = applyChanges(content, changeSet);
	t.is(result, "Hello world", "Should handle out-of-bounds start position by appending at end");
});

test("applyChanges with out-of-bounds start position for INSERT on empty string", (t) => {
	const content = "";
	const changeSet: ChangeSet[] = [
		{
			action: ChangeAction.INSERT,
			start: 0, // content length is 0
			value: "Hello ",
		},
		{
			action: ChangeAction.INSERT,
			start: 10, // content length is 0
			value: "world",
		},
	];

	// MagicString allows out-of-bounds positions and appends at the end
	const result = applyChanges(content, changeSet);
	t.is(result, "Hello world", "Should handle out-of-bounds start position by appending at end");
});

test("applyChanges with negative start position for REPLACE", (t) => {
	const content = "Hello world!";
	const changeSet: ChangeSet[] = [
		{
			action: ChangeAction.REPLACE,
			start: -1,
			end: 5,
			value: "Hi",
		},
	];

	t.throws(() => {
		applyChanges(content, changeSet);
	}, {message: /Cannot overwrite across a split point/}, "Should throw MagicString error for negative start position in REPLACE");
});

test("applyChanges with negative end position for REPLACE", (t) => {
	const content = "Hello world!";
	const changeSet: ChangeSet[] = [
		{
			action: ChangeAction.REPLACE,
			start: 0,
			end: -1,
			value: "Hi",
		},
	];

	// MagicString replaces from start to negative end position
	const result = applyChanges(content, changeSet);
	t.is(result, "Hi!", "Should handle negative end position by replacing from start to calculated position");
});

test("applyChanges with out-of-bounds end position for REPLACE", (t) => {
	const content = "Hello";
	const changeSet: ChangeSet[] = [
		{
			action: ChangeAction.REPLACE,
			start: 0,
			end: 10, // content length is 5
			value: "Hi",
		},
	];

	t.throws(() => {
		applyChanges(content, changeSet);
	}, {message: /end is out of bounds/}, "Should throw MagicString error for out-of-bounds end position in REPLACE");
});

test("applyChanges with end before start for REPLACE", (t) => {
	const content = "Hello world!";
	const changeSet: ChangeSet[] = [
		{
			action: ChangeAction.REPLACE,
			start: 5,
			end: 2,
			value: "Hi",
		},
	];

	t.throws(() => {
		applyChanges(content, changeSet);
	}, {message: /Cannot overwrite across a split point/}, "Should throw MagicString error when end is before start in REPLACE");
});

test("applyChanges with negative start position for DELETE", (t) => {
	const content = "Hello world!";
	const changeSet: ChangeSet[] = [
		{
			action: ChangeAction.DELETE,
			start: -1,
			end: 5,
		},
	];

	t.throws(() => {
		applyChanges(content, changeSet);
	}, {message: /end must be greater than start/}, "Should throw MagicString error for negative start position in DELETE");
});

test("applyChanges with negative end position for DELETE", (t) => {
	const content = "Hello world!";
	const changeSet: ChangeSet[] = [
		{
			action: ChangeAction.DELETE,
			start: 0,
			end: -1,
		},
	];

	// MagicString deletes from start to negative end position
	const result = applyChanges(content, changeSet);
	t.is(result, "!", "Should handle negative end position by deleting from start to calculated position");
});

test("applyChanges with out-of-bounds positions for DELETE", (t) => {
	const content = "Hello";
	const changeSet: ChangeSet[] = [
		{
			action: ChangeAction.DELETE,
			start: 0,
			end: 10, // content length is 5
		},
	];

	t.throws(() => {
		applyChanges(content, changeSet);
	}, {message: /Character is out of bounds/}, "Should throw MagicString error for out-of-bounds end position in DELETE");
});

test("applyChanges with end before start for DELETE", (t) => {
	const content = "Hello world!";
	const changeSet: ChangeSet[] = [
		{
			action: ChangeAction.DELETE,
			start: 5,
			end: 2,
		},
	];

	t.throws(() => {
		applyChanges(content, changeSet);
	}, {message: /end must be greater than start/}, "Should throw MagicString error when end is before start in DELETE");
});

test("applyChanges with overlapping REPLACE operations", (t) => {
	const content = "Hello world!";
	const changeSet: ChangeSet[] = [
		{
			action: ChangeAction.REPLACE,
			start: 0,
			end: 5,
			value: "Hi",
		},
		{
			action: ChangeAction.REPLACE,
			start: 3,
			end: 8,
			value: "there",
		},
	];

	t.throws(() => {
		applyChanges(content, changeSet);
	}, {message: /Cannot split a chunk that has already been edited/}, "Should throw MagicString error for overlapping REPLACE operations");
});

test("applyChanges with overlapping DELETE operations", (t) => {
	const content = "Hello world!";
	const changeSet: ChangeSet[] = [
		{
			action: ChangeAction.DELETE,
			start: 0,
			end: 5,
		},
		{
			action: ChangeAction.DELETE,
			start: 3,
			end: 8,
		},
	];

	// MagicString handles overlapping deletes differently due to reverse order
	const result = applyChanges(content, changeSet);
	t.is(result, "rld!", "Should handle overlapping DELETE operations based on reverse processing");
});

test("applyChanges with DELETE and REPLACE overlap", (t) => {
	const content = "Hello world!";
	const changeSet: ChangeSet[] = [
		{
			action: ChangeAction.DELETE,
			start: 0,
			end: 5,
		},
		{
			action: ChangeAction.REPLACE,
			start: 3,
			end: 8,
			value: "there",
		},
	];

	t.throws(() => {
		applyChanges(content, changeSet);
	}, {message: /Cannot split a chunk that has already been edited/}, "Should throw MagicString error for DELETE and REPLACE overlap");
});

test("applyChanges with extremely large position numbers", (t) => {
	const content = "Hello";
	const changeSet: ChangeSet[] = [
		{
			action: ChangeAction.INSERT,
			start: Number.MAX_SAFE_INTEGER,
			value: " world",
		},
	];

	// MagicString handles large numbers as end of string
	const result = applyChanges(content, changeSet);
	t.is(result, "Hello world", "Should handle extremely large position numbers by treating as end of string");
});

test("applyChanges with zero-length DELETE operation", (t) => {
	const content = "Hello world!";
	const changeSet: ChangeSet[] = [
		{
			action: ChangeAction.DELETE,
			start: 5,
			end: 5, // Same position - zero-length delete
		},
	];

	// Zero-length delete should be handled gracefully (no-op)
	const result = applyChanges(content, changeSet);
	t.is(result, "Hello world!", "Should handle zero-length DELETE as no-op");
});

test("applyChanges with zero-length REPLACE operation", (t) => {
	const content = "Hello world!";
	const changeSet: ChangeSet[] = [
		{
			action: ChangeAction.REPLACE,
			start: 5,
			end: 5, // Same position - zero-length replace (insertion)
			value: " beautiful",
		},
	];

	// MagicString throws error for zero-length replace
	t.throws(() => {
		applyChanges(content, changeSet);
	}, {message: /Cannot overwrite a zero-length range \u2013 use appendLeft or prependRight instead/}, "Should throw MagicString error for zero-length REPLACE");
});

test("applyChanges with empty string replacements", (t) => {
	const content = "Hello world!";
	const changeSet: ChangeSet[] = [
		{
			action: ChangeAction.REPLACE,
			start: 5,
			end: 11,
			value: "",
		},
	];

	const result = applyChanges(content, changeSet);
	t.is(result, "Hello!", "Should handle empty string replacement (deletion)");
});

test("applyChanges with null content", (t) => {
	const content = null as unknown as string;
	const changeSet: ChangeSet[] = [
		{
			action: ChangeAction.INSERT,
			start: 0,
			value: "Hello",
		},
	];

	t.throws(() => {
		applyChanges(content, changeSet);
	}, {message: /Cannot read properties of null \(reading 'length'\)/}, "Should throw TypeError for null content");
});

test("applyChanges with undefined content", (t) => {
	const content = undefined as unknown as string;
	const changeSet: ChangeSet[] = [
		{
			action: ChangeAction.INSERT,
			start: 0,
			value: "Hello",
		},
	];

	t.throws(() => {
		applyChanges(content, changeSet);
	}, {message: /Cannot read properties of undefined/}, "Should throw TypeError for undefined content");
});

test("applyChanges with null changeSet", (t) => {
	const content = "Hello world!";
	const changeSet = null as unknown as ChangeSet[];

	t.throws(() => {
		applyChanges(content, changeSet);
	}, {message: /Cannot read properties of null \(reading 'sort'\)/}, "Should throw TypeError for null changeSet");
});

test("applyChanges with undefined changeSet", (t) => {
	const content = "Hello world!";
	const changeSet = undefined as unknown as ChangeSet[];

	t.throws(() => {
		applyChanges(content, changeSet);
	}, {message: /Cannot read properties of undefined/}, "Should throw TypeError for undefined changeSet");
});

test("applyChanges with non-array changeSet", (t) => {
	const content = "Hello world!";
	const changeSet = "not an array" as unknown as ChangeSet[];

	t.throws(() => {
		applyChanges(content, changeSet);
	}, {message: /changeSet\.sort is not a function/}, "Should throw TypeError for non-array changeSet");
});

test("applyChanges with invalid change object (missing action)", (t) => {
	const content = "Hello world!";
	const changeSet = [
		{
			start: 0,
			value: "Hi",
		},
	] as unknown as ChangeSet[];

	// applyChanges doesn't validate the action, it just skips unknown cases
	const result = applyChanges(content, changeSet);
	t.is(result, "Hello world!", "Should ignore change objects with missing/invalid action");
});

test("applyChanges with invalid action type", (t) => {
	const content = "Hello world!";
	const changeSet = [
		{
			action: "invalid_action",
			start: 0,
			value: "Hi",
		},
	] as unknown as ChangeSet[];

	// Switch statement doesn't match, so it's ignored
	const result = applyChanges(content, changeSet);
	t.is(result, "Hello world!", "Should ignore change objects with invalid action type");
});

test("applyChanges with INSERT missing value", (t) => {
	const content = "Hello world!";
	const changeSet = [
		{
			action: ChangeAction.INSERT,
			start: 0,
		},
	] as unknown as ChangeSet[];

	t.throws(() => {
		applyChanges(content, changeSet);
	}, {message: /inserted content must be a string/}, "Should throw MagicString error for INSERT missing value");
});

test("applyChanges with REPLACE missing end", (t) => {
	const content = "Hello world!";
	const changeSet = [
		{
			action: ChangeAction.REPLACE,
			start: 0,
			value: "Hi",
		},
	] as unknown as ChangeSet[];

	t.throws(() => {
		applyChanges(content, changeSet);
	}, {message: /Cannot overwrite across a split point/}, "Should throw MagicString error for REPLACE missing end");
});

test("applyChanges with REPLACE missing value", (t) => {
	const content = "Hello world!";
	const changeSet = [
		{
			action: ChangeAction.REPLACE,
			start: 0,
			end: 5,
		},
	] as unknown as ChangeSet[];

	t.throws(() => {
		applyChanges(content, changeSet);
	}, {message: /replacement content must be a string/}, "Should throw MagicString error for REPLACE missing value");
});

test("applyChanges with DELETE missing end", (t) => {
	const content = "Hello world!";
	const changeSet = [
		{
			action: ChangeAction.DELETE,
			start: 0,
		},
	] as unknown as ChangeSet[];

	// DELETE without end removes everything from start to end of string
	const result = applyChanges(content, changeSet);
	t.is(result, "", "Should handle DELETE missing end by deleting from start to end of string");
});

test("applyChanges with non-numeric start position", (t) => {
	const content = "Hello world!";
	const changeSet = [
		{
			action: ChangeAction.INSERT,
			start: "invalid",
			value: "Hi",
		},
	] as unknown as ChangeSet[];

	// MagicString coerces non-numeric positions and treats them as end of string
	const result = applyChanges(content, changeSet);
	t.is(result, "Hello world!Hi", "Should coerce non-numeric start position and append at end");
});

test("applyChanges with non-numeric end position", (t) => {
	const content = "Hello world!";
	const changeSet = [
		{
			action: ChangeAction.REPLACE,
			start: 0,
			end: "invalid",
			value: "Hi",
		},
	] as unknown as ChangeSet[];

	t.throws(() => {
		applyChanges(content, changeSet);
	}, {message: /Cannot overwrite across a split point/}, "Should throw MagicString error for non-numeric end position");
});

test("applyChanges with non-string value", (t) => {
	const content = "Hello world!";
	const changeSet = [
		{
			action: ChangeAction.INSERT,
			start: 0,
			value: 123,
		},
	] as unknown as ChangeSet[];

	t.throws(() => {
		applyChanges(content, changeSet);
	}, {message: /inserted content must be a string/}, "Should throw MagicString error for non-string value");
});

test("applyChanges with special characters and unicode", (t) => {
	const content = "Hello 🌍! Ñice tö see yõu.";
	const changeSet: ChangeSet[] = [
		{
			action: ChangeAction.REPLACE,
			start: 6,
			end: 8,
			value: "🚀",
		},
		{
			action: ChangeAction.INSERT,
			start: 25,
			value: " 🎉",
		},
	];

	const result = applyChanges(content, changeSet);
	t.is(result, "Hello 🚀! Ñice tö see yõu 🎉.", "Should handle unicode and special characters correctly");
});

test("applyChanges with very long content and multiple operations", (t) => {
	const content = "A".repeat(10000);
	const changeSet: ChangeSet[] = [
		{
			action: ChangeAction.INSERT,
			start: 0,
			value: "START-",
		},
		{
			action: ChangeAction.INSERT,
			start: 5000,
			value: "-MIDDLE-",
		},
		{
			action: ChangeAction.INSERT,
			start: 10000,
			value: "-END",
		},
	];

	const result = applyChanges(content, changeSet);
	t.true(result.startsWith("START-A"), "Should handle long content with insertions at start");
	t.true(result.includes("-MIDDLE-"), "Should handle long content with insertions in middle");
	t.true(result.endsWith("A-END"), "Should handle long content with insertions at end");
});

test("applyChanges with float positions", (t) => {
	const content = "Hello world!";
	const changeSet = [
		{
			action: ChangeAction.INSERT,
			start: 5.7, // Float position
			value: " there",
		},
	] as unknown as ChangeSet[];

	// MagicString should handle float positions (floors them)
	const result = applyChanges(content, changeSet);
	t.is(result, "Hello there world!", "Should handle float positions by flooring them");
});

test("applyChanges with Infinity position", (t) => {
	const content = "Hello";
	const changeSet = [
		{
			action: ChangeAction.INSERT,
			start: Infinity,
			value: " world",
		},
	] as unknown as ChangeSet[];

	// MagicString should handle Infinity as end of string
	const result = applyChanges(content, changeSet);
	t.is(result, "Hello world", "Should handle Infinity position by appending at end");
});

test("applyChanges with NaN position", (t) => {
	const content = "Hello world!";
	const changeSet = [
		{
			action: ChangeAction.INSERT,
			start: NaN,
			value: "Hi!",
		},
	] as unknown as ChangeSet[];

	// MagicString should handle NaN positions
	const result = applyChanges(content, changeSet);
	t.is(result, "Hello world!Hi!", "Should handle NaN position by appending at end");
});

test("applyChanges with multiline content and operations", (t) => {
	const content = `line1
line2
line3`;
	const changeSet: ChangeSet[] = [
		{
			action: ChangeAction.REPLACE,
			start: 0,
			end: 5,
			value: "first",
		},
		{
			action: ChangeAction.INSERT,
			start: 11,
			value: " inserted",
		},
	];

	const result = applyChanges(content, changeSet);
	const expected = `first
line2 inserted
line3`;
	t.is(result, expected, "Should handle multiline content operations correctly");
});

test("applyChanges with tab and newline characters", (t) => {
	const content = "Hello\tworld\n!";
	const changeSet: ChangeSet[] = [
		{
			action: ChangeAction.REPLACE,
			start: 5,
			end: 6,
			value: " ",
		},
		{
			action: ChangeAction.REPLACE,
			start: 11,
			end: 12,
			value: " ",
		},
	];

	const result = applyChanges(content, changeSet);
	t.is(result, "Hello world !", "Should handle tab and newline character replacements");
});

test("applyChanges with zero position operations", (t) => {
	const content = "Hello";
	const changeSet: ChangeSet[] = [
		{
			action: ChangeAction.INSERT,
			start: 0,
			value: "A",
		},
		{
			action: ChangeAction.INSERT,
			start: 0,
			value: "B",
		},
		{
			action: ChangeAction.INSERT,
			start: 0,
			value: "C",
		},
	];

	// Multiple inserts at position 0, applied in reverse order
	const result = applyChanges(content, changeSet);
	t.is(result, "ABCHello", "Should handle multiple inserts at position 0 correctly");
});

test("applyChanges with operations at same end position", (t) => {
	const content = "Hello world!";
	const changeSet: ChangeSet[] = [
		{
			action: ChangeAction.INSERT,
			start: 12,
			value: " A",
		},
		{
			action: ChangeAction.INSERT,
			start: 12,
			value: " B",
		},
	];

	// Multiple inserts at end position
	const result = applyChanges(content, changeSet);
	t.is(result, "Hello world! A B", "Should handle multiple inserts at end position correctly");
});

test("applyChanges with mixed boundary operations", (t) => {
	const content = "Hello";
	const changeSet: ChangeSet[] = [
		{
			action: ChangeAction.INSERT,
			start: 0,
			value: "Start-",
		},
		{
			action: ChangeAction.INSERT,
			start: 5,
			value: "-End",
		},
		{
			action: ChangeAction.REPLACE,
			start: 1,
			end: 4,
			value: "i",
		},
	];

	const result = applyChanges(content, changeSet);
	t.is(result, "Start-Hio-End", "Should handle mixed boundary operations correctly");
});
