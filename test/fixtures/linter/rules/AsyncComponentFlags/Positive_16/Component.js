// Fixture description:
// Manifest v2 with async: false in routing.config - should trigger MANIFEST_ASYNC_FALSE_ERROR
sap.ui.define(["sap/ui/core/UIComponent"], function (UIComponent) {
	"use strict";

	return UIComponent.extend("mycomp.Component", {
		metadata: {
			manifest: "json",
		},
	});
});
