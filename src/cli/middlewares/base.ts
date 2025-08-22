import {initLogger} from "./logger.js";
import updateNotifier from "./updateNotifier.js";

import type {ArgumentsCamelCase} from "yargs";
import type LinterArgs from "../LinterArgs.js";
/**
 * Base middleware for CLI commands.
 *
 * This middleware should be executed for every CLI command to enable basic features (e.g. logging).
 */
export default async function (argv: ArgumentsCamelCase<LinterArgs>) {
	await initLogger(argv);
	await updateNotifier();
}
