# TFS Mock Server

A comprehensive mock server for Azure DevOps Services and Team Foundation Server, designed for testing TFS CLI and other Azure DevOps integrations.

## Features

- Mock Azure DevOps/TFS REST API endpoints
- Support for Build, Work Item, Extension, and Task Agent APIs
- Configurable authentication requirements
- Programmatic API for test integration
- CLI tool for standalone usage

## Installation

```bash
npm install @microsoft/tfs-mock-server
```

## Usage

### As a CLI Tool

```bash
# Start with default settings (port 8084)
npx tfs-mock-server

# Customize port and host
npx tfs-mock-server --port=8080 --host=0.0.0.0

# Disable authentication
npx tfs-mock-server --no-auth
```

### Programmatic Usage

```typescript
import { createMockServer, MockDevOpsServer } from '@microsoft/tfs-mock-server';

// Create and start a mock server
const server = await createMockServer({
    port: 8080,
    host: 'localhost',
    authRequired: true
});

console.log(`Server running at ${server.getBaseUrl()}`);

// Use in tests
describe('My Tests', () => {
    let mockServer: MockDevOpsServer;
    
    beforeEach(async () => {
        mockServer = await createMockServer({ port: 8080 });
    });
    
    afterEach(async () => {
        await mockServer.stop();
    });
    
    it('should connect to mock server', async () => {
        // Your test code here
        const baseUrl = mockServer.getBaseUrl();
        // Make API calls to baseUrl...
    });
});
```

## API Endpoints

The mock server implements the following Azure DevOps REST API endpoints:

### Core APIs
- `GET /_apis/resourceareas` - Resource area discovery
- `GET /_apis/connectiondata` - Connection information
- `GET /_apis/Location` - Location service

### Build APIs
- `GET /_apis/build/builds` - List builds
- `POST /_apis/build/builds` - Queue a build
- `GET /_apis/build/definitions` - List build definitions

### Work Item APIs
- `GET /{project}/_apis/wit/workitems/{id}` - Get work item
- `POST /{project}/_apis/wit/workitems/${type}` - Create work item
- `POST /{project}/_apis/wit/wiql` - Query work items

### Extension APIs
- `GET /_apis/gallery/extensions/{publisher}/{extension}` - Get extension
- `POST /_apis/gallery/extensions` - Upload extension

### Task Agent APIs
- `GET /_apis/distributedtask/tasks` - List task definitions
- `POST /_apis/distributedtask/tasks` - Upload task definition
- `DELETE /_apis/distributedtask/tasks/{id}` - Delete task definition

## Configuration Options

```typescript
interface MockServerOptions {
    port?: number;           // Server port (default: 8080)
    host?: string;           // Server host (default: 'localhost')
    authRequired?: boolean;  // Require authentication (default: true)
}
```

## Mock Data Management

The mock server includes helper methods to manage test data:

```typescript
// Add mock builds
const build = server.addBuild({
    buildNumber: 'TestBuild_001',
    status: 'completed',
    result: 'succeeded'
});

// Add mock work items
const workItem = server.addWorkItem({
    fields: {
        'System.Title': 'Test Work Item',
        'System.WorkItemType': 'Bug'
    }
});

// Clear all mock data
server.clearData();
```

## License

MIT

## Contributing

This package is part of the [TFS CLI](https://github.com/Microsoft/tfs-cli) project.
