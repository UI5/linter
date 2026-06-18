import test from "ava";
import ts, {factory} from "typescript";
import {
	getPropertyNameText,
	getPropertyAssignmentInObjectLiteralExpression,
	getPropertyAssignmentsInObjectLiteralExpression,
	findClassMember,
	getSymbolForPropertyInConstructSignatures,
	isClassMethod,
	isConditionalAccess,
	isReturnValueUsed,
} from "../../../../src/linter/ui5Types/utils/utils.js";

function createProgram(code: string) {
	const compilerOptions: ts.CompilerOptions = {
		target: ts.ScriptTarget.ES2022,
		module: ts.ModuleKind.ES2022,
		skipLibCheck: true,
		lib: ["lib.es2022.d.ts", "lib.dom.d.ts"],
		allowJs: true,
		checkJs: false,
		strict: true,
		noImplicitAny: false,
		strictNullChecks: false,
		strictPropertyInitialization: false,
		rootDir: "/",
		allowSyntheticDefaultImports: true,
	};
	const host = ts.createCompilerHost(compilerOptions);
	host.getSourceFile = (fileName) => {
		if (fileName === "test.ts") {
			return ts.createSourceFile("test.ts", code, compilerOptions.target!, true, ts.ScriptKind.JS);
		}
		return undefined;
	};
	return ts.createProgram(["test.ts"], compilerOptions, host);
}

test("getPropertyNameText - string literal", (t) => {
	const node = factory.createStringLiteral("test");
	t.is(getPropertyNameText(node), "test");
});

test("getPropertyNameText - numeric literal", (t) => {
	const node = factory.createNumericLiteral(123);
	t.is(getPropertyNameText(node), "123");
});

test("getPropertyNameText - identifier", (t) => {
	const node = factory.createIdentifier("test");
	t.is(getPropertyNameText(node), "test");
});

test("getPropertyNameText - computed property name", (t) => {
	const node = factory.createComputedPropertyName(factory.createStringLiteral("test"));
	t.is(getPropertyNameText(node), "test");
});

test("getPropertyNameText - computed property name with numeric literal", (t) => {
	const node = factory.createComputedPropertyName(factory.createNumericLiteral(123));
	t.is(getPropertyNameText(node), "123");
});

test("getPropertyNameText - unary expression is not supported", (t) => {
	const node = factory.createComputedPropertyName(factory.createPrefixUnaryExpression(
		ts.SyntaxKind.MinusToken,
		factory.createNumericLiteral(123)
	));
	t.is(getPropertyNameText(node), undefined);
});

test("getSymbolForPropertyInConstructSignatures - symbol found", (t) => {
	const program = createProgram(`
		class Foo {
			constructor (options: { bar: boolean }) {
			}
		}
		new Foo({bar: true});
	`);
	const checker = program.getTypeChecker();

	const expressionStatement = program.getSourceFile("test.ts")!.statements[1] as ts.ExpressionStatement;
	const newExpression = expressionStatement.expression as ts.NewExpression;

	const classType = checker.getTypeAtLocation(newExpression.expression);
	const signatures = classType.getConstructSignatures();

	const symbol = getSymbolForPropertyInConstructSignatures(signatures, 0, "bar");

	t.truthy(symbol);
	t.is(symbol?.name, "bar");
});

test("getSymbolForPropertyInConstructSignatures - symbol not found", (t) => {
	const program = createProgram(`
		class Foo {
			constructor (options: { bar: boolean }) {
			}
		}
		new Foo({bar: true});
	`);
	const checker = program.getTypeChecker();

	const expressionStatement = program.getSourceFile("test.ts")!.statements[1] as ts.ExpressionStatement;
	const newExpression = expressionStatement.expression as ts.NewExpression;

	const classType = checker.getTypeAtLocation(newExpression.expression);
	const signatures = classType.getConstructSignatures();

	const symbol = getSymbolForPropertyInConstructSignatures(signatures, 0, "foo");

	t.is(symbol, undefined);
});

