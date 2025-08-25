sap.ui.define(["sap/ui/core/mvc/Controller"], function (Controller) {
	"use strict";

	return Controller.extend("ui5.walkthrough.controller.Base", {
		baseEventHandlers: {
			oneLevelDeeper: {
				onPressButton: this.onBaseControllerHandler,
			},
		},

		onBaseControllerHandler: function () {
			// Handler logic
		}
	});
});
