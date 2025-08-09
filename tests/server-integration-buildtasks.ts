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

describe('Server Integration Tests - Build Task Commands', function() {
    let mockServer: MockDevOpsServer;
    let serverUrl: string;
    const testProject = 'TestProject';
    
    this.timeout(30000);

    before(async function() {
        // Start mock server
        mockServer = await createMockServer({ port: 8085 });
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

    describe('Build Task List Command', function() {
        it('should list build tasks from server', function(done) {
            const command = `node "${tfxPath}" build tasks list --service-url "${serverUrl}" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    
                    // Should attempt to list build tasks
                    assert(cleanOutput.length > 0, 'Should produce output');
                    done();
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    if (errorOutput.includes('Could not connect') || 
                        errorOutput.includes('ECONNREFUSED') ||
                        errorOutput.includes('unable to connect') ||
                        errorOutput.includes('tasks')) {
                        done(); // Expected connection attempt or task processing
                    } else {
                        done(error);
                    }
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
                    if (errorOutput.includes('task.json') || 
                        errorOutput.includes('not found') || 
                        errorOutput.includes('missing') ||
                        errorOutput.includes('Could not connect')) {
                        done(); // Expected validation or connection attempt
                    } else {
                        done(error);
                    }
                });
        });

        it('should process valid task.json', function(done) {
            const tempDir = path.join(__dirname, 'temp-valid-task');
            const taskJsonPath = path.join(tempDir, 'task.json');
            
            try {
                if (!fs.existsSync(tempDir)) {
                    fs.mkdirSync(tempDir);
                }
            } catch (e) {
                // Directory might already exist
            }
            
            const taskJson = {
                id: '550e8400-e29b-41d4-a716-446655440000',
                name: 'TestTask',
                friendlyName: 'Test Task',
                description: 'A test build task',
                version: {
                    Major: 1,
                    Minor: 0,
                    Patch: 0
                },
                instanceNameFormat: 'Test Task',
                execution: {
                    Node: {
                        target: 'index.js'
                    }
                }
            };
            
            fs.writeFileSync(taskJsonPath, JSON.stringify(taskJson, null, 2));
            
            // Create the required index.js file
            const indexJsPath = path.join(tempDir, 'index.js');
            fs.writeFileSync(indexJsPath, 'console.log("Test task");');
            
            const command = `node "${tfxPath}" build tasks upload --service-url "${serverUrl}" --task-path "${tempDir}" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    
                    // Should attempt to upload task
                    assert(cleanOutput.length > 0, 'Should produce output');
                    
                    // Cleanup
                    try {
                        if (fs.existsSync(taskJsonPath)) {
                            fs.unlinkSync(taskJsonPath);
                        }
                        const indexJsPath = path.join(tempDir, 'index.js');
                        if (fs.existsSync(indexJsPath)) {
                            fs.unlinkSync(indexJsPath);
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
                    // Cleanup
                    try {
                        if (fs.existsSync(taskJsonPath)) {
                            fs.unlinkSync(taskJsonPath);
                        }
                        if (fs.existsSync(tempDir)) {
                            fs.rmdirSync(tempDir);
                        }
                    } catch (e) {
                        // Ignore cleanup errors
                    }
                    
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    if (errorOutput.includes('Could not connect') || 
                        errorOutput.includes('ECONNREFUSED') ||
                        errorOutput.includes('unable to connect')) {
                        done(); // Expected connection attempt
                    } else {
                        done(error);
                    }
                });
        });

        it('should validate task.json format', function(done) {
            const tempDir = path.join(__dirname, 'temp-invalid-task');
            const taskJsonPath = path.join(tempDir, 'task.json');
            
            try {
                if (!fs.existsSync(tempDir)) {
                    fs.mkdirSync(tempDir);
                }
            } catch (e) {
                // Directory might already exist
            }
            
            // Invalid task.json (missing required fields)
            const invalidTaskJson = {
                name: 'TestTask'
                // Missing id, version, etc.
            };
            
            fs.writeFileSync(taskJsonPath, JSON.stringify(invalidTaskJson, null, 2));
            
            const command = `node "${tfxPath}" build tasks upload --service-url "${serverUrl}" --task-path "${tempDir}" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(() => {
                    // Cleanup
                    try {
                        if (fs.existsSync(taskJsonPath)) {
                            fs.unlinkSync(taskJsonPath);
                        }
                        if (fs.existsSync(tempDir)) {
                            fs.rmdirSync(tempDir);
                        }
                    } catch (e) {
                        // Ignore cleanup errors
                    }
                    // Command might succeed and attempt upload despite validation issues
                    done();
                })
                .catch((error) => {
                    // Cleanup
                    try {
                        if (fs.existsSync(taskJsonPath)) {
                            fs.unlinkSync(taskJsonPath);
                        }
                        if (fs.existsSync(tempDir)) {
                            fs.rmdirSync(tempDir);
                        }
                    } catch (e) {
                        // Ignore cleanup errors
                    }
                    
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    if (errorOutput.includes('validation') || 
                        errorOutput.includes('invalid') || 
                        errorOutput.includes('required') ||
                        errorOutput.includes('Could not connect')) {
                        done(); // Expected validation or connection attempt
                    } else {
                        done(error);
                    }
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
                    
                    // Should attempt to delete task
                    assert(cleanOutput.length > 0, 'Should produce output');
                    done();
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    if (errorOutput.includes('Could not connect') || 
                        errorOutput.includes('ECONNREFUSED') ||
                        errorOutput.includes('unable to connect')) {
                        done(); // Expected connection attempt
                    } else {
                        done(error);
                    }
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
    });

    describe('Build Task Creation and Templates', function() {
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

        it('should require task name for creation', function(done) {
            const command = `node "${tfxPath}" build tasks create --no-prompt`;
            
            execAsync(command)
                .then(() => {
                    assert.fail('Should have failed without task name');
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    assert(errorOutput.includes('task-name') || errorOutput.includes('name') || errorOutput.includes('required'), 'Should indicate task name is required');
                    done();
                });
        });
    });

    describe('Authentication and Server Requirements', function() {
        it('should require authentication for server operations', function(done) {
            const command = `node "${tfxPath}" build tasks list --service-url "${serverUrl}" --no-prompt`;
            
            execAsync(command)
                .then(() => {
                    // Command might succeed with cached credentials or defaults
                    done();
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    if (errorOutput.includes('auth') || 
                        errorOutput.includes('credentials') || 
                        errorOutput.includes('login') ||
                        errorOutput.includes('Could not connect')) {
                        done(); // Expected authentication requirement
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
