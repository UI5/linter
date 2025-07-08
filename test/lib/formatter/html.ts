import anyTest, {TestFn} from "ava";
import {Html} from "../../../src/formatter/html.js";
import {LintResult} from "../../../src/linter/LinterContext.js";
import {LintMessageSeverity} from "../../../src/linter/messages.js";

const test = anyTest as TestFn<{
	lintResults: LintResult[];
}>;

test.beforeEach((t) => {
	t.context.lintResults = [
		{
			filePath: "webapp/Component.js",
			messages: [
				{
					ruleId: "rule1",
					severity: LintMessageSeverity.Error,
					line: 1,
					column: 1,
					message: "Error message",
					messageDetails: "Message details",
				},
				{
					ruleId: "rule2",
					severity: LintMessageSeverity.Warning,
					line: 2,
					column: 2,
					message: "Warning message",
					messageDetails: "Message details",
				},
			],
			coverageInfo: [],
			errorCount: 1,
			fatalErrorCount: 0,
			warningCount: 1,
		},
		{
			filePath: "webapp/Main.controller.js",
			messages: [
				{
					ruleId: "rule3",
					severity: LintMessageSeverity.Error,
					line: 11,
					column: 3,
					message: "Another error message",
					messageDetails: "Message details",
				},
				{
					ruleId: "rule3",
					severity: LintMessageSeverity.Error,
					line: 12,
					column: 3,
					message: "Another error message",
					messageDetails: "Message details",
					fatal: true,
				},
				{
					ruleId: "rule3",
					severity: LintMessageSeverity.Error,
					line: 3,
					column: 6,
					message: "Another error message",
					messageDetails: "Message details",
					fatal: true,
				},
				{
					ruleId: "rule3",
					severity: LintMessageSeverity.Warning,
					line: 12,
					column: 3,
					message: "Another error message",
					messageDetails: "Message details",
				},
				{
					ruleId: "rule3",
					severity: LintMessageSeverity.Error,
					line: 11,
					column: 2,
					message: "Another error message",
					messageDetails: "Message details",
				},
			],
			coverageInfo: [],
			errorCount: 4,
			fatalErrorCount: 2,
			warningCount: 1,
		},
		// Add a file with empty messages to cover the skip condition
		{
			filePath: "webapp/Empty.js",
			messages: [],
			coverageInfo: [],
			errorCount: 0,
			fatalErrorCount: 0,
			warningCount: 0,
		},
	];
});

test("Default", (t) => {
	const {lintResults} = t.context;

	const htmlFormatter = new Html();
	const htmlResult = htmlFormatter.format(lintResults, false, "1.2.3", false, false);

	t.snapshot(htmlResult);
});

test("Details", (t) => {
	const {lintResults} = t.context;

	const htmlFormatter = new Html();
	const htmlResult = htmlFormatter.format(lintResults, true, "1.2.3", false, false);

	t.snapshot(htmlResult);
});

test("No findings", (t) => {
	const htmlFormatter = new Html();
	const htmlResult = htmlFormatter.format([], true, "1.2.3", false, false);

	t.snapshot(htmlResult);
});

// Test for message with no messageDetails
test("Message with no details", (t) => {
	const lintResults: LintResult[] = [
		{
			filePath: "webapp/NoDetails.js",
			messages: [
				{
					ruleId: "rule1",
					severity: LintMessageSeverity.Error,
					line: 1,
					column: 1,
					message: "Error with no details",
					// No messageDetails provided
				},
			],
			coverageInfo: [],
			errorCount: 1,
			fatalErrorCount: 0,
			warningCount: 0,
		},
	];

	const htmlFormatter = new Html();
	const htmlResult = htmlFormatter.format(lintResults, true, "1.2.3", false, false);

	t.snapshot(htmlResult);
	t.true(htmlResult.includes("Error with no details"));
});

