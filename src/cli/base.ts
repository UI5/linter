import {Argv, ArgumentsCamelCase, CommandModule, MiddlewareFunction} from "yargs";
import {Text} from "../formatter/text.js";
import {Json} from "../formatter/json.js";
import {Markdown} from "../formatter/markdown.js";
import {Html} from "../formatter/html.js";
import {Coverage} from "../formatter/coverage.js";
import {writeFile} from "node:fs/promises";
import baseMiddleware from "./middlewares/base.js";
import chalk from "chalk";
import {isLogLevelEnabled} from "@ui5/logger";
import ConsoleWriter from "@ui5/logger/writers/Console";
import {getVersion} from "./version.js";
import {ui5lint} from "../index.js";
import {LintMessageSeverity} from "../linter/messages.js";

export interface LinterArg {
	coverage: boolean;
	files?: string[];
	filePaths?: string[];
	ignorePattern?: string[];
	details: boolean;
	fix: boolean;
	format: string;
	config?: string;
	ui5Config?: string;
	quiet: boolean;
}

// yargs type definition is missing the "middlewares" property for the CommandModule type
interface FixedCommandModule<T, U> extends CommandModule<T, U> {
	middlewares: MiddlewareFunction<U>[];
}

const lintCommand: FixedCommandModule<object, LinterArg> = {
	command: "$0 [files...]",
	describe: "Runs linter",
	handler: handleLint,
	middlewares: [baseMiddleware],
	builder: function (args: Argv<object>): Argv<LinterArg> {
		args.usage("Usage: $0 [files...] [options]")
			.positional("files", {
				describe: "List of patterns to lint",
				type: "string",
				array: true,
			})
			.coerce([
				"files",
			], (arg: LinterArg[]) => {
				// Yargs will also provide --files option under the hood
				// Enforce an array type
				if (!Array.isArray(arg)) {
					// If the option is specified multiple times, use the value of the last option
					return [arg];
				}
				return arg;
			})
			.option("config", {
				describe: "Load a custom config by file path",
				type: "string",
				alias: "c",
			})
			.option("ignore-pattern", {
				describe: "Pattern/files that will be ignored during linting. " +
					"Can also be defined in ui5linter.config.js",
				type: "string",
			})
			.array("ignore-pattern")
			.option("coverage", {
				describe: "Whether to provide a coverage report",
				type: "boolean",
				default: false,
			})
			.option("details", {
				describe: "Print complementary information for each finding, if available",
				type: "boolean",
				default: false,
			})
			.option("fix", {
				describe: "Automatically fix linter findings",
				type: "boolean",
				default: false,
			})
			.option("loglevel", {
				alias: "log-level",
				describe: "Set the logging level",
				default: "info",
				type: "string",
				choices: ["silent", "error", "warn", "info", "perf", "verbose", "silly"],
			})
			.option("verbose", {
				describe: "Enable verbose logging.",
				default: false,
				type: "boolean",
			})
			.option("perf", {
				describe: "Enable performance measurements and related logging.",
				default: false,
				type: "boolean",
			})
			.option("silent", {
				describe: "Disable all log output.",
				default: false,
				type: "boolean",
			})
			.option("format", {
				alias: "f",
				describe: "Set the output format for the linter result",
				default: "stylish",
				type: "string",
				choices: ["stylish", "json", "markdown", "html"],
			})
			.option("quiet", {
				describe: "Report errors only",
				type: "boolean",
				default: false,
				alias: "q",
			})
			.option("ui5-config", {
				describe: "Set a custom path for the UI5 Config (default: './ui5.yaml' if that file exists)",
				type: "string",
			})
			.coerce([
				"log-level",
			], (arg: LinterArg[]) => {
				// If an option is specified multiple times, yargs creates an array for all the values,
				// independently of whether the option is of type "array" or "string".
				// This is unexpected for options listed above, which should all only have only one
				// definitive value. The yargs behavior could be disabled by using the parserConfiguration
				// "duplicate-arguments-array": true. However, yargs would then cease to create arrays for
				// those options where we *do* expect the automatic creation of arrays in case the option
				// is specified multiple times. Like "--include-task".
				// Also see https://github.com/yargs/yargs/issues/1318
				// Note: This is not necessary for options of type "boolean"
				if (Array.isArray(arg)) {
					// If the option is specified multiple times, use the value of the last option
					return arg[arg.length - 1];
				}
				return arg;
			})
			.example("ui5lint ./path/to/file ./path/**/*",
				"Execute ui5lint with specified files or glob patterns to restrict linting to the selected files only")
			.example("ui5lint --coverage",
				"Execute ui5lint with coverage enabled");

		return args as Argv<LinterArg>;
	},
};

