import Controller from "sap/ui/core/mvc/Controller";

/**
 * @namespace ui5.walkthrough.controller
 */
export default class User extends Controller {
	public handlers: { onNestedA: () => void };

	constructor(sName: string) {
		super(sName);
		this.handlers = {
			onNestedA: () => { /* noop */ },
		};
	}

	public onPressFancyButtonA(): void {
		// noop
	}
}
