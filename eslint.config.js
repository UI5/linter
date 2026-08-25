import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import stylistic from "@stylistic/eslint-plugin";
import ava from "eslint-plugin-ava";

export default tseslint.config(
	{
		// This block defines ignore patterns globally to all configurations below
		// (therefore it can use slightly different patterns, see also the eslint "Flat Config" doc)
		ignores: [
			".husky/*",
			".github/*",
			".reuse/*",
			"docs/*",
			"rfcs/*",
			"coverage/*",

			// Exclude test files
			"test/tmp/*",
			"test/projects/*",
			"test/fixtures/*",

			// Exclude generated code
			"lib/*",
		],
	},
	// Base configs applying to JS and TS files
	eslint.configs.recommended,
	stylistic.configs.customize({
		indent: "tab",
		quotes: "double",
		semi: true,
		jsx: false,
		arrowParens: true,
		braceStyle: "1tbs",
		blockSpacing: false,
	}),
	ava.configs["flat/recommended"], {
		// Lint all JS files using the eslint parser
		files: ["**/*.js"],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: "module",
		},
	}, {
		// Lint all TS files using the typescript-eslint parser
		// Also enable all recommended typescript-eslint rules
		files: ["src/**/*.ts", "test/**/*.ts", "scripts/**/*.ts"],
		extends: [
			...tseslint.configs.recommendedTypeChecked,
			...tseslint.configs.stylisticTypeChecked,
		],
		ignores: [
			// This file is a copy of an openui5 resource which is located at
			// https://github.com/SAP/openui5/blob/master/lib/jsdoc/transformApiJson.js
			"src/formatter/lib/resolveLinks.ts",

			// This file must be excluded as it tests the package exports by
			// requiring the package itself, which causes a circular dependency
			// and TypeScript/ESlint gets confused during compilation.
			"test/e2e/package-exports.ts",

		],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: "module",
			parser: tseslint.parser,
			parserOptions: {
				project: true,
			},
		},
		rules: {
			// TypeScript specific overwrites
			// We must disable the base rule as it can report incorrect errors
			"no-unused-vars": "off",
			"@typescript-eslint/no-unused-vars": [
				"error", {
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
					caughtErrorsIgnorePattern: "^_",
				},
			],
		},
	}, {
		// To be discussed: Type-aware checks might add quite some additional work when writing tests
		// and could even require us to export types that we would otherwise not export
		files: ["test/**/*.ts"],
		rules: {
			"@typescript-eslint/no-unsafe-argument": "off",
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-call": "off",
			"@typescript-eslint/no-unsafe-enum-comparison": "off",
			"@typescript-eslint/no-unsafe-member-access": "off",
			"@typescript-eslint/no-unsafe-return": "off",
			"@typescript-eslint/no-unsafe-unary-minus": "off",
			// Passing sinon stubs by reference (e.g. to sinon.assert.callOrder) is idiomatic and safe;
			// the `this`-scoping concern does not apply to them.
			"@typescript-eslint/unbound-method": "off",
		},
	}, {
		// Overwrite any rules from the configurations above for both, JS and TS files
		rules: {
			"linebreak-style": [
				"error",
				"unix",
			],
			"@stylistic/object-curly-spacing": [
				"error",
				"never",
			],
			"@stylistic/operator-linebreak": ["error", "after"],
			"@stylistic/comma-dangle": ["error", {
				functions: "never",
				arrays: "always-multiline",
				objects: "always-multiline",
				imports: "always-multiline",
				exports: "always-multiline",
				enums: "always-multiline",
				generics: "always-multiline",
				tuples: "always-multiline",
			}],
			"max-len": [
				"error",
				{
					code: 120,
					ignoreUrls: true,
					ignoreRegExpLiterals: true,
				},
			],
			"no-implicit-coercion": [
				"error",
				{allow: ["!!"]},
			],
			"no-console": "error",
			"no-eval": "error",
			"ava/no-ignored-test-files": ["error", {
				files: [
					"test/lib/**/*.ts",
					// This additional entry is needed as the rule otherwise complains about
					// ignored test files. The files are configured in a separate ava config.
					"test/e2e/**/*.ts",
				],
			}],
		},
	}
);