test("getSymbolForPropertyInConstructSignatures - invalid argumentPosition", (t) => {
	const program = createProgram(`
		class Foo {
			constructor (options: { bar: boolean }) {
			}
		}
		new Foo({bar: true});
	`);
	const checker = program.getTypeChecker();

	const expressionStatement = program.getSourceFile("test.ts")!.statements[1] as ts.ExpressionStatement;
	const newExpression = expressionStatement.expression as ts.NewExpression;

	const classType = checker.getTypeAtLocation(newExpression.expression);
	const signatures = classType.getConstructSignatures();

	const symbol = getSymbolForPropertyInConstructSignatures(signatures, 7, "bar");

	t.is(symbol, undefined);
});

test("findClassMember - member found", (t) => {
	const propertyDeclaration = factory.createPropertyDeclaration([], "foo", undefined, undefined, undefined);
	const classNode = factory.createClassDeclaration([], "Test", [], [], [propertyDeclaration]);
	const result = findClassMember(classNode, "foo");
	t.is(result, propertyDeclaration);
});

test("findClassMember - member not found", (t) => {
	const propertyDeclaration = factory.createPropertyDeclaration([], "bar", undefined, undefined, undefined);
	const classNode = factory.createClassDeclaration([], "Test", [], [], [propertyDeclaration]);
	const result = findClassMember(classNode, "foo");
	t.is(result, undefined);
});

test("findClassMember - with constructor", (t) => {
	const constructorDeclaration = factory.createConstructorDeclaration(undefined, [], undefined);
	const propertyDeclaration = factory.createPropertyDeclaration([], "foo", undefined, undefined, undefined);
	const classNode = factory.createClassDeclaration([], "Test", [], [], [constructorDeclaration, propertyDeclaration]);
	const result = findClassMember(classNode, "foo");
	t.is(result, propertyDeclaration);
});

test("findClassMember - with modifiers", (t) => {
	const propertyDeclaration = factory.createPropertyDeclaration([
		factory.createToken(ts.SyntaxKind.StaticKeyword),
	], "foo", undefined, undefined, undefined);
	const classNode = factory.createClassDeclaration([], "Test", [], [], [propertyDeclaration]);
	const result = findClassMember(classNode, "foo", [{modifier: ts.SyntaxKind.StaticKeyword}]);
	t.is(result, propertyDeclaration);
});

test("findClassMember - with modifiers (not)", (t) => {
	const propertyDeclaration = factory.createPropertyDeclaration([
		factory.createToken(ts.SyntaxKind.StaticKeyword),
	], "foo", undefined, undefined, undefined);
	const classNode = factory.createClassDeclaration([], "Test", [], [], [propertyDeclaration]);
	const result = findClassMember(classNode, "foo", [{not: true, modifier: ts.SyntaxKind.StaticKeyword}]);
	t.is(result, undefined);
});

test("findClassMember - with modifiers (mixed)", (t) => {
	const propertyDeclaration = factory.createPropertyDeclaration([
		factory.createToken(ts.SyntaxKind.StaticKeyword),
	], "foo", undefined, undefined, undefined);
	const classNode = factory.createClassDeclaration([], "Test", [], [], [propertyDeclaration]);
	const result = findClassMember(classNode, "foo", [
		{modifier: ts.SyntaxKind.StaticKeyword},
		{modifier: ts.SyntaxKind.AbstractKeyword, not: true},
	]);
	t.is(result, propertyDeclaration);
});

test("isClassMethod - MethodDeclaration", (t) => {
	const program = createProgram(`
		class Foo {
			bar() {
			}
		}
	`);
	const checker = program.getTypeChecker();

	const classDeclaration = program.getSourceFile("test.ts")!.statements[0] as ts.ClassDeclaration;
	const classMember = classDeclaration.members[0];

	t.true(isClassMethod(classMember, checker));
});

test("isClassMethod - PropertyDeclaration (FunctionExpression)", (t) => {
	const program = createProgram(`
		class Foo {
			bar = function() {}
		}
	`);
	const checker = program.getTypeChecker();

	const classDeclaration = program.getSourceFile("test.ts")!.statements[0] as ts.ClassDeclaration;
	const classMember = classDeclaration.members[0];

	t.true(isClassMethod(classMember, checker));
});

