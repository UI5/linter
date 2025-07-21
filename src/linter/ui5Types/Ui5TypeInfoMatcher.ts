import {BaseUi5TypeInfo, Ui5ModuleTypeInfo, Ui5NamespaceTypeInfo, Ui5TypeInfo, Ui5TypeInfoKind} from "./Ui5TypeInfo.js";

// Re-export selected interfaces as public API
export {
	Ui5TypeInfoKind,
};

export type {
	Ui5TypeInfo, BaseUi5TypeInfo, Ui5ModuleTypeInfo, Ui5NamespaceTypeInfo,
};

interface Node<T> extends BaseUi5TypeInfo {
	name: string;
	value?: T;
	children?: Node<T>[];
}

interface ModuleNode<T> extends Omit<Node<T>, "kind">, Ui5ModuleTypeInfo {
	value?: T;
	children?: Node<T>[];
}

export default class Ui5TypeInfoMatcher<ValueType> {
	private rootModules = new Map<string, ModuleNode<ValueType>>();
	private rootNamespaces = new Map<string, Node<ValueType>>();

	constructor(private libraryName?: string) {}

	getLibraryName(): string | undefined {
		return this.libraryName;
	}

	match(ui5TypeInfo: Ui5TypeInfo): ValueType | undefined {
		let filterStack = [];
		let node: Ui5TypeInfo | undefined = ui5TypeInfo;
		while (node) {
			filterStack.push(node);
			if (node.kind === Ui5TypeInfoKind.Module) {
				break;
			}
			node = node.parent;
		}
		filterStack = filterStack.reverse();
		const rootTypeInfo = filterStack[0];
		let rootNode: Node<ValueType> | undefined;
		if (rootTypeInfo.kind === Ui5TypeInfoKind.Module) {
			if (!this.libraryName || rootTypeInfo.library !== this.libraryName) {
				return;
			}
			rootNode = this.rootModules.get(rootTypeInfo.name);
		} else if (rootTypeInfo.kind === Ui5TypeInfoKind.Namespace) {
			rootNode = this.rootNamespaces.get(rootTypeInfo.name);
		} else {
			throw new Error(`Provided UI5 Type Info has an unexpected kind of root node`);
		}
		if (!rootNode) {
			return;
		}
		let matchedNode = rootNode;
		for (let i = 1; i < filterStack.length; i++) {
			const childNode = this.findChildNode(matchedNode, filterStack[i]);
			if (!childNode) {
				return; // No match
			}
			matchedNode = childNode;
		}
		return matchedNode.value;
	}

	private findChildNode(node: Node<ValueType>, typeInfo: Ui5TypeInfo): Node<ValueType> | undefined {
		if (!node.children || !("name" in typeInfo)) {
			return;
		}
		for (const child of node.children) {
			if (child.kind === typeInfo.kind && child.name === typeInfo.name) {
				return child;
			}
		}
	}

	declareModule(moduleName: string, children?: Node<ValueType>[] | ValueType, value?: ValueType): void {
		this.rootModules.set(moduleName, this.createModule(moduleName, children, value));
	}

	declareModules(moduleNames: string[], children?: Node<ValueType>[] | ValueType, value?: ValueType): void {
		for (const entityName of moduleNames) {
			this.rootModules.set(entityName, this.createModule(entityName, children, value));
		}
	}

	private createModule(
		name: string, children?: Node<ValueType>[] | ValueType, value?: ValueType
	): ModuleNode<ValueType> {
		if (!this.libraryName) {
			throw new Error("Library name must be defined to create a module node");
		}
		const moduleNode = this.createNode(Ui5TypeInfoKind.Module, name, children, value) as ModuleNode<ValueType>;
		moduleNode.library = this.libraryName;
		return moduleNode;
	}

	declareNamespace(namespace: string, children?: Node<ValueType>[] | ValueType, value?: ValueType): void {
		this.rootNamespaces.set(namespace, this.namespace(namespace, children, value));
	}

	declareNamespaces(namespaces: string[], children?: Node<ValueType>[] | ValueType, value?: ValueType): void {
		for (const moduleName of namespaces) {
			this.rootNamespaces.set(moduleName, this.namespace(moduleName, children, value));
		}
	}

	namespace(name: string, children?: Node<ValueType>[] | ValueType, value?: ValueType): Node<ValueType> {
		return this.createNode(Ui5TypeInfoKind.Namespace, name, children, value);
	}

	namespaces(names: string[], children?: Node<ValueType>[] | ValueType, value?: ValueType): Node<ValueType>[] {
		return names.map((name) => {
			return this.createNode(Ui5TypeInfoKind.Namespace, name, children, value);
		});
	}

	class(name: string, children?: Node<ValueType>[] | ValueType, value?: ValueType): Node<ValueType> {
		return this.createNode(Ui5TypeInfoKind.Class, name, children, value);
	}

	classes(names: string[], children?: Node<ValueType>[] | ValueType, value?: ValueType): Node<ValueType>[] {
		return names.map((name) => {
			return this.createNode(Ui5TypeInfoKind.Class, name, children, value);
		});
	}

	constr(children?: Node<ValueType>[] | ValueType, value?: ValueType): Node<ValueType> {
		return this.createNode(Ui5TypeInfoKind.Constructor, "constructor", children, value);
	}

	constuctorParameter(name: string, children?: Node<ValueType>[] | ValueType, value?: ValueType): Node<ValueType> {
		return this.createNode(Ui5TypeInfoKind.ConstructorParameter, name, children, value);
	}

