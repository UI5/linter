# Changelog

## [1.20.1](https://github.com/UI5/linter/compare/v1.20.0...v1.20.1) (2025-09-18)


### Bug Fixes

* Handle correctly transpilation exception of UnsafeNodeRemoval ([#870](https://github.com/UI5/linter/issues/870)) ([5a61cb0](https://github.com/UI5/linter/commit/5a61cb0953a1c92816b508b9e64fd3a2022d22d6))


### Dependencies

* Bump @ui5/fs from 4.0.1 to 4.0.2 ([674b8fb](https://github.com/UI5/linter/commit/674b8fbcc80baff3612577b46dadd5f39dded889))
* Bump @ui5/project from 4.0.4 to 4.0.5 ([e1e95ff](https://github.com/UI5/linter/commit/e1e95ff400a7b079a9ccdc0925fb25b5f485ad31))

## [1.20.0](https://github.com/UI5/linter/compare/v1.19.0...v1.20.0) (2025-09-11)


### Features

* Consider UI5 Manifest v2 ([#780](https://github.com/UI5/linter/issues/780)) ([d29801d](https://github.com/UI5/linter/commit/d29801da8ac2534343c2368f3f8bf95aa4e92d56))


### Bug Fixes

* Ensure deterministic order of processing source files ([#842](https://github.com/UI5/linter/issues/842)) ([dcf884d](https://github.com/UI5/linter/commit/dcf884db5b30b1e36b3f02afd34d89416d5a2281))


### Dependencies

* Bump @jridgewell/trace-mapping from 0.3.30 to 0.3.31 ([48a9a4b](https://github.com/UI5/linter/commit/48a9a4bd2586bc400f52f3487994e9cb4d4c7311))
* Bump @sapui5/types from 1.136.7 to 1.136.8 ([#850](https://github.com/UI5/linter/issues/850)) ([3a07ad8](https://github.com/UI5/linter/commit/3a07ad8181d4d6633f03b24824033e4f9bf701bc))
* Bump chalk from 5.6.0 to 5.6.2 ([94639e0](https://github.com/UI5/linter/commit/94639e0dadf143e10a19097f70f20313689911da))
* Bump globals from 16.3.0 to 16.4.0 ([9f3c522](https://github.com/UI5/linter/commit/9f3c522dd9b9b08095d7d79f7f76f45d1835d771))
* Bump magic-string from 0.30.18 to 0.30.19 ([7ed2b58](https://github.com/UI5/linter/commit/7ed2b58c46abee4f7062e50d3f1ff07b1ac9b755))

## [1.19.0](https://github.com/UI5/linter/compare/v1.18.1...v1.19.0) (2025-08-28)


### Features

* **autofix:** Remove 'synchronizationMode' from manifest.json ([#833](https://github.com/UI5/linter/issues/833)) ([b751244](https://github.com/UI5/linter/commit/b751244c3a59d77060f8fa7c9233b5162c0f7829))
* **autofix:** Remove empty 'sap.ui5/resources/js' from manifest.json ([c894fc7](https://github.com/UI5/linter/commit/c894fc77a5fd202fedd7ab2d4bcae83236ab3345))
* Offer migration functionality to recommended event handler notation ([#804](https://github.com/UI5/linter/issues/804)) ([954754c](https://github.com/UI5/linter/commit/954754c94bfe9dc940146cc1d0401d9b8d4aea4e))


### Dependencies

* Bump sax-wasm from 3.1.1 to 3.1.2 ([8f2302d](https://github.com/UI5/linter/commit/8f2302d396efc6b653f0e5d5b4b820dc209551e3))

## [1.18.1](https://github.com/UI5/linter/compare/v1.18.0...v1.18.1) (2025-08-22)


### Bug Fixes

* **Bootstrap attributes:** Evaluate compat-version + attribute aliases ([#824](https://github.com/UI5/linter/issues/824)) ([4e3563d](https://github.com/UI5/linter/commit/4e3563dfe1b8d1e10c5eb810744196ce49a4ac3a))


### Dependencies

* Bump @sapui5/types from 1.136.6 to 1.136.7 ([9b03d9e](https://github.com/UI5/linter/commit/9b03d9e0e85cbe52e8e795f80ce57d9cba6e26aa))
* Bump magic-string from 0.30.17 to 0.30.18 ([12bb6b0](https://github.com/UI5/linter/commit/12bb6b03c5bcdc300a06ab35b48dfafec65b201f))

## [1.18.0](https://github.com/UI5/linter/compare/v1.17.0...v1.18.0) (2025-08-19)


### Features

* **autofix:** Fix UI5 Bootstrap Parameters in HTML ([#779](https://github.com/UI5/linter/issues/779)) ([ee05a3a](https://github.com/UI5/linter/commit/ee05a3afc929d2667297965da5659840764b13cc))
* Offer autofix for deprecated sap/ui/base/Object.isA API ([#796](https://github.com/UI5/linter/issues/796)) ([315e334](https://github.com/UI5/linter/commit/315e334b5ac342a7fecb4d352e20f46e1db7250b))


### Dependencies

* Bump @jridgewell/sourcemap-codec from 1.5.4 to 1.5.5 ([101e0f5](https://github.com/UI5/linter/commit/101e0f501ed240260ec5633978f19500eef33d15))
* Bump @jridgewell/trace-mapping from 0.3.29 to 0.3.30 ([fe6638c](https://github.com/UI5/linter/commit/fe6638cb5bc147a2180848eca24a15b693542170))
* Bump @sapui5/types from 1.136.3 to 1.136.6 ([6d295d3](https://github.com/UI5/linter/commit/6d295d3cfa6a5d213e5bf60b440cc9a463d6be24))
* Bump chalk from 5.4.1 to 5.5.0 ([33450ad](https://github.com/UI5/linter/commit/33450ad102b94025dd1ba4e9ba272e190086d8e8))
* Bump chalk from 5.5.0 to 5.6.0 ([94df61f](https://github.com/UI5/linter/commit/94df61f731a8564f97bc60a1e31137cce65b704f))
* Bump sax-wasm from 3.0.10 to 3.0.11 ([d4025d8](https://github.com/UI5/linter/commit/d4025d8ef32c04f65e2a8c2a7e2630f3c079abdd))
* Bump sax-wasm from 3.0.11 to 3.0.12 ([9eaeea3](https://github.com/UI5/linter/commit/9eaeea3c344cd3ebf4fa65573d31c71b4cb24f63))
* Bump sax-wasm from 3.0.12 to 3.1.0 ([c34bc53](https://github.com/UI5/linter/commit/c34bc53b9db9f16200e22861412681e915ea7eb6))
* Bump sax-wasm from 3.0.8 to 3.0.9 ([4b45c03](https://github.com/UI5/linter/commit/4b45c0336ded3c53057a918deeb9c2b5044ffd3e))
* Bump sax-wasm from 3.0.9 to 3.0.10 ([9c11249](https://github.com/UI5/linter/commit/9c112496f0df53b1e6973bf3df32b1876fc12c1a))
* Bump sax-wasm from 3.1.0 to 3.1.1 ([ca7cb9d](https://github.com/UI5/linter/commit/ca7cb9dda65bc7eec0dd3e4d2695af3bd758fd59))
* Bump typescript from 5.8.3 to 5.9.2 ([d234126](https://github.com/UI5/linter/commit/d234126c7ce5e62b8713bf1f1ef057c932b0fa11))

## [1.17.0](https://github.com/UI5/linter/compare/v1.16.1...v1.17.0) (2025-07-22)


### Features

* Add html linter output ([8f0d631](https://github.com/UI5/linter/commit/8f0d63190d189df695c2124d6cefc1d0ad10c87b))
* **binding:** Add detection for composite bindings (parts) in code ([#762](https://github.com/UI5/linter/issues/762)) ([9702009](https://github.com/UI5/linter/commit/970200900833a635e53c9ef7ccb2ef57774d240f))
* Export 'Ui5TypeInfoMatcher' module ([ccae857](https://github.com/UI5/linter/commit/ccae857ae7dfac2ad3fc01ec17bfabee9215b213))


### Bug Fixes

* **autofix:** Do not add cyclic deps in framework modules ([a22b117](https://github.com/UI5/linter/commit/a22b11707079b830c0c4c87c6a3cc2361d5e07eb))


### Dependencies

* Bump @sapui5/types from 1.136.2 to 1.136.3 ([c2a03bf](https://github.com/UI5/linter/commit/c2a03bf55c39b7d436fc5550f88db851ad53fdf8))
* Bump sax-wasm from 3.0.6 to 3.0.8 ([733b6b3](https://github.com/UI5/linter/commit/733b6b3998efed2258a77dad5e6207c59d9d8d80))

## [1.16.1](https://github.com/UI5/linter/compare/v1.16.0...v1.16.1) (2025-07-08)


### Bug Fixes

* Update links to latest LTS version 1.136 ([e0eac12](https://github.com/UI5/linter/commit/e0eac1292794a1f89d2ffa2cb9249a77aa9bca28))

## [1.16.0](https://github.com/UI5/linter/compare/v1.15.0...v1.16.0) (2025-07-03)


### Dependencies

* Bump @sapui5/types from 1.120.32 to 1.136.2 ([#751](https://github.com/UI5/linter/issues/751)) ([4b4944a](https://github.com/UI5/linter/commit/4b4944ac442b52644bc14f361f6aeddf7f2befa7))

## [1.15.0](https://github.com/UI5/linter/compare/v1.14.0...v1.15.0) (2025-07-02)


### Features

* **autofix:** Fix deprecated module import for 'sap/ui/core/Configuration' ([007d42b](https://github.com/UI5/linter/commit/007d42bbd10784cb64d1ddb39b705f010c2f8244))
* **autofix:** Fix global 'sap.ui.getCore()' ([7caa612](https://github.com/UI5/linter/commit/7caa612687a890e3422c528bc5ccc233f9515ebf))


### Bug Fixes

* Show plural form for fatal errors only in case more than 1 fatal error occurs ([a13240e](https://github.com/UI5/linter/commit/a13240e873709f0e138b1fb730f3ea54a05ca94d))


### Dependencies

* Bump @jridgewell/sourcemap-codec from 1.5.0 to 1.5.1 ([e4f0460](https://github.com/UI5/linter/commit/e4f0460f2b7adbba998e9124b9595dec85b12c0f))
* Bump @jridgewell/sourcemap-codec from 1.5.1 to 1.5.3 ([aca80c3](https://github.com/UI5/linter/commit/aca80c30c6f28f0a6b0d35d35840dae8eb0ee5c8))
* Bump @jridgewell/trace-mapping from 0.3.25 to 0.3.26 ([071fb17](https://github.com/UI5/linter/commit/071fb1724b10062554dc30cbb9ad672eddcdf4a3))
* Bump @jridgewell/trace-mapping from 0.3.26 to 0.3.28 ([c115c94](https://github.com/UI5/linter/commit/c115c94a35b8931bc5386ae6d57224daa087d6bf))
* Bump @jridgewell/trace-mapping from 0.3.28 to 0.3.29 ([4c761be](https://github.com/UI5/linter/commit/4c761be767fcd3d87c40d81a7c3ba8cb359c97b7))
* Bump globals from 16.2.0 to 16.3.0 ([6aeeeec](https://github.com/UI5/linter/commit/6aeeeec04a54009c19810f0375087bd5afc3fb59))

## [1.14.0](https://github.com/UI5/linter/compare/v1.13.1...v1.14.0) (2025-06-27)


### Features

* **autofix:** Fix deprecated sap/ui/core/Core APIs
	* [#639](https://github.com/UI5/linter/issues/639) ([af2cb9b](https://github.com/UI5/linter/commit/af2cb9bfa13463037538411eedcd5281e0cab741))
	* [#671](https://github.com/UI5/linter/issues/671) ([857a03e](https://github.com/UI5/linter/commit/857a03ea35d698f24b2d7181e437e692abedcaac))
	* [#675](https://github.com/UI5/linter/issues/675) ([b89c980](https://github.com/UI5/linter/commit/b89c9801483d0335d70519b7b27276b5c4619b6f))
* **autofix:** Fix deprecated sap/ui/core/Configuration APIs ([372d80b](https://github.com/UI5/linter/commit/372d80bd3e3fc21147313ee7d98fca81b8e1f6f0))
* **autofix:** Fix deprecated jQuery.sap APIs
	* [#614](https://github.com/UI5/linter/issues/614) ([1dda012](https://github.com/UI5/linter/commit/1dda01216deb7dec8c3dd1dd83712ce5166172f3))
	* [#710](https://github.com/UI5/linter/issues/710) ([f1dfd8a](https://github.com/UI5/linter/commit/f1dfd8a3227380a889ddc3796b0834917bf76e01))
* **autofix:** Fix deprecated property assignments ([#711](https://github.com/UI5/linter/pull/711))
* **cli:** Add 'quiet' option to report errors only ([#629](https://github.com/UI5/linter/issues/629)) ([6c94b01](https://github.com/UI5/linter/commit/6c94b01bcbebbba7962256b37153d19bda1f2cfe))


### Bug Fixes

* **autofix:** Prevent invalid delete expressions ([3f3c720](https://github.com/UI5/linter/commit/3f3c7207e1eefd03e417987c55224c4d817ef81d))
* **SourceFileLinter:** Remove double quote ([e7cabcb](https://github.com/UI5/linter/commit/e7cabcb76e2e677398f4153042f5342a8d384206))
* TypeScript error "Cannot find module './MessageArgs.js'" ([08ff3e5](https://github.com/UI5/linter/commit/08ff3e52f4b9080ed66c7bcfe51071da31c2d23f))


### Dependencies

* Bump @sapui5/types from 1.120.31 to 1.120.32 ([#730](https://github.com/UI5/linter/issues/730)) ([3f3736d](https://github.com/UI5/linter/commit/3f3736d4551ce292c516f5a1f720791379643d43))
* Bump globals from 16.1.0 to 16.2.0 ([22bbfe3](https://github.com/UI5/linter/commit/22bbfe34bb9d76861f07b3843c59d157e8b00ab4))
* Bump minimatch from 10.0.2 to 10.0.3 ([cf82d1e](https://github.com/UI5/linter/commit/cf82d1e188c13f47ac74f02b1e764e0548c4fe52))


## [1.13.1](https://github.com/UI5/linter/compare/v1.13.0...v1.13.1) (2025-05-12)


### Bug Fixes

* **autofix:** Do not fix global access of Core module ([#641](https://github.com/UI5/linter/issues/641)) ([cfb5886](https://github.com/UI5/linter/commit/cfb588673a40256c2d8bdd979fb413eefca63971))


### Dependencies

* Bump @sapui5/types from 1.120.29 to 1.120.30 ([509382f](https://github.com/UI5/linter/commit/509382f00439e1800c44fa0bd6a934354392c451))
* Bump globals from 16.0.0 to 16.1.0 ([6293fcc](https://github.com/UI5/linter/commit/6293fcc285f4b873f82544fe765b0cdc63ae21ba))

## [1.13.0](https://github.com/UI5/linter/compare/v1.12.0...v1.13.0) (2025-04-16)


### Features

* **directives:** Add ui5lint-disable directives for XML, YAML and HTML ([#623](https://github.com/UI5/linter/issues/623)) ([fd20d12](https://github.com/UI5/linter/commit/fd20d1239874ac49928473e0134fffa35880e237))


### Performance Improvements

* Improve lazy loading of TypeScript definitions ([492cbf8](https://github.com/UI5/linter/commit/492cbf834732878bfba45ab98fe9094fe74b29ba))


### Dependencies

* Bump @sapui5/types to 1.120.29 ([6c36d4d](https://github.com/UI5/linter/commit/6c36d4db52e67d6f0d57687195ba02b348af1a1f))

## [1.12.0](https://github.com/UI5/linter/compare/v1.11.0...v1.12.0) (2025-03-18)


### Features

* **Autofix:** UI5 globals ([#572](https://github.com/UI5/linter/issues/572)) ([2a9daac](https://github.com/UI5/linter/commit/2a9daac768d966f2329aa9b73feb78a9bbcb4903))


### Bug Fixes

* Cannot read properties of undefined (reading 'map') ([28ab574](https://github.com/UI5/linter/commit/28ab574098c4c7f203f3233ee7ff43ac19edd239))
* Detect outdated notation for bootstrap attribute log-level ([#603](https://github.com/UI5/linter/issues/603)) ([4fb76f8](https://github.com/UI5/linter/commit/4fb76f80d6bfce2f99cdb3789aa7aacb63d516e2))
* Suppress eslint finding ([93acfff](https://github.com/UI5/linter/commit/93acfff839e2ed7a70f81eb39fe13168eaef364c))


### Performance Improvements

* Prevent unnecessary TypeScript libReplacement lookup ([dac9f88](https://github.com/UI5/linter/commit/dac9f883acc513415ac24b17d102298e98e9eed0))


### Dependencies

* Bump typescript from 5.7.3 to 5.8.2 ([ed84349](https://github.com/UI5/linter/commit/ed843499b5f9f5f3dc2b9e979f31862a2afc357b))

## [1.11.0](https://github.com/UI5/linter/compare/v1.10.0...v1.11.0) (2025-02-28)


### Features

* Check all attributes for bindings in XML ([3c6cfc4](https://github.com/UI5/linter/commit/3c6cfc4fb57d1e6c8d298dad72fb4e09d41bacdd))


### Bug Fixes

* **amdTranspiler:** Ensure correct line information ([dd2d09f](https://github.com/UI5/linter/commit/dd2d09fc2855a01838912dd904573bcf700375cf))
* False-positives for event handlers in XML ([#559](https://github.com/UI5/linter/issues/559)) ([0ed0068](https://github.com/UI5/linter/commit/0ed0068652dee7765c394528bda46cfcacbad05d))
* Improve deprecated function message ([ecda17e](https://github.com/UI5/linter/commit/ecda17e09800123e1d9bdb83bd15cb4a682fcab1))
* Improve extraction of inline XML ([#547](https://github.com/UI5/linter/issues/547)) ([c1336a4](https://github.com/UI5/linter/commit/c1336a456a7af1acb30eb15d3615e1ebba1e69bb))
* XML namespace handling ([4be9fde](https://github.com/UI5/linter/commit/4be9fde5b2685c8dad4210aa880195a4bb5b3485))

## [1.10.0](https://github.com/UI5/linter/compare/v1.9.0...v1.10.0) (2025-02-25)


### Features

* Add UI5LinterEngine ([#551](https://github.com/UI5/linter/issues/551)) ([1a44868](https://github.com/UI5/linter/commit/1a44868d30343603e03d93f02a78597ca7758ab9))


### Bug Fixes

* Check bindings of all ManagedObject subclasses ([5435623](https://github.com/UI5/linter/commit/543562396267dcdb22b42cf6919f1eabba3a5e18))
* False-positives for requestCurrencyCodes/requestUnitsOfMeasure ([24f6ea7](https://github.com/UI5/linter/commit/24f6ea70d1c78d2a75eedfc537f521bc3b7e3ccd))
* Improve deprecation detection ([f1719f0](https://github.com/UI5/linter/commit/f1719f01e6253beae914e95fb17f0fcb072078cb))
* Valid Js syntax after XML transpilation ([#552](https://github.com/UI5/linter/issues/552)) ([98b89d5](https://github.com/UI5/linter/commit/98b89d599f4604d2e4a51f02f0f9c2f5effe5910))


### Dependencies

* Bump sax-wasm from 3.0.4 to 3.0.5 ([79e0549](https://github.com/UI5/linter/commit/79e05496e9263e01da02026fd84dea4eb2c7d044))

## [1.9.0](https://github.com/UI5/linter/compare/v1.8.0...v1.9.0) (2025-02-17)


### Features

* Add global detection for XML Templating ([45729a0](https://github.com/UI5/linter/commit/45729a06675a7b0800ee70decefe115d440288d4))
* **binding:** Add detection for composite bindings (parts) ([#541](https://github.com/UI5/linter/issues/541)) ([561d482](https://github.com/UI5/linter/commit/561d482dbbdaef849a53ed33df9af2ab9c353d03))
* Check event handlers in XML views/fragments ([57d8251](https://github.com/UI5/linter/commit/57d825155ab1473cd38c85b7e3f7cf531de673cb))
* Detect inline XML fragments & views ([#519](https://github.com/UI5/linter/issues/519)) ([e85ad26](https://github.com/UI5/linter/commit/e85ad26ce96c8e4dc9ae124de01a3a20624ce41c))
* Detect legacy template:require (space-separated list) ([76394f8](https://github.com/UI5/linter/commit/76394f8523e575b5a93333762f39a1da30403eba))
* OData implicit globals detection (JS/TS) ([#533](https://github.com/UI5/linter/issues/533)) ([257d005](https://github.com/UI5/linter/commit/257d0055ecefc46949713586ced54f437618fdc8))


### Bug Fixes

* **formatter:** Remove duplicate findings ([d240b4a](https://github.com/UI5/linter/commit/d240b4a31e3ac337fb93cc8280b61fc57e647f54))
* Handle relative imports within framework libs ([b063e4d](https://github.com/UI5/linter/commit/b063e4d645c7e3196a2e2bf6bbbe39fde3e5785f))
* Prevent false-positive "prefer-test-starter" in testsuite (follow-up) ([45edfe0](https://github.com/UI5/linter/commit/45edfe0d02314f315c5c85ed32061f02a4e14886))


### Dependencies

* Bump @sapui5/types to 1.120.26 ([fbb5016](https://github.com/UI5/linter/commit/fbb5016fd92c3d96dd46f24ff4733614d2c329bf))

## [1.8.0](https://github.com/UI5/linter/compare/v1.7.0...v1.8.0) (2025-01-31)


### Features

* **binding:** Detect global formatter notation in bindings ([0845caf](https://github.com/UI5/linter/commit/0845cafbbfc2daebfdf6d821cb0703c34e9c01c3))
* **binding:** Detect more globals in property- and aggregation bindings ([406f6f5](https://github.com/UI5/linter/commit/406f6f5872c279257a4584d04e68d22385f052fb))
* Detection for UI5 Model Data Types ([#480](https://github.com/UI5/linter/issues/480)) ([572db29](https://github.com/UI5/linter/commit/572db294f149c304d2cf2df7c09501f491709c58))
* **Formatter:** Detect globals and strings of formatters in bindings (JS/TS) ([#499](https://github.com/UI5/linter/issues/499)) ([291ffed](https://github.com/UI5/linter/commit/291ffed5f1e3a0d26ae808aea883eaa1f44d8f16))
* OData implicit globals detection ([#510](https://github.com/UI5/linter/issues/510)) ([daff87b](https://github.com/UI5/linter/commit/daff87bc7074d242b3c4c7cdf13720a533fc93cc))


### Bug Fixes

* **binding:** Resolve 'Bad name' error on tab ([1466abb](https://github.com/UI5/linter/commit/1466abbbf36b555f75cea3ef77ee38207a72fee0))
* CodeQL scan ([#509](https://github.com/UI5/linter/issues/509)) ([67e86d8](https://github.com/UI5/linter/commit/67e86d8166fa9801086f5dbeb16dbf1edc8edff5))
* Improve overall code detection ([#489](https://github.com/UI5/linter/issues/489)) ([af6dbd4](https://github.com/UI5/linter/commit/af6dbd4b4ce519725caef703c4c79a85f072b0d1))
* Prevent false-positive "prefer-test-starter" in testsuite ([2e733d2](https://github.com/UI5/linter/commit/2e733d225d7ddb39ac562069bf08f57cb3c3c835))
* Provide check for alternative names of the properties ([#506](https://github.com/UI5/linter/issues/506)) ([8d2ad2f](https://github.com/UI5/linter/commit/8d2ad2fc9e10dc081d01e13ffaa3b58e12943b6d))
* **XML:** Do not fail on empty core:require attribute ([4efb2d7](https://github.com/UI5/linter/commit/4efb2d77cbe72ece78093d766f9bf83791828779))
* **xmlTemplate:** Fix column position off-by-one ([07169f6](https://github.com/UI5/linter/commit/07169f62ac6953957dd7a07ce4e57f4f6c348c7f))


### Dependencies

* Bump sax-wasm from 2.2.4 to 3.0.3 ([#485](https://github.com/UI5/linter/issues/485)) ([237ff94](https://github.com/UI5/linter/commit/237ff94e36afc741e0bcd778296e675c4a3490ab))

## [1.7.0](https://github.com/UI5/linter/compare/v1.6.1...v1.7.0) (2025-01-15)


### Features

* Detect deprecated 'type' in `Controller#loadFragment` ([61fa2c2](https://github.com/UI5/linter/commit/61fa2c2e5d4ec480661dac4914277df7ebbe72ec))
* Detect deprecated 'type' in `Fragment.load` / `&lt;core:Fragment&gt;` ([16e3f94](https://github.com/UI5/linter/commit/16e3f94842680f535311fc5a051f9106a6add414))
* Detect deprecated 'type' in `View.create` / `&lt;mvc:View&gt;` ([14667aa](https://github.com/UI5/linter/commit/14667aabd73b331121ccb09a8ddda09efc3b0e16))
* Detect usage of non exported values by library.js ([#468](https://github.com/UI5/linter/issues/468)) ([be2cbb7](https://github.com/UI5/linter/commit/be2cbb7378dbe394633e6c1cbb9b2570ac462380))
* Improve deprecation detection of property accesses ([42fb8a5](https://github.com/UI5/linter/commit/42fb8a54c96e9cd8e1bb8f3903835cb6feae7ab8))


### Bug Fixes

* **amdTranspiler:** Handle NewExpression ([4988013](https://github.com/UI5/linter/commit/49880130229cf2bd115da29c5c857a2d043947aa))
* **API:** Remove ui5Config parameter defaulting ([e31d89e](https://github.com/UI5/linter/commit/e31d89ec67b9081a006fdd34d1c5e0d97169063a))
* **parsing-error:** Failed to map back to source ([2876f35](https://github.com/UI5/linter/commit/2876f35c68586bc51ee6ac7172fc9a6e1fe2eb6e))


### Dependencies

* Bump typescript from 5.7.2 to 5.7.3 ([d3f0471](https://github.com/UI5/linter/commit/d3f0471b49e03a2103cb9783f5d5029fe99712c5))

## [1.6.1](https://github.com/UI5/linter/compare/v1.6.0...v1.6.1) (2025-01-08)


### Bug Fixes

* **linter:** Prefer 'webapp' and 'src' directories for init fallbacks ([a56db27](https://github.com/UI5/linter/commit/a56db27ddf00e400e86e5473ee2d1c8d44a3da78))


### Dependencies

* Bump @sapui5/types to 1.120.25 ([4096664](https://github.com/UI5/linter/commit/40966640485a75226665da7e86e8e065041291d5))

## [1.6.0](https://github.com/UI5/linter/compare/v1.5.0...v1.6.0) (2025-01-08)


### Features

* Add further deprecated configuration option detection ([#357](https://github.com/UI5/linter/issues/357)) ([28e60a0](https://github.com/UI5/linter/commit/28e60a09ee05974dc2971554ced627663f741719))
* Detect non-Test Starter test setups ([#448](https://github.com/UI5/linter/issues/448)) ([8d7442f](https://github.com/UI5/linter/commit/8d7442faba475a8e818defb376872a55cb7db333))
* **linter:** Extend project initialization fallbacks ([f9b0f96](https://github.com/UI5/linter/commit/f9b0f966bb5458f1cdf39f027204381d75de1768))


### Bug Fixes

* Allow renderer v4 ([#443](https://github.com/UI5/linter/issues/443)) ([2e2d8d2](https://github.com/UI5/linter/commit/2e2d8d22dae64a148624eda8475b20d6fda4d775))
* **ConfigManager:** Resolve ESM import exception on Windows ([87c21e6](https://github.com/UI5/linter/commit/87c21e6414a80293b66a3863b15d56f07307d029))
* **messages:** Remove superfluous quotes and comma around message details ([49ff2f8](https://github.com/UI5/linter/commit/49ff2f8c8d82e6cc242f05e9c08f4a015642b550))


### Dependencies

* Bump chalk from 5.3.0 to 5.4.0 ([2adeea4](https://github.com/UI5/linter/commit/2adeea4027ee5c3626b26709cbaa3768c52577fd))
* **sax-wasm:** Pin dependency to v2.2.4 ([d595b4f](https://github.com/UI5/linter/commit/d595b4f43efa462f50fe7dbc009c5c76afdbea7c))

## [1.5.0](https://github.com/UI5/linter/compare/v1.4.1...v1.5.0) (2024-12-10)


### Features

* Add `ruleId` to Markdown format output ([913007c](https://github.com/UI5/linter/commit/913007c50551ecc2d91dfc946ef5bdcb2922c418))
* Detect override of control "rerender" ([f416a0c](https://github.com/UI5/linter/commit/f416a0ccd0ddeab49c31d911977853c41908fb50))


### Bug Fixes

* Detect deprecations in new expressions with ID ([156e747](https://github.com/UI5/linter/commit/156e7470c0fb2665b97319f89a6a076548a7bd5f))
* Detect more deprecated renderer declarations ([74f65bf](https://github.com/UI5/linter/commit/74f65bf78a79f373dd628b64e0dd19ca3a44db3a))
* Improve module resolution ([ce4eed8](https://github.com/UI5/linter/commit/ce4eed86a6f38baa3818afb6de148884d007eced))
* Match ignore-pattern starting with "./" ([4eb2758](https://github.com/UI5/linter/commit/4eb27583d26bc4da2ec9ca5ca908bc23214339ca))


### Dependencies

* Bump @sapui5/types to 1.120.24 ([d0760c9](https://github.com/UI5/linter/commit/d0760c9518c8c7ade894471d32e5466a02dcfe7f))

## [1.4.1](https://github.com/UI5/linter/compare/v1.4.0...v1.4.1) (2024-11-28)


### Bug Fixes

* **amdTranspiler:** Extend call without classInfo ([b90b9e0](https://github.com/UI5/linter/commit/b90b9e00c9300a8055acb234097cc243bf6184ad))
* False-positive global findings in controllers ([b48a2dc](https://github.com/UI5/linter/commit/b48a2dc78ac1e15fd9d04ea426cffd13857dd513))

## [1.4.0](https://github.com/UI5/linter/compare/v1.3.1...v1.4.0) (2024-11-25)


### Features

* Add type support for "byId" in controllers ([#423](https://github.com/UI5/linter/issues/423)) ([cc2cf60](https://github.com/UI5/linter/commit/cc2cf60b9290c564e1ba6a66f47e6e9a8009d264))

## [1.3.1](https://github.com/UI5/linter/compare/v1.3.0...v1.3.1) (2024-11-15)


### Bug Fixes

* Properly check directly exported renderer ([91ddd39](https://github.com/UI5/linter/commit/91ddd39ebb5045bbb84b9a4e36f49a92a25b255c))
* **Test Starter Configs:** Fix false-positive findings ([#409](https://github.com/UI5/linter/issues/409)) ([cf6907c](https://github.com/UI5/linter/commit/cf6907c54eef58d5a68dcd3d5cb3ad15b2f7fe35))

## [1.3.0](https://github.com/UI5/linter/compare/v1.2.0...v1.3.0) (2024-11-13)


### Features

* Add ui5lint-disable directives ([#327](https://github.com/UI5/linter/issues/327)) ([3c29e52](https://github.com/UI5/linter/commit/3c29e52d9eacd7b3472e0af718399f05e91f5536))
* Detect deprecated themes set by Theming.setTheme() API ([#389](https://github.com/UI5/linter/issues/389)) ([83b295f](https://github.com/UI5/linter/commit/83b295f80146cab9352cd9ad32c49d2ed5096e5e))
* Node API in ui5 linter ([#400](https://github.com/UI5/linter/issues/400)) ([626f022](https://github.com/UI5/linter/commit/626f0225ab718afcf396a5641857d642a8b077c0))
* **Test Starter:** Detect deprecations in 'theme' property of test configuration ([#387](https://github.com/UI5/linter/issues/387)) ([619457f](https://github.com/UI5/linter/commit/619457f540eb00145f4d8f89f6be409d75301215))


### Bug Fixes

* Allow ignoring ui5.yaml files via config ([a024d44](https://github.com/UI5/linter/commit/a024d44ca045127c998d291c4c2fdcf30e3d34b6))
* Improve Control Renderer lint ([#392](https://github.com/UI5/linter/issues/392)) ([8a3976f](https://github.com/UI5/linter/commit/8a3976f84bbd20b8c35a821bc3492772cf1e71a5))


### Dependencies

* Bump @sapui5/types to 1.120.23 ([96b46ca](https://github.com/UI5/linter/commit/96b46cab1bcb230eb007fc654a0e18cf9480199b))

## [1.2.0](https://github.com/UI5/linter/compare/v1.1.1...v1.2.0) (2024-10-29)


### Features

* Allow usage of shorthand properties in extend call ([#385](https://github.com/UI5/linter/issues/385)) ([64a27d8](https://github.com/UI5/linter/commit/64a27d87296f818d1e874aec2afed1b9642a447c))
* Check control renderer declaration ([#374](https://github.com/UI5/linter/issues/374)) ([0c9b3e8](https://github.com/UI5/linter/commit/0c9b3e8bf6e616fc4a497f662edef611367f325e))
* Detect deprecated renderer-API usage ([#366](https://github.com/UI5/linter/issues/366)) ([d4f682d](https://github.com/UI5/linter/commit/d4f682d1ce5f59a634507d1e5ecada38106836fc))
* **html:** Detect deprecated themes in 'href' attributes ([#382](https://github.com/UI5/linter/issues/382)) ([2d4bcfa](https://github.com/UI5/linter/commit/2d4bcfabd6ea7fe69ea6beedbf859a7a7b41bb37))


### Bug Fixes

* **amdTranspiler:** Handle extend call without args ([f279771](https://github.com/UI5/linter/commit/f2797718a8b7288de9b3f281c1a392cc2f510a28))
* Control renderer check with quoted property ([540614f](https://github.com/UI5/linter/commit/540614f470730731a9cadad2d5d46345e3f1260b))
* Correctly handle namespace resolution in linting ([#367](https://github.com/UI5/linter/issues/367)) ([922e76b](https://github.com/UI5/linter/commit/922e76ba8b47f995043e9624926ce0eda3dc79fc))
* ManagedObject check with quoted "metadata" property ([90b1627](https://github.com/UI5/linter/commit/90b1627fbd9055580af4bc0d339dd6726027d0ac))
* Parent class check for Component analysis ([9b41eb6](https://github.com/UI5/linter/commit/9b41eb6fe53a926eb0932e617557a4363459d428))

## [1.1.1](https://github.com/UI5/linter/compare/v1.1.0...v1.1.1) (2024-10-18)


### Bug Fixes

* **amdTranspiler:** Fix exception "Node not found in array" ([75d2aa8](https://github.com/UI5/linter/commit/75d2aa8346b6fffd5de1f7e0ce8a4dde4a70f65f))
* Properly check UI5 class inheritance ([79f9123](https://github.com/UI5/linter/commit/79f912372828f47a3c0b10a916ca4f9e978b1037))

## [1.1.0](https://github.com/UI5/linter/compare/v1.0.2...v1.1.0) (2024-10-17)


### Features

* Detect deprecations in ManagedObject metadata ([#349](https://github.com/UI5/linter/issues/349)) ([9cc1202](https://github.com/UI5/linter/commit/9cc1202241a3fbed642bb82349117ba1607a2eb9))
* Improve code detection for UI5 classes (JavaScript) ([#358](https://github.com/UI5/linter/issues/358)) ([77b796e](https://github.com/UI5/linter/commit/77b796e923a6c2b234bd3ed79ef9dc0d5e95c39c))


### Bug Fixes

* False positive for deprecated JS view/fragment type ([63a12e2](https://github.com/UI5/linter/commit/63a12e2a1c1d35758ede799e62507af33edb06dd))

## [1.0.2](https://github.com/UI5/linter/compare/v1.0.1...v1.0.2) (2024-10-09)


### Bug Fixes

* **html:** Detect all missing bootstrap parameters ([6d51ec5](https://github.com/UI5/linter/commit/6d51ec58ce43d3dcd8d22e382d44d335af5a92ad))
* **html:** Improve detection of deprecated themes ([1ca4210](https://github.com/UI5/linter/commit/1ca42105e4fe66a2a85bf9404b821d79a81daebd))
* Remove checks for deprecated property names in manifest.json routing ([#356](https://github.com/UI5/linter/issues/356)) ([631e78a](https://github.com/UI5/linter/commit/631e78a88a50eb2709f9e7db3b92e2f4a907f9aa))


### Dependencies

* Bump typescript from 5.6.2 to 5.6.3 ([506b107](https://github.com/UI5/linter/commit/506b107c116c0cc08740ea5c3084a1f21681da08))

## [1.0.1](https://github.com/UI5/linter/compare/v1.0.0...v1.0.1) (2024-10-02)


### Bug Fixes

* Check unmatched patterns ([#334](https://github.com/UI5/linter/issues/334)) ([329f2cd](https://github.com/UI5/linter/commit/329f2cd5d002e6d808755c7eeb65ed6db226c067))
* Consider config patterns in root level reader ([#346](https://github.com/UI5/linter/issues/346)) ([b54f553](https://github.com/UI5/linter/commit/b54f55300d275360d43621067694f26f8364a73c))
* **html:** False positive for global function name in on-init bootstrap param ([2495cc0](https://github.com/UI5/linter/commit/2495cc03392d7dfac9171ad28724faa1560103e4))
* **html:** False positive for multiple bootstrap script tags ([74ad824](https://github.com/UI5/linter/commit/74ad82440cf27173da889df3126660cc2be46d15))
* **html:** Superfluous whitespace around deprecated library name ([cf8b99b](https://github.com/UI5/linter/commit/cf8b99b0bcfaa51f634744db09c2ee8990789068))
* Update texts + test samples & the respective test snapshots ([#344](https://github.com/UI5/linter/issues/344)) ([5639a2f](https://github.com/UI5/linter/commit/5639a2ff8e1b2e27655359a2a5aacb3cd38e2218))


### Dependencies

* Bump @sapui5/types to 1.120.21 ([#337](https://github.com/UI5/linter/issues/337)) ([41c60f4](https://github.com/UI5/linter/commit/41c60f4c7a19de9dcf8c4c5c221ad5ae43189381))

## [1.0.0](https://github.com/UI5/linter/compare/v0.4.1...v1.0.0) (2024-09-30)

### General

* Usage of deprecated UI5 libraries
* Usage of deprecated UI5 framework APIs
* Usage of global variables
* Possible CSP violations
* Deprecated component and manifest configurations

### New Features in this release

* Allow usage of patterns in UI5 linter's file-paths config ([#312](https://github.com/UI5/linter/issues/312)) ([d7f1817](https://github.com/UI5/linter/commit/d7f18179600ed202742d80324e1eeaead25fc387))
* Detect deprecated View file types ([#320](https://github.com/UI5/linter/issues/320)) ([a9c2467](https://github.com/UI5/linter/commit/a9c2467c53d171493d1172c260ac422be60930fd))
* Detect sap/ui/core/plugin/DeclarativeSupport and sap/ui/core/plugin/LessSupport ([#328](https://github.com/UI5/linter/issues/328)) ([6545780](https://github.com/UI5/linter/commit/654578010990997396cce8ed1b73f7ee25c932f0))
* **html:** Detect deprecated bootstrap parameters ([#316](https://github.com/UI5/linter/issues/316)) ([62489f7](https://github.com/UI5/linter/commit/62489f7a96fb627099f4ab026897578d8346817f))

## [0.4.1](https://github.com/UI5/linter/compare/v0.4.0...v0.4.1) (2024-09-23)


### Features

* Add UI5 linter option for ui5.yaml config path ([#313](https://github.com/UI5/linter/issues/313)) ([a213084](https://github.com/UI5/linter/commit/a2130847cd35c31e00a63df7d5e21e4803042fb9))

## [0.4.0](https://github.com/UI5/linter/compare/v0.3.5...v0.4.0) (2024-09-17)


### ⚠ BREAKING CHANGES

* **messages:** Drop 'ui5-linter-' prefix from rule names

### Features

* Allow excluding files from UI5 Linter checks ([#264](https://github.com/UI5/linter/issues/264)) ([7181a94](https://github.com/UI5/linter/commit/7181a945deff78b51e6326cc0b3f02e7f7241ebe))
* Detect partially deprecated APIs ([#286](https://github.com/UI5/linter/issues/286)) ([dc66f91](https://github.com/UI5/linter/commit/dc66f91f55213d95d0fa069da7829e130d6376a2))


### Bug Fixes

* **asyncComponentFlags:** Fix detection of manifest: 'json' (single quotes) ([8a6af93](https://github.com/UI5/linter/commit/8a6af93163d75a9278576298c16fcfed509f4af0))
* Bad formatting ([996e160](https://github.com/UI5/linter/commit/996e160847dabc17b81239fad36ac7b0e6d24617))
* Ensure that results are in deterministic order ([5cd8757](https://github.com/UI5/linter/commit/5cd8757a390ef8a7f294018a4a63d21c29d6eb9a))
* Eslint findings ([9d67098](https://github.com/UI5/linter/commit/9d67098d35214465a0a75a84e4631be9ac809b54))
* Eslint findings ([f72109c](https://github.com/UI5/linter/commit/f72109c380ac31b3bd200d78d8fae2b253c4d071))
* **linter/html:** Fix glob pattern to match HTML files ([18d80af](https://github.com/UI5/linter/commit/18d80af02388cefcb64110c8f8ea69ab3550510e))
* **NoGlobals:** Fix false-positives for ElementAccessExpressions and some built-in globals ([db0a057](https://github.com/UI5/linter/commit/db0a057c476ef8795095884fe34584da68700ffb))
* Remove moduleResolution CompilerHost setting ([1f1dbf8](https://github.com/UI5/linter/commit/1f1dbf820e11a561179ca6ca902f88ccf0de73e8))


### Dependencies

* Bump typescript from 5.5.4 to 5.6.2 ([2dfb412](https://github.com/UI5/linter/commit/2dfb4127a66335aa0704622c6a288c18395429dc))
* Bump update-notifier from 7.3.0 to 7.3.1 ([2e26a3f](https://github.com/UI5/linter/commit/2e26a3f561b044b8ccca853e61ccebd0c758de18))


### Code Refactoring

* **messages:** Drop 'ui5-linter-' prefix from rule names ([119b61a](https://github.com/UI5/linter/commit/119b61a879123e7bcf6afdfc8584ebacaf3819ea))

## [0.3.5](https://github.com/UI5/linter/compare/v0.3.4...v0.3.5) (2024-09-04)


### Dependencies

* Bump @sapui5/types to 1.120.20 ([ee3695f](https://github.com/UI5/linter/commit/ee3695f74b08f075c34fff8115d9452b0f468097))

## [0.3.4](https://github.com/UI5/linter/compare/v0.3.3...v0.3.4) (2024-08-27)


### Features

* Add new output format markdown ([#258](https://github.com/UI5/linter/issues/258)) ([7329058](https://github.com/UI5/linter/commit/732905881909bb3de57cf068a6a60e43103b0842))

## [0.3.3](https://github.com/UI5/linter/compare/v0.3.2...v0.3.3) (2024-08-20)


### Bug Fixes

* Detect deprecated property access in object destructuring ([7477b9e](https://github.com/UI5/linter/commit/7477b9edad8891455471f52f82a9f7c4bb672ab3))

## [0.3.2](https://github.com/UI5/linter/compare/v0.3.1...v0.3.2) (2024-08-12)


### Bug Fixes

* Missing detection of deprecated modules that export an interface ([829e826](https://github.com/UI5/linter/commit/829e8260103a7647c2bd46de1258719f98f3a60f))
* Unhandled CallExpression expression syntax: CallExpression ([3a7716d](https://github.com/UI5/linter/commit/3a7716d3360f3dd64025aaac5544f9bf62997053))


### Dependencies

* Bump @sapui5/types to 1.120.19 ([2a4917f](https://github.com/UI5/linter/commit/2a4917f08cd0806f9ba4edc3ca57cfb7c4956485))
* Bump @ui5/project from 4.0.0 to 4.0.1 ([5f516e0](https://github.com/UI5/linter/commit/5f516e0434a32e283de71d8f74f8586d4ebe6bba))
* Bump eslint from 8.57.0 to 9.8.0 ([#230](https://github.com/UI5/linter/issues/230)) ([9e80d2f](https://github.com/UI5/linter/commit/9e80d2fa463e6526c342b0db6e037991c0694825))
* Pin update-notifier to v7.1.0 ([cc6e8d4](https://github.com/UI5/linter/commit/cc6e8d45e159e0cf10bdaaa6a20ae27b2fb130d5))
* Switch back to latest version of update-notifier ([3788faa](https://github.com/UI5/linter/commit/3788faa58f4e758bab0ae72e8d985d152ca7f7ff))

## [0.3.1](https://github.com/UI5/linter/compare/v0.3.0...v0.3.1) (2024-07-30)


### Features

* Add detection for deprecated dependencies in .library ([#104](https://github.com/UI5/linter/issues/104)) ([161f157](https://github.com/UI5/linter/commit/161f157f56d88d614e9f673b737856148e42bcbc))

## [0.3.0](https://github.com/UI5/linter/compare/v0.2.6...v0.3.0) (2024-07-24)


### ⚠ BREAKING CHANGES

* Support for older Node.js has been dropped. Only Node.js 20.11.x and >=22.0.0 as well as npm v8 or higher are supported.

### Features

* Detect deprecated deps in Lib.init call ([#197](https://github.com/UI5/linter/issues/197)) ([9c9c406](https://github.com/UI5/linter/commit/9c9c406e72305c2fee61d03a064e57dc923cba35))
* Drop support for node v18, v21 ([3ca58ed](https://github.com/UI5/linter/commit/3ca58edc2a9ce358be26422d210742a8cb3bfe27))


### Bug Fixes

* Consider allowed globals when they're accessed via globalThis ([d370803](https://github.com/UI5/linter/commit/d3708033623c1d82c626ff409d8c23e93ce93161))


### Dependencies

* Bump @jridgewell/sourcemap-codec from 1.4.15 to 1.5.0 ([191620e](https://github.com/UI5/linter/commit/191620eec1bc3dccada161ec7d77ee167850c65d))
* Bump @sapui5/types to 1.120.18 ([f6f0e07](https://github.com/UI5/linter/commit/f6f0e07115cc181896051e0cbfc289ea0a227cfe))
* Bump @ui5/fs from 3.0.5 to 4.0.0 ([6cb5130](https://github.com/UI5/linter/commit/6cb513003283d68d6197356332ae8c773b5ed475))
* Bump @ui5/logger from 3.0.0 to 4.0.1 ([d650e1d](https://github.com/UI5/linter/commit/d650e1df8a9fdc7e10220b9b2878457539b25305))
* Bump @ui5/project from 3.9.2 to 4.0.0 ([3834655](https://github.com/UI5/linter/commit/38346552910b0eb8363284fe657f1bed3a11f7c2))
* Bump typescript from 5.5.2 to 5.5.3 ([d8ad2ee](https://github.com/UI5/linter/commit/d8ad2ee26585ecb9919570959a71bd4ffb356347))
* Bump typescript from 5.5.3 to 5.5.4 ([3f911a3](https://github.com/UI5/linter/commit/3f911a3912f12aab470664c727f335ed1c5b9045))
* Bump update-notifier from 7.0.0 to 7.1.0 ([b798d53](https://github.com/UI5/linter/commit/b798d5312e39712541ef46578f48bed403cde396))

## [0.2.6](https://github.com/UI5/linter/compare/v0.2.5...v0.2.6) (2024-06-28)


### Bug Fixes

* **amdTranspiler:** Ensure unique class names ([b70698c](https://github.com/UI5/linter/commit/b70698ce23ae0d66aaa82db17762a6d9fd78f235))
* Disable TS-compiler checks for JavaScript resources ([b34d7e9](https://github.com/UI5/linter/commit/b34d7e96e6769de901573ff121a6a082ef1bc04e))


### Dependencies

* Bump @ui5/project from 3.9.1 to 3.9.2 ([b81d416](https://github.com/UI5/linter/commit/b81d41610460df273587bd061e529d16ea5484c0))
* Bump typescript from 5.4.5 to 5.5.2 ([4743d64](https://github.com/UI5/linter/commit/4743d6498464be4d4ede95545ab32bdf880765bb))

## [0.2.5](https://github.com/UI5/linter/compare/v0.2.4...v0.2.5) (2024-06-11)


### Bug Fixes

* Update detection of deprecated (theme-)libs ([fcfc518](https://github.com/UI5/linter/commit/fcfc518d86d4962c9bf2295f2120c255f0197092))

## [0.2.4](https://github.com/UI5/linter/compare/v0.2.3...v0.2.4) (2024-06-07)


### Features

* Detect pseudo modules of DataType ([#112](https://github.com/UI5/linter/issues/112)) ([dd60374](https://github.com/UI5/linter/commit/dd60374cde874c6aba8a39ddb5d7b16ec307e950))


### Dependencies

* Bump @sapui5/types to 1.120.15 ([#143](https://github.com/UI5/linter/issues/143)) ([65e43d4](https://github.com/UI5/linter/commit/65e43d4e44ce8da9414e6d67a744391e3bcf6373))

## [0.2.3](https://github.com/UI5/linter/compare/v0.2.2...v0.2.3) (2024-06-04)


### Features

* Component best practices- async flags check ([#73](https://github.com/UI5/linter/issues/73)) ([1c58105](https://github.com/UI5/linter/commit/1c5810593abf227a88a908c9d17aa9eacf113f10))


### Bug Fixes

* Correct type for deprecated call on return value of another call ([e715dbc](https://github.com/UI5/linter/commit/e715dbc5b5d9993650eae232d3f4fe86265d2ad3))
* Improve parsing of message details in VS Code problems matcher ([ea8e258](https://github.com/UI5/linter/commit/ea8e258f29c89b43e3dfe8bda6956ccce4eb0047))
* Position of deprecated function call errors ([7084704](https://github.com/UI5/linter/commit/70847041fe83a5a8d1974a3a0b183c0c8309c9cd))


### Dependencies

* Bump @sapui5/types to 1.120.13 ([#116](https://github.com/UI5/linter/issues/116)) ([6e0744e](https://github.com/UI5/linter/commit/6e0744e863bfdd3397d96b894fd59bc96517d983))
* Bump @sapui5/types to 1.120.14 ([a1afef5](https://github.com/UI5/linter/commit/a1afef5295e97462f7e5834347f993383f2e7ce2))

## [0.2.2](https://github.com/UI5/linter/compare/v0.2.1...v0.2.2) (2024-04-23)


### Bug Fixes

* Don't exit synchronously when there still might be async I/O ([#90](https://github.com/UI5/linter/issues/90)) ([fd9b7b9](https://github.com/UI5/linter/commit/fd9b7b949ed1b6b1f6d481ef214f4b5f39484f98))


### Dependencies

* **eslint:** Upgrade @eslint/js and @stylistic/eslint-plugin ([41b3a98](https://github.com/UI5/linter/commit/41b3a98d81c7f33939b8bda748c17a02c82a7397))

## [0.2.1](https://github.com/UI5/linter/compare/v0.2.0...v0.2.1) (2024-04-17)


### Features

* Alerts for new ui5lint version in console ([#57](https://github.com/UI5/linter/issues/57)) ([9b17887](https://github.com/UI5/linter/commit/9b1788780c205080eb9a25fb1f682017a1736fc2))
* Check script tags for inline JS ([#48](https://github.com/UI5/linter/issues/48)) ([70b719a](https://github.com/UI5/linter/commit/70b719aa7b7b1bd7d1bfc5d19c0ca4c22c20983c))
* Detect deprecations in ui5.yaml (in root directory) ([#39](https://github.com/UI5/linter/issues/39)) ([db118b1](https://github.com/UI5/linter/commit/db118b16851a4aae328da33060213842009137fc))
* Detect pseudo modules ([#60](https://github.com/UI5/linter/issues/60)) ([508d81d](https://github.com/UI5/linter/commit/508d81d9ec8b9042bab63cff97e81c9c6305935f))


### Bug Fixes

* **amdTranspiler:** Fix substiute for sap.ui.require errbacks ([c52b53f](https://github.com/UI5/linter/commit/c52b53fc4ec8d289a6684ae43d4bc0af86e460f6))
* Respect src attribute for script tags and include module type for checks ([#70](https://github.com/UI5/linter/issues/70)) ([2b28e5f](https://github.com/UI5/linter/commit/2b28e5fdeae125aca1cf839a253f28244767d5a7))


### Dependencies

* Bump @sapui5/types to 1.120.12 ([fa7592b](https://github.com/UI5/linter/commit/fa7592b2b8d955cfd33aba425350fea3178bb490))
* Update typescript to v5.4.5 and move yauzl-promise to dev-deps ([8982185](https://github.com/UI5/linter/commit/8982185960ecee36de558b34eea06679c78a037a))

## [0.2.0](https://github.com/UI5/linter/compare/v0.1.3...v0.2.0) (2024-03-26)


### ⚠ BREAKING CHANGES

* **cli:** Depending on how UI5 linter is being used, this change might change the behavior of that particular scenario. For example a build script might abort further processing, if any linting errors are detected.

### Features

* Analyze sap.ui.core.Lib.init() call ([#33](https://github.com/UI5/linter/issues/33)) ([6d5bcdb](https://github.com/UI5/linter/commit/6d5bcdbc89487d2cba46c6df72336663b9635f4f))
* **cli:** In case of errors, exit with code 1 ([96331fc](https://github.com/UI5/linter/commit/96331fca906773f5b8c1399011a227762d523d57))


### Bug Fixes

* Update list of deprecated libs ([#42](https://github.com/UI5/linter/issues/42)) ([d38e356](https://github.com/UI5/linter/commit/d38e3563f79edc49fa6d2bf2c027bd8bd5315c0c))


### Performance Improvements

* Load SAPUI5 types only when needed ([#46](https://github.com/UI5/linter/issues/46)) ([b7e9a2b](https://github.com/UI5/linter/commit/b7e9a2bb168c2d1b599067739e1fed10fda699ea))


### Dependencies

* Bump @sapui5/types to 1.120.11 ([9cbdf1d](https://github.com/UI5/linter/commit/9cbdf1d8f77de920e4e6ff2d58ec5bc5868a7965))

## [0.1.3](https://github.com/UI5/linter/compare/v0.1.2...v0.1.3) (2024-03-19)


### Features

* Detect deprecated libs and components in manifest.json ([#34](https://github.com/UI5/linter/issues/34)) ([8aa74e1](https://github.com/UI5/linter/commit/8aa74e14e652481bf284696d672806ed82310f8d))


### Reverts

* Remove workaround for deprecation text ([5d81856](https://github.com/UI5/linter/commit/5d81856a62e779b55b363c98a7af9d8a457fcc47)), closes [#29](https://github.com/UI5/linter/issues/29)

## [0.1.2](https://github.com/UI5/linter/compare/v0.1.1...v0.1.2) (2024-03-14)


### Bug Fixes

* **npm:** Install error "Unsupported platform @esbuild/aix-ppc64@0.19.12" ([5815178](https://github.com/UI5/linter/commit/5815178d3fa79b57552f439bf5b8d9a04827023f))

## [0.1.1](https://github.com/UI5/linter/compare/v0.1.0...v0.1.1) (2024-03-14)


### Features

* Detect usage of deprecated jQuery.sap API ([e8e2314](https://github.com/UI5/linter/commit/e8e2314032ecae84e427b4c5e680805d124a7ac6))


### Bug Fixes

* Remove duplicate messages ([81a6671](https://github.com/UI5/linter/commit/81a667187bbc28e6c6e200081970acbd0bdffd66))
* **xml-transpiler:** Log unknown namespaces as verbose instead of warning ([6a73c17](https://github.com/UI5/linter/commit/6a73c17e776601d48acc68386bcfc895e446c85d))


### Performance Improvements

* Only collect coverage info / details when requested ([8ac64f6](https://github.com/UI5/linter/commit/8ac64f64db1c1523d659f6e589f669991e98d3ae))

## [0.1.0](https://github.com/UI5/linter/compare/v0.0.1...v0.1.0) (2024-03-13)


### Features

* Add support for Node v18.14.2 ([eb21b02](https://github.com/UI5/linter/commit/eb21b020715ea073f56d56c3c63bf78db2491485))
* Enable links in VS Code terminal ([#6](https://github.com/UI5/linter/issues/6)) ([1572f77](https://github.com/UI5/linter/commit/1572f772159ad1762233921410392bb64f129ddf))
* Initial version ([5466be5](https://github.com/UI5/linter/commit/5466be5b983c4c6e6108c0d97d5221b8ad320a88))
