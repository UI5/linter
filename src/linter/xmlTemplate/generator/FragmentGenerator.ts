import AbstractGenerator from "./AbstractGenerator.js";
import {ControlDeclaration, FragmentDefinitionDeclaration, NodeKind} from "../xmlNodes.js";

export default class FragmentGenerator extends AbstractGenerator {
	writeRootControl(controlInfo: ControlDeclaration | FragmentDefinitionDeclaration) {
		let returnVal;

		if (controlInfo.kind === NodeKind.Control) {
			this.writeControl(controlInfo, true);
			returnVal = controlInfo.variableName;
		} else if (controlInfo.kind === NodeKind.FragmentDefinition) {
			const variables = Array.from(controlInfo.controls.values()).map((control) => {
				if (!control.variableName) {
					throw new Error(
						`Control ${control.name} required in fragment definition ` +
						`${controlInfo.name} has no yet been declared`);
				}
				return control.variableName;
			});
			returnVal = `[${variables.join(", ")}]`;
		}

		this._body.writeln(`export default {
    createContent: function () {
        return ${returnVal};
    }
}`);
	}
}
