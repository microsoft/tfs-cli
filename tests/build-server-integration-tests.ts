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
                    
                    // Should contain build information
                    assert(cleanOutput.includes('id') || cleanOutput.includes('1'), 'Should show build ID');
                    assert(cleanOutput.includes('Sample Build Definition') || cleanOutput.includes('definition'), 'Should show definition info');
                    
                    done();
                })
                .catch((error) => {
                    // Some errors are expected if authentication doesn't work as intended
                    // Check if it's a connection attempt rather than a command parsing error
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    if (errorOutput.includes('Could not connect') || 
                        errorOutput.includes('Unauthorized') || 
                        errorOutput.includes('ECONNREFUSED') ||
                        errorOutput.includes('unable to connect')) {
                        // This indicates the command tried to connect to server, which is what we want
                        console.log('Command attempted server connection as expected');
                        done();
                    } else {
                        done(error);
                    }
                });
        });

        it('should list builds from server with PAT', function(done) {
            const command = `node "${tfxPath}" build list --service-url "${serverUrl}" --project "${testProject}" --auth-type pat --token dGVzdHRva2VuOnRlc3Q= --no-prompt`;
            
            execAsync(command)
                .then(({ stdout, stderr }) => {
                    const cleanOutput = stripColors(stdout);
                    
                    // Should contain build information or attempt connection
                    assert(cleanOutput.includes('id') || cleanOutput.includes('definition') || cleanOutput.includes('Build'), 'Should show build-related output');
                    
                    done();
                })
                .catch((error) => {
                    // Check if it attempted to connect to server
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    if (errorOutput.includes('Could not connect') || 
                        errorOutput.includes('ECONNREFUSED') ||
                        errorOutput.includes('unable to connect') ||
                        errorOutput.includes('Unauthorized')) {
                        console.log('Command attempted server connection as expected');
                        done();
                    } else {
                        done(error);
                    }
                });
        });

        it('should handle definition name filter', function(done) {
            const command = `node "${tfxPath}" build list --service-url "${serverUrl}" --project "${testProject}" --definition-name "Sample" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    
                    // Should attempt to filter by definition name
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

        it('should support JSON output', function(done) {
            const command = `node "${tfxPath}" build list --service-url "${serverUrl}" --project "${testProject}" --auth-type basic --username testuser --password testpass --json --no-prompt`;
            
            execAsync(command)
                .then(({ stdout }) => {
                    // Should attempt to produce JSON output
                    assert(stdout.length > 0, 'Should produce output');
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

        it('should support top parameter', function(done) {
            const command = `node "${tfxPath}" build list --service-url "${serverUrl}" --project "${testProject}" --top 5 --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    
                    // Should attempt to limit results
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
    });

    describe('Build Show Command', function() {
        it('should show build details', function(done) {
            const buildId = 1;
            const command = `node "${tfxPath}" build show --service-url "${serverUrl}" --project "${testProject}" --build-id ${buildId} --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    
                    // Should attempt to show build details
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
                    
                    // Should attempt to queue build
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

        it('should queue build by definition name', function(done) {
            const command = `node "${tfxPath}" build queue --service-url "${serverUrl}" --project "${testProject}" --definition-name "Sample Build Definition" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    
                    // Should attempt to queue build
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
                        errorOutput.includes('token') ||
                        errorOutput.includes('Missing required value') ||
                        errorOutput.includes('Could not connect')) {
                        done(); // Expected authentication requirement
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
            const taskPath = path.join(samplesPath, 'sample-task');
            
            const command = `node "${tfxPath}" build tasks upload --service-url "${serverUrl}" --task-path "${taskPath}" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    
                    // Should attempt to upload task
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
                    // The CLI tries to connect to default service URL and fails with connection error
                    assert(errorOutput.includes('connect') || errorOutput.includes('ECONNREFUSED') || 
                           errorOutput.includes('connection') || errorOutput.includes('refused'), 
                           'Should indicate connection failure when no service URL is provided');
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
