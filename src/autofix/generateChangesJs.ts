import ts from "typescript";
import type {RawLintMessage} from "../linter/LinterContext.js";
import {
	getFactoryPosition,
	Position,
	type ChangeSet,
	type ExistingModuleDeclarationInfo,
} from "./autofix.js";
import {
	collectIdentifierDeclarations, collectIdentifiers, matchPropertyAccessExpression, removeConflictingFixes,
} from "./utils.js";
import parseModuleDeclaration from "../linter/ui5Types/amdTranspiler/parseModuleDeclaration.js";
import parseRequire from "../linter/ui5Types/amdTranspiler/parseRequire.js";
import {getLogger} from "@ui5/logger";
import Fix, {ObsoleteModuleDependency} from "../linter/ui5Types/fix/Fix.js";
import {
	NO_PARAM_FOR_DEPENDENCY,
	addDependencies, Dependencies, getDependencies, removeDependencies,
	hasBody, getFactoryBody,
} from "./amdImports.js";
import {resolveUniqueName} from "../linter/ui5Types/utils/utils.js";

const log = getLogger("linter:autofix:generateChangesJs");

interface NodeSearchInfo {
	position: Position;
	fix: Fix;
	nodeTypes: ts.SyntaxKind[];
}

interface DependencyRequest {
	moduleName: string;
	preferredIdentifier?: string;
	usagePosition: number;
	blockNewImport?: boolean;
	fix: Fix;
}
type ObsoleteDependencyRequest = Map<string, {
	identifierName: string;
	usagePositions: number[];
}>;

interface GlobalAccessRequest {
	globalName: string;
	usagePosition: number;
	fix: Fix;
}

interface DependencyDeclarations {
	moduleDeclarationInfo: ExistingModuleDeclarationInfo;
	start: number;
	end: number;
	dependencies: Dependencies;
}

