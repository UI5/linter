import test from "ava";
import YamlLinter from "../../../src/linter/yaml/YamlLinter.js";
import LinterContext from "../../../src/linter/LinterContext.js";

test("Test YamlLinter report", async (t) => {
	const resourceContent =
		`specVersion: '3.0'
metadata:
  name: ava-test-ui5yamllinter
type: application
framework:
  name: OpenUI5
  version: "1.121.0"
  libraries:
    - name: sap.ca.scfld.md
    - name: sap.ca.ui
    - name: sap.fe.common`;

	const resourcePath = "/ui5.yaml";
	const projectPath = "test.yamllinter";
	const context = new LinterContext({rootDir: projectPath});

	// Create UI5YamlLinter instance with resource content
	const linter = new YamlLinter(resourcePath, resourceContent, context);
	// Run UI5YamlLinter report
	await linter.lint();

	const {messages} = context.generateLintResult("/ui5.yaml");

	// Test returned messages
	t.is(messages.length, 3, "Detection of 3 deprecated libraries expected");

	// Test each message
	t.is(messages[0].ruleId, "no-deprecated-library", `RuleId is correct`);
	t.is(messages[0].message, `Use of deprecated library 'sap.ca.scfld.md'`, `Message is correct`);
	t.is(messages[0].column, 7, `Column is correct`);
	t.is(messages[0].line, 9, `Line is correct`);

	t.is(messages[1].ruleId, "no-deprecated-library", `RuleId is correct`);
	t.is(messages[1].message, `Use of deprecated library 'sap.ca.ui'`, `Message is correct`);
	t.is(messages[1].column, 7, `Column is correct`);
	t.is(messages[1].line, 10, `Line is correct`);

	t.is(messages[2].ruleId, "no-deprecated-library", `RuleId is correct`);
	t.is(messages[2].message, `Use of deprecated library 'sap.fe.common'`, `Message is correct`);
	t.is(messages[2].column, 7, `Column is correct`);
	t.is(messages[2].line, 11, `Line is correct`);
});

test("Test YamlLinter report with multiple documents", async (t) => {
	const resourceContent =
		`--- # This is the first document part
specVersion: "3.2"
kind: extension
type: task
metadata:
	name: render-markdown-files
task:
	path: lib/tasks/renderMarkdownFiles.js
framework:
  libraries:
    - name: sap.sac.grid
    - name: sap.ui.commons
    - name: sap.ui.suite
--- # This is the second document part
specVersion: '3.0'
metadata:
  name: ava-test-ui5yamllinter
type: application
framework:
  name: OpenUI5
  version: "1.121.0"
  libraries:
    - name: sap.ca.scfld.md
    - name: sap.ca.ui
    - name: sap.fe.common`;

	const resourcePath = "/ui5.yaml";
	const projectPath = "test.yamllinter";
	const context = new LinterContext({rootDir: projectPath});

	// Create UI5YamlLinter instance with resource content
	const linter = new YamlLinter(resourcePath, resourceContent, context);
	// Run UI5YamlLinter report
	await linter.lint();

	const {messages} = context.generateLintResult("/ui5.yaml");

	// Test returned messages
	t.is(messages.length, 6, "Detection of 6 deprecated libraries expected");

	// Test each message
	t.is(messages[0].ruleId, "no-deprecated-library", `RuleId is correct`);
	t.is(messages[0].message, `Use of deprecated library 'sap.sac.grid'`, `Message is correct`);
	t.is(messages[0].column, 7, `Column is correct`);
	t.is(messages[0].line, 11, `Line is correct`);

	t.is(messages[1].ruleId, "no-deprecated-library", `RuleId is correct`);
	t.is(messages[1].message, `Use of deprecated library 'sap.ui.commons'`, `Message is correct`);
	t.is(messages[1].column, 7, `Column is correct`);
	t.is(messages[1].line, 12, `Line is correct`);

	t.is(messages[2].ruleId, "no-deprecated-library", `RuleId is correct`);
	t.is(messages[2].message, `Use of deprecated library 'sap.ui.suite'`, `Message is correct`);
	t.is(messages[2].column, 7, `Column is correct`);
	t.is(messages[2].line, 13, `Line is correct`);

	t.is(messages[3].ruleId, "no-deprecated-library", `RuleId is correct`);
	t.is(messages[3].message, `Use of deprecated library 'sap.ca.scfld.md'`, `Message is correct`);
	t.is(messages[3].column, 7, `Column is correct`);
	t.is(messages[3].line, 23, `Line is correct`);

	t.is(messages[4].ruleId, "no-deprecated-library", `RuleId is correct`);
	t.is(messages[4].message, `Use of deprecated library 'sap.ca.ui'`, `Message is correct`);
	t.is(messages[4].column, 7, `Column is correct`);
	t.is(messages[4].line, 24, `Line is correct`);

	t.is(messages[5].ruleId, "no-deprecated-library", `RuleId is correct`);
	t.is(messages[5].message, `Use of deprecated library 'sap.fe.common'`, `Message is correct`);
	t.is(messages[5].column, 7, `Column is correct`);
	t.is(messages[5].line, 25, `Line is correct`);
});

