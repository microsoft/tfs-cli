# TFS Mock Server

A comprehensive mock server for Azure DevOps Services and Team Foundation Server, designed for testing TFS CLI and other Azure DevOps integrations.

## ✨ Features

- 🎯 **Complete API Coverage**: Mock Azure DevOps/TFS REST API endpoints
- 🔧 **Multiple API Domains**: Build, Work Item, Extension, and Task Agent APIs
- 🔐 **Configurable Auth**: Optional authentication requirements
- 🧪 **Test Integration**: Programmatic API for seamless test integration
- 📦 **CLI Tool**: Standalone usage with command-line interface
- 🏗️ **Modular Architecture**: Clean, maintainable, and extensible codebase

## 📦 Installation

```bash
npm install @microsoft/tfs-mock-server
```

## 🚀 Quick Start

### CLI Usage

```bash
# Start with default settings (port 8084)
npx tfs-mock-server

# Customize port and host
npx tfs-mock-server --port=8080 --host=0.0.0.0

# Disable authentication
npx tfs-mock-server --no-auth --port=3000

# Show help
npx tfs-mock-server --help
```

The CLI provides enhanced startup output:
```
✓ TFS Mock Server is running!
  URL: http://localhost:8084
  Collection URL: http://localhost:8084/DefaultCollection

Available endpoints:
  GET  /_apis/resourceareas          - Service discovery
  GET  /_apis/connectiondata         - Connection info
  GET  /_apis/build/builds           - List builds
  POST /_apis/build/builds           - Queue build
  GET  /_apis/build/definitions      - List build definitions
  GET  /health                       - Health check

Press Ctrl+C to stop
```

### Programmatic Usage

```typescript
import { createMockServer, MockDevOpsServer } from '@microsoft/tfs-mock-server';

// Quick start - create and start server
const server = await createMockServer({
    port: 8080,
    host: 'localhost',
    authRequired: true
});

console.log(`Server running at ${server.getBaseUrl()}`);
console.log(`Collection URL: ${server.getCollectionUrl()}`);

// Stop the server when done
await server.stop();
```

## 🧪 Test Integration

The mock server is designed for seamless integration with your tests and is extensively used in TFS CLI integration tests.

### Basic Test Setup

```typescript
import { createMockServer, MockDevOpsServer } from '@microsoft/tfs-mock-server';

describe('Azure DevOps Integration Tests', () => {
    let mockServer: MockDevOpsServer;
    
    beforeEach(async () => {
        mockServer = await createMockServer({ port: 8080 });
    });
    
    afterEach(async () => {
        await mockServer.stop();
    });
    
    it('should connect to mock server', async () => {
        const baseUrl = mockServer.getBaseUrl();
        const response = await fetch(`${baseUrl}/health`);
        expect(response.status).toBe(200);
    });
});
```

### Advanced Test Data Management

```typescript
describe('Build API Tests', () => {
    let mockServer: MockDevOpsServer;
    
    beforeEach(async () => {
        mockServer = await createMockServer({ port: 8080 });
        
        // Setup test data
        mockServer.addBuild({
            buildNumber: 'TestBuild_001',
            status: 'completed',
            result: 'succeeded',
            project: { id: 'test-proj', name: 'TestProject' }
        });
    });
    
    afterEach(async () => {
        await mockServer.stop();
    });
    
    it('should return build information', async () => {
        const build = mockServer.getBuildById(1);
        expect(build.buildNumber).toBe('TestBuild_001');
        expect(build.status).toBe('completed');
    });
});
```

### Integration with TFS CLI Tests

The mock server is used extensively in TFS CLI integration tests:

```typescript
// Example from tests/server-integration-build.ts
import { createMockServer, MockDevOpsServer } from '@microsoft/tfs-mock-server';

describe('TFS CLI Build Commands', function() {
    let mockServer: MockDevOpsServer;
    let serverUrl: string;
    
    before(async function() {
        // Start mock server on a specific port
        mockServer = await createMockServer({ 
            port: 8086,
            authRequired: false 
        });
        serverUrl = mockServer.getCollectionUrl();
    });

    after(async function() {
        if (mockServer) {
            await mockServer.stop();
        }
    });

    it('should execute build commands', async function() {
        // TFS CLI connects to mock server
        const result = await execTfxCommand([
            'build', 'list', 
            '--server', serverUrl
        ]);
        
        assert.strictEqual(result.exitCode, 0);
    });
});
```

