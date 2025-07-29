import ts, {SyntaxKind} from "typescript";
import Ui5TypeInfoMatcher from "../../Ui5TypeInfoMatcher.js";
import {
	FixTypeInfoMatcher,
	accessExpressionFix,
	callExpressionFix,
	callExpressionGeneratorFix,
	obsoleteImportFix,
	propertyAssignmentFix,
} from "../FixFactory.js";
import {FixScope} from "../BaseFix.js";

const t: FixTypeInfoMatcher = new Ui5TypeInfoMatcher("sap.ui.core");
export default t;

t.declareModule("sap/ui/core/Configuration", [
	t.class("Configuration", [
		...t.methods(["setRTL", "setLanguage"], callExpressionFix({
			scope: FixScope.SecondChild,
			moduleName: "sap/base/i18n/Localization",
			mustNotUseReturnValue: true,
		})),
		t.method("getAccessibility", accessExpressionFix({
			moduleName: "sap/ui/core/ControlBehavior",
			propertyAccess: "isAccessibilityEnabled",
		})),
		t.method("getActiveTerminologies", accessExpressionFix({
			moduleName: "sap/base/i18n/Localization",
			propertyAccess: "getActiveTerminologies",
		})),
		t.method("getAllowlistService", accessExpressionFix({
			moduleName: "sap/ui/security/Security",
			propertyAccess: "getAllowlistService",
		})),
		t.method("getAnimation", callExpressionFix({
			moduleName: "sap/ui/core/ControlBehavior",
			propertyAccess: "getAnimationMode",
			// Note: The new API returns an enum value instead of a boolean, therefore
			// migration is currently not possible if the return value is used
			// This could be optimized with an advanced migration that detects how the return
			// value is used and e.g. migrates to something like
			// (getAnimationMode() !== sap.ui.core.Configuration.AnimationMode.none)
			// Right now this migration probably wont apply for most cases
			mustNotUseReturnValue: true,
		})),
		t.method("getAnimationMode", accessExpressionFix({
			scope: FixScope.FirstChild,
			moduleName: "sap/ui/core/ControlBehavior",
		})),
		t.method("getCalendarType", accessExpressionFix({
			moduleName: "sap/base/i18n/Formatting",
			scope: FixScope.FirstChild,
		})),
		t.method("getCalendarWeekNumbering", accessExpressionFix({
			moduleName: "sap/base/i18n/Formatting",
			scope: FixScope.FirstChild,
		})),
		t.method("getFrameOptions", accessExpressionFix({
			moduleName: "sap/ui/security/Security",
			scope: FixScope.FirstChild,
		})),
		t.method("getFormatLocale", callExpressionGeneratorFix({
			moduleName: "sap/base/i18n/Formatting",
			generator: (ctx, [moduleIdentifier]) => {
				return `${moduleIdentifier}.getLanguageTag().toString()`;
			},
		})),
		t.method("getLanguage", accessExpressionFix({
			moduleName: "sap/base/i18n/Localization",
			scope: FixScope.FirstChild,
		})),
		t.method("getLanguageTag", callExpressionGeneratorFix({
			moduleName: "sap/base/i18n/Localization",
			generator: (ctx, [localizationIdentifier]) => {
				return `${localizationIdentifier}.getLanguageTag().toString()`;
			},
		})),
		t.method("getLocale", callExpressionGeneratorFix({
			moduleImports: [{
				moduleName: "sap/ui/core/Locale",
			}, {
				moduleName: "sap/base/i18n/Localization",
			}],
			generator(ctx, [localeIdentifier, localizationIdentifier]) {
				return `new ${localeIdentifier}(${localizationIdentifier}.getLanguageTag())`;
			},
		})),
		t.method("getRTL", accessExpressionFix({
			moduleName: "sap/base/i18n/Localization",
			propertyAccess: "getRTL",
		})),
		t.method("getSAPLogonLanguage", accessExpressionFix({
			moduleName: "sap/base/i18n/Localization",
			scope: FixScope.FirstChild,
		})),
		t.method("getSecurityTokenHandlers", accessExpressionFix({
			moduleName: "sap/ui/security/Security",
			scope: FixScope.FirstChild,
		})),
		t.method("getTheme", accessExpressionFix({
			moduleName: "sap/ui/core/Theming",
			scope: FixScope.FirstChild,
		})),
		t.method("getTimezone", accessExpressionFix({
			moduleName: "sap/base/i18n/Localization",
			scope: FixScope.FirstChild,
		})),
		t.method("getUIDPrefix", accessExpressionFix({
			moduleName: "sap/ui/base/ManagedObjectMetadata",
			scope: FixScope.FirstChild,
		})),
		t.method("getWhitelistService", accessExpressionFix({
			moduleName: "sap/ui/security/Security",
			propertyAccess: "getAllowlistService",
		})),
		t.method("setAnimationMode", accessExpressionFix({
			moduleName: "sap/ui/core/ControlBehavior",
			scope: FixScope.FirstChild,
		})),
		t.method("setCalendarType", callExpressionFix({
			moduleName: "sap/base/i18n/Formatting",
			propertyAccess: "setCalendarType",
			mustNotUseReturnValue: true,
		})),
		t.method("setCalendarWeekNumbering", callExpressionFix({
			moduleName: "sap/base/i18n/Formatting",
			propertyAccess: "setCalendarWeekNumbering",
			mustNotUseReturnValue: true,
		})),
		t.method("setFormatLocale", callExpressionFix({
			moduleName: "sap/base/i18n/Formatting",
			propertyAccess: "setLanguageTag",
			mustNotUseReturnValue: true,
		})),
		t.method("setSecurityTokenHandlers", accessExpressionFix({
			moduleName: "sap/ui/security/Security",
			scope: FixScope.FirstChild,
		})),
		t.method("setTheme", callExpressionFix({
			moduleName: "sap/ui/core/Theming",
			propertyAccess: "setTheme",
			mustNotUseReturnValue: true,
		})),
		t.method("setTimezone", callExpressionFix({
			moduleName: "sap/base/i18n/Localization",
			propertyAccess: "setTimezone",
			mustNotUseReturnValue: true,
		})),
	]),
	t.export(obsoleteImportFix({
		moduleName: "sap/ui/core/Configuration",
	})),
]);

