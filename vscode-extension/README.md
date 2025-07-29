# UI5 Linter for VS Code

This extension integrates the UI5 Linter into Visual Studio Code, providing real-time linting for UI5 projects.

## Features

- Automatically runs UI5 Linter on file open and save
- Displays linting errors and warnings in the editor and Problems panel
- Supports JavaScript, TypeScript, XML, JSON, and HTML files
- Provides detailed information about linting issues

## Requirements

This extension requires the UI5 Linter to be installed in the parent project. It is designed to work with the UI5 Linter project structure.

## Usage

1. Open a UI5 project in VS Code
2. The extension will automatically run the UI5 Linter on supported files when they are opened or saved
3. Linting issues will be displayed in the editor and Problems panel
4. You can also manually run the linter using the "Run UI5 Linter" command

## Extension Settings

This extension does not currently provide any configurable settings. It uses the UI5 Linter's configuration from the project.

## Known Issues

- The extension requires the UI5 Linter to be installed in the parent project
- The extension may not work correctly if the UI5 Linter's API changes

## Release Notes

### 0.0.1

Initial release of the UI5 Linter extension.
