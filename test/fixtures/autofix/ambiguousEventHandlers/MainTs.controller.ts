import BaseController from "./BaseTs.controller.js";
import type Event from "sap/ui/base/Event";

/**
 * @namespace ui5.walkthrough.controller.MainTs
 */
export default class MainTs extends BaseController {

	public eventHandlers = {
		onPressFancyButton: this.onPressFancyButton.bind(this),
	};

	public onPressFancyButton(oEvent: Event): void {
		console.log("Fancy button pressed", oEvent);
	}

	public onPressFancyButtonArrow = (oEvent: Event): void => {
		console.log("Fancy button pressed from arrow function", oEvent);
	};
}
