import {LintResult, LintMessage} from "../linter/LinterContext.js";
import {LintMessageSeverity} from "../linter/messages.js";

export class Html {
	format(lintResults: LintResult[], showDetails: boolean, version: string, autofix: boolean, quiet = false): string {
		let totalErrorCount = 0;
		let totalWarningCount = 0;
		let totalFatalErrorCount = 0;

		// Build the HTML content
		let resultsHtml = "";
		lintResults.forEach(({filePath, messages, errorCount, warningCount, fatalErrorCount}) => {
			if (!errorCount && !warningCount) {
				// Skip files without errors or warnings
				return;
			}
			// Accumulate totals
			totalErrorCount += errorCount;
			totalWarningCount += warningCount;
			totalFatalErrorCount += fatalErrorCount;

			// Add the file path as a section header
			resultsHtml += `<div class="file">
				<h3>${filePath}</h3>
				<table>
					<thead>
						<tr>
							<th>Severity</th>
							<th>Rule</th>
							<th>Location</th>
							<th>Message</th>
							${showDetails ? "<th>Details</th>" : ""}
						</tr>
					</thead>
					<tbody>`;

			// Sort messages by severity (fatal errors first, then errors, then warnings)
			messages.sort((a, b) => {
				// Handle fatal errors first to push them to the bottom
				if (a.fatal !== b.fatal) {
					return a.fatal ? -1 : 1; // Fatal errors go to the top
				}
				// Then, compare by severity
				if (a.severity !== b.severity) {
					return b.severity - a.severity;
				}
				// If severity is the same, compare by line number
				if ((a.line ?? 0) !== (b.line ?? 0)) {
					return (a.line ?? 0) - (b.line ?? 0);
				}
				// If both severity and line number are the same, compare by column number
				return (a.column ?? 0) - (b.column ?? 0);
			});

			// Format each message
			messages.forEach((msg) => {
				const severityClass = this.getSeverityClass(msg.severity, msg.fatal);
				const severityText = this.formatSeverity(msg.severity, msg.fatal);
				const location = `${msg.line ?? 0}:${msg.column ?? 0}`;
				const rule = `<a href="https://github.com/UI5/linter/blob/v${version}/docs/Rules.md#${msg.ruleId}" target="_blank">${msg.ruleId}</a>`;

				resultsHtml += `<tr class="${severityClass}">`;
				resultsHtml += `<td>${severityText}</td>`;
				resultsHtml += `<td>${rule}</td>`;
				resultsHtml += `<td><code>${location}</code></td>`;
				resultsHtml += `<td>${msg.message}</td>`;
				if (showDetails && msg.messageDetails) {
					resultsHtml += `<td>${this.formatMessageDetails(msg)}</td>`;
				} else if (showDetails) {
					resultsHtml += `<td></td>`;
				}
				resultsHtml += `</tr>`;
			});

			resultsHtml += `</tbody></table></div>`;
		});

		// Build summary
		const totalCount = quiet ? totalErrorCount : totalErrorCount + totalWarningCount;
		const errorsText = `${totalErrorCount} ${totalErrorCount === 1 ? "error" : "errors"}`;
		const warningsText = quiet ? "" : `, ${totalWarningCount} ${totalWarningCount === 1 ? "warning" : "warnings"}`;
		const problemsText = `${totalCount} ${totalCount === 1 ? "problem" : "problems"}`;

		const summary = `<div class="summary">
			<h2>Summary</h2>
			<p>
				${problemsText} (${errorsText}${warningsText})
			</p>
			${totalFatalErrorCount ? `<p><strong>${totalFatalErrorCount} fatal errors</strong></p>` : ""}
			${!autofix && totalCount > 0 ?
				"<p>Run <code>ui5lint --fix</code> to resolve all auto-fixable problems</p>" :
				""}
		</div>`;

		// Full HTML document with some basic styling
		const html = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>UI5 Linter Report</title>
	<style>
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
				Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
			line-height: 1.5;
			max-width: 1200px;
			margin: 0 auto;
			padding: 20px;
			color: #333;
		}
		h1, h2 {
			border-bottom: 1px solid #eaecef;
			padding-bottom: 0.3em;
			color: #24292e;
		}
		h3 {
			padding: 10px;
			margin: 0;
			background-color: #f6f8fa;
			border-top-left-radius: 4px;
			border-top-right-radius: 4px;
			border: 1px solid #eaecef;
			border-bottom: none;
		}
		table {
			width: 100%;
			border-collapse: collapse;
			margin-bottom: 20px;
			border: 1px solid #eaecef;
			border-radius: 4px;
		}
		th, td {
			text-align: left;
			padding: 8px 12px;
			border-bottom: 1px solid #eaecef;
		}
		th {
			background-color: #f6f8fa;
			font-weight: 600;
		}
		tr.error {
			background-color: #fff5f5;
		}
		tr.error td:first-child {
			color: #d73a49;
			font-weight: 600;
		}
		tr.warning {
			background-color: #fffbea;
		}
		tr.warning td:first-child {
			color: #e36209;
			font-weight: 600;
		}
		tr.fatal-error {
			background-color: #ffdce0;
		}
		tr.fatal-error td:first-child {
			color: #b31d28;
			font-weight: 600;
		}
		code {
			background-color: #f6f8fa;
			padding: 0.2em 0.4em;
			border-radius: 3px;
			font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
		}
		.summary {
			margin-bottom: 30px;
		}
		.file {
			margin-bottom: 30px;
		}
		.note {
			margin-top: 20px;
			padding: 10px;
			background-color: #f6f8fa;
			border-radius: 4px;
			font-size: 14px;
		}
		a {
			color: #0366d6;
			text-decoration: none;
		}
		a:hover {
			text-decoration: underline;
		}
		@media (max-width: 768px) {
			body {
				padding: 10px;
			}
			table {
				display: block;
				overflow-x: auto;
			}
		}
	</style>
</head>
<body>
	<h1>UI5 Linter Report</h1>
	<p>Generated with UI5 Linter v${version}</p>

