import ts from "typescript";
import {getLogger} from "@ui5/logger";
import {Resource} from "@ui5/fs";
import LinterContext, {RawLintMessage, ResourcePath} from "../linter/LinterContext.js";
import {MESSAGE} from "../linter/messages.js";
import {ModuleDeclaration} from "../linter/ui5Types/amdTranspiler/parseModuleDeclaration.js";
import {RequireExpression} from "../linter/ui5Types/amdTranspiler/parseRequire.js";
import generateChangesJs from "./generateChangesJs.js";
import generateChangesXml from "./generateChangesXml.js";
import {getFactoryBody} from "./amdImports.js";
import generateChangesHtml from "./generateChangesHtml.js";
import {ChangeSet, applyChanges} from "../utils/textChanges.js";

const log = getLogger("linter:autofix");

export interface AutofixResource {
	resource: Resource;
	messages: RawLintMessage[];
}

export interface AutofixOptions {
	rootDir: string;
	namespace?: string;
	resources: Map<ResourcePath, AutofixResource>;
	context: LinterContext;
}

export type AutofixResult = Map<ResourcePath, string>;
type SourceFiles = Map<ResourcePath, ts.SourceFile>;

export interface Position {
	line: number;
	column: number;
	pos: number;
}

export interface DeprecatedApiAccessNode {
	apiName: string;
	position: Position;
	node?: ts.CallExpression | ts.Identifier | ts.PropertyAccessExpression | ts.ElementAccessExpression;
}

export type ImportRequests = Map<string, {
	nodeInfos?: DeprecatedApiAccessNode[];
	identifier: string;
}>;

export interface ExistingModuleDeclarationInfo {
	moduleDeclaration: ModuleDeclaration | RequireExpression;
	importRequests: ImportRequests;
	obsoleteModules: Set<string>;
}

function createCompilerHost(sourceFiles: SourceFiles): ts.CompilerHost {
	return {
		getSourceFile: (fileName) => sourceFiles.get(fileName),
		writeFile: () => undefined,
		getDefaultLibFileName: () => "lib.d.ts",
		useCaseSensitiveFileNames: () => false,
		getCanonicalFileName: (fileName) => fileName,
		getCurrentDirectory: () => "",
		getNewLine: () => "\n",
		fileExists: (fileName): boolean => sourceFiles.has(fileName),
		readFile: () => "",
		directoryExists: () => true,
		getDirectories: () => [],
	};
}

const compilerOptions: ts.CompilerOptions = {
	checkJs: false,
	allowJs: true,
	skipLibCheck: true,
	noCheck: true,
	target: ts.ScriptTarget.ES2022,
	module: ts.ModuleKind.ES2022,
	isolatedModules: true,
	sourceMap: true,
	suppressOutputPathCheck: true,
	noLib: true,
	noResolve: true,
	allowNonTsExtensions: true,
};

function createProgram(inputFileNames: string[], host: ts.CompilerHost): ts.Program {
	return ts.createProgram(inputFileNames, compilerOptions, host);
}

function createSourceFile(resourcePath: string, code: string) {
	return ts.createSourceFile(
		resourcePath,
		code,
		{
			languageVersion: ts.ScriptTarget.ES2022,
			jsDocParsingMode: ts.JSDocParsingMode.ParseNone,
		}
	);
}

function getJsErrorsForSourceFile(sourceFile: ts.SourceFile, program: ts.Program, host: ts.CompilerHost) {
	const diagnostics = ts.getPreEmitDiagnostics(program, sourceFile);
	return diagnostics.filter(function (d) {
		return d.file === sourceFile && d.category === ts.DiagnosticCategory.Error;
	}).map((d) => {
		let codeSnippet;
		let pos;
		if (d.start !== undefined && d.length !== undefined) {
			codeSnippet = sourceFile.text.substring(d.start, d.start + d.length);
			pos = ts.getLineAndCharacterOfPosition(sourceFile, d.start);
		}
		return {
			messageText: ts.flattenDiagnosticMessageText(d.messageText, host.getNewLine()),
			start: d.start,
			length: d.length,
			line: pos?.line,
			character: pos?.character,
			file: d.file,
			codeSnippet,
		};
	});
}

function getJsErrors(code: string, resourcePath: string) {
	const sourceFile = createSourceFile(resourcePath, code);
	const host = createCompilerHost(new Map([[resourcePath, sourceFile]]));
	const program = createProgram([resourcePath], host);
	return getJsErrorsForSourceFile(sourceFile, program, host);
}

async function getXmlErrorForFile(content: string) {
	const {XMLValidator} = await import("fast-xml-parser");
	const validOrError = XMLValidator.validate(content);
	if (validOrError === true) {
		return; // No errors
	}
	return validOrError.err;
}

export function getFactoryPosition(moduleDeclaration: ExistingModuleDeclarationInfo): {start: number; end: number} {
	const factory = getFactoryBody(moduleDeclaration);
	if (!factory) {
		throw new Error("Module declaration does not have a factory or callback defined");
	}
	return {
		start: factory.getStart(),
		end: factory.getEnd(),
	};
}