export default function generateChanges(
	resourcePath: string, checker: ts.TypeChecker, sourceFile: ts.SourceFile, content: string,
	messages: RawLintMessage[],
	changeSets: ChangeSet[]
) {
	const nodeSearchInfo = new Set<NodeSearchInfo>();
	// Collect all fixes from the messages
	for (const {fix} of messages) {
		if (!fix) {
			continue;
		}
		// Map "position for search" (calculated from the transpiled AST using the source map) to the absolute
		// position in the source file
		const {position: fixStart, nodeTypes} = fix.getNodeSearchParameters();
		// TypeScript lines and columns are 0-based
		const line = fixStart.line - 1;
		const column = fixStart.column - 1;
		const pos = sourceFile.getPositionOfLineAndCharacter(line, column);

		nodeSearchInfo.add({
			fix,
			nodeTypes,
			position: {
				line,
				column,
				pos,
			},
		});
	}

	const moduleDeclarations = new Map<ts.CallExpression, ExistingModuleDeclarationInfo>();

	const matchedFixes = new Set<Fix>();
	function visitNode(node: ts.Node) {
		for (const nodeInfo of nodeSearchInfo) {
			// For each fix, search for a match for requested position and node type until it acquires a context
			// (meaning that it found its node in the source file)
			if (node.getStart() === nodeInfo.position.pos && nodeInfo.nodeTypes.includes(node.kind) &&
				nodeInfo.fix.visitAutofixNode(node, nodeInfo.position.pos, sourceFile)) {
				// A fix has found its node in the autofix AST
				// Add it to the set of matched fixes, remove it from the search info
				// and abort searching for further fixes for this node
				matchedFixes.add(nodeInfo.fix);
				nodeSearchInfo.delete(nodeInfo);
			}
		}
		// Also collect all module declarations (define and require calls)
		if (ts.isCallExpression(node) &&
			ts.isPropertyAccessExpression(node.expression)) {
			if (matchPropertyAccessExpression(node.expression, "sap.ui.define")) {
				try {
					moduleDeclarations.set(node, {
						moduleDeclaration: parseModuleDeclaration(node.arguments, checker),
						importRequests: new Map(),
						obsoleteModules: new Set(),
					});
				} catch (err) {
					const errorMessage = err instanceof Error ? err.message : String(err);
					log.verbose(`Failed to parse sap.ui.define ` +
						`call in ${sourceFile.fileName}: ${errorMessage}`);
					if (err instanceof Error) {
						log.verbose(`Call stack: ${err.stack}`);
					}
				}
			} else if (matchPropertyAccessExpression(node.expression, "sap.ui.require")) {
				try {
					const requireExpression = parseRequire(node.arguments, checker);
					// Only handle async require calls, not sap.ui.require probing
					if (requireExpression.async) {
						moduleDeclarations.set(node, {
							moduleDeclaration: requireExpression,
							importRequests: new Map(),
							obsoleteModules: new Set(),
						});
					}
				} catch (err) {
					const errorMessage = err instanceof Error ? err.message : String(err);
					log.verbose(`Failed to parse sap.ui.require ` +
						`call in ${sourceFile.fileName}: ${errorMessage}`);
					if (err instanceof Error) {
						log.verbose(`Call stack: ${err.stack}`);
					}
				}
			}
		}
		ts.forEachChild(node, visitNode);
	}
	ts.forEachChild(sourceFile, visitNode);

	removeConflictingFixes(matchedFixes);

	const dependencyRequests = new Set<DependencyRequest>();
	const blockedModuleImports = new Set<string>();
	const globalAccessRequests = new Set<GlobalAccessRequest>();
	const obsoleteModuleImports = new Set<ObsoleteModuleDependency>();

	if (resourcePath.startsWith("/resources/")) {
		// Block cyclic dependency to the module itself. This is currently only relevant when applying fixes
		// to UI5 framework internal modules
		const currentModuleName = resourcePath.substring("/resources/".length).replace(/\.js$/, "");
		blockedModuleImports.add(currentModuleName);
	}
	for (const fix of matchedFixes) {
		// Collect new dependencies
		const newDependencies = fix.getNewModuleDependencies?.();
		if (Array.isArray(newDependencies)) {
			for (const depRequest of newDependencies) {
				dependencyRequests.add({
					...depRequest,
					fix,
				});
				if (depRequest.blockNewImport) {
					// If the request blocks new imports, add it to the blocked module imports
					blockedModuleImports.add(depRequest.moduleName);
				}
			}
		} else if (newDependencies) {
			const depRequest = newDependencies;
			dependencyRequests.add({
				...depRequest,
				fix,
			});
			if (depRequest.blockNewImport) {
				// If the request blocks new imports, add it to the blocked module imports
				blockedModuleImports.add(depRequest.moduleName);
			}
		}

		// Collect new global access
		const newGlobalAccess = fix.getNewGlobalAccess?.();
		if (Array.isArray(newGlobalAccess)) {
			for (const globalAccess of newGlobalAccess) {
				globalAccessRequests.add({
					...globalAccess,
					fix,
				});
			}
		} else if (newGlobalAccess) {
			const globalAccess = newGlobalAccess;
			globalAccessRequests.add({
				...globalAccess,
				fix,
			});
		}

		// Collect obsolete modules
		const obsoleteModules = fix.getObsoleteModuleDependencies?.();
		if (Array.isArray(obsoleteModules)) {
			for (const obsoleteModule of obsoleteModules) {
				// Add the module to the blocked module imports, so it won't be added again
				obsoleteModuleImports.add(obsoleteModule);
			}
		} else if (obsoleteModules) {
			obsoleteModuleImports.add(obsoleteModules);
		}
	}
	const dependencyDeclarations: DependencyDeclarations[] = [];
	for (const [_, moduleDeclarationInfo] of moduleDeclarations) {
		if (!hasBody(moduleDeclarationInfo.moduleDeclaration)) {
			// Ignore module declaration without factory or callback functions
			// This is to safeguard the following methods, which all rely on a factory body
			continue;
		}
		const deps = getDependencies(moduleDeclarationInfo.moduleDeclaration, resourcePath);
		const {start, end} = getFactoryPosition(moduleDeclarationInfo);
		dependencyDeclarations.push({
			moduleDeclarationInfo,
			start,
			end,
			dependencies: deps,
		});

		const potentiallyObsoleteDeps: ObsoleteDependencyRequest = new Map();
		for (const obsoleteDep of obsoleteModuleImports) {
			if (start <= obsoleteDep.usagePosition && end >= obsoleteDep.usagePosition &&
				deps.has(obsoleteDep.moduleName)) {
				const identifierName = deps.get(obsoleteDep.moduleName);
				if (typeof identifierName !== "string") {
					// If the dependency is declared, but the parameter is missing, it is likely a side-effect import
					// that should be preserved
					// If the parameter is "unsupported" we also need to preserve the dependency
					continue;
				}
				if (!potentiallyObsoleteDeps.has(obsoleteDep.moduleName)) {
					potentiallyObsoleteDeps.set(obsoleteDep.moduleName, {
						identifierName,
						usagePositions: [],
					});
				}
				potentiallyObsoleteDeps.get(obsoleteDep.moduleName)!.usagePositions.push(obsoleteDep.usagePosition);
			}
		}
		if (!potentiallyObsoleteDeps.size) {
			continue;
		}
		const body = getFactoryBody(moduleDeclarationInfo);
		if (!body) {
			continue;
		}
		const identifiersInScope = collectIdentifiers(body);
		// Check for unused module dependencies
		for (const [moduleName, {identifierName, usagePositions}] of potentiallyObsoleteDeps) {
			// Check whether there is any identifier matching the module import one that is not
			// at the same position as one of the fixes that marked it as obsolete (ignore those)
			let isStillUsed = false;
			for (const identifier of identifiersInScope) {
				if (identifier.text === identifierName && !usagePositions.includes(identifier.getStart())) {
					// Found another identifier, indicating further usage. Do not mark the module as obsolete
					isStillUsed = true;
					break;
				}
			}
			if (!isStillUsed) {
				// Module can be removed
				moduleDeclarationInfo.obsoleteModules.add(moduleName);
			}
		}
	}
	// Sort declarations by start position of the factory/callback
	dependencyDeclarations.sort((a, b) => {
		if (a.start !== b.start) {
			return a.start - b.start;
		}
		// If the start positions are the same, sort by end position
		return a.end - b.end;
	});

	// Handle blocked module imports
	if (dependencyDeclarations.length) {
		for (const topLevelDep of dependencyDeclarations[0].dependencies.keys()) {
			if (blockedModuleImports.has(topLevelDep)) {
				// If the blocked module is already imported in the top-level module declaration,
				// lift the block
				blockedModuleImports.delete(topLevelDep);
			}
		}
	}
	for (const depRequest of dependencyRequests) {
		if (blockedModuleImports.has(depRequest.moduleName)) {
			// If the request is for a module that is blocked from being imported by another fix
			// (e.g. because a probing/conditional access has been detected), delete the request
			// this will cause the fix to not be applied
			dependencyRequests.delete(depRequest);
		}
	}

	// Collect all identifiers in the source file to ensure unique names when adding imports
	const identifiers = collectIdentifierDeclarations(sourceFile);

	// Sort dependency requests into declarations
	mergeDependencyRequests(dependencyRequests, dependencyDeclarations, identifiers);
	processGlobalRequests(globalAccessRequests, identifiers);

	// Create changes for new and removed dependencies
	for (const [defineCall, moduleDeclarationInfo] of moduleDeclarations) {
		const moduleRemovals = new Set([
			"sap/base/strings/NormalizePolyfill", "jquery.sap.unicode",
			...moduleDeclarationInfo.obsoleteModules]);
		for (const dependencyModuleName of moduleDeclarationInfo.importRequests.keys()) {
			if (moduleRemovals.has(dependencyModuleName)) {
				moduleRemovals.delete(dependencyModuleName);
			}
		}
		// Remove dependencies from the existing module declaration
		removeDependencies(moduleRemovals, moduleDeclarationInfo, changeSets, resourcePath, identifiers);

		// Resolve dependencies for the module declaration
		addDependencies(defineCall, moduleDeclarationInfo, changeSets, resourcePath, moduleRemovals);
	}

	for (const fix of matchedFixes) {
		const changes = fix.generateChanges?.();
		if (Array.isArray(changes)) {
			for (const change of changes) {
				changeSets.push(change);
			}
		} else if (changes) {
			changeSets.push(changes);
		}
	}
}

