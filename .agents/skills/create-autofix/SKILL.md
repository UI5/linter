---
name: create-autofix
description: Add a new autofix for a deprecated UI5 API. Autofixes are declarative fix definitions that map deprecated APIs to their replacements, registered in fix collection files under src/linter/ui5Types/fix/collections/. Use when adding migration support for a deprecated method, property, or import to a new or existing fix collection.
argument-hint: "[deprecated-api] [replacement-api]"
---

# Create a New UI5 Linter Autofix

Add an autofix that migrates `$0` to `$1`.

**Full context**: $ARGUMENTS

## Architecture overview

The autofix system has three layers:

1. **Fix collections** (`src/linter/ui5Types/fix/collections/`) - Declarative trees mapping deprecated APIs to fix callbacks using `Ui5TypeInfoMatcher`
2. **FixFactory** (`src/linter/ui5Types/fix/FixFactory.ts`) - Loads collections, matches incoming deprecation findings to fixes, provides factory functions
3. **Fix classes** (`src/linter/ui5Types/fix/`) - Concrete implementations that generate source code changes

## Step 1: Choose the right fix collection

Existing collections in `src/linter/ui5Types/fix/collections/`:

| File | Library | Used for |
|---|---|---|
| `sapUiCoreFixes.ts` | `sap.ui.core` | Core, Configuration, Theming, Lib, Element, Component, etc. |
| `jqueryFixes.ts` | `jquery` | jQuery.sap.* APIs (note: uses `namespace()` not `method()`) |
| `sapMFixes.ts` | `sap.m` | sap.m controls and utilities |
| `sapUiLayoutFixes.ts` | `sap.ui.layout` | sap.ui.layout controls |
| `sapUiCompFixes.ts` | `sap.ui.comp` | sap.ui.comp controls |
| `globalFixes.ts` | `global` | Global namespace access like `sap.ui.getCore()` |

If the deprecated API belongs to an existing library, add to that collection. If it belongs to a new library, create a new collection file (see "Creating a new collection" below).

## Step 2: Choose the right fix type

There are 7 fix types, each created via a factory function exported from `FixFactory.ts`:

### `accessExpressionFix` - Replace property/method access

For simple replacements where `old.method` becomes `newModule.method`.

```typescript
import {accessExpressionFix} from "../FixFactory.js";
import {FixScope} from "../BaseFix.js";

// Configuration.getTheme() => Theming.getTheme()
t.method("getTheme", accessExpressionFix({
  moduleName: "sap/ui/core/Theming",  // Module to import
  scope: FixScope.FirstChild,          // Replace up to first child in chain
}))

// Configuration.getWhitelistService() => Security.getAllowlistService()
t.method("getWhitelistService", accessExpressionFix({
  moduleName: "sap/ui/security/Security",
  propertyAccess: "getAllowlistService",  // Rename the method too
}))
```

**Parameters:**
- `moduleName` - Module to import as replacement
- `scope` - How much of the expression chain to replace (see FixScope below)
- `propertyAccess` - New property/method name (if different from original)
- `preferredIdentifier` - Preferred variable name for the import
- `globalName` - Use a global variable instead of importing
- `obsoleteModuleName` - Mark an old module import as removable

### `callExpressionFix` - Replace function calls

For replacing method calls where arguments are preserved as-is.

```typescript
import {callExpressionFix} from "../FixFactory.js";

// Configuration.setRTL(val) => Localization.setRTL(val)
t.method("setRTL", callExpressionFix({
  scope: FixScope.SecondChild,
  moduleName: "sap/base/i18n/Localization",
  mustNotUseReturnValue: true,  // Only apply if return value is unused
}))

// Configuration.setTheme(val) => Theming.setTheme(val)
t.method("setTheme", callExpressionFix({
  moduleName: "sap/ui/core/Theming",
  propertyAccess: "setTheme",
  mustNotUseReturnValue: true,
}))
```

**Parameters:** Same as `accessExpressionFix` plus:
- `mustNotUseReturnValue` - Only fix if the return value is not used (critical when return types differ)
- `newExpression` - Add `new` keyword to the replacement

### `callExpressionGeneratorFix` - Replace calls with custom code generation

For complex replacements where arguments need transformation or multiple imports are needed.

