import globals from "globals";

const rAllowedStartCharacter = /^[A-Za-z_]/;
const rInvalidChars = /[^A-Za-z0-9_]/g;
const reservedJSLanguageKeywords = [
	"arguments",
	"await",
	"break",
	"case",
	"catch",
	"class",
	"const",
	"continue",
	"debugger",
	"default",
	"delete",
	"do",
	"else",
	"enum",
	"eval",
	"export",
	"extends",
	"false",
	"finally",
	"for",
	"function",
	"if",
	"implements",
	"import",
	"in",
	"instanceof",
	"interface",
	"let",
	"new",
	"null",
	"package",
	"private",
	"protected",
	"public",
	"return",
	"static",
	"super",
	"switch",
	"this",
	"throw",
	"true",
	"try",
	"typeof",
	"var",
	"void",
	"while",
	"with",
	"yield",
	"object",
];
const sapReservedKeywords = ["sap"];
const reservedNativeTypes = Object.keys(globals.builtin);

const isLowerCase = function (sChar: string) {
	return sChar === sChar.toLowerCase();
};

/**
 *
 * @param usedNames
 * @param sName
 */
const alreadyExists = function (
	usedNames: string[],
	sName: string,
	additionalCheck?: (arg: string) => boolean
): boolean {
	return !!(
		usedNames.includes(sName) ||
		sapReservedKeywords.includes(sName) ||
		reservedNativeTypes.includes(sName) ||
		additionalCheck?.(sName)
	);
};

/**
 * @param sName, e.g. Date
 * @returns whether or not the name is a valid candidate
 */
export const isValidIdentifierName = function (sName: string) {
	return (
		rAllowedStartCharacter.test(sName) &&
		!reservedJSLanguageKeywords.includes(sName.toLowerCase())
	);
};

const replaceInvalidCharacters = function (sName: string) {
	sName = camelize(sName);
	return sName.replace(rInvalidChars, "_");
};

/**
 * Returns a unique name.
 * If the name has segments (separated with "." by default, e.g. a.b.c),
 * tries to find a unique name by starting with the last segment (c) and
 * adding former ones camelcasing (bC) until it is unique.
 *
 * If the name contains "-", these are replaced by camelcasing.
 * If the name contains invalid characters, they are replaced by "_".
 * If the name starts with a non-start character or is a reserved keyword,
 * the name is prefixed with "o".
 * If the name is not unique a count (starting with 0) is added as a suffix.
 *
 * @param usedNames names which are already in use and should not
 * be taken
 * @param sName module name e.g. sap.ui.model.type.Date; or already split
 * name, e.g. ["sap", "ui", "model", "type", "Date"]
 * @returns unique name which is neither reserved nor taken
 */
export const getUniqueName = function (
	usedNames: string[],
	sName: string | string[],
	splitCharacter = ".",
	additionalCheck?: (arg: string) => boolean
): string {
	// split the name (if required) and reverse, e.g. ["Date", "type", "model", "ui", "sap"]
	const aNameSplitted = (Array.isArray(sName) ? sName : sName.split(splitCharacter)).slice().reverse();
	let sResultName = "";
	const adjustCase =
		isLowerCase(aNameSplitted[0].charAt(0)) ?
			decapitalize :
				(s: string) => s;

	// make use of the whole namespace before applying prefix / suffix
	for (const segment of aNameSplitted) {
		sResultName =
			capitalize(replaceInvalidCharacters(segment)) + sResultName;

		const candidate = adjustCase(sResultName);
		if (
			isValidIdentifierName(candidate) &&
			!alreadyExists(usedNames, candidate, additionalCheck)
		) {
			return candidate;
		}
	}

	// add prefix to make it a valid name
	let candidate = adjustCase(sResultName);
	if (!isValidIdentifierName(candidate)) {
		candidate = adjustCase("O") + sResultName;
		if (!isValidIdentifierName(candidate)) {
			throw new Error(`Failed to create a valid identifier name for '${sResultName}', tried '${candidate}'`);
		}
	}
	sResultName = candidate;

	// add suffix to make it unique
	let i = 0;
	while (alreadyExists(usedNames, candidate, additionalCheck)) {
		candidate = sResultName + i;
		if (!isValidIdentifierName(candidate)) {
			throw new Error(`Invalid unique identifier name '${candidate}' for '${sResultName}'`);
		}
		i++;
	}

	return candidate;
};

/**
 * @param str input string, e.g. "asd"
 * @returns {string} first character being upper case, e.g. "Asd"
 */
const capitalize = function (str: string): string {
	if (str.length < 1) {
		return "";
	}
	return str[0].toUpperCase() + str.substring(1);
};

/**
 * @param str input string, e.g. "asd-fgh"
 * @returns {string} every character after the dash is uppercase and dash gets removed, e.g. "asdFgh"
 */
const camelize = function (str: string): string {
	if (str.includes("-")) {
		const rCamelCase = /-(.)/gi;
		return str.replace(rCamelCase, (sMatch, sChar: string) => {
			return sChar.toUpperCase();
		});
	}
	return str;
};

/**
 * @param str input string, e.g. "ASD"
 * @returns {string} first character being lower case, e.g. "aSD"
 */
const decapitalize = function (str: string): string {
	if (str.length < 1) {
		return "";
	}
	return str[0].toLowerCase() + str.substring(1);
};
