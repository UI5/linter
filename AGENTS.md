# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UI5 Linter (`@ui5/linter`) is a static code analysis tool that detects UI5 2.x compatibility issues. It scans JS, TS, XML, JSON, YAML, and HTML files for deprecated APIs, global variable usage, CSP violations, and deprecated configurations.

## Common Commands

```bash
npm run build              # Clean and compile TypeScript
npm run build-watch        # Watch mode compilation
npm test                   # Full suite: lint + type-check + coverage + e2e + knip + license-check
npm run unit               # Run all unit tests (AVA)
npm run unit -- test/lib/linter/someFile.ts  # Run a single test file
npm run unit-watch         # Watch mode for unit tests
npm run unit-update-snapshots    # Update unit test snapshots
npm run e2e                # Run end-to-end tests
npm run e2e:test-update-snapshots  # Update e2e snapshots
npm run lint               # ESLint check
npm run coverage           # Tests with coverage enforcement
```

## Architecture

### Linting Pipeline

1. **Entry**: CLI (`src/cli.ts`) or Node API (`src/index.ts` exports `ui5lint()` and `UI5LinterEngine`)
2. **Orchestration**: `src/linter/linter.ts` creates a UI5 project graph, virtual filesystem, loads config (`ui5lint.config.js`), and calls `lintWorkspace()`
3. **Workspace**: `src/linter/lintWorkspace.ts` dispatches files to specialized linters in parallel
4. **Results**: Virtual paths mapped back to real file paths; results sorted deterministically

### AMD to ESM Transpilation

TypeScript lacks understanding of UI5's proprietary `sap.ui.define`/`sap.ui.require` APIs. The `amdTranspiler/` rewrites these to ECMAScript Module imports before TypeScript analysis. It also rewrites `Class.extend()` calls to ES6 class syntax with `export default`. Source maps are generated during transpilation to map findings back to original positions.

A virtual filesystem combines: UI5 types from node_modules (`@sapui5/types`), static types from `/resources/types/`, and the project's source files — enabling the TypeScript compiler to resolve all references.

### Specialized Linters

Each file type has its own linter under `src/linter/`:

- **`ui5Types/`** - JS/TS files. Uses the TypeScript compiler API with `@sapui5/types` definitions. `SourceFileLinter.ts` is the main detector (~70KB). AMD modules are transpiled to ESM via `amdTranspiler/` before analysis.
- **`xmlTemplate/`** - XML views/fragments. Transpiles XML to pseudo-JavaScript (controls become constructor calls with properties as arguments), then runs TypeScript analysis. Source maps map findings back to XML positions. Generates TS definitions for controller references.
- **`html/`** - Bootstrap HTML files (index.html). Checks bootstrap configuration parameters.
- **`manifestJson/`** - manifest.json. Schema validation, deprecated libraries, model types.
- **`yaml/`** - ui5.yaml config files. Deprecated framework versions.
- **`dotLibrary/`** - .library files. Framework version compatibility.
- **`fileTypes/`** - Detects deprecated view formats (.view.json, .view.html, etc.)
- **`binding/`** - Data binding expression linting.

### Detection Rules

Key rule IDs and what they detect:

- **`no-deprecated-api`** — Deprecated classes, properties, events, methods, aggregations, associations, module imports, partially deprecated APIs (e.g. specific parameter combinations), deprecated view/fragment file types, manifest.json deprecated settings
- **`no-globals`** — Usage of UI5 modules via global namespace (e.g. `sap.m.Button` instead of importing `sap/m/Button`). Allowed globals: `sap.ui.define`, `sap.ui.require`, `sap.ui.require.toUrl`, `sap.ui.loader.config`
- **`no-pseudo-modules`** — Importing enums as modules instead of importing the library module they are declared in
- **`async-component-flags`** — Missing async flags in manifest.json routing configuration

### Rules and Messages

Rules are defined in `src/linter/messages.ts`:
- `RULES` object defines ~24 rule IDs (e.g. `no-deprecated-api`, `no-globals`, `async-component-flags`)
- `MESSAGE` enum defines 98+ message types
- `MESSAGE_INFO` maps each message to its rule ID and severity

### Autofix System

