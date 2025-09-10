// Fixture description:
// Inline manifest with malformed structure - should not crash the analyzer
sap.ui.define(["sap/ui/core/UIComponent"], function (UIComponent) {
	"use strict";

	return UIComponent.extend("mycomp.Component", {
		metadata: {
			manifest: {
				// Missing _version and other required properties
				"sap.ui5": {
					"rootView": "invalid_structure"
				}
			}
		}
	});
});
