import {PositionDetail as SaxPosition} from "sax-wasm";
import he from "he";
import ViewGenerator from "./generator/ViewGenerator.js";
import FragmentGenerator from "./generator/FragmentGenerator.js";
import JSTokenizer from "./lib/JSTokenizer.js";
import LinterContext, {CoverageCategory, Directive, PositionInfo} from "../LinterContext.js";
import {TranspileResult} from "../LinterContext.js";
import AbstractGenerator from "./generator/AbstractGenerator.js";
import {getLogger} from "@ui5/logger";
import {MESSAGE} from "../messages.js";
import {ApiExtract} from "../../utils/ApiExtract.js";
import ControllerByIdInfo from "./ControllerByIdInfo.js";
import BindingLinter from "../binding/BindingLinter.js";
import {Tag as SaxTag, Text as SaxText} from "sax-wasm";
import EventHandlerResolver from "./lib/EventHandlerResolver.js";
import BindingParser from "../binding/lib/BindingParser.js";
import {extractDirective} from "../../utils/xmlParser.js";
import EventHandlersFix from "../ui5Types/fix/EventHandlersFix.js";
import {
	AggregationDeclaration,
	AttributeDeclaration,
	ControlDeclaration,
	FragmentDefinitionDeclaration,
	Namespace, NamespaceDeclaration,
	NamespaceStackEntry,
	NodeDeclaration,
	NodeKind,
	Position,
	PropertyDeclaration,
	RequireDeclaration,
	RequireExpression,
} from "./xmlNodes.js";
const log = getLogger("linter:xmlTemplate:Parser");

const XHTML_NAMESPACE = "http://www.w3.org/1999/xhtml";
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const TEMPLATING_NAMESPACE = "http://schemas.sap.com/sapui5/extension/sap.ui.core.template/1";
const FESR_NAMESPACE = "http://schemas.sap.com/sapui5/extension/sap.ui.core.FESR/1";
const SAP_BUILD_NAMESPACE = "sap.build";
const SAP_UI_DT_NAMESPACE = "sap.ui.dt";
const CUSTOM_DATA_NAMESPACE = "http://schemas.sap.com/sapui5/extension/sap.ui.core.CustomData/1";
const CORE_NAMESPACE = "sap.ui.core";
const PATTERN_LIBRARY_NAMESPACES = /^([a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*)*)$/;

const enum DocumentKind {
	View,
	Fragment,
}

function determineDocumentKind(resourcePath: string): DocumentKind | null {
	if (/\.view.xml$/.test(resourcePath)) {
		return DocumentKind.View;
	} else if (/\.fragment.xml$/.test(resourcePath)) {
		return DocumentKind.Fragment;
	} else if (/\.control.xml$/.test(resourcePath)) {
		throw new Error(`Control XML analysis is currently not supported for resource ${resourcePath}`);
	} else {
		return null;
	}
}

function toPosition(saxPos: SaxPosition): Position {
	return {
		line: saxPos.line,
		column: saxPos.character,
	};
}

export default class Parser {
	#resourcePath: string;
	#xmlDocumentKind: DocumentKind;

	#context: LinterContext;
	#directives = new Set<Directive>();
	#namespaceStack: NamespaceStackEntry[] = [];
	#nodeStack: NodeDeclaration[] = [];

	// For now, gather all require declarations, independent of the scope
	// This might not always be correct, but for now we usually only care about whether
	// there is a require declaration for a given string or not.
	#requireDeclarations: RequireDeclaration[] = [];
	#bindingLinter: BindingLinter;

	#generator: AbstractGenerator;
	#apiExtract: ApiExtract;

