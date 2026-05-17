function globalFactory() {}
sap.ui.getCore().attachInit(function () {
	sap.ui.require([], globalFactory);
});
