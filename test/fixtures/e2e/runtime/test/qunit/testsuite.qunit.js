sap.ui.define(() => {
	"use strict";

	return {
		name: "QUnit test suite for UI5 linter autofix",
		defaults: {
			qunit: {
				version: 2
			},
			sinon: {
				version: 4
			}
		},
		tests: {
			"Configuration": {},
			"Globals": {},
			"sap.ui.base.Object": {},
			"jQuery.sap.charToUpperCase": {},
			"jQuery.sap.endsWith": {},
			"jQuery.sap.extend": {},
			"jQuery.sap.getModuleResourcePath": {},
			"jQuery.sap.log": {},
			"jQuery.sap.newObject": {},
			"jQuery.sap.setObject": {},
			"jQuery.sap.startsWith": {},
			"jQuery.sap.pad": {},
			"jQuery.sap.resources": {},

		}
	};
});
