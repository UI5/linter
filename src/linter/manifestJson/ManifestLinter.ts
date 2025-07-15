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
		this.#analyzeManifest1(manifest);

		if (manifest?._version?.startsWith("2.")) {
			this.#analyzeManifest2(manifest);
		} else {
			this.#reporter?.addMessage(MESSAGE.NO_OUTDATED_MANIFEST_VERSION, {} as never);

			const ui5MinVersion = manifest?.["sap.ui5"]?.dependencies?.minUI5Version ?? "0";
			const [major, minor] = ui5MinVersion.split(".").map(Number);

			if (major === 1 && minor < 136) {
				// ERROR: Update UI5 version to at least 1.136
				// this.#reporter?.addMessage(MESSAGE.NO_OUTDATED_MANIFEST_VERSION);
			}
		}
	}

	#analyzeManifest2(manifest: SAPJSONSchemaForWebApplicationManifestFile) {
		const removed = [
			["*", "_version"],
			["sap.apf"],
			["sap.wda"],
			["sap.gui"],
			["sap.wcf"],
			["sap.flp", "origin"],
			["sap.copilot", "digitalAssistant"],
			["sap.map"],
			["sap.card", "designtime"],
			["sap.card", "content", "columns", "*", "url"],
			["sap.card", "content", "columns", "*", "target"],
			["sap.card", "content", "columns", "*", "text"],
		];

		const checkRemovedManifestProps = (manifestChunk: Record<string, unknown> | undefined,
			removedEntry: string[], propName: string[]) => {
			if (!manifestChunk) {
				return;
			}

			for (const key of Object.keys(manifestChunk)) {
				if (key === removedEntry[0] || removedEntry[0] === "*") {
					if (removedEntry.length === 1 && manifestChunk[key] !== undefined) {
						this.#reporter?.addMessage(MESSAGE.NO_REMOVED_MANIFEST_PROPERTY, {
							propName: [...propName, key].join("/"),
						}, "/" + [...propName, key].join("/"));
					} else {
						checkRemovedManifestProps(manifestChunk[key] as Record<string, unknown>,
							removedEntry.slice(1), [...propName, key]);
					}
				}
			}
		};
		for (const removedEntry of removed) {
			checkRemovedManifestProps(manifest as unknown as Record<string, unknown>, removedEntry, []);
		}

		if ((manifest?.["sap.ui5"]?.resources?.js ?? []).length > 0) {
			// TODO: Add correct message:
			// no longer supported, if it is empty it can be removed, if not
			// the application has to adjust their code base to load the module
			// in a sap.ui.define call e.g. in the Component.js, manifest can not
			// be migrated as long as code is not adjusted
		} else if (manifest?.["sap.ui5"]?.resources?.js !== undefined) {
			this.#reporter?.addMessage(MESSAGE.NO_REMOVED_MANIFEST_PROPERTY, {
				propName: "/sap.ui5/resources/js",
			}, "/sap.ui5/resources/js");
		}

		if (manifest?.["sap.ui5"]?.rootView?.async === true) {
			this.#reporter?.addMessage(MESSAGE.NO_REMOVED_MANIFEST_PROPERTY, {
				propName: "/sap.ui5/resources/js",
			}, "/sap.ui5/resources/js");
		} else if (manifest?.["sap.ui5"]?.rootView?.async !== undefined) {
			// TODO: Add correct message:
			// no longer supported, implicit new default value (true), removed from schema,
			// if value is already true it can be removed, if not, application has to adjusted
			// manually to leverage async routView
		}

		if (manifest?.["sap.ui5"]?.routing?.config?.async === true) {
			this.#reporter?.addMessage(MESSAGE.NO_REMOVED_MANIFEST_PROPERTY, {
				propName: "/sap.ui5/resources/js",
			}, "/sap.ui5/resources/js");
		} else if (manifest?.["sap.ui5"]?.routing?.config?.async !== undefined) {
			// TODO: Add correct message:
			// no longer supported, implicit new default value (true), removed from schema,
			// if value is already true it can be removed, if not, application has to adjusted
			// manually to leverage async routView
		}

		if (["XML", "JS"].includes(manifest?.["sap.ui5"]?.rootView?.type) &&
			manifest?.["sap.ui5"]?.rootView?.name?.startsWith("module:")) {
			this.#reporter?.addMessage(MESSAGE.NO_REMOVED_MANIFEST_PROPERTY, {
				propName: "/sap.ui5/rootView/type",
			}, "/sap.ui5/rootView/type");
		}

		if (manifest?.["sap.flp"]?.tileSize !== undefined) {
			this.#reporter?.addMessage(MESSAGE.NO_RENAMED_MANIFEST_PROPERTY, {
				propName: "sap.flp/tileSize",
				newName: "sap.flp/vizOptions/displayFormats",
			}, "/sap.flp/tileSize");
		}

		if (manifest?.["sap.ovp"]?.globalFilterEntityType !== undefined) {
			this.#reporter?.addMessage(MESSAGE.NO_RENAMED_MANIFEST_PROPERTY, {
				propName: "sap.ovp/globalFilterEntityType",
				newName: "sap.ovp/globalFilterEntitySet",
			}, "/sap.ovp/globalFilterEntityType");
		}

		// TODO: The same for all other properties/values in sap.card section
		if (manifest?.["sap.card"]?.data?.request?.cache?.noStore !== undefined) {
			this.#reporter?.addMessage(MESSAGE.NO_RENAMED_MANIFEST_PROPERTY, {
				propName: "sap.card/data/request/cache/noStore",
				newName: "sap.card/data/request/cache/enabled",
			}, "/sap.card/data/request/cache/noStore");
		}

		// TODO: /sap.card/content/columns/*/identifier/:
		// No object is supported containing properties with name „url“ or „target“
	}

	#analyzeManifest1(manifest: SAPJSONSchemaForWebApplicationManifestFile) {
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
			this.#reporter?.addMessage(MESSAGE.DEPRECATED_VIEW_TYPE, {
				viewType: rootView.type,
			}, "/sap.ui5/rootView/type");
		}

		// Detect deprecated view type in routing.config:
		if (routing?.config && routing.config.viewType && deprecatedViewTypes.includes(routing.config.viewType)) {
			this.#reporter?.addMessage(MESSAGE.DEPRECATED_VIEW_TYPE, {
				viewType: routing.config.viewType,
			}, "/sap.ui5/routing/config/viewType");
		}

		// Detect deprecations in routing.targets:
		const targets = routing?.targets;
		if (targets) {
			for (const [key, target] of Object.entries(targets)) {
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
			this.#reporter?.addMessage(MESSAGE.DEPRECATED_MANIFEST_JS_RESOURCES, "/sap.ui5/resources/js");
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
