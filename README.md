![UI5 logo](./docs/images/UI5_logo_wide.png)

# UI5 Linter

> A static code analysis tool for UI5

[![OpenUI5 Community Slack (#tooling channel)](https://img.shields.io/badge/slack-join-44cc11.svg)](https://ui5-slack-invite.cfapps.eu10.hana.ondemand.com/)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-v2.1%20adopted-ff69b4.svg)](https://github.com/UI5/linter?tab=coc-ov-file#readme)
[![REUSE status](https://api.reuse.software/badge/github.com/UI5/linter)](https://api.reuse.software/info/github.com/UI5/linter)
[![npm Package Version](https://badge.fury.io/js/%40ui5%2Flinter.svg)](https://www.npmjs.com/package/@ui5/linter)
[![Coverage Status](https://coveralls.io/repos/github/UI5/linter/badge.svg)](https://coveralls.io/github/UI5/linter)

- [UI5 Linter](#ui5-linter)
	- [Description](#description)
	- [Features](#features)
	- [Rules](#rules)
	- [Requirements](#requirements)
	- [Installation](#installation)
	- [Usage](#usage)
		- [Options](#options)
			- [`--details`](#--details)
			- [`--format`](#--format)
			- [`--fix`](#--fix)
			- [`--quiet`](#--quiet)
			- [`--ignore-pattern`](#--ignore-pattern)
			- [`--config`](#--config)
			- [`--ui5-config`](#--ui5-config)
			- [`--log-level`](#--log-level)
			- [`--verbose`](#--verbose)
			- [`--perf`](#--perf)
			- [`--silent`](#--silent)
			- [`--version`](#--version)
	- [Configuration](#configuration)
		- [Configuration File Location](#configuration-file-location)
		- [Supported Configuration File Names](#supported-configuration-file-names)
		- [Configuration File Format](#configuration-file-format)
			- [ESM (ECMAScript Modules):](#esm-ecmascript-modules)
			- [CommonJS:](#commonjs)
		- [Configuration Options](#configuration-options)
	- [Directives](#directives)
		- [Specifying Rules](#specifying-rules)
		- [Scope](#scope)
	- [Node.js API](#nodejs-api)
		- [`ui5lint`](#ui5lint)
		- [`UI5LinterEngine`](#ui5linterengine)
	- [Internals](#internals)
	- [Support, Feedback, Contributing](#support-feedback-contributing)
	- [Security / Disclosure](#security--disclosure)
	- [Code of Conduct](#code-of-conduct)
	- [Licensing](#licensing)

## Description

UI5 linter is a static code analysis tool for UI5 projects.
It checks JavaScript, TypeScript, XML, JSON, and other files in your project and reports findings.

## Features
UI5 linter scans your UI5 project and detects issues that might interfere with its smooth running with [UI5 2.x](https://community.sap.com/t5/open-source-blogs/introducing-openui5-2-x/ba-p/13580633). 

* Usage of deprecated UI5 libraries 
* Usage of deprecated UI5 framework APIs 
* Usage of global variables 
* Possible CSP violations 
* Deprecated component and manifest configurations  

> [!NOTE]
> While UI5 linter already provides many detection features, it is not yet covering all aspects and best practices for UI5 2.x. The intention of UI5 linter is to detect as many issues as possible that a project running with UI5 2.x might be facing. However, you'll still need to test your UI5 project with UI5 2.x as soon as it is made available. To reveal additional issues, the UI5 team plans to release more versions of UI5 linter over the next months. 

## Rules

UI5 linter comes with a set of predefined rules that are enabled by default. You can disable specific rules in the code via [Directives](#directives).

A list of all available rules can be found on the [Rules](./docs/Rules.md) page.

## Requirements

- [Node.js](https://nodejs.org/) Version v20.11.x, v22.0.0, or higher
- [npm](https://www.npmjs.com/) Version v8.0.0 or higher

## Installation

Install the CLI using the npm package manager:

```sh
# Global
npm install --global @ui5/linter

# In your project
npm install --save-dev @ui5/linter
```

## Usage

Run the `ui5lint [files...]` command in your project root folder

```sh
> ui5lint

UI5 linter report:

/application/webapp/controller/App.controller.js
  10:4 error Call to deprecated function 'attachTap' of class 'Button'  no-deprecated-api

/application/webapp/manifest.json
  81:17 error Use of deprecated model type 'sap.ui5/models/odata/type="sap.ui.model.odata.ODataModel"'  no-deprecated-api

/application/webapp/test/unit/unitTests.qunit.js
  6:1 error Call to deprecated function 'attachInit' of class 'Core'  no-deprecated-api
  6:1 error Call to deprecated function 'getCore' (sap.ui.getCore)  no-deprecated-api
  6:1 error Access of global variable 'sap' (sap.ui.getCore)  no-globals

/application/webapp/view/Main.view.xml
  16:39 error Import of deprecated module 'sap/m/MessagePage'  no-deprecated-api
  22:5  error Use of deprecated property 'blocked' of class 'Button'  no-deprecated-api

7 problems (7 errors, 0 warnings)

Note: Use "ui5lint --details" to show more information about the findings
```

You can provide multiple glob patterns as arguments after the `ui5lint` command to filter and narrow down the linting results. 

**Note**: This option does not permit you to include files that normally wouldn't be checked (e.g. files outside of the `webapp` folder in application projects).

**Note**: Only POSIX separators are allowed, regardless of the target platform.

```sh
> ui5lint "webapp/**/*.xml"

UI5 linter report:

/application/webapp/view/Main.view.xml
  16:39 error Import of deprecated module 'sap/m/MessagePage'  no-deprecated-api
  22:5  error Use of deprecated property 'blocked' of class 'Button'  no-deprecated-api

2 problems (2 errors, 0 warnings)

Note: Use "ui5lint --details" to show more information about the findings
```

### Options

#### `--details`

Show more information about the findings and how to fix them.

**Example:**
```sh
ui5lint --details
```

#### `--format`

Choose the output format. Currently, `stylish` (default), `json`, `markdown`, and `html` are supported.

**Example:**
```sh
ui5lint --format json
```

To save the output to a file, use the `>` operator (works on macOS, Linux, and Windows):

**Save to File:**
```sh
ui5lint --format markdown > ui5-linter-findings.md
```

#### `--fix`

Attempt to automatically correct certain findings.

**Example::**
```sh
ui5lint --fix
```

Currently, issues of the following rules are fixable:
- no-globals: Usage of globals that are part of UI5 (e.g. `sap.m.Button`) are replaced by the corresponding module import (in JS files)
- no-deprecated-api: Usage of deprecated APIs
  - Usages of some deprecated APIs on `sap.ui.getCore().getConfiguration()` a.k.a. "Configuration Facade" are replaced by the corresponding recommended APIs (in JS files)
  - Usages of some deprecated APIs on `sap.ui.getCore()` a.k.a. "Core Facade" are replaced by the corresponding recommended APIs (in JS files)
  - Usages of the deprecated `tap` event handler on `sap/m/Button` are replaced by the recommended `press` event handler (in JS and XML files). Also, the associated event handler methods `attachTap` and `dettachTap` are replaced by the corresponding `attachPress` and `detachPress` methods.
  - Usages of the deprecated `useExportToExcel` property on `sap/ui/comp/smarttable/SmartTable` are replaced by the `enableExport` property (in JS and XML files)
  - Usages of the deprecated `synchronizationMode` property on `sap/ui/model/odata/v4/ODataModel` are removed (in JS files)
  - Usages of the deprecated `minWidth` property on `sap/ui/layout/form/SimpleForm` are removed (in JS and XML files)
  - Usages of deprecated attributes in a UI5 bootstrap script are replaced by the corresponding recommended attributes (in HTML files)

After applying fixes, the linter runs another pass to detect any remaining issues. Not all findings may be fixable, so those issues may need to be addressed manually. See [Scope of Autofix](./docs/Scope-of-Autofix.md) for examples of APIs that cannot be migrated automatically. Note that this list is not exhaustive; there are more APIs that are currently not supported by the Autofix.

##### Dry Run Mode
To preview the results without modifying any files, set the UI5LINT_FIX_DRY_RUN environment variable:

```sh
UI5LINT_FIX_DRY_RUN=true ui5lint --fix
```

In this mode, the linter will show the messages after the fixes would have been applied but will not actually change the files.

#### `--quiet`

Report errors only, hiding warnings. Similar to ESLint's `--quiet` option.

**Example:**
```sh
ui5lint --quiet
```

#### `--ignore-pattern`

Pattern/files that will be ignored during linting. Can also be defined in `ui5lint.config.js`.

**Example:**
```sh
ui5lint --ignore-pattern "webapp/thirdparty/**" "webapp/test/e2e/**"
```

#### `--config`

Load a custom config by relative file path (default: `./ui5lint.config.js`).

**Example:**
```sh
ui5lint --config ./ui5lint-custom.config.js
```

#### `--ui5-config`

Set a path for the desired UI5 yaml config file (default: `./ui5.yaml`).

**Example:**
```sh
ui5lint --ui5-config ./configs/ui5-custom.yaml
```

#### `--log-level`

Set the logging level (default: `info`).

Possible values are: `silent`, `error`, `warn`, `info`, `perf`, `verbose`, `silly`

**Example:**
```sh
ui5lint --log-level=warn
```

#### `--verbose`

Enable verbose logging.

**Example:**
```sh
ui5lint --verbose
```

#### `--perf`

Enable performance measurements and related logging.

**Example:**
```sh
ui5lint --perf
```

#### `--silent`

Disable all log output.

**Example:**
```sh
ui5lint --silent
```

#### `--version`

Prints the current version and CLI script location.

**Example:**
```sh
ui5lint --version
```

## Configuration

UI5 linter can easily be configured with an external configuration file, allowing you to customize how the linter behaves. For example, you can tell it to ignore specific files or directories. 

### Configuration File Location
The configuration file must be placed in the root directory of your project, alongside the `ui5.yaml` and `package.json` files. The linter will automatically detect and load the file when it runs.

### Supported Configuration File Names
You can name your configuration file using one of the following formats:
- `ui5lint.config.js`
- `ui5lint.config.mjs`
- `ui5lint.config.cjs`

If you need to specify a custom configuration file, you can provide it using the `--config` parameter via the command line.

### Configuration File Format

#### ESM (ECMAScript Modules):
```js
export default {
  ignores: [
    "webapp/thirdparty/**",
    "webapp/test/**",
    "!webapp/test/integration/**",
  ],
};
```

#### CommonJS:
```js
module.exports = {
  ignores: [
    "webapp/thirdparty/**",
    "webapp/test/**",
    "!webapp/test/integration/**",
  ],
};
```

### Configuration Options

- **ignores**: This option allows you to define glob patterns to ignore specific files or directories during linting. Patterns are relative to the root of the project. You can also un-ignore specific files by using the `!` prefix. The order of the patterns matters; later patterns override earlier ones.

  **Example:**
  ```js
  ignores: [
    "webapp/test/**",               // Ignore all files in the test folder
    "!webapp/test/integration/**",  // Un-ignore files in a specific subdirectory
  ];
  ```

  In this way, you can control which files UI5 linter should process and which it should ignore.

- **files**: This option allows you to specify glob patterns to target particular files or directories for linting. However, it does not enable you to include files that are typically excluded from the process (e.g., files outside the `webapp` directory in application projects). Only POSIX path separators (`/`) are supported, irrespective of the platform you're using.

  > **Note:** This option corresponds to the CLI command `ui5lint [files...]`. If CLI's `[files...]` are provided, the configuration gets ignored.

  **Example:**

  ```js
  files: [
    "webapp/index.html",
    "webapp/**/*",        // Lint all files and subdirectories within "webapp/"
  ];
  ```

## Directives

UI5 linter supports directives similar to ESLint's configuration comments, allowing you to control linting rules in specific sections of your code.

* **ui5lint-disable**: Disables all linting rules from the position of the comment
* **ui5lint-enable**: Re-enables linting rules that were disabled by ui5lint-disable
* **ui5lint-disable-line**: Disables all linting rules for the current line
* **ui5lint-disable-next-line**: Disables all linting rules for the next line

### Specifying Rules

**JavaScript / TypeScript**

You can disable specific rules by listing them after the directive. Rules must be separated by commas if several are given:

* `/* ui5lint-disable no-deprecated-api */`
* `/* ui5lint-disable no-deprecated-api, no-deprecated-library */`
* `// ui5lint-disable-line no-deprecated-api`

An explanation why a rule is disabled can be added after the rule name; it must be separated from the preceding text by two dashes:

* `// ui5lint-disable-next-line no-deprecated-api -- explanation`

**XML / HTML**

* `<!-- ui5lint-disable no-deprecated-api -->`
* `<!-- ui5lint-disable-next-line -->`
* `<Text tap=".onTap"/> <!-- ui5lint-disable-line no-deprecated-api -->`

In XML and HTML files, depending on your browser runtime, the use of a double-hyphen `--` is usually not allowed, making it impossible to append an explanation to your directive in the same way as shown above for JavaScript / TypeScript files. You need to insert a separate comment statement in the same line of code for this purpose:

* `<!-- ui5lint-disable-next-line no-deprecated-api --> <!-- explanation -->`

Also, since comments can't be placed inside XML and HTML tags, you might need to use `ui5lint-disable` and `ui5lint-enable` directives outside of the tags instead of `ui5lint-disable-line` or `ui5lint-disable-next-line`.

```xml
<!-- ui5lint-disable no-deprecated-api -->
<Text
  tap=".onTap"
/>
<!-- ui5lint-enable no-deprecated-api -->
```

**YAML**

* `# ui5lint-disable no-deprecated-api`
* `# ui5lint-disable-next-line`

### Scope

Directives are currently supported in JavaScript and TypeScript files as well as XML, HTML and YAML files.

## Node.js API

### `ui5lint`

The `ui5lint` function is the main entry point for the UI5 linter. It resolves with an array of `LinterResult` objects, identical to the CLI output with the `--format json` option.
See the [src/index.ts](./src/index.ts) file for the available options.

```js
import {ui5lint} from "@ui5/linter";

// Run the linter with default options
await ui5lint();

// Run the linter with custom options
await ui5lint({
	filePatterns: ["webapp/**/*.xml"],
	ignorePatterns: ["webapp/thirdparty/"],
	details: true,
	fix: true,
	config: "ui5lint-foo.config.mjs",
	noConfig: true,
	coverage: true,
	ui5Config: "ui5-lint.yaml",
	rootDir: "/path/to/project",
});
```

### `UI5LinterEngine`

The `UI5LinterEngine` class can be used to run `ui5lint` multiple times with different options while reusing and caching common parts to improve performance.

**Note:** The `lint` method can only be called once at a time. If you want to lint multiple projects in parallel, use worker threads or separate processes. The linting process is CPU-heavy and there is no benefit in parallelizing within the same Node.js process (single-threaded).

```js
import {UI5LinterEngine} from "@ui5/linter";

const linterEngine = new UI5LinterEngine();

// Run the linter with default options
await linterEngine.lint();

// Run the linter with custom options
await linterEngine.lint({
	filePatterns: ["webapp/**/*.xml"],
	ignorePatterns: ["webapp/thirdparty/"],
	details: true,
	fix: true,
	config: "ui5lint-foo.config.mjs",
	noConfig: true,
	coverage: true,
	ui5Config: "ui5-lint.yaml",
	rootDir: "/path/to/project",
});
```

## Internals

UI5 linter makes use of the [TypeScript compiler](https://github.com/microsoft/TypeScript/) to parse and analyze the source code (both JavaScript and TypesScript) of a UI5 project. This allows for a decent level of accuracy and performance.

For this purpose, UI5 linter provides the TypeScript compiler with the SAPUI5 [type definitions](https://sap.github.io/ui5-typescript/). The compiler can then infer the usage of UI5 classes and modules in the code. UI5 linter only needs to ask the compiler whether a given function or property is deprecated, and the compiler will provide this information with the full deprecation text.

In some cases, UI5 linter will transpile source files before analyzing them. For example, the `sap.ui.require` syntax is transpiled to `import` statements (basically ESM), so that the TypeScript compiler can understand them.

Similarly, UI5 XML views are transpiled to a JavaScript representation that can be analyzed in the same way as regular JavaScript code. In both cases, source maps are used to map any findings back to the correct line and column position in the original source code.

There are additional checks built on top of the compiler API. This applies, for example, to the usage of global variables provided by the UI5 framework (e.g. `sap.m.Button`), or to the correct usage of asynchronous component initialization.

For some checks, however, the TypeScript compiler approach is insufficient. In some of those cases, an extract of the data structure that powers the UI5 SDK is used (the so-called "api.json"). In other cases, the checks are hard-coded in the linter itself. For example for checks in manifest.json and HTML files.

## Support, Feedback, Contributing

This project is open to feature requests/suggestions, bug reports etc. via [GitHub issues](https://github.com/UI5/linter/issues). Contribution and feedback are encouraged and always welcome. For more information about how to contribute, the project structure, as well as additional contribution information, see our [Contribution Guidelines](CONTRIBUTING.md).

You can also chat with us in the [`#tooling`](https://openui5.slack.com/archives/C0A7QFN6B) channel of the [OpenUI5 Community Slack](https://ui5-slack-invite.cfapps.eu10.hana.ondemand.com/). For public Q&A, use the [`ui5-tooling` tag on Stack Overflow](https://stackoverflow.com/questions/tagged/ui5-tooling).

## Security / Disclosure
If you find any bug that may be a security problem, please follow our instructions at [in our security policy](https://github.com/UI5/linter/security/policy) on how to report it. Please do not create GitHub issues for security-related doubts or problems.

## Code of Conduct

We as members, contributors, and leaders pledge to make participation in our community a harassment-free experience for everyone. By participating in this project, you agree to abide by its [Code of Conduct](https://github.com/UI5/linter?tab=coc-ov-file#readme) at all times.

## Licensing

Copyright 2025 SAP SE or an SAP affiliate company and contributors. Please see our [LICENSE](./LICENSE) for copyright and license information. Detailed information including third-party components and their licensing/copyright information is available [via the REUSE tool](https://api.reuse.software/info/github.com/UI5/linter).
