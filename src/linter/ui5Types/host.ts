import ts from "typescript";
import path from "node:path";
import posixPath from "node:path/posix";
import fs from "node:fs/promises";
import {createRequire} from "node:module";
import transpileAmdToEsm from "./amdTranspiler/transpiler.js";
import LinterContext, {ResourcePath} from "../LinterContext.js";
import {getLogger} from "@ui5/logger";
import {JSONSchemaForSAPUI5Namespace} from "../../manifest.js";
const log = getLogger("linter:ui5Types:host");
const require = createRequire(import.meta.url);

interface PackageJson {
	dependencies: Record<string, string>;
}

function addPathMappingForPackage(pkgName: string, pathMapping: Map<string, string>) {
	const pkgDir = path.dirname(require.resolve(`${pkgName}/package.json`));
	pathMapping.set(pkgName, pkgDir);
}

async function collectTransitiveDependencies(pkgName: string, deps: Set<string>): Promise<Set<string>> {
	const pkgJsonPath = require.resolve(`${pkgName}/package.json`);
	const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, "utf8")) as PackageJson;
	if (pkgJson.dependencies) {
		await Promise.all(Object.keys(pkgJson.dependencies).map(async (depName) => {
			deps.add(depName);
			const depDeps = await collectTransitiveDependencies(depName, deps);
			depDeps.forEach((dep) => deps.add(dep));
		}));
	}
	return deps;
}

async function collectSapui5TypesFiles() {
	const typesDir = path.dirname(require.resolve("@sapui5/types/package.json"));
	const allFiles = await fs.readdir(path.join(typesDir, "types"), {withFileTypes: true});
	const typesFiles = [];
	for (const entry of allFiles) {
		if (entry.isFile() && entry.name.endsWith(".d.ts") && entry.name !== "index.d.ts") {
			typesFiles.push(entry.name);
		}
	}
	return typesFiles;
}

function addSapui5TypesMappingToCompilerOptions(
	sapui5TypesFiles: string[], options: ts.CompilerOptions, context: LinterContext,
	libraryDependencies: JSONSchemaForSAPUI5Namespace["dependencies"]["libs"]
) {
	const projectNamespace = context.getNamespace();
	const applyAutofix = context.getApplyAutofix();
	const paths = options.paths ?? (options.paths = {});
	sapui5TypesFiles.forEach((fileName) => {
		// Reference custom linter type file instead of the @sapui5/types file as it also takes care of
		// loading additional types, e.g. for pseudo modules
		const dtsPath = `/types/@ui5/linter/types/sapui5/${fileName}`;
		const libraryName = posixPath.basename(fileName, ".d.ts");
		const libraryNamespace = libraryName.replace(/\./g, "/");
		if (
			applyAutofix ||
			libraryNamespace === "sap/ui/core" ||
			libraryNamespace === projectNamespace ||
			libraryDependencies?.[libraryName]
		) {
			// Special cases:
			// - Autofix needs all types to be able to lookup the modules that can be imported when replacing globals
			// - sap.ui.core needs to be loaded by default as it provides general API that must always be available
			// - When linting a framework library, the corresponding types should be loaded by default as they
			//   might not get loaded by the compiler otherwise, as the actual sources are available in the project.
			// - When a library is listed in the manifest dependencies, it should be loaded by default as well to ensure
			//   deprecations of globals are detected.
			options.types?.push(dtsPath);
		}
		// In every case, add a paths mapping to load them on demand and ensure loading them
		// when the framework library itself is linted
		const mappingNamespace = libraryNamespace + "/*";
		const pathsEntry = paths[mappingNamespace] ?? (paths[mappingNamespace] = []);
		pathsEntry.push(dtsPath);
	});
}

const DEFAULT_COMPILER_OPTIONS: ts.CompilerOptions = {
	target: ts.ScriptTarget.ES2022,
	module: ts.ModuleKind.ES2022,
	// Skip lib check to speed up linting. Libs should generally be fine,
	// we might want to add a unit test doing the check during development
	skipLibCheck: true,
	// Include standard typescript libraries for ES2022 and DOM support
	lib: ["lib.es2022.d.ts", "lib.dom.d.ts"],
	// Disable lib replacement lookup as we don't rely on it
	libReplacement: false,
	// Allow and check JavaScript files since this is everything we'll do here
	allowJs: true,
	checkJs: false,
	strict: true,
	noImplicitAny: false,
	strictNullChecks: false,
	strictPropertyInitialization: false,
	rootDir: "/",
	// Library modules (e.g. sap/ui/core/library.js) do not have a default export but
	// instead have named exports e.g. for enums defined in the module.
	// However, in current JavaScript code (UI5 AMD) the whole object is exported, as there are no
	// named exports outside of ES Modules / TypeScript.
	// This property compensates this gap and tries to all usage of default imports where actually
	// no default export is defined.
	// NOTE: This setting should not be used when analyzing TypeScript code, as it would allow
	// using an default import on library modules, which is not intended.
	// A better solution:
	// During transpilation, for every library module (where no default export exists),
	// an "import * as ABC" instead of a default import is created.
	// This logic needs to be in sync with the generator for UI5 TypeScript definitions.
	allowSyntheticDefaultImports: true,
};

export type FileContents = Map<ResourcePath, string>;