async function handleLint(argv: ArgumentsCamelCase<LinterArg>) {
	const {
		files: filePatterns,
		coverage,
		ignorePattern: ignorePatterns,
		details,
		fix,
		format,
		config,
		ui5Config,
		quiet,
	} = argv;

	let profile;
	if (process.env.UI5LINT_PROFILE) {
		profile = await import("./utils/profile.js");
		await profile.start();
	}

	const rootDir = process.cwd();

	const reportCoverage = !!(process.env.UI5LINT_COVERAGE_REPORT ?? coverage);

	const res = await ui5lint({
		rootDir,
		ignorePatterns,
		filePatterns,
		coverage: reportCoverage,
		details,
		fix,
		config,
		ui5Config,
	});

	// Apply quiet mode filtering directly to the results if needed
	if (quiet) {
		// Filter out warnings from all result objects
		for (const result of res) {
			// Keep only error messages (severity === 2)
			result.messages = result.messages.filter((msg) => msg.severity === LintMessageSeverity.Error);
			// Reset warning counts
			result.warningCount = 0;
			// Reset fixableWarningCount if it exists
			if ("fixableWarningCount" in result) {
				result.fixableWarningCount = 0;
			}
		}
	}

	if (coverage) {
		const coverageFormatter = new Coverage();
		await writeFile("ui5lint-report.html", await coverageFormatter.format(res, new Date()));
	}

	if (format === "json") {
		const jsonFormatter = new Json();
		process.stdout.write(jsonFormatter.format(res, details, quiet));
		process.stdout.write("\n");
	} else if (format === "markdown") {
		const markdownFormatter = new Markdown();
		process.stdout.write(markdownFormatter.format(res, details, getVersion(), fix, quiet));
		process.stdout.write("\n");
	} else if (format === "html") {
		const htmlFormatter = new Html();
		process.stdout.write(htmlFormatter.format(res, details, getVersion(), fix, quiet));
		process.stdout.write("\n");
	} else if (format === "" || format === "stylish") {
		const textFormatter = new Text(rootDir);
		process.stderr.write(textFormatter.format(res, details, fix, quiet));
	}
	// Stop profiling after CLI finished execution
	if (profile) {
		await profile.stop();
	}

	if (res.some((file) => !!file.errorCount)) {
		// At least one error is reported. Exit with non-zero exit code.
		process.exitCode = 1;
	}
}

export default function base(cli: Argv) {
	cli
		.showHelpOnFail(true)
		.strict(true)
		.fail(function (msg, err) {
			if (err) {
				ConsoleWriter.stop();
				// Exception
				if (isLogLevelEnabled("error")) {
					process.stderr.write("\n");
					process.stderr.write(chalk.bold.red("⚠️  Process Failed With Error\n"));

					process.stderr.write("\n");
					process.stderr.write(chalk.underline("Error Message:\n"));
					process.stderr.write(err.message + "\n");

					// Unexpected errors should always be logged with stack trace
					const unexpectedErrors = ["SyntaxError", "ReferenceError", "TypeError"];
					if (unexpectedErrors.includes(err.name) || isLogLevelEnabled("verbose")) {
						process.stderr.write("\n");
						if (err.stack) {
							process.stderr.write(chalk.underline("Stack Trace:\n"));
							process.stderr.write(err.stack + "\n");
							process.stderr.write("\n");
						}
						if (err.cause instanceof Error && err.cause.stack) {
							process.stderr.write(chalk.underline("Error Cause Stack Trace:\n"));
							process.stderr.write(err.cause.stack + "\n");
							process.stderr.write("\n");
						}
						process.stderr.write(
							chalk.dim(
								`If you think this is an issue of the ui5-linter, you might report it using the ` +
								`following URL: `) +
								chalk.dim.bold.underline(`https://github.com/UI5/linter/issues/new/choose`) + "\n");
					} else {
						process.stderr.write("\n");
						process.stderr.write(chalk.dim(`For details, execute the same command again with an` +
							` additional '--verbose' parameter`) + "\n");
					}
				}
			} else {
				// Yargs error
				process.stderr.write(chalk.bold.yellow("Command Failed:\n"));
				process.stderr.write(`${msg}\n`);
				process.stderr.write("\n");
				process.stderr.write(chalk.dim(`See 'ui5lint --help'`) + "\n");
			}
			process.exit(2);
		});

	cli.command(lintCommand);
}
