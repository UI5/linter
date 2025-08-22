import ts from "typescript";
import Ui5TypeInfoMatcher from "../Ui5TypeInfoMatcher.js";
import {getUi5TypeInfoFromSymbol} from "../Ui5TypeInfo.js";

let CachedSideEffectFreeApiMatcher: Ui5TypeInfoMatcher<boolean> | undefined;

function getSideEffectFreeApiMatcher(): Ui5TypeInfoMatcher<boolean> {
	if (!CachedSideEffectFreeApiMatcher) {
		const m = new Ui5TypeInfoMatcher<boolean>("sap.ui.core");
		m.declareNamespace("sap", [
			m.namespace("ui", [
				m.function("getCore", true),
			]),
		]);
		m.declareModule("sap/ui/Core", [
			m.class("Core", [
				m.method("getConfiguration", true),
			]),
		]);
		CachedSideEffectFreeApiMatcher = m;
	}
	return CachedSideEffectFreeApiMatcher;
}

export function isSideEffectFree(node: ts.CallExpression, checker: ts.TypeChecker): boolean {
	// Get UI5 Type info for the given node

	const exprType = checker.getTypeAtLocation(node.expression);
	if (!exprType.symbol) {
		return false;
	}
	const ui5TypeInfo = getUi5TypeInfoFromSymbol(exprType.symbol);
	if (!ui5TypeInfo) {
		return false;
	}
	// Check whether the call expression is a side effect free function
	return !!getSideEffectFreeApiMatcher().match(ui5TypeInfo);
}
