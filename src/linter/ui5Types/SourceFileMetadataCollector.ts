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
			this.addControllerClass(node, sourceFile.fileName);
		}
		ts.forEachChild(node, (child) => {
			this.visitNode(child, sourceFile);
		});
	}

	addControllerClass(node: ts.ClassLikeDeclaration, filePath: string) {
		const localNameMatch = /([^/]+)\.controller\.(js|ts)$/.exec(filePath);
		const localName = localNameMatch ? localNameMatch[1] : undefined;
		if (!localName) {
			// Not a controller file, ignore
			return;
		}

		const jsDocs = ts.getJSDocTags(node);
		const controllerNameJSDocNode = jsDocs.find((tag) => tag.tagName.text === "namespace");
		const controllerNamespace =
			controllerNameJSDocNode && typeof controllerNameJSDocNode.comment === "string" ?
					controllerNameJSDocNode.comment.trim() :
				undefined;

		const fullyQuantifiedName = [controllerNamespace, localName].filter(Boolean).join(".");

		// Stashing the node here is safe until we use the same ts.Program instance
		// We must ensure that the node will be released within the same program lifecycle,
		// otherwise we may encounter memory leaks or stale references
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
