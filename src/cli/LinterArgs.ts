export default interface LinterArgs {
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
