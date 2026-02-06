import type { KnipConfig } from 'knip';

const config: KnipConfig = {
	rules: {
		files: "off",
		duplicates: "off",
		classMembers: "off",
		unlisted: "off",
		binaries: "off",
		unresolved: "off",
		catalog: "off",
		exports: "off",
		types: "off",
		enumMembers: "off",
	},

	ignoreDependencies: [
		"@ui5/*",
		"@istanbuljs/esm-loader-hook",
		"ui5-test-runner"
	]
};

export default config;