test("isClassMethod - PropertyDeclaration (ArrayFunction)", (t) => {
	const program = createProgram(`
		class Foo {
			bar = () => "abc"
		}
	`);
	const checker = program.getTypeChecker();

	const classDeclaration = program.getSourceFile("test.ts")!.statements[0] as ts.ClassDeclaration;
	const classMember = classDeclaration.members[0];

	t.true(isClassMethod(classMember, checker));
});

test("isClassMethod - PropertyDeclaration (Identifier)", (t) => {
	const program = createProgram(`
		function barFunction() {}
		class Foo {
			bar = barFunction
		}
	`);
	const checker = program.getTypeChecker();

	const classDeclaration = program.getSourceFile("test.ts")!.statements[1] as ts.ClassDeclaration;
	const classMember = classDeclaration.members[0];

	t.true(isClassMethod(classMember, checker));
});

test("isClassMethod - static method", (t) => {
	const program = createProgram(`
		class Foo {
			static bar() {
			}
		}
	`);
	const checker = program.getTypeChecker();

	const classDeclaration = program.getSourceFile("test.ts")!.statements[0] as ts.ClassDeclaration;
	const classMember = classDeclaration.members[0];

	t.true(isClassMethod(classMember, checker));
});

test("isClassMethod - no initializer", (t) => {
	const program = createProgram(`
		class Foo {
			bar
		}
	`);
	const checker = program.getTypeChecker();

	const classDeclaration = program.getSourceFile("test.ts")!.statements[0] as ts.ClassDeclaration;
	const classMember = classDeclaration.members[0];

	t.false(isClassMethod(classMember, checker));
});

test("isClassMethod - no MethodDeclaration or PropertyDeclaration (GetAccessor)", (t) => {
	const program = createProgram(`
		class Foo {
			get bar() {
				return "abc";
			}
		}
	`);
	const checker = program.getTypeChecker();

	const classDeclaration = program.getSourceFile("test.ts")!.statements[0] as ts.ClassDeclaration;
	const classMember = classDeclaration.members[0];

	t.false(isClassMethod(classMember, checker));
});

test("isClassMethod - no function (PropertyDeclaration with Identifier)", (t) => {
	const program = createProgram(`
		const barValue = "abc";
		class Foo {
			bar = barValue
		}
	`);
	const checker = program.getTypeChecker();

	const classDeclaration = program.getSourceFile("test.ts")!.statements[1] as ts.ClassDeclaration;
	const classMember = classDeclaration.members[0];

	t.false(isClassMethod(classMember, checker));
});

test("isClassMethod - no function (PropertyDeclaration with StringLiteral)", (t) => {
	const program = createProgram(`
		class Foo {
			bar = "abc"
		}
	`);
	const checker = program.getTypeChecker();

	const classDeclaration = program.getSourceFile("test.ts")!.statements[0] as ts.ClassDeclaration;
	const classMember = classDeclaration.members[0];

	t.false(isClassMethod(classMember, checker));
});

test("getPropertyAssignmentInObjectLiteralExpression - property found", (t) => {
	const test1 = factory.createPropertyAssignment("test1", factory.createStringLiteral("value1"));
	const node = factory.createObjectLiteralExpression([test1]);
	const result = getPropertyAssignmentInObjectLiteralExpression("test1", node);
	t.is(result, test1);
});

test("getPropertyAssignmentInObjectLiteralExpression - property not found", (t) => {
	const node = factory.createObjectLiteralExpression([]);
	const result = getPropertyAssignmentInObjectLiteralExpression("test1", node);
	t.is(result, undefined);
});

test("getPropertyAssignmentsInObjectLiteralExpression - multiple properties", (t) => {
	const node = factory.createObjectLiteralExpression([
		factory.createPropertyAssignment("test1", factory.createStringLiteral("value1")),
		factory.createPropertyAssignment("test2", factory.createStringLiteral("value2")),
	]);
	const result = getPropertyAssignmentsInObjectLiteralExpression(["test1", "test2"], node);
	t.is(result.length, 2);
	t.truthy(result[0]);
	t.truthy(result[1]);
});

