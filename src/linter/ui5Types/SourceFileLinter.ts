import ts from "typescript";
import path from "node:path/posix";
import {getLogger} from "@ui5/logger";
import SourceFileReporter from "./SourceFileReporter.js";
import {ResourcePath, CoverageCategory, LintMetadata} from "../LinterContext.js";
import {MESSAGE} from "../messages.js";
import analyzeComponentJson from "./asyncComponentFlags.js";
import {deprecatedLibraries, deprecatedThemes} from "../../utils/deprecations.js";
import {
	getPropertyNameText,
	getSymbolForPropertyInConstructSignatures,
	getPropertyAssignmentInObjectLiteralExpression,
	getPropertyAssignmentsInObjectLiteralExpression,
	findClassMember,
	isClassMethod,
	isSourceFileOfPseudoModuleType,
	isSourceFileOfTypeScriptLib,
	getSymbolModuleDeclaration,
	isGlobalThis,
	extractNamespace,
} from "./utils/utils.js";
import {taskStart} from "../../utils/perf.js";
import {getPositionsForNode} from "../../utils/nodePosition.js";
import {SourceMapInput, TraceMap, originalPositionFor} from "@jridgewell/trace-mapping";
import type {ApiExtract} from "../../utils/ApiExtract.js";
import {findDirectives} from "./directives.js";
import BindingLinter from "../binding/BindingLinter.js";
import {RequireDeclaration} from "../xmlTemplate/Parser.js";
import {createResource} from "@ui5/fs/resourceFactory";
import {AbstractAdapter} from "@ui5/fs";
import type {AmbientModuleCache} from "./AmbientModuleCache.js";
import type TypeLinter from "./TypeLinter.js";
import {
	getModuleTypeInfo, getNamespace, getUi5TypeInfoFromSymbol, Ui5TypeInfo, Ui5TypeInfoKind,
} from "./Ui5TypeInfo.js";
import FixFactory from "./fix/FixFactory.js";
import Fix, {FixHelpers} from "./fix/Fix.js";
import GlobalFix from "./fix/GlobalFix.js";
import {JSONSchemaForSAPUI5Namespace} from "../../manifest.js";
import getJqueryTypeInfo from "./getJqueryTypeInfo.js";

const log = getLogger("linter:ui5Types:SourceFileLinter");

const QUNIT_FILE_EXTENSION = /\.qunit\.(js|ts)$/;

// This is the same check as in the framework and prevents false-positives
// https://github.com/SAP/openui5/blob/32c21c33d9dc29a32bf7ee7f41d7bae23dcf086b/src/sap.ui.core/src/sap/ui/test/starter/_utils.js#L287
const VALID_TESTSUITE = /\/testsuite(?:\.[a-z][a-z0-9-]*)*\.qunit\.(?:js|ts)$/;

const DEPRECATED_VIEW_TYPES = ["JS", "JSON", "HTML", "Template"];

const ALLOWED_RENDERER_API_VERSIONS = ["2", "4"];

interface DeprecationInfo {
	symbol: ts.Symbol;
	messageDetails: string;
	ui5TypeInfo?: Ui5TypeInfo;
}

function isSourceFileOfUi5Type(sourceFile: ts.SourceFile) {
	return /\/types\/(@openui5|@sapui5|@ui5\/linter\/types)\//.test(sourceFile.fileName);
}

function isSourceFileOfUi5OrThirdPartyType(sourceFile: ts.SourceFile) {
	return isSourceFileOfUi5Type(sourceFile) || /\/types\/(@types\/jquery)\//.test(sourceFile.fileName);
}

function isSourceFileOfJquerySapType(sourceFile: ts.SourceFile) {
	return [
		"/types/@ui5/linter/types/jquery.sap.d.ts",
		"/types/@ui5/linter/types/jquery.sap.mobile.d.ts",
	].includes(sourceFile.fileName);
}

export default class SourceFileLinter {
	#reporter: SourceFileReporter;
	#boundVisitNode: (node: ts.Node) => void;
	#fileName: string;
	#isComponent: boolean;
	#hasTestStarterFindings: boolean;
	#metadata: LintMetadata;
	#xmlContents: {xml: string; pos: ts.LineAndCharacter; documentKind: "fragment" | "view"}[];

	private fixHelpers: FixHelpers;
	private resourcePath: ResourcePath;

	constructor(
		private typeLinter: TypeLinter,
		private sourceFile: ts.SourceFile,
		private checker: ts.TypeChecker,
		private reportCoverage = false,
		private messageDetails = false,
		private apiExtract: ApiExtract,
		private filePathsWorkspace: AbstractAdapter,
		private workspace: AbstractAdapter,
		private ambientModuleCache: AmbientModuleCache,
		private fixFactory?: FixFactory,
		private manifestContent?: string,
		private libraryDependencies?: JSONSchemaForSAPUI5Namespace["dependencies"]["libs"]
	) {
		this.#reporter = typeLinter.getSourceFileReporter(sourceFile);
		this.#boundVisitNode = this.visitNode.bind(this);
		this.resourcePath = sourceFile.fileName;
		this.#fileName = path.basename(this.resourcePath);
		this.#isComponent = this.#fileName === "Component.js" || this.#fileName === "Component.ts";
		this.#hasTestStarterFindings = false;
		this.#metadata = this.typeLinter.getContext().getMetadata(this.resourcePath);
		this.#xmlContents = [];
		this.fixHelpers = {
			checker: this.checker,
			manifestContent: this.manifestContent,
			libraryDependencies: this.libraryDependencies,
		};
	}