`src/autofix/` applies fixes iteratively (up to 11 passes for cascading changes). Fix implementations live in `src/linter/ui5Types/fix/` with a base `Fix` class and specialized subclasses. Source maps are used throughout to map transpiled positions back to original source.

**Terminology**: Always use "Autofix" (not "Auto-Fix", "AutoFix", "autoFix", or "Auto Fix").

**Fix lifecycle** (5 steps per pass):
1. Lint source code and create preliminary fixes (collecting info from transpiled AST and TypeChecker)
2. Collect abstract modifications — ranges of anticipated changes, import requests, and unused dependencies
3. Collect module declarations, process import requests, resolve identifiers (e.g. `Button` or `Button2` if name conflict)
4. Generate concrete changes (`INSERT`, `REPLACE`, `DELETE` operations with absolute character positions)
5. Apply changes to the source string and write back to disk

**Conflict resolution**: When two fixes touch the same code range, all but one are discarded. Fixes are not guaranteed to be applied in order. Each fix must produce consistent, syntactically correct source code independently.

**Fix categories**:
- **Fixes** (`--fix`): Guaranteed correct, produce working code, applied automatically
- **Suggested Fixes** (future `--suggest-fixes`): More complex, may require manual review

### Autofix Restrictions

General limitations on what cannot be autofixed (see `docs/Scope-of-Autofix.md` for full details):
- **Code outside `sap.ui.define`/`sap.ui.require`** — fixes that require adding module imports cannot be applied
- **Sync to async API changes** — requires restructuring code flow, often affecting multiple files
- **Complex API replacements** — multiple API calls and new local variables needed
- **Context-dependent replacements** — behavior depends on broader usage context
- **Return value usage** — differing return types make automatic replacement impossible when return value is used

### Directives

Inline comments disable/enable rules per-line:
- JS/TS: `/* ui5lint-disable rule1, rule2 */`
- XML/HTML: `<!-- ui5lint-disable rule1, rule2 -->`
- YAML: `# ui5lint-disable rule1, rule2`

Variants: `ui5lint-disable`, `ui5lint-enable`, `ui5lint-disable-line`, `ui5lint-disable-next-line`. A description can follow `--` (e.g. `// ui5lint-disable-line no-deprecated-api -- explanation`).

**Implementation**: Directives are retrieved from the unmodified source file and collected on the LinterContext. After linting (possibly on transpiled code), directives are applied during final report generation to drop disabled findings.

## Code Style

- **Indentation**: Tabs
- **Quotes**: Double quotes
- **Semicolons**: Required
- **Max line length**: 120 characters
- **Object spacing**: No spaces in `{}`
- **Line breaks**: LF only

## Git Conventions

- **Conventional Commits** required. Valid types: `build`, `ci`, `deps`, `docs`, `feat`, `fix`, `perf`, `refactor`, `release`, `revert`, `style`, `test`
- Format: `type(scope): Sentence case description`
- **Rebase** instead of merge to update branches
- Body max line length: 160 characters

## Testing

- **Framework**: AVA with `tsx/esm` loader
- **Unit tests**: `test/lib/**/*.ts` (20s timeout)
- **E2E tests**: `test/e2e/**/*.ts` (60s timeout)
- **Fixtures**: `test/fixtures/`
- **Coverage thresholds**: 89% statements/lines, 82% branches, 95% functions
- Worker threads are disabled (`workerThreads: false`)

## Key Resources

- `/resources/api-extract.json` - UI5 API metadata (extracted from SAPUI5 SDK)
- `/resources/types/pseudo-modules/` - Additional module declarations for pseudo module detection
- `@sapui5/types` npm package - TypeScript definitions for all SAPUI5 libraries (public/protected API only; does not include `@ui5-restricted` or `@private` API)
- `docs/Scope-of-Autofix.md` - Lists APIs that cannot be replaced automatically and why
- `docs/Development.md` - Development guidelines and autofix implementation checklist

## Autofix Development

When implementing autofix solutions, follow the checklist in `docs/Development.md`:
- **1:1 replacements**: Arguments must have exactly the same type, order, value, and count. Return type must match exactly.
- **Complex replacements**: Only migrate when return value is unused if types differ. Statically verify argument types via TypeScript TypeChecker. Preserve comments, whitespace, and line breaks.
- Use `isExpectedValueExpression()` utility or `mustNotUseReturnValue` flag to guard against return-type mismatches.
