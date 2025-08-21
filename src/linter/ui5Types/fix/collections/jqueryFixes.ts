import ts from "typescript";
import Ui5TypeInfoMatcher from "../../Ui5TypeInfoMatcher.js";
import {
	FixTypeInfoMatcher,
	accessExpressionFix, accessExpressionGeneratorFix, callExpressionFix, callExpressionGeneratorFix,
} from "../FixFactory.js";
import CallExpressionFix from "../CallExpressionFix.js";
import {ChangeAction} from "../../../../utils/textChanges.js";
import {PositionInfo} from "../../../LinterContext.js";
import {FixScope} from "../BaseFix.js";
import {FixHelpers} from "../Fix.js";
import {Ui5TypeInfo} from "../../Ui5TypeInfo.js";

/**
 * NOTE: Since jQuery.sap APIs are not fully typed, we generate a "mocked" UI5 Type Info in module "getJqueryFixInfo.ts"
 * To keep it simple, that module simply treats everything as a NAMESPACE.
 *
 * Therefore, the filters expressed here MUST ALWAYS USE NAMESPACE, regardless of the actual type.
*/

const t: FixTypeInfoMatcher = new Ui5TypeInfoMatcher("jquery");
export default t;

t.declareModule("jQuery", [
	t.namespace("sap", [
		// jQuery.sap.assert => sap.base.assert
		t.namespace("assert", accessExpressionFix({ // https://github.com/UI5/linter/issues/520
			moduleName: "sap/base/assert",
		})),
		t.namespace("log", [ // https://github.com/UI5/linter/issues/522
			// jQuery.sap.log.Level|LogLevel => Log.Level
			...t.namespaces(["Level", "LogLevel"], accessExpressionFix({
				moduleName: "sap/base/Log",
				propertyAccess: "Level",
			})),
			// jQuery.sap.log.debug|warn|info|error|fatal|trace() => Log.debug|warn|info|error|fatal|trace()
			...t.namespaces(["debug", "error", "fatal", "info", "trace", "warning"],
				callExpressionFix({
					moduleName: "sap/base/Log",
					scope: FixScope.SecondChild,
					// Log.debug/warn/info/etc return "void", but the legacy
					// jQuery.log.debug was returning "this". Therefore a replacement
					// is only safe if the return value is not used in the code
					mustNotUseReturnValue: true,
				})),
			// jQuery.sap.log.getLevel => Log.getLevel
			t.namespace("getLevel", accessExpressionFix({
				moduleName: "sap/base/Log",
				scope: FixScope.FirstChild,
			})),
			// jQuery.sap.log.getLog => Log.getLogEntries
			t.namespace("getLog", accessExpressionFix({
				moduleName: "sap/base/Log",
				propertyAccess: "getLogEntries",
			})),
			t.namespace("getLogEntries", accessExpressionFix({
				moduleName: "sap/base/Log",
				scope: FixScope.FirstChild,
			})),
			t.namespace("addLogListener", accessExpressionFix({
				moduleName: "sap/base/Log",
				scope: FixScope.FirstChild,
			})),
			t.namespace("removeLogListener", accessExpressionFix({
				moduleName: "sap/base/Log",
				scope: FixScope.FirstChild,
			})),
			t.namespace("getLogger", accessExpressionFix({
				moduleName: "sap/base/Log",
				scope: FixScope.FirstChild,
			})),
			t.namespace("logSupportInfo", accessExpressionFix({
				moduleName: "sap/base/Log",
				scope: FixScope.FirstChild,
			})),
			t.namespace("isLoggable", accessExpressionFix({
				moduleName: "sap/base/Log",
				scope: FixScope.FirstChild,
			})),
		]),
		t.namespace("resources", [
			t.namespace("isBundle", callExpressionGeneratorFix({ // https://github.com/UI5/linter/issues/657
				moduleName: "sap/base/i18n/ResourceBundle",
				validateArguments(ctx, _, arg1) {
					if (!arg1) {
						return false;
					}
					return true;
				},
				generator(_ctx, [moduleIdentifier], arg1) {
					return `${arg1.trim()} instanceof ${moduleIdentifier}`;
				},
			})),
		],
		// jQuery.sap.resources => ResourceBundle.create
		callExpressionFix({ // https://github.com/UI5/linter/issues/521
			scope: FixScope.FirstChild,
			moduleName: "sap/base/i18n/ResourceBundle",
			propertyAccess: "create",
		})
		),
		t.namespace("encodeCSS", accessExpressionFix({ // https://github.com/UI5/linter/issues/524
			moduleName: "sap/base/security/encodeCSS",
		})),
		t.namespace("encodeJS", accessExpressionFix({
			moduleName: "sap/base/security/encodeJS",
		})),
		t.namespace("encodeURL", accessExpressionFix({
			moduleName: "sap/base/security/encodeURL",
		})),
		t.namespace("encodeURLParameters", accessExpressionFix({
			moduleName: "sap/base/security/encodeURLParameters",
		})),
		t.namespace("encodeHTML", accessExpressionFix({
			moduleName: "sap/base/security/encodeXML",
		})),
		t.namespace("encodeXML", accessExpressionFix({
			moduleName: "sap/base/security/encodeXML",
		})),
		t.namespace("addUrlWhitelist", accessExpressionFix({ // https://github.com/UI5/linter/issues/525
			moduleName: "sap/base/security/URLListValidator",
			propertyAccess: "add",
		})),
		t.namespace("clearUrlWhitelist", accessExpressionFix({
			moduleName: "sap/base/security/URLListValidator",
			propertyAccess: "clear",
		})),
		t.namespace("getUrlWhitelist", accessExpressionFix({
			moduleName: "sap/base/security/URLListValidator",
			propertyAccess: "entries",
		})),
		t.namespace("validateUrl", accessExpressionFix({
			moduleName: "sap/base/security/URLListValidator",
			propertyAccess: "validate",
		})),
		t.namespace("camelCase", accessExpressionFix({ // https://github.com/UI5/linter/issues/527
			moduleName: "sap/base/strings/camelize",
		})),
		t.namespace("charToUpperCase", (ui5TypeInfo: Ui5TypeInfo) => {
			return new CharToUpperCaseFix(ui5TypeInfo);
		}),
		t.namespace("escapeRegExp", accessExpressionFix({
			moduleName: "sap/base/strings/escapeRegExp",
		})),
		t.namespace("formatMessage", accessExpressionFix({
			moduleName: "sap/base/strings/formatMessage",
		})),
		t.namespace("formatMessage", accessExpressionFix({
			moduleName: "sap/base/strings/formatMessage",
		})),
		t.namespace("hashCode", accessExpressionFix({
			moduleName: "sap/base/strings/hash",
		})),
		t.namespace("hyphen", accessExpressionFix({
			moduleName: "sap/base/strings/hyphenate",
		})),
		// jQuery.sap.isStringNFC("foo") => "foo".normalize("NFC") === "foo"
		// Note: This API only exists in old UI5 releases
		t.namespace("isStringNFC", callExpressionGeneratorFix({
			validateArguments(ctx, {checker}, ...args) {
				if (!args.length) {
					return false;
				}
				// Ensure that the first argument is a string literal
				const firstArg = args[0];
				if (ts.isStringLiteralLike(firstArg)) {
					return true;
				} else if (ts.isIdentifier(firstArg)) {
					const argType = checker.getTypeAtLocation(firstArg);
					if (argType.isStringLiteral()) {
						return true;
					}
				}
				return false;
			},
			generator(ctx, identifierNames, ...args) {
				return `${args[0]}.normalize("NFC") === ${args[0]}`;
			},
		})),
		t.namespace("arraySymbolDiff", accessExpressionFix({ // https://github.com/UI5/linter/issues/528
			moduleName: "sap/base/util/array/diff",
		})),
		t.namespace("unique", accessExpressionFix({
			moduleName: "sap/base/util/array/uniqueSort",
		})),
		t.namespace("equal", accessExpressionFix({ // https://github.com/UI5/linter/issues/529
			moduleName: "sap/base/util/deepEqual",
		})),
		t.namespace("each", accessExpressionFix({
			moduleName: "sap/base/util/each",
		})),
		t.namespace("forIn", accessExpressionFix({
			moduleName: "sap/base/util/each",
		})),
		t.namespace("FrameOptions", accessExpressionFix({
			moduleName: "sap/ui/security/FrameOptions",
		})),
		t.namespace("parseJS", accessExpressionFix({
			scope: FixScope.FirstChild,
			moduleName: "sap/base/util/JSTokenizer",
		})),

		/* "extend" migration requires special handling:
			jQuery.sap.extends has an optional first argument "deep" which controls whether
			a shallow or deep copy is performed.

			In case of a shallow clone (default), Object.assign might be a suitable replacement
			but not always.

			Therefore, only in case of a deep clone (first argument is true),
			the merge module shall be used (omitting the first argument)
		*/
		t.namespace("extend", callExpressionGeneratorFix({
			moduleName: "sap/base/util/merge",
			validateArguments(ctx, _, arg1, arg2) {
				if (arg1?.kind !== ts.SyntaxKind.TrueKeyword) {
					// If the first argument is not "true" (indicating a deep merge),
					// do not apply the fix
					return false;
				}
				if (!arg2) {
					return false;
				}
				return true;
			},
			generator(ctx, [moduleIdentifierName], _, arg2, arg3) {
				return `${moduleIdentifierName}(${arg2.trim()},${arg3})`;
			},
		})),
		t.namespace("now", accessExpressionFix({
			moduleName: "sap/base/util/now",
		})),
		t.namespace("properties", accessExpressionFix({
			moduleName: "sap/base/util/Properties",
			propertyAccess: "create",
		})),
		t.namespace("uid", accessExpressionFix({
			moduleName: "sap/base/util/uid",
		})),
		t.namespace("Version", accessExpressionFix({
			moduleName: "sap/base/util/Version",
		})),
		t.namespace("syncStyleClass", accessExpressionFix({
			moduleName: "sap/ui/core/syncStyleClass",
		})),
		t.namespace("setObject", callExpressionGeneratorFix<{shortCircuit: boolean; value1: string}>({
			moduleName: "sap/base/util/ObjectPath",
			validateArguments(ctx, _, arg1) {
				if (!arg1 || arg1.kind === ts.SyntaxKind.NullKeyword ||
					(ts.isIdentifier(arg1) && arg1.text === "undefined")) {
					// If the first argument is null or undefined, replace it with an empty string
					ctx.value1 = `""`;
				} else if (!ts.isStringLiteral(arg1)) {
					// If it is not a string, short-circuit it
					ctx.shortCircuit = true;
				}
				return true;
			},
			generator(ctx, [moduleIdentifier], ...args) {
				if (ctx.shortCircuit) {
					args[0] = `(${args[0]} || "")`; // Short-circuit the first argument to avoid undefined/null
				}
				if (ctx.value1) {
					args[0] = ctx.value1;
				}
				return `${moduleIdentifier}.set(${args.join(",")})`;
			},
		})),
		t.namespace("containsOrEquals", accessExpressionFix({ // https://github.com/UI5/linter/issues/542
			moduleName: "sap/ui/dom/containsOrEquals",
		})),
		t.namespace("denormalizeScrollBeginRTL", accessExpressionFix({
			moduleName: "sap/ui/dom/denormalizeScrollBeginRTL",
		})),
		t.namespace("denormalizeScrollLeftRTL", accessExpressionFix({
			moduleName: "sap/ui/dom/denormalizeScrollLeftRTL",
		})),
		t.namespace("ownerWindow", accessExpressionFix({
			moduleName: "sap/ui/dom/getOwnerWindow",
		})),
		t.namespace("scrollbarSize", accessExpressionFix({
			moduleName: "sap/ui/dom/getScrollbarSize",
		})),
		t.namespace("includeScript", accessExpressionFix({
			moduleName: "sap/ui/dom/includeScript",
		})),
		t.namespace("includeStyleSheet", accessExpressionFix({
			moduleName: "sap/ui/dom/includeStylesheet",
		})),
		t.namespace("pxToRem", accessExpressionFix({
			moduleName: "sap/ui/dom/units/Rem",
			propertyAccess: "fromPx",
		})),
		t.namespace("remToPx", accessExpressionFix({
			moduleName: "sap/ui/dom/units/Rem",
			propertyAccess: "toPx",
		})),
		t.namespace("checkMouseEnterOrLeave", accessExpressionFix({ // https://github.com/UI5/linter/issues/543
			moduleName: "sap/ui/events/checkMouseEnterOrLeave",
		})),
		t.namespace("bindAnyEvent", accessExpressionFix({
			scope: FixScope.FirstChild,
			moduleName: "sap/ui/events/ControlEvents",
		})),
		t.namespace("unbindAnyEvent", accessExpressionFix({
			scope: FixScope.FirstChild,
			moduleName: "sap/ui/events/ControlEvents",
		})),
		t.namespace("ControlEvents", accessExpressionFix({
			moduleName: "sap/ui/events/ControlEvents",
			propertyAccess: "events",
		})),
		t.namespace("handleF6GroupNavigation", accessExpressionFix({
			scope: FixScope.FirstChild,
			moduleName: "sap/ui/events/F6Navigation",
		})),
		t.namespace("touchEventMode", accessExpressionFix({
			scope: FixScope.FirstChild,
			moduleName: "sap/ui/events/jquery/EventSimulation",
		})),
		t.namespace("keycodes", accessExpressionFix({
			moduleName: "sap/ui/events/KeyCodes",
		})),
		t.namespace("PseudoEvents", accessExpressionFix({
			moduleName: "sap/ui/events/PseudoEvents",
			propertyAccess: "events",
		})),
		t.namespace("disableTouchToMouseHandling", accessExpressionFix({
			scope: FixScope.FirstChild,
			moduleName: "sap/ui/events/TouchToMouseMapping",
		})),
		t.namespace("measure", [ // https://github.com/UI5/linter/issues/555
			t.namespace("getRequestTimings", callExpressionGeneratorFix({
				globalName: "performance",
				generator(ctx, [moduleIdentifierName]) {
					return `${moduleIdentifierName}.getEntriesByType("resource")`;
				},
			})),
			t.namespace("clearRequestTimings", accessExpressionFix({
				globalName: "performance",
				propertyAccess: "clearResourceTimings",
			})),
			t.namespace("setRequestBufferSize", accessExpressionFix({
				globalName: "performance",
				propertyAccess: "setResourceTimingBufferSize",
			})),
			t.namespace("start", accessExpressionFix({
				scope: FixScope.FirstChild,
				moduleName: "sap/ui/performance/Measurement",
			})),
			t.namespace("add", accessExpressionFix({
				scope: FixScope.FirstChild,
				moduleName: "sap/ui/performance/Measurement",
			})),
			t.namespace("end", accessExpressionFix({
				scope: FixScope.FirstChild,
				moduleName: "sap/ui/performance/Measurement",
			})),
			t.namespace("average", accessExpressionFix({
				scope: FixScope.FirstChild,
				moduleName: "sap/ui/performance/Measurement",
			})),
			t.namespace("clear", accessExpressionFix({
				scope: FixScope.FirstChild,
				moduleName: "sap/ui/performance/Measurement",
			})),
			t.namespace("filterMeasurements", accessExpressionFix({
				scope: FixScope.FirstChild,
				moduleName: "sap/ui/performance/Measurement",
			})),
			t.namespace("getAllMeasurements", accessExpressionFix({
				scope: FixScope.FirstChild,
				moduleName: "sap/ui/performance/Measurement",
			})),
			t.namespace("getMeasurement", accessExpressionFix({
				scope: FixScope.FirstChild,
				moduleName: "sap/ui/performance/Measurement",
			})),
			t.namespace("pause", accessExpressionFix({
				scope: FixScope.FirstChild,
				moduleName: "sap/ui/performance/Measurement",
			})),
			t.namespace("resume", accessExpressionFix({
				scope: FixScope.FirstChild,
				moduleName: "sap/ui/performance/Measurement",
			})),
			t.namespace("getActive", accessExpressionFix({
				scope: FixScope.FirstChild,
				moduleName: "sap/ui/performance/Measurement",
			})),
			t.namespace("setActive", accessExpressionFix({
				scope: FixScope.FirstChild,
				moduleName: "sap/ui/performance/Measurement",
			})),
			t.namespace("remove", accessExpressionFix({
				scope: FixScope.FirstChild,
				moduleName: "sap/ui/performance/Measurement",
			})),
			t.namespace("registerMethod", accessExpressionFix({
				scope: FixScope.FirstChild,
				moduleName: "sap/ui/performance/Measurement",
			})),
			t.namespace("unregisterMethod", accessExpressionFix({
				scope: FixScope.FirstChild,
				moduleName: "sap/ui/performance/Measurement",
			})),
			t.namespace("unregisterAllMethods", accessExpressionFix({
				scope: FixScope.FirstChild,
				moduleName: "sap/ui/performance/Measurement",
			})),
			t.namespace("clearInteractionMeasurements", accessExpressionFix({
				moduleName: "sap/ui/performance/trace/Interaction",
				propertyAccess: "clear",
			})),
			t.namespace("startInteraction", accessExpressionFix({
				moduleName: "sap/ui/performance/trace/Interaction",
				propertyAccess: "start",
			})),
			t.namespace("endInteraction", accessExpressionFix({
				moduleName: "sap/ui/performance/trace/Interaction",
				propertyAccess: "end",
			})),
			t.namespace("filterInteractionMeasurements", accessExpressionFix({
				moduleName: "sap/ui/performance/trace/Interaction",
				propertyAccess: "filter",
			})),
			t.namespace("getAllInteractionMeasurements", accessExpressionFix({
				moduleName: "sap/ui/performance/trace/Interaction",
				propertyAccess: "getAll",
			})),
			t.namespace("getPendingInteractionMeasurement", accessExpressionFix({
				moduleName: "sap/ui/performance/trace/Interaction",
				propertyAccess: "getPending",
			})),
		]), // measure
		t.namespace("fesr", [ // https://github.com/UI5/linter/issues/561
			t.namespace("setActive", accessExpressionFix({
				scope: FixScope.FirstChild,
				moduleName: "sap/ui/performance/trace/FESR",
			})),
			t.namespace("getActive", accessExpressionFix({
				scope: FixScope.FirstChild,
				moduleName: "sap/ui/performance/trace/FESR",
			})),
			t.namespace("addBusyDuration", accessExpressionFix({
				scope: FixScope.FirstChild,
				moduleName: "sap/ui/performance/trace/Interaction",
			})),
			t.namespace("getCurrentTransactionId", accessExpressionFix({
				scope: FixScope.FirstChild,
				moduleName: "sap/ui/performance/trace/Passport",
			})),
			t.namespace("getRootId", accessExpressionFix({
				scope: FixScope.FirstChild,
				moduleName: "sap/ui/performance/trace/Passport",
			})),
		]),
		t.namespace("interaction", [
			t.namespace("getActive", accessExpressionFix({
				scope: FixScope.FirstChild,
				moduleName: "sap/ui/performance/trace/Interaction",
			})),
			t.namespace("setActive", accessExpressionFix({
				scope: FixScope.FirstChild,
				moduleName: "sap/ui/performance/trace/Interaction",
			})),
			t.namespace("notifyStepStart", accessExpressionFix({
				scope: FixScope.FirstChild,
				moduleName: "sap/ui/performance/trace/Interaction",
			})),
			t.namespace("notifyStepEnd", accessExpressionFix({
				scope: FixScope.FirstChild,
				moduleName: "sap/ui/performance/trace/Interaction",
			})),
			t.namespace("notifyEventStart", accessExpressionFix({
				scope: FixScope.FirstChild,
				moduleName: "sap/ui/performance/trace/Interaction",
			})),
			t.namespace("notifyScrollEvent", accessExpressionFix({
				scope: FixScope.FirstChild,
				moduleName: "sap/ui/performance/trace/Interaction",
			})),
			t.namespace("notifyEventEnd", accessExpressionFix({
				scope: FixScope.FirstChild,
				moduleName: "sap/ui/performance/trace/Interaction",
			})),
			t.namespace("setStepComponent", accessExpressionFix({
				scope: FixScope.FirstChild,
				moduleName: "sap/ui/performance/trace/Interaction",
			})),
		]), // interaction
		t.namespace("passport", [
			t.namespace("setActive", accessExpressionFix({
				moduleName: "sap/ui/performance/trace/Passport",
				propertyAccess: "setActive",
			})),
			t.namespace("traceFlags", accessExpressionFix({
				moduleName: "sap/ui/performance/trace/Passport",
				propertyAccess: "traceFlags",
			})),
		]),
		t.namespace("initMobile", accessExpressionFix({
			moduleName: "sap/ui/util/Mobile",
			propertyAccess: "init",
		})),
		t.namespace("setIcons", accessExpressionFix({
			moduleName: "sap/ui/util/Mobile",
			propertyAccess: "setIcons",
		})),
		t.namespace("setMobileWebAppCapable", accessExpressionFix({
			moduleName: "sap/ui/util/Mobile",
			propertyAccess: "setWebAppCapable",
		})),
		t.namespace("storage", [
			t.namespace("Storage", accessExpressionFix({
				moduleName: "sap/ui/util/Storage",
			})),
			t.namespace("Type", [
				t.namespace("local", accessExpressionFix({
					moduleName: "sap/ui/util/Storage",
					propertyAccess: "Type.local",
				})),
				t.namespace("session", accessExpressionFix({
					moduleName: "sap/ui/util/Storage",
					propertyAccess: "Type.session",
				})),
			]),
			t.namespace("isSupported", accessExpressionFix({
				moduleName: "sap/ui/util/Storage",
				propertyAccess: "isSupported",
			})),
			t.namespace("clear", accessExpressionFix({
				moduleName: "sap/ui/util/Storage",
				propertyAccess: "clear",
			})),
			t.namespace("get", accessExpressionFix({
				moduleName: "sap/ui/util/Storage",
				propertyAccess: "get",
			})),
			t.namespace("getType", accessExpressionFix({
				moduleName: "sap/ui/util/Storage",
				propertyAccess: "getType",
			})),
			t.namespace("put", accessExpressionFix({
				moduleName: "sap/ui/util/Storage",
				propertyAccess: "put",
			})),
			t.namespace("remove", accessExpressionFix({
				moduleName: "sap/ui/util/Storage",
				propertyAccess: "remove",
			})),
			t.namespace("removeAll", accessExpressionFix({
				moduleName: "sap/ui/util/Storage",
				propertyAccess: "removeAll",
			})),
		], callExpressionFix({
			moduleName: "sap/ui/util/Storage",
			newExpression: true,
		})),
		t.namespace("getParseError", accessExpressionFix({
			scope: FixScope.FirstChild,
			moduleName: "sap/ui/util/XMLHelper",
		})),
		t.namespace("parseXML", accessExpressionFix({
			moduleName: "sap/ui/util/XMLHelper",
			propertyAccess: "parse",
		})),
		t.namespace("serializeXML", accessExpressionFix({
			moduleName: "sap/ui/util/XMLHelper",
			propertyAccess: "serialize",
		})),
		t.namespace("startsWith", callExpressionGeneratorFix<{shortCircuit1: boolean}>({
			validateArguments: validateStartsWithEndsWithArguments,
			generator: (ctx, _, arg1, arg2) => {
				arg1 = arg1.trim();
				if (ctx.shortCircuit1) {
					arg1 = `(${arg1} || "")`;
				}
				return `${arg1}.startsWith(${arg2.trim()})`;
			},
		})),
		t.namespace("endsWith", callExpressionGeneratorFix({
			validateArguments: validateStartsWithEndsWithArguments,
			generator: (ctx, _, arg1, arg2) => {
				arg1 = arg1.trim();
				if (ctx.shortCircuit1) {
					arg1 = `(${arg1} || "")`;
				}
				return `${arg1}.endsWith(${arg2.trim()})`;
			},
		})),
		t.namespace("startsWithIgnoreCase", callExpressionGeneratorFix({
			validateArguments: validateStartsWithEndsWithIgnoreCaseArguments,
			generator: (ctx, _, arg1, arg2) => {
				arg1 = arg1.trim();
				if (ctx.shortCircuit1) {
					arg1 = `(${arg1} || "")`;
				}
				arg2 = arg2.trim();
				if (ctx.shortCircuit2) {
					arg2 = `(${arg2} || "")`;
				}
				return `${arg1}.toUpperCase().startsWith(${arg2}.toUpperCase())`;
			},
		})),
		t.namespace("endsWithIgnoreCase", callExpressionGeneratorFix({
			validateArguments: validateStartsWithEndsWithIgnoreCaseArguments,
			generator: (ctx, _, arg1, arg2) => {
				arg1 = arg1.trim();
				if (ctx.shortCircuit1) {
					arg1 = `(${arg1} || "")`;
				}
				arg2 = arg2.trim();
				if (ctx.shortCircuit2) {
					arg2 = `(${arg2} || "")`;
				}
				return `${arg1}.toUpperCase().endsWith(${arg2}.toUpperCase())`;
			},
		})),
		t.namespace("padLeft", callExpressionGeneratorFix<{shortCircuit: boolean}>({
			validateArguments: validatePadLeftRightArguments,
			generator: (ctx, _, arg1, arg2, arg3) => {
				arg1 = arg1.trim();
				arg2 = arg2.trim();
				arg3 = arg3.trim();
				if (ctx.shortCircuit) {
					arg1 = `(${arg1} || "")`;
				}
				return `${arg1}.padStart(${arg3}, ${arg2})`;
			},
		})),
		t.namespace("padRight", callExpressionGeneratorFix<{shortCircuit: boolean}>({
			validateArguments: validatePadLeftRightArguments,
			generator: (ctx, _, arg1, arg2, arg3) => {
				arg1 = arg1.trim();
				arg2 = arg2.trim();
				arg3 = arg3.trim();
				if (ctx.shortCircuit) {
					arg1 = `(${arg1} || "")`;
				}
				return `${arg1}.padEnd(${arg3}, ${arg2})`;
			},
		})),
		t.namespace("domById", callExpressionGeneratorFix<{replaceWithNull: boolean}>({
			globalName: "document",
			validateArguments: (ctx, _, arg1) => {
				if (!arg1) {
					ctx.replaceWithNull = true;
				}
				return true;
			},
			generator: (ctx, [moduleIdentifier], arg1, arg2) => {
				if (ctx.replaceWithNull) {
					return "null";
				}
				let global = moduleIdentifier;
				if (arg2) {
					// If the second argument is present, it is the "document" global
					// which should be used instead of the default "window.document"
					global = `${arg2.trim()}.document`;
				}
				return `${global}.getElementById(${arg1})`;
			},
		})),
		t.namespace("isEqualNode", callExpressionGeneratorFix({
			validateArguments(ctx, _, arg1, arg2) {
				if (!arg1 || !arg2) {
					// If either argument is missing, do not apply the fix
					return false;
				}
				return true;
			},
			generator: (ctx, _, arg1, arg2) => {
				return `!!${arg1.trim()}?.isEqualNode(${arg2.trim()})`;
			},
		})),
		t.namespace("newObject", callExpressionGeneratorFix<{shortCircuit: boolean}>({
			validateArguments(ctx, {checker}, arg1) {
				if (!arg1) {
					return true;
				}
				if (ts.isIdentifier(arg1)) {
					// Get the type of the first argument
					const type = checker.getTypeAtLocation(arg1);
					if (!type || !(type.flags & (ts.TypeFlags.Object | ts.TypeFlags.Null))) {
						// Neither object or null, short-circuit to null to
						// reflect the legacy behavior
						ctx.shortCircuit = true;
					}
				} else if (!ts.isObjectLiteralExpression(arg1) &&
					arg1.kind !== ts.SyntaxKind.NullKeyword) {
					ctx.shortCircuit = true;
				}
				return true;
			},
			generator: (ctx, _, arg1) => {
				if (!arg1) {
					return `Object.create(null)`;
				} else if (ctx.shortCircuit) {
					return `Object.create(${arg1} || null)`;
				}
				return `Object.create(${arg1})`;
			},
		})),
		t.namespace("getter", callExpressionGeneratorFix({
			generator: (ctx, _, arg1) => {
				return `((value) => () => value)(${arg1})`;
			},
		})),
		t.namespace("getModulePath", callExpressionGeneratorFix<{argValue: string}>({ // https://github.com/UI5/linter/issues/589
			globalName: "sap.ui.require",
			validateArguments: (ctx, _, arg1) => {
				if (ts.isStringLiteral(arg1)) {
					// If the argument is a string literal, we can modify it's value
					ctx.argValue = `"${arg1.text.replaceAll(".", "/")}"`;
				}
				return true;
			},
			generator: (ctx, [moduleIdentifier], arg1, arg2) => {
				if (ctx.argValue) {
					// Use the modified value
					arg1 = ctx.argValue;
				} else {
					// If it's not a string literal, apply the modification at runtime
					arg1 = `(${arg1})?.replaceAll(".", "/")`;
				}
				let res = `${moduleIdentifier}.toUrl(${arg1})`;
				if (arg2) {
					res = `${res} +${arg2}`;
				}
				return res;
			},
		})),
		t.namespace("getResourcePath", callExpressionGeneratorFix({
			globalName: "sap.ui.require",
			generator: (ctx, [moduleIdentifier], arg1, arg2) => {
				let res = `${moduleIdentifier}.toUrl(${arg1})`;
				if (arg2) {
					res = `${res} +${arg2}`;
				}
				return res;
			},
		})),
		t.namespace("delayedCall", callExpressionGeneratorFix<{isFnString: boolean}>({
			validateArguments: (ctx, _, timeout, objCtx, fnName) => {
				if (!timeout || !objCtx || !fnName) {
					// If the function name is not provided, do not apply the fix
					return false;
				}
				ctx.isFnString = !!fnName && ts.isStringLiteralLike(fnName);
				return true;
			},
			generator: (ctx, _, timeout, objCtx, fnName, params) => {
				let fnRepresentation;
				if (ctx.isFnString) {
					fnRepresentation = `${objCtx.trim()}[${fnName.trim()}].bind(${objCtx.trim()})`;
				} else {
					fnRepresentation = `${fnName.trim()}.bind(${objCtx.trim()})`;
				}

				return `setTimeout(${fnRepresentation}, ${timeout}${params ? ", ..." + params.trim() : ""})`;
			},
		})),
		t.namespace("clearDelayedCall", callExpressionFix({
			globalName: "clearTimeout",
		})),
		t.namespace("intervalCall", callExpressionGeneratorFix<{isFnString: boolean}>({
			globalName: "setInterval",
			validateArguments: (ctx, _, timeout, objCtx, fnName) => {
				if (!timeout || !objCtx || !fnName) {
					// If the function name is not provided, do not apply the fix
					return false;
				}
				ctx.isFnString = !!fnName && ts.isStringLiteralLike(fnName);
				return true;
			},
			generator: (ctx, _, timeout, objCtx, fnName, params) => {
				let fnRepresentation;
				if (ctx.isFnString) {
					fnRepresentation = `${objCtx.trim()}[${fnName.trim()}].bind(${objCtx.trim()})`;
				} else {
					fnRepresentation = `${fnName.trim()}.bind(${objCtx.trim()})`;
				}

				return `setInterval(${fnRepresentation}, ${timeout}${params ? ", ..." + params.trim() : ""})`;
			},
		})),
		t.namespace("clearIntervalCall", callExpressionGeneratorFix({
			generator: (_ctx, _, cbId) => {
				return `clearInterval(${cbId})`;
			},
		})),
	]), // jQuery.sap
	// jQuery
	t.namespace("inArray", callExpressionGeneratorFix({
		validateArguments(ctx, _, arg1, arg2) {
			if (!arg1 || !arg2) {
				// If either argument is missing, do not apply the fix
				return false;
			}
			return true;
		},
		generator: (ctx, _, arg1, arg2) => {
			return `(${arg2.trim()} ? Array.prototype.indexOf.call(${arg2.trim()}, ${arg1.trim()}) : -1)`;
		},
	})),
	t.namespace("isArray", callExpressionGeneratorFix({
		generator: (ctx, _, arg1) => {
			return `Array.isArray(${arg1})`;
		},
	})),
	t.namespace("support", [
		t.namespace("retina", accessExpressionGeneratorFix({
			generator: () => "window.devicePixelRatio >= 2",
		})),
	]),
	t.namespace("device", [
		t.namespace("is", [
			t.namespace("standalone", accessExpressionFix({
				scope: FixScope.FirstChild,
				globalName: "navigator",
			})),
			t.namespace("landscape", accessExpressionFix({
				moduleName: "sap/ui/Device",
				propertyAccess: "orientation.landscape",
			})),
			t.namespace("portrait", accessExpressionFix({
				moduleName: "sap/ui/Device",
				propertyAccess: "orientation.portrait",
			})),
			t.namespace("desktop", accessExpressionFix({
				moduleName: "sap/ui/Device",
				propertyAccess: "system.desktop",
			})),
			t.namespace("phone", accessExpressionFix({
				moduleName: "sap/ui/Device",
				propertyAccess: "system.phone",
			})),
			t.namespace("tablet", accessExpressionFix({
				moduleName: "sap/ui/Device",
				propertyAccess: "system.tablet",
			})),
			t.namespace("android_phone", accessExpressionGeneratorFix({
				moduleName: "sap/ui/Device",
				generator: ([moduleIdentifier]) => (
					`${moduleIdentifier}.os.android && ` +
					`${moduleIdentifier}.system.phone`
				),
			})),
			t.namespace("android_tablet", accessExpressionGeneratorFix({
				moduleName: "sap/ui/Device",
				generator: ([moduleIdentifier]) => (
					`${moduleIdentifier}.os.android && ` +
					`${moduleIdentifier}.system.tablet`
				),
			})),
			t.namespace("iphone", accessExpressionGeneratorFix({
				moduleName: "sap/ui/Device",
				generator: ([moduleIdentifier]) => (
					`${moduleIdentifier}.os.ios && ` +
					`${moduleIdentifier}.system.phone`
				),
			})),
			t.namespace("ipad", accessExpressionGeneratorFix({
				moduleName: "sap/ui/Device",
				generator: ([moduleIdentifier]) => (
					`${moduleIdentifier}.os.ios && ` +
					`${moduleIdentifier}.system.tablet`
				),
			})),
		]),
	]),
	t.namespace("os", [
		t.namespace("os", accessExpressionFix({
			moduleName: "sap/ui/Device",
			propertyAccess: "os.name",
		})),
		t.namespace("fVersion", accessExpressionFix({
			moduleName: "sap/ui/Device",
			propertyAccess: "os.version",
		})),
		t.namespace("version", accessExpressionFix({
			moduleName: "sap/ui/Device",
			propertyAccess: "os.versionStr",
		})),
		t.namespace("Android", accessExpressionGeneratorFix({
			moduleName: "sap/ui/Device",
			generator: ([moduleIdentifier]) => `${moduleIdentifier}.os.name === "Android"`,
		})),
		t.namespace("bb", accessExpressionGeneratorFix({
			moduleName: "sap/ui/Device",
			generator: ([moduleIdentifier]) => `${moduleIdentifier}.os.name === "bb"`,
		})),
		t.namespace("iOS", accessExpressionGeneratorFix({
			moduleName: "sap/ui/Device",
			generator: ([moduleIdentifier]) => `${moduleIdentifier}.os.name === "iOS"`,
		})),
		t.namespace("winphone", accessExpressionGeneratorFix({
			moduleName: "sap/ui/Device",
			generator: ([moduleIdentifier]) => `${moduleIdentifier}.os.name === "winphone"`,
		})),
		t.namespace("win", accessExpressionGeneratorFix({
			moduleName: "sap/ui/Device",
			generator: ([moduleIdentifier]) => `${moduleIdentifier}.os.name === "win"`,
		})),
		t.namespace("linux", accessExpressionGeneratorFix({
			moduleName: "sap/ui/Device",
			generator: ([moduleIdentifier]) => `${moduleIdentifier}.os.name === "linux"`,
		})),
		t.namespace("mac", accessExpressionGeneratorFix({
			moduleName: "sap/ui/Device",
			generator: ([moduleIdentifier]) => `${moduleIdentifier}.os.name === "mac"`,
		})),
	]),
]);