### Integration Test Files in TFS CLI

The mock server integrates with these TFS CLI test files:

1. **tests/server-integration-build.ts** - Build API integration tests
2. **tests/server-integration-buildtasks.ts** - Build task API tests  
3. **tests/server-integration-extension.ts** - Extension API tests
4. **tests/server-integration-login.ts** - Authentication tests
5. **tests/focused-login-test.ts** - Focused authentication scenarios

### Common Integration Patterns

#### Pattern 1: Basic Test Setup
```typescript
describe('API Tests', () => {
    let mockServer: MockDevOpsServer;
    
    beforeEach(async () => {
        mockServer = await createMockServer({ port: 8080 });
    });
    
    afterEach(async () => {
        await mockServer.stop();
    });
});
```

#### Pattern 2: Pre-populated Data
```typescript
beforeEach(async () => {
    mockServer = await createMockServer({ port: 8080 });
    
    // Add test data
    mockServer.addBuild({
        buildNumber: 'TestBuild_001',
        status: 'completed',
        result: 'succeeded'
    });
});
```

#### Pattern 3: Dynamic Port Assignment
```typescript
beforeEach(async () => {
    // Use port 0 for OS-assigned port
    mockServer = await createMockServer({ port: 0 });
    const actualPort = mockServer.getPort();
    console.log(`Server started on port ${actualPort}`);
});
```

### Test Environment Setup

#### Environment Variables
```bash
# Set mock server URL for tests
export TFS_MOCK_SERVER_URL="http://localhost:8084"
export TFS_TEST_MODE="true"
```

#### In Test Scripts
```bash
# Start mock server in background
npx tfs-mock-server --port=8084 --no-auth &
MOCK_PID=$!

# Run your tests
npm test

# Clean up
kill $MOCK_PID
```

#### Docker Integration
```dockerfile
# Dockerfile for containerized testing
FROM node:16
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build

# Start mock server
EXPOSE 8084
CMD ["npx", "tfs-mock-server", "--port=8084", "--host=0.0.0.0", "--no-auth"]
```

## 📡 API Endpoints

The mock server implements comprehensive Azure DevOps REST API endpoints:

### 🔍 Service Discovery & Core APIs
```http
GET  /_apis/resourceareas              # Resource area discovery
GET  /_apis/resourceareas/{areaId}     # Specific resource area info  
GET  /_apis/connectiondata             # Connection information
GET  /_apis/Location                   # Location service
GET  /health                           # Server health check
```

### 🏗️ Build APIs
```http
# Builds
GET  /_apis/build/builds                    # List all builds
GET  /_apis/build/builds/{id}               # Get specific build
POST /_apis/build/builds                    # Queue a new build
GET  /{project}/_apis/build/builds          # List project builds
POST /{project}/_apis/build/builds          # Queue build in project

# Build Definitions  
GET  /_apis/build/definitions               # List build definitions
GET  /_apis/build/definitions/{id}          # Get build definition
GET  /{project}/_apis/build/definitions     # List project definitions
```

### 📝 Work Item APIs
```http
GET   /{project}/_apis/wit/workitems           # List work items
GET   /{project}/_apis/wit/workitems/{id}      # Get work item by ID
POST  /{project}/_apis/wit/workitems           # Create work item
PATCH /{project}/_apis/wit/workitems/{id}      # Update work item
POST  /{project}/_apis/wit/workitems/${type}   # Create work item by type
```

