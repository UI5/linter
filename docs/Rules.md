# Rules Reference

- [Rules Reference](#rules-reference)
	- [async-component-flags](#async-component-flags)
	- [csp-unsafe-inline-script](#csp-unsafe-inline-script)
	- [no-ambiguous-event-handler](#no-ambiguous-event-handler)
	- [no-deprecated-api](#no-deprecated-api)
	- [no-deprecated-component](#no-deprecated-component)
	- [no-deprecated-control-renderer-declaration](#no-deprecated-control-renderer-declaration)
	- [no-deprecated-library](#no-deprecated-library)
	- [no-deprecated-theme](#no-deprecated-theme)
	- [no-globals](#no-globals)
	- [no-implicit-globals](#no-implicit-globals)
	- [no-pseudo-modules](#no-pseudo-modules)
	- [parsing-error](#parsing-error)
	- [autofix-error](#autofix-error)
	- [prefer-test-starter](#prefer-test-starter)
	- [ui5-class-declaration](#ui5-class-declaration)
	- [unsupported-api-usage](#unsupported-api-usage)
	- [no-outdated-manifest-version](#no-outdated-manifest-version)
	- [no-removed-manifest-property](#no-removed-manifest-property)
	- [no-renamed-manifest-property](#no-renamed-manifest-property)
	- [no-legacy-ui5-version-in-manifest-2](#no-legacy-ui5-version-in-manifest-2)
	- [no-incorrect-manifest-property-value](#no-incorrect-manifest-property-value)

## async-component-flags

Checks whether a Component is configured for asynchronous loading via the `sap.ui.core.IAsyncContentCreation` interface in the Component metadata or via `async` flags in the `manifest.json`.

**Related information**
- [Use Asynchronous Loading](https://ui5.sap.com/#/topic/676b636446c94eada183b1218a824717)
- [Component Metadata](https://ui5.sap.com/#/topic/0187ea5e2eff4166b0453b9dcc8fc64f)
- [sap.ui.core.IAsyncContentCreation](https://ui5.sap.com/1.136/#/api/sap.ui.core.IAsyncContentCreation)

## csp-unsafe-inline-script

Checks whether inline scripts are used in HTML files in accordance with Content Security Policy (CSP) best practices.

**Related information**
- [Content Security Policy](https://ui5.sap.com/#/topic/fe1a6dba940e479fb7c3bc753f92b28c)

## no-ambiguous-event-handler

Checks whether event handlers in XML views/fragments are prefixed by a dot '.' (i.e. represent a controller method) or refer to a local name (via `core:require` import).

**Related information**
- [Handling Events in XML Views](https://ui5.sap.com/#/topic/b0fb4de7364f4bcbb053a99aa645affe)

## no-deprecated-api

Checks whether deprecated APIs, features or parameters are used in the project.

**Related information**
- [Best Practices for Developers](https://ui5.sap.com/#/topic/28fcd55b04654977b63dacbee0552712)

## no-deprecated-component

Checks for dependencies to deprecated components in `manifest.json`.

**Related information**
- [Deprecated Themes and Libraries](https://ui5.sap.com/#/topic/a87ca843bcee469f82a9072927a7dcdb)

## no-deprecated-control-renderer-declaration

Checks whether the renderer of a control is declared correctly.

## no-deprecated-library

Checks for dependencies to deprecated libraries in `manifest.json` and `ui5.yaml`.

**Related information**
- [Deprecated Themes and Libraries](https://ui5.sap.com/#/topic/a87ca843bcee469f82a9072927a7dcdb)

## no-deprecated-theme

Checks for usage of deprecated themes in the code and HTML files.

**Related information**
- [Deprecated Themes and Libraries](https://ui5.sap.com/#/topic/a87ca843bcee469f82a9072927a7dcdb)

## no-globals

Checks for the usage of global variables in the code.

**Related information**
- [Best Practices for Developers](https://ui5.sap.com/#/topic/28fcd55b04654977b63dacbee0552712)

## no-implicit-globals

Checks whether:
- modules are accessed via the global library namespace that is exposed by the `library` module of a UI5 library
- `odata` globals are used implicitly in bindings without an explicit import of the corresponding modules

**Related information**
- [Best Practices for Developers](https://ui5.sap.com/#/topic/28fcd55b04654977b63dacbee0552712)

## no-pseudo-modules

Checks for dependencies to pseudo modules in the code.

**Related information**
- [Best Practices for Loading Modules - Migrating Access to Pseudo Modules](https://ui5.sap.com/#/topic/00737d6c1b864dc3ab72ef56611491c4)

## parsing-error

Syntax/parsing errors that appear during the linting process are reported with this rule.

## autofix-error

An expected autofix could not be applied. This is likely a UI5 linter internal issue. Please report this using the bug report template: [github.com/UI5/linter/issues/](https://github.com/UI5/linter/issues/new?template=bug-report.md)

## prefer-test-starter

Checks whether test-related files are using the Test Starter concept.

**Related information**
- [Test Starter](https://ui5.sap.com/#/topic/032be2cb2e1d4115af20862673bedcdb)

## ui5-class-declaration

Checks whether the declaration of UI5 classes is correct. This rule only applies to TypeScript code where built-in ECMAScript classes are used instead of an `.extend()` call.

## unsupported-api-usage

Checks whether the UI5 API is used correctly, for example, whether a formatter in a JavaScript/TypeScript binding declaration is of type `function`.

## no-outdated-manifest-version

Legacy-free UI5 requires Manifest Version 2. This test checks the `_version` property in `manifest.json`.

## no-removed-manifest-property

Manifest Version 2 lacks several properties of earlier versions, which do not match anymore to the new schema. They must be omitted.

## no-renamed-manifest-property

Manifest Version 2 renames several properties of earlier versions. Their names must be adjusted to match the new schema.

## no-legacy-ui5-version-in-manifest-2

Check for legacy UI5 versions in `minUI5Version` property in `manifest.json`

## no-incorrect-manifest-property-value

Checks whether property `type` is explicitly set to `View` in manifest version 2 when `sap.ui5/routing/config/type` is not omitted or set to `View`.
