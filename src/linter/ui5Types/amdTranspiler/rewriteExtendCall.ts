import ts from "typescript";
import {toPosStr} from "./util.js";
import {getPropertyNameText} from "../utils/utils.js";

export class UnsupportedExtendCall extends Error {
	constructor(message: string) {
		super(message);
		this.name = this.constructor.name;
	}
}

/**
 * Rewrite a UI5-typical `Class.extend("MyClass", {})` CallExpression to a ClassDeclaration
 */
export default function rewriteExtendCall(nodeFactory: ts.NodeFactory,
	callExp: ts.CallExpression, modifiers?: ts.ModifierLike[],
	className?: string | ts.Identifier): ts.ClassDeclaration | undefined {
	if (!(ts.isPropertyAccessExpression(callExp.expression) && ts.isIdentifier(callExp.expression.name) &&
		callExp.expression.name.text === "extend")) {
		return undefined;
	}
	const [extractedClassName, body] = extractInfoFromArguments(nodeFactory, callExp);
	className ??= nodeFactory.createUniqueName(extractedClassName);
	let classNamespace: string | undefined;
	const extendsName = callExp.arguments[0];
	if (extendsName && ts.isStringLiteralLike(extendsName)) {
		classNamespace = extendsName.text.split(".").slice(0, -1).join(".");
	}

	const classDecl = nodeFactory.createClassDeclaration(modifiers,
		className,
		undefined,
		[nodeFactory.createHeritageClause(
			ts.SyntaxKind.ExtendsKeyword,
			[nodeFactory.createExpressionWithTypeArguments(
				callExp.expression.expression, undefined
			)]
		)],
		body);

	if (classNamespace) {
		const jsDoc = `*\n * @namespace ${classNamespace}\n `;
		ts.addSyntheticLeadingComment(classDecl, ts.SyntaxKind.MultiLineCommentTrivia, jsDoc, true);
	}
	return classDecl;
}

function extractInfoFromArguments(
	nodeFactory: ts.NodeFactory, callExp: ts.CallExpression
): [string, ts.ClassElement[]] {
	const args = callExp.arguments;
	if (args.length === 0) {
		throw new UnsupportedExtendCall(`Missing arguments at ${toPosStr(callExp)}`);
	}
	const className = getClassNameFromArgument(args[0]);
	// Class body is optional
	const classBody: ts.ClassElement[] = args.length > 1 ? getClassBodyFromArgument(nodeFactory, args[1]) : [];
	return [className, classBody];
}

function getClassNameFromArgument(className: ts.Expression): string {
	if (!ts.isStringLiteralLike(className)) {
		throw new UnsupportedExtendCall(`Unexpected extends argument of type ${ts.SyntaxKind[className.kind]} at ` +
			toPosStr(className));
	}
	// Just like OpenUI5's ObjectPath...
	const nameSegments = className.text.split(".");
	return nameSegments[nameSegments.length - 1];
}

function getClassBodyFromArgument(nodeFactory: ts.NodeFactory, classBody: ts.Expression): ts.ClassElement[] {
	if (!ts.isObjectLiteralExpression(classBody)) {
		throw new UnsupportedExtendCall(`Unexpected extends argument of type ${ts.SyntaxKind[classBody.kind]} at ` +
			toPosStr(classBody));
	}
	if (classBody.properties.find((prop) => ts.isSpreadAssignment(prop))) {
		// TODO: Support spread elements(?)
		throw new UnsupportedExtendCall(`Unsupported spread element in extends call body`);
	}
	return classBody.properties.map((prop): ts.ClassElement | undefined => {
		if (ts.isShorthandPropertyAssignment(prop)) {
			// When a property is declared as a shorthand, create a property declaration to itself.
			const staticModifier = (ts.isIdentifier(prop.name) && ["renderer", "metadata"].includes(prop.name.text)) ?
					[nodeFactory.createToken(ts.SyntaxKind.StaticKeyword)] :
					[];
			return nodeFactory.createPropertyDeclaration(
				staticModifier, prop.name, undefined, undefined, prop.name);
		} else if (ts.isMethodDeclaration(prop)) {
			// Use method declarations as-is
			// e.g. "method() {}"

			// Special handling:
			// - renderer: *static*
			// This aligns it with how UI5 projects should declare those properties in TypeScript

			if (
				ts.isIdentifier(prop.name) && prop.name.text === "renderer" &&
				!prop.modifiers?.find((mod) => mod.kind === ts.SyntaxKind.StaticKeyword)
			) {
				// Add static modifier to renderer method
				const staticModifier = nodeFactory.createToken(ts.SyntaxKind.StaticKeyword);
				return nodeFactory.updateMethodDeclaration(prop,
					prop.modifiers ? [...prop.modifiers, staticModifier] : [staticModifier],
					prop.asteriskToken,
					prop.name, prop.questionToken, prop.typeParameters, prop.parameters, prop.type, prop.body);
			}

			return prop;
		} else if (ts.isPropertyAssignment(prop)) {
			if (ts.isFunctionExpression(prop.initializer)) {
				let modifiers: ts.ModifierLike[] | undefined;

				// Special handling:
				// - renderer: *static*
				// This aligns it with how UI5 projects should declare those properties in TypeScript
				if (
					ts.isIdentifier(prop.name) && prop.name.text === "renderer" &&
					!prop.initializer.modifiers?.find((mod) => mod.kind === ts.SyntaxKind.StaticKeyword)
				) {
					modifiers = [nodeFactory.createToken(ts.SyntaxKind.StaticKeyword)];
				}

				return nodeFactory.createMethodDeclaration(
					modifiers, undefined,
					prop.name,
					undefined, undefined,
					prop.initializer.parameters,
					undefined,
					prop.initializer.body);
			} else {
				const modifiers: ts.ModifierLike[] = [];
				const propertyName = getPropertyNameText(prop.name);
				// Special handling:
				// - metadata: *readonly static*
				// - renderer: *static*
				// This aligns it with how UI5 projects should declare those properties in TypeScript
				if (
					ts.isObjectLiteralExpression(prop.initializer) &&
					propertyName === "metadata"
				) {
					modifiers.push(nodeFactory.createToken(ts.SyntaxKind.ReadonlyKeyword));
					modifiers.push(nodeFactory.createToken(ts.SyntaxKind.StaticKeyword));
				} else if (propertyName === "renderer") {
					modifiers.push(nodeFactory.createToken(ts.SyntaxKind.StaticKeyword));
				} else if (prop.initializer.kind === ts.SyntaxKind.NullKeyword ||
					prop.initializer.kind === ts.SyntaxKind.UndefinedKeyword
				) {
					// Skip property assignments that declare a null value, in the hope
					// that tsc can infer a more useful type based on other assignment
					// in one of the methods. If we would define a class property, tsc
					// would not attempt to infer more type information.
					return;
				}

				// Assign all properties (including arrow functions) to the class prototype
				// This transformation does not reflect the runtime behavior where
				// properties are set on the Class's prototype. However, tsc won't derive *any*
				// type information from Object.defineProperty(Class.prototype, "prob", ...)
				// So the current approach works better for the static analysis

				return nodeFactory.createPropertyDeclaration(
					modifiers,
					prop.name,
					undefined, undefined,
					prop.initializer);
			}
		} else {
			throw new UnsupportedExtendCall(
				`While generating class body: Unexpected property type ${ts.SyntaxKind[prop.kind]} at ` +
				toPosStr(prop));
		}
	}).filter((_) => _) as ts.ClassElement[];
}
