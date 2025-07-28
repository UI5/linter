import type {
	SAPJSONSchemaForWebApplicationManifestFile,
	JSONSchemaForSAPUI5Namespace,
	JSONSchemaForSAPAPPNamespace,
	Model as ManifestModel,
	DataSource as ManifestDataSource,
} from "../../manifest.d.ts";

import ManifestReporter from "./ManifestReporter.js";
import {ResourcePath} from "../LinterContext.js";
import jsonMap from "json-source-map";
import LinterContext from "../LinterContext.js";
import {deprecatedLibraries, deprecatedComponents} from "../../utils/deprecations.js";
import {MESSAGE} from "../messages.js";
import semver from "semver";

interface locType {
	line: number;
	column: number;
	pos: number;
}

const deprecatedViewTypes = ["JSON", "HTML", "JS", "Template"];

export type jsonMapPointers = Record<string, {key: locType; keyEnd: locType; value: locType; valueEnd: locType}>;

export interface jsonSourceMapType {
	data: SAPJSONSchemaForWebApplicationManifestFile;
	pointers: jsonMapPointers;
}

export default class ManifestLinter {
	#reporter: ManifestReporter | undefined;
	#content: string;
	#resourcePath: string;
	#context: LinterContext;

	constructor(resourcePath: ResourcePath, content: string, context: LinterContext) {
		this.#resourcePath = resourcePath;
		this.#content = content;
		this.#context = context;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async lint() {
		try {
			const source = this.#parseManifest(this.#content);
			this.#reporter = new ManifestReporter(this.#resourcePath, this.#context, source);
			this.#analyzeManifest(source.data);
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			this.#context.addLintingMessage(this.#resourcePath, MESSAGE.PARSING_ERROR, {message});
		}
	}