function mergeDependencyRequests(dependencyRequests: Set<DependencyRequest>,
	dependencyDeclarations: DependencyDeclarations[], identifiers: Set<string>) {
	// Step 1.) Try to fulfill dependency requests using the existing dependency declarations
	for (const dependencyRequest of dependencyRequests) {
		const {moduleName, usagePosition: position, fix} = dependencyRequest;
		if (!fix.setIdentifierForDependency) {
			throw new Error(
				`Fix ${fix.constructor.name} requested dependencies but ` +
				`does not implement setIdentifierForDependency method`);
		}
		// Dependency declarations are sorted in order of appearance in the source file
		// Start the search from the end to visit the most specific ones first
		for (let i = dependencyDeclarations.length - 1; i >= 0; i--) {
			const decl = dependencyDeclarations[i];
			const depIdentifier = decl.dependencies.get(moduleName);
			if (depIdentifier && typeof depIdentifier === "string" &&
				decl.start <= position && decl.end >= position) {
				// Dependency request can be fulfilled directly
				fix.setIdentifierForDependency(depIdentifier, moduleName);
				dependencyRequests.delete(dependencyRequest); // Request fulfilled
				break;
			} else if (depIdentifier === NO_PARAM_FOR_DEPENDENCY) {
				// A dependency is declared, but the parameter is missing

				// First check whether another request for this module name has already been fulfilled
				if (decl.moduleDeclarationInfo.importRequests.has(moduleName)) {
					// If so, use the existing identifier
					const {identifier} = decl.moduleDeclarationInfo.importRequests.get(moduleName)!;
					fix.setIdentifierForDependency(identifier, moduleName);
					dependencyRequests.delete(dependencyRequest); // Request fulfilled
					break;
				}

				// Create a unique name if the preferred identifier is already in use
				// Use the first preferred identifier
				const identifier = resolveUniqueName(moduleName, identifiers);

				identifiers.add(identifier);
				decl.moduleDeclarationInfo.importRequests.set(moduleName, {
					identifier,
				});
				fix.setIdentifierForDependency(identifier, moduleName);
				dependencyRequests.delete(dependencyRequest); // Request fulfilled
				break;
			}
		}
	}

	// Step 2.) Build a list of potential additions to existing dependency declarations
	// that would fulfill all remaining requests
	const newDependencyDeclarations = new Map<DependencyDeclarations, DependencyRequest[]>();
	for (const dependencyRequest of dependencyRequests) {
		// Dependency declarations are sorted in order of appearance in the source file
		// Start the search from the end to visit the most specific ones first
		for (let i = dependencyDeclarations.length - 1; i >= 0; i--) {
			const decl = dependencyDeclarations[i];
			if (decl.start <= dependencyRequest.usagePosition && decl.end >= dependencyRequest.usagePosition) {
				if (newDependencyDeclarations.has(decl)) {
					// Add request to existing declaration
					newDependencyDeclarations.get(decl)!.push(dependencyRequest);
					break;
				} else {
					newDependencyDeclarations.set(decl, [dependencyRequest]);
				}
				break;
			}
		}
	}

	// Step 3.) Build a hierarchy of the dependency declarations in order to traverse it
	interface DependencyDeclarationsNode {
		declaration: DependencyDeclarations;
		children: DependencyDeclarationsNode[];
		newDependencies?: DependencyRequest[];
	}

	const mappedDeclarations = new Set<DependencyDeclarations>();
	function createDependencyDeclarationsNode(decl: DependencyDeclarations): DependencyDeclarationsNode | undefined {
		if (mappedDeclarations.has(decl)) {
			// A node for this declaration has already been created and added to the corresponding parent
			// This check prevents a declaration from being added to multiple parents if the positions overlap
			// The correct parent is always the first one that has visited this node.
			return;
		}
		mappedDeclarations.add(decl);
		const children = [];
		for (const otherDecl of dependencyDeclarations) {
			if (decl.start <= otherDecl.start && decl.end >= otherDecl.end) {
				// decl contains otherDecl (might be direct or indirect child)
				const child = createDependencyDeclarationsNode(otherDecl);
				if (!child) {
					// Indirect child, ignore
					continue;
				}
				children.push(child);
			}
		}
		return {
			declaration: decl,
			children,
		};
	}

	const moduleNameToDeclToRequests = new Map<string, [DependencyDeclarations, DependencyRequest[]]>();

	// Function to traverse and count moduleNames
	function assignDependencyRequests(node: DependencyDeclarationsNode): string[] {
		const dependencyModuleNames: string[] = [];
		// Traverse depth-first to collect all dependency requests
		const depsPerChild = node.children.map((child) => {
			return assignDependencyRequests(child);
		});

		// Check whether there is a request for this dependency declaration
		const dependencyRequests = newDependencyDeclarations.get(node.declaration);
		if (dependencyRequests) {
			for (const dependencyRequest of dependencyRequests) {
				const moduleName = dependencyRequest.moduleName;
				if (moduleNameToDeclToRequests.has(moduleName)) {
					const existingRequests = moduleNameToDeclToRequests.get(moduleName)!;
					existingRequests[1].push(dependencyRequest);
				} else {
					moduleNameToDeclToRequests.set(moduleName, [node.declaration, [dependencyRequest]]);
				}

				if (!dependencyModuleNames.includes(moduleName)) {
					dependencyModuleNames.push(moduleName);
				}
			}
		}

		if (depsPerChild.length > 0) {
			// Check if multiple children have requests for the same module
			const moduleNameOccurences = new Map<string, number>();
			for (const moduleName of dependencyModuleNames) {
				moduleNameOccurences.set(moduleName, 1);
			}
			for (const childDeps of depsPerChild) {
				for (const moduleName of childDeps) {
					const count = moduleNameOccurences.get(moduleName) ?? 0;
					moduleNameOccurences.set(moduleName, count + 1);
				}
			}
			for (const [moduleName, count] of moduleNameOccurences) {
				if (count > 1) {
					// Multiple children have requests for the same module
					// Assign all requests to this dependency declarations
					moduleNameToDeclToRequests.get(moduleName)![0] = node.declaration;
				}
			}
		}
		return dependencyModuleNames;
	}

	// Step 4.) Merge new dependencies into existing dependency declarations
	// First find all the root dependency declarations and create trees under them
	const rootDependencyDeclarations = new Set<DependencyDeclarationsNode>();
	for (const decl of dependencyDeclarations) {
		const node = createDependencyDeclarationsNode(decl);
		if (node) {
			rootDependencyDeclarations.add(node);
		}
	}
	// Then assign the dependency requests accordingly
	for (const node of rootDependencyDeclarations) {
		assignDependencyRequests(node);
	}

	for (const [moduleName, [decl, requests]] of moduleNameToDeclToRequests) {
		// Get preferred identifier unless it's already in use
		let identifier: string | undefined;
		for (const request of requests) {
			if (request.preferredIdentifier && !identifiers.has(request.preferredIdentifier)) {
				identifier = request.preferredIdentifier;
				break;
			}
		}
		// Create a unique name if the preferred identifier is already in use
		// Use the first preferred identifier
		identifier ??= resolveUniqueName(moduleName, identifiers);

		identifiers.add(identifier);
		decl.moduleDeclarationInfo.importRequests.set(moduleName, {identifier});

		for (const request of requests) {
			if (!request.fix.setIdentifierForDependency) {
				throw new Error(
					`Fix ${request.fix.constructor.name} requested dependencies but ` +
					`does not implement setIdentifierForDependency method`);
			}
			// Set the identifier for the fix
			request.fix.setIdentifierForDependency(identifier, moduleName);
		}
	}
}

function processGlobalRequests(globalAccessRequests: Set<GlobalAccessRequest>, identifiers: Set<string>) {
	for (const globalAccessRequest of globalAccessRequests) {
		const {globalName, fix} = globalAccessRequest;
		if (!fix.setIdentifierForGlobal) {
			throw new Error(
				`Fix ${fix.constructor.name} requested global access but ` +
				`does not implement setIdentifierForGlobal method`);
		}
		if (!identifiers.has(globalName)) {
			// If the global name is not already in use, we can use it directly
			fix.setIdentifierForGlobal(globalName, globalName);
			continue;
		}
		// If the global name is already in use, prefix it with globalThis
		const identifier = `globalThis.${globalName}`;
		identifiers.add(identifier);
		fix.setIdentifierForGlobal(identifier, globalName);
	}
}
