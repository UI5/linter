import {resolveUniqueName} from "../../ui5Types/utils/utils.js";
import ControllerByIdInfo from "../ControllerByIdInfo.js";
import {
	ControlDeclaration, RequireExpression, Position,
} from "../xmlNodes.js";
import Writer from "./Writer.js";
import path from "node:path/posix";

interface ImportStatement {
	moduleName: string;
	variableName: string;
	start?: Position;
	end?: Position;
}

// TODO: Generate type information to make View#byId() access typed?

export default abstract class AbstractGenerator {
	_imports = new Set<ImportStatement>();
	_variableNames = new Set<string>();
	_body: Writer;
	_idToModule = new Map<string, string>();
	_controllerByIdInfo: ControllerByIdInfo;

	constructor(filePath: string, controllerByIdInfo: ControllerByIdInfo) {
		const fileName = path.basename(filePath, ".xml");
		this._body = new Writer(fileName + ".js", fileName + ".xml");
		this._controllerByIdInfo = controllerByIdInfo;
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	writeRootControl(controlDeclaration: ControlDeclaration) {
		throw new Error("Not implemented");
	}

	writeControl(controlDeclaration: ControlDeclaration, rootControl = false) {
		const importVariableName = this._getUniqueVariableName(controlDeclaration.name);

		const moduleName = controlDeclaration.namespace.replaceAll(".", "/") + `/${controlDeclaration.name}`;

		// Add import
		this._imports.add({
			moduleName,
			variableName: importVariableName,
			start: controlDeclaration.start,
			end: controlDeclaration.end,
		});
		// Generate variable name
		controlDeclaration.variableName = this._getUniqueVariableName(`o${controlDeclaration.name}`);

		// Create the control
		this._writeControlFactoryCall(moduleName, importVariableName, controlDeclaration, rootControl);

		// Write properties
		controlDeclaration.properties.forEach((attribute) => {
			// Add mapping of id to module name so that specific byId lookup for controllers can be generated.
			// This information can only be added to the ControllerByIdInfo once the controllerName is known,
			// which happens last as outer nodes are visited last.
			if (attribute.name === "id") {
				this._idToModule.set(attribute.value, moduleName);
			}

			// TODO: Determine attribute type based on metadata and parse/write value accordingly
			this._body.write(`    `);
			this._body.writeln(
				`${attribute.name}: ${JSON.stringify(attribute.value)},`,
				attribute.start, attribute.end);
		});
		// Write aggregations
		controlDeclaration.aggregations.forEach((aggregationDeclaration, aggregationName) => {
			this._body.write(`    `);
			this._body.write(aggregationName, aggregationDeclaration.start, aggregationDeclaration.end);
			this._body.writeln(`: [`);
			aggregationDeclaration.controls.forEach((control) => {
				if (!control.variableName) {
					throw new Error(
						`Control ${control.name} required in aggregation ` +
						`${aggregationName} of control ${controlDeclaration.name} has no yet been declared`);
				}
				this._body.writeln(`        ${control.variableName},`);
			});
			this._body.writeln(`    ],`);
		});
		this._body.writeln("});\n");
	}

	writeRequire(requireExpression: RequireExpression) {
		requireExpression.declarations.forEach((declaration) => {
			if (!declaration.moduleName) {
				// Module name might be missing, e.g. when a variable is declared via template:alias
				return;
			}
			if (!declaration.variableName) {
				// Side effect require?
				declaration.variableName = "_";
			}
			const variableName = this._getUniqueVariableName(declaration.variableName);
			declaration.variableName = variableName;
			this._imports.add({
				moduleName: declaration.moduleName,
				variableName: variableName,
				start: requireExpression.start,
				end: requireExpression.end,
			});
		});
	}

	getModuleContent() {
		// Sort by import variable name
		const imports = Array.from(this._imports).sort((a, b) => {
			return b.variableName.localeCompare(a.variableName);
		});
		imports.forEach((importStatment) => {
			this._body.prependln(`import ${importStatment.variableName} from "${importStatment.moduleName}";`,
				importStatment.start, importStatment.end);
		});

		return {
			source: this._body.getString(),
			map: JSON.stringify(this._body.getSourceMap()),
		};
	}

	_getUniqueVariableName(variableName: string): string {
		let resolvedName = variableName;
		if (this._variableNames.has(variableName)) {
			resolvedName = resolveUniqueName(variableName, this._variableNames);
		}
		this._variableNames.add(resolvedName);
		return resolvedName;
	}

	_writeControlFactoryCall(
		moduleName: string, importVariableName: string, controlDeclaration: ControlDeclaration, rootControl: boolean
	) {
		this._body.write(`const ${controlDeclaration.variableName} = `);
		if (!rootControl) {
			// Special case: Use View.create for nested views
			if (moduleName === "sap/ui/core/mvc/View") {
				this._body.writeln(
					`await ${importVariableName}.create({`, controlDeclaration.start, controlDeclaration.end
				);
				return;
			}
			// Special case: Use Fragment.load for nested fragments
			if (moduleName === "sap/ui/core/Fragment") {
				this._body.writeln(
					`await ${importVariableName}.load({`, controlDeclaration.start, controlDeclaration.end
				);
				return;
			}
		}
		// Default case: Use new for controls
		this._body.writeln(
			`new ${importVariableName}({`, controlDeclaration.start, controlDeclaration.end
		);
	}
}
