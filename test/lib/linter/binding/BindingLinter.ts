import anyTest, {TestFn} from "ava";
import BindingLinter from "../../../../src/linter/binding/BindingLinter.js";
import LinterContext from "../../../../src/linter/LinterContext.js";

const test = anyTest as TestFn<{
	linterContext: LinterContext;
	bindingLinter: BindingLinter;
}>;

test.beforeEach((t) => {
	t.context.linterContext = new LinterContext({
		rootDir: "/",
	});
	t.context.bindingLinter = new BindingLinter("/test.js", t.context.linterContext);
});

test("XML Property Binding: Global Formatter", (t) => {
	const {bindingLinter, linterContext} = t.context;

	// Accessing formatter functions using global notation is no longer supported
	bindingLinter.lintPropertyBinding(`{
		path: 'invoice>Status',
		formatter: 'ui5.walkthrough.model.formatter.statusText'
	}`, [], {line: 1, column: 1});

	t.snapshot(linterContext.generateLintResult("/test.js"));
});

test.only("XML Property Binding: JS build-ins", (t) => {
	const {bindingLinter, linterContext} = t.context;
	const standardGlobals = [
		"Array",
		"Boolean",
		"Date",
		"parseInt",
		"parseFloat",
		"JSON.stringify",
		"Math",
		"Number",
		"Object",
		"String",
		"RegExp",
	];

	let line = 1;
	for (const globalRef of standardGlobals) {
		bindingLinter.lintPropertyBinding(`{path: 'invoice>Status', formatter: '${globalRef}'}`,
			[], {line: line++, column: 1});
	}

	t.snapshot(linterContext.generateLintResult("/test.js"));
});

test("XML Property Binding: Global Formatter with bind call", (t) => {
	const {bindingLinter, linterContext} = t.context;

	// Accessing formatter functions using global notation is no longer supported
	bindingLinter.lintPropertyBinding(`{
		path: 'invoice>Status',
		formatter: 'ui5.walkthrough.model.formatter.statusText.bind($controller)'
	}`, [], {line: 1, column: 1});

	t.snapshot(linterContext.generateLintResult("/test.js"));
});

test("XML Property Binding: Controller Formatter", (t) => {
	const {bindingLinter, linterContext} = t.context;

	// Formatter functions on the controller can be referenced using a dot "." prefix
	bindingLinter.lintPropertyBinding(`{
		path: 'invoice>Status',
		formatter: '.statusText'
	}`, [{
		moduleName: "some/formatter/module",
		variableName: "unusedFormatter",
	}], {line: 1, column: 1});

	t.snapshot(linterContext.generateLintResult("/test.js"));
});

test("XML Property Binding: Imported Formatter", (t) => {
	const {bindingLinter, linterContext} = t.context;

	// Formatter functions of properly imported modules can be accessed using the variable name
	bindingLinter.lintPropertyBinding(`{
		path: 'invoice>Status',
		formatter: 'Formatter.statusText'
	}`, [{
		moduleName: "some/formatter/module",
		variableName: "Formatter",
	}], {line: 1, column: 1});

	t.snapshot(linterContext.generateLintResult("/test.js"));
});

test("XML Property Binding: Imported Formatter with bind call", (t) => {
	const {bindingLinter, linterContext} = t.context;

	// Formatter functions of properly imported modules can be accessed using the variable name
	bindingLinter.lintPropertyBinding(`{
		path: 'invoice>Status',
		formatter: 'Formatter.statusText.bind($controller)'
	}`, [{
		moduleName: "some/formatter/module",
		variableName: "Formatter",
	}], {line: 1, column: 1});

	t.snapshot(linterContext.generateLintResult("/test.js"));
});

test("XML Property Binding: Global Event Handler", (t) => {
	const {bindingLinter, linterContext} = t.context;

	bindingLinter.lintPropertyBinding(`{
		path: '/firstName',
		events: {
			dataRequested: 'global.onMyDataRequested'
		}
	}`, [], {line: 1, column: 1});

	t.snapshot(linterContext.generateLintResult("/test.js"));
});

test("XML Property Binding: Controller Event Handler", (t) => {
	const {bindingLinter, linterContext} = t.context;

	bindingLinter.lintPropertyBinding(`{
		path: '/firstName',
		events: {
			dataRequested: '.onMyDataRequested'
		}
	}`, [], {line: 1, column: 1});

	t.snapshot(linterContext.generateLintResult("/test.js"));
});

test("XML Property Binding: Imported Event Handler", (t) => {
	const {bindingLinter, linterContext} = t.context;

	bindingLinter.lintPropertyBinding(`{
		path: '/firstName',
		events: {
			dataRequested: 'Handler.onMyDataRequested'
		}
	}`, [{
		moduleName: "some/event/handler",
		variableName: "Handler",
	}], {line: 1, column: 1});

	t.snapshot(linterContext.generateLintResult("/test.js"));
});