// Test formatSeverity and getSeverityClass directly to cover all branches
test("Formatter helpers - all branches", (t) => {
	const htmlFormatter = new Html();

	// Test normal cases for formatSeverity
	// @ts-expect-error Accessing private method
	t.is(htmlFormatter.formatSeverity(LintMessageSeverity.Error, false), "Error");
	// @ts-expect-error Accessing private method
	t.is(htmlFormatter.formatSeverity(LintMessageSeverity.Warning, false), "Warning");
	// @ts-expect-error Accessing private method
	t.is(htmlFormatter.formatSeverity(LintMessageSeverity.Error, true), "Fatal Error");

	// Test for error case in formatSeverity (invalid severity)
	const error = t.throws(() => {
		// @ts-expect-error Testing invalid severity and accessing private method
		htmlFormatter.formatSeverity(999, false);
	}, {instanceOf: Error});
	t.true(error.message.includes("Unknown severity"));

	// Test normal cases for getSeverityClass
	// @ts-expect-error Accessing private method
	t.is(htmlFormatter.getSeverityClass(LintMessageSeverity.Error, false), "error");
	// @ts-expect-error Accessing private method
	t.is(htmlFormatter.getSeverityClass(LintMessageSeverity.Warning, false), "warning");
	// @ts-expect-error Accessing private method
	t.is(htmlFormatter.getSeverityClass(LintMessageSeverity.Error, true), "fatal-error");

	// Test default case for getSeverityClass (invalid severity)
	// @ts-expect-error Testing invalid severity and accessing private method
	t.is(htmlFormatter.getSeverityClass(999, false), "");
});

// Test formatMessageDetails directly to cover regex replacement
test("Formatter messageDetails with whitespace", (t) => {
	const htmlFormatter = new Html();

	// Create a message with extra whitespace and newlines in messageDetails
	const lintResults: LintResult[] = [
		{
			filePath: "webapp/WhitespaceDetails.js",
			messages: [
				{
					ruleId: "rule1",
					severity: LintMessageSeverity.Error,
					line: 1,
					column: 1,
					message: "Error with whitespace in details",
					messageDetails: "This  has  multiple    spaces\nand newlines\r\nand\ttabs",
				},
			],
			coverageInfo: [],
			errorCount: 1,
			fatalErrorCount: 0,
			warningCount: 0,
		},
	];

	const htmlResult = htmlFormatter.format(lintResults, true, "1.2.3", false, false);

	// Check the HTML content directly instead of the normalized text
	// @ts-expect-error Accessing private method
	const formattedDetails = htmlFormatter.formatMessageDetails(lintResults[0].messages[0]);
	// Ensure we're testing exactly the expected output after whitespace normalization
	t.is(formattedDetails, "This has multiple spaces and newlines and tabs");
	t.true(htmlResult.includes(formattedDetails));

	// Also directly test the private method for messageDetails
	// @ts-expect-error Accessing private method
	const testDetails = htmlFormatter.formatMessageDetails({
		messageDetails: "Multiple    spaces\nand\nnewlines",
		ruleId: "test-rule",
		severity: LintMessageSeverity.Error,
		message: "Test message",
		line: 1,
		column: 1,
		fatal: false,
	});

	t.is(testDetails, "Multiple spaces and newlines");
});

// Test URL detection in messageDetails
test("URL detection in message details", (t) => {
	const htmlFormatter = new Html();

	// Test various URL formats
	const testCases = [
		{
			input: "Check https://example.com/api for details",
			expected: "Check <a href=\"https://example.com/api\" target=\"_blank\">https://example.com/api</a> for details",
		},
		{
			input: "Documentation at (https://ui5.sap.com/api/)",
			expected: "Documentation at (<a href=\"https://ui5.sap.com/api/\" target=\"_blank\">https://ui5.sap.com/api/</a>)",
		},
		{
			input: "See www.example.org for more information",
			expected: "See <a href=\"http://www.example.org\" target=\"_blank\">www.example.org</a> for more information",
		},
		{
			input: "UI5 docs ui5.sap.com/topic/documentation",
			expected: "UI5 docs <a href=\"https://ui5.sap.com/topic/documentation\" target=\"_blank\">ui5.sap.com/topic/documentation</a>",
		},
		{
			input: "No URLs in this text",
			expected: "No URLs in this text",
		},
	];

	// Test each case with the formatter
	testCases.forEach(({input, expected}) => {
		// @ts-expect-error Accessing private method
		const result = htmlFormatter.formatMessageDetails({
			messageDetails: input,
			ruleId: "test-rule",
			severity: LintMessageSeverity.Error,
			message: "Test message",
			line: 1,
			column: 1,
		});

		t.is(result, expected, `Failed to format URL in: ${input}`);
	});

	// Also verify the URLs work in the complete HTML output
	const lintResults: LintResult[] = [
		{
			filePath: "webapp/UrlsInDetails.js",
			messages: [
				{
					ruleId: "rule1",
					severity: LintMessageSeverity.Error,
					line: 1,
					column: 1,
					message: "Error with URL in details",
					messageDetails: "See https://ui5.sap.com and www.example.com",
				},
			],
			coverageInfo: [],
			errorCount: 1,
			fatalErrorCount: 0,
			warningCount: 0,
		},
	];

	const htmlResult = htmlFormatter.format(lintResults, true, "1.2.3", false, false);

	// Make sure both URLs were converted to links in the HTML
	t.true(htmlResult.includes("<a href=\"https://ui5.sap.com\" target=\"_blank\">https://ui5.sap.com</a>"));
	t.true(htmlResult.includes("<a href=\"http://www.example.com\" target=\"_blank\">www.example.com</a>"));
});

