import assert = require('assert');
import { stripColors } from 'colors';
import { createMockServer, MockDevOpsServer } from './mock-server';
import * as fs from 'fs';
import * as path from 'path';
import { DebugLogger, execAsyncWithLogging } from './test-utils/debug-exec';

// Basic test framework functions to avoid TypeScript errors
declare function describe(name: string, fn: Function): void;
declare function it(name: string, fn: Function): void;
declare function before(fn: Function): void;
declare function after(fn: Function): void;

const tfxPath = path.resolve(__dirname, '../../_build/tfx-cli.js');

describe('Server Integration Tests - Work Item Commands', function() {
    let mockServer: MockDevOpsServer;
    let serverUrl: string;
    const testProject = 'TestProject';
    
    this.timeout(30000);

    before(async function() {
        // Start mock server with verbose logging
        mockServer = await createMockServer({ port: 8082, verbose: true });
        serverUrl = mockServer.getCollectionUrl();
        
        // Ensure the built CLI exists
        if (!fs.existsSync(tfxPath)) {
            throw new Error('TFX CLI not found. Run npm run build first.');
        }
    });

    after(async function() {
        if (mockServer) {
            await mockServer.stop();
        }
    });

    describe('Work Item Show Command', function() {
        it('should show work item details successfully', function(done) {
            const workItemId = 1;
            const command = `node "${tfxPath}" workitem show --service-url "${serverUrl}" --project "${testProject}" --work-item-id ${workItemId} --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsyncWithLogging(command)
                .then(({ stdout, stderr }) => {
                    const cleanOutput = stripColors(stdout);
                    const cleanError = stripColors(stderr || '');
                    
                    // Should show specific work item details from mock server with all required fields
                    assert(cleanOutput.includes('System.Id') && 
                           cleanOutput.includes('System.Title') && 
                           cleanOutput.includes('Sample Task'), 
                           `Expected work item with System.Id, System.Title, and 'Sample Task' but got output: "${cleanOutput}"`);
                    
                    // Should not have any error output
                    assert(cleanError.length === 0 || !cleanError.includes('error'), 
                           `Expected no errors but got: "${cleanError}"`);
                    
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it('should require work item ID parameter', function(done) {
            const command = `node "${tfxPath}" workitem show --service-url "${serverUrl}" --project "${testProject}" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsyncWithLogging(command)
                .then(() => {
                    assert.fail('Should have failed without work item ID');
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    
                    // Should fail with specific missing argument error
                    assert(errorOutput.includes("Missing required value for argument 'workItemId'"), 
                           `Expected specific missing workItemId error but got: "${errorOutput}"`);
                    
                    // Should have non-zero exit code
                    assert(error.code !== 0, 'Should exit with non-zero code');
                    
                    done();
                });
        });
    });

    describe('Work Item Create Command', function() {
        it('should create a task work item successfully', function(done) {
            const command = `node "${tfxPath}" workitem create --service-url "${serverUrl}" --project "${testProject}" --work-item-type Task --title "Test Task" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsyncWithLogging(command)
                .then(({ stdout, stderr }) => {
                    const cleanOutput = stripColors(stdout);
                    const cleanError = stripColors(stderr || '');
                    
                    // Should create work item successfully and show its details including System.Id
                    assert(cleanOutput.includes('System.Id'), 
                           `Expected work item creation with System.Id field but got output: "${cleanOutput}"`);
                    
                    // Should show work item type as Task
                    assert(cleanOutput.includes('System.WorkItemType:        Task'), 
                           `Expected created work item to be of type Task but got output: "${cleanOutput}"`);
                    
                    // Should not have any error output
                    assert(cleanError.length === 0 || !cleanError.includes('error'), 
                           `Expected no errors but got: "${cleanError}"`);
                    
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it('should create work item with custom fields successfully', function(done) {
            const command = `node "${tfxPath}" workitem create --service-url "${serverUrl}" --project "${testProject}" --work-item-type Task --title "Test Task" --description "Test Description" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsyncWithLogging(command)
                .then(({ stdout, stderr }) => {
                    const cleanOutput = stripColors(stdout);
                    const cleanError = stripColors(stderr || '');
                    
                    // Should create work item successfully with System.Id
                    assert(cleanOutput.includes('System.Id'), 
                           `Expected work item creation with System.Id field but got output: "${cleanOutput}"`);
                    
                    // Should show work item type as Task
                    assert(cleanOutput.includes('System.WorkItemType:        Task'), 
                           `Expected created work item to be of type Task but got output: "${cleanOutput}"`);
                    
                    // Should not have any error output
                    assert(cleanError.length === 0 || !cleanError.includes('error'), 
                           `Expected no errors but got: "${cleanError}"`);
                    
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it('should require work item type parameter', function(done) {
            const command = `node "${tfxPath}" workitem create --service-url "${serverUrl}" --project "${testProject}" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsyncWithLogging(command)
                .then(() => {
                    assert.fail('Should have failed without work item type');
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    
                    // Should fail with specific missing argument error for workItemType (checked first)
                    assert(errorOutput.includes("Missing required value for argument 'workItemType'"), 
                           `Expected specific missing workItemType error but got: "${errorOutput}"`);
                    
                    // Should have non-zero exit code
                    assert(error.code !== 0, 'Should exit with non-zero code');
                    
                    done();
                });
        });

        it('should require at least one field value', function(done) {
            const command = `node "${tfxPath}" workitem create --service-url "${serverUrl}" --project "${testProject}" --work-item-type Task --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsyncWithLogging(command)
                .then(() => {
                    assert.fail('Should have failed without any field values');
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    
                    // Should fail with specific field validation error
                    assert(errorOutput.includes("At least one field value must be specified."), 
                           `Expected specific field validation error but got: "${errorOutput}"`);
                    
                    // Should have non-zero exit code
                    assert(error.code !== 0, 'Should exit with non-zero code');
                    
                    done();
                });
        });
    });

    describe('Work Item Query Command', function() {
        it('should execute WIQL query successfully', function(done) {
            const wiql = "SELECT [System.Id], [System.Title] FROM WorkItems WHERE [System.WorkItemType] = 'Task'";
            const command = `node "${tfxPath}" workitem query --service-url "${serverUrl}" --project "${testProject}" --query "${wiql}" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsyncWithLogging(command)
                .then(({ stdout, stderr }) => {
                    const cleanOutput = stripColors(stdout);
                    const cleanError = stripColors(stderr || '');
                    
                    // Should execute query and show work item results with System.Id fields
                    assert(cleanOutput.includes('System.Id'), 
                           `Expected query results with System.Id field but got output: "${cleanOutput}"`);
                    
                    // Should not have any error output
                    assert(cleanError.length === 0 || !cleanError.includes('error'), 
                           `Expected no errors but got: "${cleanError}"`);
                    
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it('should execute saved query successfully', function(done) {
            const command = `node "${tfxPath}" workitem query --service-url "${serverUrl}" --project "${testProject}" --query "My Queries/Active Tasks" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsyncWithLogging(command)
                .then(({ stdout, stderr }) => {
                    const cleanOutput = stripColors(stdout);
                    const cleanError = stripColors(stderr || '');
                    
                    // Should execute saved query and show work item results with System.Id fields
                    assert(cleanOutput.includes('System.Id'), 
                           `Expected query results with System.Id field but got output: "${cleanOutput}"`);
                    
                    // Should not have any error output
                    assert(cleanError.length === 0 || !cleanError.includes('error'), 
                           `Expected no errors but got: "${cleanError}"`);
                    
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it('should require query parameter (WIQL or query name)', function(done) {
            const command = `node "${tfxPath}" workitem query --service-url "${serverUrl}" --project "${testProject}" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsyncWithLogging(command)
                .then(() => {
                    assert.fail('Should have failed without query parameter');
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    
                    // Should fail with specific missing argument error for query
                    assert(errorOutput.includes("Missing required value for argument 'query'"), 
                           `Expected specific missing query error but got: "${errorOutput}"`);
                    
                    // Should have non-zero exit code
                    assert(error.code !== 0, 'Should exit with non-zero code');
                    
                    done();
                });
        });
    });

    describe('Work Item Update Command', function() {
        it('should update work item successfully', function(done) {
            const workItemId = 1;
            const command = `node "${tfxPath}" workitem update --service-url "${serverUrl}" --project "${testProject}" --work-item-id ${workItemId} --title "Updated Task Title" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsyncWithLogging(command)
                .then(({ stdout, stderr }) => {
                    const cleanOutput = stripColors(stdout);
                    const cleanError = stripColors(stderr || '');
                    
                    // Should update work item successfully and show System.Id
                    assert(cleanOutput.includes('System.Id'), 
                           `Expected updated work item with System.Id field but got output: "${cleanOutput}"`);
                    
                    // Should show work item details (mock server returns original data)
                    assert(cleanOutput.includes('System.Title'), 
                           `Expected work item output to include System.Title field but got output: "${cleanOutput}"`);
                    
                    // Should not have any error output
                    assert(cleanError.length === 0 || !cleanError.includes('error'), 
                           `Expected no errors but got: "${cleanError}"`);
                    
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it('should update multiple fields successfully', function(done) {
            const workItemId = 1;
            const command = `node "${tfxPath}" workitem update --service-url "${serverUrl}" --project "${testProject}" --work-item-id ${workItemId} --title "Updated Task" --description "Updated description" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsyncWithLogging(command)
                .then(({ stdout, stderr }) => {
                    const cleanOutput = stripColors(stdout);
                    const cleanError = stripColors(stderr || '');
                    
                    // Should update work item successfully and show System.Id
                    assert(cleanOutput.includes('System.Id'), 
                           `Expected updated work item with System.Id field but got output: "${cleanOutput}"`);
                    
                    // Should show work item details (mock server returns original data)
                    assert(cleanOutput.includes('System.Title'), 
                           `Expected work item output to include System.Title field but got output: "${cleanOutput}"`);
                    
                    // Should not have any error output
                    assert(cleanError.length === 0 || !cleanError.includes('error'), 
                           `Expected no errors but got: "${cleanError}"`);
                    
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it('should require work item ID parameter', function(done) {
            const command = `node "${tfxPath}" workitem update --service-url "${serverUrl}" --project "${testProject}" --title "Updated Title" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsyncWithLogging(command)
                .then(() => {
                    assert.fail('Should have failed without work item ID');
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    
                    // Should fail with specific missing argument error for workItemId
                    assert(errorOutput.includes("Missing required value for argument 'workItemId'"), 
                           `Expected specific missing workItemId error but got: "${errorOutput}"`);
                    
                    // Should have non-zero exit code
                    assert(error.code !== 0, 'Should exit with non-zero code');
                    
                    done();
                });
        });
    });

    describe('Authentication and Connection', function() {
        it('should handle PAT authentication successfully', function(done) {
            const workItemId = 1;
            const command = `node "${tfxPath}" workitem show --service-url "${serverUrl}" --project "${testProject}" --work-item-id ${workItemId} --auth-type pat --token testtoken --no-prompt`;
            
            execAsyncWithLogging(command)
                .then(({ stdout, stderr }) => {
                    const cleanOutput = stripColors(stdout);
                    const cleanError = stripColors(stderr || '');
                    
                    // Should connect successfully with PAT and show specific work item information
                    assert(cleanOutput.includes('System.Id') && 
                           cleanOutput.includes('System.Title') && 
                           cleanOutput.includes('Sample Task'), 
                           `Expected work item with System.Id, System.Title, and 'Sample Task' but got output: "${cleanOutput}"`);
                    
                    // Should not have any error output
                    assert(cleanError.length === 0 || !cleanError.includes('error'), 
                           `Expected no errors but got: "${cleanError}"`);
                    
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it('should handle connection to unreachable server gracefully', function(done) {
            const unreachableUrl = 'http://nonexistent-server.example.com:8080/DefaultCollection';
            const command = `node "${tfxPath}" workitem show --service-url "${unreachableUrl}" --project "${testProject}" --work-item-id 1 --auth-type basic --username testuser --password testpass --no-prompt`;
            
            // This test verifies the CLI handles connection failures gracefully
            this.timeout(10000); // Shorter timeout for unreachable server
            
            execAsyncWithLogging(command)
                .then(() => {
                    // Unexpected success with unreachable server
                    done(new Error('Should not have succeeded with unreachable server'));
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    
                    // Should fail with connection-related error
                    assert(errorOutput.includes('ENOTFOUND') || 
                           errorOutput.includes('ECONNREFUSED') || 
                           errorOutput.includes('getaddrinfo') ||
                           errorOutput.includes('Could not resolve') ||
                           errorOutput.includes('unable to connect'),
                           `Expected connection error but got: "${errorOutput}"`);
                    
                    // Should have non-zero exit code
                    assert(error.code !== 0, 'Should exit with non-zero code');
                    
                    done();
                });
        });
    });

    describe('Output Formats', function() {
        it('should produce valid JSON output format', function(done) {
            const workItemId = 1;
            const command = `node "${tfxPath}" workitem show --service-url "${serverUrl}" --project "${testProject}" --work-item-id ${workItemId} --json --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsyncWithLogging(command)
                .then(({ stdout, stderr }) => {
                    const cleanOutput = stripColors(stdout);
                    const cleanError = stripColors(stderr || '');
                    
                    // Extract JSON from output (might have debug logs before JSON)
                    const jsonMatch = cleanOutput.match(/\{[\s\S]*\}/);
                    if (!jsonMatch) {
                        assert.fail(`Expected JSON in output but got: "${cleanOutput}"`);
                        return;
                    }
                    
                    const jsonString = jsonMatch[0];
                    
                    // Should produce valid JSON formatted output
                    let parsedJson;
                    try {
                        parsedJson = JSON.parse(jsonString);
                    } catch (e) {
                        assert.fail(`Expected valid JSON output but got parse error: ${e.message}. JSON string: "${jsonString}"`);
                    }
                    
                    // JSON should contain work item data with id field
                    assert(parsedJson && parsedJson.id !== undefined, 
                           `Expected JSON with work item data and id field but got: ${JSON.stringify(parsedJson)}`);
                    
                    // Should not have any error output
                    assert(cleanError.length === 0 || !cleanError.includes('error'), 
                           `Expected no errors but got: "${cleanError}"`);
                    
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });
    });
});
