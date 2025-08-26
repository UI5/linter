import Controller from "sap/ui/core/mvc/Controller";

/**
 * @namespace ui5.walkthrough.controller
 */
export default class User extends Controller {
	public handlers: { onNestedB: () => void };

	constructor(sName: string) {
		super(sName);
		this.handlers = {
			onNestedB: () => { /* noop */ },
		};
	}

	public onPressFancyButtonB(): void {
		// noop
	}
}
