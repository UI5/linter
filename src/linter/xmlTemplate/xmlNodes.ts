export type Namespace = string;
export interface NamespaceDeclaration {
	localName: string | null; // null for default namespace
	namespace: Namespace;
}

// Parse the XML node by node. We only expect four types of node
// Once parsed, render the nodes as JavaScript code, starting with the leaves
export const enum NodeKind {
	Unknown = 0,
	Control = 1 << 0,
	Aggregation = 1 << 1,
	FragmentDefinition = 1 << 2,
	Template = 1 << 3,
	Xhtml = 1 << 4, // Should generally be ignored
	Svg = 1 << 5, // Should generally be ignored
}

export interface Position {
	line: number;
	column: number;
}

export interface NodeDeclaration {
	kind: NodeKind;
	name: string;
	namespace: Namespace;
	start: Position;
	end: Position;
}

export interface ControlDeclaration extends NodeDeclaration {
	kind: NodeKind.Control;
	properties: Set<PropertyDeclaration>;
	aggregations: Map<string, AggregationDeclaration>;
	variableName?: string; // Will be populated during generation phase
}

export interface AggregationDeclaration extends NodeDeclaration {
	kind: NodeKind.Aggregation;
	owner: ControlDeclaration;
	controls: ControlDeclaration[];
}

export interface FragmentDefinitionDeclaration extends NodeDeclaration {
	kind: NodeKind.FragmentDefinition;
	controls: Set<ControlDeclaration>;
}

// interface TemplateDeclaration extends NodeDeclaration {
// 	kind: NodeKind.Template
// }

export interface AttributeDeclaration {
	name: string;
	value: string;
	localNamespace?: string;
	start: Position;
	end: Position;
}

export type PropertyDeclaration = AttributeDeclaration;

export interface RequireExpression extends AttributeDeclaration {
	declarations: RequireDeclaration[];
}

export interface RequireDeclaration {
	moduleName?: string;
	variableName: string;
}

export interface NamespaceStackEntry {
	namespace: NamespaceDeclaration;
	level: number;
}