function getStringValue(checker: ts.TypeChecker, stringArg: ts.Expression): string | undefined {
	if (ts.isIdentifier(stringArg)) {
		// If it's an identifier, we need to check whether it is a string literal type
		const argType = checker.getTypeAtLocation(stringArg);
		if (!argType.isStringLiteral()) {
			return;
		}
		return argType.value;
	} else if (ts.isStringLiteralLike(stringArg)) {
		return stringArg.text;
	}
}

function hasStringValue(checker: ts.TypeChecker, stringArg: ts.Expression): boolean {
	return getStringValue(checker, stringArg) !== undefined;
}

function validateStartsWithEndsWithArguments(
	ctx: {shortCircuit1: boolean}, {checker}: FixHelpers, arg1: ts.Expression, arg2: ts.Expression
) {
	if (!arg1 || !arg2) {
		// Both arguments must be provided
		return false;
	}
	// If we can't be sure the first argument is a string, default it to an empty string
	if (!hasStringValue(checker, arg1) && arg1.kind !== ts.SyntaxKind.NullKeyword) {
		ctx.shortCircuit1 = true;
	}

	// If there are no arguments, we cannot migrate.
	// If the second argument is an empty string, we can't migrate as the built-in String API
	// returns true instead of false in that case.
	// For this reason, we can only safely replace a call when the second argument is a non-empty string.
	const value2 = getStringValue(checker, arg2);
	if (!value2 || value2.length === 0) {
		return false;
	}

	return true;
};

