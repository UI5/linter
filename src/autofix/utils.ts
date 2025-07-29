import ts from "typescript";
import Fix from "../linter/ui5Types/fix/Fix.js";

export function matchPropertyAccessExpression(node: ts.PropertyAccessExpression, match: string): boolean {
	const propAccessChain: string[] = [];
	propAccessChain.push(node.expression.getText());

	let scanNode: ts.Node = node;
	while (ts.isPropertyAccessExpression(scanNode)) {
		propAccessChain.push(scanNode.name.getText());
		scanNode = scanNode.parent;
	}
	return propAccessChain.join(".") === match;
}

export function collectIdentifierDeclarations(node: ts.Node) {
	const declaredIdentifiers = new Set<string>();
	const extractDestructIdentifiers = (name: ts.BindingName, identifiers: Set<string>) => {
		if (ts.isIdentifier(name)) {
			identifiers.add(name.text);
		} else if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) {
			for (const element of name.elements) {
				if (ts.isBindingElement(element)) {
					extractDestructIdentifiers(element.name, identifiers);
				}
			}
		}
	};
	const collectIdentifiers = (node: ts.Node) => {
		if (
			ts.isVariableDeclaration(node) ||
			ts.isFunctionDeclaration(node) ||
			ts.isClassDeclaration(node)
		) {
			if (node.name && ts.isIdentifier(node.name)) {
				declaredIdentifiers.add(node.name.text);
			}
		}

		if (ts.isParameter(node) || ts.isVariableDeclaration(node)) {
			extractDestructIdentifiers(node.name, declaredIdentifiers);
		}

		ts.forEachChild(node, collectIdentifiers);
	};

	ts.forEachChild(node, collectIdentifiers);

	return declaredIdentifiers;
}

export function collectIdentifiers(node: ts.Node) {
	const identifiers = new Set<ts.Identifier>();
	const collect = (node: ts.Node) => {
		if (ts.isIdentifier(node)) {
			identifiers.add(node);
		}
		ts.forEachChild(node, collect);
	};
	ts.forEachChild(node, collect);
	return identifiers;
}

interface FixRange {
	start: number;
	end: number;
	fix: Fix;
}

export function removeConflictingFixes(fixes: Set<Fix>) {
	const fixRanges: FixRange[] = [];
	for (const fix of fixes) {
		if (!fix.getAffectedSourceCodeRange) {
			continue;
		}
		const ranges = fix.getAffectedSourceCodeRange();
		if (Array.isArray(ranges)) {
			for (const range of ranges) {
				fixRanges.push({
					start: range.start,
					end: range.end,
					fix: fix,
				});
			}
		} else if (ranges) {
			const {start, end} = ranges;
			fixRanges.push({
				start,
				end,
				fix: fix,
			});
		}
	}

	if (fixRanges.length === 0) return;

	// Sort fixRanges by start position; if start is the same, sort by end position (larger first)
	// This ultimately prioritizes larger fixes over smaller ones
	// Sometimes there are multiple fixes or a call expression chain which can each cover the same range
	fixRanges.sort((a, b) => a.start - b.start || b.end - a.end);

	let currentEnd = fixRanges[0].end;

	for (let i = 1; i < fixRanges.length; i++) {
		const fixRange = fixRanges[i];

		if (fixRange.start < currentEnd) {
			// Conflict
			fixes.delete(fixRange.fix);
		}

		currentEnd = Math.max(currentEnd, fixRange.end);
	}
}