### 🔌 Extension APIs
```http
# Gallery/Marketplace
GET  /_apis/gallery/extensions                    # Browse extensions
GET  /_apis/gallery/extensions/{pub}/{ext}       # Get specific extension
POST /_apis/gallery/extensions                   # Publish extension

# Extension Management
GET  /_apis/extensionmanagement/installedextensions           # List installed
GET  /_apis/extensionmanagement/installedextensions/{pub}/{ext}  # Get installed
POST /_apis/extensionmanagement/installedextensions           # Install extension
```

### 🤖 Task Agent APIs
```http
GET    /_apis/distributedtask/tasks        # List task definitions
GET    /_apis/distributedtask/tasks/{id}   # Get task definition
POST   /_apis/distributedtask/tasks        # Upload task definition  
DELETE /_apis/distributedtask/tasks/{id}   # Delete task definition
```

## 🎯 Sample API Calls

Here are example HTTP requests you can make to the mock server:

### Health Check
```bash
curl http://localhost:8084/health
```

### List Builds
```bash
curl http://localhost:8084/_apis/build/builds
```

### Get Resource Areas (Service Discovery)
```bash
curl http://localhost:8084/_apis/resourceareas
```

### Queue a Build
```bash
curl -X POST http://localhost:8084/_apis/build/builds \
  -H "Content-Type: application/json" \
  -d '{"definition": {"id": 1}}'
```

### Create Work Item
```bash
curl -X POST http://localhost:8084/TestProject/_apis/wit/workitems/Task \
  -H "Content-Type: application/json-patch+json" \
  -d '[{"op":"add","path":"/fields/System.Title","value":"Test Task"}]'
```

## ⚙️ Configuration Options

```typescript
interface MockServerOptions {
    port?: number;           // Server port (default: 8080, CLI default: 8084)
    host?: string;           // Server host (default: 'localhost')
    authRequired?: boolean;  // Require authentication (default: true)
}
```

### Configuration Examples

```typescript
// Basic configuration
const server = await createMockServer({
    port: 9000,
    host: '0.0.0.0'
});

// Development configuration (no auth required)
const devServer = await createMockServer({
    port: 8080,
    authRequired: false
});

// Test configuration (random port)
const testServer = await createMockServer({
    port: 0  // OS will assign available port
});
```

## 📊 Mock Data Management

The mock server provides powerful APIs to manage test data programmatically:

### Build Management
```typescript
// Add builds
const build = server.addBuild({
    buildNumber: 'TestBuild_001',
    status: 'completed',
    result: 'succeeded',
    definition: { id: 1, name: 'My Build Definition' },
    project: { id: 'proj-1', name: 'MyProject' }
});

// Get builds
const builds = server.dataStore.getBuilds();
const buildById = server.getBuildById(1);
const projectBuilds = server.dataStore.getBuildsByProject('MyProject');
```

### Work Item Management
```typescript
// Add work items
const workItem = server.addWorkItem({
    fields: {
        'System.Title': 'Sample Bug',
        'System.WorkItemType': 'Bug',
        'System.State': 'Active',
        'System.AssignedTo': 'testuser@example.com'
    }
});

// Get work items
const workItems = server.dataStore.getWorkItems();
const workItemById = server.getWorkItemById(1);
```

### Data Reset
```typescript
// Clear all mock data and reinitialize with defaults
server.clearData();

// Or clear specific data types
server.dataStore.clearAll();
```

## 🔧 Common Use Cases

### 1. API Development Testing
```typescript
// Test API client against mock server
const client = new AzureDevOpsClient(mockServer.getBaseUrl());
const builds = await client.getBuilds();
expect(builds).toBeDefined();
```

### 2. CLI Command Testing
```typescript
// Test CLI commands
const result = await execCommand([
    'tfx', 'build', 'list', 
    '--server', mockServer.getBaseUrl()
]);
expect(result.exitCode).toBe(0);
```

### 3. Integration Testing
```typescript
// Full integration test
describe('End-to-End Tests', () => {
    let mockServer: MockDevOpsServer;
    
    before(async () => {
        mockServer = await createMockServer({ 
            port: 8084,
            authRequired: false 
        });
        
        // Setup complete test scenario
        setupTestBuilds(mockServer);
        setupTestWorkItems(mockServer);
    });
});
```