test("XML Aggregation Binding: Global Sorter", (t) => {
	const {bindingLinter, linterContext} = t.context;

	bindingLinter.lintAggregationBinding(`{
		path: '/firstName',
		sorter: {
			group: 'global.method'
		}
	}`, [], {line: 1, column: 1});

	bindingLinter.lintAggregationBinding(`{
		path: '/firstName',
		sorter: [{
			group: 'global.method'
		}, {
			comparator: 'global.method'
		}, {
			group: true
		}]
	}`, [], {line: 20, column: 1});

	t.snapshot(linterContext.generateLintResult("/test.js"));
});

test("XML Aggregation Binding: Controller Sorter", (t) => {
	const {bindingLinter, linterContext} = t.context;

	bindingLinter.lintAggregationBinding(`{
		path: '/firstName',
		sorter: {
			group: '.method'
		}
	}`, [], {line: 1, column: 1});

	t.snapshot(linterContext.generateLintResult("/test.js"));
});

test("XML Aggregation Binding: Imported Sorter", (t) => {
	const {bindingLinter, linterContext} = t.context;

	bindingLinter.lintAggregationBinding(`{
		path: '/firstName',
		sorter: {
			group: 'Handler.method'
		}
	}`, [{
		moduleName: "some/event/handler",
		variableName: "Handler",
	}], {line: 1, column: 1});

	t.snapshot(linterContext.generateLintResult("/test.js"));
});

test("XML Aggregation Binding: Global Filter", (t) => {
	const {bindingLinter, linterContext} = t.context;

	bindingLinter.lintAggregationBinding(`{
		path: '/firstName',
		filters: {
			test: 'global.method'
		}
	}`, [], {line: 1, column: 1});

	bindingLinter.lintAggregationBinding(`{
		path: '/firstName',
		filters: [{
			test: 'global.method'
		}, {
			filters: [{
				test: 'global.method',
				condition: [{
					test: 'global.method'
				}, {
					filters: [{
						test: 'global.method'
					}]
				}]
			}]
		}]
	}`, [], {line: 20, column: 1});

	t.snapshot(linterContext.generateLintResult("/test.js"));
});

test("XML Aggregation Binding: Controller Filter", (t) => {
	const {bindingLinter, linterContext} = t.context;

	bindingLinter.lintAggregationBinding(`{
		path: '/firstName',
		filters: {
			test: '.method'
		}
	}`, [], {line: 1, column: 1});

	t.snapshot(linterContext.generateLintResult("/test.js"));
});

test("XML Aggregation Binding: Imported Filter", (t) => {
	const {bindingLinter, linterContext} = t.context;

	bindingLinter.lintAggregationBinding(`{
		path: '/firstName',
		filters: {
			test: 'Handler.method'
		}
	}`, [{
		moduleName: "some/event/handler",
		variableName: "Handler",
	}], {line: 1, column: 1});

	t.snapshot(linterContext.generateLintResult("/test.js"));
});

test("XML Aggregation Binding: Global Factory", (t) => {
	const {bindingLinter, linterContext} = t.context;

	bindingLinter.lintAggregationBinding(`{
		path: '/firstName',
		factory: 'global.method'
	}`, [], {line: 1, column: 1});

	t.snapshot(linterContext.generateLintResult("/test.js"));
});

test("XML Aggregation Binding: Controller Factory", (t) => {
	const {bindingLinter, linterContext} = t.context;

	bindingLinter.lintAggregationBinding(`{
		path: '/firstName',
		factory: '.method'
	}`, [], {line: 1, column: 1});

	t.snapshot(linterContext.generateLintResult("/test.js"));
});

test("XML Aggregation Binding: Imported Factory", (t) => {
	const {bindingLinter, linterContext} = t.context;

	bindingLinter.lintAggregationBinding(`{
		path: '/firstName',
		factory: 'Handler.method'
	}`, [{
		moduleName: "some/event/handler",
		variableName: "Handler",
	}], {line: 1, column: 1});

	t.snapshot(linterContext.generateLintResult("/test.js"));
});

test("XML Aggregation Binding: Global Group Header Factory", (t) => {
	const {bindingLinter, linterContext} = t.context;

	bindingLinter.lintAggregationBinding(`{
		path: '/firstName',
		groupHeaderFactory: 'global.method'
	}`, [], {line: 1, column: 1});

	t.snapshot(linterContext.generateLintResult("/test.js"));
});

test("XML Aggregation Binding: Controller Group Header Factory", (t) => {
	const {bindingLinter, linterContext} = t.context;

	bindingLinter.lintAggregationBinding(`{
		path: '/firstName',
		groupHeaderFactory: '.method'
	}`, [], {line: 1, column: 1});

	t.snapshot(linterContext.generateLintResult("/test.js"));
});

test("XML Aggregation Binding: Imported Group Header Factory", (t) => {
	const {bindingLinter, linterContext} = t.context;

	bindingLinter.lintAggregationBinding(`{
		path: '/firstName',
		groupHeaderFactory: 'Handler.method'
	}`, [{
		moduleName: "some/event/handler",
		variableName: "Handler",
	}], {line: 1, column: 1});

	t.snapshot(linterContext.generateLintResult("/test.js"));
});

