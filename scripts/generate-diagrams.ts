#!/usr/bin/env node
/* eslint-disable no-console */
import {execFile, spawn} from "node:child_process";
import {promisify} from "node:util";
import path from "node:path";
import fs from "node:fs/promises";
import {createReadStream, createWriteStream} from "node:fs";
import {pipeline} from "node:stream/promises";

// Promisify exec function
const execFilePromise = promisify(execFile);

// Define task types
type DiagramTask = "high-level" | "folder-level" | "detailed" | "flat";

// Define file paths
const DIAGRAMS_DIR = path.join(process.cwd(), "docs", "diagrams");
const HIGH_LEVEL_DOT = path.join(DIAGRAMS_DIR, "high-level-dependency-graph.dot");
const HIGH_LEVEL_SVG = path.join(DIAGRAMS_DIR, "high-level-dependency-graph.svg");
const HIGH_LEVEL_HTML = path.join(DIAGRAMS_DIR, "high-level-dependency-graph.html");

const FOLDER_LEVEL_DOT = path.join(DIAGRAMS_DIR, "folder-level-dependency-graph.dot");
const FOLDER_LEVEL_SVG = path.join(DIAGRAMS_DIR, "folder-level-dependency-graph.svg");
const FOLDER_LEVEL_HTML = path.join(DIAGRAMS_DIR, "folder-level-dependency-graph.html");

const DETAILED_DOT = path.join(DIAGRAMS_DIR, "dependency-graph.dot");
const DETAILED_SVG = path.join(DIAGRAMS_DIR, "dependency-graph.svg");
const DETAILED_HTML = path.join(DIAGRAMS_DIR, "dependency-graph.html");

const FLAT_DOT = path.join(DIAGRAMS_DIR, "flat-dependency-graph.dot");
const FLAT_SVG = path.join(DIAGRAMS_DIR, "flat-dependency-graph.svg");
const FLAT_HTML = path.join(DIAGRAMS_DIR, "flat-dependency-graph.html");

/**
 * Ensures the diagrams directory exists
 */
async function ensureDiagramsDir(): Promise<void> {
	try {
		await fs.mkdir(DIAGRAMS_DIR, {recursive: true});
	} catch (error) {
		console.error("Error creating diagrams directory:", error);
		throw error;
	}
}

/**
 * Runs the dot command to convert a dot file to SVG
 * @param inputFile - Path to the input dot file
 * @param outputFile - Path to the output SVG file
 */
async function runDotCommand(inputFile: string, outputFile: string): Promise<void> {
	try {
		// Convert absolute paths to paths relative to the working directory for Docker
		const cwd = process.cwd();
		const relativeInputFile = path.relative(cwd, inputFile);
		const relativeOutputFile = path.relative(cwd, outputFile);

		// Verify the dot file exists before running the command
		await fs.access(inputFile);

		const dotArgs = [
			"-T", "svg",
			relativeInputFile,
			"-o",
			relativeOutputFile,
		];

		// Use Docker to run the dot command
		await execFilePromise("docker", [
			"run", "--rm",
			"-v", `${process.cwd()}` + ":/work",
			"-w", "/work",
			"nshine/dot",
			"dot",
			...dotArgs,
		]);
		console.log("Generated SVG:", outputFile);
	} catch (error) {
		console.error("Error running dot command:", error);
		throw error;
	}
}

/**
 * Converts an SVG file to HTML using depcruise-wrap-stream-in-html
 * @param svgFile - Path to the SVG file
 * @param htmlFile - Path to the output HTML file
 */
async function convertSvgToHtml(svgFile: string, htmlFile: string): Promise<void> {
	try {
		// Verify the SVG file exists before processing
		await fs.access(svgFile);

		// Create a writable stream for the output HTML file
		const outputStream = createWriteStream(htmlFile);

		// Spawn the depcruise-wrap-stream-in-html process
		const child = spawn("npx", ["depcruise-wrap-stream-in-html"], {
			stdio: ["pipe", "pipe", "inherit"],
		});

		// Create a promise that resolves when the process exits
		const processExit = new Promise<number>((resolve, reject) => {
			// Set up error handling for the child process
			child.on("error", (err) => {
				reject(new Error(`Failed to spawn depcruise-wrap-stream-in-html: ${err.message}`));
			});
			child.on("close", (code, signal) => {
				if (signal) {
					reject(new Error(
						`Process terminated with signal ${signal} while converting ${svgFile} to ${htmlFile}`
					));
				} else {
					resolve(code ?? 0);
				}
			});
		});

		// Pipe the SVG file directly to the child process
		const inputStream = createReadStream(svgFile);

		// Connect the streams: SVG file -> child process -> HTML file
		await Promise.all([
			pipeline(inputStream, child.stdin).catch((err: Error) => {
				throw new Error(`Error piping SVG to process: ${err.message}`);
			}),
			pipeline(child.stdout, outputStream).catch((err: Error) => {
				throw new Error(`Error piping process output to HTML file: ${err.message}`);
			}),
			processExit.then((code) => {
				if (code !== 0) {
					throw new Error(
						`depcruise-wrap-stream-in-html exited with code ${code} while processing ${svgFile}`
					);
				}
			}),
		]);

		console.log("Generated HTML:", htmlFile);
	} catch (error) {
		console.error(`Error converting SVG to HTML (${svgFile} -> ${htmlFile}):`, error);
		throw error;
	}
}

