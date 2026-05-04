sap.ui.define(["com/example/app/utils/Helper"], function(Helper) {
	"use strict";

	// OK: String literals are not property access expressions
	Controller.extend("com.example.app.controller.Main", {});

	// OK: Local variable shadows namespace first segment
	var com = {};
	com.example.app.whatever;

	// OK: Properly imported module
	Helper.doSomething();
});
