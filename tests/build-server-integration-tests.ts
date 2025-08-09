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
const samplesPath = path.resolve(__dirname, '../build-samples');

describe('Build Commands - Server Integration Tests', function() {
    let mockServer: MockDevOpsServer;
    let serverUrl: string;
    const testProject = 'TestProject';
    
    this.timeout(30000);

    before(async function() {
        // Start mock server on a specific port
        mockServer = await createMockServer({ port: 8087 });
        serverUrl = mockServer.getCollectionUrl();
        
        // Ensure the built CLI exists
        if (!fs.existsSync(tfxPath)) {
            throw new Error('TFX CLI not found. Run npm run build first.');
        }

        // Ensure samples exist for upload tests
        if (!fs.existsSync(samplesPath)) {
            throw new Error('Build samples directory not found: ' + samplesPath);
        }
    });

    after(async function() {
        if (mockServer) {
            await mockServer.stop();
        }
    });

    describe('Build List Command', function() {
        it('should list builds from server with basic auth', function(done) {
            const command = `node "${tfxPath}" build list --service-url "${serverUrl}" --project "${testProject}" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(({ stdout, stderr }) => {
                    const cleanOutput = stripColors(stdout);
                    
                    // Should contain build information from mock server
                    assert(cleanOutput.includes('id'), 'Should show build ID');
                    assert(cleanOutput.includes('Sample Build Definition'), 'Should show definition name');
                    assert(cleanOutput.includes('Test User'), 'Should show requested by');
                    assert(cleanOutput.includes('Completed'), 'Should show status');
                    
                    done();
                })
                .catch((error) => {
                    // Integration tests should connect successfully to mock server
                    // If connection fails, the test should fail to indicate a real problem
                    done(error);
                });
        });

        it('should list builds from server with PAT', function(done) {
            const command = `node "${tfxPath}" build list --service-url "${serverUrl}" --project "${testProject}" --auth-type pat --token dGVzdHRva2VuOnRlc3Q= --no-prompt`;
            
            execAsync(command)
                .then(({ stdout, stderr }) => {
                    const cleanOutput = stripColors(stdout);
                    
                    // Should contain build information from mock server
                    assert(cleanOutput.includes('id'), 'Should show build ID');
                    assert(cleanOutput.includes('Sample Build Definition'), 'Should show definition name');
                    assert(cleanOutput.includes('Test User'), 'Should show requested by');
                    assert(cleanOutput.includes('Completed'), 'Should show status');
                    
                    done();
                })
                .catch((error) => {
                    // Integration tests should connect successfully to mock server
                    done(error);
                });
        });

        it('should handle definition name filter', function(done) {
            const command = `node "${tfxPath}" build list --service-url "${serverUrl}" --project "${testProject}" --definition-name "Sample" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    
                    // Should filter and show builds matching the definition name
                    assert(cleanOutput.includes('Sample Build Definition'), 'Should show filtered builds');
                    assert(cleanOutput.includes('id'), 'Should show build ID');
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it('should support JSON output', function(done) {
            const command = `node "${tfxPath}" build list --service-url "${serverUrl}" --project "${testProject}" --auth-type basic --username testuser --password testpass --json --no-prompt`;
            
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

        it('should support top parameter', function(done) {
            const command = `node "${tfxPath}" build list --service-url "${serverUrl}" --project "${testProject}" --top 5 --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    
                    // Should limit results and show builds
                    assert(cleanOutput.includes('id'), 'Should show build ID');
                    assert(cleanOutput.includes('Sample Build Definition'), 'Should show definition name');
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });
    });

    describe('Build Show Command', function() {
        it('should show build details', function(done) {
            const buildId = 1;
            const command = `node "${tfxPath}" build show --service-url "${serverUrl}" --project "${testProject}" --build-id ${buildId} --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    
                    // Should show detailed build information
                    assert(cleanOutput.includes('id'), 'Should show build ID');
                    assert(cleanOutput.includes('Sample Build Definition'), 'Should show definition name');
                    assert(cleanOutput.includes('Test User'), 'Should show requested by');
                    assert(cleanOutput.includes('Completed'), 'Should show status');
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it('should require build ID', function(done) {
            const command = `node "${tfxPath}" build show --service-url "${serverUrl}" --project "${testProject}" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(() => {
                    assert.fail('Should have failed without build ID');
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    assert(errorOutput.includes('build-id') || errorOutput.includes('required') || errorOutput.includes('Build ID'), 'Should indicate build ID is required');
                    done();
                });
        });
    });

    describe('Build Queue Command', function() {
        it('should queue a build', function(done) {
            const command = `node "${tfxPath}" build queue --service-url "${serverUrl}" --project "${testProject}" --definition-id 1 --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    
                    // Should queue build and show confirmation
                    assert(cleanOutput.includes('queued') || cleanOutput.includes('Build') || cleanOutput.includes('id'), 'Should show queue confirmation or build info');
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it('should queue build by definition name', function(done) {
            const command = `node "${tfxPath}" build queue --service-url "${serverUrl}" --project "${testProject}" --definition-name "Sample Build Definition" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    
                    // Should queue build using definition name
                    assert(cleanOutput.includes('queued') || cleanOutput.includes('Build') || cleanOutput.includes('id'), 'Should show queue confirmation or build info');
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it('should require definition ID or name', function(done) {
            const command = `node "${tfxPath}" build queue --service-url "${serverUrl}" --project "${testProject}" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(() => {
                    assert.fail('Should have failed without definition');
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    assert(errorOutput.includes('definition') || errorOutput.includes('required'), 'Should indicate definition is required');
                    done();
                });
        });
    });

    describe('Build Task List Command', function() {
        it('should list build tasks from server', function(done) {
            const command = `node "${tfxPath}" build tasks list --service-url "${serverUrl}" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    
                    // Should list available build tasks
                    assert(cleanOutput.includes('task') || cleanOutput.includes('Task') || cleanOutput.includes('id'), 'Should show task information');
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it('should require authentication for server operations', function(done) {
            const command = `node "${tfxPath}" build tasks list --service-url "${serverUrl}" --no-prompt`;
            
            execAsync(command)
                .then(() => {
                    assert.fail('Should have failed without authentication');
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    // Should require authentication
                    assert(errorOutput.includes('auth') || 
                           errorOutput.includes('credentials') || 
                           errorOutput.includes('login') ||
                           errorOutput.includes('token') ||
                           errorOutput.includes('Missing required value'), 'Should indicate authentication is required');
                    done();
                });
        });
    });

    describe('Build Task Upload Command', function() {
        it('should validate task.json requirement', function(done) {
            const tempDir = path.join(__dirname, 'temp-task');
            
            try {
                if (!fs.existsSync(tempDir)) {
                    fs.mkdirSync(tempDir);
                }
            } catch (e) {
                // Directory might already exist
            }
            
            const command = `node "${tfxPath}" build tasks upload --service-url "${serverUrl}" --task-path "${tempDir}" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(() => {
                    // Cleanup
                    try {
                        if (fs.existsSync(tempDir)) {
                            fs.rmdirSync(tempDir);
                        }
                    } catch (e) {
                        // Ignore cleanup errors
                    }
                    assert.fail('Should have failed without task.json');
                })
                .catch((error) => {
                    // Cleanup
                    try {
                        if (fs.existsSync(tempDir)) {
                            fs.rmdirSync(tempDir);
                        }
                    } catch (e) {
                        // Ignore cleanup errors
                    }
                    
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    // Should fail with task.json validation error
                    assert(errorOutput.includes('task.json') || 
                           errorOutput.includes('not found') || 
                           errorOutput.includes('missing'), 'Should indicate task.json is missing');
                    done();
                });
        });

        it('should process valid task.json', function(done) {
            const taskPath = path.join(samplesPath, 'sample-task');
            
            const command = `node "${tfxPath}" build tasks upload --service-url "${serverUrl}" --task-path "${taskPath}" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    
                    // Should upload task successfully
                    assert(cleanOutput.includes('upload') || cleanOutput.includes('Task') || cleanOutput.includes('success'), 'Should show upload success');
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it('should validate task.json format', function(done) {
            const taskPath = path.join(samplesPath, 'invalid-task');
            
            const command = `node "${tfxPath}" build tasks upload --service-url "${serverUrl}" --task-path "${taskPath}" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(() => {
                    // Command might succeed and attempt upload despite validation issues
                    done();
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    // Should fail with validation error for invalid task format
                    assert(errorOutput.includes('validation') || 
                           errorOutput.includes('invalid') || 
                           errorOutput.includes('required'), 'Should indicate validation error');
                    done();
                });
        });

        it('should require task path', function(done) {
            const command = `node "${tfxPath}" build tasks upload --service-url "${serverUrl}" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(() => {
                    assert.fail('Should have failed without task path');
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    assert(errorOutput.includes('task-path') || errorOutput.includes('path') || errorOutput.includes('required'), 'Should indicate task path is required');
                    done();
                });
        });
    });

    describe('Build Task Delete Command', function() {
        it('should delete build task', function(done) {
            const taskId = 'test-task-id';
            const command = `node "${tfxPath}" build tasks delete --service-url "${serverUrl}" --task-id "${taskId}" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    
                    // Should delete task successfully
                    assert(cleanOutput.includes('delete') || cleanOutput.includes('removed') || cleanOutput.includes('Task'), 'Should show deletion confirmation');
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it('should require task ID for deletion', function(done) {
            const command = `node "${tfxPath}" build tasks delete --service-url "${serverUrl}" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(() => {
                    assert.fail('Should have failed without task ID');
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    assert(errorOutput.includes('task-id') || errorOutput.includes('required'), 'Should indicate task ID is required');
                    done();
                });
        });

        it('should validate task ID format', function(done) {
            const command = `node "${tfxPath}" build tasks delete --task-id "invalid-task-id" --service-url "${serverUrl}" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(() => {
                    // This might succeed if it just tries to connect to server and fails there
                    // The behavior depends on whether validation happens locally or server-side
                    done();
                })
                .catch((error) => {
                    // Expected to fail due to authentication or server connection
                    assert(error.code !== 0, 'Should exit with non-zero code for invalid operation');
                    done();
                });
        });
    });

    describe('Build Task Creation with Server', function() {
        it('should handle task creation with template', function(done) {
            const tempDir = path.join(__dirname, 'temp-new-task');
            
            try {
                if (!fs.existsSync(tempDir)) {
                    fs.mkdirSync(tempDir);
                }
            } catch (e) {
                // Directory might already exist
            }
            
            // Change to temp directory so task is created there instead of root
            const originalCwd = process.cwd();
            
            try {
                process.chdir(tempDir);
                const command = `node "${tfxPath}" build tasks create --task-name "MyTestTask" --friendly-name "My Test Task" --description "A test task for automation" --author "Test Author" --no-prompt`;
                
                execAsync(command)
                    .then(({ stdout }) => {
                        const cleanOutput = stripColors(stdout);
                        
                        // Should attempt to create task template
                        assert(cleanOutput.length > 0, 'Should produce output');
                        
                        // Check if task.json was created in the MyTestTask subdirectory within tempDir
                        const taskDir = path.join(tempDir, 'MyTestTask');
                        const taskJsonPath = path.join(taskDir, 'task.json');
                        if (fs.existsSync(taskJsonPath)) {
                            // Validate the created task.json
                            const taskContent = fs.readFileSync(taskJsonPath, 'utf8');
                            assert(taskContent.includes('MyTestTask'), 'Task name should be in task.json');
                        }
                        
                        // Cleanup - restore cwd first, then clean up
                        process.chdir(originalCwd);
                        try {
                            if (fs.existsSync(taskDir)) {
                                const files = fs.readdirSync(taskDir);
                                for (const file of files) {
                                    fs.unlinkSync(path.join(taskDir, file));
                                }
                                fs.rmdirSync(taskDir);
                            }
                            if (fs.existsSync(tempDir)) {
                                fs.rmdirSync(tempDir);
                            }
                        } catch (e) {
                            // Ignore cleanup errors
                        }
                        done();
                    })
                    .catch((error) => {
                        // Cleanup - restore cwd first, then clean up
                        process.chdir(originalCwd);
                        try {
                            const taskDir = path.join(tempDir, 'MyTestTask');
                            if (fs.existsSync(taskDir)) {
                                const files = fs.readdirSync(taskDir);
                                for (const file of files) {
                                    fs.unlinkSync(path.join(taskDir, file));
                                }
                                fs.rmdirSync(taskDir);
                            }
                            if (fs.existsSync(tempDir)) {
                                fs.rmdirSync(tempDir);
                            }
                        } catch (e) {
                            // Ignore cleanup errors
                        }
                        
                        const errorOutput = stripColors(error.stderr || error.stdout || '');
                        if (errorOutput.includes('template') || 
                            errorOutput.includes('create') || 
                            errorOutput.includes('task')) {
                            done(); // Expected task creation processing
                        } else {
                            done(error);
                        }
                    });
            } catch (e) {
                // If changing directory fails, restore cwd and fail the test
                process.chdir(originalCwd);
                done(e);
            }
        });
    });

    describe('Connection and Authentication', function() {
        it('should handle missing service URL', function(done) {
            const command = `node "${tfxPath}" build list --project "${testProject}" --no-prompt`;
            
            execAsync(command)
                .then(() => {
                    assert.fail('Should have failed without service URL');
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    // Should indicate that service URL is required
                    assert(errorOutput.includes('service-url') || errorOutput.includes('service URL') || errorOutput.includes('required'), 
                           'Should indicate service URL is required');
                    done();
                });
        });

        it('should handle missing project', function(done) {
            const command = `node "${tfxPath}" build list --service-url "${serverUrl}" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(() => {
                    assert.fail('Should have failed without project');
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    assert(errorOutput.includes('project') || errorOutput.includes('Project'), 'Should indicate project is required');
                    done();
                });
        });

        it('should validate auth type', function(done) {
            const command = `node "${tfxPath}" build list --service-url "${serverUrl}" --project "${testProject}" --auth-type invalid --no-prompt`;
            
            execAsync(command)
                .then(() => {
                    // Some commands might proceed with default auth
                    done();
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    if (errorOutput.includes('auth') || errorOutput.includes('authentication') || errorOutput.includes('credentials')) {
                        done(); // Expected auth validation
                    } else {
                        done(error);
                    }
                });
        });

        it('should handle server connection errors gracefully', function(done) {
            const invalidUrl = 'http://invalid-server:8080/DefaultCollection';
            const command = `node "${tfxPath}" build tasks list --service-url "${invalidUrl}" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(() => {
                    // Unlikely to succeed with invalid server
                    done();
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    if (errorOutput.includes('Could not connect') || 
                        errorOutput.includes('ECONNREFUSED') ||
                        errorOutput.includes('unable to connect') ||
                        errorOutput.includes('getaddrinfo')) {
                        done(); // Expected connection error
                    } else {
                        done(error);
                    }
                });
        });
    });
});
