import anyTest from "ava";
import {resolveLinks} from "../../../../src/formatter/lib/resolveLinks.js";

const test = anyTest;

test("Test links", (t) => {
	const input = [
		"(since 1.120) - Please use {@link sap.ui.core.message.MessageType } instead.",
		"(since 1.119) - Please use {@link sap.ui.core.Lib.getResourceBundleFor Lib.getResourceBundleFor }instead.",
		"(since 1.118) - See {@link module :sap/ui/core/Theming.attachApplied Theming.attachApplied }instead.",
		"(since 1.56) - Use {@link module :sap/ui/VersionInfo.load} instead",
	];
	const expected = [
		"(since 1.120) - Please use sap.ui.core.message.MessageType (https://ui5.sap.com/1.136/#/api/sap.ui.core.message.MessageType) instead.",
		"(since 1.119) - Please use Lib.getResourceBundleFor  (https://ui5.sap.com/1.136/#/api/sap.ui.core.Lib)instead.",
		"(since 1.118) - See Theming.attachApplied (https://ui5.sap.com/1.136/#/api/module:sap/ui/core/Theming%23methods/sap/ui/core/Theming.attachApplied)instead.",
		"(since 1.56) - Use sap/ui/VersionInfo.load (https://ui5.sap.com/1.136/#/api/module:sap/ui/VersionInfo%23methods/sap/ui/VersionInfo.load) instead",
	];

	input.forEach((text, index) => {
		t.is(resolveLinks(text), expected[index], "Correct resolution of links");
	});
});
