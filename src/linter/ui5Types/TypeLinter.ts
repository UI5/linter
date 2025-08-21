import ts, {SourceFile} from "typescript";
import {FileContents, createVirtualLanguageServiceHost} from "./host.js";
import SourceFileLinter from "./SourceFileLinter.js";
import {taskStart} from "../../utils/perf.js";
import {getLogger} from "@ui5/logger";
import LinterContext, {LinterParameters} from "../LinterContext.js";
import path from "node:path/posix";
import {AbstractAdapter} from "@ui5/fs";
import {createAdapter, createResource} from "@ui5/fs/resourceFactory";
import {loadApiExtract} from "../../utils/ApiExtract.js";
import lintXml, {CONTROLLER_BY_ID_DTS_PATH} from "../xmlTemplate/linter.js";
import type SharedLanguageService from "./SharedLanguageService.js";
import SourceFileReporter from "./SourceFileReporter.js";
import {AmbientModuleCache} from "./AmbientModuleCache.js";
import {JSONSchemaForSAPUI5Namespace} from "../../manifest.js";
import type FixFactory from "./fix/FixFactory.js";

const log = getLogger("linter:ui5Types:TypeLinter");

export default class TypeLinter {
	#sharedLanguageService: SharedLanguageService;
	#compilerOptions: ts.CompilerOptions;
	#context: LinterContext;
	#workspace: AbstractAdapter;
	#filePathsWorkspace: AbstractAdapter;
	#sourceMaps = new Map<string, string>(); // Maps a source path to source map content
	#sourceFileReporters = new Map<string, SourceFileReporter>();
	#libraryDependencies: JSONSchemaForSAPUI5Namespace["dependencies"]["libs"];

