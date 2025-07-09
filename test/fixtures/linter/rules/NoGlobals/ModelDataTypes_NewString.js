sap.ui.define(["sap/m/Input", "sap/ui/table/RowSettings"], (Input, RowSettings) => {
	const input = new Input({
		value: "{ path: '/names/0/amount', type: 'sap.ui.model.type.Integer' }",
	});

	input.applySettings({
		value: "{ path: '/names/0/amount', type: 'sap.ui.model.type.Integer' }",
	});

	// Note: RowSettings is an element, not a control (bindings are supported for all ManagedObject sub-classes)
	const rowSettings = new RowSettings({
		highlight: "{ path: '/names/0/amount', type: 'sap.ui.model.type.Integer' }",
	});

	rowSettings.applySettings({
		highlight: "{ path: '/names/0/amount', type: 'sap.ui.model.type.Integer' }",
	});

	// With "parts"
	const input2 = new Input({
		value: `{
			parts: [{path: '/amount'}, '/currency'],
			type: 'sap.ui.model.type.Currency',
			formatOptions: {showNumber: false}
		}`
	});
	input2.applySettings({
		value: `{
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
		}`
	});
});
