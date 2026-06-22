sap.ui.define(["sap/ui/core/mvc/Controller"],
	function (Controller) {
	"use strict";

	return Controller.extend("my.BaseController", {

		doThings: function() {
			new sap.m.Button(); // ERROR: Global variable "sap"
			cust.lib.helperFunction(); // OK: Global third-party variable

			const mobile = sap.m; // ERROR: Global variable "sap"
			const label = new mobile.Label(); // OK: Local variable

			sap.ui.requireSync(); // ERROR: Global variable "sap"
			window["sap"].ui.requireSync(); // ERROR: Global variable "sap"
			window.sap.ui.requireSync(); // ERROR: Global variable "sap"
			globalThis.sap.ui.requireSync(); // ERROR: Global variable "sap"
			top.sap.ui.requireSync(); // (False-negative) Should be ERROR but TypeScript does not derive UI5 types for top
			parent.sap.ui.requireSync(); // (False-negative) Should be ERROR but TypeScript does not derive UI5 types for parent
			self.sap.ui.requireSync(); // ERROR: Global variable "sap"
			const that = window;
			that.sap.ui.requireSync(); // ERROR: Global variable "sap"
			sap.ui.require(); // OK: Special case sap.ui.require / sap.ui.define
			sap.ui.define(); // OK: Special case sap.ui.require / sap.ui.define
			sap.ui.require.toUrl(); // OK: Special case sap.ui.require / sap.ui.define
			sap.ui.loader.config(); // OK: Special case sap.ui.loader
			window["sap"].ui.require(); // OK: Special case sap.ui.require

			jQuery.ajax(); // ERROR: Global third-party variable "jQuery"
			jQuery("#foo"); // ERROR: Global third-party variable "jQuery"
			jQuery.sap.require(); // ERROR: Global + deprecated variable "jQuery.sap"

			QUnit.test(); // OK: Global third-party variable "QUnit"
		 	QUnit["test"](); // OK: Global third-party variable "QUnit"
			sinon.stub(); // OK: Global third-party variable "sinon"

			sap?.ui?.define(); // OK: Special case sap.ui.define
			self.sap?.ui?.define() // OK: Special case sap.ui.define
			globalThis.sap?.ui?.define() // OK: Special case sap.ui.define
			window.sap?.ui?.define() // OK: Special case sap.ui.define
			top.sap?.ui?.define() // OK: Special case sap.ui.define
			parent.sap?.ui?.define() // OK: Special case sap.ui.define
			Symbol("isProxy"); // OK: Global variable "Symbol"
		}
	});
});
this.sap?.ui?.requireSync() // (False-negative) Should be ERROR but TypeScript does not derive UI5 types for top level this
this.sap?.ui?.define() // OK: Special case sap.ui.define