export default async function ({
	rootDir: _unused1,
	namespace: _unused2,
	resources: autofixResources,
	context,
}: AutofixOptions): Promise<AutofixResult> {
	const messages = new Map<string, RawLintMessage[]>();
	const xmlResources: Resource[] = [];
	const jsResources: Resource[] = [];
	const htmlResources: Resource[] = [];

	for (const [_, autofixResource] of autofixResources) {
		const fixMessages = autofixResource.messages.filter((msg) => msg.fix);
		if (!fixMessages.length) {
			// No fixes available for this resource
			continue;
		}
		messages.set(autofixResource.resource.getPath(), fixMessages);
		const resourcePath = autofixResource.resource.getPath();
		if (resourcePath.endsWith(".xml")) {
			xmlResources.push(autofixResource.resource);
		} else if (resourcePath.endsWith(".html")) {
			htmlResources.push(autofixResource.resource);
		} else {
			jsResources.push(autofixResource.resource);
		}
	}

	const res: AutofixResult = new Map();
	if (jsResources.length) {
		log.verbose(`Applying autofixes for ${jsResources.length} JS resources`);
		await autofixJs(jsResources, messages, context, res);
	}
	if (xmlResources.length) {
		log.verbose(`Applying autofixes for ${xmlResources.length} XML resources`);
		await autofixXml(xmlResources, messages, context, res);
	}
	if (htmlResources.length) {
		log.verbose(`Applying autofixes for ${htmlResources.length} HTML resources`);
		await autofixHtml(htmlResources, messages, context, res);
	}

	return res;
}

async function autofixJs(
	jsResources: Resource[], messages: Map<ResourcePath, RawLintMessage[]>, context: LinterContext,
	res: AutofixResult
): Promise<void> {
	const sourceFiles: SourceFiles = new Map();
	const jsResourcePaths = [];
	for (const resource of jsResources) {
		const resourcePath = resource.getPath();
		const sourceFile = ts.createSourceFile(
			resource.getPath(),
			await resource.getString(),
			{
				languageVersion: ts.ScriptTarget.ES2022,
				jsDocParsingMode: ts.JSDocParsingMode.ParseNone,
			}
		);
		sourceFiles.set(resourcePath, sourceFile);
		jsResourcePaths.push(resourcePath);
	}

	const compilerHost = createCompilerHost(sourceFiles);
	const program = createProgram(jsResourcePaths, compilerHost);

	const checker = program.getTypeChecker();
	for (const [resourcePath, sourceFile] of sourceFiles) {
		// Checking for syntax errors in the original source file.
		// We should not apply autofixes to files with syntax errors
		const existingJsErrors = getJsErrorsForSourceFile(sourceFile, program, compilerHost);
		if (existingJsErrors.length) {
			log.verbose(`Skipping autofix for '${resourcePath}'. Syntax error(s) in original source file:\n - ` +
				`${existingJsErrors.map((d) => {
					let res = d.messageText;
					if (d.codeSnippet) {
						res += ` (\`${d.codeSnippet}\`)`;
					}
					return res;
				}).join("\n - ")}`);
			continue;
		}

		log.verbose(`Applying autofix for ${resourcePath}`);
		let newContent;
		try {
			newContent = applyFixesJs(checker, sourceFile, resourcePath, messages.get(resourcePath)!);
		} catch (err) {
			if (err instanceof Error) {
				log.verbose(`Error while applying autofix to ${resourcePath}: ${err}`);
				log.verbose(`Call stack: ${err.stack}`);
				context.addLintingMessage(resourcePath, MESSAGE.AUTOFIX_ERROR, {message: err.message});
				continue;
			}
			throw err;
		}
		if (newContent) {
			const jsErrors = getJsErrors(newContent, resourcePath);
			if (jsErrors.length) {
				const contentWithMarkers = newContent.split("\n");
				let lineOffset = 0;
				const message = `Syntax error after applying autofix for '${resourcePath}'. ` +
					`This is likely a UI5 linter internal issue. Please check the verbose log. ` +
					`Please report this using the bug report template: ` +
					`https://github.com/UI5/linter/issues/new?template=bug-report.md`;
				const errors = jsErrors
					.sort((a, b) => {
						if (a.start === undefined || b.start === undefined) {
							return 0;
						}
						return a.start - b.start;
					}).map((d) => {
						let res = d.messageText;
						if (d.line !== undefined && d.character !== undefined) {
							// Prepend line and character
							res = `${d.line + 1}:${d.character + 1} ${res}`;

							// Fill contentWithMarkers array for debug logging
							// Insert line below the finding and mark the character
							const lineContent = contentWithMarkers[d.line + lineOffset];
							// Count number of tabs until the character
							const tabCount = lineContent.slice(0, d.character).split("\t").length - 1;
							const leadingTabs = "\t".repeat(tabCount);
							const markerLine = d.line + lineOffset + 1;
							contentWithMarkers.splice(markerLine, 0,
								leadingTabs + " ".repeat(d.character - tabCount) + "^");
							lineOffset++;
						}
						if (d.codeSnippet) {
							res += ` (\`${d.codeSnippet}\`)`;
						}
						return res;
					}).join("\n - ");
				log.verbose(message);
				log.verbose(errors);
				log.verbose(resourcePath + ":\n" + contentWithMarkers.join("\n"));
				context.addLintingMessage(resourcePath, MESSAGE.AUTOFIX_ERROR, {message});
			} else {
				log.verbose(`Autofix applied to ${resourcePath}`);
				res.set(resourcePath, newContent);
			}
		}
	}
}