test("Test YamlLinter report with multiple documents and empty lines", async (t) => {
	const resourceContent =
		`--- # This is the first document part
specVersion: "3.2"
kind: extension
type: task
metadata:
	name: render-markdown-files
task:
	path: lib/tasks/renderMarkdownFiles.js
framework:
  libraries:
    - name: sap.sac.grid
    - name: sap.ui.commons
    - name: sap.ui.suite

--- # This is the second document part

specVersion: '3.0'
metadata:
  name: ava-test-ui5yamllinter
type: application
framework:
  name: OpenUI5
  version: "1.121.0"
  libraries:
    - name: sap.ca.scfld.md
    - name: sap.ca.ui
    - name: sap.fe.common`;

	const resourcePath = "/ui5.yaml";
	const projectPath = "test.yamllinter";
	const context = new LinterContext({rootDir: projectPath});

	// Create UI5YamlLinter instance with resource content
	const linter = new YamlLinter(resourcePath, resourceContent, context);
	// Run UI5YamlLinter report
	await linter.lint();

	const {messages} = context.generateLintResult("/ui5.yaml");

	// Test returned messages
	t.is(messages.length, 6, "Detection of 6 deprecated libraries expected");

	// Test each message
	t.is(messages[0].ruleId, "no-deprecated-library", `RuleId is correct`);
	t.is(messages[0].message, `Use of deprecated library 'sap.sac.grid'`, `Message is correct`);
	t.is(messages[0].column, 7, `Column is correct`);
	t.is(messages[0].line, 11, `Line is correct`);

	t.is(messages[1].ruleId, "no-deprecated-library", `RuleId is correct`);
	t.is(messages[1].message, `Use of deprecated library 'sap.ui.commons'`, `Message is correct`);
	t.is(messages[1].column, 7, `Column is correct`);
	t.is(messages[1].line, 12, `Line is correct`);

	t.is(messages[2].ruleId, "no-deprecated-library", `RuleId is correct`);
	t.is(messages[2].message, `Use of deprecated library 'sap.ui.suite'`, `Message is correct`);
	t.is(messages[2].column, 7, `Column is correct`);
	t.is(messages[2].line, 13, `Line is correct`);

	t.is(messages[3].ruleId, "no-deprecated-library", `RuleId is correct`);
	t.is(messages[3].message, `Use of deprecated library 'sap.ca.scfld.md'`, `Message is correct`);
	t.is(messages[3].column, 7, `Column is correct`);
	t.is(messages[3].line, 25, `Line is correct`);

	t.is(messages[4].ruleId, "no-deprecated-library", `RuleId is correct`);
	t.is(messages[4].message, `Use of deprecated library 'sap.ca.ui'`, `Message is correct`);
	t.is(messages[4].column, 7, `Column is correct`);
	t.is(messages[4].line, 26, `Line is correct`);

	t.is(messages[5].ruleId, "no-deprecated-library", `RuleId is correct`);
	t.is(messages[5].message, `Use of deprecated library 'sap.fe.common'`, `Message is correct`);
	t.is(messages[5].column, 7, `Column is correct`);
	t.is(messages[5].line, 27, `Line is correct`);
});

