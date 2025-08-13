import Controller from "sap/ui/core/mvc/Controller";

/**
 * @namespace ui5.walkthrough.controller.BaseTs
 */
export default class BaseTs extends Controller {

	public baseEventHandlers: {
		oneLevelDeeper: {
			onPressButton: () => void;
		};
	};

	constructor(sName: string) {
		super(sName);

		// Initialize after super() to ensure 'this' is properly bound
		this.baseEventHandlers = {
			oneLevelDeeper: {
				onPressButton: this.onBaseControllerHandler.bind(this),
			},
		};
	}

	public onBaseControllerHandler(): void {
		// Handler logic
	}
}
