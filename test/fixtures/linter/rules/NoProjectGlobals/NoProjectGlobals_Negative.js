sap.ui.define(["com/example/app/utils/Helper"], function(Helper) {
	"use strict";

	// OK: String literals are not property access expressions
	Controller.extend("com.example.app.controller.Main", {});

	// OK: Local variable shadows namespace first segment
	var com = {};
	com.example.app.whatever;

	// OK: Properly imported module
	Helper.doSomething();

	// OK: Allowed globals accessed via globalThis prefix
	globalThis.sap.ui.require(["my/Module"], function(Module) {});
	globalThis.sap.ui.define(["my/Module"], function(Module) {});
	globalThis.sap.ui.loader.config({async: true});
	globalThis.sap.ui.require.toUrl("my/path");

	// OK: Allowed globals via globalThis with optional chaining (real-world pattern from openui5 loader tests)
	globalThis.sap?.ui?.loader?.config({amd: true});
	globalThis.sap?.ui?.loader.config({async: true});

	// OK: Allowed globals accessed via window prefix
	window.sap.ui.require(["my/Module"], function(Module) {});
	window.sap.ui.define(["my/Module"], function(Module) {});
	window.sap.ui.loader.config({async: true});
	window.sap.ui.require.toUrl("my/path");

	// OK: Allowed globals via self (globalThis alias) with optional chaining (real-world pattern from Resources.js)
	if (typeof self.sap?.ui?.define === "function") {}
	self.sap.ui.require(["my/Module"], function(Module) {});
});