### 4. Performance Testing
```typescript
// Load testing setup
describe('Performance Tests', () => {
    it('should handle concurrent requests', async () => {
        const requests = Array(100).fill(0).map(async () => {
            return fetch(`${mockServer.getBaseUrl()}/_apis/build/builds`);
        });
        
        const responses = await Promise.all(requests);
        responses.forEach(res => expect(res.status).toBe(200));
    });
});
```

## 🏗️ Architecture

The mock server features a **modular, maintainable architecture** that was refactored from a single 1,514-line file into 18 organized components:

```
src/
├── MockDevOpsServer.ts          # Main server orchestrator
├── types/                       # TypeScript interfaces  
├── data/                        # Data storage & initialization
├── handlers/                    # API endpoint handlers
├── components/                  # Infrastructure components
└── utils/                       # Shared utilities
```

### Key Architectural Benefits:
- **Separation of Concerns**: Each component has a single responsibility
- **Extensibility**: Easy to add new API endpoints or modify behavior
- **Testability**: Components can be unit tested in isolation
- **Maintainability**: Clear file organization and consistent patterns

For detailed architecture information, see [ARCHITECTURE.md](./ARCHITECTURE.md).

### Adding New API Endpoints

1. **Create a new handler** in `src/handlers/`:
```typescript
export class CustomHandler extends BaseRouteHandler {
    public getRoutes(): RouteHandler[] {
        return [{
            pattern: '/custom/endpoint',
            method: 'GET', 
            handler: (context) => this.handleCustom(context)
        }];
    }
}
```

2. **Register the handler** in `RouteManager.ts`:
```typescript
const customHandler = new CustomHandler(dataStore, port);
this.handlers.push(...customHandler.getRoutes());
```

### Adding New Data Types

1. **Define types** in `src/types/index.ts`
2. **Update data store** in `src/data/MockDataStore.ts`
3. **Add initialization** in `src/data/MockDataInitializer.ts`

## 🐛 Troubleshooting

### Common Issues

1. **Port conflicts**: Use different ports for parallel tests
2. **Server not stopping**: Ensure proper cleanup in test teardown
3. **Auth issues**: Disable auth for tests with `authRequired: false`
4. **Timeout errors**: Increase test timeouts for slow operations

### Debug Tips

```typescript
// Enable debug logging
process.env.DEBUG = 'mock-server*';

// Check server status
console.log('Server running:', mockServer.isRunning());
console.log('Server URL:', mockServer.getBaseUrl());
```

### CLI Troubleshooting

The enhanced CLI provides helpful error messages:

```bash
# Invalid port
npx tfs-mock-server --port=invalid
# Error: Port must be a valid number between 1 and 65535

# Port in use
npx tfs-mock-server --port=8080
# ✗ Failed to start TFS Mock Server:
# EADDRINUSE: Port 8080 is already in use. Try a different port with --port=<number>

# Permission denied
npx tfs-mock-server --port=80
# ✗ Failed to start TFS Mock Server:
# Permission denied. Try using a port number above 1024 or run as administrator.
```

## 🤝 Contributing

