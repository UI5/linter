import chalk from "chalk";
import path from "node:path";
import {LintResult, LintMessage} from "../linter/LinterContext.js";
import {LintMessageSeverity} from "../linter/messages.js";

const detailsHeader = chalk.white.bold("Details:");

function formatSeverity(severity: LintMessageSeverity) {
	if (severity === LintMessageSeverity.Error) {
		return chalk.red("error");
	} else if (severity === LintMessageSeverity.Warning) {
		return chalk.yellow("warning");
	} else {
		throw new Error(`Unknown severity: ${LintMessageSeverity[severity]}`);
	}
}

function formatLocation(line: LintMessage["line"], column: LintMessage["column"],
	lineInfoLength: number, columnInfoLength: number) {
	const lineStr = (line === undefined ? "0" : line.toString()).padStart(lineInfoLength, " ");
	const columnStr = (column === undefined ? "0" : column.toString()).padEnd(columnInfoLength, " ");

	return chalk.dim(`${lineStr}:${columnStr}`);
}

function formatMessageDetails(msg: LintMessage, showDetails: boolean) {
	if (!showDetails || !msg.messageDetails) {
		return "";
	}
	// Ensure that details are not containing line breaks as every message should be just a single line.
	// In addition, some integrations understand two whitespace chars (e.g. two spaces) as a separator
	// for a message code (e.g. $eslint-stylish problems matcher in VS Code).
	// Therefore, two or more whitespace chars are reduced to a single space.
	return `. ${detailsHeader} ${chalk.italic(msg.messageDetails.replace(/\s\s+|\n/g, " "))}`;
}

function formatRule(ruleId: string) {
	return chalk.dim(`  ${ruleId}`);
}

export class Text {
	#buffer = "";

	constructor(private readonly cwd: string) {
	}

	format(lintResults: LintResult[], showDetails: boolean, autofix: boolean, quiet = false) {
		this.#writeln(`UI5 linter report:`);
		this.#writeln("");
		let totalErrorCount = 0;
		let totalWarningCount = 0;
		let totalFatalErrorCount = 0;
		lintResults.forEach(({filePath, messages, errorCount, warningCount, fatalErrorCount}) => {
			if (!errorCount && !warningCount) {
				return;
			}
			totalErrorCount += errorCount;
			totalWarningCount += warningCount;
			totalFatalErrorCount += fatalErrorCount;

			this.#writeln(chalk.inverse(path.resolve(this.cwd, filePath)));

			// Determine maximum line and column for position formatting
			let maxLine = 0;
			let maxColumn = 0;
			messages.forEach((msg) => {
				if (msg.line && msg.line > maxLine) {
					maxLine = msg.line;
				}
				if (msg.column && msg.column > maxColumn) {
					maxColumn = msg.column;
				}
			});

			const lineInfoLength = maxLine.toString().length;
			const columnInfoLength = maxColumn.toString().length;

			// Sort by line, then by column. Use 0 if not set.
			messages.sort((a, b) => (a.line ?? 0) - (b.line ?? 0) || (a.column ?? 0) - (b.column ?? 0));

			messages.forEach((msg) => {
				const formattedLocation =
					formatLocation(msg.line, msg.column, lineInfoLength, columnInfoLength);

				this.#writeln(
					`  ${formattedLocation} ` +
					`${formatSeverity(msg.severity)} ` +
					`${msg.fatal ? "Fatal error: " : ""}` +
					`${msg.message}` +
					`${formatMessageDetails(msg, showDetails)}` +
					`${formatRule(msg.ruleId)}`);
			});

			this.#writeln("");
		});

		let summaryColor = chalk.green;
		if (totalErrorCount > 0) {
			summaryColor = chalk.red;
		} else if (totalWarningCount > 0) {
			summaryColor = chalk.yellow;
		}

		const errorsText = `${totalErrorCount} ${totalErrorCount === 1 ? "error" : "errors"}`;
		let warningsText = "";
		if (!quiet) {
			warningsText = `, ${totalWarningCount} ${totalWarningCount === 1 ? "warning" : "warnings"}`;
		}

		const totalCount = quiet ? totalErrorCount : totalErrorCount + totalWarningCount;
		const problemsText = `${totalCount} ${totalCount === 1 ? "problem" : "problems"}`;

		if (totalCount === 0) {
			this.#writeln(summaryColor("Success! No findings detected."));
		} else {
			this.#writeln(
				summaryColor(`${problemsText} (${errorsText}${warningsText})`)
			);
		}

		if (!autofix && (totalErrorCount + totalWarningCount > 0)) {
			this.#writeln("   Run \"ui5lint --fix\" to resolve all auto-fixable problems\n");
		}

		if (totalFatalErrorCount) {
			const fatalErrorsText = `${totalFatalErrorCount === 1 ? "error" : "errors"}`;
			this.#writeln(summaryColor(`${totalFatalErrorCount} fatal ${fatalErrorsText}`));
		}

		if (!showDetails && (totalErrorCount + totalWarningCount + totalFatalErrorCount) > 0) {
			this.#writeln("");
			this.#writeln(chalk.dim.bold("Note: ") +
				chalk.dim(`Use "ui5lint --details" to show more information about the findings`));
		}

		return this.#buffer;
	}

	// eslint-disable-next-line no-unused-private-class-members
	#write(str: string) {
		this.#buffer += str;
	}

	#writeln(str: string) {
		this.#buffer += str + "\n";
	}
}