test("Test YamlLinter report with multiple documents and without comments", async (t) => {
	const resourceContent =
		`---
specVersion: "3.2"
kind: extension
type: task
metadata:
	name: render-markdown-files
task:
	path: lib/tasks/renderMarkdownFiles.js
framework:
  libraries:
    - name: sap.sac.grid
    - name: sap.ui.commons
    - name: sap.ui.suite
---
specVersion: '3.0'
metadata:
  name: ava-test-ui5yamllinter
type: application
framework:
  name: OpenUI5
  version: "1.121.0"
  libraries:
    - name: sap.ca.scfld.md
    - name: sap.ca.ui
    - name: sap.fe.common`;

	const resourcePath = "/ui5.yaml";
	const projectPath = "test.yamllinter";
	const context = new LinterContext({rootDir: projectPath});

	// Create UI5YamlLinter instance with resource content
	const linter = new YamlLinter(resourcePath, resourceContent, context);
	// Run UI5YamlLinter report
	await linter.lint();

	const {messages} = context.generateLintResult("/ui5.yaml");

	// Test returned messages
	t.is(messages.length, 6, "Detection of 6 deprecated libraries expected");

	// Test each message
	t.is(messages[0].ruleId, "no-deprecated-library", `RuleId is correct`);
	t.is(messages[0].message, `Use of deprecated library 'sap.sac.grid'`, `Message is correct`);
	t.is(messages[0].column, 7, `Column is correct`);
	t.is(messages[0].line, 11, `Line is correct`);

	t.is(messages[1].ruleId, "no-deprecated-library", `RuleId is correct`);
	t.is(messages[1].message, `Use of deprecated library 'sap.ui.commons'`, `Message is correct`);
	t.is(messages[1].column, 7, `Column is correct`);
	t.is(messages[1].line, 12, `Line is correct`);

	t.is(messages[2].ruleId, "no-deprecated-library", `RuleId is correct`);
	t.is(messages[2].message, `Use of deprecated library 'sap.ui.suite'`, `Message is correct`);
	t.is(messages[2].column, 7, `Column is correct`);
	t.is(messages[2].line, 13, `Line is correct`);

	t.is(messages[3].ruleId, "no-deprecated-library", `RuleId is correct`);
	t.is(messages[3].message, `Use of deprecated library 'sap.ca.scfld.md'`, `Message is correct`);
	t.is(messages[3].column, 7, `Column is correct`);
	t.is(messages[3].line, 23, `Line is correct`);

	t.is(messages[4].ruleId, "no-deprecated-library", `RuleId is correct`);
	t.is(messages[4].message, `Use of deprecated library 'sap.ca.ui'`, `Message is correct`);
	t.is(messages[4].column, 7, `Column is correct`);
	t.is(messages[4].line, 24, `Line is correct`);

	t.is(messages[5].ruleId, "no-deprecated-library", `RuleId is correct`);
	t.is(messages[5].message, `Use of deprecated library 'sap.fe.common'`, `Message is correct`);
	t.is(messages[5].column, 7, `Column is correct`);
	t.is(messages[5].line, 25, `Line is correct`);
});