This package is part of the [TFS CLI](https://github.com/Microsoft/tfs-cli) project. 

### Development Setup
```bash
# Clone the repository  
git clone https://github.com/Microsoft/tfs-cli.git
cd tfs-cli/packages/tfs-mock-server

# Install dependencies
npm install

# Build the package
npm run build

# Run the CLI locally
node bin/start-mock-server.js --port=8080
```

### Running Tests
```bash
# Run integration tests that use the mock server
cd ../..  # Back to tfs-cli root
npm test

# Run specific test suites
npm run test:server-integration
npm run test:server-integration-build
npm run test:server-integration-extension
```

### Clean Build Process

The TFS CLI main project includes mock server cleanup:

```bash
# Clean both main project and mock server
npm run clean  # Removes _build, _tests, and packages/tfs-mock-server/lib

# Build with clean mock server
npm run build:tests  # Builds mock server first, then tests
```

## 📝 Recent Updates

### CLI Enhancements
- ✨ Enhanced help system with `--help` flag
- 🔧 Input validation for ports and arguments  
- 📊 Professional startup messages with endpoint list
- 🛡️ Improved error handling for common issues
- 🔄 Graceful shutdown handling

### Architecture Refactoring
- 🏗️ Refactored from single 1,514-line file to modular architecture
- 📁 Organized into 18 focused components
- 🧪 Improved testability and maintainability
- ✅ Maintained full backward compatibility

### Documentation
- 📖 Comprehensive API documentation with examples
- 🧪 Detailed test integration patterns  
- 🔧 Development and extension guides
- 🐛 Troubleshooting and debug information

## 📄 License

MIT

## 🙏 Acknowledgments

- Built for testing [TFS CLI](https://github.com/Microsoft/tfs-cli)
- Supports Azure DevOps Services and Team Foundation Server
- Used by the Azure DevOps community for testing integrations
- Ensures reliable, fast, and isolated testing without requiring real server connections

## 📡 API Endpoints

The mock server implements comprehensive Azure DevOps REST API endpoints:

### 🔍 Service Discovery & Core APIs
```http
GET  /_apis/resourceareas              # Resource area discovery
GET  /_apis/resourceareas/{areaId}     # Specific resource area info  
GET  /_apis/connectiondata             # Connection information
GET  /_apis/Location                   # Location service
GET  /health                           # Server health check
```

### 🏗️ Build APIs
```http
# Builds
GET  /_apis/build/builds                    # List all builds
GET  /_apis/build/builds/{id}               # Get specific build
POST /_apis/build/builds                    # Queue a new build
GET  /{project}/_apis/build/builds          # List project builds
POST /{project}/_apis/build/builds          # Queue build in project

# Build Definitions  
GET  /_apis/build/definitions               # List build definitions
GET  /_apis/build/definitions/{id}          # Get build definition
GET  /{project}/_apis/build/definitions     # List project definitions
```

### 📝 Work Item APIs
```http
GET   /{project}/_apis/wit/workitems           # List work items
GET   /{project}/_apis/wit/workitems/{id}      # Get work item by ID
POST  /{project}/_apis/wit/workitems           # Create work item
PATCH /{project}/_apis/wit/workitems/{id}      # Update work item
POST  /{project}/_apis/wit/workitems/${type}   # Create work item by type
```

### 🔌 Extension APIs
```http
# Gallery/Marketplace
GET  /_apis/gallery/extensions                    # Browse extensions
GET  /_apis/gallery/extensions/{pub}/{ext}       # Get specific extension
POST /_apis/gallery/extensions                   # Publish extension

# Extension Management
GET  /_apis/extensionmanagement/installedextensions           # List installed
GET  /_apis/extensionmanagement/installedextensions/{pub}/{ext}  # Get installed
POST /_apis/extensionmanagement/installedextensions           # Install extension
```

### 🤖 Task Agent APIs
```http
GET    /_apis/distributedtask/tasks        # List task definitions
GET    /_apis/distributedtask/tasks/{id}   # Get task definition
POST   /_apis/distributedtask/tasks        # Upload task definition  
DELETE /_apis/distributedtask/tasks/{id}   # Delete task definition
```

## 🎯 Sample API Calls

Here are example HTTP requests you can make to the mock server:

### Health Check
```bash
curl http://localhost:8084/health
```

### List Builds
```bash
curl http://localhost:8084/_apis/build/builds
```

### Get Resource Areas (Service Discovery)
```bash
curl http://localhost:8084/_apis/resourceareas
```

### Queue a Build
```bash
curl -X POST http://localhost:8084/_apis/build/builds \
  -H "Content-Type: application/json" \
  -d '{"definition": {"id": 1}}'
```

### Create Work Item
```bash
curl -X POST http://localhost:8084/TestProject/_apis/wit/workitems/Task \
  -H "Content-Type: application/json-patch+json" \
  -d '[{"op":"add","path":"/fields/System.Title","value":"Test Task"}]'
```

## ⚙️ Configuration Options

```typescript
interface MockServerOptions {
    port?: number;           // Server port (default: 8080, CLI default: 8084)
    host?: string;           // Server host (default: 'localhost')
    authRequired?: boolean;  // Require authentication (default: true)
}
```

### Usage Examples

```typescript
// Basic configuration
const server = await createMockServer({
    port: 9000,
    host: '0.0.0.0'
});

// Development configuration (no auth required)
const devServer = await createMockServer({
    port: 8080,
    authRequired: false
});

// Test configuration (random port)
const testServer = await createMockServer({
    port: 0  // OS will assign available port
});
```

## 📊 Mock Data Management

The mock server provides powerful APIs to manage test data programmatically:

### Build Management
```typescript
// Add builds
const build = server.addBuild({
    buildNumber: 'TestBuild_001',
    status: 'completed',
    result: 'succeeded',
    definition: { id: 1, name: 'My Build Definition' },
    project: { id: 'proj-1', name: 'MyProject' }
});

// Get builds
const builds = server.dataStore.getBuilds();
const buildById = server.getBuildById(1);
const projectBuilds = server.dataStore.getBuildsByProject('MyProject');
```

### Work Item Management
```typescript
// Add work items
const workItem = server.addWorkItem({
    fields: {
        'System.Title': 'Sample Bug',
        'System.WorkItemType': 'Bug',
        'System.State': 'Active',
        'System.AssignedTo': 'testuser@example.com'
    }
});

// Get work items
const workItems = server.dataStore.getWorkItems();
const workItemById = server.getWorkItemById(1);
```

### Data Reset
```typescript
// Clear all mock data and reinitialize with defaults
server.clearData();

// Or clear specific data types
server.dataStore.clearAll();
```

## 🏗️ Architecture

The mock server features a **modular, maintainable architecture**:

```
src/
├── MockDevOpsServer.ts          # Main server orchestrator
├── types/                       # TypeScript interfaces  
├── data/                        # Data storage & initialization
├── handlers/                    # API endpoint handlers
├── components/                  # Infrastructure components
└── utils/                       # Shared utilities
```

Key benefits:
- **Separation of Concerns**: Each component has a single responsibility
- **Extensibility**: Easy to add new API endpoints or modify behavior
- **Testability**: Components can be unit tested in isolation
- **Maintainability**: Clear file organization and consistent patterns

For detailed architecture information, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## 🔧 Development & Extension

### Adding New API Endpoints

1. **Create a new handler** in `src/handlers/`:
```typescript
export class CustomHandler extends BaseRouteHandler {
    public getRoutes(): RouteHandler[] {
        return [{
            pattern: '/custom/endpoint',
            method: 'GET', 
            handler: (context) => this.handleCustom(context)
        }];
    }
}
```

2. **Register the handler** in `RouteManager.ts`:
```typescript
const customHandler = new CustomHandler(dataStore, port);
this.handlers.push(...customHandler.getRoutes());
```

### Adding New Data Types

1. **Define types** in `src/types/index.ts`
2. **Update data store** in `src/data/MockDataStore.ts`
3. **Add initialization** in `src/data/MockDataInitializer.ts`

## 📝 License

MIT

## 🤝 Contributing

This package is part of the [TFS CLI](https://github.com/Microsoft/tfs-cli) project. 

### Development Setup
```bash
# Clone the repository  
git clone https://github.com/Microsoft/tfs-cli.git
cd tfs-cli/packages/tfs-mock-server

# Install dependencies
npm install

# Build the package
npm run build

# Run the CLI locally
node bin/start-mock-server.js --port=8080
```

### Running Tests
```bash
# Run integration tests that use the mock server
cd ../..  # Back to tfs-cli root
npm test
```

## 🙏 Acknowledgments

- Built for testing [TFS CLI](https://github.com/Microsoft/tfs-cli)
- Supports Azure DevOps Services and Team Foundation Server
- Used by the Azure DevOps community for testing integrations
