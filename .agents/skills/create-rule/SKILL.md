---
name: create-rule
description: Create a new UI5 linter rule with custom AST-based detection. Use when adding a new lint rule that requires custom analysis logic beyond what TypeScript deprecation tags provide (e.g., checking specific API call patterns, validating constructor arguments, enforcing async flags, etc.).
argument-hint: "[rule-id] [short description]"
---

# Create a New UI5 Linter Rule

Create a new custom linter rule named `$0` for the UI5 linter project.

**Description**: $ARGUMENTS

## Step-by-step process

### Step 1: Define the message in `src/linter/messages.ts`

There are three places to update in this file, all tightly coupled:

**1a. Add the rule ID to the `RULES` object** (alphabetical order):

```typescript
export const RULES = {
  // ...existing rules...
  "$0": "$0",
  // ...existing rules...
} as const;
```

**1b. Add one or more `MESSAGE` enum entries** (alphabetical order):

Each distinct finding type the rule can report needs its own enum entry. Use SCREAMING_SNAKE_CASE.

```typescript
export enum MESSAGE {
  // ...existing entries...
  MY_NEW_MESSAGE,
  // ...existing entries...
}
```

**1c. Add `MESSAGE_INFO` entries** for each message:

```typescript
[MESSAGE.MY_NEW_MESSAGE]: {
  severity: LintMessageSeverity.Error, // or Warning
  ruleId: RULES["$0"],

  // The message function receives typed args and returns a user-facing string
  message: ({paramName}: {paramName: string}) =>
    `Description of the issue involving '${paramName}'`,

  // The details function provides additional context (shown with --details flag)
  // Use the same arg type. Can return undefined if no details are needed.
  details: ({details}: {details?: string}) =>
    details ? `Additional context: ${details}` : undefined,
},
```

**Important patterns for MESSAGE_INFO:**
- Both `message` and `details` receive the SAME args object (their types are merged via `MessageArgs`)
- Use `null` as args when calling `addMessage` if no args are needed (and define message/details with no parameters)
- The `details` field is optional in MESSAGE_INFO - omit it if there's nothing extra to show
- Severity: use `Error` for things that will break in UI5 2.x, `Warning` for recommendations

### Step 2: Implement the detection logic

For custom AST-based checks, there are two patterns:

**Pattern A: Inline in SourceFileLinter** (for checks triggered during standard AST traversal)

Add an analysis method to `src/linter/ui5Types/SourceFileLinter.ts`:

```typescript
// Add the hook in visitNode() at the appropriate node type check:
visitNode(node: ts.Node) {
  // ... existing checks ...
  
  // Example: Check class declarations that extend a specific UI5 class
  if (ts.isClassDeclaration(node) && 
      this.isUi5ClassDeclaration(node, "sap/ui/some/BaseClass")) {
    this.analyzeMyCustomRule(node);
  }
  
  // ... existing traversal ...
  ts.forEachChild(node, this.#boundVisitNode);
}

// Add the analysis method:
analyzeMyCustomRule(node: ts.ClassDeclaration) {
  const className = node.name?.text ?? "<unknown>";
  
  // Perform AST analysis...
  // Use helpers from utils/utils.ts:
  //   findClassMember(node, "memberName", [{modifier: ts.SyntaxKind.StaticKeyword}])
  //   getPropertyNameText(node.name)
  //   getPropertyAssignmentInObjectLiteralExpression("key", objectLiteral)
  
  // Report findings:
  this.#reporter.addMessage(MESSAGE.MY_NEW_MESSAGE, {
    paramName: className,
  }, {node});
}
```

**Pattern B: Separate module** (for complex checks with significant logic)

Create a new file like `src/linter/ui5Types/myCustomCheck.ts`:

```typescript
import ts from "typescript";
import SourceFileReporter from "./SourceFileReporter.js";
import {MESSAGE} from "../messages.js";
import type {LinterContext} from "../LinterContext.js";

export default function analyzeMyCustomRule({
  node,
  reporter,
  checker,
  context,
}: {
  node: ts.ClassDeclaration;
  reporter: SourceFileReporter;
  checker: ts.TypeChecker;
  context: LinterContext;
}) {
  // Complex analysis logic here...
  
  reporter.addMessage(MESSAGE.MY_NEW_MESSAGE, {
    paramName: "value",
  }, {node});
}
```

Then call it from `SourceFileLinter.visitNode()`:
```typescript
import analyzeMyCustomRule from "./myCustomCheck.js";
// ... in visitNode():
analyzeMyCustomRule({node, reporter: this.#reporter, checker: this.checker, context: this.typeLinter.getContext()});
```

