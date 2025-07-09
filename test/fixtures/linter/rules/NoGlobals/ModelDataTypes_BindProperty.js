sap.ui.define(
	["sap/m/Input"],
	(Input) => {
		"use strict";

		const input = new Input();
		input.bindProperty("value", {
			path: "/age",
			type: "sap.ui.model.type.Integer",
			formatOptions: { minIntegerDigits: 2 },
			constraints: { maximum: 1000 },
		});

		input.bindValue({
			path: "/age",
			type: "sap.ui.model.type.Integer",
			formatOptions: { minIntegerDigits: 2 },
			constraints: { maximum: 1000 },
		});

		// With "parts"
		input.bindProperty("value", {
			parts: [
				{
					path: 'amount',
					type: 'sap.ui.model.type.Integer',
					formatOptions: {
						minIntegerDigits: 3
					},
					constraints: {
						maximum: 1000
					}
				},
				{
					path: 'employees',
					type: 'sap.ui.model.type.Integer'
				},
				'street'
			]
		});
		input.bindValue({
			parts: [
				{
					path: 'amount',
					type: 'sap.ui.model.type.Integer',
					formatOptions: {
						minIntegerDigits: 3
					},
					constraints: {
						maximum: 1000
					}
				},
				{
					path: 'employees',
					type: 'sap.ui.model.type.Integer'
				},
				'street'
			]
		});
	}
);