```typescript
import {callExpressionGeneratorFix} from "../FixFactory.js";

// Simple: Core.isMobile() => Device.browser.mobile
t.method("isMobile", callExpressionGeneratorFix({
  moduleName: "sap/ui/Device",
  generator: (ctx, [moduleIdentifier]) => {
    return `${moduleIdentifier}.browser.mobile`;
  },
}))

// Multiple imports: Core.getLocale() => new Locale(Localization.getLanguageTag())
t.method("getLocale", callExpressionGeneratorFix({
  moduleImports: [
    {moduleName: "sap/ui/core/Locale"},
    {moduleName: "sap/base/i18n/Localization"},
  ],
  generator(ctx, [localeId, localizationId]) {
    return `new ${localeId}(${localizationId}.getLanguageTag())`;
  },
}))

// With validation and shared context:
t.method("loadLibrary", callExpressionGeneratorFix<{json: string}>({
  moduleName: "sap/ui/core/Lib",
  validateArguments: (ctx, fixHelper, arg1, arg2) => {
    ctx.json = "";
    // Only migrate if async:true is set
    if (arg2?.kind === SyntaxKind.ObjectLiteralExpression) {
      let asyncOption = false;
      ts.forEachChild(arg2, function (node: ts.Node) {
        if (ts.isPropertyAssignment(node) &&
            ts.isIdentifier(node.name) && node.name.text === "async" &&
            node.initializer.kind === SyntaxKind.TrueKeyword) {
          asyncOption = true;
        }
      });
      if (ts.isStringLiteralLike(arg1)) {
        ctx.json = `{name: ${arg1.getFullText().trim()}}`;
      }
      return asyncOption;
    }
    return false; // Don't apply fix
  },
  generator: (ctx, [moduleIdentifier]) => {
    return `${moduleIdentifier}.load(${ctx.json})`;
  },
}))
```

**Parameters:**
- `moduleName` or `moduleImports` - Single or multiple modules to import
- `globalNames` - Global variables to use instead of imports
- `mustNotUseReturnValue` - Only fix if return value unused
- `validateArguments(ctx, fixHelpers, ...args)` - Return `false` to skip the fix. `ctx` is a custom object shared with `generator`. `fixHelpers` provides `checker` (TypeChecker), `manifestContent`, and `libraryDependencies`. `args` are the original call expression arguments as AST nodes.
- `generator(ctx, identifierNames, ...args)` - Return the replacement source code string. `identifierNames` are the resolved import identifiers. `args` are the original arguments as source code strings. Return `undefined` to skip.

### `accessExpressionGeneratorFix` - Replace property access with custom code

Like `callExpressionGeneratorFix` but for property access expressions (not calls).

```typescript
import {accessExpressionGeneratorFix} from "../FixFactory.js";

t.namespace("os", accessExpressionGeneratorFix({
  moduleName: "sap/ui/Device",
  generator: ([moduleIdentifier]) => {
    return `${moduleIdentifier}.os.android && ${moduleIdentifier}.system.phone`;
  },
}))
```

### `propertyAssignmentFix` - Rename or remove object properties

For fixing constructor parameters or settings objects.

```typescript
import {propertyAssignmentFix} from "../FixFactory.js";

// Remove the "synchronizationMode" property from ODataModel constructor
t.constr([
  t.constuctorParameter("mParameters", [
    t.property("synchronizationMode", propertyAssignmentFix({})),  // {} = delete
  ]),
])

// Rename a property
t.property("oldName", propertyAssignmentFix({property: "newName"}))
```

**Parameters:**
- `property` - New property name. If omitted, the property is deleted.

### `propertyAssignmentGeneratorFix` - Complex property transformations

```typescript
import {propertyAssignmentGeneratorFix} from "../FixFactory.js";

t.property("oldProp", propertyAssignmentGeneratorFix({
  validatePropertyAssignment: (ctx, helpers, propAssignment) => {
    // Return false to skip
    return ts.isStringLiteralLike(propAssignment.initializer);
  },
  generator: (ctx, propertyName, propertyInitializer) => {
    return `newProp: transformValue(${propertyInitializer})`;
    // Return "" to delete the property
  },
}))
```

### `obsoleteImportFix` - Remove unused imports after migration

Always placed on `t.export()` to mark the module import as removable.

```typescript
import {obsoleteImportFix} from "../FixFactory.js";

t.declareModule("sap/ui/core/Configuration", [
  t.class("Configuration", [
    // ... method fixes that migrate away from Configuration
  ]),
  t.export(obsoleteImportFix({
    moduleName: "sap/ui/core/Configuration",
  })),
]);
```

## FixScope reference

Controls how much of the expression chain gets replaced.

For the expression `sap.ui.core.Core.getConfiguration().getTheme()`:

| Scope | Replaces |
|---|---|
| `FixScope.FullExpression` (0) | Entire expression |
| `FixScope.FirstChild` (1) | `sap.ui.core.Core.getConfiguration().getTheme` (expression part of call) |
| `FixScope.SecondChild` (2) | `sap.ui.core.Core.getConfiguration()` |
| `FixScope.ThirdChild` (3) | `sap.ui.core.Core.getConfiguration` |
| `FixScope.FourthChild` (4) | `sap.ui.core.Core` |

**Common patterns:**
- `FullExpression` - When replacing `sap.ui.getCore()` entirely with `Core`
- `FirstChild` - When replacing `Config.getTheme()` with `Theming.getTheme()` (same args)
- `SecondChild` - When replacing `Config.setRTL(val)` with `Localization.setRTL(val)` and the Config access needs to be replaced but the method name stays

## Step 3: Add the fix declaration

### Adding to an existing collection

Open the appropriate collection file and add your declaration within the correct `declareModule` block (or add a new one):

```typescript
// In the existing collection file:

t.declareModule("sap/ui/core/SomeModule", [
  t.class("SomeClass", [
    // Your new fix:
    t.method("deprecatedMethod", accessExpressionFix({
      moduleName: "sap/ui/core/NewModule",
      scope: FixScope.FirstChild,
    })),
  ]),
]);
```