test("getPropertyAssignmentsInObjectLiteralExpression - partial match", (t) => {
	const test1 = factory.createPropertyAssignment("test1", factory.createStringLiteral("value1"));
	const test3 = factory.createPropertyAssignment("test3", factory.createStringLiteral("value3"));
	const test4 = factory.createPropertyAssignment("test4", factory.createStringLiteral("value4"));
	const test5 = factory.createPropertyAssignment("test5", factory.createStringLiteral("value5"));
	const test6 = factory.createPropertyAssignment("test6", factory.createStringLiteral("value6"));
	const node = factory.createObjectLiteralExpression([
		test1, test3, test4, factory.createSpreadAssignment(factory.createIdentifier("foo")), test5, test6,
	]);
	const result = getPropertyAssignmentsInObjectLiteralExpression([
		"test0", "test1", "test2", "test3", "test4", "test5", "test6", "test7",
	], node);
	t.is(result.length, 8);
	t.deepEqual(result, [
		undefined, test1, undefined, test3, test4, test5, test6, undefined,
	]);
});

test("getPropertyAssignmentsInObjectLiteralExpression - properties not found", (t) => {
	const node = factory.createObjectLiteralExpression([]);
	const result = getPropertyAssignmentsInObjectLiteralExpression(["test1", "test2"], node);
	t.is(result.length, 2);
	t.is(result[0], undefined);
	t.is(result[1], undefined);
});

test("getPropertyAssignmentsInObjectLiteralExpression - unsupported elements", (t) => {
	const test1 = factory.createPropertyAssignment("test1", factory.createStringLiteral("value1"));
	const test2 = factory.createPropertyAssignment("test2", factory.createStringLiteral("value2"));
	const spreadAssignment = factory.createSpreadAssignment(factory.createIdentifier("foo"));
	const shorthandPropertyAssignment = factory.createShorthandPropertyAssignment("bar");
	const node = factory.createObjectLiteralExpression([
		test1, spreadAssignment, shorthandPropertyAssignment, test2,
	]);
	const result = getPropertyAssignmentsInObjectLiteralExpression(["test1", "test2"], node);
	t.is(result.length, 2);
	t.is(result[0], test1);
	t.is(result[1], test2);
});

test("isReturnValueUsed (negative): Block", (t) => {
	const program = createProgram(`
		method();
	`);
	const expressionStatement = program.getSourceFile("test.ts")!.statements[0] as ts.ExpressionStatement;
	t.false(isReturnValueUsed(expressionStatement));
});

test("isReturnValueUsed: CallExpression", (t) => {
	const program = createProgram(`
		foo(method());
	`);
	const expressionStatement = program.getSourceFile("test.ts")!.statements[0] as ts.ExpressionStatement;
	const callExpression = expressionStatement.expression as ts.CallExpression;
	const method = callExpression.arguments[0] as ts.CallExpression;
	t.true(isReturnValueUsed(method));
});

test("isReturnValueUsed: BinaryExpression", (t) => {
	const program = createProgram(`
		true && method();
	`);
	const expressionStatement = program.getSourceFile("test.ts")!.statements[0] as ts.ExpressionStatement;
	const binaryExpression = expressionStatement.expression as ts.BinaryExpression;
	t.true(isReturnValueUsed(binaryExpression.right));
});

test("isReturnValueUsed: VariableDeclaration", (t) => {
	const program = createProgram(`
		const result = method();
	`);
	const variableStatement = program.getSourceFile("test.ts")!.statements[0] as ts.VariableStatement;
	const variableDeclaration = variableStatement.declarationList.declarations[0];
	t.true(isReturnValueUsed(variableDeclaration.initializer!));
});

test("isReturnValueUsed: IfStatement", (t) => {
	const program = createProgram(`
		if (method()) {}
	`);
	const ifStatement = program.getSourceFile("test.ts")!.statements[0] as ts.IfStatement;
	t.true(isReturnValueUsed(ifStatement.expression));
});

