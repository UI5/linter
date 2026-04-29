sap.ui.define([], function() {
	"use strict";

	// ERROR: App-namespace global access
	com.example.app.utils.Formatter.format();
	var x = com.example.app.model.Config;
	com.example.app.utils.DataService = {};
	return com.example.app.utils.TestScripts;
});