export async function createVirtualLanguageServiceHost(
	options: ts.CompilerOptions,
	files: FileContents, sourceMaps: FileContents,
	context: LinterContext,
	projectScriptVersion: string,
	libraryDependencies: JSONSchemaForSAPUI5Namespace["dependencies"]["libs"]
): Promise<ts.LanguageServiceHost> {
	const compilerOptions = {
		...DEFAULT_COMPILER_OPTIONS,
		...options,
	};

	const silly = log.isLevelEnabled("silly");

	compilerOptions.typeRoots = ["/types"];
	compilerOptions.types = [];

	const typePathMappings = new Map<string, string>();
	addPathMappingForPackage("typescript", typePathMappings);

	const typePackages = new Set(["@sapui5/types"]);
	await collectTransitiveDependencies("@sapui5/types", typePackages);

	// Remove dependencies that are not needed for UI5 linter type checking:
	typePackages.delete("@types/three"); // Used in sap.ui.vk, but is not needed for linter checks.
	typePackages.delete("@types/offscreencanvas"); // Used by @types/three

	typePackages.forEach((pkgName) => {
		addPathMappingForPackage(pkgName, typePathMappings);
	});
	const typePackageDirs = Array.from(typePackages.keys()).map((pkgName) => `/types/${pkgName}/`);

	typePackageDirs.push("/types/@ui5/linter/types");
	typePathMappings.set("@ui5/linter/types", path.dirname(
		require.resolve("../../../resources/types/package.json")
	));

	// Add all types except @sapui5/types which will be handled below
	compilerOptions.types.push(...typePackageDirs.filter((dir) => dir !== "/types/@sapui5/types/"));

	// Adds types / mappings for all @sapui5/types
	addSapui5TypesMappingToCompilerOptions(
		await collectSapui5TypesFiles(), compilerOptions, context, libraryDependencies);

	// Create regex matching all path mapping keys
	const pathMappingRegex = new RegExp(
		`^\\/types\\/(${Array.from(typePathMappings.keys()).join("|").replaceAll("/", "\\/")})\\/(.*)`);

	function mapToTypePath(fileName: string): string | undefined {
		const pkgName = fileName.match(pathMappingRegex);
		if (pkgName?.length === 3) {
			const mappedPath = typePathMappings.get(pkgName[1]);
			if (mappedPath) {
				return path.join(mappedPath, pkgName[2]);
			}
		}
	}

	function getFile(resourcePath: string): string | undefined {
		// NOTE: This function should be kept in sync with "fileExists"

		if (files.has(resourcePath)) {
			let fileContent = files.get(resourcePath);
			if (fileContent && resourcePath.endsWith(".js") && !sourceMaps.get(resourcePath)) {
				// No source map indicates no transpilation was done yet
				const res = transpileAmdToEsm(resourcePath, fileContent, context);
				files.set(resourcePath, res.source);
				sourceMaps.set(resourcePath, res.map);
				fileContent = res.source;
			}
			return fileContent;
		}
		if (resourcePath.startsWith("/types/")) {
			const fsPath = mapToTypePath(resourcePath);
			if (fsPath) {
				if (silly) {
					log.silly(`Reading type file from fs: ${fsPath}`);
				}
				return ts.sys.readFile(fsPath);
			}
		}
		// console.log("Not found " + fileName);
	}

	if (silly) {
		log.silly(`compilerOptions: ${JSON.stringify(compilerOptions, null, 2)}`);
	}

	return {

		getCompilationSettings: () => {
			return compilerOptions;
		},

		getScriptFileNames: () => {
			if (silly) {
				log.silly(`getScriptFileNames`);
			}
			// Sort file names to ensure deterministic order of processing
			return Array.from(files.keys()).sort((a, b) => a.localeCompare(b));
		},

		getScriptVersion: (fileName) => {
			if (silly) {
				log.silly(`getScriptVersion: ${fileName}`);
			}
			// Note: The script version for the common files at /types/ is handled within the LanguageServiceHostProxy

			// Currently we don't use incremental compilation within a project, so
			// updating the script version is not necessary.
			// However, as the language service is shared across multiple projects, we need
			// to provide a version that is unique for each project to avoid impacting other
			// projects that might use the same file path.
			return projectScriptVersion;
		},

		getScriptSnapshot: (fileName) => {
			if (silly) {
				log.silly(`getScriptSnapshot: ${fileName}`);
			}
			const fileContent = getFile(fileName);
			if (typeof fileContent === "string") {
				return ts.ScriptSnapshot.fromString(fileContent);
			}
			return undefined;
		},

		fileExists: (fileName) => {
			// NOTE: This function should be kept in sync with "getFile"
			if (silly) {
				log.silly(`fileExists: ${fileName}`);
			}

			if (files.has(fileName)) {
				return true;
			}
			if (fileName.startsWith("/types/")) {
				const fsPath = mapToTypePath(fileName);
				if (fsPath) {
					return ts.sys.fileExists(fsPath);
				}
			}
			return false;
		},
		getCurrentDirectory: () => {
			if (silly) {
				log.silly(`getCurrentDirectory`);
			}
			return compilerOptions.rootDir ?? "/";
		},

		readFile: (fileName) => {
			if (silly) {
				log.silly(`readFile: ${fileName}`);
			}
			return getFile(fileName);
		},
		getDefaultLibFileName: (defaultLibOptions: ts.CompilerOptions) => {
			const defaultLibFileName = ts.getDefaultLibFileName(defaultLibOptions);
			return "/types/typescript/lib/" + defaultLibFileName;
		},
	};
}
