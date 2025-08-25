import ts from "typescript";

export default class SourceFileMetadataCollector {
	private metadata: {
		controllerNamespace: {
			byPath: Map<string, string>;
			byNamespace: Map<string, string>;
		};
	};

	constructor() {
		this.metadata = {
			controllerNamespace: {
				byPath: new Map(),
				byNamespace: new Map(),
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

		this.metadata.controllerNamespace.byPath.set(filePath, fullyQuantifiedName);
		this.metadata.controllerNamespace.byNamespace.set(fullyQuantifiedName, filePath);
	}

	collect(sourceFile: ts.SourceFile) {
		this.visitNode(sourceFile, sourceFile);
	}

	getMetadata() {
		return this.metadata;
	}
}
