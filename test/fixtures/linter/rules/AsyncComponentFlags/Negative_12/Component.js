// Fixture description:
// Manifest v2 with IAsyncContentCreation interface - should do nothing (interface not enforced in v2)
sap.ui.define(["sap/ui/core/UIComponent"], function (UIComponent) {
	"use strict";

	return UIComponent.extend("mycomp.Component", {
		metadata: {
			"interfaces": ["sap.ui.core.IAsyncContentCreation"],
			"manifest": "json",
		},
	});
});
