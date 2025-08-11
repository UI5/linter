import {AbstractAdapter} from "@ui5/fs";
import lintXml from "./xmlTemplate/linter.js";
import lintJson from "./manifestJson/linter.js";
import lintHtml from "./html/linter.js";
import lintUI5Yaml from "./yaml/linter.js";
import lintDotLibrary from "./dotLibrary/linter.js";
import lintFileTypes from "./fileTypes/linter.js";
import {taskStart} from "../utils/perf.js";
import TypeLinter from "./ui5Types/TypeLinter.js";
import LinterContext, {LintResult, LinterParameters, LinterOptions, RawLintMessage} from "./LinterContext.js";
import {createReader, createResource} from "@ui5/fs/resourceFactory";
import {mergeIgnorePatterns, resolveReader} from "./linter.js";
import {UI5LintConfigType} from "../utils/ConfigManager.js";
import type SharedLanguageService from "./ui5Types/SharedLanguageService.js";
import autofix, {AutofixResource} from "../autofix/autofix.js";
import {writeFile} from "node:fs/promises";
import {FSToVirtualPathOptions, transformVirtualPathToFilePath} from "../utils/virtualPathToFilePath.js";
import {MESSAGE} from "./messages.js";
import {getLogger} from "@ui5/logger";
import path from "node:path";
import {JSONSchemaForSAPUI5Namespace, SAPJSONSchemaForWebApplicationManifestFile} from "../manifest.js";

const log = getLogger("linter:lintWorkspace");

export default async function lintWorkspace(
	workspace: AbstractAdapter, filePathsWorkspace: AbstractAdapter,
	options: LinterOptions & FSToVirtualPathOptions, config: UI5LintConfigType, patternsMatch: Set<string>,
	sharedLanguageService: SharedLanguageService
): Promise<LintResult[]> {
	const libraryDependencies = await getLibraryDependenciesFromManifest(workspace, options.virBasePath);

	const lintContext = await runLintWorkspace(
		workspace, filePathsWorkspace, options, config, patternsMatch, libraryDependencies, sharedLanguageService
	);
	if (!options.fix) {
		return lintContext.generateLintResults();
	}

	const autofixDryRun = !!process.env.UI5LINT_FIX_DRY_RUN;
	let lastContext = lintContext;
	for (let autofixIterations = 0; autofixIterations <= 10; autofixIterations++) {
		log.verbose(`Autofix iteration #${autofixIterations}...`);
		const autofixContext = await runAutofix(
			workspace, filePathsWorkspace, options, config, patternsMatch, libraryDependencies, sharedLanguageService,
			lastContext, autofixDryRun
		);

		if (!autofixContext) {
			// No autofix context indicates that no fixes have been applied
			break;
		}
		lastContext = autofixContext;
	}

	sharedLanguageService.release(); // Release here as it is needed in autofix
	return lastContext.generateLintResults();
}

