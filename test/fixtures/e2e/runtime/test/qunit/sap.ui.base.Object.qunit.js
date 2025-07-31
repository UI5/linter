/*global QUnit */
sap.ui.define(["sap/ui/base/Object"], (BaseObject) => {
	"use strict";

	QUnit.module("sap.ui.base.Object");

	QUnit.test("isA", function (assert) {
		var globalBaseObject = sap.ui.base.Object;
		var oHTML = new sap.ui.core.HTML();

		assert.ok(sap.ui.base.Object.isA(oHTML, "sap.ui.core.HTML"));
		assert.ok(globalBaseObject.isA(oHTML, "sap.ui.core.HTML"));
		assert.ok(BaseObject.isA(oHTML, "sap.ui.core.HTML"));
	});
});
