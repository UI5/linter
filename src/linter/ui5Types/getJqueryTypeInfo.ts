import ts from "typescript";
import {Ui5ModuleTypeInfo, Ui5NamespaceTypeInfo, Ui5TypeInfo, Ui5TypeInfoKind} from "./Ui5TypeInfo.js";

export interface JqueryTypeInfo {
	node: ts.AccessExpression | ts.CallExpression;
	ui5TypeInfo: Ui5TypeInfo;
}

export default function getJqueryTypeInfo(node: ts.Node): JqueryTypeInfo | undefined {
	if (!ts.isPropertyAccessExpression(node) && !ts.isElementAccessExpression(node)) {
		// Only PropertyAccessExpressions are supported for jQuery fixes
		return;
	}
	const parts: string[] = [];
	let scanNode: ts.Node = node;

	// Apart from creating the "mocked" UI5 Type Info, we also need to determine the relevant node
	// since the input node will always be "jQuery" or "jQuery.sap"
	let relevantNode: ts.AccessExpression | ts.CallExpression = node;

	// Determine access chain
	// Input node is always something like "jQuery.sap"
	// So we need to search the parents to get the full access chain like "jQuery.sap.log.LogLevel"
	while (ts.isPropertyAccessExpression(scanNode)) {
		if (!ts.isIdentifier(scanNode.name)) {
			throw new Error(
				`Unexpected PropertyAccessExpression node: Expected name to be identifier but got ` +
				ts.SyntaxKind[scanNode.name.kind]);
		}
		parts.push(scanNode.name.text);
		relevantNode = scanNode;
		scanNode = scanNode.parent;
	}

	const moduleType: Ui5ModuleTypeInfo = {
		kind: Ui5TypeInfoKind.Module,
		name: "jQuery",
		library: "jquery",
	};

	let mockedTypeInfo: Ui5NamespaceTypeInfo | undefined;
	for (const part of parts) {
		const newTypeInfo: Ui5NamespaceTypeInfo = {
			kind: Ui5TypeInfoKind.Namespace,
			name: part,
		};
		if (mockedTypeInfo) {
			newTypeInfo.parent = mockedTypeInfo;
		} else {
			newTypeInfo.parent = moduleType;
		}
		mockedTypeInfo = newTypeInfo;
	}

	// At this point, relevantNode is always an access expression
	// However, some fixes require access to the full call expression. Therefore check
	// whether this access expression is part of a call expression and if so, return the call expression
	if (ts.isCallExpression(scanNode) && scanNode.expression === relevantNode) {
		relevantNode = scanNode;
	}
	return {
		ui5TypeInfo: mockedTypeInfo ?? moduleType,
		node: relevantNode,
	};
}
