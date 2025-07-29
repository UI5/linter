import * as vscode from 'vscode';
import * as path from 'path';

// Define the necessary interfaces locally to avoid direct imports from the main project
// These interfaces match the structure of the UI5 Linter's types
interface LintResult {
  filePath: string;
  messages: LintMessage[];
  errorCount: number;
  fatalErrorCount: number;
  warningCount: number;
}

interface LintMessage {
  ruleId: string;
  severity: LintMessageSeverity;
  message: string;
  messageDetails?: string;
  fatal?: boolean;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
}

// Enum to match the UI5 Linter's severity levels
enum LintMessageSeverity {
  Warning = 1,
  Error = 2
}

// Interface for the linter options
interface UI5LinterOptions {
  rootDir: string;
  filePatterns?: string[];
  ignorePatterns?: string[];
  details?: boolean;
  fix?: boolean;
  config?: string;
  noConfig?: boolean;
  coverage?: boolean;
  ui5Config?: string | object;
}

// Class to interact with the UI5 Linter
class UI5LinterAdapter {
  private linterEngine: any;

  private constructor() {
	// Initialize the linter engine here, e.g., by importing the UI5 Linter module
	// This is a placeholder; replace with actual initialization logic
	this.linterEngine = null; // Replace with actual linter engine initialization
  }

  static async create(): Promise<UI5LinterAdapter> {
	const adapter = new UI5LinterAdapter();

	try {
      // Use dynamic require to load the UI5 Linter
      // This avoids TypeScript compilation issues with project references
      const {UI5LinterEngine} = await import('../../lib/index.js');
      adapter.linterEngine = new UI5LinterEngine();
    } catch (error) {
		console.error('Failed to initialize UI5 Linter:', error);
		vscode.window.showErrorMessage('Failed to initialize UI5 Linter. Make sure the UI5 Linter is properly installed.');
    }
	return adapter;
  }

  async lint(options: UI5LinterOptions): Promise<LintResult[]> {
    if (!this.linterEngine) {
      return [];
    }

    try {
      return await this.linterEngine.lint(options);
    } catch (error) {
      console.error('Error running UI5 Linter:', error);
      throw error;
    }
  }
}

// Singleton instance of the UI5LinterAdapter
let linterAdapter: UI5LinterAdapter | undefined;

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
  console.log('UI5 Linter extension is now active');

  // Create a diagnostic collection to store linting problems
  const diagnosticCollection = vscode.languages.createDiagnosticCollection('ui5-linter');
  context.subscriptions.push(diagnosticCollection);

  // Register the command to manually run the linter
  const disposable = vscode.commands.registerCommand('ui5-linter.runLinter', () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      lintDocument(editor.document, diagnosticCollection);
    }
  });
  context.subscriptions.push(disposable);

  // Lint all open documents
  vscode.workspace.textDocuments.forEach(document => {
    lintDocument(document, diagnosticCollection);
  });

  // Lint documents when they are opened
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(document => {
      lintDocument(document, diagnosticCollection);
    })
  );

  // Lint documents when they are saved
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(document => {
      lintDocument(document, diagnosticCollection);
    })
  );

  // Clear diagnostics when documents are closed
  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument(document => {
      diagnosticCollection.delete(document.uri);
    })
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}

/**
 * Lints the given document and updates the diagnostic collection
 */
async function lintDocument(document: vscode.TextDocument, diagnosticCollection: vscode.DiagnosticCollection): Promise<void> {
  // Only lint supported file types
  const supportedLanguages = ['javascript', 'typescript', 'xml', 'json', 'html'];
  if (!supportedLanguages.includes(document.languageId)) {
    return;
  }

  try {
    // Get the workspace folder that contains the document
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
    if (!workspaceFolder) {
      return;
    }

    const rootDir = workspaceFolder.uri.fsPath;
    const filePath = document.uri.fsPath;
    const relativePath = path.relative(rootDir, filePath);

	if (!linterAdapter) {
		linterAdapter = await UI5LinterAdapter.create();
	}

    // Run the linter on the file
    const results = await linterAdapter.lint({
      rootDir,
      filePatterns: [relativePath],
      details: true
    });

    // Convert linter results to VS Code diagnostics
    updateDiagnostics(document, results, diagnosticCollection);
  } catch (error) {
    console.error('Error running UI5 Linter:', error);
    vscode.window.showErrorMessage(`UI5 Linter error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Converts UI5 Linter results to VS Code diagnostics
 */
function updateDiagnostics(document: vscode.TextDocument, results: LintResult[], diagnosticCollection: vscode.DiagnosticCollection): void {
  if (!results.length) {
    diagnosticCollection.delete(document.uri);
    return;
  }

  const diagnostics: vscode.Diagnostic[] = [];

  for (const result of results) {
    for (const message of result.messages) {
      const diagnostic = createDiagnosticFromMessage(document, message);
      if (diagnostic) {
        diagnostics.push(diagnostic);
      }
    }
  }

  diagnosticCollection.set(document.uri, diagnostics);
}

/**
 * Creates a VS Code diagnostic from a UI5 Linter message
 */
function createDiagnosticFromMessage(document: vscode.TextDocument, message: LintMessage): vscode.Diagnostic | null {
  // Skip messages without line/column information
  if (typeof message.line !== 'number' || typeof message.column !== 'number') {
    return null;
  }

  // Convert 1-based line/column to 0-based
  const line = Math.max(0, message.line - 1);
  const column = Math.max(0, message.column - 1);

  // Create the range for the diagnostic
  const endLine = typeof message.endLine === 'number' ? Math.max(0, message.endLine - 1) : line;
  const endColumn = typeof message.endColumn === 'number' ? Math.max(0, message.endColumn - 1) : column + 1;

  const range = new vscode.Range(line, column, endLine, endColumn);

  // Map UI5 Linter severity to VS Code DiagnosticSeverity
  let severity: vscode.DiagnosticSeverity;
  switch (message.severity) {
    case LintMessageSeverity.Error:
      severity = vscode.DiagnosticSeverity.Error;
      break;
    case LintMessageSeverity.Warning:
      severity = vscode.DiagnosticSeverity.Warning;
      break;
    default:
      severity = vscode.DiagnosticSeverity.Information;
  }

  // Create the diagnostic
  const diagnostic = new vscode.Diagnostic(
    range,
    message.message,
    severity
  );

  // Add the rule ID as the code
  diagnostic.code = message.ruleId;

  // Add message details as additional information if available
  if (message.messageDetails) {
    diagnostic.source = 'UI5 Linter';
    diagnostic.relatedInformation = [
      new vscode.DiagnosticRelatedInformation(
        new vscode.Location(document.uri, range),
        message.messageDetails
      )
    ];
  } else {
    diagnostic.source = 'UI5 Linter';
  }

  return diagnostic;
}