	constructor(
		resourcePath: string, apiExtract: ApiExtract, context: LinterContext, controllerByIdInfo: ControllerByIdInfo
	) {
		const xmlDocumentKind = determineDocumentKind(resourcePath);
		if (xmlDocumentKind === null) {
			throw new Error(`Unknown document type for resource ${resourcePath}`);
		}
		this.#resourcePath = resourcePath;
		this.#xmlDocumentKind = xmlDocumentKind;
		this.#generator = xmlDocumentKind === DocumentKind.View ?
			new ViewGenerator(resourcePath, controllerByIdInfo) :
			new FragmentGenerator(resourcePath, controllerByIdInfo);

		this.#apiExtract = apiExtract;
		this.#context = context;

		this.#bindingLinter = new BindingLinter(resourcePath, context);
	}

	pushTag(tag: SaxTag) {
		this.#nodeStack.push(this._createNode(tag));
	}

	popTag(_tag: SaxTag) { // No need to use the parsed tag, we rely on our nodeStack
		const closingNode = this.#nodeStack.pop();
		const level = this.#nodeStack.length;

		if (closingNode &&
			(closingNode.kind & (NodeKind.Control | NodeKind.FragmentDefinition))) {
			// Generate view code for this control
			// If this is the root control, export it
			if (level === 0) {
				// Actually closingNode might be a FragmentDefinitionDeclaration here
				// But that's tricky with the current generator signatures
				this.#generator.writeRootControl(closingNode as ControlDeclaration);
			} else {
				this.#generator.writeControl(closingNode as ControlDeclaration);
			}
		}
		// Cleanup stacks stacks
		this._removeNamespacesForLevel(level);
	}

	parseComment(comment: SaxText) {
		const directive = extractDirective(comment);
		if (directive) {
			this.#directives.add(directive);
		}
	}

	generate(): TranspileResult {
		if (this.#directives.size) {
			// Add directives to the context
			this.#context.getMetadata(this.#resourcePath).directives = this.#directives;
		}
		const {source, map} = this.#generator.getModuleContent();
		return {
			source,
			map,
		};
	}

	_findParentNode(kindFilter: number): NodeDeclaration | null {
		for (let i = this.#nodeStack.length - 1; i >= 0; i--) {
			if (this.#nodeStack[i].kind & kindFilter) {
				return this.#nodeStack[i];
			}
		}
		return null;
	}