async function autofixXml(
	xmlResources: Resource[], messages: Map<ResourcePath, RawLintMessage[]>, context: LinterContext,
	res: AutofixResult
): Promise<void> {
	for (const resource of xmlResources) {
		const resourcePath = resource.getPath();
		const existingXmlError = await getXmlErrorForFile(await resource.getString());
		if (existingXmlError) {
			log.verbose(`Skipping autofix for '${resourcePath}'. Syntax error reported in original source file:\n` +
				`[${existingXmlError.line}:${existingXmlError.col}] ${existingXmlError.msg}`);
			continue;
		}
		log.verbose(`Applying autofix for ${resourcePath}`);
		const newContent = await applyFixesXml(resource, messages.get(resourcePath)!);
		if (!newContent) {
			continue;
		}

		const newXmlError = await getXmlErrorForFile(newContent);
		if (newXmlError) {
			const message = `Syntax error after applying autofix for '${resourcePath}'. ` +
				`This is likely a UI5 linter internal issue. Please check the verbose log. ` +
				`Please report this using the bug report template: ` +
				`https://github.com/UI5/linter/issues/new?template=bug-report.md`;
			const error = `Reported error (${newXmlError.line}:${newXmlError.col}): ${newXmlError.msg}`;
			log.verbose(message);
			log.verbose(error);
			const contentWithMarkers = newContent.split("\n");
			if (newXmlError.line !== undefined && newXmlError.col !== undefined) {
				const line = newXmlError.line - 1;
				// Insert line below the finding and mark the character
				const lineContent = contentWithMarkers[line];
				// Count number of tabs until the character
				const tabCount = lineContent.slice(0, newXmlError.col).split("\t").length - 1;
				const leadingTabs = "\t".repeat(tabCount);
				const markerLine = line + 1;
				contentWithMarkers.splice(markerLine, 0, leadingTabs + " ".repeat(newXmlError.col - tabCount) + "^");
			}
			log.verbose(resourcePath + ":\n" + contentWithMarkers.join("\n"));
			context.addLintingMessage(resourcePath, MESSAGE.AUTOFIX_ERROR, {message});
			continue;
		}
		log.verbose(`Autofix applied to ${resourcePath}`);
		res.set(resourcePath, newContent);
	}
}

async function autofixHtml(
	htmlResources: Resource[], messages: Map<ResourcePath, RawLintMessage[]>, context: LinterContext,
	res: AutofixResult
): Promise<void> {
	for (const resource of htmlResources) {
		const resourcePath = resource.getPath();

		log.verbose(`Applying autofix for ${resourcePath}`);
		let newContent;
		try {
			newContent = await applyFixesHtml(resource, messages.get(resourcePath)!);
		} catch (err) {
			if (err instanceof Error) {
				log.verbose(`Error while applying autofix to ${resourcePath}: ${err}`);
				log.verbose(`Call stack: ${err.stack}`);
				context.addLintingMessage(resourcePath, MESSAGE.AUTOFIX_ERROR, {message: err.message});
				continue;
			}
			throw err;
		}
		if (newContent !== undefined) {
			log.verbose(`Autofix applied to ${resourcePath}`);
			res.set(resourcePath, newContent);
		}
	}
}

function applyFixesJs(
	checker: ts.TypeChecker, sourceFile: ts.SourceFile, resourcePath: ResourcePath,
	messages: RawLintMessage[]
): string | undefined {
	const content = sourceFile.getFullText();

	const changeSet: ChangeSet[] = [];
	generateChangesJs(resourcePath, checker, sourceFile, content, messages, changeSet);

	if (changeSet.length === 0) {
		// No modifications needed
		return;
	}
	return applyChanges(content, changeSet);
}

async function applyFixesXml(
	resource: Resource,
	messages: RawLintMessage[]
): Promise<string | undefined> {
	const content = await resource.getString();
	const changeSet: ChangeSet[] = [];
	await generateChangesXml(messages, changeSet, content, resource);

	if (changeSet.length === 0) {
		return undefined;
	}
	return applyChanges(content, changeSet);
}

async function applyFixesHtml(
	resource: Resource,
	messages: RawLintMessage[]
): Promise<string | undefined> {
	const content = await resource.getString();
	const changeSet: ChangeSet[] = [];

	generateChangesHtml(messages, changeSet, content);

	if (changeSet.length === 0) {
		return undefined;
	}

	return applyChanges(content, changeSet);
}
