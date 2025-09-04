// Fixture description:
// Component with inline manifest but no UI5 section - should not trigger any async component flags errors
sap.ui.define(["sap/ui/core/UIComponent"], function (UIComponent) {
	"use strict";

	return UIComponent.extend("mycomp.Component", {
		metadata: {
			manifest: {
				"_version": "2.0.0",
				"sap.app": {
					"id": "mycomp",
					"type": "application"
				}
				// No sap.ui5 section
			}
		}
	});
});