	_addNamespace(namespace: NamespaceDeclaration, level: number) {
		this.#namespaceStack.push({
			namespace,
			level,
		});
	}

	_resolveNamespace(localName: string | null): Namespace | undefined {
		// Search this.#namespaceStack in reverse order
		for (let i = this.#namespaceStack.length - 1; i >= 0; i--) {
			const ns = this.#namespaceStack[i];
			if (ns.namespace.localName === localName) {
				return ns.namespace.namespace;
			}
		}
	}

	_removeNamespacesForLevel(level: number) {
		// Remove all namespaces for the given level
		let i = this.#namespaceStack.length - 1;
		while (i >= 0 && this.#namespaceStack[i].level >= level) {
			this.#namespaceStack.pop();
			i--;
		}
	}

	_addDefaultAggregation(
		owner: ControlDeclaration, control: ControlDeclaration
	) {
		let aggregationName = this.#apiExtract.getDefaultAggregation(`${owner.namespace}.${owner.name}`);

		if (!aggregationName) {
			log.verbose(`Failed to determine default aggregation for control ${owner.name} used in ` +
				`resource ${this.#resourcePath}. Falling back to 'dependents'`);
			// In case the default aggregation is unknown (e.g. in case of custom controls),
			// fallback to use the generic "dependents" aggregation
			// This is not correct at runtime, but it's the best we can do for linting purposes
			aggregationName = "dependents";
		}
		if (!owner.aggregations.has(aggregationName)) {
			const aggregation = {
				kind: NodeKind.Aggregation,
				name: aggregationName,
				owner,
				controls: [control],
				namespace: owner.namespace,
				start: control.start,
				end: control.end,
			} as AggregationDeclaration;
			owner.aggregations.set(aggregationName, aggregation);
		} else {
			owner.aggregations.get(aggregationName)!.controls.push(control);
		}
	}

	_parseRequireAttribute(attrValue: string): RequireDeclaration[] {
		if (!attrValue) {
			// Runtime allows empty require attributes, so we do too
			return [];
		}
		try {
			// This is no well-formed JSON, therefore we have to parse it manually
			const requireMap = JSTokenizer.parseJS(attrValue);
			return Object.keys(requireMap).map((variableName) => {
				return {
					moduleName: requireMap[variableName],
					variableName,
				};
			});
		} catch (_) {
			throw new Error(`Failed to parse require attribute value '${attrValue}' in resource ${this.#resourcePath}`);
		}
	}

	_createNode(tag: SaxTag): NodeDeclaration {
		let tagName = tag.name;
		let tagNamespace = null; // default namespace

		// Extract optional namespace from attribute name
		if (tagName.includes(":")) {
			[tagNamespace, tagName] = tagName.split(":");
		}

		const attributes = new Map<string, AttributeDeclaration>();
		tag.attributes.forEach((attr) => {
			const attrName = attr.name.value;
			const attrValue = he.decode(attr.value.value);
			// Extract namespaces immediately so we can resolve namespaced attributes in the next go
			if (attrName === "xmlns") {
				// Declares the default namespace
				this._addNamespace({
					localName: null,
					namespace: attrValue,
				}, this.#nodeStack.length);
			} else if (attrName.startsWith("xmlns:")) {
				// Named namespace
				this._addNamespace({
					localName: attrName.slice(6), // Remove "xmlns:"
					namespace: attrValue,
				}, this.#nodeStack.length);
			} else if (attrName.includes(":")) {
				// Namespaced attribute
				const [attrNamespace, attrLocalName] = attrName.split(":");
				attributes.set(attrName, {
					name: attrLocalName,
					value: attrValue,
					localNamespace: attrNamespace,
					start: toPosition(attr.name.start),
					end: toPosition({
						line: attr.value.end.line,
						character: attr.value.end.character + 1, // Add 1 to include the closing quote
					}),
				});
			} else {
				attributes.set(attrName, {
					name: attrName,
					value: attrValue,
					start: toPosition(attr.name.start),
					end: toPosition({
						line: attr.value.end.line,
						character: attr.value.end.character + 1, // Add 1 to include the closing quote
					}),
				});
			}
		});

		// Note: Resolve namespace *after* evaluating all attributes, since it might have been defined
		// by one of them
		let namespace = this._resolveNamespace(tagNamespace);
		if (!namespace) {
			throw new Error(`Unknown namespace ${tagNamespace} for tag ${tagName} in resource ${this.#resourcePath}`);
		} else if (namespace === SVG_NAMESPACE) {
			// Ignore SVG nodes
			this.#context.addLintingMessage(this.#resourcePath,
				{
					id: MESSAGE.SVG_IN_XML,
					position: {
						line: tag.openStart.line + 1, // Add one to align with IDEs
						column: tag.openStart.character + 1,
					},
				}
			);
			return {
				kind: NodeKind.Svg,
				name: tagName,
				namespace,
				start: toPosition(tag.openStart),
				end: toPosition(tag.openEnd),
			};
		} else if (namespace === XHTML_NAMESPACE) {
			// Ignore XHTML nodes for now
			this.#context.addLintingMessage(this.#resourcePath,
				{
					id: MESSAGE.HTML_IN_XML,
					position: {
						line: tag.openStart.line + 1, // Add one to align with IDEs
						column: tag.openStart.character + 1,
					},
				}
			);
			return {
				kind: NodeKind.Xhtml,
				name: tagName,
				namespace,
				start: toPosition(tag.openStart),
				end: toPosition(tag.openEnd),
			};
		} else if (namespace === TEMPLATING_NAMESPACE) {
			return this._handleTemplatingNamespace(tagName, namespace, attributes, tag);
		} else if (PATTERN_LIBRARY_NAMESPACES.test(namespace)) {
			const lastIdx = tagName.lastIndexOf(".");
			if (lastIdx !== -1) {
				// Resolve namespace prefix, e.g. "sap:m.Button"
				namespace += `.${tagName.slice(0, lastIdx)}`;
				tagName = tagName.slice(lastIdx + 1);
			}

			return this._handleUi5LibraryNamespace(tagName, namespace, attributes, tag);
		} else {
			return {
				kind: NodeKind.Unknown,
				name: tagName,
				namespace,
				start: toPosition(tag.openStart),
				end: toPosition(tag.openEnd),
			};
		}
	}

	// Every View has just one controllerName that is defined in the root tag
	// This is used later to determine the context for event handlers.
	// It is certain that if present, controllerName will be firstly collected because of the nature of SAX parsing.
	// Note: It's only uncertain how the attributes in the root tag would be ordered.
	_controllerName: string | undefined;
	_handleUi5LibraryNamespace(
		moduleName: string, namespace: Namespace, attributes: Map<string, AttributeDeclaration>,
		tag: SaxTag
	): ControlDeclaration | AggregationDeclaration | FragmentDefinitionDeclaration {
		const controlProperties = new Set<PropertyDeclaration>();
		const customDataElements: ControlDeclaration[] = [];
		attributes.forEach((attr) => {
			if (attr.name === "controllerName") {
				this._controllerName = attr.value;
			}
			if (attr.localNamespace) {
				// Resolve namespace
				const resolvedNamespace = this._resolveNamespace(attr.localNamespace);
				if (!resolvedNamespace) {
					throw new Error(`Unknown namespace ${attr.localNamespace} for attribute ${attr.name} ` +
						`in resource ${this.#resourcePath}`);
				}
				if ((resolvedNamespace === CORE_NAMESPACE ||
					resolvedNamespace === TEMPLATING_NAMESPACE) && attr.name === "require") {
					// sap.ui.core:require or template:require declaration
					let requireDeclarations: RequireDeclaration[];
					if (resolvedNamespace === TEMPLATING_NAMESPACE && !attr.value.startsWith("{")) {
						/* From: https://github.com/SAP/openui5/blob/959dcf4d0ac771aa53ce4f4bf02832356afd8c23/src/sap.ui.core/src/sap/ui/core/util/XMLPreprocessor.js#L1301-L1306
						 * "template:require" attribute may contain either a space separated list of
						 * dot-separated module names or a JSON representation of a map from alias to
						 * slash-separated Unified Resource Names (URNs). In the first case, the resulting
						 * modules must be accessed from the global namespace. In the second case, they are
						 * available as local names (AMD style) similar to <template:alias> instructions.
						 */
						requireDeclarations = [];
						attr.value.split(" ").map(function (sModuleName) {
							const requiredModuleName = sModuleName.replace(/\./g, "/");
							// We can't (and also really shouldn't) declare a global namespace for the imported
							// module, so we just use the module name as variable name
							const variableName = requiredModuleName.replaceAll("/", "_");
							requireDeclarations.push({
								moduleName: requiredModuleName,
								variableName,
							});
						});
						if (requireDeclarations.length) {
							// Usage of space separated list is not recommended, as it only allows for global access
							this.#context.addLintingMessage(this.#resourcePath,
								{
									id: MESSAGE.NO_LEGACY_TEMPLATE_REQUIRE_SYNTAX,
									args: {moduleNames: attr.value}, position: attr.start,
								}
							);
						}
					} else {
						// Most common case: JSON-like representation
						// e.g. core:require="{Helper: 'sap/ui/demo/todo/util/Helper'}"
						requireDeclarations = this._parseRequireAttribute(attr.value);
					}
					const requireExpression = {
						name: attr.name,
						value: attr.value,
						declarations: requireDeclarations,
						start: attr.start,
						end: attr.end,
					} as RequireExpression;

					this.#requireDeclarations.push(...requireDeclarations);
					this.#generator.writeRequire(requireExpression);
				} else if (resolvedNamespace === FESR_NAMESPACE ||
					resolvedNamespace === SAP_BUILD_NAMESPACE || resolvedNamespace === SAP_UI_DT_NAMESPACE) {
					// Silently ignore FESR, sap.build and sap.ui.dt attributes
				} else if (resolvedNamespace === CUSTOM_DATA_NAMESPACE) {
					// Add custom data element and add it as an aggregation
					const customData: ControlDeclaration = {
						kind: NodeKind.Control,
						name: "CustomData",
						namespace: CORE_NAMESPACE,
						properties: new Set([
							{
								name: "key",
								value: attr.name,
								start: attr.start,
								end: attr.end,
							} as PropertyDeclaration,
							{
								name: "value",
								value: attr.value,
								start: attr.start,
								end: attr.end,
							} as PropertyDeclaration,
						]),
						aggregations: new Map(),
						start: attr.start,
						end: attr.end,
					};
					customDataElements.push(customData);
					// Immediately write the custom data element declaration to make it usable
					// in the control aggregation
					this.#generator.writeControl(customData);
				} else {
					log.verbose(`Ignoring unknown namespaced attribute ${attr.localNamespace}:${attr.name} ` +
						`for ${moduleName} in resource ${this.#resourcePath}`);
				}
			} else {
				controlProperties.add(attr);
			}
		});

		const parentNode = this._findParentNode(
			NodeKind.Control | NodeKind.Aggregation | NodeKind.FragmentDefinition
		) as ControlDeclaration | AggregationDeclaration | FragmentDefinitionDeclaration;

		if (/^[a-z]/.exec(moduleName)) {
			const aggregationName = moduleName;
			// TODO: Replace the above with a check against known controls. Even though there are
			// no known cases of lower case control names in the framework.
			// This node likely declares an aggregation
			if (!parentNode || parentNode.kind === NodeKind.FragmentDefinition) {
				if (this.#xmlDocumentKind !== DocumentKind.Fragment) {
					throw new Error(`Unexpected top-level aggregation declaration: ` +
						`${aggregationName} in resource ${this.#resourcePath}`);
				}
				let pos;
				if (parentNode) {
					pos = {
						start: {
							line: parentNode.start.line + 1,
							column: parentNode.start.column + 1,
						},
						end: {
							line: parentNode.end.line + 1,
							column: parentNode.end.column + 1,
						},
					};
				} else {
					pos = {
						start: {line: 1, column: 1},
						end: {line: 1, column: 1},
					};
				}
				this.#context.addCoverageInfo(this.#resourcePath, {
					category: CoverageCategory.UnknownControlAggregation,
					line: pos.start.line,
					column: pos.start.column,
					endLine: pos.end.line,
					endColumn: pos.end.column,
					message: `Unable to analyze top-level aggregation "${aggregationName}". ` +
						`Parent control could not be determined.`,
				});
				// In case of top-level aggregations in fragments, generate an sap.ui.core.Control instance and
				// add the aggregation's content to it's dependents aggregation
				const coreControl: ControlDeclaration = {
					kind: NodeKind.Control,
					name: "Control",
					namespace: CORE_NAMESPACE,
					properties: new Set(),
					aggregations: new Map(),
					start: toPosition(tag.openStart),
					end: toPosition(tag.openEnd),
				};
				return coreControl;
			} else if (parentNode.kind === NodeKind.Aggregation) {
				throw new Error(`Unexpected aggregation ${aggregationName} within aggregation ${parentNode.name} ` +
					`in resource ${this.#resourcePath}`);
			}
			const owner = parentNode;

			let ownerAggregation = owner.aggregations.get(aggregationName);
			if (!ownerAggregation) {
				// Create aggregation declaration if not already declared before
				// (duplicate aggregation tags are merged into the first occurrence)
				ownerAggregation = {
					kind: NodeKind.Aggregation,
					name: aggregationName,
					namespace,
					owner: parentNode,
					controls: [],
					start: toPosition(tag.openStart),
					end: toPosition(tag.openEnd),
				};
				owner.aggregations.set(aggregationName, ownerAggregation);
			}
			return ownerAggregation;
		} else if (this.#xmlDocumentKind === DocumentKind.Fragment && moduleName === "FragmentDefinition" &&
			namespace === CORE_NAMESPACE) {
			// This node declares a fragment definition
			const node: FragmentDefinitionDeclaration = {
				kind: NodeKind.FragmentDefinition,
				name: moduleName,
				namespace,
				controls: new Set(),
				start: toPosition(tag.openStart),
				end: toPosition(tag.openEnd),
			};

			if (parentNode) {
				throw new Error(`Unexpected nested FragmentDefinition in resource ${this.#resourcePath}`);
			}
			return node;
		} else {
			for (const prop of controlProperties) {
				// Check whether prop is of type "property" (indicating that it can have a binding)
				// Note that some aggregations are handled like properties (0..n + alt type). Therefore check
				// whether this is a property first. Additional aggregation-specific checks are not needed in that case
				const symbolName = `${namespace}.${moduleName}`;
				const position = {
					line: prop.start.line + 1, // Add one to align with IDEs
					column: prop.start.column + 1,
				};
				if (this.#apiExtract.isAggregation(symbolName, prop.name)) {
					this.#bindingLinter.lintAggregationBinding(prop.value, this.#requireDeclarations, position);
				} else if (this.#apiExtract.isEvent(symbolName, prop.name)) {
					// In XML templating, it's possible to have bindings in event handlers
					// We need to parse and lint these as well, but the error should only be reported in case the event
					// handler is not parsable. This prevents false-positive errors.
					const {bindingInfo, errorMessage} =
						this.#bindingLinter.lintPropertyBinding(prop.value, this.#requireDeclarations, position, false);

					let isValidEventHandler = true;

					EventHandlerResolver.parse(prop.value).forEach((eventHandler) => {
						if (eventHandler.startsWith("cmd:")) {
							// No global usage possible via command execution
							return;
						}

						// Try parsing the event handler expression to check whether a property binding parsing error
						// should be reported or not.
						// This prevents false-positive errors in case a valid event handler declaration is not parsable
						// as a binding.
						// TODO: The parsed expression could also be used to check for global references in the future
						if (errorMessage && isValidEventHandler) {
							try {
								BindingParser.parseExpression(eventHandler.replace(/^\./, "$controller."), 0, {
									bTolerateFunctionsNotFound: true,
								}, {});
							} catch (err) {
								isValidEventHandler = false;
								// Also report the parsing error for the event handler. This creates multiple and
								// sometimes duplicate messages, but it's better than not reporting the error at all
								// and there is no easy way to know whether the input is intended to be a binding or
								// event handler.
								this.#context.addLintingMessage(
									this.#resourcePath, {id: MESSAGE.PARSING_ERROR, args: {
										message: err instanceof Error ? err.message : String(err),
									}, position}
								);
								return;
							}
						}

						let functionName;

						// Check for a valid function/identifier name
						// Currently XML views support the following syntaxes that are covered with this pattern:
						// - myFunction
						// - .myFunction
						// - my.namespace.myFunction
						// - my.namespace.myFunction(arg1, ${i18n>key}, "test")
						const validFunctionName = /^(\.?[$_\p{ID_Start}][$\p{ID_Continue}]*(?:\.[$_\p{ID_Start}][$\p{ID_Continue}]*)*)\s*(?:\(|$)/u;
						const match = validFunctionName.exec(eventHandler);
						if (match) {
							functionName = match[1];
						} else if (!eventHandler.includes("(") && !bindingInfo) {
							// Simple case of a function call without arguments which can
							// use more characters than just the ID_Start and ID_Continue
							// as it is not parsed as expression
							// We also get here when the event handler is a binding (resolved during XML templating).
							// Therefore we can only assume the value is an actual event handler function if there is
							// no binding info available.
							functionName = eventHandler;
						} else {
							return;
						}

						const variableName = this.#bindingLinter.getGlobalReference(
							functionName, this.#requireDeclarations
						);
						if (!variableName) {
							return;
						}

						const generateFix = (functionName: string) => {
							const fix = new EventHandlersFix(functionName, this._controllerName);

							if (fix.visitLinterNode(prop, position)) {
								return fix;
							}
						};
						if (!functionName.includes(".")) {
							// If the event handler does not include a dot, it is most likely a reference to the
							// controller which should be prefixed with a leading dot, but works in UI5 1.x runtime
							// without also it.
							// Note that this could also be a global function reference, but we can't distinguish
							// that here.
							this.#context.addLintingMessage(
								this.#resourcePath, {
									id: MESSAGE.NO_AMBIGUOUS_EVENT_HANDLER,
									args: {eventHandler: functionName},
									position,
									fix: generateFix(functionName),
								}
							);
						} else {
							this.#context.addLintingMessage(this.#resourcePath, {
								id: MESSAGE.NO_GLOBALS,
								args: {variableName, namespace: functionName},
								position,
								fix: generateFix(functionName),
							});
						}
					});

					if (!isValidEventHandler && errorMessage) {
						this.#bindingLinter.reportParsingError(errorMessage, position);
					}
				} else {
					// XML templating processes all attributes as property bindings, so we don't need to check
					// whether the attribute is a property or not
					this.#bindingLinter.lintPropertyBinding(prop.value, this.#requireDeclarations, position);
				}
			}
			// This node declares a control
			// Or a fragment definition in case of a fragment
			const node: ControlDeclaration = {
				kind: NodeKind.Control,
				name: moduleName,
				namespace,
				properties: controlProperties,
				aggregations: new Map(),
				start: toPosition(tag.openStart),
				end: toPosition(tag.openEnd),
			};
			if (customDataElements?.length) {
				node.aggregations.set("customData", {
					kind: NodeKind.Aggregation,
					name: "customData",
					namespace,
					owner: node,
					controls: customDataElements,
					start: toPosition(tag.openStart),
					end: toPosition(tag.openEnd),
				});
			}

			if (parentNode) {
				if (parentNode.kind === NodeKind.Control) {
					// Insert the current control in the default aggregation of the last control
					this._addDefaultAggregation(parentNode, node);
				} else if (parentNode.kind === NodeKind.Aggregation) {
					const aggregationNode = parentNode;
					aggregationNode.controls.push(node);
				} else if (parentNode.kind === NodeKind.FragmentDefinition) {
					// Add the control to the fragment definition
					parentNode.controls.add(node);
				}
			}
			return node;
		}
	}

	_handleTemplatingNamespace(
		tagName: string, namespace: Namespace, attributes: Map<string, AttributeDeclaration>, tag: SaxTag
	): NodeDeclaration {
		let globalReferenceCheckAttribute: AttributeDeclaration | undefined;
		if (tagName === "alias") {
			const aliasName = attributes.get("name");
			if (aliasName) {
				// Add alias to list of local names so that the global check takes them into account
				this.#requireDeclarations.push({
					variableName: aliasName.value,
				});
			}
			globalReferenceCheckAttribute = attributes.get("value");
		} else if (tagName === "with") {
			globalReferenceCheckAttribute = attributes.get("helper");
		} else if (tagName === "if" || tagName === "elseif") {
			const testAttribute = attributes.get("test");
			if (testAttribute) {
				// template:if/elseif test attribute is handled like a property binding in XMLPreprocessor
				this.#bindingLinter.lintPropertyBinding(testAttribute.value, this.#requireDeclarations, {
					line: testAttribute.start.line + 1, // Add one to align with IDEs
					column: testAttribute.start.column + 1,
				});
			}
		}

		if (globalReferenceCheckAttribute) {
			this._checkGlobalReference(globalReferenceCheckAttribute.value, globalReferenceCheckAttribute.start);
		}

		return {
			kind: NodeKind.Template,
			name: tagName,
			namespace,
			start: toPosition(tag.openStart),
			end: toPosition(tag.openEnd),
		};
	}

	_checkGlobalReference(value: string, {line, column}: PositionInfo) {
		this.#bindingLinter.checkForGlobalReference(value, this.#requireDeclarations, {
			// Add one to align with IDEs
			line: line + 1,
			column: column + 1,
		});
	}
}
