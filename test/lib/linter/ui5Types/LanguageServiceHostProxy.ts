import test from "ava";
import LanguageServiceHostProxy from "../../../../src/linter/ui5Types/LanguageServiceHostProxy.js";
import ts from "typescript";

test("LanguageServiceHostProxy default implementation - getCompilationSettings", (t) => {
	t.deepEqual(new LanguageServiceHostProxy().getCompilationSettings(), {});
});

test("LanguageServiceHostProxy default implementation - getScriptFileNames", (t) => {
	t.deepEqual(new LanguageServiceHostProxy().getScriptFileNames(), []);
});

test("LanguageServiceHostProxy default implementation - getScriptVersion", (t) => {
	t.is(new LanguageServiceHostProxy().getScriptVersion("/foo"), "0");
});

test("LanguageServiceHostProxy default implementation - getScriptSnapshot", (t) => {
	t.is(new LanguageServiceHostProxy().getScriptSnapshot("/foo"), undefined);
});

test("LanguageServiceHostProxy default implementation - fileExists", (t) => {
	t.is(new LanguageServiceHostProxy().fileExists("/foo"), false);
});

test("LanguageServiceHostProxy default implementation - readFile", (t) => {
	t.is(new LanguageServiceHostProxy().readFile("/foo"), undefined);
});

test("LanguageServiceHostProxy default implementation - getDefaultLibFileName", (t) => {
	t.is(new LanguageServiceHostProxy().getDefaultLibFileName({}), ts.getDefaultLibFileName({}));
});

test("LanguageServiceHostProxy default implementation - getCurrentDirectory", (t) => {
	t.is(new LanguageServiceHostProxy().getCurrentDirectory(), "/");
});
