import {LintMessage, LintResult} from "../linter/LinterContext.js";

export class Json {
	format(lintResults: LintResult[], showDetails: boolean, _quiet = false) {
		const jsonFormattedResults: Pick<
			LintResult,
			"filePath" |
			"messages" |
			"errorCount" |
			"warningCount" |
			"fatalErrorCount"
			// excluded by default: "coverageInfo"
		>[] = [];
		lintResults.forEach((oLintedFile) => {
			let aFileMessages: LintMessage[] = oLintedFile.messages;

			// Ignore files without findings (empty messages)
			if (aFileMessages && aFileMessages.length > 0) {
				// Exclude messageDetails property if CLI option "details" was not provided
				if (!showDetails) {
					aFileMessages = aFileMessages.map((message: LintMessage) => {
						const {messageDetails: _, ...oModifiedMessage} = message;
						return oModifiedMessage;
					});
				}

				jsonFormattedResults.push({
					filePath: oLintedFile.filePath,
					messages: aFileMessages,
					errorCount: oLintedFile.errorCount,
					warningCount: oLintedFile.warningCount,
					fatalErrorCount: oLintedFile.fatalErrorCount,
				});
			}
		});

		return JSON.stringify(jsonFormattedResults);
	}
}
