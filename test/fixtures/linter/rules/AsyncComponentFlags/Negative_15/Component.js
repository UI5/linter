// Fixture description:
// Inline Manifest v2 with IAsyncContentCreation interface and async: true flags - should be valid (no errors)
sap.ui.define(["sap/ui/core/UIComponent"], function (UIComponent) {
	"use strict";

	return UIComponent.extend("mycomp.Component", {
		metadata: {
			interfaces: ["sap.ui.core.IAsyncContentCreation"],
			manifest: {
				"_version": "2.0.0",
				"sap.app": {
					"id": "mycomp",
					"type": "application"
				},
				"sap.ui5": {
					"minUI5Version": "1.60.0",
					"rootView": {
						"viewName": "mycomp.view.App",
						"type": "XML",
						"id": "app",
						"async": true
					},
					"routing": {
						"config": {
							"routerClass": "sap.m.routing.Router",
							"viewType": "XML",
							"viewPath": "mycomp.view",
							"controlId": "app",
							"controlAggregation": "pages",
							"async": true
						},
						"routes": [
							{
								"pattern": "",
								"name": "main",
								"target": "main"
							}
						],
						"targets": {
							"main": {
								"viewId": "main",
								"viewName": "Main"
							}
						}
					}
				}
			}
		}
	});
});
