import {Resource} from "@ui5/fs";
import ManifestLinter from "./ManifestLinter.js";
import {taskStart} from "../../utils/perf.js";
import {LinterParameters} from "../LinterContext.js";

export default async function lintJson({filePathsWorkspace, context}: LinterParameters) {
	const lintingDone = taskStart("Linting manifest.json files");
	const jsonResources = await filePathsWorkspace.byGlob("**/manifest.json");

	await Promise.all(jsonResources.map(async (resource: Resource) => {
		const linter = new ManifestLinter(resource.getPath(), await resource.getString(), context);
		await linter.lint();
	}));
	lintingDone();
}
