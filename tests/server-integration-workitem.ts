import assert = require('assert');
import { stripColors } from 'colors';
import { createMockServer, MockDevOpsServer } from './mock-server';
import * as fs from 'fs';
import * as path from 'path';

const { exec } = require('child_process');
const { promisify } = require('util');

// Basic test framework functions to avoid TypeScript errors
declare function describe(name: string, fn: Function): void;
declare function it(name: string, fn: Function): void;
declare function before(fn: Function): void;
declare function after(fn: Function): void;

const execAsync = promisify(exec);
const tfxPath = path.resolve(__dirname, '../../_build/tfx-cli.js');

describe('Server Integration Tests - Work Item Commands', function() {
    let mockServer: MockDevOpsServer;
    let serverUrl: string;
    const testProject = 'TestProject';
    
    this.timeout(30000);

    before(async function() {
        // Start mock server
        mockServer = await createMockServer({ port: 8082 });
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
        it('should show work item details', function(done) {
            const workItemId = 1;
            const command = `node "${tfxPath}" workitem show --service-url "${serverUrl}" --project "${testProject}" --work-item-id ${workItemId} --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    
                    // Should show work item details from mock server
                    assert(cleanOutput.includes('System.Id') && cleanOutput.includes('System.Title') && cleanOutput.includes('Sample Task'), 'Should show work item information');
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it('should require work item ID', function(done) {
            const command = `node "${tfxPath}" workitem show --service-url "${serverUrl}" --project "${testProject}" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(() => {
                    assert.fail('Should have failed without work item ID');
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    assert(errorOutput.includes('work-item-id') || errorOutput.includes('required') || errorOutput.includes('Work item'), 'Should indicate work item ID is required');
                    done();
                });
        });
    });

    describe('Work Item Create Command', function() {
        it('should create a task work item', function(done) {
            const command = `node "${tfxPath}" workitem create --service-url "${serverUrl}" --project "${testProject}" --work-item-type Task --title "Test Task" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    
                    // Should create work item successfully
                    assert(cleanOutput.includes('System.Id') || cleanOutput.includes('created') || cleanOutput.includes('Work item'), 'Should show creation confirmation');
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it('should create work item with custom fields', function(done) {
            const command = `node "${tfxPath}" workitem create --service-url "${serverUrl}" --project "${testProject}" --work-item-type Task --title "Test Task" --description "Test Description" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    
                    // Should create work item with custom fields successfully
                    assert(cleanOutput.includes('System.Id') || cleanOutput.includes('created') || cleanOutput.includes('Work item'), 'Should show creation confirmation');
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it('should require work item type and title', function(done) {
            const command = `node "${tfxPath}" workitem create --service-url "${serverUrl}" --project "${testProject}" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(() => {
                    assert.fail('Should have failed without required fields');
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    assert(errorOutput.includes('work-item-type') || errorOutput.includes('title') || errorOutput.includes('required'), 'Should indicate required fields');
                    done();
                });
        });
    });

    describe('Work Item Query Command', function() {
        it('should execute WIQL query', function(done) {
            const wiql = "SELECT [System.Id], [System.Title] FROM WorkItems WHERE [System.WorkItemType] = 'Task'";
            const command = `node "${tfxPath}" workitem query --service-url "${serverUrl}" --project "${testProject}" --wiql "${wiql}" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    
                    // Should execute query and show results
                    assert(cleanOutput.includes('System.Id') || cleanOutput.includes('query') || cleanOutput.includes('Work'), 'Should show query results');
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it('should handle predefined queries', function(done) {
            const command = `node "${tfxPath}" workitem query --service-url "${serverUrl}" --project "${testProject}" --query-name "My Queries/Active Tasks" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    
                    // Should execute predefined query
                    assert(cleanOutput.includes('System.Id') || cleanOutput.includes('query') || cleanOutput.includes('Work'), 'Should show query results');
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it('should require either WIQL or query name', function(done) {
            const command = `node "${tfxPath}" workitem query --service-url "${serverUrl}" --project "${testProject}" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(() => {
                    assert.fail('Should have failed without query');
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    assert(errorOutput.includes('wiql') || errorOutput.includes('query') || errorOutput.includes('required'), 'Should indicate query is required');
                    done();
                });
        });
    });

    describe('Work Item Update Command', function() {
        it('should update work item', function(done) {
            const workItemId = 1;
            const command = `node "${tfxPath}" workitem update --service-url "${serverUrl}" --project "${testProject}" --work-item-id ${workItemId} --title "Updated Task Title" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    
                    // Should update work item successfully
                    assert(cleanOutput.includes('System.Id') || cleanOutput.includes('updated') || cleanOutput.includes('Work item'), 'Should show update confirmation');
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it('should update multiple fields', function(done) {
            const workItemId = 1;
            const command = `node "${tfxPath}" workitem update --service-url "${serverUrl}" --project "${testProject}" --work-item-id ${workItemId} --title "Updated Task" --description "Updated description" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    
                    // Should update multiple fields successfully
                    assert(cleanOutput.includes('System.Id') || cleanOutput.includes('updated') || cleanOutput.includes('Work item'), 'Should show update confirmation');
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it('should require work item ID', function(done) {
            const command = `node "${tfxPath}" workitem update --service-url "${serverUrl}" --project "${testProject}" --title "Updated Title" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(() => {
                    assert.fail('Should have failed without work item ID');
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    assert(errorOutput.includes('work-item-id') || errorOutput.includes('required'), 'Should indicate work item ID is required');
                    done();
                });
        });
    });

    describe('Authentication and Connection', function() {
        it('should handle PAT authentication', function(done) {
            const workItemId = 1;
            const command = `node "${tfxPath}" workitem show --service-url "${serverUrl}" --project "${testProject}" --work-item-id ${workItemId} --auth-type pat --token dGVzdHRva2VuOnRlc3Q= --no-prompt`;
            
            execAsync(command)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    
                    // Should connect successfully with PAT
                    assert(cleanOutput.includes('System.Id') && cleanOutput.includes('System.Title') && cleanOutput.includes('Sample Task'), 'Should show work item information');
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it('should handle connection to unreachable server', function(done) {
            const unreachableUrl = 'http://nonexistent-server.example.com:8080/DefaultCollection';
            const command = `node "${tfxPath}" workitem show --service-url "${unreachableUrl}" --project "${testProject}" --work-item-id 1 --auth-type basic --username testuser --password testpass --no-prompt`;
            
            // This test verifies the CLI handles connection failures gracefully
            this.timeout(10000); // Shorter timeout for unreachable server
            
            execAsync(command)
                .then(() => {
                    // Unexpected success with unreachable server
                    done(new Error('Should not have succeeded with unreachable server'));
                })
                .catch((error) => {
                    // Expected - should fail to connect to unreachable server
                    done();
                });
        });
    });

    describe('Output Formats', function() {
        it('should support JSON output format', function(done) {
            const workItemId = 1;
            const command = `node "${tfxPath}" workitem show --service-url "${serverUrl}" --project "${testProject}" --work-item-id ${workItemId} --json --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    // Should produce JSON formatted output
                    assert(cleanOutput.includes('{') || cleanOutput.includes('['), 'Should contain JSON structure');
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });
    });
});