test("XML Property Binding: Composite Binding with single formatter / type and trailing space", (t) => {
	const {bindingLinter, linterContext} = t.context;

	bindingLinter.lintPropertyBinding(
		`{
			parts:[{
				path: 'entityDetailsModel>/AdditionalMeasures'
			}, {
				path: 'entityDetailsModel>/DataSource/AllProperties'
			}],
			formatter: 'global.formatter',
			type: 'sap.ui.model.type.String'
		} `,
		[], {line: 1, column: 1});

	t.snapshot(linterContext.generateLintResult("/test.js"));
});

test("XML Property Binding: Composite Binding with multiple formatters / types", (t) => {
	const {bindingLinter, linterContext} = t.context;

	bindingLinter.lintPropertyBinding(
		`{
			parts:[{
				path: 'entityDetailsModel>/AdditionalMeasures',
				type: 'sap.ui.model.type.Currency',
				formatter: 'global.formatter1'
			}, {
				path: 'entityDetailsModel>/DataSource/AllProperties',
				type: 'sap.ui.model.type.String',
				formatter: 'global.formatter2'
			}]
		}`,
		[], {line: 1, column: 1});

	t.snapshot(linterContext.generateLintResult("/test.js"));
});

test("XML Property Binding: Composite Binding with mixed parts", (t) => {
	const {bindingLinter, linterContext} = t.context;

	bindingLinter.lintPropertyBinding(
		`{
			parts:[
				{
					path: 'entityDetailsModel>/AdditionalMeasures',
					type: 'sap.ui.model.type.Currency',
					formatter: 'global.formatter1'
				},
				'just/a/binding/path'
			]
		}`,
		[], {line: 1, column: 1});

	t.snapshot(linterContext.generateLintResult("/test.js"));
});

test("XML Property Binding: Composite Binding in between text", (t) => {
	const {bindingLinter, linterContext} = t.context;

	bindingLinter.lintPropertyBinding(
		`Hello Mr. {
			path:'/singleEntry/firstName',
			formatter: 'global.myFormatter'
		},
		{
			/singleEntry/lastName
		}"`,
		[], {line: 1, column: 1});

	t.snapshot(linterContext.generateLintResult("/test.js"));
});

test("XML Expression Binding", (t) => {
	const {bindingLinter, linterContext} = t.context;

	bindingLinter.lintPropertyBinding(
		"{= formatMessage(${i18n>SELECT_ALL},${local>/sections/selectCount}, ${local>/sections/totalCount})}",
		[], {line: 1, column: 1});

	t.snapshot(linterContext.generateLintResult("/test.js"));
});

test("XML Expression Binding with encoded ampersand", (t) => {
	const {bindingLinter, linterContext} = t.context;

	bindingLinter.lintPropertyBinding(
		"{= ${PrdcssrSuccssrSemanticObjTxt} !== '' && ${PrdcssrSuccssrSemanticActnTxt} !== '' }",
		[], {line: 1, column: 1});

	t.snapshot(linterContext.generateLintResult("/test.js"));
});

test("XML Expression Binding with odata function calls", (t) => {
	const {bindingLinter, linterContext} = t.context;

	bindingLinter.lintPropertyBinding(
		"{= odata.uriEncode(%{myvalue1},'Edm.String') + ' - ' + odata.uriEncode(%{myvalue2},'Edm.String') }",
		[], {line: 1, column: 1});

	t.snapshot(linterContext.generateLintResult("/test.js"));
});

test("XML Expression Binding with unknown odata function call", (t) => {
	const {bindingLinter, linterContext} = t.context;

	bindingLinter.lintPropertyBinding(
		"{= odata.foo(%{myvalue1},'Edm.String') }",
		[], {line: 1, column: 1});

	t.snapshot(linterContext.generateLintResult("/test.js"));
});

test("XML Expression Binding with nested unknown odata function call", (t) => {
	const {bindingLinter, linterContext} = t.context;

	bindingLinter.lintPropertyBinding(
		"{= odata.foo.bar(%{myvalue1},'Edm.String') }",
		[], {line: 1, column: 1});

	t.snapshot(linterContext.generateLintResult("/test.js"));
});

test("Error Testing: XML Property Binding missing closing bracket", (t) => {
	const {bindingLinter, linterContext} = t.context;

	bindingLinter.lintPropertyBinding(
		`{ type: 'sap.ui.model.odata.type.DateTime', constraints: { displayFormat: 'Date', nullable: false }`,
		[], {line: 1, column: 1});

	t.snapshot(linterContext.generateLintResult("/test.js"));
});

test("Error Testing: Escaped JSON (escaped opening bracket)", (t) => {
	const {bindingLinter, linterContext} = t.context;

	bindingLinter.lintPropertyBinding(
		`\\{"foo": "bar"}`,
		[], {line: 1, column: 1});

	t.snapshot(linterContext.generateLintResult("/test.js"));
});

test("Error Testing: Escaped JSON (escaped opening/closing brackets)", (t) => {
	const {bindingLinter, linterContext} = t.context;

	bindingLinter.lintPropertyBinding(
		`\\{"foo": "bar"\\}`,
		[], {line: 1, column: 1});

	t.snapshot(linterContext.generateLintResult("/test.js"));
});
