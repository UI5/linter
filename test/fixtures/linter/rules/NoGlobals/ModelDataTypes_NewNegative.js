sap.ui.define(
	["sap/m/Input", "sap/ui/model/type/Integer"],
	(Input, Integer) => {
		"use strict";

		const input = new Input({
			value: {
				path: "/names/0/amount",
				type: "sap.ui.model.type.Integer",
				formatOptions: { minIntegerDigits: 3 },
				constraints: { maximum: 1000 },
			},
			// This prop should not be analyzed at all as it's not existent
			// and does not have the 'PropertyBindingInfo' type
			nonExistentProperty: {
				path: "/names/0/amount",
				type: "sap.ui.model.type.Integer",
				formatOptions: { minIntegerDigits: 3 },
				constraints: { maximum: 1000 },
			},
		});

		input.applySettings({
			value: {
				path: "/names/0/amount",
				type: "sap.ui.model.type.Integer",
				formatOptions: { minIntegerDigits: 3 },
				constraints: { maximum: 1000 },
			},
		});

		// With "parts"
		const input2 = new Input({
			value: {
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
			}
		});
	}
);
