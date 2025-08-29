// Fixture description:
// Manifest v2 with async: true in rootView - should trigger MANIFEST_V2_ASYNC_FLAG_ERROR
sap.ui.define(["sap/ui/core/UIComponent"], function (UIComponent) {
	"use strict";

	return UIComponent.extend("mycomp.Component", {
		metadata: {
			manifest: "json",
		},
	});
});
