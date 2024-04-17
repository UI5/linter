// See https://github.com/SAP/ui5-linter/issues/75
Object.defineProperty(globalThis, "myProp", {
	value: true || window.foo
});