t.declareModule("sap/ui/core/Core", [
	t.class("Core", [
		// Core.attachInit|attachInitEvent => Core.ready
		...t.methods(["attachInit", "attachInitEvent"], accessExpressionFix({
			scope: FixScope.FullExpression,
			moduleName: "sap/ui/core/Core",
			propertyAccess: "ready",
		})),
		...t.methods(["getControl", "getElementById", "byId"], accessExpressionFix({
			scope: FixScope.FullExpression,
			moduleName: "sap/ui/core/Element",
			propertyAccess: "getElementById",
		})),
		// Core.getEventBus => EventBus.getInstance
		t.method("getEventBus", accessExpressionFix({
			scope: FixScope.FullExpression,
			moduleName: "sap/ui/core/EventBus",
			propertyAccess: "getInstance",
		})),
		// Core.getConfiguration() => Configuration
		t.method("getConfiguration", callExpressionFix({
			scope: FixScope.FullExpression,
			moduleName: "sap/ui/core/Configuration",
		})),
		// Core.getStaticAreaRef => StaticArea.getDomRef
		t.method("getStaticAreaRef", accessExpressionFix({
			scope: FixScope.FullExpression,
			moduleName: "sap/ui/core/StaticArea",
			propertyAccess: "getDomRef",
		})),
		// Core.initLibrary => Lib.init
		t.method("initLibrary", accessExpressionFix({
			scope: FixScope.FullExpression,
			moduleName: "sap/ui/core/Lib",
			propertyAccess: "init",
		})),
		// Core.isMobile() => Device.browser.mobile
		t.method("isMobile", callExpressionGeneratorFix({
			moduleName: "sap/ui/Device",
			generator: (ctx, [moduleIdentifier]) => {
				return `${moduleIdentifier}.browser.mobile`;
			},
		})),
		// Core.notifyContentDensityChanged => Theming.notifyContentDensityChanged
		t.method("notifyContentDensityChanged", accessExpressionFix({
			scope: FixScope.FirstChild,
			moduleName: "sap/ui/core/Theming",
		})),
		// Core.getCurrentFocusedControlId => Element.getActiveElement()?.getId() || null
		t.method("getCurrentFocusedControlId", callExpressionGeneratorFix({
			moduleName: "sap/ui/core/Element",
			// The legacy API used to return null if no control was focused.
			generator: (ctx, [moduleIdentifier]) => {
				return `${moduleIdentifier}.getActiveElement()?.getId() || null`;
			},
		})),
		t.method("byFieldGroupId", callExpressionGeneratorFix({
			moduleName: "sap/ui/core/Control",
			generator: (ctx, [moduleIdentifier], arg1) => {
				return `${moduleIdentifier}.getControlsByFieldGroupId(${arg1})`;
			},
		})),
		t.method("isStaticAreaRef", callExpressionGeneratorFix({
			moduleName: "sap/ui/core/StaticArea",
			generator: (ctx, [moduleIdentifier], arg1) => {
				return `${moduleIdentifier}.getDomRef() === ${arg1}`;
			},
		})),
		// Migrate only if second argument is omitted or undefined
		t.method("applyTheme", callExpressionGeneratorFix({
			moduleName: "sap/ui/core/Theming",
			validateArguments: (_ctx, _fixHints, _arg1, arg2) => {
				// Migrate only if second argument is omitted or undefined
				if (!arg2 || (ts.isIdentifier(arg2) && arg2.text === "undefined")) {
					return true;
				}
				return false;
			},
			generator: (ctx, [moduleIdentifier], arg1) => {
				return `${moduleIdentifier}.setTheme(${arg1})`;
			},
		})),
		// Note that alternative replacement Component.get is meanwhile deprecated, too
		t.method("getComponent", accessExpressionFix({
			moduleName: "sap/ui/core/Component",
			propertyAccess: "getComponentById",
		})),
		// Individual arguments must be mapped to "options" object
		// The new API has no sync loading option, replacement is only safe when the options contain async:true
		t.method("loadLibrary", callExpressionGeneratorFix<{json: string}>({
			moduleName: "sap/ui/core/Lib",
			validateArguments: (ctx, fixHelper, arg1, arg2) => {
				ctx.json = "";
				if (arg2?.kind === SyntaxKind.ObjectLiteralExpression) {
					let asyncOption = false;
					const parts: string[] = [];
					ts.forEachChild(arg2, function (node: ts.Node) {
						if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name) && node.name.text === "async") {
							if (node.initializer.kind === SyntaxKind.TrueKeyword) {
								asyncOption = true; // Migration is possible, async loading is enabled
							} else if (ts.isIdentifier(node.initializer)) {
								const {checker} = fixHelper;
								const type = checker.getTypeAtLocation(node.initializer);
								if ("intrinsicName" in type && type.intrinsicName === "true") {
									asyncOption = true;
								}
							}
						} else if (ts.isShorthandPropertyAssignment(node) &&
							ts.isIdentifier(node.name) && node.name.text === "async") {
							const {checker} = fixHelper;
							const actualSymbol = checker.getShorthandAssignmentValueSymbol(node);

							if (actualSymbol?.valueDeclaration &&
								ts.isVariableDeclaration(actualSymbol.valueDeclaration) &&
								actualSymbol.valueDeclaration.initializer?.kind === SyntaxKind.TrueKeyword) {
								asyncOption = true;
							}
						}

						if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name)) {
							const name = node.name.text;
							if (ts.isStringLiteralLike(node.initializer) || ts.isIdentifier(node.initializer)) {
								parts.push(`${name}: ${node.initializer.getFullText().trim()}`);
							}
						} else if (ts.isShorthandPropertyAssignment(node) && ts.isIdentifier(node.name)) {
							parts.push(`${node.getFullText().trim()}`);
						}
					});
					if (ts.isStringLiteralLike(arg1)) {
						parts.push(`name: ${arg1.getFullText().trim()}`);
					} else if (ts.isIdentifier(arg1)) {
						parts.push(`name: ${arg1.getFullText().trim()}`);
					}

					ctx.json = `{${parts.join(", ")}}`;
					return asyncOption;
				} else if (arg2?.kind === SyntaxKind.TrueKeyword) {
					if (ts.isStringLiteralLike(arg1) || ts.isIdentifier(arg1)) {
						ctx.json = `{name: ${arg1.getFullText()}}`;
					}
					return true; // Migration is possible, async loading is enabled
				} else {
					return false; // Migration is not possible
				}
			},
			generator: (ctx, [moduleIdentifier]) => {
				return `${moduleIdentifier}.load(${ctx.json})`;
			},
		})),
		// Individual arguments must be mapped to "options" object.
		// The old API defaults to sync component creation. It then cannot be safely replaced with Component.create.
		// Only when the first argument is an object defining async: true a migration is possible.
		t.method("createComponent", callExpressionGeneratorFix<{json: string}>({
			moduleName: "sap/ui/core/Component",
			validateArguments: (ctx, fixHints, vComponent) => {
				ctx.json = "";
				if (vComponent?.kind === SyntaxKind.ObjectLiteralExpression) {
					let asyncOption = false;
					ts.forEachChild(vComponent, function (node: ts.Node) {
						if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name) && node.name.text === "async") {
							if (node.initializer.kind === SyntaxKind.TrueKeyword) {
								asyncOption = true; // Migration is possible, async loading is enabled
							} else if (ts.isIdentifier(node.initializer)) {
								const {checker} = fixHints;
								const type = checker.getTypeAtLocation(node.initializer);
								if ("intrinsicName" in type && type.intrinsicName === "true") {
									asyncOption = true;
								}
							}
						} else if (ts.isShorthandPropertyAssignment(node) &&
							ts.isIdentifier(node.name) && node.name.text === "async") {
							const {checker} = fixHints;
							const actualSymbol = checker.getShorthandAssignmentValueSymbol(node);

							if (actualSymbol?.valueDeclaration &&
								ts.isVariableDeclaration(actualSymbol.valueDeclaration) &&
								actualSymbol.valueDeclaration.initializer?.kind === SyntaxKind.TrueKeyword) {
								asyncOption = true;
							}
						}
					});

					if (asyncOption) {
						const parts: string[] = [];
						const extractJson = (node: ts.Node) => {
							ts.forEachChild(node, function (node: ts.Node) {
								if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name)) {
									const name = node.name.getFullText().trim();
									if (ts.isStringLiteralLike(node.initializer) || ts.isIdentifier(node.initializer)) {
										parts.push(`${name}: ${node.initializer.getFullText().trim()}`);
									}
								} else if (ts.isShorthandPropertyAssignment(node) && ts.isIdentifier(node.name)) {
									parts.push(`${node.getFullText().trim()}`);
								}
							});
						};
						extractJson(vComponent);
						ctx.json = `{${parts.join(", ")}}`;
					}
					return asyncOption;
				} else {
					return false; // Migration is not possible (sync component creation)
				}
			},
			generator: (ctx, [moduleIdentifier]) => {
				return `${moduleIdentifier}.create(${ctx.json})`;
			},
		})),
		// Parameter bAsync has to be omitted or set to false since the new API returns
		// the resource bundle synchronously. When bAsync is true, the new API is not a replacement
		// as it does not return a promise. In an await expression, it would be okay, but otherwise not.
		// sLibrary must be a library.
		t.method("getLibraryResourceBundle", callExpressionGeneratorFix({
			moduleName: "sap/ui/core/Lib",
			validateArguments: (ctx: {fallback: string}, fixHints, arg1, arg2, arg3) => {
				// Handling fallback in the legacy API
				if (!arg1 ||
					(ts.isIdentifier(arg1) && arg1.text === "undefined")) {
					ctx.fallback = "\"sap.ui.core\"";
					return true; // No library name provided, use default "sap.ui.core"
				}

				// If any of the arguments is a boolean with value true, the return value is a promise
				// and is not compatible with the new API
				if ([arg1?.kind, arg2?.kind, arg3?.kind].includes(SyntaxKind.TrueKeyword)) {
					return false; // Migration not possible. The new API is synchronous.
				}

				// Check if the library is a valid library name
				// Extract the namespace from the virtual path
				let libNamespace: string | undefined = undefined;
				if (ts.isStringLiteralLike(arg1)) {
					libNamespace = arg1.text;
				}

				// Check in libraries defined in manifest.json if the library is there
				if (fixHints?.libraryDependencies?.[libNamespace ?? ""]) {
					return true;
				}

				const {fileName} = arg1.getSourceFile();
				if (libNamespace && fileName.startsWith("/resources")) {
					const namespace = fileName.split("/").slice(2, -1).join(".");
					if (namespace.startsWith(libNamespace)) {
						return true;
					}
				}

				const libName = `"${libNamespace?.replaceAll(".", "/")}/library"`;
				return !!fixHints.checker.getAmbientModules()
					.find((ambientModule) => ambientModule.getName() === libName);
			},
			generator: (ctx, [moduleIdentifier], arg1, arg2) => {
				return `${moduleIdentifier}.getResourceBundleFor(${ctx.fallback ?? arg1}${arg2 ? ", " + arg2 : ""})`;
			},
		})),
		// Do not migrate if second argument is provided.
		// We can't generate a ".bind" call since detaching wouldn't be possible anymore
		t.method("attachIntervalTimer", callExpressionGeneratorFix({
			moduleName: "sap/ui/core/IntervalTrigger",
			validateArguments: (_ctx, _fixHints, _arg1, arg2) => {
				return !arg2 || (ts.isIdentifier(arg2) && arg2.text === "undefined");
			},
			generator: (_ctx, [moduleIdentifier], arg1) => {
				return `${moduleIdentifier}.addListener(${arg1})`;
			},
		})),
		// Do not migrate if second argument is provided.
		// We can't generate a ".bind" call since detaching wouldn't be possible anymore
		t.method("detachIntervalTimer", callExpressionGeneratorFix({
			moduleName: "sap/ui/core/IntervalTrigger",
			validateArguments: (_ctx, _fixHints, _arg1, arg2) => {
				return !arg2 || (ts.isIdentifier(arg2) && arg2.text === "undefined");
			},
			generator: (ctx, [moduleIdentifier], arg1) => {
				return `${moduleIdentifier}.removeListener(${arg1})`;
			},
		})),

		// Migration to sap/ui/core/tmpl/Template.byId(sId) not possible
		// Template is deprecated, there is no valid replacement in UI5 2.0
		// ["getTemplate", {}],

		// Migration to sap/base/i18n/Localization.attachChange(fnFunction) not possible
		// The Event object has a different API than on the Core facade. There is no more getParameters().
		// Since we can't analyze the callback function with enough certainty, no migration shall be attempted.
		// Also no migration is possible if the second argument is provided. We can't generate a ".bind" call
		// since detaching wouldn't be possible anymore.
		// ["attachLocalizationChanged", {}],

		// Migration to sap/ui/core/Theming.attachApplied(fnFunction) not possible
		// The Event object has a different API than on the Core facade. There is no more getParameters().
		// Since we can't analyze the callback function with enough certainty, no migration shall be attempted.
		// Also no migration is possible the second argument is provided. We can't generate a ".bind" call since
		// detaching wouldn't be possible anymore.
		// ["attachThemeChanged", {}],

		// Migration not possible. See attach method.
		// ["detachLocalizationChanged", {}],

		// Migration not possible
		// ["detachThemeChanged", {}],

		// Migration not possible
		// ["applyChanges", {}],

		// Migration not possible
		// ["attachControlEvent", {}],

		// Migration not possible
		// ["attachFormatError", {}],

		// Migration not possible
		// Recommended replacement only available on ManagedObject
		// ["attachParseError", {}],

		// Migration not possible
		// Recommended replacement only available on ManagedObject
		// ["attachValidationError", {}],

		// Migration not possible
		// Recommended replacement only available on ManagedObject
		// ["attachValidationSuccess", {}],

		// Migration not possible
		// API has been removed, migration likely involves more than removing the usage
		// ["createRenderManager", {}],

		// Migration not possible
		// Unclear which control to use
		// ["createUIArea", {}],

		// Migration not possible
		// ["detachControlEvent", {}],

		// Migration not possible
		// Recommended replacement only available on ManagedObject
		// ["detachFormatError", {}],

		// Migration not possible
		// Recommended replacement only available on ManagedObject
		// ["detachParseError", {}],

		// Migration not possible
		// Recommended replacement only available on ManagedObject
		// ["detachValidationError", {}],

		// Migration not possible
		// Recommended replacement only available on ManagedObject
		// ["detachValidationSuccess", {}],

		// Migration not possible
		// Recommended replacement only available on ManagedObject
		// ["fireFormatError", {}],

		// Migration not possible
		// Recommended replacement only available on ManagedObject
		// ["fireParseError", {}],

		// Migration not possible
		// Recommended replacement only available on ManagedObject
		// ["fireValidationError", {}],

		// Migration not possible
		// Recommended replacement only available on ManagedObject
		// ["fireValidationSuccess", {}],

		// Migration not possible
		// API has been removed, migration likely involves more than removing the usage
		// ["getApplication", {}],

		// Migration not possible
		// API has been removed, migration likely involves more than removing the usage
		// There is a public replacement for the most common use case that checks the
		// result for a single library (Library.isLoaded(name))
		// ["getLoadedLibraries", {}],

		// Migration not possible
		// Different return types -> Manual migration necessary
		// ["getMessageManager", {}],

		// Migration not possible
		// ["getModel", {}],

		// Migration not possible
		// API has been removed, migration likely involves more than removing the usage
		// ["getRenderManager", {}],

		// Migration not possible
		// ["getRootComponent", {}],

		// Migration not possible
		// We can't determine whether the static UIArea is requested
		// ["getUIArea", {}],

		// Migration not possible
		// API has been removed, migration likely involves more than removing the usage
		// ["getUIDirty", {}],

		// Migration not possible
		// Recommended replacement only available on ManagedObject
		// ["hasModel", {}],

		// Migration not possible
		// API has been removed, migration likely involves more than removing the usage
		// ["includeLibraryTheme", {}],

		// Migration not possible
		// API has been removed, migration likely involves more than removing the usage
		// ["isInitialized", {}],

		// Migration not possible
		// API has been removed, migration likely involves more than removing the usage
		// ["isLocked", {}],

		// Migration not possible
		// Developers should migrate to the theme-applied event
		// ["isThemeApplied", {}],

		// Migration not possible
		// API has been removed, migration likely involves more than removing the usage
		// ["lock", {}],

		// Migration not possible
		// ["registerPlugin", {}],

		// Migration not possible
		// ["sap.ui.core.Core.extend", {}],

		// Migration not possible
		// ["sap.ui.core.Core.getMetadata", {}],

		// Migration not possible
		// ["setModel", {}],

		// Migration not possible
		// ["setRoot", {}],

		// Migration not possible
		// ["setThemeRoot", {}],

		// Migration not possible
		// ["unlock", {}],

		// Migration not possible
		// ["unregisterPlugin", {}],
	]),
]);

t.declareModule("sap/ui/model/odata/v4/ODataModel", [
	t.class("ODataModel", [
		t.constr([
			t.constuctorParameter("mParameters", [
				t.property("synchronizationMode", propertyAssignmentFix({})),
			]),
		]),
	]),
]);

t.declareModule("sap/ui/base/Object", [
	t.class("BaseObject", [
		t.staticMethod("isA", accessExpressionFix({
			propertyAccess: "isObjectA",
		})),
	]),
]);