	async lint() {
		try {
			if (!this.#metadata.directives) {
				// Directives might have already been extracted by the amd transpiler
				// This is done since the transpile process might loose comments
				findDirectives(this.sourceFile, this.#metadata);
			}
			this.visitNode(this.sourceFile);

			if (this.sourceFile.fileName.endsWith(".qunit.js") && // TS files do not have sap.ui.define
				!this.#metadata?.transformedImports?.get("sap.ui.define")) {
				this.#reportTestStarter(this.sourceFile);
			}

			let i = 0;
			for (const xmlContent of this.#xmlContents) {
				const fileName = `${this.sourceFile.fileName.replace(/(\.js|\.ts)$/, "")}.inline-${++i}.${xmlContent.documentKind}.xml`;
				const metadata = this.typeLinter.getContext().getMetadata(fileName);
				const newResource = createResource({path: fileName, string: xmlContent.xml});
				metadata.jsToXmlPosMapping = {
					pos: xmlContent.pos,
					originalPath: this.sourceFile.fileName,
				};
				await Promise.all([
					await this.filePathsWorkspace.write(newResource),
					await this.workspace.write(newResource),
				]);
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			log.verbose(`Error while linting ${this.resourcePath}: ${message}`);
			if (err instanceof Error) {
				log.verbose(`Call stack: ${err.stack}`);
			}
			this.typeLinter.getContext().addLintingMessage(this.resourcePath, MESSAGE.PARSING_ERROR, {message});
		}
	}

	visitNode(node: ts.Node) {
		if (node.kind === ts.SyntaxKind.NewExpression) { // e.g. "new Button({\n\t\t\t\tblocked: true\n\t\t\t})"
			this.analyzeNewExpression(node as ts.NewExpression);
		} else if (node.kind === ts.SyntaxKind.CallExpression) { // ts.isCallLikeExpression too?
			// const nodeType = this.checker.getTypeAtLocation(node);
			this.analyzePropertyAccessExpression(node as ts.CallExpression); // Check for global
			this.analyzeCallExpression(node as ts.CallExpression); // Check for deprecation
		} else if (node.kind === ts.SyntaxKind.PropertyAccessExpression ||
			node.kind === ts.SyntaxKind.ElementAccessExpression) {
			// First, check for deprecation
			const deprecationMessageReported = this.analyzePropertyAccessExpressionForDeprecation(
				node as (ts.PropertyAccessExpression | ts.ElementAccessExpression));

			// If not deprecated, check for global.
			// We prefer the deprecation message over the global one as it contains more information.
			if (!deprecationMessageReported) {
				this.analyzePropertyAccessExpression(
					node as (ts.PropertyAccessExpression | ts.ElementAccessExpression)); // Check for global
			}

			this.analyzeExportedValuesByLib(node as (ts.PropertyAccessExpression | ts.ElementAccessExpression));
		} else if (node.kind === ts.SyntaxKind.ObjectBindingPattern &&
			node.parent?.kind === ts.SyntaxKind.VariableDeclaration) {
			// e.g. `const { Button } = sap.m;`
			// This is a destructuring assignment and we need to check each property for deprecation
			this.analyzeObjectBindingPattern(node as ts.ObjectBindingPattern);
		} else if (node.kind === ts.SyntaxKind.ImportDeclaration) {
			this.analyzeImportDeclaration(node as ts.ImportDeclaration); // Check for deprecation
		} else if (
			this.#isComponent && ts.isClassDeclaration(node) &&
			this.isUi5ClassDeclaration(node, "sap/ui/core/Component")
		) {
			analyzeComponentJson({
				classDeclaration: node,
				manifestContent: this.manifestContent,
				resourcePath: this.resourcePath,
				reporter: this.#reporter,
				context: this.typeLinter.getContext(),
				checker: this.checker,
				isUiComponent: this.isUi5ClassDeclaration(node, "sap/ui/core/UIComponent"),
			});
		} else if (
			ts.isPropertyDeclaration(node) &&
			getPropertyNameText(node.name) === "metadata" &&
			node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword) &&
			ts.isClassDeclaration(node.parent) &&
			this.isUi5ClassDeclaration(node.parent, "sap/ui/base/ManagedObject")
		) {
			const visitMetadataNodes = (childNode: ts.Node) => {
				if (ts.isPropertyAssignment(childNode)) { // Skip nodes out of interest
					this.analyzeMetadataProperty(childNode);
				}

				ts.forEachChild(childNode, visitMetadataNodes);
			};
			ts.forEachChild(node, visitMetadataNodes);
		} else if (ts.isClassDeclaration(node) && this.isUi5ClassDeclaration(node, "sap/ui/core/Control")) {
			this.analyzeControlRendererDeclaration(node);
			this.analyzeControlRerenderMethod(node);
		} else if (ts.isPropertyAssignment(node) && getPropertyNameText(node.name) === "theme") {
			this.analyzeTestsuiteThemeProperty(node);
		}

		// Traverse the whole AST from top to bottom
		ts.forEachChild(node, this.#boundVisitNode);
	}

	isUi5ClassDeclaration(node: ts.ClassDeclaration, baseClassModule: string | string[]): boolean {
		const baseClassModules = Array.isArray(baseClassModule) ? baseClassModule : [baseClassModule];
		const baseClasses = baseClassModules.map((baseClassModule) => {
			return {module: baseClassModule, name: baseClassModule.split("/").pop()};
		});

		// Go up the hierarchy chain to find whether the class extends from the provided base class
		const isClassUi5Subclass = (node: ts.ClassDeclaration): boolean => {
			return node?.heritageClauses?.flatMap((parentClasses: ts.HeritageClause) => {
				return parentClasses.types.map((parentClass) => {
					const parentClassType = this.checker.getTypeAtLocation(parentClass);

					return parentClassType.symbol?.declarations?.some((declaration) => {
						if (!ts.isClassDeclaration(declaration)) {
							return false;
						}
						for (const baseClass of baseClasses) {
							if (declaration.name?.text === baseClass.name &&
								(
								// Declaration via type definitions
									(
										declaration.parent.parent &&
										ts.isModuleDeclaration(declaration.parent.parent) &&
										declaration.parent.parent.name?.text === baseClass.module
									) ||
									// Declaration via real class (e.g. within sap.ui.core project)
									(
										ts.isSourceFile(declaration.parent) &&
										(
											declaration.parent.fileName === `/resources/${baseClass.module}.js` ||
											declaration.parent.fileName === `/resources/${baseClass.module}.ts`
										)
									)
								)
							) {
								return true;
							}
						}
						return isClassUi5Subclass(declaration);
					});
				});
			// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
			}).reduce((acc, cur) => cur || acc, false) ?? false;
		};

		return isClassUi5Subclass(node);
	}

	analyzeControlRendererDeclaration(node: ts.ClassDeclaration) {
		const className = node.name?.text ?? "<unknown>";
		const rendererMember = findClassMember(node, "renderer", [{modifier: ts.SyntaxKind.StaticKeyword}]);

		if (!rendererMember) {
			const nonStaticRender = findClassMember(node, "renderer");
			if (nonStaticRender) {
				// Renderer must be a static member
				this.#reporter.addMessage(MESSAGE.NOT_STATIC_CONTROL_RENDERER, {className}, {node: nonStaticRender});
				return;
			}

			// Special cases: Some base classes do not require sub-classes to have a renderer defined:
			if (this.isUi5ClassDeclaration(node, [
				"sap/ui/core/mvc/View",
				// XMLComposite is deprecated, but there still shouldn't be a false-positive about a missing renderer
				"sap/ui/core/XMLComposite",
				"sap/ui/core/webc/WebComponent",
				"sap/uxap/BlockBase",
			])) {
				return;
			}

			// No definition of renderer causes the runtime to load the corresponding Renderer module synchronously
			this.#reporter.addMessage(MESSAGE.MISSING_CONTROL_RENDERER_DECLARATION, {className}, {node});
			return;
		}

		if (ts.isPropertyDeclaration(rendererMember) && rendererMember.initializer) {
			const initializerType = this.checker.getTypeAtLocation(rendererMember.initializer);

			if (initializerType.flags & ts.TypeFlags.Undefined ||
				initializerType.flags & ts.TypeFlags.Null) {
				// null / undefined can be used to declare that a control does not have a renderer
				return;
			}

			if (initializerType.flags & ts.TypeFlags.StringLiteral) {
				let rendererName;
				if (ts.isStringLiteralLike(rendererMember.initializer)) {
					rendererName = rendererMember.initializer.text;
				}
				// Declaration as string requires sync loading of renderer module
				this.#reporter.addMessage(MESSAGE.CONTROL_RENDERER_DECLARATION_STRING, {
					className, rendererName,
				}, {node: rendererMember.initializer});
			}

			// Analyze renderer property when it's referenced by a variable or even another module
			// i.e. { renderer: Renderer }
			if (ts.isIdentifier(rendererMember.initializer)) {
				const {symbol} = this.checker.getTypeAtLocation(rendererMember);

				const originalDeclarations = symbol?.getDeclarations()?.filter((decl) =>
					!decl.getSourceFile().isDeclarationFile);

				// If the original raw render file is available, we can analyze it directly
				originalDeclarations?.forEach((declaration) => this.analyzeControlRendererInternals(declaration));
			} else {
				// Analyze renderer property when it's directly embedded in the renderer object
				// i.e. { renderer: {apiVersion: 2, render: () => {}} }
				this.analyzeControlRendererInternals(rendererMember.initializer);
			}
		}
	}

	analyzeControlRendererInternals(node: ts.Node) {
		const findApiVersionNode = (potentialApiVersionNode: ts.Node) => {
			// const myControlRenderer = {apiVersion: 2, render: () => {}}

			if (ts.isObjectLiteralExpression(potentialApiVersionNode)) {
				const foundNode = getPropertyAssignmentInObjectLiteralExpression("apiVersion", potentialApiVersionNode);
				if (foundNode) {
					return foundNode;
				}
			}

			// const myControlRenderer = {}
			// const myControlRenderer.apiVersion = 2;
			let rendererObjectName = null;
			if ((ts.isPropertyAssignment(potentialApiVersionNode.parent) ||
				ts.isPropertyDeclaration(potentialApiVersionNode.parent) ||
				ts.isVariableDeclaration(potentialApiVersionNode.parent)) &&
				ts.isIdentifier(potentialApiVersionNode.parent.name)) {
				rendererObjectName = potentialApiVersionNode.parent.name.text;
			}

			let apiVersionNode: ts.Expression | undefined;

			const visitChildNodes = (childNode: ts.Node) => {
				if (ts.isBinaryExpression(childNode)) {
					if (ts.isPropertyAccessExpression(childNode.left)) {
						let objectName;
						if (ts.isIdentifier(childNode.left.expression)) {
							objectName = childNode.left.expression.text; // myControlRenderer
						}
						let propertyName;
						if (ts.isIdentifier(childNode.left.name)) {
							propertyName = childNode.left.name.text; // apiVersion
						}
						if (objectName === rendererObjectName && propertyName === "apiVersion") {
							apiVersionNode = childNode.right;
						}
					}
				}

				if (!apiVersionNode) { // If found, stop traversing
					ts.forEachChild(childNode, visitChildNodes);
				}
			};

			ts.forEachChild(potentialApiVersionNode.getSourceFile(), visitChildNodes);

			return apiVersionNode;
		};

		const getNodeToHighlight = (apiVersionNode: ts.Node | undefined) => {
			if (!apiVersionNode) { // No 'apiVersion' property
				return node;
			}
			if (ts.isPropertyAssignment(apiVersionNode)) {
				apiVersionNode = apiVersionNode.initializer;
			}
			if (!ts.isNumericLiteral(apiVersionNode)) {
				return apiVersionNode;
			}
			if (!ALLOWED_RENDERER_API_VERSIONS.includes(apiVersionNode.text)) {
				return apiVersionNode;
			}
			return undefined;
		};

		const nodeType = this.checker.getTypeAtLocation(node);
		const nodeValueDeclaration = nodeType.getSymbol()?.valueDeclaration;

		// Analyze renderer property when it's an ObjectLiteralExpression
		// i.e. { renderer: {apiVersion: 2, render: () => {}} }
		if (node && (ts.isObjectLiteralExpression(node) || ts.isVariableDeclaration(node))) {
			const apiVersionNode = findApiVersionNode(node);
			const nodeToHighlight = getNodeToHighlight(apiVersionNode);
			if (nodeToHighlight) {
				// The findings can be in different file i.e. Control being analyzed,
				// but reporting might be in ControlRenderer
				const nodeSourceFile = nodeToHighlight.getSourceFile();
				this.typeLinter.getSourceFileReporter(nodeSourceFile)
					.addMessage(MESSAGE.NO_DEPRECATED_RENDERER, null, {node: nodeToHighlight});
			}

			this.analyzeIconCallInRenderMethod(node);
		// Analyze renderer property when it's a function i.e. { renderer: () => {} }
		} else if (ts.isMethodDeclaration(node) || ts.isArrowFunction(node) ||
			ts.isFunctionExpression(node) || ts.isFunctionDeclaration(node) || (
			nodeValueDeclaration && (
				ts.isFunctionExpression(nodeValueDeclaration) ||
				ts.isFunctionDeclaration(nodeValueDeclaration) ||
				ts.isArrowFunction(nodeValueDeclaration)
			)
		)) {
			// The findings can be in different file i.e. Control being analyzed,
			// but reporting might be in ControlRenderer
			const nodeSourceFile = node.getSourceFile();
			this.typeLinter.getSourceFileReporter(nodeSourceFile)
				.addMessage(MESSAGE.NO_DEPRECATED_RENDERER, null, {node});

			this.analyzeIconCallInRenderMethod(node);
		}
	}

