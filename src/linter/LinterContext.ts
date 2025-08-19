import {AbstractAdapter, AbstractReader} from "@ui5/fs";
import {createReader} from "@ui5/fs/resourceFactory";
import {resolveLinks} from "../formatter/lib/resolveLinks.js";
import {LintMessageSeverity, MESSAGE, MESSAGE_INFO} from "./messages.js";
import {MessageArgs} from "./MessageArgs.js";
import ts from "typescript";
import {Ui5TypeInfo} from "./ui5Types/Ui5TypeInfo.js";
import Fix from "./ui5Types/fix/Fix.js";
import {SourceFileMessageOptions} from "./ui5Types/SourceFileReporter.js";

export type FilePattern = string; // glob patterns
export type FilePath = string; // Platform-dependent path
export type ResourcePath = string; // Always POSIX

// Data types are structured very similar to the ESLint types for better compatibility into existing integrations:
// https://eslint.org/docs/latest/integrate/nodejs-api#-lintresult-type
export interface LintResult {
	filePath: FilePath;
	messages: LintMessage[];
	coverageInfo: CoverageInfo[];
	errorCount: number; // includes fatal errors
	fatalErrorCount: number;
	warningCount: number;
}

export interface RawLintResult {
	filePath: FilePath;
	rawMessages: RawLintMessage[];
}

export interface RawLintMessage<M extends MESSAGE = MESSAGE> {
	id: M;
	args?: MessageArgs[M];
	position?: PositionInfo;
	fix?: Fix;
	ui5TypeInfo?: Ui5TypeInfo;
}

export interface LintMessage {
	ruleId: string;
	severity: LintMessageSeverity;
	message: string;
	messageDetails?: string;
	ui5TypeInfo?: Ui5TypeInfo;
	fatal?: boolean | undefined; // e.g. parsing error
	line?: number | undefined; // 1 based to be aligned with most IDEs
	column?: number | undefined; // 1 based to be aligned with most IDEs
	endLine?: number | undefined;
	endColumn?: number | undefined;
}

export enum CoverageCategory {
	CallExpressionUnknownType = 1,
	UnknownControlAggregation = 2,
}

export interface CoverageInfo {
	category: CoverageCategory;
	message: string;
	messageDetails?: string;
	line?: number | undefined; // 1 based to be aligned with most IDEs
	column?: number | undefined; // 1 based to be aligned with most IDEs
	endLine?: number | undefined;
	endColumn?: number | undefined;
}

export interface TranspileResult {
	source: string;
	map: string;
}

export interface LinterOptions {
	rootDir: string;
	filePatterns?: FilePattern[];
	ignorePatterns?: FilePattern[];
	coverage?: boolean;
	details?: boolean;
	fix?: boolean;
	configPath?: string;
	noConfig?: boolean;
	ui5Config?: string | object;
	namespace?: string;
}

export interface LinterParameters {
	workspace: AbstractAdapter;
	filePathsWorkspace: AbstractAdapter;
	context: LinterContext;
}

export interface PositionInfo {
	line: number;
	column: number;
}

export interface PositionRange {
	start: PositionInfo;
	end?: PositionInfo;
}

export type DirectiveAction = "enable" | "disable";
export type DirectiveScope = "line" | "next-line" | undefined;
export interface Directive {
	action: DirectiveAction;
	scope: DirectiveScope;
	ruleNames: string[];
	line: number;
	column: number;
}

export interface LintMetadata {
	// The metadata holds information to be shared across linters
	directives: Set<Directive>;
	transformedImports: Map<string, Set<string>>;
	xmlCompiledResource: string;
	jsToXmlPosMapping: {pos: ts.LineAndCharacter; originalPath: string};
}

export default class LinterContext {
	#rootDir: string;
	#namespace: string | undefined;
	#rawMessages = new Map<ResourcePath, RawLintMessage[]>();
	#coverageInfo = new Map<ResourcePath, CoverageInfo[]>();
	#metadata = new Map<ResourcePath, LintMetadata>();
	#rootReader: AbstractReader | undefined;

	#reportCoverage: boolean;
	#includeMessageDetails: boolean;
	#applyAutofix: boolean;

	constructor(options: LinterOptions) {
		this.#rootDir = options.rootDir;
		this.#namespace = options.namespace;
		this.#reportCoverage = !!options.coverage;
		this.#includeMessageDetails = !!options.details;
		this.#applyAutofix = !!options.fix;
	}

