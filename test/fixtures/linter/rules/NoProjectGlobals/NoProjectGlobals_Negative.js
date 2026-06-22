sap.ui.define(["com/example/app/utils/Helper"], function(Helper) {
	"use strict";

	// OK: String literals are not property access expressions
	Controller.extend("com.example.app.controller.Main", {});

	// OK: Local variable shadows namespace first segment
	var com = {};
	com.example.app.whatever;

	// OK: Properly imported module
	Helper.doSomething();

	// OK: Allowed globals via window — must not fire no-project-globals for any namespace
	window.sap.ui.require(["my/Module"], function(Module) {});
	window.sap.ui.define(["my/Module"], function(Module) {});
	window.sap.ui.loader.config({async: true});
	window.sap.ui.require.toUrl("my/path");

	// OK: Allowed globals via globalThis — must not fire no-project-globals for any namespace
	globalThis.sap.ui.require(["my/Module"], function(Module) {});
	globalThis.sap.ui.define(["my/Module"], function(Module) {});
	globalThis.sap.ui.loader.config({async: true});
	globalThis.sap.ui.require.toUrl("my/path");

	// OK: Allowed globals via self — must not fire no-project-globals for any namespace
	self.sap.ui.require(["my/Module"], function(Module) {});
	self.sap.ui.define(["my/Module"], function(Module) {});
	self.sap.ui.loader.config({async: true});
});
