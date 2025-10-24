sap.ui.define([
	"sap/ui/core/Control", "sap/m/Button", "sap/ui/core/webc/WebComponent",
	"sap/uxap/BlockBase", "./NegativeExample1Renderer", "sap/ui/core/mvc/View",
	"sap/ui/core/XMLComposite", "sap/f/cards/loading/PlaceholderBaseRenderer"
], function(Control, Button, WebComponent, BlockBase, NegativeExample1Renderer, View, XMLComposite, PlaceholderBaseRenderer) {

	const NegativeExample1 = Control.extend("sap.ui.demo.linter.controls.NegativeExample1", {
		metadata: {},
		renderer: NegativeExample1Renderer
	});

	const NegativeExample2 = Control.extend("sap.ui.demo.linter.controls.NegativeExample2", {
		metadata: {},
		renderer: null
	});

	const NegativeExample3 = Button.extend("sap.ui.demo.linter.controls.NegativeExample3", {
		metadata: {},
		renderer: undefined
	});

	const NegativeExample7 = Button.extend("sap.ui.demo.linter.controls.NegativeExample7", {
		metadata: {},
		renderer: {
			apiVersion: 2,
			render: function(oRm, oControl) {
			}
		}
	});

	const NegativeExample8 = Button.extend("sap.ui.demo.linter.controls.NegativeExample8", {
		metadata: {},
		renderer: {
			apiVersion: 4,
			render: function(oRm, oControl) {
			}
		}
	});

	// Special cases:

	const NegativeExample9 = View.extend("sap.ui.demo.linter.controls.NegativeExample9", {
		// No deprecation: sap.ui.core.mvc.View inherits from Control, but no renderer must be specified
	});

	const NegativeExample10 = WebComponent.extend("sap.ui.demo.linter.controls.NegativeExample10", {
		metadata: {},
		// No deprecation: Uses sap.ui.core.webc.WebComponentRenderer if no renderer is specified
	});

	const NegativeExample11 = BlockBase.extend("sap.ui.demo.linter.controls.NegativeExample11", {
		metadata: {},
		// No deprecation: Uses sap.uxap.BlockBaseRenderer if no renderer is specified
	});

	const NegativeExample12 = XMLComposite.extend("sap.ui.demo.linter.controls.NegativeExample12", {
		metadata: {},
		// No deprecation: Uses inline renderer of XMLComposite if no renderer is specified
		// Note: XMLComposite itself is deprecated, but there should not be a finding for a missing renderer
	});
	
	const NegativeExample13 = Control.extend("sap.ui.demo.linter.controls.NegativeExample13", {
		metadata: {},
		// No deprecation: sap/f/cards/loading/PlaceholderBaseRenderer
		// is an ambient module, so it should be present in the types,
		// despite that Renderers are usually not present in the ts definitions.
		renderer: PlaceholderBaseRenderer,
	});

});
