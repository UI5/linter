import ts from "typescript";
import path from "node:path/posix";
import {getLogger} from "@ui5/logger";
import {taskStart} from "../../../utils/perf.js";
import LinterContext, {TranspileResult} from "../../LinterContext.js";
import {createTransformer} from "./tsTransformer.js";
import {UnsupportedModuleError} from "./util.js";
import {UnsafeNodeRemoval} from "./pruneNode.js";

const log = getLogger("linter:ui5Types:amdTranspiler:transpiler");

type FilePath = string;
type FileContent = string;
type SourceFiles = Map<FilePath, ts.SourceFile>;
type WrittenFiles = Map<FilePath, FileContent>;

function createCompilerHost(sourceFiles: SourceFiles, writtenFiles: WrittenFiles): ts.CompilerHost {
	return {
		getSourceFile: (fileName) => sourceFiles.get(fileName),
		writeFile: (name, text) => {
			writtenFiles.set(name, text);
		},
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

const compilerOptions = {
	checkJs: false,
	allowJs: true,
	skipLibCheck: true,

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

export default function transpileAmdToEsm(
	resourcePath: string, content: string, context: LinterContext, strict?: boolean
): TranspileResult {
	// Do not transpile UI5 bundles
	if (content.startsWith("//@ui5-bundle ")) {
		log.verbose(`Skipping transformation of UI5 bundle ${resourcePath}.`);
		return {source: content, map: ""};
	}

	// This is heavily inspired by the TypesScript "transpileModule" API
	const fileName = path.basename(resourcePath);
	const taskDone = taskStart("Transpiling AMD to ESM", fileName, true);
	const sourceFile = ts.createSourceFile(
		fileName,
		content,
		{
			languageVersion: ts.ScriptTarget.ES2022,
			jsDocParsingMode: ts.JSDocParsingMode.ParseNone,
		}
		// /*setParentNodes*/ false,
		// ts.ScriptKind.JS
	);

	const sourceFiles: SourceFiles = new Map();
	sourceFiles.set(fileName, sourceFile);
	const writtenResources: WrittenFiles = new Map();
	const compilerHost = createCompilerHost(sourceFiles, writtenResources);
	const program = createProgram([fileName], compilerHost);

	const transformers: ts.CustomTransformers = {
		before: [createTransformer(program, resourcePath, context)],
	};

	try {
		// ts.setEmitFlags(sourceFile, ts.EmitFlags.NoTrailingSourceMap);
		// TODO: Investigate whether we can retrieve a source file that can be fed directly into the typeChecker
		program.emit(
			/* targetSourceFile */ undefined, /* writeFile */ undefined,
			/* cancellationToken */ undefined, /* emitOnlyDtsFiles */ undefined,
			transformers);

		/*	tsc currently does not provide an API to emit TypeScript *with* a source map
		 	(see https://github.com/microsoft/TypeScript/issues/51329)

		 	The below can be used to emit TypeScript without a source map:

			const result = ts.transform(
				sourceFile,
				[createTransformer(resourcePath, program)], compilerOptions);

			const printer = ts.createPrinter();
			const printed = printer.printNode(ts.EmitHint.SourceFile, result.transformed[0], sourceFile);
			const printed = printer.printFile(result.transformed[0]);
			outputText = printed;
		*/
	} catch (err) {
		if (strict) {
			throw err;
		}
		// Usually the UnsupportedModuleError is already caught inside and not thrown, but this is a safety net
		// in case it is thrown anyway.
		if (err instanceof UnsupportedModuleError) {
			log.verbose(`Failed to transform module ${fileName}: ${err.message}`);
			if (err.stack) {
				log.verbose(`Stack trace:`);
				log.verbose(err.stack);
			}
			return {source: content, map: ""};
		} else if (err instanceof Error && err.message.startsWith("Debug Failure")) {
			// We probably failed to create a valid AST. The error is thrown by TypeScript itself.
			log.verbose(`AST transformation failed for module ${fileName}: ${err.message}`);
			if (err.stack) {
				log.verbose(`Stack trace:`);
				log.verbose(err.stack);
			}
			return {source: content, map: ""};
		} else if (err instanceof UnsafeNodeRemoval && err.message.startsWith("Cannot remove ConditionalExpression")) {
			log.verbose(`Failed to transform module ${fileName}: ${err.message}`);
			if (err.stack) {
				log.verbose(`Stack trace:`);
				log.verbose(err.stack);
			}
			return {source: content, map: ""};
		}
		throw err;
	}

	const source = writtenResources.get(fileName);
	if (!source) {
		throw new Error(`Transpiling yielded no result for ${fileName}`);
	}
	const map = writtenResources.get(`${fileName}.map`);
	if (!map) {
		throw new Error(`Transpiling yielded no source map for ${fileName}`);
	}

	// Convert sourceMappingURL ending with ".js" to ".ts"
	// map = map
	// 	.replace(`//# sourceMappingURL=${fileName}.map`, `//# sourceMappingURL=${fileName}.map`);
	taskDone();
	return {source, map};
}