	// If there's an oRm.icon() call in the render method, we need to check if IconPool is imported.
	// Currently, we're only able to analyze whether oRm.icon is called in the render method as
	// there's no reliable way to find if the method icon() is actually a member of RenderManager in other places.
	analyzeIconCallInRenderMethod(node: ts.Node) {
		let renderMethodNode: ts.Node | undefined = node;

		// When the render is a plain function
		if (ts.isMethodDeclaration(node) || ts.isArrowFunction(node) ||
			ts.isFunctionExpression(node) || ts.isFunctionDeclaration(node)) {
			renderMethodNode = node;
		} else if (ts.isObjectLiteralExpression(node)) {
			// When the render is embed into the renderer object
			const renderProperty = getPropertyAssignmentInObjectLiteralExpression("render", node);
			renderMethodNode = (renderProperty && ts.isPropertyAssignment(renderProperty)) ?
				renderProperty.initializer :
				undefined;

			// When the renderer is a separate module and the render method is assigned
			// to the renderer object later i.e. myControlRenderer.render = function (oRm, oMyControl) {}
			if (!renderMethodNode) {
				let rendererObjectName = null;
				if ((ts.isPropertyAssignment(node.parent) || ts.isPropertyDeclaration(node.parent) ||
					ts.isVariableDeclaration(node.parent)) && ts.isIdentifier(node.parent.name)) {
					rendererObjectName = node.parent.name.text;
				}

				const findRenderMethod = (childNode: ts.Node) => {
					if (ts.isBinaryExpression(childNode)) {
						if (ts.isPropertyAccessExpression(childNode.left)) {
							let objectName;
							if (ts.isIdentifier(childNode.left.expression)) {
								objectName = childNode.left.expression.text; // myControlRenderer
							}
							let propertyName;
							if (ts.isIdentifier(childNode.left.name)) {
								propertyName = childNode.left.name.text; // render
							}
							if (objectName === rendererObjectName && propertyName === "render") {
								renderMethodNode = childNode.right;
							}
						}
					}

					if (!renderMethodNode) { // If found, stop traversing
						ts.forEachChild(childNode, findRenderMethod);
					}
				};

				ts.forEachChild(node.getSourceFile(), findRenderMethod);
			}
		}

		if (!renderMethodNode) {
			return;
		}

		// If there's a dependency to IconPool from the Renderer,
		// it's fine and we can skip the rest of the checks
		const rendererSource = renderMethodNode.getSourceFile();
		const hasIconPoolImport = rendererSource.statements.some((importNode: ts.Statement) => {
			return ts.isImportDeclaration(importNode) &&
				ts.isStringLiteralLike(importNode.moduleSpecifier) &&
				importNode.moduleSpecifier.text === "sap/ui/core/IconPool";
		});

		if (hasIconPoolImport) {
			return;
		}

		const findIconCallExpression = (childNode: ts.Node) => {
			if (ts.isCallExpression(childNode) &&
				ts.isPropertyAccessExpression(childNode.expression) &&
				childNode.expression.name.text === "icon"
			) {
				// The findings can be in different file i.e. Control being analyzed,
				// but reporting might be in ControlRenderer, so we have to use the corresponding reporter
				const nodeSourceFile = childNode.getSourceFile();
				this.typeLinter.getSourceFileReporter(nodeSourceFile)
					.addMessage(MESSAGE.NO_ICON_POOL_RENDERER, null, {node: childNode});
			}
			ts.forEachChild(childNode, findIconCallExpression);
		};

		// When the renderer is a separate module we can say with some certainty that the .icon() call
		// is a RenderManager's
		if (rendererSource.fileName !== this.sourceFile.fileName) {
			ts.forEachChild(rendererSource, findIconCallExpression);
		} else {
			// When the renderer is embedded in the control file, then we can analyze only the icon call
			// within the render method.
			ts.forEachChild(renderMethodNode, findIconCallExpression);
		}
	}

	analyzeControlRerenderMethod(node: ts.ClassDeclaration) {
		const className = node.name?.text ?? "<unknown>";
		// Search for the rerender instance method
		const rerenderMember = findClassMember(node, "rerender", [{not: true, modifier: ts.SyntaxKind.StaticKeyword}]);
		if (!rerenderMember || !isClassMethod(rerenderMember, this.checker)) {
			return;
		}
		this.#reporter.addMessage(MESSAGE.NO_CONTROL_RERENDER_OVERRIDE, {className}, {node: rerenderMember});
	}