function validateStartsWithEndsWithIgnoreCaseArguments(
	ctx: {shortCircuit1: boolean; shortCircuit2: boolean},
	helpers: FixHelpers, arg1: ts.Expression, arg2: ts.Expression
) {
	if (!validateStartsWithEndsWithArguments(ctx, helpers, arg1, arg2)) {
		return false;
	}

	// If we can't be sure the second argument is a string, default it to an empty string
	const value2 = getStringValue(helpers.checker, arg2);
	if (value2 === undefined && arg1.kind !== ts.SyntaxKind.NullKeyword) {
		ctx.shortCircuit2 = true;
	}
	return true;
};

function validatePadLeftRightArguments(
	ctx: {shortCircuit: boolean},
	{checker}: FixHelpers, arg1: ts.Expression, arg2: ts.Expression
) {
	if (!arg1 || !arg2) {
		// Both arguments must be provided
		return false;
	}

	if (!hasStringValue(checker, arg1)) {
		ctx.shortCircuit = true;
	}
	const value2 = getStringValue(checker, arg2);
	if (value2 === undefined || value2.length > 1) {
		// API not compatible if the second argument is not a string or the string us longer than
		// one character
		return false;
	}
	return true;
};

/**
 * Fix for jQuery.sap.charToUpperCase
 * 	Source: jQuery.sap.charToUpperCase("foo")
 * 	Target: capitalize("foo")
 *
 * NOTE - This fix requires special validation:
 *
 * Since the capitalize module does not accept a position argument, this migration must
 * only be applied if it is **the first character that is supposed to be capitalized**.
 * In the legacy charToUpperCase API, this is controlled by the second argument ("position").
 * If it is omitted, set to zero, a negative number, or beyond the last character,
 * the first character is to be capitalized.
 * In all other cases, this migration must not be applied.
 * If the first argument is not a string, the migration must not be applied either.
 */