	#parseManifest(manifest: string): jsonSourceMapType {
		return jsonMap.parse<jsonSourceMapType>(manifest);
	}

	#analyzeManifest(manifest: SAPJSONSchemaForWebApplicationManifestFile) {
		if (manifest?.["sap.ui5"]?.dependencies?.minUI5Version) {
			let availableVersions: string[] = [];

			if (Array.isArray(manifest?.["sap.ui5"]?.dependencies?.minUI5Version)) {
				availableVersions = manifest?.["sap.ui5"]?.dependencies?.minUI5Version;
			} else if (typeof manifest?.["sap.ui5"]?.dependencies?.minUI5Version === "string") {
				availableVersions.push(manifest?.["sap.ui5"]?.dependencies?.minUI5Version);
			}

			// Check if any version is below 1.136
			const isBelow136 = availableVersions.some((version) => {
				return semver.lt(version, "1.136.0");
			});

			if (isBelow136) {
				this.#reporter?.addMessage(MESSAGE.NO_LEGACY_UI5_VERSION_IN_MANIFEST,
					"/sap.ui5/dependencies/minUI5Version");
			}
		}

		if (manifest?._version?.startsWith("2.")) {
			this.#validatePropertiesForManifestVersion(manifest, true);
		} else {
			this.#validatePropertiesForManifestVersion(manifest);
			this.#reporter?.addMessage(MESSAGE.NO_OUTDATED_MANIFEST_VERSION, "/_version");
		}
	}

	#validatePropertiesForManifestVersion(manifest: SAPJSONSchemaForWebApplicationManifestFile, isManifest2 = false) {
		const {resources, models, dependencies, rootView, routing} =
			(manifest["sap.ui5"] ?? {} as JSONSchemaForSAPUI5Namespace);
		const {dataSources} = (manifest["sap.app"] ?? {} as JSONSchemaForSAPAPPNamespace);

		// Detect deprecated libraries:
		const libKeys: string[] = (dependencies?.libs && Object.keys(dependencies.libs)) ?? [];
		libKeys.forEach((libKey: string) => {
			if (deprecatedLibraries.includes(libKey)) {
				this.#reporter?.addMessage(MESSAGE.DEPRECATED_LIBRARY, {
					libraryName: libKey,
				}, `/sap.ui5/dependencies/libs/${libKey}`);
			}
		});

		// Detect deprecated components:
		const componentKeys: string[] = (dependencies?.components && Object.keys(dependencies.components)) ?? [];
		componentKeys.forEach((componentKey: string) => {
			if (deprecatedComponents.includes(componentKey)) {
				this.#reporter?.addMessage(MESSAGE.DEPRECATED_COMPONENT, {
					componentName: componentKey,
				}, `/sap.ui5/dependencies/components/${componentKey}`);
			}
		});

		// Detect deprecated type of rootView:
		if (typeof rootView === "object" && rootView.type && deprecatedViewTypes.includes(rootView.type)) {
			if (isManifest2 && ["XML", "JS"].includes(rootView.type) && rootView.viewName.startsWith("module:")) {
				// In manifest v2 there's a new default value handling.
				// Property is no longer required in case value is "XML" or "JS" if view name starts with "module:"
				this.#reporter?.addMessage(MESSAGE.NO_REMOVED_MANIFEST_PROPERTY,
					{propName: "type"},
					"/sap.ui5/rootView/type");
			} else {
				this.#reporter?.addMessage(MESSAGE.DEPRECATED_VIEW_TYPE, {
					viewType: rootView.type,
				}, "/sap.ui5/rootView/type");
			}
		}

		// Detect deprecated view type in routing.config:
		if (routing?.config && routing.config.viewType && deprecatedViewTypes.includes(routing.config.viewType)) {
			this.#reporter?.addMessage(MESSAGE.DEPRECATED_VIEW_TYPE, {
				viewType: routing.config.viewType,
			}, "/sap.ui5/routing/config/viewType");
		}

		// Detect deprecations in routing.targets:
		const targets = routing?.targets;
		const oldToNewTargetPropsMap = {
			viewName: "name",
			viewId: "id",
			viewLevel: "level",
			viewPath: "path",
		};
		if (targets) {
			let configTypeView: "View" | "OtherType" | undefined = undefined;
			if (routing?.config?.type) {
				configTypeView = routing.config.type === "View" ? "View" : "OtherType";
			}

			for (const [key, target] of Object.entries(targets)) {
				for (const [oldProp, newProp] of Object.entries(oldToNewTargetPropsMap)) {
					if (target[oldProp] && !target[newProp]) {
						this.#reporter?.addMessage(MESSAGE.NO_RENAMED_MANIFEST_PROPERTY, {
							propName: oldProp,
							newName: newProp,
						}, `/sap.ui5/routing/targets/${key}/${oldProp}`);
					}
				}

				if (configTypeView === "OtherType" && target?.type !== "View") {
					this.#reporter?.addMessage(MESSAGE.NO_INCORRECT_MANIFEST_ROUTING_CONFIG_TYPE, {
						propName: `/sap.ui5/routing/targets/${key}/type`,
					}, `/sap.ui5/routing/targets/${key}/type`);
				} else if (configTypeView !== "OtherType" && target?.type === "View") {
					this.#reporter?.addMessage(MESSAGE.REDUNDANT_VIEW_CONFIG_PROPERTY, {
						propertyName: "type",
					}, `/sap.ui5/routing/targets/${key}/type`);
				}

				// Check if name starts with module and viewType is defined:
				const name = target.name ?? target.viewName;
				if (name && (name as string).startsWith("module:")) {
					if (target.viewType) {
						this.#reporter?.addMessage(MESSAGE.REDUNDANT_VIEW_CONFIG_PROPERTY, {
							propertyName: "viewType",
						}, `/sap.ui5/routing/targets/${key}/viewType`);
					}
				}

				const pathToViewObject = `/sap.ui5/routing/targets/${key}`;
				// Detect deprecated view type:
				if (target.viewType && deprecatedViewTypes.includes(target.viewType)) {
					this.#reporter?.addMessage(MESSAGE.DEPRECATED_VIEW_TYPE, {
						viewType: target.viewType,
					}, `${pathToViewObject}/viewType`);
				}
			}
		}

		if (resources?.js) {
			if (isManifest2 && Array.isArray(resources.js) && resources.js.length === 0) {
				// no longer supported in 2.0, if it is empty it can be removed, if not
				// the application has to adjust their code base to load the module in a
				// sap.ui.define call e.g. in the Component.js, manifest can not be migrated
				// as long as code is not adjusted
				this.#reporter?.addMessage(MESSAGE.NO_REMOVED_MANIFEST_PROPERTY, {
					propName: "/sap.ui5/resources/js",
				}, "/sap.ui5/resources/js");
			} else {
				this.#reporter?.addMessage(MESSAGE.DEPRECATED_MANIFEST_JS_RESOURCES, "/sap.ui5/resources/js");
			}
		}

		const modelKeys: string[] = (models && Object.keys(models)) ?? [];
		modelKeys.forEach((modelKey: string) => {
			const curModel: ManifestModel = (models?.[modelKey]) ?? {};

			if (!curModel.type) {
				const curDataSource = dataSources && curModel.dataSource &&
					dataSources[curModel.dataSource] as ManifestDataSource | undefined;

				if (curDataSource &&
					/* if not provided dataSource.type="OData" */
					(curDataSource.type === "OData" || !curDataSource.type)) {
					curModel.type = curDataSource.settings?.odataVersion === "4.0" ?
						"sap.ui.model.odata.v4.ODataModel" :
						"sap.ui.model.odata.v2.ODataModel";
				}
				// There are other types that can be found in sap/ui/core/Component, but the one
				// we actually care here is just the "sap.ui.model.odata.v4.ODataModel"
			}

			if (curModel.type && [
				"sap.ui.model.odata.ODataModel",
				"sap.zen.dsh.widgets.SDKModel",
			].includes(curModel.type)) {
				this.#reporter?.addMessage(MESSAGE.DEPRECATED_CLASS, {
					className: curModel.type,
					details: `{@link ${curModel.type}}`,
				}, `/sap.ui5/models/${modelKey}/type`);
			}

			if (curModel.type === "sap.ui.model.odata.v4.ODataModel" &&
				curModel.settings && "synchronizationMode" in curModel.settings) {
				this.#reporter?.addMessage(MESSAGE.DEPRECATED_ODATA_MODEL_V4_SYNCHRONIZATION_MODE, {
					modelName: modelKey,
				}, `/sap.ui5/models/${modelKey}/settings/synchronizationMode`);
			}
		});
	}
}