// Test with undefined messageDetails
test("Formatter messageDetails with undefined", (t) => {
	const htmlFormatter = new Html();

	// @ts-expect-error Accessing private method
	const result = htmlFormatter.formatMessageDetails({
		ruleId: "test-rule",
		severity: LintMessageSeverity.Error,
		message: "Test message",
		line: 1,
		column: 1,
	});

	t.is(result, "", "Should return empty string for undefined messageDetails");
});

test("Quiet mode - errors only", (t) => {
	const {lintResults} = t.context;

	const htmlFormatter = new Html();
	const htmlResult = htmlFormatter.format(lintResults, false, "1.2.3", false, true);

	t.snapshot(htmlResult);

	// Should only show error count in summary, not warning count
	t.true(htmlResult.includes("5 problems (5 errors)"));
	// Should not include warning count in summary
	t.false(htmlResult.includes(", 2 warnings"));
});

test("Quiet mode disabled - shows warnings", (t) => {
	const {lintResults} = t.context;

	const htmlFormatter = new Html();
	const htmlResult = htmlFormatter.format(lintResults, false, "1.2.3", false, false);

	t.snapshot(htmlResult);

	// Should show both errors and warnings in summary
	t.true(htmlResult.includes("7 problems (5 errors, 2 warnings)"));
});

test("Quiet mode with single error/warning", (t) => {
	const singleResultLintResults: LintResult[] = [
		{
			filePath: "webapp/Single.js",
			messages: [
				{
					ruleId: "rule1",
					severity: LintMessageSeverity.Error,
					line: 1,
					column: 1,
					message: "Single error message",
					messageDetails: "Message details",
				},
				{
					ruleId: "rule2",
					severity: LintMessageSeverity.Warning,
					line: 2,
					column: 2,
					message: "Single warning message",
					messageDetails: "Message details",
				},
			],
			coverageInfo: [],
			errorCount: 1,
			fatalErrorCount: 0,
			warningCount: 1,
		},
	];

	const htmlFormatter = new Html();

	// Test quiet mode - should show "1 problem (1 error)"
	const quietResult = htmlFormatter.format(singleResultLintResults, false, "1.2.3", false, true);
	t.true(quietResult.includes("1 problem (1 error)"));
	// Should not include warning count in summary
	t.false(quietResult.includes(", 1 warning"));

	// Test normal mode - should show "2 problems (1 error, 1 warning)"
	const normalResult = htmlFormatter.format(singleResultLintResults, false, "1.2.3", false, false);
	t.true(normalResult.includes("2 problems (1 error, 1 warning)"));
});

test("Quiet mode with no errors", (t) => {
	const warningOnlyResults: LintResult[] = [
		{
			filePath: "webapp/WarningOnly.js",
			messages: [
				{
					ruleId: "rule1",
					severity: LintMessageSeverity.Warning,
					line: 1,
					column: 1,
					message: "Warning message",
					messageDetails: "Message details",
				},
			],
			coverageInfo: [],
			errorCount: 0,
			fatalErrorCount: 0,
			warningCount: 1,
		},
	];

	const htmlFormatter = new Html();
	const htmlResult = htmlFormatter.format(warningOnlyResults, false, "1.2.3", false, true);

	t.snapshot(htmlResult);

	// Should show "0 problems (0 errors)" in quiet mode
	t.true(htmlResult.includes("0 problems (0 errors)"));
	// Should not include warning count in summary
	t.false(htmlResult.includes(", 1 warning"));
});