async function runAutofix(
	workspace: AbstractAdapter, filePathsWorkspace: AbstractAdapter,
	options: LinterOptions & FSToVirtualPathOptions, config: UI5LintConfigType, patternsMatch: Set<string>,
	libraryDependencies: JSONSchemaForSAPUI5Namespace["dependencies"]["libs"],
	sharedLanguageService: SharedLanguageService, context: LinterContext, dryRun: boolean
): Promise<LinterContext | undefined> {
	const rawLintResults = context.generateRawLintResults();

	const autofixResources = new Map<string, AutofixResource>();
	const preAutofixParsingErrors = new Map<string, RawLintMessage<MESSAGE.PARSING_ERROR>[]>();
	for (const {filePath, rawMessages} of rawLintResults) {
		const resource = await workspace.byPath(filePath);
		if (!resource) {
			// This might happen in case a file with an existing source map was linted and the referenced
			// file is not available in the workspace.
			log.verbose(`Resource '${filePath}' not found. Skipping autofix for this file.`);
			continue;
		}
		autofixResources.set(filePath, {
			resource,
			messages: rawMessages,
		});
		for (const msg of rawMessages) {
			if (msg.id === MESSAGE.PARSING_ERROR) {
				const parsingError = msg as RawLintMessage<MESSAGE.PARSING_ERROR>;
				if (!preAutofixParsingErrors.has(filePath)) {
					preAutofixParsingErrors.set(filePath, []);
				}
				preAutofixParsingErrors.get(filePath)?.push(parsingError);
			}
		}
	}

	log.verbose(`Autofixing ${autofixResources.size} files...`);
	const doneAutofix = taskStart("Autofix");

	const autofixResult = await autofix({
		rootDir: options.rootDir,
		namespace: options.namespace,
		resources: autofixResources,
		context, sharedLanguageService,
	});

	doneAutofix();

	log.verbose(`Autofix provided solutions for ${autofixResult.size} files`);

	if (autofixResult.size > 0) {
		for (const [filePath, content] of autofixResult.entries()) {
			const newResource = createResource({
				path: filePath,
				string: content,
			});
			await workspace.write(newResource);
			await filePathsWorkspace.write(newResource);
		}

		log.verbose("Linting again after applying fixes...");

		// Run lint again after fixes are applied, but without fixing
		const optionsAfterFix = {
			...options,
			// fix: false,
		};
		const autofixContext = context;

		// Reset to refresh sharedLanguageService after fixes have been applied
		// It would be reinstantiated in TypeLinter
		sharedLanguageService.release();

		context = await runLintWorkspace(
			workspace, filePathsWorkspace, optionsAfterFix, config, patternsMatch,
			libraryDependencies, sharedLanguageService
		);

		for (const {filePath, rawMessages} of autofixContext.generateRawLintResults()) {
			// Add autofix errors and parsing-errors that occurred during the autofix to the linter context
			// of the final linting run so they become visible to the user
			// Do not provide their positions since those might be incorrect due to the autofix
			rawMessages.forEach((msg) => {
				if (msg.id === MESSAGE.AUTOFIX_ERROR) {
					context.addLintingMessage(
						filePath, {id: msg.id, args: (msg as RawLintMessage<MESSAGE.AUTOFIX_ERROR>).args});
				}
				if (msg.id === MESSAGE.PARSING_ERROR) {
					const parsingError = msg as RawLintMessage<MESSAGE.PARSING_ERROR>;
					const isDuplicate = preAutofixParsingErrors.get(filePath)?.find((msg) => {
						// If the parsing error was already reported before the autofix took place,
						// we must not report it again
						let positionMatch;
						if (msg.position && parsingError.position) {
							// Allow a position match within 10 lines to avoid false positives from line drifts
							// due to autofixes. Ignore columns for the same reason
							// Note that false-positives wouldn't be too bad since they only cause duplicate
							// parsing-errors in the final report
							positionMatch = Math.abs(msg.position.line - parsingError.position.line) <= 10;
						} else {
							positionMatch = !msg.position && !parsingError.position;
						}
						return msg.args?.message === parsingError.args?.message && positionMatch;
					});
					if (!isDuplicate) {
						context.addLintingMessage(filePath, {id: msg.id, args: parsingError.args}); // No position
					}
				}
			});
		}

		// Update fixed files on the filesystem
		if (dryRun) {
			log.verbose("Autofix dry run: Not updating files on the filesystem");
		} else {
			const autofixFiles = Array.from(autofixResult.entries());
			await Promise.all(autofixFiles.map(async ([filePath, content]) => {
				const realFilePath = path.join(
					optionsAfterFix.rootDir,
					transformVirtualPathToFilePath(filePath, optionsAfterFix)
				);
				log.verbose(`Writing fixed file '${filePath}' to '${realFilePath}'`);
				await writeFile(realFilePath, content);
			}));
		}
		return context;
	}
}

async function runLintWorkspace(
	workspace: AbstractAdapter, filePathsWorkspace: AbstractAdapter,
	options: LinterOptions & FSToVirtualPathOptions, config: UI5LintConfigType, patternsMatch: Set<string>,
	libraryDependencies: JSONSchemaForSAPUI5Namespace["dependencies"]["libs"],
	sharedLanguageService: SharedLanguageService
): Promise<LinterContext> {
	const done = taskStart("Linting Workspace");
	const fsToVirtualPathOptions = {
		relFsBasePath: options.relFsBasePath ?? "",
		virBasePath: options.virBasePath ?? "/",
		relFsBasePathTest: options.relFsBasePathTest,
		virBasePathTest: options.virBasePathTest,
	};

	const context = new LinterContext(options);
	let reader = resolveReader({
		patterns: options.filePatterns ?? config.files ?? [],
		fsToVirtualPathOptions,
		resourceReader: createReader({
			fsBasePath: options.rootDir,
			virBasePath: "/",
		}),
		inverseResult: true,
		patternsMatch,
	});
	reader = resolveReader({
		patterns: mergeIgnorePatterns(options, config),
		resourceReader: reader,
		patternsMatch,
		fsToVirtualPathOptions,
	});
	context.setRootReader(reader);

	const params: LinterParameters = {
		workspace, filePathsWorkspace, context,
	};

	await Promise.all([
		lintXml(params),
		lintJson(params),
		lintHtml(params),
		lintUI5Yaml(params),
		lintDotLibrary(params),
		lintFileTypes(params),
	]);

	const typeLinter = new TypeLinter(params, libraryDependencies, sharedLanguageService);
	await typeLinter.lint();
	done();
	return context;
}

async function getLibraryDependenciesFromManifest(workspace: AbstractAdapter, virBasePath: string | undefined) {
	const resourcePath = (virBasePath ?? "") + "/manifest.json";
	const manifest = await workspace.byPath(resourcePath);
	if (!manifest) {
		return undefined;
	}
	const content = await manifest.getString();
	let json;
	try {
		json = JSON.parse(content) as SAPJSONSchemaForWebApplicationManifestFile;
	} catch (err) {
		log.verbose(`Failed to parse ${resourcePath} as JSON`);
		if (err instanceof Error) {
			log.verbose(err.message);
			if (err.stack) {
				log.verbose(err.stack);
			}
		}
		return undefined;
	}
	return json["sap.ui5"]?.dependencies?.libs;
}
