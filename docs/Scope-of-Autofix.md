# Scope of Autofix

This document lists APIs that are not replaced or can't be replaced automatically by the UI5 linter at this time. These APIs require manual modification or special handling.

> **Note:** This list is not exhaustive; there are more APIs that are currently not replaced automatically. This document provides examples of common APIs that require manual modification.

- [Scope of Autofix](#scope-of-autofix)
	- [General Restrictions](#general-restrictions)
	- [jQuery.sap APIs](#jquerysap-apis)
	- [jQuery Plugins](#jquery-plugins)
	- [Global API Usage](#global-api-usage)
	- [Module Imports](#module-imports)
	- [Core APIs (See #619)](#core-apis-see-619)
		- [Template APIs](#template-apis)
		- [Event Handling APIs](#event-handling-apis)
		- [Error Handling APIs](#error-handling-apis)
		- [Rendering APIs](#rendering-apis)
		- [Model APIs](#model-apis)
		- [Component/Application APIs](#componentapplication-apis)
		- [Other Core APIs](#other-core-apis)
	- [Core Configuration APIs (See #620)](#core-configuration-apis-see-620)
	- [Sync to Async API Changes](#sync-to-async-api-changes)
		- [Library Loading](#library-loading)
		- [Component Creation](#component-creation)
		- [Resource Bundle Loading](#resource-bundle-loading)
		- [Other Async APIs](#other-async-apis)

## General Restrictions

- **Change from sync to async APIs** - Requires restructuring code flow (often affecting multiple files), which cannot be done automatically
- **Complex API replacements** - Some APIs require complex replacements with multiple API calls and new local variables, this is currently not supported
- **Context-dependent replacements** - Some replacements depend on how the API is used in the broader context
- **Return value usage** - Some return types or values differ, making automatic replacements impossible if the return value is used

## jQuery.sap APIs

- [**jQuery.sap.act**](https://ui5.sap.com/1.136/#/api/jQuery.sap.act%23overview) - Successor module is private, see [#563](https://github.com/UI5/linter/issues/563#issuecomment-2813018032)
- [**jQuery.sap.getObject**](https://ui5.sap.com/1.136/#/api/jQuery.sap%23methods/jQuery.sap.getObject) - No direct replacement, see [#529](https://github.com/UI5/linter/issues/529#issuecomment-2866088014)
- [**jQuery.sap.getUriParameters**](https://ui5.sap.com/1.136/#/api/jQuery.sap%23methods/jQuery.sap.getUriParameters) - No direct replacement, see [#530](https://github.com/UI5/linter/issues/530)
- [**jQuery.sap.isSpecialKey**](https://ui5.sap.com/1.136/#/api/jQuery.sap%23methods/jQuery.sap.isSpecialKey) - No direct replacement, see [#543](https://github.com/UI5/linter/issues/543#issuecomment-2865991534)
- [**jQuery.sap.registerModulePath**](https://ui5.sap.com/1.136/#/api/jQuery.sap%23methods/jQuery.sap.registerModulePath) - Currently not implemented, see [#588](https://github.com/UI5/linter/issues/588)
- [**jQuery.sap.registerResourcePath**](https://ui5.sap.com/1.136/#/api/jQuery.sap%23methods/jQuery.sap.registerResourcePath) - Currently not implemented, see [#588](https://github.com/UI5/linter/issues/588)
- [**jQuery.sap.removeUrlWhitelist**](https://ui5.sap.com/1.136/#/api/jQuery.sap%23methods/jQuery.sap.removeUrlWhitelist) - Too complex, see [#657](https://github.com/UI5/linter/issues/657#issuecomment-2983899399)

## jQuery Plugins

- [**jQuery#control**](https://ui5.sap.com/1.136/#/api/jQuery%23methods/control) - No direct replacement, see [#578](https://github.com/UI5/linter/issues/578#issuecomment-2866034841)

## Global API Usage

- **Assignments to global variables** - Cannot be replaced automatically
- **`delete` expressions on globals** - Cannot be replaced automatically, see [#668](https://github.com/UI5/linter/issues/668)

## Module Imports

- **Pseudo module imports** - Currently not implemented, see [#715](https://github.com/UI5/linter/issues/715)

## Core APIs (See [#619](https://github.com/UI5/linter/issues/619))

Many methods on the Core API (accessed via either the `sap/ui/core/Core` module import or via `sap.ui.getCore()`) cannot be replaced automatically:

### Template APIs
- [**Core#getTemplate**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Core%23methods/getTemplate) - Concept has been discarded

### Event Handling APIs
- [**Core#attachLocalizationChanged**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Core%23methods/attachLocalizationChanged) - Event object has a different API
- [**Core#detachLocalizationChanged**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Core%23methods/detachLocalizationChanged) - Event object has a different API
- [**Core#attachThemeChanged**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Core%23methods/attachThemeChanged) - Event object has a different API
- [**Core#detachThemeChanged**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Core%23methods/detachThemeChanged) - Event object has a different API
- [**Core#attachControlEvent**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Core%23methods/attachControlEvent) - Concept has been discarded
- [**Core#detachControlEvent**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Core%23methods/detachControlEvent) - Concept has been discarded

### Error Handling APIs
- [**Core#attachFormatError**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Core%23methods/attachFormatError) - Replacement only available on [ManagedObject](https://ui5.sap.com/1.136/#/api/sap.ui.base.ManagedObject)
- [**Core#attachParseError**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Core%23methods/attachParseError) - Replacement only available on [ManagedObject](https://ui5.sap.com/1.136/#/api/sap.ui.base.ManagedObject)
- [**Core#attachValidationError**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Core%23methods/attachValidationError) - Replacement only available on [ManagedObject](https://ui5.sap.com/1.136/#/api/sap.ui.base.ManagedObject)
- [**Core#attachValidationSuccess**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Core%23methods/attachValidationSuccess) - Replacement only available on [ManagedObject](https://ui5.sap.com/1.136/#/api/sap.ui.base.ManagedObject)
- [**Core#detachFormatError**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Core%23methods/detachFormatError) - Replacement only available on [ManagedObject](https://ui5.sap.com/1.136/#/api/sap.ui.base.ManagedObject)
- [**Core#detachParseError**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Core%23methods/detachParseError) - Replacement only available on [ManagedObject](https://ui5.sap.com/1.136/#/api/sap.ui.base.ManagedObject)
- [**Core#detachValidationError**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Core%23methods/detachValidationError) - Replacement only available on [ManagedObject](https://ui5.sap.com/1.136/#/api/sap.ui.base.ManagedObject)
- [**Core#detachValidationSuccess**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Core%23methods/detachValidationSuccess) - Replacement only available on [ManagedObject](https://ui5.sap.com/1.136/#/api/sap.ui.base.ManagedObject)
- [**Core#fireFormatError**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Core%23methods/fireFormatError) - Replacement only available on [ManagedObject](https://ui5.sap.com/1.136/#/api/sap.ui.base.ManagedObject)
- [**Core#fireParseError**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Core%23methods/fireParseError) - Replacement only available on [ManagedObject](https://ui5.sap.com/1.136/#/api/sap.ui.base.ManagedObject)
- [**Core#fireValidationError**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Core%23methods/fireValidationError) - Replacement only available on [ManagedObject](https://ui5.sap.com/1.136/#/api/sap.ui.base.ManagedObject)
- [**Core#fireValidationSuccess**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Core%23methods/fireValidationSuccess) - Replacement only available on [ManagedObject](https://ui5.sap.com/1.136/#/api/sap.ui.base.ManagedObject)

### Rendering APIs
- [**Core#createRenderManager**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Core%23methods/createRenderManager) - Concept has been discarded
- [**Core#getRenderManager**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Core%23methods/getRenderManager) - Concept has been discarded

### Model APIs
- [**Core#getModel**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Core%23methods/getModel) - Replacement only available on [ManagedObject](https://ui5.sap.com/1.136/#/api/sap.ui.base.ManagedObject)
- [**Core#setModel**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Core%23methods/setModel) - Replacement only available on [ManagedObject](https://ui5.sap.com/1.136/#/api/sap.ui.base.ManagedObject)
- [**Core#hasModel**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Core%23methods/hasModel) - Replacement only available on [ManagedObject](https://ui5.sap.com/1.136/#/api/sap.ui.base.ManagedObject)

### Component/Application APIs
- [**Core#getApplication**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Core%23methods/getApplication) - Concept has been discarded
- [**Core#getRootComponent**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Core%23methods/getRootComponent) - No direct replacement
- [**Core#getLoadedLibraries**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Core%23methods/getLoadedLibraries) - No direct replacement
- [**Core#getMessageManager**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Core%23methods/getMessageManager) - Different return types, manual modification necessary
- [**Core#createUIArea**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Core%23methods/createUIArea) - No direct replacement
- [**Core#getUIArea**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Core%23methods/getUIArea) - Cannot determine whether the static UIArea is requested
- [**Core#getUIDirty**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Core%23methods/getUIDirty) - Concept has been discarded

### Other Core APIs
- [**Core#applyChanges**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Core%23methods/applyChanges) - Concept has been discarded
- [**Core#includeLibraryTheme**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Core%23methods/includeLibraryTheme) - No replacement
- [**Core#isInitialized**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Core%23methods/isInitialized) - Use [Core#ready](https://ui5.sap.com/1.136/#/api/sap.ui.core.Core%23methods/ready) instead
- [**Core#isLocked**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Core%23methods/isLocked) - Concept has been discarded
- [**Core#isThemeApplied**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Core%23methods/isThemeApplied) - Developers should replace with theme-applied event
- [**Core#lock**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Core%23methods/lock) - Concept has been discarded
- [**Core#registerPlugin**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Core%23methods/registerPlugin) - Concept has been discarded
- [**Core#setRoot**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Core%23methods/setRoot) - No direct replacement
- [**Core#setThemeRoot**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Core%23methods/setThemeRoot) - No direct replacement
- [**Core#unlock**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Core%23methods/unlock) - Concept has been discarded
- [**Core#unregisterPlugin**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Core%23methods/unregisterPlugin) - Concept has been discarded
- [**Core.extend**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Core%23methods/sap.ui.core.Core.extend) - No direct replacement
- [**Core.getMetadata**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Core%23methods/sap.ui.core.Core.getMetadata) - No direct replacement

## Core Configuration APIs (See [#620](https://github.com/UI5/linter/issues/620))

Some methods on the Configuration API (accessed via either the `sap/ui/core/Configuration` module import or via `sap.ui.getCore().getConfiguration()`) cannot be replaced automatically:

- [**Configuration.applySettings**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Configuration%23methods/sap.ui.core.Configuration.applySettings) - No direct replacement
- [**Configuration.getAnimation**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Configuration%23methods/sap.ui.core.Configuration.getAnimation) - Currently not implemented, see [#620](https://github.com/UI5/linter/issues/620#issuecomment-2839292646)
- [**Configuration.getAppCacheBuster**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Configuration%23methods/sap.ui.core.Configuration.getAppCacheBuster) - No replacement
- [**Configuration.getAppCacheBusterMode**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Configuration%23methods/sap.ui.core.Configuration.getAppCacheBusterMode) - No replacement
- [**Configuration.getApplication**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Configuration%23methods/sap.ui.core.Configuration.getApplication) - Concept has been discarded
- [**Configuration.getAutoAriaBodyRole**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Configuration%23methods/sap.ui.core.Configuration.getAutoAriaBodyRole) - No replacement
- [**Configuration.getCompatibilityVersion**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Configuration%23methods/sap.ui.core.Configuration.getCompatibilityVersion) - Concept has been discarded
- [**Configuration.getDebug**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Configuration%23methods/sap.ui.core.Configuration.getDebug) - No replacement
- [**Configuration.getFileShareSupport**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Configuration%23methods/sap.ui.core.Configuration.getFileShareSupport) - No replacement
- [**Configuration.getFiori2Adaptation**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Configuration%23methods/sap.ui.core.Configuration.getFiori2Adaptation) - No replacement
- [**Configuration.getFlexibilityServices**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Configuration%23methods/sap.ui.core.Configuration.getFlexibilityServices) - Concept has been discarded
- [**Configuration.getFormatSettings**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Configuration%23methods/sap.ui.core.Configuration.getFormatSettings) - Complex replacement
- [**Configuration.getInspect**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Configuration%23methods/sap.ui.core.Configuration.getInspect) - Concept has been discarded
- [**Configuration.getManifestFirst**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Configuration%23methods/sap.ui.core.Configuration.getManifestFirst) - No replacement
- [**Configuration.getNoDuplicateIds**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Configuration%23methods/sap.ui.core.Configuration.getNoDuplicateIds) - Concept has been discarded
- [**Configuration.getOriginInfo**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Configuration%23methods/sap.ui.core.Configuration.getOriginInfo) - Concept has been discarded
- [**Configuration.getRootComponent**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Configuration%23methods/sap.ui.core.Configuration.getRootComponent) - Concept has been discarded
- [**Configuration.getStatisticsEnabled**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Configuration%23methods/sap.ui.core.Configuration.getStatisticsEnabled) - No replacement
- [**Configuration.getVersion**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Configuration%23methods/sap.ui.core.Configuration.getVersion) - Sync to async replacement

## Sync to Async API Changes

Currently, UI5 linter cannot automatically replace APIs that execute synchronously if their replacement would execute asynchronously (i.e. returns a promise). This is a general restriction as it would require restructuring the code flow. Examples include:

### Library Loading

- [**Core#loadLibrary**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Core%23methods/loadLibrary)
  - Only replaced with `sap/ui/core/Lib.load()` if `async: true` is explicitly specified
  - Synchronous library loading cannot be automatically replaced

### Component Creation

- [**Core#createComponent**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Core%23methods/createComponent)
  - Only replaced with `sap/ui/core/Component.create()` if `async: true` is explicitly specified
  - Synchronous component creation cannot be automatically replaced

### Resource Bundle Loading

- [**Core#getLibraryResourceBundle**](https://ui5.sap.com/1.136/#/api/sap.ui.core.Core%23methods/getLibraryResourceBundle)
  - Not replaced if any argument is a boolean with value true (which would make it return a promise)
  - Synchronous resource bundle loading cannot be automatically replaced with asynchronous

### Other APIs

- **Component creation**: `sap.ui.component()` → `Component.create()`
- **View creation**: `sap.ui.view()` → `View.create()`
- **Fragment loading**: `sap.ui.xmlfragment()` → `Fragment.load()`
- **XMLView loading**: `sap.ui.xmlview()` → `XMLView.create()`
- **JSONView loading**: `sap.ui.jsonview()` → `JSONView.create()`
- **JSView loading**: `sap.ui.jsview()` → `JSView.create()`
- **HTMLView loading**: `sap.ui.htmlview()` → `HTMLView.create()`