test("isReturnValueUsed: ConditionalExpression", (t) => {
	const program = createProgram(`
		method() ? 1 : undefined;
	`);
	const expressionStatement = program.getSourceFile("test.ts")!.statements[0] as ts.ExpressionStatement;
	const conditionalExpression = expressionStatement.expression as ts.ConditionalExpression;
	t.true(isReturnValueUsed(conditionalExpression.condition));
});

test("isReturnValueUsed (negative): ConditionalExpression - whenTrue", (t) => {
	const program = createProgram(`
		condition ? method() : undefined;
	`);
	const expressionStatement = program.getSourceFile("test.ts")!.statements[0] as ts.ExpressionStatement;
	const conditionalExpression = expressionStatement.expression as ts.ConditionalExpression;
	t.false(isReturnValueUsed(conditionalExpression.whenTrue));
});

test("isReturnValueUsed: ForStatement", (t) => {
	const program = createProgram(`
		for (let i = 0; method(); i++) {}
	`);
	const forStatement = program.getSourceFile("test.ts")!.statements[0] as ts.ForStatement;
	t.true(isReturnValueUsed(forStatement.condition!));
});

test("isReturnValueUsed: WhileStatement", (t) => {
	const program = createProgram(`
		while (method()) {}
	`);
	const whileStatement = program.getSourceFile("test.ts")!.statements[0] as ts.WhileStatement;
	t.true(isReturnValueUsed(whileStatement.expression));
});

test("isReturnValueUsed (negative): WhileStatement statement", (t) => {
	const program = createProgram(`
		while (true) method()
	`);
	const whileStatement = program.getSourceFile("test.ts")!.statements[0] as ts.WhileStatement;
	t.false(isReturnValueUsed(whileStatement.statement));
});

test("isReturnValueUsed: DoStatement", (t) => {
	const program = createProgram(`
		do {} while (method());
	`);
	const whileStatement = program.getSourceFile("test.ts")!.statements[0] as ts.WhileStatement;
	t.true(isReturnValueUsed(whileStatement.expression));
});

test("isReturnValueUsed: VariableStatement - multiple declarations", (t) => {
	const program = createProgram(`
		const result1 = method(), result2 = method();
	`);
	const variableStatement = program.getSourceFile("test.ts")!.statements[0] as ts.VariableStatement;
	const variableDeclarations = variableStatement.declarationList.declarations;
	t.true(isReturnValueUsed(variableDeclarations[0].initializer!));
	t.true(isReturnValueUsed(variableDeclarations[1].initializer!));
});

test("isReturnValueUsed: ParenthesizedExpression", (t) => {
	const program = createProgram(`
		(method());
	`);
	const expressionStatement = program.getSourceFile("test.ts")!.statements[0] as ts.ExpressionStatement;
	const parenthesizedExpression = expressionStatement.expression as ts.ParenthesizedExpression;
	t.true(isReturnValueUsed(parenthesizedExpression.expression));
});

test("isReturnValueUsed: ReturnStatement", (t) => {
	const program = createProgram(`
		function foo() {
			return method();
		}
	`);
	const functionDeclaration = program.getSourceFile("test.ts")!.statements[0] as ts.FunctionDeclaration;
	const returnStatement = functionDeclaration.body!.statements[0] as ts.ReturnStatement;
	t.true(isReturnValueUsed(returnStatement.expression!));
});

test("isReturnValueUsed: ThrowStatement", (t) => {
	const program = createProgram(`
		function foo() {
			throw method();
		}
	`);
	const functionDeclaration = program.getSourceFile("test.ts")!.statements[0] as ts.FunctionDeclaration;
	const throwStatement = functionDeclaration.body!.statements[0] as ts.ThrowStatement;
	t.true(isReturnValueUsed(throwStatement.expression));
});

test("isReturnValueUsed: ArrowFunction", (t) => {
	const program = createProgram(`
		const foo = () => method();
	`);
	const variableStatement = program.getSourceFile("test.ts")!.statements[0] as ts.VariableStatement;
	const variableDeclaration = variableStatement.declarationList.declarations[0];
	const arrowFunction = variableDeclaration.initializer as ts.ArrowFunction;
	t.true(isReturnValueUsed(arrowFunction.body));
});