class CharToUpperCaseFix extends CallExpressionFix {
	private argIdentifierName?: string;
	private argStringValue?: string;

	constructor(ui5TypeInfo: Ui5TypeInfo) {
		super({
			moduleName: "sap/base/strings/capitalize",
			scope: FixScope.FullExpression,
		}, ui5TypeInfo);
	}

	visitLinterNode(node: ts.Node, sourcePosition: PositionInfo, helpers: FixHelpers) {
		if (!super.visitLinterNode(node, sourcePosition, helpers)) {
			return false;
		}
		if (!ts.isCallExpression(node) || node.arguments.length < 1) {
			// Must have at least one argument (the string to be capitalized)
			return false;
		}
		const stringArg = node.arguments[0];
		if (!ts.isStringLiteralLike(stringArg) && !ts.isIdentifier(stringArg)) {
			// First argument must be a string literal or identifier
			return false;
		}
		let stringLength;
		if (ts.isIdentifier(stringArg)) {
			// If it's an identifier, we need to check whether it is a string literal type
			const argType = helpers.checker.getTypeAtLocation(stringArg);
			if (!argType.isStringLiteral()) {
				return false;
			}
			stringLength = argType.value.length;
			this.argIdentifierName = stringArg.text;
		} else {
			stringLength = stringArg.text.length;
			this.argStringValue = stringArg.getFullText();
		}

		if (node.arguments.length === 2) {
			const positionArg = node.arguments[1];
			if (!ts.isNumericLiteral(positionArg) &&
				(!ts.isPrefixUnaryExpression(positionArg) || !ts.isNumericLiteral(positionArg.operand))) {
				// Second argument must be a numeric literal if provided
				return false;
			}
			if (ts.isPrefixUnaryExpression(positionArg)) {
				// If it's a prefix unary expression, we need to check whether it is a negative number
				if (positionArg.operator !== ts.SyntaxKind.MinusToken) {
					return false;
				}
			} else {
				const positionValue = parseInt(positionArg.text, 10);
				if (positionValue > 0 && positionValue < stringLength) {
					// If the position is greater than 0 and less than the string length, we cannot apply the fix
					return false;
				}
			}
		}
		// Fix can be applied
		return true;
	}

