# Node CLI for Azure DevOps

> NOTE: If you are looking for the new _Azure DevOps CLI_, see [vsts-cli](https://github.com/microsoft/vsts-cli)

[![NPM version](https://badge.fury.io/js/tfx-cli.svg)](http://badge.fury.io/js/tfx-cli)

This is a command-line utility for interacting with _Microsoft Team Foundation Server_ and _Azure DevOps Services_ (formerly _VSTS_). It is cross platform and supported on _Windows_, _MacOS_, and _Linux_.

## Setup

First, download and install [Node.js](http://nodejs.org) 4.0.x or later and npm (included with the installer)

### Linux/OSX

```bash
sudo npm install -g tfx-cli
```

### Windows

```bash
npm install -g tfx-cli
```

## Commands

To see the list of commands:

```bash
tfx
```

For help with an individual command:

```bash
tfx <command> --help
```

> Help info is dynamically generated, so it should always be the most up-to-date authority.

### Command sets

* `tfx build` ([builds](docs/builds.md)): Queue, view, and get details for builds.
* `tfx build tasks` ([build tasks](docs/buildtasks.md)): Create, list, upload and delete build tasks.
* `tfx extension` ([extensions](docs/extensions.md)): Package, manage, publish _Team Foundation Server_ / _Azure DevOps_ extensions.
* `tfx workitem` ([work items](docs/workitems.md)): Create, query and view work items.

### Login

To avoid providing credentials with every command, you can login once. Currently supported credential types: _Personal Access Tokens_ and _basic authentication credentials_.

> NTLM support is under consideration
>
> Warning! Using this feature will store your login credentials on disk in plain text.
>
> To skip certificate validation connecting to on-prem _Azure DevOps Server_ use the `--skip-cert-validation` parameter.

#### Personal access token

Start by [creating a Personal Access Token](http://roadtoalm.com/2015/07/22/using-personal-access-tokens-to-access-visual-studio-online) and paste it into the login command.

```bash
~$ tfx login
Copyright Microsoft Corporation

> Service URL: {url}
> Personal access token: xxxxxxxxxxxx
Logged in successfully
```

Examples of valid URLs are:

* `https://marketplace.visualstudio.com`
* `https://youraccount.visualstudio.com/DefaultCollection`

#### Basic auth

You can also use basic authentication by passing the `--auth-type basic` parameter (see [Configuring Basic Auth](docs/configureBasicAuth.md) for details).

### Settings cache

To avoid providing options with every command, you can save them to a settings file by adding the `--save` flag.

```bash
~$ tfx build list --project MyProject --definition-name println --top 5 --save

...

id              : 1
definition name : TestDefinition
requested by    : Teddy Ward
status          : NotStarted
queue time      : Fri Aug 21 2015 15:07:49 GMT-0400 (Eastern Daylight Time)

~$ tfx build list
Copyright Microsoft Corporation

...

id              : 1
definition name : TestDefinition
requested by    : Teddy Ward
status          : NotStarted
queue time      : Fri Aug 21 2015 15:07:49 GMT-0400 (Eastern Daylight Time)
```

If you used `--save` to set a default value for an option, you may need to override it by explicitly providing a different value. You can clear any saved settings by running `tfx reset`.


### Troubleshooting & Verbose Logging

#### CLI Trace Output
To see detailed tracing output from the CLI, set the `TFX_TRACE` environment variable and then run commands. This may provide clues to the issue and can be helpful when logging an issue.

**Linux/OSX:**
```bash
export TFX_TRACE=1
```
**Windows:**
```bash
set TFX_TRACE=1
```
**PowerShell:**
```bash
$env:TFX_TRACE=1
```

#### Debug Output from Tests
To enable detailed debug output for all CLI commands executed during tests, set the `DEBUG_CLI_OUTPUT` environment variable to `true`:

**Linux/OSX:**
```bash
export DEBUG_CLI_OUTPUT=true
```
**Windows:**
```bash
set DEBUG_CLI_OUTPUT=true
```
**PowerShell:**
```bash
$env:DEBUG_CLI_OUTPUT='true'
```
This will print detailed command execution logs for every CLI call made by the test suite.

#### Mock Server Verbose Logging
To enable verbose logging for the integrated mock server (used in server integration tests), set the `DEBUG_MOCKSERVER_OUTPUT` environment variable to `true`:

**Linux/OSX:**
```bash
export DEBUG_MOCKSERVER_OUTPUT=true
```
**Windows:**
```bash
set DEBUG_MOCKSERVER_OUTPUT=true
```
**PowerShell:**
```bash
$env:DEBUG_MOCKSERVER_OUTPUT='true'
```
This will print detailed request/response and lifecycle logs from the mock server during test runs.

All three variables (`TFX_TRACE`, `DEBUG_CLI_OUTPUT`, `DEBUG_MOCKSERVER_OUTPUT`) are also available as pipeline variables in the Azure DevOps pipeline and default to `false`.

## Development

### Building from Source

To build the project from source:

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the main project:**
   ```bash
   npm run build
   ```
   
   This compiles the TypeScript source files in the `app/` directory to JavaScript in the `_build/` directory using the TypeScript compiler and copies necessary files.

3. **Clean build artifacts (optional):**
   ```bash
   npm run clean
   ```

### Testing

The project includes comprehensive tests, including server integration tests with an integrated mock server. To run them:

1. **Build the project first (required):**
   ```bash
   npm run build
   ```

2. **Run all tests:**
   ```bash
   npm test
   ```
   
   This builds the test files and runs all test suites.

3. **Run specific test suites:**
   ```bash
   npm run test:build-commands
   npm run test:extension-commands
   npm run test:commandline
   npm run test:server-integration
   ```

4. **Run tests with CI reporter:**
   ```bash
   npm run test:ci
   ```

**Note:** The mock server is now integrated as part of the test suite in the `tests/mock-server/` directory and is automatically compiled when running tests. No separate build step is required for the mock server.

### Enabling Mock Server Verbose Logging

For debugging server integration tests, you can enable verbose logging for the mock server to see detailed request/response information. This requires modifying the test files temporarily:

1. **Locate the test file** you want to debug (e.g., `tests/server-integration-login.ts`)

2. **Find the `createMockServer` call** in the `before()` hook:
   ```typescript
   // Current call
   mockServer = await createMockServer({ port: 8084 });
   
   // Add verbose option
   mockServer = await createMockServer({ port: 8084, verbose: true });
   ```

3. **Run the specific test** to see verbose output:
   ```bash
   npm run test:server-integration-login
   ```

4. **Verbose output will include:**
   - HTTP method and path for each request
   - Authorization headers (with tokens obscured for security)
   - Mock server lifecycle events
   - Request processing details

**Example verbose output:**
```
Mock DevOps server listening on http://localhost:8084
Mock Server: GET /_apis/connectionData - Authorization: Basic tes***ass
Mock Server: POST /_apis/build/builds - Authorization: Bearer abc***xyz
Mock DevOps server closed
```

**Important:** Remember to remove the `verbose: true` option before committing your changes, as it's intended for debugging purposes only.

### Testing Your Changes Locally

After building, you can test your changes locally in several ways:

1. **Using Node.js directly:**
   ```bash
   node _build/tfx-cli.js
   node _build/tfx-cli.js --help
   ```

2. **Using npm link for global installation:**
   ```bash
   npm link
   tfx
   ```

   **To remove the link when done testing:**
   ```bash
   npm unlink -g tfx-cli
   ```

The built executable is located at `_build/tfx-cli.js` and serves as the main entry point for the CLI.

## Contributing

We accept contributions and fixes via Pull Requests. Please read the [Contributions guide](docs/contributions.md) for more details.

## Code of Conduct

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
