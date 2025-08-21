import {Resource} from "@ui5/fs";
import {LinterParameters} from "../LinterContext.js";
import {MESSAGE} from "../messages.js";

const deprecatedViewFileTypes = [
	".view.json",
	".view.html",
	".view.tmpl",
	".fragment.html",
];

export default async function lintFileTypes({filePathsWorkspace, context}: LinterParameters) {
	const potentialDeprecatedResources =
			await filePathsWorkspace.byGlob(`**/{${deprecatedViewFileTypes.map((type) => `*${type}`).join(",")}}`);

	potentialDeprecatedResources.forEach((resource: Resource) => {
		const fileSuffix = resource.getPath().split(".").pop()!.toUpperCase();
		context.addLintingMessage(resource.getPath(), {id: MESSAGE.DEPRECATED_VIEW_TYPE, args: {viewType: fileSuffix}});
	});
}
