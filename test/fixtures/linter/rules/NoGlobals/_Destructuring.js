sap.ui.define(
	[
		"sap/ui/core/Control",
		"./library",
		"./core/library",
		"sap/external/thirdparty/library",
		"sap/external2/thirdparty/library",
		"sap/external3/thirdparty/library",
	],
	(
		Control,
		{ MyValidEnum, ThisIsEnumToo: RenamedEnum },
		coreLibrary,
		[ {arrPattern}, {arrWith: {deep: arrPatternDeepDestruct}}],
		{ objPattern: {deeply: {destructured: objPatternDeepDestruct}, objPattern1Lvl} },
		libraryExt
	) => {
		const { AnotherValidEnum } = coreLibrary;
		const { Buzz } = AnotherValidEnum;
		const { AnotherValidEnum: {Buzz: BuzzRenamed} } = coreLibrary;
		const { AnotherValidEnum: AnotherRenamedEnum } = coreLibrary;
		const { H1 } = sap.ui.core.TitleLevel;
		const { Value2: RenamedValue2 } = RenamedEnum;
		const [ {arrPatternVarDef}, {nested: {arrPatternVarDef: arrPatternVarDefNestedAndRenamed}} ] = libraryExt;
	});