	constructor(
		{workspace, filePathsWorkspace, context}: LinterParameters,
		libraryDependencies: JSONSchemaForSAPUI5Namespace["dependencies"]["libs"],
		sharedLanguageService: SharedLanguageService
	) {
		this.#sharedLanguageService = sharedLanguageService;
		this.#context = context;
		this.#workspace = workspace;
		this.#filePathsWorkspace = filePathsWorkspace;
		this.#libraryDependencies = libraryDependencies;
		this.#compilerOptions = {};

		const namespace = context.getNamespace();
		if (namespace) {
			// Map namespace used in imports (without /resources) to /resources paths
			this.#compilerOptions.paths = {
				[`${namespace}/*`]: [
					// Enforce that the compiler also tries to resolve imports with a .js extension.
					// With this mapping, the compiler still first tries to resolve the .ts, .tsx and .d.ts extensions
					// but then falls back to .js
					`/resources/${namespace}/*.js`,
				],
			};
		}
	}

	async lint() {
		const silly = log.isLevelEnabled("silly");
		const files: FileContents = new Map();

		const allResources = await this.#workspace.byGlob("/**/{*.js,*.js.map,*.ts}");
		const filteredResources = await this.#filePathsWorkspace.byGlob("/**/{*.js,*.js.map,*.ts}");
		const pathsToLint = filteredResources.map((resource) => resource.getPath());

		// Sort paths to ensure consistent order (helps with debugging and comparing verbose/silly logs)
		pathsToLint.sort((a, b) => a.localeCompare(b));

		if (silly) {
			log.silly(`pathsToLint: ${pathsToLint.join(", ")}`);
		}

		for (const resource of allResources) {
			const resourcePath = resource.getPath();
			if (resourcePath.endsWith(".js.map")) {
				this.#sourceMaps.set(
					// Remove ".map" from path to have it reflect the associated source path
					resource.getPath().slice(0, -4),
					await resource.getString()
				);
			} else {
				files.set(resourcePath, await resource.getString());
			}
		}

		const projectScriptVersion = this.#sharedLanguageService.getNextProjectScriptVersion();

		const host = await createVirtualLanguageServiceHost(
			this.#compilerOptions, files, this.#sourceMaps, this.#context,
			projectScriptVersion, this.#libraryDependencies
		);

		this.#sharedLanguageService.acquire(host);

		const createProgramDone = taskStart("ts.createProgram", undefined, true);
		let program = this.#sharedLanguageService.getProgram();
		createProgramDone();

		const getTypeCheckerDone = taskStart("program.getTypeChecker", undefined, true);
		let checker = program.getTypeChecker();
		getTypeCheckerDone();

		let ambientModuleCache = new AmbientModuleCache(checker.getAmbientModules());

		const apiExtract = await loadApiExtract();
		let fixFactory: FixFactory | undefined;
		if (this.#context.getApplyAutofix()) {
			// Dynamic import of fix factory to avoid loading it if not needed
			const {default: FixFactory} = await import("./fix/FixFactory.js");
			fixFactory = await FixFactory.create(checker, ambientModuleCache);
		}

		const reportCoverage = this.#context.getReportCoverage();
		const messageDetails = this.#context.getIncludeMessageDetails();
		const typeCheckDone = taskStart("Linting all transpiled resources");
		for (const sourceFile of program.getSourceFiles()) {
			if (sourceFile.isDeclarationFile || !pathsToLint.includes(sourceFile.fileName)) {
				continue;
			}
			if (sourceFile.getFullText().startsWith("//@ui5-bundle ")) {
				log.verbose(`Skipping linting of UI5 bundle '${sourceFile.fileName}'`);
				continue;
			}
			let manifestContent;
			if (sourceFile.fileName.endsWith("/Component.js") || sourceFile.fileName.endsWith("/Component.ts")) {
				const res = await this.#workspace.byPath(path.dirname(sourceFile.fileName) + "/manifest.json");
				if (res) {
					manifestContent = await res.getString();
				}
			}
			if (silly) {
				log.silly(`Linting ${sourceFile.fileName}`);
			}
			const linterDone = taskStart("Type-check resource", sourceFile.fileName, true);
			const linter = new SourceFileLinter(
				this,
				sourceFile,
				checker, reportCoverage, messageDetails,
				apiExtract, this.#filePathsWorkspace, this.#workspace, ambientModuleCache,
				fixFactory, manifestContent, this.#libraryDependencies
			);
			await linter.lint();
			linterDone();
		}

		// Will eventually produce new JS files for XML views and fragments
		await lintXml({
			filePathsWorkspace: this.#filePathsWorkspace,
			workspace: this.#workspace,
			context: this.#context,
			altGlob: "**/*.inline-*.{view,fragment}.xml",
		});
		const virtualXMLResources =
			await this.#filePathsWorkspace.byGlob("/**/*.inline-*.{view,fragment}{.js,.ts,.js.map}");
		if (virtualXMLResources.length > 0) {
			for (const resource of virtualXMLResources) {
				const resourcePath = resource.getPath();
				if (resourcePath.endsWith(".js.map")) {
					this.#sourceMaps.set(
						// Remove ".map" from path to have it reflect the associated source path
						resourcePath.slice(0, -4),
						await resource.getString()
					);
				} else {
					files.set(resourcePath, await resource.getString());
				}
			}
			program = this.#sharedLanguageService.getProgram();
			checker = program.getTypeChecker();
			ambientModuleCache = new AmbientModuleCache(checker.getAmbientModules());
			for (const sourceFile of program.getSourceFiles()) {
				if (sourceFile.isDeclarationFile || !/\.inline-[0-9]+\.(view|fragment)\.js/.exec(sourceFile.fileName)) {
					continue;
				}
				const linterDone = taskStart("Type-check resource", sourceFile.fileName, true);
				const linter = new SourceFileLinter(
					this,
					sourceFile,
					checker, reportCoverage, messageDetails,
					apiExtract, this.#filePathsWorkspace, this.#workspace, ambientModuleCache
				);
				await linter.lint();
				linterDone();
			}
		}
		typeCheckDone();

		this.#sharedLanguageService.release();

		this.addMessagesToContext();

		if (process.env.UI5LINT_WRITE_TRANSFORMED_SOURCES) {
			// If requested, write out every resource that has a source map (which indicates it has been transformed)
			// Loop over sourceMaps set
			for (const [resourcePath, sourceMap] of this.#sourceMaps) {
				const fileContent = files.get(resourcePath);
				if (typeof fileContent !== "undefined") {
					await writeTransformedSources(process.env.UI5LINT_WRITE_TRANSFORMED_SOURCES,
						resourcePath, fileContent, sourceMap);
				}
			}
			// Although not being a typical transformed source, write out the byId dts file for debugging purposes
			const byIdDts = files.get(CONTROLLER_BY_ID_DTS_PATH);
			if (typeof byIdDts !== "undefined") {
				await writeTransformedSources(process.env.UI5LINT_WRITE_TRANSFORMED_SOURCES,
					CONTROLLER_BY_ID_DTS_PATH, byIdDts);
			}
		}
	}

	getContext() {
		return this.#context;
	}

	getSourceMap(resourcePath: string): string | undefined {
		return this.#sourceMaps.get(resourcePath);
	}

	getSourceFileReporter(sourceFile: SourceFile): SourceFileReporter {
		const resourcePath = sourceFile.fileName;
		let reporter = this.#sourceFileReporters.get(resourcePath);
		if (!reporter) {
			reporter = new SourceFileReporter(
				this.#context, sourceFile, this.#sourceMaps.get(resourcePath)
			);
			this.#sourceFileReporters.set(resourcePath, reporter);
		}
		return reporter;
	}

	addMessagesToContext() {
		for (const reporter of this.#sourceFileReporters.values()) {
			reporter.addMessagesToContext();
		}
	}
}

async function writeTransformedSources(fsBasePath: string,
	originalResourcePath: string,
	source: string, map?: string) {
	const transformedWriter = createAdapter({
		fsBasePath,
		virBasePath: "/",
	});

	await transformedWriter.write(
		createResource({
			path: originalResourcePath,
			string: source,
		})
	);

	if (map) {
		await transformedWriter.write(
			createResource({
				path: originalResourcePath + ".map",
				string: JSON.stringify(JSON.parse(map), null, "\t"),
			})
		);
	}
}
