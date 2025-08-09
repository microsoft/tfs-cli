# Server Integration Tests for TFS CLI

This directory contains integration tests for TFS CLI commands that connect to Azure DevOps / TFS servers. These tests use a mock server to simulate real server interactions without requiring an actual Azure DevOps instance.

## Overview

The server integration tests are designed to:

1. **Test server connectivity**: Verify that commands properly attempt to connect to servers
2. **Test authentication flows**: Validate basic auth, PAT, and credential caching
3. **Test API interactions**: Ensure commands make appropriate API calls
4. **Test error handling**: Verify proper error messages and connection failure handling
5. **Test command-line argument validation**: Ensure required parameters are properly validated

## Mock Server

### MockDevOpsServer

The `MockDevOpsServer` class is integrated into the test suite (`tests/mock-server/`) and provides a lightweight HTTP server that mimics Azure DevOps APIs:

- **Build APIs**: List, show, queue builds and manage build definitions
- **Work Item APIs**: Create, read, update work items and execute queries  
- **Extension APIs**: Publish, show, share, install extensions
- **Task Agent APIs**: Upload, list, delete build tasks
- **Authentication**: Basic auth and PAT validation
- **Connection Data**: Mock connection endpoints

### Features

- Configurable host and port
- Authentication simulation (basic auth and PAT)
- CORS headers for browser testing
- JSON response formatting
- Proper HTTP status codes
- Mock data management

## Test Files

### server-integration-build.ts
Tests for build-related commands:
- `tfx build list` - List builds with filters
- `tfx build show` - Show build details
- `tfx build queue` - Queue new builds
- Authentication and parameter validation
- Output format testing

### server-integration-workitem.ts  
Tests for work item commands:
- `tfx workitem show` - Display work item details
- `tfx workitem create` - Create new work items
- `tfx workitem query` - Execute WIQL queries
- `tfx workitem update` - Update work item fields
- Field validation and error handling

### server-integration-extension.ts
Tests for extension marketplace commands:
- `tfx extension show` - Show extension details
- `tfx extension publish` - Publish extensions
- `tfx extension share` - Share with accounts
- `tfx extension install` - Install to accounts
- `tfx extension isvalid` - Validate extensions
- Manifest processing and validation

### server-integration-login.ts
Tests for authentication and session management:
- `tfx login` - Login with different auth types
- `tfx logout` - Clear cached credentials  
- `tfx reset` - Reset cached settings
- Credential caching with --save flag
- SSL certificate validation options
- Connection timeout handling

### server-integration-buildtasks.ts
Tests for build task management:
- `tfx build tasks list` - List build tasks
- `tfx build tasks upload` - Upload task definitions
- `tfx build tasks delete` - Remove tasks
- `tfx build tasks create` - Create task templates
- task.json validation and processing

## Running Tests

### All Server Integration Tests
```bash
npm run test:server-integration
```

### Individual Test Suites
```bash
npm run test:server-integration-build
npm run test:server-integration-workitem  
npm run test:server-integration-extension
npm run test:server-integration-login
npm run test:server-integration-buildtasks
```

### Prerequisites
The mock server is now integrated as part of the test suite and is automatically built when running tests:

1. **Run all tests (builds everything automatically):**
   ```bash
   npm test
   ```

2. **Run specific server integration tests:**
   ```bash
   npm run test:server-integration
   ```

The tests will automatically start mock servers on different ports (8081-8085) and compile the integrated mock server as needed.

## Test Strategy

### Connection Testing
Since these are integration tests without real servers, the tests primarily verify:

1. **Command parsing**: Arguments are properly parsed and validated
2. **Connection attempts**: Commands attempt to connect to specified URLs
3. **Authentication handling**: Different auth types are processed correctly
4. **Error handling**: Appropriate error messages for connection failures
5. **API call formation**: Commands form proper API requests

### Expected Behaviors
Most tests expect one of these outcomes:
- **Success with mock data**: Command connects to mock server and processes response
- **Connection error**: Command fails to connect (ECONNREFUSED, timeout, etc.)
- **Authentication error**: Command receives 401/403 from server  
- **Validation error**: Command rejects invalid parameters before attempting connection

### Mock Data
The mock server provides sample data for testing:
- Sample builds with different statuses
- Sample work items with various field types
- Sample extensions with metadata
- Sample build tasks and definitions

## Configuration

### Server Ports
Each test suite uses a different port to avoid conflicts:
- Build tests: Port 8081
- Work item tests: Port 8082  
- Extension tests: Port 8083
- Login tests: Port 8084
- Build task tests: Port 8085

### Authentication
Test credentials used:
- Username: `testuser`
- Password: `testpass` 
- PAT: `dGVzdHRva2VuOnRlc3Q=` (base64 encoded)

