sap.ui.define(
	["sap/m/Input", "ui5/walkthrough/model/formatter"],
  	(Input, formatter) => {
		// Should be detected as "unsupported-api-usage" (formatter is a string):
		const input = new Input({
			value: { path: 'invoice>Status', formatter: 'formatter.statusText' }
		});
		// With "parts": Should be detected as "unsupported-api-usage" (formatter is a string):
		const input2 = new Input({
			value: {
				parts: [{ path: 'invoice>Status', formatter: 'formatter.statusText'}]
			}
		});

		// Should NOT be detected:
		const input3 = new Input({
			value: { path: 'invoice>Status', formatter: formatter.statusText }
		});
	}
);
