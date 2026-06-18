import path, {dirname} from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";
import {FilePattern} from "../linter/LinterContext.js";
const __dirname = dirname(fileURLToPath(import.meta.url));

export interface UI5LintConfigType {
	files?: FilePattern[];
	ignores?: FilePattern[];
	ui5Config?: string;
};

const CONFIG_FILENAMES = [
	"ui5lint.config.js",
	"ui5lint.config.mjs",
	"ui5lint.config.cjs",
];

export default class ConfigManager {
	#projectRootDir: string;
	#configFile: string | null;

	constructor(projectRootDir: string, configFile?: string) {
		if (!projectRootDir) {
			throw Error("Project's root dir is required");
		}
		this.#projectRootDir = projectRootDir;
		this.#configFile = configFile ?? null;
	}

	#resolveModulePaths(fileName: string): string {
		const resolvedPath = path.join(this.#projectRootDir, fileName);
		return pathToFileURL(resolvedPath).toString();
	}

	async getConfiguration(): Promise<UI5LintConfigType> {
		let config = {} as UI5LintConfigType;

		if (this.#configFile) {
			// If it's an relative path, transform to POSIX format
			const configFilePath = this.#resolveModulePaths(this.#configFile);

			({default: config} = await import(configFilePath) as {default: UI5LintConfigType});
		} else {
			// Find configuration file
			// @ts-expect-error If it's not a missing config file we need to propagate the exception
			({default: config} = await Promise.any(
				CONFIG_FILENAMES.map(
					(filename) => {
						// Relative paths are needed to make it work on Windows
						const configFilePath = this.#resolveModulePaths(filename);
						return import(configFilePath) as Promise<{default: UI5LintConfigType}>;
					}))
				// Promise.any would throw if nothing is found i.e. there's no config file
				.catch((errs: {errors: NodeJS.ErrnoException[]}) => {
					const {errors} = errs;
					if (errors?.every((e) => e?.code === "ERR_MODULE_NOT_FOUND")) {
						return {default: {}};
					}

					const errToThrow = errors?.find((e) => e?.code !== "ERR_MODULE_NOT_FOUND");
					if (errToThrow) {
						throw errToThrow;
					}
				}));
		}

		return config;
	}
}
