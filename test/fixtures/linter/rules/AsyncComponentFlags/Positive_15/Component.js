// Fixture description:
// Manifest v1 with async: false in rootView - should trigger MANIFEST_ASYNC_FALSE_ERROR
sap.ui.define(["sap/ui/core/UIComponent"], function (UIComponent) {
	"use strict";

	return UIComponent.extend("mycomp.Component", {
		metadata: {
			manifest: "json",
		},
	});
});
