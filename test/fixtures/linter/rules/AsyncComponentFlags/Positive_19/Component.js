// Fixture description:
// Inline Manifest v2 with async: false flags (should trigger MANIFEST_ASYNC_FALSE_ERROR)
sap.ui.define(["sap/ui/core/UIComponent"], function (UIComponent) {
	"use strict";

	return UIComponent.extend("mycomp.Component", {
		metadata: {
			"interfaces": ["sap.ui.core.IAsyncContentCreation"],
			manifest: {
				"_version": "1.12.0",
				"sap.app": {
					"id": "mycomp",
					"type": "application"
				},
				"sap.ui5": {
					"rootView": {
						"viewName": "mycomp.view.App",
						"type": "XML",
						"async": false
					},
					"routing": {
						"config": {
							"routerClass": "sap.m.routing.Router",
							"viewType": "XML",
							"async": false
						},
						"routes": [],
						"targets": {}
					}
				}
			}
		}
	});
});
