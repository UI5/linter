import {fileURLToPath} from "node:url";
import {runLintRulesTests} from "../_linterHelper.js";

const filePath = fileURLToPath(import.meta.url);
runLintRulesTests(filePath);