test("isReturnValueUsed: PropertyAssignment in ObjectLiteralExpression", (t) => {
	const program = createProgram(`
		const obj = { method: method() };
	`);

	const variableStatement = program.getSourceFile("test.ts")!.statements[0] as ts.VariableStatement;
	const variableDeclaration = variableStatement.declarationList.declarations[0];
	const objectLiteralExpression = variableDeclaration.initializer as ts.ObjectLiteralExpression;
	const propertyAssignment = objectLiteralExpression.properties[0] as ts.PropertyAssignment;

	t.true(isReturnValueUsed(propertyAssignment.initializer));
});

test("isReturnValueUsed: ComputedPropertyName in ObjectLiteralExpression", (t) => {
	const program = createProgram(`
		const obj = { [method()]: "value" };
	`);

	const variableStatement = program.getSourceFile("test.ts")!.statements[0] as ts.VariableStatement;
	const variableDeclaration = variableStatement.declarationList.declarations[0];
	const objectLiteralExpression = variableDeclaration.initializer as ts.ObjectLiteralExpression;
	const propertyAssignment = objectLiteralExpression.properties[0] as ts.PropertyAssignment;
	const computedPropertyName = propertyAssignment.name as ts.ComputedPropertyName;

	t.true(isReturnValueUsed(computedPropertyName.expression));
});

test("isReturnValueUsed (negative): CallExpression nested in ObjectLiteralExpression", (t) => {
	const program = createProgram(`
		const obj = {
			method: () => {
				method()
			}
		};
	`);

	const variableStatement = program.getSourceFile("test.ts")!.statements[0] as ts.VariableStatement;
	const variableDeclaration = variableStatement.declarationList.declarations[0];
	const objectLiteralExpression = variableDeclaration.initializer as ts.ObjectLiteralExpression;
	const propertyAssignment = objectLiteralExpression.properties[0] as ts.PropertyAssignment;
	const arrowFunc = propertyAssignment.initializer as ts.ArrowFunction;
	const block = arrowFunc.body as ts.Block;

	t.false(isReturnValueUsed(block.statements[0]));
});

test("isReturnValueUsed: Chaining in PropertyAccessExpression", (t) => {
	const program = createProgram(`
		sap.ui.getCore().getConfiguration().getLanguage();
	`);

	const expressionStatement = program.getSourceFile("test.ts")!.statements[0] as ts.ExpressionStatement;
	const firstPropertyAccessExpression = expressionStatement.expression as ts.PropertyAccessExpression;
	const secondPropertyAccessExpression = firstPropertyAccessExpression.expression as ts.PropertyAccessExpression;

	t.true(isReturnValueUsed(secondPropertyAccessExpression));
});

test("isReturnValueUsed: SwitchStatement", (t) => {
	const program = createProgram(`
		switch (method()) {
			case 1:
				break;
			case 2:
				break;
			default:
				break;
		}
	`);

	const switchStatement = program.getSourceFile("test.ts")!.statements[0] as ts.SwitchStatement;
	t.true(isReturnValueUsed(switchStatement.expression));
});

test("isReturnValueUsed (negative): SwitchStatement", (t) => {
	const program = createProgram(`
		switch (foo) {
			case 1:
				method();
				break;
			case 2:
				break;
			default:
				break;
		}
	`);

	const switchStatement = program.getSourceFile("test.ts")!.statements[0] as ts.SwitchStatement;
	const clause = switchStatement.caseBlock.clauses[0] as ts.CaseClause;
	t.false(isReturnValueUsed(clause.statements[0]));
});