**For non-JS/TS file types**, implement the check in the appropriate linter:
- XML: `src/linter/xmlTemplate/linter.ts`
- manifest.json: `src/linter/manifestJson/`
- HTML: `src/linter/html/`
- YAML: `src/linter/yaml/`

### Step 3: Create tests

**3a. Create the test entry file** at `test/lib/linter/rules/$0.ts`:

```typescript
import {fileURLToPath} from "node:url";
import {runLintRulesTests} from "../_linterHelper.js";

runLintRulesTests(fileURLToPath(import.meta.url));
```

**3b. Create fixture directories** under `test/fixtures/linter/rules/$0/`:

```
test/fixtures/linter/rules/$0/
  Positive_1/           # Code that SHOULD trigger the rule
    webapp/
      Component.js      # (or whatever files are relevant)
      manifest.json     # (include if needed by the check)
  Negative_1/           # Code that should NOT trigger the rule
    webapp/
      Component.js
      manifest.json
```

Naming conventions:
- `Positive_*` directories contain code with rule violations
- `Negative_*` directories contain valid code (no violations expected)
- Files starting with `_` are skipped
- Files starting with `only_` run in isolation (for debugging)
- Include a `manifest.json` with `"_version": "1.58.0"` and basic app descriptor if the linter needs project context

**3c. Run tests to generate snapshots**:

```bash
npm run unit -- test/lib/linter/rules/$0.ts
```

Then update snapshots:

```bash
npm run unit-update-snapshots -- test/lib/linter/rules/$0.ts
```

Snapshots are generated at:
- `test/lib/linter/snapshots/rules/$0.ts.md` (human-readable)
- `test/lib/linter/snapshots/rules/$0.ts.snap` (binary)

**3d. Verify the full test suite still passes**:

```bash
npm run unit
```

### Step 4: Document the rule in `docs/Rules.md`

Add a section (in alphabetical order among rules):

```markdown
## $0

Brief description of what the rule checks and why it matters for UI5 2.x compatibility.

**Details**
- What patterns are flagged
- What the correct alternative is

**Related information**
- [Link to relevant UI5 documentation](https://ui5.sap.com/#/topic/xxxxx)
```

## Key utilities and patterns

### AST node type guards
```typescript
ts.isClassDeclaration(node)
ts.isCallExpression(node)
ts.isPropertyAccessExpression(node)
ts.isObjectLiteralExpression(node)
ts.isStringLiteralLike(node)
ts.isNumericLiteral(node)
ts.isIdentifier(node)
ts.isArrayLiteralExpression(node)
ts.isPropertyAssignment(node)
```

### Common helper functions (from `src/linter/ui5Types/utils/utils.ts`)
```typescript
getPropertyNameText(name)                        // Safe property name extraction
findClassMember(classNode, name, modifiers)      // Find member by name+modifiers
isClassMethod(member, checker)                   // Check if member is callable
getPropertyAssignmentInObjectLiteralExpression(key, obj)   // Find property in object literal
getPropertyAssignmentsInObjectLiteralExpression(keys, obj) // Find multiple properties
getSymbolForPropertyInConstructSignatures(sigs, idx, name) // Find property in constructor args
extractNamespace(node)                           // Get full dotted namespace from access chain
isSourceFileOfUi5Type(sourceFile)                // Check if source is from UI5 types
```

### Checking UI5 class hierarchy
```typescript
// In SourceFileLinter, use the built-in helper:
this.isUi5ClassDeclaration(node, "sap/ui/core/Control")
this.isUi5ClassDeclaration(node, ["sap/ui/core/mvc/View", "sap/ui/core/XMLComposite"])
```

### Getting type information
```typescript
const type = this.checker.getTypeAtLocation(node);
const symbol = this.checker.getSymbolAtLocation(node);
const jsdocTags = symbol.getJsDocTags(this.checker);
```

### Reporting with node highlighting
Always pass the most specific node to `{node}` so the error highlights the right code:
```typescript
// Highlight the property assignment, not the whole object
this.#reporter.addMessage(MESSAGE.X, {arg: "val"}, {node: propertyAssignment});

// Highlight just the name, not the whole expression
this.#reporter.addMessage(MESSAGE.X, {arg: "val"}, {node: exprNode.name});
```

## Checklist before finishing

- [ ] Rule ID added to `RULES` object (alphabetical)
- [ ] MESSAGE enum entry added (alphabetical)
- [ ] MESSAGE_INFO entry with severity, ruleId, message, and optionally details
- [ ] Detection logic implemented with proper AST analysis
- [ ] Positive test fixtures (code that triggers the rule)
- [ ] Negative test fixtures (code that should NOT trigger the rule)
- [ ] Test file created and snapshots generated
- [ ] Rule documented in `docs/Rules.md`
- [ ] `npm run unit` passes
- [ ] `npm run lint` passes
