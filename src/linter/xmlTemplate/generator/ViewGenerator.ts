import AbstractGenerator from "./AbstractGenerator.js";
import {ControlDeclaration} from "../xmlNodes.js";

export default class ViewGenerator extends AbstractGenerator {
	writeRootControl(controlInfo: ControlDeclaration) {
		controlInfo.properties.forEach((attribute) => {
			if (attribute.name === "controllerName") {
				// Outer nodes are visited last, so the controllerName is only known after
				// all controls have been visited. Only then the collected mappings can be added.
				this._controllerByIdInfo.addMappings(attribute.value, this._idToModule);
			}
		});

		this.writeControl(controlInfo, true);
		this._body.write(`export default ${controlInfo.variableName};`);
	}
}