	visitAutofixNode(node: ts.Node, position: number, sourceFile: ts.SourceFile) {
		if (!super.visitAutofixNode(node, position, sourceFile)) {
			return false;
		}
		if (this.argStringValue) {
			// Nothing more to do
			return true;
		}

		// If the argument is an identifier, we should check whether its name is still the same in
		// the autofix AST
		if (!ts.isCallExpression(node)) {
			return false;
		}

		const firstArg = node.arguments[0];
		if (!ts.isIdentifier(firstArg)) {
			return false;
		}
		// Update the identifier name just in case
		this.argIdentifierName = firstArg.text;
		return true;
	}

	generateChanges() {
		if (this.startPos === undefined || this.endPos === undefined) {
			throw new Error("Start or end position or argument is not defined");
		}

		if (!this.moduleIdentifierNames?.has("sap/base/strings/capitalize") ||
			(this.argIdentifierName === undefined && this.argStringValue === undefined)) {
			// Identifier has not been set. This can happen if the relevant position is not inside a
			// module definition or require block. Therefore the fix can not be applied.
			return;
		}
		const arg = this.argStringValue ?? this.argIdentifierName;
		const value = `${this.moduleIdentifierNames.get("sap/base/strings/capitalize")!}(${arg})`;
		return {
			action: ChangeAction.REPLACE,
			start: this.startPos,
			end: this.endPos,
			value,
		};
	}
}
