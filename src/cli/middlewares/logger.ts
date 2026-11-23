import {setLogLevel, isLogLevelEnabled, getLogger} from "@ui5/logger";
import ConsoleWriter from "@ui5/logger/writers/Console";
import {getFormattedVersion} from "../version.js";
import type {ArgumentsCamelCase} from "yargs";
/**
 * Logger middleware to enable logging capabilities
 *
 */
// eslint-disable-next-line @typescript-eslint/require-await
export async function initLogger(argv: ArgumentsCamelCase) {
	if (argv.silent) {
		setLogLevel("silent");
	}
	if (argv.perf) {
		setLogLevel("perf");
	}
	if (argv.verbose) {
		setLogLevel("verbose");
	}
	if (argv.loglevel && argv.loglevel !== "info") {
		// argv.loglevel defaults to "info", which is anyways already the Logger's default
		// Therefore do not explicitly set it again in order to allow overwriting the log level
		// using the UI5_LOG_LVL environment variable
		setLogLevel(argv.loglevel as string);
	}

	// Initialize writer
	ConsoleWriter.init();
	if (isLogLevelEnabled("verbose")) {
		const log = getLogger("cli:middlewares:base");
		log.verbose(`using ui5lint version ${getFormattedVersion()}`);
		log.verbose(`using node version ${process.version}`);
	}
}