### Timeouts
Tests have extended timeouts (30 seconds) to accommodate:
- Server startup/shutdown
- Network connection attempts
- Command execution time

## Adding New Tests

### Creating New Test Files
1. Follow the naming pattern: `server-integration-{feature}.ts`
2. Import the mock server: `import { createMockServer, MockDevOpsServer } from './mock-server';`
3. Start server in `before()` hook with unique port
4. Stop server in `after()` hook
5. Add test scripts to package.json

### Test Patterns
```typescript
it('should test command behavior', function(done) {
    const command = `node "${tfxPath}" command --service-url "${serverUrl}" --auth-type basic --username testuser --password testpass --no-prompt`;
    
    execAsync(command)
        .then(({ stdout }) => {
            // Assert expected behavior
            assert(condition, 'Description');
            done();
        })
        .catch((error) => {
            // Handle expected connection/auth errors
            const errorOutput = stripColors(error.stderr || error.stdout || '');
            if (errorOutput.includes('Could not connect') || 
                errorOutput.includes('unable to connect')) {
                done(); // Expected connection attempt
            } else {
                done(error);
            }
        });
});
```

### Mock Server Extensions
To add new API endpoints to the integrated mock server:
1. Edit files in `tests/mock-server/` directory
2. Add route matching in the appropriate handler file
3. Implement response logic with appropriate status codes
4. Add sample data in `MockDataInitializer.ts` if needed
5. Update type interfaces in `tests/mock-server/types/` if needed

## Mock Server Verbose Logging

For detailed debugging of server integration tests, you can enable verbose logging to see all HTTP requests, responses, and mock server activity.

### Enabling Verbose Logs

1. **Modify the test file** you want to debug (e.g., `server-integration-login.ts`)
2. **Add `verbose: true`** to the `createMockServer` options:

```typescript
// Before
mockServer = await createMockServer({ port: 8084 });

// After (for debugging)
mockServer = await createMockServer({ port: 8084, verbose: true });
```

### What Verbose Logging Shows

When enabled, you'll see detailed output including:

- **Server lifecycle**: Start/stop events with URLs
- **HTTP requests**: Method, path, and obscured authorization headers
- **Request processing**: Route matching and handler execution
- **Authentication**: Auth type validation (with token obscuring for security)

### Example Verbose Output

```
Mock DevOps server listening on http://localhost:8084

Mock Server: GET /_apis/connectionData - Authorization: Basic tes***ass
[Mock Server] Handling connection data request
[Mock Server] Providing resource areas for service discovery

Mock Server: POST /_apis/wit/workitems/$Bug - Authorization: Bearer abc***xyz
[Mock Server] Creating work item of type Bug
[Mock Server] Work item created with ID: 1001

Mock DevOps server closed
Mock DevOps server stopped
```

### Security Note

Authorization tokens and passwords are automatically obscured in verbose logs:
- `testpassword` becomes `tes***ord`
- `dGVzdHRva2VuOnRlc3Q=` becomes `dGV***3Q=`

### Best Practices

1. **Temporary use only**: Enable verbose logging only during debugging
2. **Single test focus**: Enable for specific tests, not entire suites
3. **Remove before commit**: Always remove `verbose: true` before committing
4. **Combine with TFX tracing**: Use with `TFX_TRACE=1` for complete debugging

```bash
# Example debugging session
set TFX_TRACE=1
npm run test:server-integration-login
```

## Troubleshooting

### Common Issues
1. **Port conflicts**: Ensure test ports are not in use
2. **Build not found**: Run `npm run build` before testing
3. **TypeScript errors**: Ensure proper import syntax for Node.js version
4. **Test timeouts**: Increase timeout for slow systems

### Debug Tips
1. **Enable TFX tracing**: `set TFX_TRACE=1` (Windows) or `export TFX_TRACE=1` (Linux/Mac)
2. **Enable mock server verbose logging**: Add `verbose: true` to `createMockServer()` options (see Mock Server Verbose Logging section above)
3. **Combine both for complete debugging**:
   ```bash
   set TFX_TRACE=1
   npm run test:server-integration-login
   ```
4. Use `--verbose` flag with mocha for detailed test output
5. Examine command stdout/stderr in test error messages

## Limitations

### What These Tests Don't Cover
- Real Azure DevOps API compatibility
- Network reliability and retry logic
- Complex authentication flows (OAuth, certificates)
- Large file uploads/downloads
- Real-time API changes

### Mock Server Limitations  
- Simplified API responses
- No persistent data storage
- Limited error condition simulation
- No rate limiting or throttling
- Simplified authentication validation

The tests focus on command-line interface behavior and basic connectivity rather than comprehensive API testing.
