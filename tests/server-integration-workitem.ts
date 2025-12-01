import assert = require('assert');
import { stripColors } from 'colors';
import { createMockServer, MockDevOpsServer } from './mock-server';
import * as fs from 'fs';
import * as path from 'path';
import { DebugLogger, execAsyncWithLogging } from './test-utils/debug-exec';
import { enforceAzureTokenIsolation } from './test-utils/env';

// Basic test framework functions to avoid TypeScript errors
declare function describe(name: string, fn: Function): void;
declare function it(name: string, fn: Function): void;
declare function before(fn: Function): void;
declare function after(fn: Function): void;

const tfxPath = path.resolve(__dirname, '../../_build/tfx-cli.js');

enforceAzureTokenIsolation();

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
            
            execAsyncWithLogging(command, 'show work item details with all fields')
                .then(({ stdout, stderr }) => {
                    const cleanOutput = stripColors(stdout);
                    const cleanError = stripColors(stderr || '');
                    // Tight assertions for all expected fields and values
                    assert(/System\.Id:\s+\d+/.test(cleanOutput), 'Should show System.Id with a numeric value');
                    assert(cleanOutput.includes('System.WorkItemType:        Task'), 'Should show System.WorkItemType: Task');
                    assert(cleanOutput.includes('System.Title:        Sample Task'), 'Should show System.Title: Sample Task');
                    assert(cleanOutput.includes('System.State:        New'), 'Should show System.State: New');
                    assert(cleanOutput.includes('System.AreaPath:        TestProject'), 'Should show System.AreaPath: TestProject');
                    assert(cleanOutput.includes('System.TeamProject:        TestProject'), 'Should show System.TeamProject: TestProject');
                    assert(cleanOutput.includes('System.Description:        This is a sample task for testing'), 'Should show System.Description: This is a sample task for testing');
                    // Should not have any error output
                    assert(cleanError.length === 0 || !cleanError.includes('error'), `Expected no errors but got: "${cleanError}"`);
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it('should require work item ID parameter', function(done) {
            const command = `node "${tfxPath}" workitem show --service-url "${serverUrl}" --project "${testProject}" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsyncWithLogging(command, 'require work item ID parameter')
                .then(() => {
                    assert.fail('Should have failed without work item ID');
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    // Tight assertion for missing argument error
                    assert(errorOutput.includes("Missing required value for argument 'workItemId'"), `Expected specific missing workItemId error but got: "${errorOutput}"`);
                    assert(error.code !== 0, 'Should exit with non-zero code');
                    done();
                });
        });
    });

    describe('Work Item Create Command', function() {
        it('should create a task work item successfully', function(done) {
            const command = `node "${tfxPath}" workitem create --service-url "${serverUrl}" --project "${testProject}" --work-item-type Task --title "Test Task" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsyncWithLogging(command, 'create a task work item and verify all fields')
                .then(({ stdout, stderr }) => {
                    const cleanOutput = stripColors(stdout);
                    const cleanError = stripColors(stderr || '');
                    // Tight assertions for all expected fields and values
                    assert(/System\.Id:\s+\d+/.test(cleanOutput), 'Should show System.Id with a numeric value');
                    assert(cleanOutput.includes('System.WorkItemType:        Task'), 'Should show System.WorkItemType: Task');
                    assert(cleanOutput.includes('System.State:        New'), 'Should show System.State: New');
                    assert(cleanOutput.includes('System.CreatedBy:        Test User <testuser@example.com>'), 'Should show System.CreatedBy: Test User <testuser@example.com>');
                    assert(/System.CreatedDate:\s+\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/.test(cleanOutput), 'Should show System.CreatedDate with ISO timestamp');
                    assert(cleanError.length === 0 || !cleanError.includes('error'), `Expected no errors but got: "${cleanError}"`);
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it('should create work item with custom fields successfully', function(done) {
            const command = `node "${tfxPath}" workitem create --service-url "${serverUrl}" --project "${testProject}" --work-item-type Task --title "Test Task" --description "Test Description" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsyncWithLogging(command, 'create work item with custom fields')
                .then(({ stdout, stderr }) => {
                    const cleanOutput = stripColors(stdout);
                    const cleanError = stripColors(stderr || '');
                    // Tight assertions for all expected fields and values
                    assert(/System\.Id:\s+\d+/.test(cleanOutput), 'Should show System.Id with a numeric value');
                    assert(cleanOutput.includes('System.WorkItemType:        Task'), 'Should show System.WorkItemType: Task');
                    assert(cleanOutput.includes('System.State:        New'), 'Should show System.State: New');
                    assert(cleanOutput.includes('System.CreatedBy:        Test User <testuser@example.com>'), 'Should show System.CreatedBy: Test User <testuser@example.com>');
                    assert(/System\.CreatedDate:\s+\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/.test(cleanOutput), 'Should show System.CreatedDate with ISO timestamp');
                    assert(cleanError.length === 0 || !cleanError.includes('error'), `Expected no errors but got: "${cleanError}"`);
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it('should require work item type parameter', function(done) {
            const command = `node "${tfxPath}" workitem create --service-url "${serverUrl}" --project "${testProject}" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsyncWithLogging(command, 'require work item type parameter')
                .then(() => {
                    assert.fail('Should have failed without work item type');
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    // Tight assertion for missing argument error
                    assert(errorOutput.includes("Error: Missing required value for argument 'workItemType'"), `Expected specific missing workItemType error but got: "${errorOutput}"`);
                    assert(error.code !== 0, 'Should exit with non-zero code');
                    done();
                });
        });

        it('should require at least one field value', function(done) {
            const command = `node "${tfxPath}" workitem create --service-url "${serverUrl}" --project "${testProject}" --work-item-type Task --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsyncWithLogging(command, 'require at least one field value')
                .then(() => {
                    assert.fail('Should have failed without any field values');
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    // Tight assertion for missing field value error
                    assert(errorOutput.includes('At least one field value must be specified.'), `Expected specific field validation error but got: "${errorOutput}"`);
                    assert(error.code !== 0, 'Should exit with non-zero code');
                    done();
                });
        });
    });

    describe('Work Item Query Command', function() {
        it('should execute WIQL query successfully', function(done) {
            const wiql = "SELECT [System.Id], [System.Title] FROM WorkItems WHERE [System.WorkItemType] = 'Task'";
            const command = `node "${tfxPath}" workitem query --service-url "${serverUrl}" --project "${testProject}" --query "${wiql}" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsyncWithLogging(command, 'execute WIQL query and verify work item fields')
                .then(({ stdout, stderr }) => {
                    const cleanOutput = stripColors(stdout);
                    const cleanError = stripColors(stderr || '');
                    // Should show at least one work item with expected fields
                    assert(/System\.Id:\s+\d+/.test(cleanOutput), 'Should show at least one System.Id with a numeric value');
                    assert(cleanOutput.includes('System.WorkItemType:        Task') || cleanOutput.includes('System.WorkItemType:        Bug'), 'Should show System.WorkItemType: Task or Bug');
                    assert(cleanOutput.includes('System.Title:'), 'Should show System.Title');
                    assert(cleanOutput.includes('System.State:'), 'Should show System.State');
                    assert(cleanOutput.includes('System.AreaPath:        TestProject'), 'Should show System.AreaPath: TestProject');
                    assert(cleanOutput.includes('System.TeamProject:        TestProject'), 'Should show System.TeamProject: TestProject');
                    // Should not have any error output
                    assert(cleanError.length === 0 || !cleanError.includes('error'), `Expected no errors but got: "${cleanError}"`);
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it('should execute saved query successfully', function(done) {
            const command = `node "${tfxPath}" workitem query --service-url "${serverUrl}" --project "${testProject}" --query "My Queries/Active Tasks" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsyncWithLogging(command, 'execute saved query and verify work item fields')
                .then(({ stdout, stderr }) => {
                    const cleanOutput = stripColors(stdout);
                    const cleanError = stripColors(stderr || '');
                    // Should show at least one work item with expected fields
                    assert(/System\.Id:\s+\d+/.test(cleanOutput), 'Should show at least one System.Id with a numeric value');
                    assert(cleanOutput.includes('System.WorkItemType:        Task') || cleanOutput.includes('System.WorkItemType:        Bug'), 'Should show System.WorkItemType: Task or Bug');
                    assert(cleanOutput.includes('System.Title:'), 'Should show System.Title');
                    assert(cleanOutput.includes('System.State:'), 'Should show System.State');
                    assert(cleanOutput.includes('System.AreaPath:        TestProject'), 'Should show System.AreaPath: TestProject');
                    assert(cleanOutput.includes('System.TeamProject:        TestProject'), 'Should show System.TeamProject: TestProject');
                    // Should not have any error output
                    assert(cleanError.length === 0 || !cleanError.includes('error'), `Expected no errors but got: "${cleanError}"`);
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it('should require query parameter (WIQL or query name)', function(done) {
            const command = `node "${tfxPath}" workitem query --service-url "${serverUrl}" --project "${testProject}" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsyncWithLogging(command, 'require query parameter (WIQL or query name)')
                .then(() => {
                    assert.fail('Should have failed without query parameter');
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    // Tight assertion for missing argument error
                    assert(errorOutput.includes("Missing required value for argument 'query'"), `Expected specific missing query error but got: "${errorOutput}"`);
                    assert(error.code !== 0, 'Should exit with non-zero code');
                    done();
                });
        });
    });

    describe('Work Item Update Command', function() {
        it('should update work item successfully', function(done) {
            const workItemId = 1;
            const command = `node "${tfxPath}" workitem update --service-url "${serverUrl}" --project "${testProject}" --work-item-id ${workItemId} --title "Updated Task Title" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsyncWithLogging(command, 'update work item and verify fields')
                .then(({ stdout, stderr }) => {
                    const cleanOutput = stripColors(stdout);
                    const cleanError = stripColors(stderr || '');
                    // Tight assertions for all expected fields and values
                    assert(/System\.Id:\s+\d+/.test(cleanOutput), 'Should show System.Id with a numeric value');
                    assert(cleanOutput.includes('System.WorkItemType:        Task'), 'Should show System.WorkItemType: Task');
                    assert(cleanOutput.includes('System.Title:'), 'Should show System.Title');
                    assert(cleanOutput.includes('System.State:'), 'Should show System.State');
                    assert(cleanOutput.includes('System.AreaPath:        TestProject'), 'Should show System.AreaPath: TestProject');
                    assert(cleanOutput.includes('System.TeamProject:        TestProject'), 'Should show System.TeamProject: TestProject');
                    assert(cleanError.length === 0 || !cleanError.includes('error'), `Expected no errors but got: "${cleanError}"`);
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it('should update multiple fields successfully', function(done) {
            const workItemId = 1;
            const command = `node "${tfxPath}" workitem update --service-url "${serverUrl}" --project "${testProject}" --work-item-id ${workItemId} --title "Updated Task" --description "Updated description" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsyncWithLogging(command, 'update multiple fields and verify work item fields')
                .then(({ stdout, stderr }) => {
                    const cleanOutput = stripColors(stdout);
                    const cleanError = stripColors(stderr || '');
                    // Tight assertions for all expected fields and values
                    assert(/System\.Id:\s+\d+/.test(cleanOutput), 'Should show System.Id with a numeric value');
                    assert(cleanOutput.includes('System.WorkItemType:        Task'), 'Should show System.WorkItemType: Task');
                    assert(cleanOutput.includes('System.Title:'), 'Should show System.Title');
                    assert(cleanOutput.includes('System.State:'), 'Should show System.State');
                    assert(cleanOutput.includes('System.AreaPath:        TestProject'), 'Should show System.AreaPath: TestProject');
                    assert(cleanOutput.includes('System.TeamProject:        TestProject'), 'Should show System.TeamProject: TestProject');
                    assert(cleanError.length === 0 || !cleanError.includes('error'), `Expected no errors but got: "${cleanError}"`);
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it('should require work item ID parameter', function(done) {
            const command = `node "${tfxPath}" workitem update --service-url "${serverUrl}" --project "${testProject}" --title "Updated Title" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsyncWithLogging(command, 'require work item ID parameter for update')
                .then(() => {
                    assert.fail('Should have failed without work item ID');
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    // Tight assertion for missing argument error
                    assert(errorOutput.includes("Missing required value for argument 'workItemId'"), `Expected specific missing workItemId error but got: "${errorOutput}"`);
                    assert(error.code !== 0, 'Should exit with non-zero code');
                    done();
                });
        });
    });

    describe('Authentication and Connection', function() {
        it('should handle PAT authentication successfully', function(done) {
            const workItemId = 1;
            const command = `node "${tfxPath}" workitem show --service-url "${serverUrl}" --project "${testProject}" --work-item-id ${workItemId} --auth-type pat --token testtoken --no-prompt`;
            
            execAsyncWithLogging(command, 'show work item details with PAT authentication')
                .then(({ stdout, stderr }) => {
                    const cleanOutput = stripColors(stdout);
                    const cleanError = stripColors(stderr || '');
                    // Tight assertions for all expected fields and values
                    assert(/System\.Id:\s+\d+/.test(cleanOutput), 'Should show System.Id with a numeric value');
                    assert(cleanOutput.includes('System.WorkItemType:        Task'), 'Should show System.WorkItemType: Task');
                    assert(cleanOutput.includes('System.Title:        Sample Task'), 'Should show System.Title: Sample Task');
                    assert(cleanOutput.includes('System.State:        New'), 'Should show System.State: New');
                    assert(cleanOutput.includes('System.AreaPath:        TestProject'), 'Should show System.AreaPath: TestProject');
                    assert(cleanOutput.includes('System.TeamProject:        TestProject'), 'Should show System.TeamProject: TestProject');
                    assert(cleanOutput.includes('System.Description:        This is a sample task for testing'), 'Should show System.Description: This is a sample task for testing');
                    assert(cleanError.length === 0 || !cleanError.includes('error'), `Expected no errors but got: "${cleanError}"`);
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
            
            execAsyncWithLogging(command, 'handle connection to unreachable server')
                .then(() => {
                    done(new Error('Should not have succeeded with unreachable server'));
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    // Tight assertion for connection-related error
                    assert(errorOutput.includes('ENOTFOUND') || errorOutput.includes('ECONNREFUSED') || errorOutput.includes('getaddrinfo') || errorOutput.includes('Could not resolve') || errorOutput.includes('unable to connect'), `Expected connection error but got: "${errorOutput}"`);
                    assert(error.code !== 0, 'Should exit with non-zero code');
                    done();
                });
        });
    });

    describe('Output Formats', function() {
        it('should produce valid JSON output format', function(done) {
            const workItemId = 1;
            const command = `node "${tfxPath}" workitem show --service-url "${serverUrl}" --project "${testProject}" --work-item-id ${workItemId} --json --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsyncWithLogging(command, 'produce valid JSON output format')
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
                    // JSON should contain work item data with id field and expected fields
                    assert(parsedJson && typeof parsedJson.id === 'number', `Expected JSON with work item data and numeric id field but got: ${JSON.stringify(parsedJson)}`);
                    assert(parsedJson.fields && parsedJson.fields["System.WorkItemType"] === "Task", 'Should have System.WorkItemType: Task');
                    assert(parsedJson.fields && parsedJson.fields["System.Title"] === "Sample Task", 'Should have System.Title: Sample Task');
                    assert(parsedJson.fields && parsedJson.fields["System.State"] === "New", 'Should have System.State: New');
                    assert(parsedJson.fields && parsedJson.fields["System.AreaPath"] === "TestProject", 'Should have System.AreaPath: TestProject');
                    assert(parsedJson.fields && parsedJson.fields["System.TeamProject"] === "TestProject", 'Should have System.TeamProject: TestProject');
                    assert(parsedJson.fields && parsedJson.fields["System.Description"] === "This is a sample task for testing", 'Should have System.Description: This is a sample task for testing');
                    assert(cleanError.length === 0 || !cleanError.includes('error'), `Expected no errors but got: "${cleanError}"`);
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });
    });
});
