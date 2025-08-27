import ts from "typescript";

export default class SourceFileMetadataCollector {
	private metadata: {
		controllerInfo: {
			classNodeByPath: Map<string, ts.ClassLikeDeclaration>;
			nameToPath: Map<string, Set<string>>;
		};
	};

	constructor() {
		this.metadata = {
			controllerInfo: {
				classNodeByPath: new Map(),
				nameToPath: new Map(),
			},
		};
	}

	visitNode(node: ts.Node, sourceFile: ts.SourceFile) {
		if (ts.isClassLike(node)) {
			return this.checkControllerNamespace(node, sourceFile.fileName);
		}

		ts.forEachChild(node, (node) => {
			this.visitNode(node, sourceFile);
		});
	}

	private checkControllerNamespace(node: ts.ClassLikeDeclaration, filePath: string) {
		const jsDocs = ts.getJSDocTags(node);
		const controllerNameJSDocNode = jsDocs.find((tag) => tag.tagName.text === "namespace");
		const controllerNamespace =
			controllerNameJSDocNode && typeof controllerNameJSDocNode.comment === "string" ?
					controllerNameJSDocNode.comment.trim() :
				undefined;

		const localNameMatch = /([^/]+)\.controller\.(js|ts)$/.exec(filePath);
		const localName = localNameMatch ? localNameMatch[1] : undefined;

		const fullyQuantifiedName = [controllerNamespace, localName].filter(Boolean).join(".");

		this.metadata.controllerInfo.classNodeByPath.set(filePath, node);
		if (!this.metadata.controllerInfo.nameToPath.has(fullyQuantifiedName)) {
			this.metadata.controllerInfo.nameToPath.set(fullyQuantifiedName, new Set());
		}
		this.metadata.controllerInfo.nameToPath.get(fullyQuantifiedName)!.add(filePath);
	}

	collectControllerInfo(sourceFile: ts.SourceFile) {
		// Limit collection to only controllers
		if (!sourceFile.fileName.endsWith(".controller.js") && !sourceFile.fileName.endsWith(".controller.ts")) {
			return;
		}

		this.visitNode(sourceFile, sourceFile);
	}

	getMetadata() {
		return this.metadata;
	}
}