	constructorParameters(names: string[], children?: Node<ValueType>[] | ValueType, value?: ValueType
	): Node<ValueType>[] {
		return names.map((name) => {
			return this.createNode(Ui5TypeInfoKind.ConstructorParameter, name, children, value);
		});
	}

	method(name: string, children?: Node<ValueType>[] | ValueType, value?: ValueType): Node<ValueType> {
		return this.createNode(Ui5TypeInfoKind.Method, name, children, value);
	}

	methods(names: string[], children?: Node<ValueType>[] | ValueType, value?: ValueType): Node<ValueType>[] {
		return names.map((name) => {
			return this.createNode(Ui5TypeInfoKind.Method, name, children, value);
		});
	}

	property(name: string, children?: Node<ValueType>[] | ValueType, value?: ValueType): Node<ValueType> {
		return this.createNode(Ui5TypeInfoKind.Property, name, children, value);
	}

	properties(names: string[], children?: Node<ValueType>[] | ValueType, value?: ValueType): Node<ValueType>[] {
		return names.map((name) => {
			return this.createNode(Ui5TypeInfoKind.Property, name, children, value);
		});
	}

	function(name: string, children?: Node<ValueType>[] | ValueType, value?: ValueType): Node<ValueType> {
		return this.createNode(Ui5TypeInfoKind.Function, name, children, value);
	}

	functions(names: string[], children?: Node<ValueType>[] | ValueType, value?: ValueType): Node<ValueType>[] {
		return names.map((name) => {
			return this.createNode(Ui5TypeInfoKind.Function, name, children, value);
		});
	}

	managedObjectSetting(
		name: string, children?: Node<ValueType>[] | ValueType, value?: ValueType
	): Node<ValueType> {
		return this.createNode(Ui5TypeInfoKind.ManagedObjectSettings, name, children, value);
	}

	managedObjectSettings(
		names: string[], children?: Node<ValueType>[] | ValueType, value?: ValueType
	): Node<ValueType>[] {
		return names.map((name) => {
			return this.createNode(Ui5TypeInfoKind.ManagedObjectSettings, name, children, value);
		});
	}

	metadataEvent(name: string, children?: Node<ValueType>[] | ValueType, value?: ValueType): Node<ValueType> {
		return this.createNode(Ui5TypeInfoKind.MetadataEvent, name, children, value);
	}

	metadataEvents(
		names: string[], children?: Node<ValueType>[] | ValueType, value?: ValueType
	): Node<ValueType>[] {
		return names.map((name) => {
			return this.createNode(Ui5TypeInfoKind.MetadataEvent, name, children, value);
		});
	}

	metadataProperty(name: string, children?: Node<ValueType>[] | ValueType, value?: ValueType): Node<ValueType> {
		return this.createNode(Ui5TypeInfoKind.MetadataProperty, name, children, value);
	}

	metadataProperties(
		names: string[], children?: Node<ValueType>[] | ValueType, value?: ValueType
	): Node<ValueType>[] {
		return names.map((name) => {
			return this.createNode(Ui5TypeInfoKind.MetadataProperty, name, children, value);
		});
	}

	metadataAggregation(
		name: string, children?: Node<ValueType>[] | ValueType, value?: ValueType
	): Node<ValueType> {
		return this.createNode(Ui5TypeInfoKind.MetadataAggregation, name, children, value);
	}

	metadataAggregations(
		names: string[], children?: Node<ValueType>[] | ValueType, value?: ValueType
	): Node<ValueType>[] {
		return names.map((name) => {
			return this.createNode(Ui5TypeInfoKind.MetadataAggregation, name, children, value);
		});
	}

	metadataAssociation(
		name: string, children?: Node<ValueType>[] | ValueType, value?: ValueType
	): Node<ValueType> {
		return this.createNode(Ui5TypeInfoKind.MetadataAssociation, name, children, value);
	}

	metadataAssociations(
		names: string[], children?: Node<ValueType>[] | ValueType, value?: ValueType
	): Node<ValueType>[] {
		return names.map((name) => {
			return this.createNode(Ui5TypeInfoKind.MetadataAssociation, name, children, value);
		});
	}

	enum(name: string, children?: Node<ValueType>[] | ValueType, value?: ValueType): Node<ValueType> {
		return this.createNode(Ui5TypeInfoKind.Enum, name, children, value);
	}

	enums(names: string[], children?: Node<ValueType>[] | ValueType, value?: ValueType): Node<ValueType>[] {
		return names.map((name) => {
			return this.createNode(Ui5TypeInfoKind.Enum, name, children, value);
		});
	}

	enumMember(name: string, children?: Node<ValueType>[] | ValueType, value?: ValueType): Node<ValueType> {
		return this.createNode(Ui5TypeInfoKind.EnumMember, name, children, value);
	}

	enumMembers(names: string[], children?: Node<ValueType>[] | ValueType, value?: ValueType): Node<ValueType>[] {
		return names.map((name) => {
			return this.createNode(Ui5TypeInfoKind.EnumMember, name, children, value);
		});
	}

	export(children?: Node<ValueType>[] | ValueType, value?: ValueType): Node<ValueType> {
		return this.createNode(Ui5TypeInfoKind.Export, "export", children, value);
	}

	private createNode(
		kind: Ui5TypeInfoKind, name: string, children?: Node<ValueType>[] | ValueType, value?: ValueType
	): Node<ValueType> {
		if (!Array.isArray(children)) {
			value = children;
			children = undefined;
		}
		return {
			kind,
			name,
			value,
			children,
		};
	}
}
