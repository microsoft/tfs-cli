# Extension Tests

This directory contains comprehensive tests for the TFS CLI extension commands.

## Test Structure

### Test Files

- **`extension-commands.ts`** - Basic tests for all extension commands including help text, basic functionality, and error handling
- **`extension-advanced.ts`** - Advanced feature tests including manifest overrides, global arguments, and resource commands  
- **`extension-complex.ts`** - Complex scenario tests with edge cases, file system handling, and validation scenarios

### Sample Extensions

- **`basic-extension/`** - Simple extension with minimal manifest and files for basic testing
- **`complex-extension/`** - More comprehensive extension with multiple contributions, scopes, and file types
- **`invalid-extension/`** - Extension with invalid manifest for testing error handling

## Running Tests

Individual test suites can be run using:

```bash
npm run test:extension-commands     # Basic command tests
npm run test:extension-advanced     # Advanced feature tests  
npm run test:extension-complex      # Complex scenario tests
```

Or run all extension tests as part of the full test suite:

```bash
npm test
```

## Test Coverage

The tests cover:

- **Command Help** - All extension commands display proper help text
- **Extension Creation** - Creating .vsix packages from manifests
- **Validation** - Extension manifest and file validation
- **Publishing** - Authentication requirements and error handling
- **Installation/Sharing** - Server commands and parameter validation
- **File System** - Path handling, spaces in paths, non-existent directories
- **Manifest Overrides** - Publisher, extension ID, version overrides
- **Output Formats** - JSON output and different verbosity levels
- **Error Handling** - Missing files, invalid manifests, authentication errors

## Sample Extension Structure

### Basic Extension
```
basic-extension/
├── vss-extension.json    # Simple manifest
├── index.html           # Main hub file
└── scripts/
    └── app.js           # Basic JavaScript
```

### Complex Extension
```
complex-extension/
├── vss-extension.json    # Full-featured manifest
├── hub.html             # Main hub
├── action.html          # Context menu action
├── scripts/             # JavaScript files
├── styles/              # CSS files
└── images/              # Image assets
```

## Notes

- Tests use the compiled CLI from `_build/tfx-cli.js`
- Temporary .vsix files are automatically cleaned up after tests
- Tests include the `--no-prompt` flag to avoid interactive prompts
- Color output is stripped for consistent assertion testing