### Creating a new collection

1. Create `src/linter/ui5Types/fix/collections/myLibFixes.ts`:

```typescript
import Ui5TypeInfoMatcher from "../../Ui5TypeInfoMatcher.js";
import {FixTypeInfoMatcher, accessExpressionFix, callExpressionFix} from "../FixFactory.js";
import {FixScope} from "../BaseFix.js";

const t: FixTypeInfoMatcher = new Ui5TypeInfoMatcher("sap.my.lib");
export default t;

t.declareModule("sap/my/lib/SomeModule", [
  t.class("SomeClass", [
    t.method("deprecatedMethod", accessExpressionFix({
      moduleName: "sap/my/lib/NewModule",
      scope: FixScope.FirstChild,
    })),
  ]),
]);
```

2. Register it in `src/linter/ui5Types/fix/FixFactory.ts`:

```typescript
const AUTOFIX_COLLECTIONS = [
  "sapUiCoreFixes",
  "jqueryFixes",
  "sapMFixes",
  "sapUiLayoutFixes",
  "sapUiCompFixes",
  "globalFixes",
  "myLibFixes",  // Add here
];
```

The library name passed to `new Ui5TypeInfoMatcher("sap.my.lib")` must match the `library` field in the `Ui5TypeInfo` of the deprecated API for the matching to work.

## Step 4: Matcher builder API reference

The `Ui5TypeInfoMatcher` (`t`) provides these builder methods to declare the API tree:

```typescript
t.declareModule(moduleName, children)      // Top-level: declare a module
t.declareModules(moduleNames, children)    // Multiple modules with same children
t.declareNamespace(namespace, children)    // For global namespace (globalFixes)
t.class(name, children)                    // Class within a module
t.method(name, fixCallback)               // Instance method
t.methods(names, fixCallback)             // Multiple methods with same fix (returns array, use spread)
t.staticMethod(name, fixCallback)         // Static method
t.staticMethods(names, fixCallback)       // Multiple static methods
t.namespace(name, children | fixCallback) // Namespace/property (used heavily in jqueryFixes)
t.constr(children)                         // Constructor
t.constuctorParameter(name, children)     // Constructor parameter (note: typo is intentional)
t.property(name, fixCallback)             // Property in settings object
t.properties(names, fixCallback)          // Multiple properties
t.export(fixCallback)                      // Module default export (for obsoleteImportFix)
t.function(name, fixCallback)             // Standalone function
t.managedObjectSetting(name, fixCallback) // ManagedObject setting
t.metadataEvent(name, fixCallback)        // Metadata event property
t.metadataProperty(name, fixCallback)     // Metadata property
t.metadataAggregation(name, fixCallback)  // Metadata aggregation
```

**jQuery.sap note:** Since jQuery.sap APIs are not fully typed, the jQuery fixes collection uses `t.namespace()` for everything instead of `t.method()`. This is documented in `jqueryFixes.ts`.

## Step 5: Test the autofix

Autofix tests use fixture files with snapshot comparison.

**Add a fixture** at `test/fixtures/autofix/YourFixtureName.js`:

```javascript
sap.ui.define(["sap/ui/core/SomeModule"], function(SomeModule) {
  // Test the deprecated API usage
  SomeModule.deprecatedMethod("arg1");
  
  // Test edge cases
  var result = SomeModule.deprecatedMethod("arg1"); // Return value used
  SomeModule.deprecatedMethod(); // No arguments
});
```

**Run the autofix tests:**

```bash
npm run unit -- test/lib/autofix/autofix.projects.ts
```

**Update snapshots:**

```bash
npm run unit-update-snapshots -- test/lib/autofix/autofix.projects.ts
```

**Also run e2e tests** which exercise the full autofix pipeline:

```bash
npm run e2e
```

Snapshots are at:
- `test/lib/autofix/snapshots/autofix.projects.ts.md` (human-readable)
- `test/lib/autofix/snapshots/autofix.projects.ts.snap` (binary)

## Autofix development checklist (from docs/Development.md)

### For 1:1 replacements:
- [ ] Arguments have exactly the same type, order, value, and count
- [ ] Return type of the replacement matches exactly the original
- [ ] If return type is complex (enum/object): values/properties/methods match exactly

### For complex replacements:
- [ ] If return type differs: only migrate when return value is not used (use `mustNotUseReturnValue: true`)
- [ ] Check the legacy API for argument type checks/assertions
- [ ] Statically verify argument types using TypeChecker if the new API is stricter
- [ ] Preserve comments around shuffled/merged arguments
- [ ] Maintain whitespace and line breaks

### General:
- [ ] Fix declaration added to correct collection file
- [ ] Collection registered in `AUTOFIX_COLLECTIONS` (if new)
- [ ] Test fixtures cover positive cases (fixable)
- [ ] Test fixtures cover edge cases (not fixable / return value used / wrong arg types)
- [ ] Snapshots generated and reviewed
- [ ] `npm run unit` passes
- [ ] `npm run e2e` passes
