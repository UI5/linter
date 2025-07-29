sap.ui.define([], function() {
	const globalCore = sap.ui.getCore();

	sap.ui.getCore().ready(function() {
	});

	sap.ui.getCore().applyTheme("themeName");
	sap.ui.getCore().applyTheme("customTheme", "find/my/theme/here"); // Should not be autofixed if there is a 2nd argument
	sap.ui.getCore().applyTheme("customTheme", undefined); // Can be autofixed when the 2nd argument is undefined

	sap.ui.getCore().attachInit(function() {console.log();});

	globalCore.attachInitEvent(function() {console.log();});
	sap.ui.getCore().attachInitEvent(function() {console.log();});

	sap.ui.getCore().byFieldGroupId("id");
	sap.ui.getCore().byFieldGroupId(["id", "id2"]);

	globalCore.byId("id");
	sap.ui.getCore().byId("id");

	sap.ui.getCore().createComponent({name: "componentName", url: "find/my/comp/here", id: "id", settings: {"settingsKey": "..."}, component: {}, async: true}); // First argument must be an object containing async: true for autofix to be applied
	globalCore.createComponent({name: "componentName", url: "find/my/comp/here", id: "id", settings: {"settingsKey": "..."}, component: {}}); // Not autofixable
	sap.ui.getCore().createComponent("componentName", "find/my/comp/here", "id", {"settingsKey": "..."}); // First argument is a string (not autofixable)

	sap.ui.getCore().attachIntervalTimer(function() {
		sap.ui.getCore().applyTheme("themeName");
	});
	globalCore.attachIntervalTimer(function() {}, {}); // Should not be autofixed if there is a 2nd argument
	sap.ui.getCore().detachIntervalTimer(function() {
		sap.ui.getCore().applyTheme("themeName");
	});
	globalCore.detachIntervalTimer(function() {console.log();}, {}); // Should not be autofixed if there is a 2nd argument

	globalCore.getComponent("componentId");
	sap.ui.getCore().getComponent("componentId");

	sap.ui.getCore().getControl("controlId");

	globalCore.getCurrentFocusedControlId();
	sap.ui.getCore().getCurrentFocusedControlId();

	sap.ui.getCore().getElementById("elementId");

	globalCore.getEventBus();
	sap.ui.getCore().getEventBus();

	sap.ui.getCore().getLibraryResourceBundle("sap.ui.core", "en_US");
	sap.ui.getCore().getLibraryResourceBundle(); // Should fall back to "sap.ui.core"
	globalCore.getLibraryResourceBundle("unknown.lib"); // Do not migrate unknown libraries
	sap.ui.getCore().getLibraryResourceBundle(true); // bAsync is true (not autofixable)
	globalCore.getLibraryResourceBundle("sap.ui.core", true); // bAsync is true (not autofixable)
	sap.ui.getCore().getLibraryResourceBundle("sap.ui.core", "en_US", true); // bAsync is true (not autofixable)

	globalCore.getStaticAreaRef();
	sap.ui.getCore().getStaticAreaRef();

	sap.ui.getCore().initLibrary({
		version: "1.0.0",
		name: "sap.ui.core",
		dependencies: ["sap.ui.core"],
		types: ["type1", "type2"],
		interfaces: ["interface1", "interface2"],
		controls: ["control1", "control2"],
		elements: ["element1", "element2"],
		noLibraryCSS: true,
		extensions: {
			someExtension: {}
		}
	});

	globalCore.isMobile();
	sap.ui.getCore().isMobile();

	globalCore.isStaticAreaRef(oDomRef);
	sap.ui.getCore().isStaticAreaRef(oDomRef);

	sap.ui.getCore().loadLibrary("sap.ui.core", true);
	sap.ui.getCore().loadLibrary("sap.ui.core", {async: true, url: "find/my/lib/here"});
	sap.ui.getCore().loadLibrary("sap.ui.core", {async: false, url: "find/my/lib/here"}); // async: false (not autofixable)
	globalCore.loadLibrary("sap.ui.core", {url: "find/my/lib/here"}); // async omitted (not autofixable)
	sap.ui.getCore().loadLibrary("sap.ui.core", "find/my/lib/here"); // async omitted (not autofixable)
	globalCore.loadLibrary("sap.ui.core"); // async omitted (not autofixable)

	globalCore.notifyContentDensityChanged();
	sap.ui.getCore().notifyContentDensityChanged();
	
	var globalBaseObject = sap.ui.base.Object;
	var Button = new sap.m.Button({
		text: "Button",
		press: function() {
			console.log("Button pressed");
		}
	});
	sap.ui.base.Object.isA(Button, "sap.m.Button");
	globalBaseObject.isA(Button, "sap.m.Button");
});