	getRootDir(): string {
		return this.#rootDir;
	}

	setRootReader(rootReader: AbstractReader): void {
		if (this.#rootReader) {
			throw new Error("Root reader is already defined");
		}

		this.#rootReader = rootReader;
	}

	getRootReader(): AbstractReader {
		if (this.#rootReader) {
			return this.#rootReader;
		}
		this.#rootReader = createReader({
			fsBasePath: this.#rootDir,
			virBasePath: "/",
		});
		return this.#rootReader;
	}

	getNamespace(): string | undefined {
		return this.#namespace;
	}

	getReportCoverage(): boolean {
		return this.#reportCoverage;
	}

	getIncludeMessageDetails(): boolean {
		return this.#includeMessageDetails;
	}

	getApplyAutofix(): boolean {
		return this.#applyAutofix;
	}

	getMetadata(resourcePath: ResourcePath): LintMetadata {
		let metadata = this.#metadata.get(resourcePath);
		if (!metadata) {
			metadata = {} as LintMetadata;
			this.#metadata.set(resourcePath, metadata);
		}
		return metadata;
	}

	getRawLintingMessages(resourcePath: ResourcePath): RawLintMessage[] {
		let rawMessages = this.#rawMessages.get(resourcePath);
		if (!rawMessages) {
			rawMessages = [];
			this.#rawMessages.set(resourcePath, rawMessages);
		}
		return rawMessages;
	}

	addLintingMessage<M extends MESSAGE>(
		resourcePath: ResourcePath, rawMessage: RawLintMessage<M>
	): void {
		this.getRawLintingMessages(resourcePath).push(rawMessage);
	}

	addLintingMessages<M extends MESSAGE>(
		resourcePath: ResourcePath, rawMessages: RawLintMessage<M>[]
	) {
		this.getRawLintingMessages(resourcePath).push(...rawMessages);
	}

	getCoverageInfo(resourcePath: ResourcePath): CoverageInfo[] {
		let coverageInfo = this.#coverageInfo.get(resourcePath);
		if (!coverageInfo) {
			coverageInfo = [];
			this.#coverageInfo.set(resourcePath, coverageInfo);
		}
		return coverageInfo;
	}

	addCoverageInfo(resourcePath: ResourcePath, coverageInfo: CoverageInfo) {
		this.getCoverageInfo(resourcePath).push(coverageInfo);
	}

	addDirective(resourcePath: ResourcePath, directive: Directive) {
		const metadata = this.getMetadata(resourcePath);
		if (!metadata.directives) {
			metadata.directives = new Set<Directive>();
		}
		metadata.directives.add(directive);
	}

	#getMessageFromRawMessage<M extends MESSAGE>(rawMessage: RawLintMessage<M>): LintMessage {
		const messageInfo = MESSAGE_INFO[rawMessage.id];
		if (!messageInfo) {
			throw new Error(`Invalid message id '${rawMessage.id}'`);
		}

		const messageFunc = messageInfo.message as (args: MessageArgs[M]) => string;

		const message: LintMessage = {
			ruleId: messageInfo.ruleId,
			severity: messageInfo.severity,
			line: rawMessage.position ? rawMessage.position.line : undefined,
			column: rawMessage.position ? rawMessage.position.column : undefined,
			message: messageFunc(rawMessage.args ?? {} as MessageArgs[M]),
			ui5TypeInfo: rawMessage.ui5TypeInfo,
		};

		if (this.#includeMessageDetails) {
			const detailsFunc = messageInfo.details as (args: MessageArgs[M]) => string | undefined;
			const messageDetails = detailsFunc(rawMessage.args ?? {} as MessageArgs[M]);
			if (messageDetails) {
				message.messageDetails = resolveLinks(messageDetails);
			}
		}

		if ("fatal" in messageInfo && typeof messageInfo.fatal === "boolean") {
			message.fatal = messageInfo.fatal;
		}

		if (message.fatal && message.severity !== LintMessageSeverity.Error) {
			throw new Error(`Reports flagged as "fatal" must be of severity "Error"`);
		}

		return message;
	}

	#getFilteredMessages(resourcePath: ResourcePath): RawLintMessage[] {
		const sortFn = (a: RawLintMessage, b: RawLintMessage) => {
			const aPos = a.position ?? {line: 0, column: 0};
			const bPos = b.position ?? {line: 0, column: 0};
			return aPos.line === bPos.line ? aPos.column - bPos.column : aPos.line - bPos.line;
		};
		const rawMessages = this.#rawMessages.get(resourcePath);
		if (!rawMessages) {
			return [];
		}
		const metadata = this.#metadata.get(resourcePath);
		if (!metadata?.directives?.size) {
			return rawMessages.sort(sortFn);
		}

		const filteredMessages: RawLintMessage[] = [];
		const directives = new Set(metadata.directives);
		// Sort messages by position
		const sortedMessages = rawMessages.filter((rawMessage) => {
			if (!rawMessage.position) {
				filteredMessages.push(rawMessage);
				return false;
			}
			return true;
		}).sort(sortFn);

		// Filter messages based on directives
		let directiveStack: Directive[] = [];
		for (const rawMessage of sortedMessages) {
			const {position} = rawMessage;
			const {line, column} = position!; // Undefined positions are already filtered out above

			directiveStack = directiveStack.filter((dir) => {
				// Filter out line-based directives that are no longer relevant
				if (dir.scope === "line" && dir.line !== line) {
					return false;
				}
				if (dir.scope === "next-line" && dir.line !== line - 1) {
					return false;
				}
				return true;
			});

			for (const dir of directives) {
				if (dir.line > line) {
					continue;
				}
				if (dir.scope !== "line" && dir.line === line && dir.column > column) {
					continue;
				}
				directives.delete(dir);
				if (dir.scope === "line" && dir.line !== line) {
					continue;
				}
				if (dir.scope === "next-line" && dir.line !== line - 1) {
					continue;
				}
				directiveStack.push(dir);
			}

			if (!directiveStack.length) {
				filteredMessages.push(rawMessage);
				continue;
			}

			const messageInfo = MESSAGE_INFO[rawMessage.id];
			if (!messageInfo) {
				throw new Error(`Invalid message id '${rawMessage.id}'`);
			}

			let disabled = false;
			for (const dir of directiveStack) {
				if (dir.action === "disable" &&
					(!dir.ruleNames.length || dir.ruleNames.includes(messageInfo.ruleId))) {
					disabled = true;
				} else if (dir.action === "enable" &&
					(!dir.ruleNames.length || dir.ruleNames.includes(messageInfo.ruleId))) {
					disabled = false;
				}
			}
			if (!disabled) {
				filteredMessages.push(rawMessage);
			}
		}
		return filteredMessages;
	}

	generateLintResult(resourcePath: ResourcePath): LintResult {
		const coverageInfo = this.#coverageInfo.get(resourcePath) ?? [];
		let errorCount = 0;
		let warningCount = 0;
		let fatalErrorCount = 0;

		const rawMessages = this.#getFilteredMessages(resourcePath);

		const messages: LintMessage[] = rawMessages.map((rawMessage) => {
			const message = this.#getMessageFromRawMessage(rawMessage);
			if (message.severity === LintMessageSeverity.Error) {
				errorCount++;
				if (message.fatal) {
					fatalErrorCount++;
				}
			} else {
				warningCount++;
			}
			return message;
		});

		return {
			filePath: resourcePath,
			messages,
			coverageInfo,
			errorCount,
			warningCount,
			fatalErrorCount,
		};
	}

	generateLintResults(): LintResult[] {
		const lintResults: LintResult[] = [];
		let resourcePaths;
		if (this.#reportCoverage) {
			resourcePaths = new Set([...this.#rawMessages.keys(), ...this.#coverageInfo.keys()]).values();
		} else {
			resourcePaths = this.#rawMessages.keys();
		}

		for (const resourcePath of resourcePaths) {
			lintResults.push(this.generateLintResult(resourcePath));
		}

		return lintResults;
	}

	generateRawLintResults(): RawLintResult[] {
		const rawLintResults: RawLintResult[] = [];
		let resourcePaths;
		if (this.#reportCoverage) {
			resourcePaths = new Set([...this.#rawMessages.keys(), ...this.#coverageInfo.keys()]).values();
		} else {
			resourcePaths = this.#rawMessages.keys();
		}

		for (const resourcePath of resourcePaths) {
			rawLintResults.push({
				filePath: resourcePath,
				rawMessages: this.#getFilteredMessages(resourcePath),
			});
		}

		return rawLintResults;
	}
}