// Positive tests for isConditionalAccess
test("isConditionalAccess: AccessExpression in IfStatement", (t) => {
	const program = createProgram(`
		if (sap.m.Button) {}
	`);

	const ifStatement = program.getSourceFile("test.ts")!.statements[0] as ts.IfStatement;
	const sapMButtonPropertyAccessExpression = ifStatement.expression as ts.PropertyAccessExpression;

	t.true(isConditionalAccess(sapMButtonPropertyAccessExpression));
});
test("isConditionalAccess: AccessExpression in ConditionalExpression condition", (t) => {
	const program = createProgram(`
		sap.m.Button ? new sap.m.Button() : undefined;
	`);

	const expressionStatement = program.getSourceFile("test.ts")!.statements[0] as ts.ExpressionStatement;
	const conditionalExpression = expressionStatement.expression as ts.ConditionalExpression;
	const sapMButtonPropertyAccessExpression = conditionalExpression.condition as ts.PropertyAccessExpression;

	t.true(isConditionalAccess(sapMButtonPropertyAccessExpression));
});
test("isConditionalAccess: AccessExpression in BinaryExpression (left && right)", (t) => {
	const program = createProgram(`
		const Container = sap.ushell && sap.ushell.Container;
	`);

	const variableStatement = program.getSourceFile("test.ts")!.statements[0] as ts.VariableStatement;
	const variableDeclaration = variableStatement.declarationList.declarations[0];
	const binaryExpression = variableDeclaration.initializer as ts.BinaryExpression;
	const sapUshellPropertyAccessExpression = binaryExpression.left as ts.PropertyAccessExpression;
	const sapUshellContainerPropertyAccessExpression = binaryExpression.right as ts.PropertyAccessExpression;

	t.true(isConditionalAccess(sapUshellPropertyAccessExpression));
	t.true(isConditionalAccess(sapUshellContainerPropertyAccessExpression));
});
test("isConditionalAccess: AccessExpression with QuestionDotToken (Conditional Chaining) / 1", (t) => {
	const program = createProgram(`
		sap.m?.Button;
	`);

	const expressionStatement = program.getSourceFile("test.ts")!.statements[0] as ts.ExpressionStatement;
	const sapMButtonPropertyAccessExpression = expressionStatement.expression as ts.PropertyAccessExpression;

	t.true(isConditionalAccess(sapMButtonPropertyAccessExpression));
});
test("isConditionalAccess: AccessExpression with QuestionDotToken (Conditional Chaining) / 2", (t) => {
	const program = createProgram(`
		sap.ui.layout?.form.SimpleForm;
	`);

	const expressionStatement = program.getSourceFile("test.ts")!.statements[0] as ts.ExpressionStatement;
	const sapUiLayoutFormSimpleFormAccessExpression = expressionStatement.expression as ts.PropertyAccessExpression;

	t.true(isConditionalAccess(sapUiLayoutFormSimpleFormAccessExpression));
});

// Negative tests for isConditionalAccess
test("isConditionalAccess: AccessExpression in ExpressionStatement (Negative)", (t) => {
	const program = createProgram(`
		sap.m.Button;
	`);

	const expressionStatement = program.getSourceFile("test.ts")!.statements[0] as ts.ExpressionStatement;
	const sapMButtonPropertyAccessExpression = expressionStatement.expression as ts.PropertyAccessExpression;

	t.false(isConditionalAccess(sapMButtonPropertyAccessExpression));
});
test("isConditionalAccess: AccessExpression in IfStatement (Negative)", (t) => {
	const program = createProgram(`
		if (sap.m.Button.prototype.onclick) {}
	`);

	const ifStatement = program.getSourceFile("test.ts")!.statements[0] as ts.IfStatement;
	const sapMButtonPropertyAccessExpression =
		((ifStatement.expression as ts.PropertyAccessExpression).expression as ts.PropertyAccessExpression)
			.expression as ts.PropertyAccessExpression;

	t.false(isConditionalAccess(sapMButtonPropertyAccessExpression));
});
test("isConditionalAccess: AccessExpression in VariableDeclaration (Negative)", (t) => {
	const program = createProgram(`
		const Button = sap.m.Button;
	`);

	const variableStatment = program.getSourceFile("test.ts")!.statements[0] as ts.VariableStatement;
	const sapMButtonPropertyAccessExpression =
		variableStatment.declarationList.declarations[0].initializer as ts.PropertyAccessExpression;
	const sapMPropertyAccessExpression =
		sapMButtonPropertyAccessExpression.expression as ts.PropertyAccessExpression;

	t.false(isConditionalAccess(sapMButtonPropertyAccessExpression));
	t.false(isConditionalAccess(sapMPropertyAccessExpression));
});
