sap.ui.define([], function() {
	"use strict";

	// ERROR: App-namespace global access (fires for com/example/app namespace)
	com.example.app.utils.Formatter.format();
	var x = com.example.app.model.Config;
	com.example.app.utils.DataService = {};

	// ERROR: Indirect global access via window (fires for com/example/app namespace)
	window.com.example.app.utils.Helper.doSomething();
	var y = window.com.example.app.model.Settings;
	window.com.example.app.utils.Registry = {};

	// ERROR: Indirect global access via globalThis (fires for com/example/app namespace)
	globalThis.com.example.app.utils.Helper.doSomething();
	var z = globalThis.com.example.app.model.Settings;
	globalThis.com.example.app.utils.Registry = {};

	return com.example.app.utils.TestScripts;
});