	${summary}

	${resultsHtml && `<h2>Findings</h2>${resultsHtml}`}

	${!showDetails && totalCount > 0 ?
		"<div class=\"note\"><strong>Note:</strong> Use <code>ui5lint --details</code> " +
		"to show more information about the findings.</div>" :
		""}
</body>
</html>`;

		return html;
	}

	// Formats the severity of the lint message
	private formatSeverity(severity: LintMessageSeverity, fatal: LintMessage["fatal"]): string {
		if (fatal === true) {
			return "Fatal Error";
		} else if (severity === LintMessageSeverity.Warning) {
			return "Warning";
		} else if (severity === LintMessageSeverity.Error) {
			return "Error";
		} else {
			throw new Error(`Unknown severity: ${LintMessageSeverity[severity]}`);
		}
	}

	// Returns CSS class name based on severity
	private getSeverityClass(severity: LintMessageSeverity, fatal: LintMessage["fatal"]): string {
		if (fatal === true) {
			return "fatal-error";
		} else if (severity === LintMessageSeverity.Warning) {
			return "warning";
		} else if (severity === LintMessageSeverity.Error) {
			return "error";
		} else {
			return "";
		}
	}

	// Formats additional message details if available
	private formatMessageDetails(msg: LintMessage): string {
		if (!msg.messageDetails) {
			return "";
		}
		// Replace multiple spaces, tabs, or newlines with a single space for clean output
		// This more comprehensive regex handles all whitespace characters
		const cleanedDetails = msg.messageDetails.replace(/[\s\t\r\n]+/g, " ");

		// Convert URLs to hyperlinks
		// This regex matches http/https URLs and also patterns like ui5.sap.com/... with or without protocol
		return cleanedDetails.replace(
			/(https?:\/\/[^\s)]+)|(\([^(]*?)(https?:\/\/[^\s)]+)([^)]*?\))|(\b(?:www\.|ui5\.sap\.com)[^\s)]+)/g,
			(match, directUrl, beforeParen, urlInParen, afterParen, domainUrl) => {
				if (directUrl) {
					// Direct URL without parentheses
					return `<a href="${directUrl}" target="_blank">${directUrl}</a>`;
				} else if (urlInParen) {
					// URL inside parentheses - keep the parentheses as text but make the URL a link
					return `${beforeParen}<a href="${urlInParen}" target="_blank">${urlInParen}</a>${afterParen}`;
				} else if (domainUrl) {
					// Domain starting with www. or ui5.sap.com without http(s)://
					const fullUrl = typeof domainUrl === "string" && domainUrl.startsWith("www.") ?
						`http://${domainUrl}` :
						`https://${domainUrl}`;
					return `<a href="${fullUrl}" target="_blank">${domainUrl}</a>`;
				}
				return match;
			}
		);
	}
}