test("Test YamlLinter report with multiple documents and without first separator", async (t) => {
	const resourceContent =
		`specVersion: "3.2"
kind: extension
type: task
metadata:
	name: render-markdown-files
task:
	path: lib/tasks/renderMarkdownFiles.js
framework:
  libraries:
    - name: sap.sac.grid
    - name: sap.ui.commons
    - name: sap.ui.suite
---
specVersion: '3.0'
metadata:
  name: ava-test-ui5yamllinter
type: application
framework:
  name: OpenUI5
  version: "1.121.0"
  libraries:
    - name: sap.ca.scfld.md
    - name: sap.ca.ui
    - name: sap.fe.common`;

	const resourcePath = "/ui5.yaml";
	const projectPath = "test.yamllinter";
	const context = new LinterContext({rootDir: projectPath});

	// Create UI5YamlLinter instance with resource content
	const linter = new YamlLinter(resourcePath, resourceContent, context);
	// Run UI5YamlLinter report
	await linter.lint();

	const {messages} = context.generateLintResult("/ui5.yaml");

	// Test returned messages
	t.is(messages.length, 6, "Detection of 6 deprecated libraries expected");

	// Test each message
	t.is(messages[0].ruleId, "no-deprecated-library", `RuleId is correct`);
	t.is(messages[0].message, `Use of deprecated library 'sap.sac.grid'`, `Message is correct`);
	t.is(messages[0].column, 7, `Column is correct`);
	t.is(messages[0].line, 10, `Line is correct`);

	t.is(messages[1].ruleId, "no-deprecated-library", `RuleId is correct`);
	t.is(messages[1].message, `Use of deprecated library 'sap.ui.commons'`, `Message is correct`);
	t.is(messages[1].column, 7, `Column is correct`);
	t.is(messages[1].line, 11, `Line is correct`);

	t.is(messages[2].ruleId, "no-deprecated-library", `RuleId is correct`);
	t.is(messages[2].message, `Use of deprecated library 'sap.ui.suite'`, `Message is correct`);
	t.is(messages[2].column, 7, `Column is correct`);
	t.is(messages[2].line, 12, `Line is correct`);

	t.is(messages[3].ruleId, "no-deprecated-library", `RuleId is correct`);
	t.is(messages[3].message, `Use of deprecated library 'sap.ca.scfld.md'`, `Message is correct`);
	t.is(messages[3].column, 7, `Column is correct`);
	t.is(messages[3].line, 22, `Line is correct`);

	t.is(messages[4].ruleId, "no-deprecated-library", `RuleId is correct`);
	t.is(messages[4].message, `Use of deprecated library 'sap.ca.ui'`, `Message is correct`);
	t.is(messages[4].column, 7, `Column is correct`);
	t.is(messages[4].line, 23, `Line is correct`);

	t.is(messages[5].ruleId, "no-deprecated-library", `RuleId is correct`);
	t.is(messages[5].message, `Use of deprecated library 'sap.fe.common'`, `Message is correct`);
	t.is(messages[5].column, 7, `Column is correct`);
	t.is(messages[5].line, 24, `Line is correct`);
});

test("Test YamlLinter report with empty ui5.yaml", async (t) => {
	const resourceContent = ``;

	const resourcePath = "/ui5.yaml";
	const projectPath = "test.yamllinter";
	const context = new LinterContext({rootDir: projectPath});

	// Create UI5YamlLinter instance with resource content
	const linter = new YamlLinter(resourcePath, resourceContent, context);
	// Run UI5YamlLinter report
	await linter.lint();

	const {messages} = context.generateLintResult("/ui5.yaml");

	// Test returned messages
	t.is(messages.length, 0, "0 messages should be reported");
});

test("Test YamlLinter error catching", async (t) => {
	// Invalid YAML content that will cause parsing to fail
	const resourceContent = `
specVersion: '3.0'
metadata:
  name: test-app
type: application
framework:
  name: OpenUI5
  version: "1.121.0"
  libraries:
    - name: sap.m
    - name: sap.ui.core
    - invalid: [unclosed array
`;

	const resourcePath = "/ui5.yaml";
	const projectPath = "test.yamllinter";
	const context = new LinterContext({rootDir: projectPath});
	const linter = new YamlLinter(resourcePath, resourceContent, context);
	await linter.lint();

	const {messages} = context.generateLintResult("/ui5.yaml");

	// Test that the parsing error was caught and reported
	t.is(messages.length, 1, "A parsing error message should be reported");
	t.is(messages[0].ruleId, "parsing-error", "RuleId should be parsing-error");

	// Test that the message contains the actual error that was caught
	t.true(messages[0].message.includes("Cannot read properties of undefined"),
		"Message should contain the parsing error"
	);
	t.is(messages[0].fatal, true, "Parsing error should be marked as fatal");
});