/**
 * Generates a high-level architecture diagram
 */
async function generateHighLevelDiagram(): Promise<void> {
	try {
		console.log("Generating high-level architecture diagram...");

		// Generate dot file with high-level options
		const {stdout: highLevelOutput} = await execFilePromise("npx", [
			"dependency-cruiser",
			"--output-type", "archi",
			"src",
		]);
		await fs.writeFile(HIGH_LEVEL_DOT, highLevelOutput);

		console.log("Generated dot file:", HIGH_LEVEL_DOT);

		// Convert dot to SVG
		await runDotCommand(HIGH_LEVEL_DOT, HIGH_LEVEL_SVG);

		// Convert SVG to HTML
		await convertSvgToHtml(HIGH_LEVEL_SVG, HIGH_LEVEL_HTML);
	} catch (error) {
		console.error("Error generating high-level diagram:", error);
		throw error;
	}
}

/**
 * Generates a folder-level diagram
 */
async function generateFolderLevelDiagram(): Promise<void> {
	try {
		console.log("Generating folder-level diagram...");

		// Generate dot file with folder-level options (ddot)
		const {stdout: folderLevelOutput} = await execFilePromise("npx", [
			"dependency-cruiser",
			"--output-type", "ddot", // Use ddot for directory dependencies
			"src",
		]);
		await fs.writeFile(FOLDER_LEVEL_DOT, folderLevelOutput);

		console.log("Generated dot file:", FOLDER_LEVEL_DOT);

		// Convert dot to SVG
		await runDotCommand(FOLDER_LEVEL_DOT, FOLDER_LEVEL_SVG);

		// Convert SVG to HTML
		await convertSvgToHtml(FOLDER_LEVEL_SVG, FOLDER_LEVEL_HTML);
	} catch (error) {
		console.error("Error generating folder-level diagram:", error);
		throw error;
	}
}

/**
 * Generates a detailed diagram (same as the current implementation)
 */
async function generateDetailedDiagram(): Promise<void> {
	try {
		console.log("Generating detailed diagram...");

		// Generate dot file (same as diagram:dot script)
		const {stdout: detailedOutput} = await execFilePromise("npx", [
			"dependency-cruiser",
			"--output-type", "dot",
			"src",
		]);
		await fs.writeFile(DETAILED_DOT, detailedOutput);

		console.log("Generated dot file:", DETAILED_DOT);

		// Convert dot to SVG (same as diagram:svg script)
		await runDotCommand(DETAILED_DOT, DETAILED_SVG);

		// Convert SVG to HTML
		await convertSvgToHtml(DETAILED_SVG, DETAILED_HTML);
	} catch (error) {
		console.error("Error generating detailed diagram:", error);
		throw error;
	}
}

async function generateFlatDiagram(): Promise<void> {
	try {
		console.log("Generating flat diagram...");

		// Generate dot file (same as diagram:dot script)
		const {stdout: flatOutput} = await execFilePromise("npx", [
			"dependency-cruiser",
			"--output-type", "flat",
			"src",
		]);
		await fs.writeFile(FLAT_DOT, flatOutput);

		console.log("Generated dot file:", FLAT_DOT);

		// Convert dot to SVG
		await runDotCommand(FLAT_DOT, FLAT_SVG);

		// Convert SVG to HTML
		await convertSvgToHtml(FLAT_SVG, FLAT_HTML);
	} catch (error) {
		console.error("Error generating flat diagram:", error);
		throw error;
	}
}

/**
 * Main function to run the specified tasks
 * @param tasks - Array of tasks to run
 */
async function generateDiagrams(tasks: DiagramTask[] = ["high-level", "folder-level", "detailed", "flat"]): Promise<void> {
	try {
		await ensureDiagramsDir();

		// Run each task sequentially
		for (const task of tasks) {
			switch (task) {
				case "high-level":
					await generateHighLevelDiagram();
					break;
				case "folder-level":
					await generateFolderLevelDiagram();
					break;
				case "detailed":
					await generateDetailedDiagram();
					break;
				case "flat":
					await generateFlatDiagram();
					break;
				default:
					console.warn("Unknown task:", task);
			}
		}

		console.log("All diagrams generated successfully!");
	} catch (error) {
		console.error("Error generating diagrams:", error);
		process.exit(1);
	}
}

/**
 * Parse command line arguments and run the appropriate tasks
 */
async function main(): Promise<void> {
	try {
		const args = process.argv.slice(2);

		if (args.length === 0) {
			// Run all tasks by default
			await generateDiagrams();
		} else {
			// Filter valid tasks
			const validTasks = args.filter((arg): arg is DiagramTask => {
				const isValid = ["high-level", "folder-level", "detailed", "flat"].includes(arg);
				if (!isValid) {
					console.warn("Ignoring unknown task:", arg);
				}
				return isValid;
			});

			if (validTasks.length === 0) {
				console.error("No valid tasks specified. Available tasks: high-level, folder-level, detailed, flat");
				process.exit(1);
			}

			await generateDiagrams(validTasks);
		}
	} catch (error) {
		console.error("Error in main function:", error);
		process.exit(1);
	}
}

// Run the script
await main();