	analyzeMetadataProperty(node: ts.PropertyAssignment) {
		const type = getPropertyNameText(node.name);
		if (!type) {
			return;
		}
		const analyzeMetadataDone = taskStart(`analyzeMetadataProperty: ${type}`, this.resourcePath, true);
		if (type === "interfaces") {
			if (ts.isArrayLiteralExpression(node.initializer)) {
				node.initializer.elements.forEach((elem) => {
					const interfaceName = (elem as ts.StringLiteral).text;
					const deprecationInfo = this.apiExtract.getDeprecationInfo(interfaceName);
					if (deprecationInfo) {
						this.#reporter.addMessage(MESSAGE.DEPRECATED_INTERFACE, {
							interfaceName: interfaceName,
							details: deprecationInfo.text,
						}, {node: elem});
					}
				});
			}
		} else if (type === "altTypes" && ts.isArrayLiteralExpression(node.initializer)) {
			node.initializer.elements.forEach((element) => {
				const nodeType = ts.isStringLiteralLike(element) ? element.text : "";
				const deprecationInfo = this.apiExtract.getDeprecationInfo(nodeType);
				if (deprecationInfo) {
					this.#reporter.addMessage(MESSAGE.DEPRECATED_TYPE, {
						typeName: nodeType,
						details: deprecationInfo.text,
					}, {node: element});
				}
			});
		} else if (type === "defaultValue") {
			const defaultValueType = ts.isStringLiteralLike(node.initializer) ?
				node.initializer.text :
				"";

			const typeNode = getPropertyAssignmentInObjectLiteralExpression("type", node.parent);

			const fullyQuantifiedName = (typeNode &&
				ts.isPropertyAssignment(typeNode) &&
				ts.isStringLiteralLike(typeNode.initializer)) ?
					[typeNode.initializer.text, defaultValueType].join(".") :
				"";
			const deprecationInfo = this.apiExtract.getDeprecationInfo(fullyQuantifiedName);
			if (deprecationInfo) {
				this.#reporter.addMessage(MESSAGE.DEPRECATED_TYPE, {
					typeName: defaultValueType,
					details: deprecationInfo.text,
				}, {node});
			}
		// This one is too generic and should always be at the last place
		// It's for "types" and event arguments' types
		} else if (ts.isStringLiteralLike(node.initializer)) {
			// Strip all the complex type definitions and create a list of "simple" types
			// i.e. Record<string, Map<my.custom.type, Record<another.type, number[]>>>
			// -> string, my.custom.type, another.type, number
			const nodeTypes = node.initializer.text.replace(/\w+<|>|\[\]/gi, "")
				.split(",").map((type) => type.trim());

			nodeTypes.forEach((nodeType) => {
				const deprecationInfo = this.apiExtract.getDeprecationInfo(nodeType);
				if (deprecationInfo?.symbolKind === "UI5Class") {
					this.#reporter.addMessage(MESSAGE.DEPRECATED_CLASS, {
						className: nodeType,
						details: deprecationInfo.text,
					}, {node: node.initializer});
				} else if (deprecationInfo?.symbolKind === "UI5Typedef" || deprecationInfo?.symbolKind === "UI5Enum") {
					this.#reporter.addMessage(MESSAGE.DEPRECATED_TYPE, {
						typeName: nodeType,
						details: deprecationInfo.text,
					}, {node: node.initializer});
				}
			});
		}
		analyzeMetadataDone();
	}

	analyzeIdentifier(node: ts.Identifier) {
		const type = this.checker.getTypeAtLocation(node);
		if (!type?.symbol || !this.isSymbolOfUi5OrThirdPartyType(type.symbol)) {
			return false;
		}
		const deprecationInfo = this.getDeprecationInfo(type.symbol);
		if (deprecationInfo) {
			this.#reporter.addMessage(MESSAGE.DEPRECATED_API_ACCESS, {
				apiName: node.text,
				details: deprecationInfo.messageDetails,
			}, {
				node,
				ui5TypeInfo: deprecationInfo.ui5TypeInfo,
				fix: this.getFix(node, deprecationInfo.ui5TypeInfo),
			});
			return true;
		}
		return false;
	}

	analyzeObjectBindingPattern(node: ts.ObjectBindingPattern) {
		const objectBindingPatternType = this.checker.getTypeAtLocation(node);
		node.elements.forEach((element) => {
			if (element.kind === ts.SyntaxKind.BindingElement &&
				element.name.kind === ts.SyntaxKind.Identifier) {
				let identifier;
				if (element.propertyName) {
					if (!ts.isIdentifier(element.propertyName)) {
						return;
					}
					identifier = element.propertyName;
				} else {
					identifier = element.name;
				}

				if (this.analyzeIdentifier(identifier)) {
					return;
				}
				const property = objectBindingPatternType.getProperty(identifier.text);
				const deprecationInfo = this.getDeprecationInfo(property);
				if (deprecationInfo) {
					this.#reporter.addMessage(MESSAGE.DEPRECATED_API_ACCESS, {
						apiName: identifier.text,
						details: deprecationInfo.messageDetails,
					}, {
						node: element.name,
						ui5TypeInfo: deprecationInfo.ui5TypeInfo,
						fix: this.getFix(element, deprecationInfo.ui5TypeInfo),
					});
					return;
				}
			}
			// Currently this lacks support for handling nested destructuring, e.g.
			//   `const { SomeObject: { SomeOtherObject } } = coreLib;`
			// Also not covered is destructuring with computed property names, e.g.
			//   const propName = "SomeObject"
			//   const {[propName]: SomeVar} = coreLib;
			// Neither is expected to be relevant in the context of UI5 API usage.
		});
	}

	analyzeNewExpression(node: ts.NewExpression) {
		if (this.hasQUnitFileExtension() &&
			((ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "jsUnitTestSuite") ||
				(ts.isIdentifier(node.expression) && node.expression.text === "jsUnitTestSuite")
			)) {
			this.#reportTestStarter(node);
		}

		const nodeType = this.checker.getTypeAtLocation(node); // checker.getContextualType(node);
		if (!nodeType.symbol || !this.isSymbolOfUi5OrThirdPartyType(nodeType.symbol)) {
			return;
		}
		const classType = this.checker.getTypeAtLocation(node.expression);

		const ui5TypeInfo = getUi5TypeInfoFromSymbol(nodeType.symbol, this.apiExtract);
		if (!ui5TypeInfo) {
			return;
		}
		const ui5ModuleTypeInfo = getModuleTypeInfo(ui5TypeInfo);
		if (!ui5ModuleTypeInfo) {
			return;
		}
		if (
			ui5ModuleTypeInfo?.kind === Ui5TypeInfoKind.Module &&
			ui5ModuleTypeInfo.name === "sap/ui/core/routing/Router"
		) {
			this.#analyzeNewCoreRouter(node);
		} else if (nodeType.symbol.declarations?.some(
			(declaration) => ts.isClassDeclaration(declaration) &&
				this.isUi5ClassDeclaration(declaration, "sap/ui/base/ManagedObject"))
		) {
			const originalFilename = this.#metadata?.xmlCompiledResource;
			// Do not process xml-s. This case would be handled separately within the BindingParser
			if (!originalFilename ||
				![".view.xml", ".fragment.xml"].some((ending) => originalFilename.endsWith(ending))) {
				this.#analyzeNewAndApplySettings(node);
			}
		}

		if (!node.arguments?.length) {
			// Nothing to check
			return;
		}

		// There can be multiple and we need to find the right one
		const allConstructSignatures = classType.getConstructSignatures();
		// We can ignore all signatures that have a different number of parameters
		const possibleConstructSignatures = allConstructSignatures.filter((constructSignature) => {
			return constructSignature.getParameters().length === node.arguments?.length;
		});

		node.arguments.forEach((arg, argIdx) => {
			// Only handle object literals, ignoring the optional first id argument or other unrelated arguments
			if (!ts.isObjectLiteralExpression(arg)) {
				return;
			}
			arg.properties.forEach((prop) => {
				if (!ts.isPropertyAssignment(prop)) {
					return;
				}
				const propertyName = getPropertyNameText(prop.name);
				if (!propertyName) {
					return;
				}
				const propertySymbol = getSymbolForPropertyInConstructSignatures(
					possibleConstructSignatures, argIdx, propertyName
				);
				if (!propertySymbol) {
					return;
				}
				const deprecationInfo = this.getDeprecationInfo(propertySymbol);
				if (deprecationInfo) {
					this.#reporter.addMessage(MESSAGE.DEPRECATED_PROPERTY_OF_CLASS,
						{
							propertyName: propertySymbol.escapedName as string,
							className: this.checker.typeToString(nodeType),
							details: deprecationInfo.messageDetails,
						},
						{
							node: prop,
							ui5TypeInfo: deprecationInfo.ui5TypeInfo,
							fix: this.getFix(prop, deprecationInfo.ui5TypeInfo),
						}
					);
					return;
				}
				let reportMessage;
				if (ui5ModuleTypeInfo?.kind === Ui5TypeInfoKind.Module &&
					ui5ModuleTypeInfo.name === "sap/ui/model/odata/v4/ODataModel" &&
					propertyName === "synchronizationMode") {
					reportMessage = MESSAGE.DEPRECATED_ODATA_MODEL_V4_SYNCHRONIZATION_MODE;
				}
				if (!reportMessage) {
					return;
				}
				const ui5TypeInfo = getUi5TypeInfoFromSymbol(propertySymbol, this.apiExtract);
				this.#reporter.addMessage(reportMessage, null, {
					node: prop,
					fix: this.getFix(prop, ui5TypeInfo),
				});
			});
		});
	}

	getDeprecationText(deprecatedTag: ts.JSDocTagInfo): string {
		// (Workaround) There's an issue in some UI5 TS definition versions and where the
		// deprecation text gets merged with the description. Splitting on double
		// new line could be considered as a clear separation between them.
		// https://github.com/SAP/ui5-typescript/issues/429
		return deprecatedTag.text?.reduce((acc, text) => acc + text.text, "").split("\n\n")[0] ?? "";
	}

	getDeprecationInfo(symbol: ts.Symbol | undefined): DeprecationInfo | null {
		if (symbol && this.isSymbolOfUi5Type(symbol)) {
			const jsdocTags = symbol.getJsDocTags(this.checker);
			const deprecatedTag = jsdocTags.find((tag) => tag.name === "deprecated");
			if (deprecatedTag) {
				const deprecationInfo: DeprecationInfo = {
					symbol, messageDetails: "", ui5TypeInfo: getUi5TypeInfoFromSymbol(symbol, this.apiExtract),
				};
				if (this.messageDetails) {
					deprecationInfo.messageDetails = this.getDeprecationText(deprecatedTag);
				}
				return deprecationInfo;
			}
		}
		return null;
	}

	analyzeCallExpression(node: ts.CallExpression) {
		const exprNode = node.expression;
		const exprType = this.checker.getTypeAtLocation(exprNode);
		if (!exprType?.symbol || !this.isSymbolOfUi5OrThirdPartyType(exprType.symbol)) {
			if (this.reportCoverage) {
				this.handleCallExpressionUnknownType(exprType, node);
			}
			return;
		}

		// Note: Always retrieving the type of the call expression causes the type checker to analyze the
		// return type, which seems to improve the accuracy of the type information.
		// See NoDeprecatedApi test case "ControllerByIdThisContext.js"
		this.checker.getTypeAtLocation(node);

		if (ts.isNewExpression(exprNode)) {
			// e.g. new Class()();
			// This is usually unexpected and there are currently no known deprecations of functions
			// returned by a class constructor.
			// However, the OPA Matchers are a known exception where constructors do return a function.
			return;
		} else if (exprNode.kind === ts.SyntaxKind.SuperKeyword) {
			// Ignore super calls
			return;
		}

		if (!ts.isPropertyAccessExpression(exprNode) && // Lib.init()
			!ts.isElementAccessExpression(exprNode) && // Lib["init"]()
			!ts.isIdentifier(exprNode) && // Assignment `const LibInit = Library.init` and destructuring
			!ts.isCallExpression(exprNode)) {
			// TODO: Transform into coverage message if it's really ok not to handle this
			throw new Error(`Unhandled CallExpression expression syntax: ${ts.SyntaxKind[exprNode.kind]}`);
		}

		const ui5TypeInfo = getUi5TypeInfoFromSymbol(exprType.symbol, this.apiExtract);
		let globalApiName;
		if (ui5TypeInfo) {
			if (ui5TypeInfo.kind === Ui5TypeInfoKind.Function) {
				const namespace = getNamespace(ui5TypeInfo);
				if (namespace) {
					globalApiName = namespace + "." + ui5TypeInfo.name;
					if (
						globalApiName === "sap.ui.view" ||
						globalApiName === "sap.ui.xmlview" ||
						globalApiName === "sap.ui.fragment" ||
						globalApiName === "sap.ui.xmlfragment"
					) {
						this.#extractXmlFromJs(node, globalApiName);
					}
				}
			} else if ("name" in ui5TypeInfo) {
				const moduleTypeInfo = getModuleTypeInfo(ui5TypeInfo);
				if (moduleTypeInfo) {
					const moduleName = moduleTypeInfo.name;
					const symbolName = ui5TypeInfo.name;
					let instanceType: ts.Type | undefined = undefined;
					if (ts.isElementAccessExpression(exprNode) || ts.isPropertyAccessExpression(exprNode)) {
						instanceType = this.checker.getTypeAtLocation(exprNode.expression);
					}
					if (symbolName === "init" && moduleName === "sap/ui/core/Lib") {
						// Check for sap/ui/core/Lib.init usages
						this.#analyzeLibInitCall(node, exprNode);
					} else if (symbolName === "get" && moduleName === "sap/ui/core/theming/Parameters") {
						this.#analyzeParametersGetCall(node);
					} else if (symbolName === "createComponent" && moduleName === "sap/ui/core/Component") {
						this.#analyzeCreateComponentCall(node);
					} else if (symbolName === "loadData" && moduleName === "sap/ui/model/json/JSONModel") {
						this.#analyzeJsonModelLoadDataCall(node);
					} else if (symbolName === "createEntry" && moduleName === "sap/ui/model/odata/v2/ODataModel") {
						this.#analyzeOdataModelV2CreateEntry(node);
					} else if (symbolName === "init" && moduleName === "sap/ui/util/Mobile") {
						this.#analyzeMobileInit(node);
					} else if (symbolName === "setTheme" && moduleName === "sap/ui/core/Theming") {
						this.#analyzeThemingSetTheme(node);
					} else if (symbolName === "create" && moduleName === "sap/ui/core/mvc/View") {
						this.#analyzeViewCreate(node);
					} else if (
						(symbolName === "load" && moduleName === "sap/ui/core/Fragment") ||
						// Controller#loadFragment calls Fragment.load internally
						(symbolName === "loadFragment" && moduleName === "sap/ui/core/mvc/Controller")
					) {
						this.#analyzeFragmentLoad(node, symbolName);
					} else if (this.hasQUnitFileExtension() &&
						!VALID_TESTSUITE.test(this.sourceFile.fileName) &&
						symbolName === "ready" && moduleName === "sap/ui/core/Core") {
						this.#reportTestStarter(node);
					} else if (symbolName === "applySettings" &&
						instanceType?.symbol?.declarations?.some((declaration) =>
							ts.isClassDeclaration(declaration) &&
							this.isUi5ClassDeclaration(declaration, "sap/ui/base/ManagedObject"))) {
						this.#analyzeNewAndApplySettings(node);
					} else if (["bindProperty", "bindAggregation"].includes(symbolName) &&
						moduleName === "sap/ui/base/ManagedObject" &&
						node.arguments[1] && ts.isObjectLiteralExpression(node.arguments[1])) {
						this.#analyzePropertyBindings(node.arguments[1]);
					} else if (symbolName.startsWith("bind") &&
						instanceType?.symbol?.declarations?.some((declaration) =>
							ts.isClassDeclaration(declaration) &&
							this.isUi5ClassDeclaration(declaration, "sap/ui/base/ManagedObject")) &&
							node.arguments[0] && ts.isObjectLiteralExpression(node.arguments[0])) {
						// Setting names in UI5 are case sensitive. So, we're not sure of the exact name of the
						// property.
						// Check decapitalized version of the property name as well.
						const propName = symbolName.replace("bind", "");
						const alternativePropName = propName.charAt(0).toLowerCase() + propName.slice(1);

						if (this.#isPropertyBinding(node, [propName, alternativePropName])) {
							this.#analyzePropertyBindings(node.arguments[0]);
						}
					} else if (symbolName === "create" && moduleName === "sap/ui/core/mvc/XMLView") {
						this.#extractXmlFromJs(node, "XMLView.create");
					}
				}
			}
		}

		const deprecationInfo = this.getDeprecationInfo(exprType.symbol);
		if (!deprecationInfo) {
			return;
		}

		let reportNode;
		if (ts.isPropertyAccessExpression(exprNode)) {
			reportNode = exprNode.name;
		} else if (ts.isElementAccessExpression(exprNode)) {
			reportNode = exprNode.argumentExpression;
		} else { // Identifier / CallExpression
			reportNode = exprNode;
		}

		let additionalMessage = "";
		if (exprNode.kind === ts.SyntaxKind.PropertyAccessExpression ||
			exprNode.kind === ts.SyntaxKind.ElementAccessExpression) {
			// Get the type to the left of the call expression (i.e. what the function is being called on)
			const lhsExpr = exprNode.expression;
			const lhsExprType = this.checker.getTypeAtLocation(lhsExpr);
			if (lhsExprType.isClassOrInterface()) {
				// left-hand-side is an instance of a class, e.g. "instance.deprecatedMethod()"
				additionalMessage = `of class '${this.checker.typeToString(lhsExprType)}'`;
			} else if (ts.isCallExpression(lhsExpr)) {
				// left-hand-side is a function call, e.g. "function().deprecatedMethod()"
				// Use the (return) type of that function call
				additionalMessage = `of module '${this.checker.typeToString(lhsExprType)}'`;
			} else if (ts.isPropertyAccessExpression(exprNode)) {
				// left-hand-side is a module or namespace, e.g. "module.deprecatedMethod()"
				additionalMessage = `(${extractNamespace(exprNode)})`;
			}
		} else if (globalApiName) {
			additionalMessage = `(${globalApiName})`;
		}

		let propName;
		if (ts.isPropertyName(reportNode)) {
			propName = getPropertyNameText(reportNode);
		}

		propName ??= reportNode.getText();

		this.#reporter.addMessage(MESSAGE.DEPRECATED_FUNCTION_CALL, {
			functionName: propName,
			additionalMessage,
			details: deprecationInfo.messageDetails,
		}, {
			node: reportNode,
			ui5TypeInfo: deprecationInfo.ui5TypeInfo,
			fix: this.getFix(node, deprecationInfo.ui5TypeInfo),
		});

		if (
			propName === "attachInit" && this.hasQUnitFileExtension() &&
			!VALID_TESTSUITE.test(this.sourceFile.fileName)
		) {
			this.#reportTestStarter(reportNode);
		}
	}

	#analyzeLibInitCall(
		node: ts.CallExpression,
		exprNode: ts.CallExpression | ts.ElementAccessExpression | ts.PropertyAccessExpression | ts.Identifier) {
		const initArg = node?.arguments[0] &&
			ts.isObjectLiteralExpression(node.arguments[0]) &&
			node.arguments[0];

		let nodeToHighlight;

		if (!initArg) {
			nodeToHighlight = node;
		} else {
			const apiVersionNode = getPropertyAssignmentInObjectLiteralExpression("apiVersion", initArg);

			if (!apiVersionNode) { // No arguments or no 'apiVersion' property
				nodeToHighlight = node;
			} else if (
				!ts.isNumericLiteral(apiVersionNode.initializer) || // Must be a number, not a string
				apiVersionNode.initializer.text !== "2"
			) {
				nodeToHighlight = apiVersionNode;
			}
		}

		if (nodeToHighlight) {
			let importedVarName: string;
			if (ts.isIdentifier(exprNode)) {
				importedVarName = exprNode.text;
			} else {
				importedVarName = exprNode.expression.getText() + ".init";
			}

			this.#reporter.addMessage(MESSAGE.LIB_INIT_API_VERSION, {
				libInitFunction: importedVarName,
			}, {node: nodeToHighlight});
		}

		if (initArg) {
			this.#analyzeLibInitDeprecatedLibs(initArg);
		}
	}

	#analyzeLibInitDeprecatedLibs(initArg: ts.ObjectLiteralExpression) {
		const dependenciesNode = getPropertyAssignmentInObjectLiteralExpression(
			"dependencies", initArg
		);

		if (!dependenciesNode ||
			!ts.isPropertyAssignment(dependenciesNode) ||
			!ts.isArrayLiteralExpression(dependenciesNode.initializer)) {
			return;
		}

		dependenciesNode.initializer.elements.forEach((dependency) => {
			if (!ts.isStringLiteralLike(dependency)) {
				// We won't be interested if the elements of the Array are not of type
				// StringLiteralLike, so we ignore such cases here (if such at all).
				return;
			}

			const curLibName = dependency.text;

			if (deprecatedLibraries.includes(curLibName)) {
				this.#reporter.addMessage(MESSAGE.DEPRECATED_LIBRARY, {
					libraryName: curLibName,
				}, {node: dependency});
			}
		});
	}

	#reportTestStarter(node: ts.Node) {
		if (!this.#hasTestStarterFindings) {
			this.#reporter.addMessage(MESSAGE.PREFER_TEST_STARTER, null, {node});
			this.#hasTestStarterFindings = true;
		}
	}

	#extractXmlFromJs(
		callExpression: ts.CallExpression,
		apiName: "View.create" | "XMLView.create" | "Fragment.load" | "sap.ui.view" | "sap.ui.xmlview" |
			"sap.ui.fragment" | "sap.ui.xmlfragment"
	) {
		// xmlCompiledResource is an XML file, so we don't need to do extraction here
		if (this.#metadata?.xmlCompiledResource) {
			return;
		}

		const options = callExpression.arguments[0];
		if (!options || !ts.isObjectLiteralExpression(options)) {
			return;
		}

		let documentKind: "view" | "fragment";
		switch (apiName) {
			case "View.create":
			case "XMLView.create":
			case "sap.ui.view":
			case "sap.ui.xmlview":
				documentKind = "view";
				break;
			case "Fragment.load":
			case "sap.ui.fragment":
			case "sap.ui.xmlfragment":
				documentKind = "fragment";
				break;
			default:
				throw new Error("Unexpected apiName");
		}

		let definitionPropertyName;
		switch (apiName) {
			case "View.create":
			case "XMLView.create":
			case "Fragment.load":
				definitionPropertyName = "definition";
				break;
			default:
				definitionPropertyName = `${documentKind}Content`;
				break;
		}

		let typeValue;
		if (!["XMLView.create", "sap.ui.xmlview", "sap.ui.xmlfragment"].includes(apiName)) {
			const typeProperty = getPropertyAssignmentInObjectLiteralExpression("type", options);
			if (typeProperty) {
				if (ts.isStringLiteralLike(typeProperty.initializer)) {
					typeValue = typeProperty.initializer.text;
				} else if (typeProperty) {
					const typeType = this.checker.getTypeAtLocation(typeProperty.initializer);
					if (typeType?.isStringLiteral()) {
						typeValue = typeType.value;
					}
				}
			}
		}

		// Only extract XML content, not other types like HTML
		if (typeValue && typeValue !== "XML") {
			return;
		}

		const definitionProperty = getPropertyAssignmentInObjectLiteralExpression(definitionPropertyName, options);

		if (!definitionProperty || !ts.isStringLiteralLike(definitionProperty.initializer)) {
			return;
		}

		const sourceMapJson = this.typeLinter.getSourceMap(this.sourceFile.fileName);
		const traceMap = sourceMapJson ?
			new TraceMap(JSON.parse(sourceMapJson) as SourceMapInput) :
			undefined;
		const pos = this.sourceFile.getLineAndCharacterOfPosition(definitionProperty.initializer.pos);
		const posInSource = traceMap ?
				originalPositionFor(traceMap, {line: pos.line, column: pos.character}) :
			null;
		const originalPos = posInSource ?
				{line: posInSource.line ?? 0, character: posInSource.column ?? 0} :
			pos;

		this.#xmlContents.push({
			xml: definitionProperty.initializer.text,
			pos: originalPos,
			documentKind: documentKind,
		});
	}

	#analyzeParametersGetCall(node: ts.CallExpression) {
		if (node.arguments.length && ts.isObjectLiteralExpression(node.arguments[0])) {
			// Non-deprecated usage
			return;
		}

		this.#reporter.addMessage(MESSAGE.PARTIALLY_DEPRECATED_PARAMETERS_GET, null, {node});
	}

	#analyzeCreateComponentCall(node: ts.CallExpression) {
		if (!node.arguments.length || !ts.isObjectLiteralExpression(node.arguments[0])) {
			return;
		}

		const asyncNode = getPropertyAssignmentInObjectLiteralExpression(
			"async", node.arguments[0]
		);

		if (asyncNode?.initializer.kind === ts.SyntaxKind.FalseKeyword) {
			this.#reporter.addMessage(MESSAGE.PARTIALLY_DEPRECATED_CREATE_COMPONENT, null, {node: asyncNode});
		}
	}

	#analyzeOdataModelV2CreateEntry(node: ts.CallExpression) {
		if (!node.arguments.length || node.arguments.length < 2 || !ts.isObjectLiteralExpression(node.arguments[1])) {
			return;
		}

		const [batchGroupId, properties] = getPropertyAssignmentsInObjectLiteralExpression(
			["batchGroupId", "properties"], node.arguments[1]
		);

		if (batchGroupId) {
			this.#reporter.addMessage(
				MESSAGE.PARTIALLY_DEPRECATED_ODATA_MODEL_V2_CREATE_ENTRY,
				null,
				{node: batchGroupId}
			);
		}
		if (properties && ts.isArrayLiteralExpression(properties.initializer)) {
			this.#reporter.addMessage(
				MESSAGE.PARTIALLY_DEPRECATED_ODATA_MODEL_V2_CREATE_ENTRY_PROPERTIES_ARRAY,
				null,
				{node: properties}
			);
		}
	}

	#analyzeJsonModelLoadDataCall(node: ts.CallExpression) {
		if (!node.arguments.length || node.arguments.length < 3) {
			return;
		}

		const asyncArg = node.arguments[2];
		if (asyncArg.kind === ts.SyntaxKind.FalseKeyword) {
			this.#reporter.addMessage(MESSAGE.PARTIALLY_DEPRECATED_JSON_MODEL_LOAD_DATA, {
				paramName: "bAsync",
			}, {node: asyncArg});
		}

		if (node.arguments.length < 6) {
			return;
		}
		const cacheArg = node.arguments[5];
		if (cacheArg.kind === ts.SyntaxKind.FalseKeyword) {
			this.#reporter.addMessage(MESSAGE.PARTIALLY_DEPRECATED_JSON_MODEL_LOAD_DATA, {
				paramName: "bCache",
			}, {node: cacheArg});
		}
	}

	#analyzeMobileInit(node: ts.CallExpression) {
		if (!node.arguments.length || !ts.isObjectLiteralExpression(node.arguments[0])) {
			return;
		}

		const [homeIconArg, homeIconPrecomposedArg] = getPropertyAssignmentsInObjectLiteralExpression(
			["homeIcon", "homeIconPrecomposed"], node.arguments[0]
		);

		if (homeIconArg) {
			this.#reporter.addMessage(MESSAGE.PARTIALLY_DEPRECATED_MOBILE_INIT, {
				paramName: "homeIcon",
			}, {node: homeIconArg});
		}
		if (homeIconPrecomposedArg) {
			this.#reporter.addMessage(MESSAGE.PARTIALLY_DEPRECATED_MOBILE_INIT, {
				paramName: "homeIconPrecomposed",
			}, {node: homeIconPrecomposedArg});
		}
	}

	#analyzeThemingSetTheme(node: ts.CallExpression) {
		if (!node.arguments.length || !ts.isStringLiteralLike(node.arguments[0])) {
			return;
		}
		const themeName = node.arguments[0].text;
		if (deprecatedThemes.includes(themeName)) {
			this.#reporter.addMessage(MESSAGE.DEPRECATED_THEME, {
				themeName,
			}, {node: node.arguments[0]});
		}
	}

	#analyzeNewCoreRouter(node: ts.NewExpression) {
		if (!node.arguments || node.arguments.length < 2 || !ts.isObjectLiteralExpression(node.arguments[1])) {
			return;
		}

		const asyncProb = getPropertyAssignmentInObjectLiteralExpression(
			"async", node.arguments[1]
		);

		if (!asyncProb || asyncProb.initializer.kind !== ts.SyntaxKind.TrueKeyword) {
			this.#reporter.addMessage(MESSAGE.PARTIALLY_DEPRECATED_CORE_ROUTER, null, {node});
		}
	}

	#analyzeViewCreate(node: ts.CallExpression) {
		if (!node.arguments?.length || !ts.isObjectLiteralExpression(node.arguments[0])) {
			return;
		}

		// Find "type" property
		const typeProperty = getPropertyAssignmentInObjectLiteralExpression("type", node.arguments[0]);

		if (typeProperty && ts.isStringLiteralLike(typeProperty.initializer)) {
			const typeValue = typeProperty.initializer.text;
			if (DEPRECATED_VIEW_TYPES.includes(typeValue)) {
				this.#reporter.addMessage(MESSAGE.PARTIALLY_DEPRECATED_VIEW_CREATE, {
					typeValue,
				}, {node});
			}
		}

		this.#extractXmlFromJs(node, "View.create");
	}

	#analyzeFragmentLoad(node: ts.CallExpression, symbolName: "load" | "loadFragment") {
		// Note: This method is called for:
		// - sap/ui/core/Fragment.load
		// - sap/ui/core/mvc/Controller#loadFragment

		if (!node.arguments?.length || !ts.isObjectLiteralExpression(node.arguments[0])) {
			return;
		}

		// Find "type" property
		const typeProperty = getPropertyAssignmentInObjectLiteralExpression("type", node.arguments[0]);

		if (typeProperty && ts.isStringLiteralLike(typeProperty.initializer)) {
			const typeValue = typeProperty.initializer.text;
			if (typeValue === "HTML") {
				if (symbolName === "load") {
					this.#reporter.addMessage(MESSAGE.PARTIALLY_DEPRECATED_FRAGMENT_LOAD, {
						typeValue,
					}, {node});
				} else {
					this.#reporter.addMessage(MESSAGE.PARTIALLY_DEPRECATED_CONTROLLER_LOAD_FRAGMENT, {
						typeValue,
					}, {node});
				}
			}
		}

		this.#extractXmlFromJs(node, "Fragment.load");
	}

	#analyzeNewAndApplySettings(node: ts.NewExpression | ts.CallExpression) {
		node?.arguments?.filter((arg) => ts.isObjectLiteralExpression(arg))
			.flatMap((arg) => arg.properties)
			.forEach((prop) => {
				if (ts.isPropertyAssignment(prop) &&
					(ts.isCallExpression(node) ||
						this.#isPropertyBinding(node, [getPropertyNameText(prop.name) ?? ""]))
				) {
					if (ts.isObjectLiteralExpression(prop.initializer)) {
						this.#analyzePropertyBindings(prop.initializer);
					} else {
						this.#analyzePropertyStringBindings(prop);
					}
				}
			});
	}

	#analyzePropertyBindings(node: ts.ObjectLiteralExpression) {
		node?.properties.forEach((prop) => {
			if (!ts.isPropertyAssignment(prop)) {
				return;
			}

			const propertyNameText = getPropertyNameText(prop.name);
			if (!propertyNameText) {
				return;
			}

			if (propertyNameText === "parts" && ts.isArrayLiteralExpression(prop.initializer)) {
				// If the property is 'parts', we need to analyze each part (recursively)
				prop.initializer.elements.forEach((part) => {
					if (ts.isObjectLiteralExpression(part)) {
						this.#analyzePropertyBindings(part);
					}
				});
			} else if (propertyNameText === "formatter" && ts.isStringLiteralLike(prop.initializer)) {
				// Special Case (JS/TS): If the value of the property 'formatter' is a string,
				// it should be detected since the runtime cannot resolve it
				// even if a 'formatter' variable is imported:
				this.#reporter.addMessage(
					MESSAGE.STRING_FOR_FORMATTER_VALUE_IN_JS, null, {node: prop.initializer}
				);
			} else if (propertyNameText === "type") {
				this.#analyzeBindingPropertyNode(prop.initializer);
			}
		});
	}

	#analyzePropertyStringBindings(node: ts.PropertyAssignment) {
		if (ts.isStringLiteralLike(node.initializer) &&
			node.initializer.text.startsWith("{") && node.initializer.text.endsWith("}")) {
			const imports = this.sourceFile.statements
				.filter((stmnt): stmnt is ts.ImportDeclaration =>
					stmnt.kind === ts.SyntaxKind.ImportDeclaration)
				.map((importNode) => {
					return {
						moduleName: (importNode.moduleSpecifier as ts.StringLiteral).text,
						variableName: importNode.importClause?.name?.text,
					} as RequireDeclaration;
				});

			const nodeSourceMap = this.typeLinter.getSourceMap(this.resourcePath);
			const {start: nodePos} = getPositionsForNode({
				node: node.initializer,
				sourceFile: this.sourceFile,
				resourcePath: this.resourcePath,
				traceMap: nodeSourceMap ? new TraceMap(nodeSourceMap) : undefined,
			});
			const bindingLinter = new BindingLinter(this.resourcePath, this.typeLinter.getContext(), true);
			bindingLinter.lintPropertyBinding(node.initializer.text, imports, nodePos);
		}
	}

	/**
	 * Identify if a constructor argument property is bindable
	 *
	 * Get the class declaration by going up the chain and then find the argument property
	 * from there. Directly finding the type of the property is not possible from here as it's
	 * missing some context.
	*/
	#isPropertyBinding(node: ts.NewExpression | ts.CallExpression, propNames: string[]) {
		const controlAmbientModule =
			getSymbolModuleDeclaration(this.checker.getTypeAtLocation(node).symbol);

		let classArg;
		if (controlAmbientModule?.body && ts.isModuleBlock(controlAmbientModule.body)) {
			classArg = controlAmbientModule.body.statements
				?.find((stmnt): stmnt is ts.ClassDeclaration => stmnt.kind === ts.SyntaxKind.ClassDeclaration)
				?.members.find((m): m is ts.ConstructorDeclaration => m.kind === ts.SyntaxKind.Constructor);
		}

		const constructorArgType = classArg && this.checker.getTypeAtLocation(classArg.parameters[0]);
		const argProperty = constructorArgType?.getProperties()
			.find((p: ts.Symbol) => propNames.includes(p.name));
		const argPropType = argProperty?.valueDeclaration &&
			this.checker.getTypeAtLocation(argProperty.valueDeclaration);

		return argPropType?.isUnion() && argPropType.types.some((t) => {
			return t?.getSymbol()?.getName() === "PropertyBindingInfo" ||
				t.aliasSymbol?.getName() === "PropertyBindingInfo";
		});
	}

	#analyzeBindingPropertyNode(node: ts.Expression) {
		if (!ts.isStringLiteralLike(node)) {
			return;
		}

		const moduleName = node.text.replaceAll(".", "/");
		const hasModuleImported = this.sourceFile.statements.filter(ts.isImportDeclaration)
			.some((importNode) =>
				ts.isStringLiteralLike(importNode.moduleSpecifier) &&
				importNode.moduleSpecifier.text === moduleName);

		if (!hasModuleImported) {
			this.#reporter.addMessage(MESSAGE.NO_GLOBALS, {
				variableName: node.text,
				namespace: moduleName,
			}, {node});
		}
	}

	getDeprecationInfoForAccess(node: ts.AccessExpression): DeprecationInfo | null {
		let symbol;
		if (ts.isPropertyAccessExpression(node)) {
			symbol = this.checker.getSymbolAtLocation(node.name);
		} else { // ElementAccessExpression
			symbol = this.checker.getSymbolAtLocation(node.argumentExpression);
		}
		return this.getDeprecationInfo(symbol);
	}

	analyzePropertyAccessExpressionForDeprecation(node: ts.AccessExpression): boolean {
		if (ts.isCallExpression(node.parent) && node.parent.expression === node) {
			// If this AccessExpression is the expression of a CallExpression, we can ignore it here.
			// It will be analyzed in context of the CallExpression.
			return false;
		}
		const deprecationInfo = this.getDeprecationInfoForAccess(node);
		if (!deprecationInfo) {
			return false;
		}
		let namespace;
		if (ts.isPropertyAccessExpression(node)) {
			namespace = extractNamespace(node);
		}
		if (this.isSymbolOfJquerySapType(deprecationInfo.symbol)) {
			const typeInfo = getJqueryTypeInfo(node);
			let ui5TypeInfo;
			let fix;
			if (typeInfo) {
				ui5TypeInfo = typeInfo.ui5TypeInfo;
				fix = this.getJqueryFix(typeInfo.node, typeInfo.ui5TypeInfo);
			}
			this.#reporter.addMessage(MESSAGE.DEPRECATED_API_ACCESS, {
				apiName: namespace ?? "jQuery.sap",
				details: deprecationInfo.messageDetails,
			}, {
				node,
				ui5TypeInfo,
				fix,
			});
		} else {
			this.#reporter.addMessage(MESSAGE.DEPRECATED_PROPERTY, {
				propertyName: deprecationInfo.symbol.escapedName as string,
				namespace,
				details: deprecationInfo.messageDetails,
			}, {
				node,
				ui5TypeInfo: deprecationInfo.ui5TypeInfo,
				fix: this.getFix(node, deprecationInfo.ui5TypeInfo),
			});
		}
		return true;
	}

	handleCallExpressionUnknownType(nodeType: ts.Type, node: ts.CallExpression) {
		const typeString = this.checker.typeToString(nodeType);
		let identifier;
		if (ts.isPropertyAccessExpression(node.expression)) {
			identifier = node.expression.name;
		}
		if (typeString === "any" && !ts.isImportDeclaration(node.parent.parent)) {
			this.#reporter.addCoverageInfo({
				node,
				category: CoverageCategory.CallExpressionUnknownType,
				message:
					`Unable to analyze this method call because the type of identifier` +
					`${identifier ? " \"" + identifier.text + "\"" : ""} in "${node.getText()}" ` +
					`could not be determined`,
			});
		}
	}

	analyzeExportedValuesByLib(node: ts.PropertyAccessExpression | ts.ElementAccessExpression) {
		if (!ts.isElementAccessExpression(node) &&
			node.name?.kind !== ts.SyntaxKind.Identifier) {
			return;
		}

		const extractVarName = (node: ts.PropertyAccessExpression | ts.ElementAccessExpression) => {
			if (ts.isPropertyAccessExpression(node)) {
				return node.name.text;
			} else if (ts.isStringLiteralLike(node.argumentExpression)) {
				return node.argumentExpression.text;
			} else {
				return node.argumentExpression.getText();
			}
		};

		let exprNode = node.expression;
		const namespace: string[] = [];
		while (ts.isPropertyAccessExpression(exprNode) ||
			ts.isElementAccessExpression(exprNode)) {
			namespace.unshift(extractVarName(exprNode));
			exprNode = exprNode.expression;
		}
		const exprTypeSymbol = this.checker.getTypeAtLocation(exprNode)?.symbol;
		let potentialLibImport = "";
		if (exprTypeSymbol?.valueDeclaration && ts.isModuleDeclaration(exprTypeSymbol.valueDeclaration)) {
			potentialLibImport = exprTypeSymbol.valueDeclaration.name.text;
		}

		// Checks if the left hand side is a library import.
		// It's sufficient just to check for "/library" at the end of the string by convention
		if (!potentialLibImport.endsWith("/library")) {
			// Fallback in case of relative imports within framework libraries, where the type does not have a symbol
			const exprSymbol = this.checker.getSymbolAtLocation(exprNode);
			const exprDeclaration = exprSymbol?.declarations?.[0];
			if (!exprDeclaration?.parent) {
				return;
			}
			if (!ts.isImportDeclaration(exprDeclaration.parent)) {
				return;
			}
			const moduleSpecifier = exprDeclaration.parent.moduleSpecifier;
			const moduleSpecifierSymbol = this.checker.getSymbolAtLocation(moduleSpecifier);
			const moduleName = moduleSpecifierSymbol?.valueDeclaration?.getSourceFile().fileName;
			if (
				!moduleName?.startsWith("/resources/") ||
				!(moduleName?.endsWith("/library.js") || moduleName?.endsWith("/library.ts"))
			) {
				return;
			}
			// Cut off "/resources/" (11 chars) and the ".(js|ts)" extension (3 chars)
			potentialLibImport = moduleName.slice(11, -3);
		}

		const varName = extractVarName(node);
		const moduleName = [
			potentialLibImport.replace("/library", ""),
			...namespace,
			varName,
		].join("/");

		// Check if the module is registered within ambient modules
		const libAmbientModule = this.ambientModuleCache.getModule(potentialLibImport);
		const isRegisteredAsUi5Module = !!this.ambientModuleCache.getModule(moduleName);

		let isModuleExported = true;
		let libExports = libAmbientModule?.exports ?? new Map();
		for (const moduleChunk of [...namespace, varName]) {
			if (!libExports.has(moduleChunk)) {
				isModuleExported = false;
				break;
			}

			const exportMap = libExports.get(moduleChunk) as ts.Symbol | undefined;
			libExports = exportMap?.exports ?? new Map();
		}

		if (isRegisteredAsUi5Module && !isModuleExported) {
			this.#reporter.addMessage(MESSAGE.NO_EXPORTED_VALUES_BY_LIB, {
				module: moduleName,
				namespace: [
					exprNode?.getText(),
					...namespace,
					varName,
				].join("."),
				libraryName: potentialLibImport,
			},
			{node: (ts.isPropertyAccessExpression(node) ? node.name : node.argumentExpression)});
		}
	}

	analyzePropertyAccessExpression(node: ts.AccessExpression | ts.CallExpression) {
		const exprNode = node.expression;

		if (ts.isIdentifier(exprNode)) {
			// The expression being an identifier indicates that this is the first access
			// in a possible chain. E.g. the "sap" in "sap.ui.getCore()"

			let symbol;

			// Get the NodeType in order to check whether this is indirect global access via Window
			const nodeType = this.checker.getTypeAtLocation(exprNode);
			if (isGlobalThis(this.checker.typeToString(nodeType))) {
				// In case of Indirect global access we need to check for
				// a global UI5 variable on the right side of the expression instead of left
				if (ts.isPropertyAccessExpression(node)) {
					symbol = this.checker.getSymbolAtLocation(node.name);
				} else if (ts.isElementAccessExpression(node)) {
					symbol = this.checker.getSymbolAtLocation(node.argumentExpression);
				} else { // Identifier
					symbol = this.checker.getSymbolAtLocation(node);
				}
			} else {
				// No access via Window. Check the left side of the expression
				symbol = this.checker.getSymbolAtLocation(exprNode);
			}

			// If a symbol could be determined, check whether it is a symbol of a UI5 Type.
			// Note: If this is a local variable, the symbol would be different
			// In case it is, ensure it is not one of the allowed PropertyAccessExpressions, such as "sap.ui.require"
			if (symbol && this.isSymbolOfUi5OrThirdPartyType(symbol) &&
				!((ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) &&
					this.isAllowedPropertyAccess(node))) {
				const namespace = extractNamespace((node as ts.PropertyAccessExpression));
				this.#reporter.addMessage(MESSAGE.NO_GLOBALS, {
					variableName: symbol.getName(),
					namespace,
				}, {
					node,
					fix: this.getGlobalFix(node),
				});
			}
		}
	}

	isAllowedPropertyAccess(node: ts.PropertyAccessExpression | ts.ElementAccessExpression): boolean {
		if (!ts.isIdentifier(node.expression)) {
			// TODO: Fixme if this happens
			throw new Error(
				`Unhandled PropertyAccessExpression expression syntax: ${ts.SyntaxKind[node.expression.kind]}`);
		}
		if (["require", "define", "QUnit", "sinon"].includes(node.expression.text)) {
			return true;
		}

		const propAccess = extractNamespace(node);
		return [
			"sap.ui.define",
			"sap.ui.require",
			"sap.ui.require.toUrl",
			"sap.ui.loader.config",
		].some((allowedAccessString) => {
			return propAccess == allowedAccessString ||
				propAccess.startsWith(allowedAccessString + ".") ||
				propAccess.endsWith("." + allowedAccessString);
		});
	}

	analyzeImportDeclaration(importDeclarationNode: ts.ImportDeclaration) {
		const moduleSpecifierNode = importDeclarationNode.moduleSpecifier;
		if (!ts.isStringLiteralLike(moduleSpecifierNode)) {
			// An ImportDeclaration moduleSpecifier is of type Expression, but the docs says:
			// "If this is not a StringLiteral it will be a grammar error."
			// So we ignore such cases here.
			return;
		}
		const symbol = this.checker.getSymbolAtLocation(moduleSpecifierNode);
		if (!symbol) {
			return;
		}

		const moduleName = moduleSpecifierNode.text;
		const importClause = importDeclarationNode.importClause;
		const defaultExportSymbol = symbol.exports?.get("default" as ts.__String);

		if (!importClause || importClause.name) {
			// Import without import clause (e.g. import "module-name") or default import:
			// Check whether the default export is deprecated
			const deprecationInfo = this.getDeprecationInfo(defaultExportSymbol);
			if (deprecationInfo) {
				this.#reporter.addMessage(MESSAGE.DEPRECATED_MODULE_IMPORT, {
					moduleName,
					details: deprecationInfo.messageDetails,
				}, {
					node: moduleSpecifierNode,
					ui5TypeInfo: deprecationInfo.ui5TypeInfo,
					fix: this.getFix(moduleSpecifierNode, deprecationInfo.ui5TypeInfo),
				});
			}
		}

		if (importClause?.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
			// Named imports: Check whether each export is deprecated
			for (const namedImportElement of importClause.namedBindings.elements) {
				let identifier;
				if (namedImportElement.propertyName) {
					identifier = namedImportElement.propertyName;
				} else {
					identifier = namedImportElement.name;
				}
				const importName = identifier.text;
				const namedImportSymbol = symbol.exports?.get(importName as ts.__String);
				const deprecationInfo = this.getDeprecationInfo(namedImportSymbol);
				if (deprecationInfo) {
					this.#reporter.addMessage(MESSAGE.DEPRECATED_MODULE_IMPORT_NAMED, {
						importName,
						moduleName,
						details: deprecationInfo.messageDetails,
					}, {
						node: namedImportElement,
						ui5TypeInfo: deprecationInfo.ui5TypeInfo,
						fix: this.getFix(namedImportElement, deprecationInfo.ui5TypeInfo),
					});
				}
			}
		}

		if (this.isSymbolOfPseudoModuleType(symbol)) {
			let isEnum = false;
			if (defaultExportSymbol) {
				const declarations = defaultExportSymbol.getDeclarations();
				if (declarations) {
					declarations.forEach((declaration) => {
						if (!ts.isExportAssignment(declaration)) {
							return;
						}
						const type = this.checker.getTypeAtLocation(declaration.expression);
						if (type.symbol?.flags & ts.SymbolFlags.Enum) {
							isEnum = true;
						}
					});
				}
			}
			if (isEnum) {
				this.#reporter.addMessage(
					MESSAGE.NO_DIRECT_ENUM_ACCESS,
					{moduleName},
					{node: moduleSpecifierNode}
				);
			} else { // Data Type
				this.#reporter.addMessage(
					MESSAGE.NO_DIRECT_DATATYPE_ACCESS,
					{moduleName},
					{node: moduleSpecifierNode}
				);
			}
		}
	}

	isSymbolOfUi5Type(symbol: ts.Symbol) {
		return this.checkSymbolDeclarationSourceFile(symbol, isSourceFileOfUi5Type);
	}

	isSymbolOfUi5OrThirdPartyType(symbol: ts.Symbol) {
		return this.checkSymbolDeclarationSourceFile(symbol, isSourceFileOfUi5OrThirdPartyType);
	}

	isSymbolOfJquerySapType(symbol: ts.Symbol) {
		return this.checkSymbolDeclarationSourceFile(symbol, isSourceFileOfJquerySapType);
	}

	isSymbolOfPseudoModuleType(symbol: ts.Symbol) {
		return this.checkSymbolDeclarationSourceFile(symbol, isSourceFileOfPseudoModuleType);
	}

	checkSymbolDeclarationSourceFile(
		symbol: ts.Symbol, checkFunction: (sourceFile: ts.SourceFile) => boolean
	) {
		const declarations = symbol.getDeclarations();
		if (!declarations) {
			return false;
		}
		// First check if any declaration is from the TypeScript lib and if so, return false in order to never process
		// such symbols (e.g. globals like 'Symbol', which might have dedicated types in UI5 thirdparty like JQuery)
		return !declarations.some((declaration) => isSourceFileOfTypeScriptLib(declaration.getSourceFile())) &&
			declarations.some((declaration) => checkFunction(declaration.getSourceFile()));
	}

	analyzeTestsuiteThemeProperty(node: ts.PropertyAssignment) {
		// Check if the node is part of a testsuite config file by its file name.
		if (!VALID_TESTSUITE.test(node.getSourceFile().fileName)) return;

		// In a Test Starter testsuite file,
		// themes can be defined as default (1.) or for test configs individually (2.).
		// The schema for these files can be found here (under 'The UI5 Test Suite Module'):
		// https://ui5.sap.com/#/topic/22f50c0f0b104bf3ba84620880793d3f

		// (1.) and (2.) are checks for these two possible structures,
		// which use surrounding property names to determine the context
		// and set the flag 'isTestStarterStructure' to true afterwards.
		let isTestStarterStructure = false;

		const oneLayerUp = node.parent?.parent;
		const twoLayersUp = oneLayerUp?.parent?.parent;
		const threeLayersUp = twoLayersUp?.parent?.parent;

		// Check if "theme" property is inside "ui5: {...}" object
		if (oneLayerUp && ts.isObjectLiteralElement(oneLayerUp) &&
			oneLayerUp.name && getPropertyNameText(oneLayerUp.name) === "ui5") {
			if (ts.isObjectLiteralElement(twoLayersUp) &&
				twoLayersUp.name && getPropertyNameText(twoLayersUp.name) === "defaults") {
				// (1.) set flag to true if "theme" property is in "defaults: {...}" context
				isTestStarterStructure = true;
			} else if (ts.isObjectLiteralElement(twoLayersUp) &&
				ts.isObjectLiteralElement(threeLayersUp) &&
				threeLayersUp.name && getPropertyNameText(threeLayersUp.name) === "tests") {
				// (2.) set flag to true if "theme" property is in "tests: {...}" context
				isTestStarterStructure = true;
			}
		}

		if (!ts.isStringLiteralLike(node.initializer)) {
			return;
		}
		const themeName = node.initializer.text;
		if (isTestStarterStructure && deprecatedThemes.includes(themeName)) {
			this.#reporter.addMessage(MESSAGE.DEPRECATED_THEME, {
				themeName,
			}, {node});
		}
	}

	hasQUnitFileExtension() {
		return QUNIT_FILE_EXTENSION.test(this.sourceFile.fileName);
	}

	getFix(node: ts.Node, ui5TypeInfo: Ui5TypeInfo | undefined): Fix | undefined {
		if (!this.fixFactory || !ui5TypeInfo) {
			return;
		}
		const fix = this.fixFactory.getFix(node, ui5TypeInfo);
		if (fix) {
			const position = this.#reporter.getPositionsForNode(node);
			if (fix.visitLinterNode(node, position.start, this.fixHelpers)) {
				return fix;
			}
		}
	}

	getJqueryFix(
		node: ts.AccessExpression | ts.CallExpression, ui5TypeInfo: Ui5TypeInfo | undefined
	): Fix | undefined {
		if (!this.fixFactory || !ui5TypeInfo) {
			return;
		}
		const fixInfo = this.fixFactory.getJqueryTypeInfoForFix(node, ui5TypeInfo);
		if (!fixInfo) {
			return;
		}

		return this.getFix(fixInfo.node, fixInfo.ui5TypeInfo);
	}

	getGlobalFix(node: ts.CallExpression | ts.AccessExpression): Fix | undefined {
		const fixInfo = this.fixFactory?.getGlobalFixInfo(node);
		if (fixInfo) {
			const fix = new GlobalFix({
				moduleName: fixInfo.moduleName,
				propertyAccessStack: fixInfo.propertyAccessStack,
				resourcePath: this.resourcePath,
			});
			const position = this.#reporter.getPositionsForNode(fixInfo.relevantNode);
			if (fix.visitLinterNode(fixInfo.relevantNode, position.start)) {
				return fix;
			}
		}
	}
}
