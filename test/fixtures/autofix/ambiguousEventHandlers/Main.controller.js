sap.ui.define(["./BaseController"], function (BaseController) {
	"use strict";

	return BaseController.extend("ui5.walkthrougth.controller.Main", {
		eventHandlers: {
			onPressFancyButton: this.onPressFancyButton,
		},
		
		onPressFancyButton: function (oEvent) {
			console.log("Fancy button pressed", oEvent);
		},

		onPressFancyButtonArrow: (oEvent) => {
			console.log("Fancy button pressed from arrow function", oEvent);
		},
	});
});
