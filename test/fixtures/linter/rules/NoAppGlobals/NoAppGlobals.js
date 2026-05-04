sap.ui.define([], function() {
	"use strict";

	// ERROR: App-namespace global access
	com.example.app.utils.Formatter.format();
	var x = com.example.app.model.Config;
	com.example.app.utils.DataService = {};

	// ERROR: Indirect global access via window
	window.com.example.app.utils.Helper.doSomething();
	var y = window.com.example.app.model.Settings;
	window.com.example.app.utils.Registry = {};

	return com.example.app.utils.TestScripts;
});
