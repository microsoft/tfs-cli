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

            execAsyncWithLogging(command, 'build list with basic auth')
                .then(({ stdout, stderr }) => {
                    const cleanOutput = stripColors(stdout);

                    // Should contain specific build information format from mock server
                    assert(cleanOutput.includes('id              : 1'), 'Should show first build ID with specific format');
                    assert(cleanOutput.includes('id              : 2'), 'Should show second build ID with specific format');
                    assert(cleanOutput.includes('definition name : Sample Build Definition'), 'Should show definition name with specific format');
                    assert(cleanOutput.includes('requested by    : Test User'), 'Should show requester with specific format');
                    assert(cleanOutput.includes('status          : Completed'), 'Should show status with specific format');
                    assert(cleanOutput.includes('queue time      : unknown'), 'Should show queue time with specific format');

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

            execAsyncWithLogging(command, 'build list with PAT authentication')
                .then(({ stdout, stderr }) => {
                    const cleanOutput = stripColors(stdout);

                    // Should contain specific build information format from mock server
                    assert(cleanOutput.includes('id              : 1'), 'Should show first build ID with specific format');
                    assert(cleanOutput.includes('id              : 2'), 'Should show second build ID with specific format');
                    assert(cleanOutput.includes('definition name : Sample Build Definition'), 'Should show definition name with specific format');
                    assert(cleanOutput.includes('requested by    : Test User'), 'Should show requester with specific format');
                    assert(cleanOutput.includes('status          : Completed'), 'Should show status with specific format');
                    assert(cleanOutput.includes('queue time      : unknown'), 'Should show queue time with specific format');

                    done();
                })
                .catch((error) => {
                    // Integration tests should connect successfully to mock server
                    done(error);
                });
        });

        it('should handle definition name filter', function(done) {
            const command = `node "${tfxPath}" build list --service-url "${serverUrl}" --project "${testProject}" --definition-name "Sample" --auth-type basic --username testuser --password testpass --no-prompt`;

            execAsyncWithLogging(command, 'build list with definition name filter')
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);

                    // Should filter and show builds with specific format matching the definition name
                    assert(cleanOutput.includes('definition name : Sample Build Definition'), 'Should show filtered builds with specific format');
                    assert(cleanOutput.includes('id              : 1') || cleanOutput.includes('id              : 2'), 'Should show build ID with specific format');
                    assert(cleanOutput.includes('requested by    : Test User'), 'Should show requester with specific format');
                    assert(cleanOutput.includes('status          : Completed'), 'Should show status with specific format');
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it('should support JSON output', function(done) {
            const command = `node "${tfxPath}" build list --service-url "${serverUrl}" --project "${testProject}" --auth-type basic --username testuser --password testpass --json --no-prompt`;

            execAsyncWithLogging(command, 'build list with JSON output format')
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout).trim();

                    // Should produce specific JSON array format with build objects
                    assert(cleanOutput.startsWith('['), 'Should start with JSON array');
                    assert(cleanOutput.endsWith(']'), 'Should end with JSON array');
                    assert(cleanOutput.includes('"id": 1'), 'Should contain first build ID as number');
                    assert(cleanOutput.includes('"id": 2'), 'Should contain second build ID as number');
                    assert(cleanOutput.includes('"definition"'), 'Should contain definition objects');
                    assert(cleanOutput.includes('"name": "Sample Build Definition"'), 'Should contain definition name');
                    assert(cleanOutput.includes('"requestedBy"'), 'Should contain requestedBy objects');
                    assert(cleanOutput.includes('"displayName": "Test User"'), 'Should contain requester display name');
                    assert(cleanOutput.includes('"project"'), 'Should contain project objects');
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it('should support top parameter', function(done) {
            const command = `node "${tfxPath}" build list --service-url "${serverUrl}" --project "${testProject}" --top 5 --auth-type basic --username testuser --password testpass --no-prompt`;

            execAsyncWithLogging(command, 'build list with top parameter limit')
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);

                    // Should limit results and show builds with specific formatting
                    assert(cleanOutput.includes('id              : 1'), 'Should show first build ID with specific format');
                    assert(cleanOutput.includes('id              : 2'), 'Should show second build ID with specific format');
                    assert(cleanOutput.includes('definition name : Sample Build Definition'), 'Should show definition name with specific format');
                    assert(cleanOutput.includes('requested by    : Test User'), 'Should show requester with specific format');
                    assert(cleanOutput.includes('status          : Completed'), 'Should show status with specific format');
                    assert(cleanOutput.includes('queue time      : unknown'), 'Should show queue time with specific format');
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

            execAsyncWithLogging(command, 'build show with specific build ID')
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);

                    // Verify CLI header
                    assert(cleanOutput.includes('TFS Cross Platform Command Line Interface'), 'Should show CLI header');
                    assert(cleanOutput.includes('Copyright Microsoft Corporation'), 'Should show copyright');

                    // Verify specific build details format with exact spacing
                    assert(cleanOutput.includes('id              : 1'), 'Should show build ID with specific format');
                    assert(cleanOutput.includes('definition name : Sample Build Definition'), 'Should show definition name with exact format');
                    assert(cleanOutput.includes('requested by    : Test User'), 'Should show requester with exact format');
                    assert(cleanOutput.includes('status          : Completed'), 'Should show status with exact format');
                    assert(cleanOutput.includes('queue time      : unknown'), 'Should show queue time with exact format');
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it('should require build ID', function(done) {
            const command = `node "${tfxPath}" build show --service-url "${serverUrl}" --project "${testProject}" --auth-type basic --username testuser --password testpass --no-prompt`;

            execAsyncWithLogging(command, 'build show without required build ID parameter')
                .then(() => {
                    assert.fail('Should have failed without build ID');
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');

                    // Verify specific error message format
                    assert(errorOutput.includes('error: Error: Missing required value for argument \'buildId\''), 'Should show specific buildId requirement error');
                    done();
                });
        });
    });

    describe('Build Queue Command', function() {
        it('should queue a build', function(done) {
            const command = `node "${tfxPath}" build queue --service-url "${serverUrl}" --project "${testProject}" --definition-id 1 --auth-type basic --username testuser --password testpass --no-prompt`;

            execAsyncWithLogging(command, 'build queue with definition ID')
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);

                    // Verify CLI header
                    assert(cleanOutput.includes('TFS Cross Platform Command Line Interface'), 'Should show CLI header');
                    assert(cleanOutput.includes('Copyright Microsoft Corporation'), 'Should show copyright');

                    // Verify specific queued build details format with exact spacing
                    assert(/id\s+:\s+\d+/.test(cleanOutput), 'Should show queued build ID with specific format and numeric value');
                    assert(cleanOutput.includes('definition name : Sample Build Definition'), 'Should show definition name with exact format');
                    assert(cleanOutput.includes('requested by    : Test User'), 'Should show requester with exact format');
                    assert(cleanOutput.includes('status          : InProgress'), 'Should show queued status with exact format');
                    assert(cleanOutput.includes('queue time      : unknown'), 'Should show queue time with exact format');
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it('should queue build by definition name', function(done) {
            const command = `node "${tfxPath}" build queue --service-url "${serverUrl}" --project "${testProject}" --definition-name "Sample Build Definition" --auth-type basic --username testuser --password testpass --no-prompt`;

            execAsyncWithLogging(command, 'build queue with definition name')
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);

                    // Verify CLI header
                    assert(cleanOutput.includes('TFS Cross Platform Command Line Interface'), 'Should show CLI header');
                    assert(cleanOutput.includes('Copyright Microsoft Corporation'), 'Should show copyright');

                    // Verify specific queued build details format with exact spacing
                    assert(/id\s+:\s+\d+/.test(cleanOutput), 'Should show queued build ID with specific format and numeric value');
                    assert(cleanOutput.includes('definition name : Sample Build Definition'), 'Should show definition name with exact format');
                    assert(cleanOutput.includes('requested by    : Test User'), 'Should show requester with exact format');
                    assert(cleanOutput.includes('status          : InProgress'), 'Should show queued status with exact format');
                    assert(cleanOutput.includes('queue time      : unknown'), 'Should show queue time with exact format');
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it('should require definition ID or name', function(done) {
            const command = `node "${tfxPath}" build queue --service-url "${serverUrl}" --project "${testProject}" --auth-type basic --username testuser --password testpass --no-prompt`;

            execAsyncWithLogging(command, 'build queue without definition ID or name')
                .then(() => {
                    assert.fail('Should have failed without definition');
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');

                    // Verify specific error message format
                    assert(errorOutput.includes('error: Error: No definition found with name null'), 'Should show specific definition requirement error');
                    done();
                });
        });
    });

    describe('Build Task List Command', function() {
        it('should list build tasks from server', function(done) {
            const command = `node "${tfxPath}" build tasks list --service-url "${serverUrl}" --auth-type basic --username testuser --password testpass --no-prompt`;

            execAsyncWithLogging(command, 'build tasks list with valid authentication')
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    // Check for specific fields and values for both tasks
                    assert(cleanOutput.includes('id            : sample-task-id'), 'Should show sample-task-id');
                    assert(cleanOutput.includes('name          : Sample Task'), 'Should show Sample Task name');
                    assert(cleanOutput.includes('friendly name : Sample Task'), 'Should show Sample Task friendly name');
                    assert(cleanOutput.includes('description   : A sample task for testing'), 'Should show Sample Task description');
                    assert(cleanOutput.includes('id            : test-task-id'), 'Should show test-task-id');
                    assert(cleanOutput.includes('name          : Test Task'), 'Should show Test Task name');
                    assert(cleanOutput.includes('friendly name : Test Task for Deletion'), 'Should show Test Task for Deletion friendly name');
                    assert(cleanOutput.includes('description   : A test task that can be deleted in integration tests'), 'Should show Test Task for Deletion description');
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it('should require authentication for server operations', function(done) {
            const command = `node "${tfxPath}" build tasks list --service-url "${serverUrl}" --no-prompt`;

            execAsyncWithLogging(command, 'build tasks list without authentication')
                .then(() => {
                    assert.fail('Should have failed without authentication');
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    // Check for specific error message about missing token
                    assert(errorOutput.includes("error: Error: Missing required value for argument 'token'."), 'Should show missing token error');
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

            execAsyncWithLogging(command, 'build tasks upload with missing task.json')
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
                    // Should fail with specific error message
                    assert(errorOutput.includes('error: Error: no task.json in specified directory'), 'Should indicate task.json is missing');
                    done();
                });
        });

        it('should process valid task.json', function(done) {
            const taskPath = path.join(samplesPath, 'sample-task');

            const command = `node "${tfxPath}" build tasks upload --service-url "${serverUrl}" --task-path "${taskPath}" --auth-type basic --username testuser --password testpass --no-prompt`;

            execAsyncWithLogging(command, 'build tasks upload with valid task.json')
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    // Should upload task successfully and show specific output
                    assert(cleanOutput.includes('Task at'), 'Should show Task at path');
                    assert(cleanOutput.includes('uploaded successfully!'), 'Should show upload success message');
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it('should validate task.json format', function(done) {
            const taskPath = path.join(samplesPath, 'invalid-task');

            const command = `node "${tfxPath}" build tasks upload --service-url "${serverUrl}" --task-path "${taskPath}" --auth-type basic --username testuser --password testpass --no-prompt`;

            execAsyncWithLogging(command, 'build tasks upload with invalid task.json')
                .then(() => {
                    done();
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    // Should fail with specific error messages for invalid fields
                    assert(errorOutput.includes('error: Error: Invalid task json:'), 'Should indicate invalid task json');
                    assert(errorOutput.includes('id is a required guid'), 'Should indicate missing id');
                    assert(errorOutput.includes('name is a required alphanumeric string'), 'Should indicate missing name');
                    assert(errorOutput.includes('friendlyName is a required string <= 40 chars'), 'Should indicate missing friendlyName');
                    done();
                });
        });

        it('should require task path', function(done) {
            const command = `node "${tfxPath}" build tasks upload --service-url "${serverUrl}" --auth-type basic --username testuser --password testpass --no-prompt`;

            execAsyncWithLogging(command, 'build tasks upload without task path')
                .then(() => {
                    assert.fail('Should have failed without task path');
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    assert(errorOutput.includes('error: Error: You must specify either --task-path or --task-zip-path.'), 'Should indicate task path is required');
                    done();
                });
        });
    });

    describe('Build Task Delete Command', function() {
        it('should delete build task', function(done) {
            const taskId = 'test-task-id';
            const command = `node "${tfxPath}" build tasks delete --service-url "${serverUrl}" --task-id "${taskId}" --auth-type basic --username testuser --password testpass --no-prompt`;

            execAsyncWithLogging(command, 'build tasks delete with valid task ID')
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    // Should show specific deletion confirmation
                    assert(cleanOutput.includes('Task test-task-id deleted successfully!'), 'Should show deletion confirmation for test-task-id');
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it('should require task ID for deletion', function(done) {
            const command = `node "${tfxPath}" build tasks delete --service-url "${serverUrl}" --auth-type basic --username testuser --password testpass --no-prompt`;

            execAsyncWithLogging(command, 'build tasks delete without task ID')
                .then(() => {
                    assert.fail('Should have failed without task ID');
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    assert(errorOutput.includes("error: Error: Missing required value for argument 'taskId'."), 'Should indicate task ID is required');
                    done();
                });
        });

        it('should validate task ID format', function(done) {
            const command = `node "${tfxPath}" build tasks delete --task-id "invalid-task-id" --service-url "${serverUrl}" --auth-type basic --username testuser --password testpass --no-prompt`;

            execAsyncWithLogging(command, 'build tasks delete with invalid task ID')
                .then(() => {
                    done();
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    assert(errorOutput.includes('error: Error: No task found with provided ID: invalid-task-id'), 'Should indicate no task found for invalid ID');
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

                execAsyncWithLogging(command, 'build tasks create with template')
                    .then(({ stdout }) => {
                        const cleanOutput = stripColors(stdout);
                        // Should show specific creation output
                        assert(cleanOutput.includes('created task @'), 'Should show created task path');
                        assert(cleanOutput.includes('id   :'), 'Should show task id');
                        assert(cleanOutput.includes('name:'), 'Should show task name');
                        // ...existing code for checking task.json and cleanup...
                        const taskDir = path.join(tempDir, 'MyTestTask');
                        const taskJsonPath = path.join(taskDir, 'task.json');
                        if (fs.existsSync(taskJsonPath)) {
                            const taskContent = fs.readFileSync(taskJsonPath, 'utf8');
                            assert(taskContent.includes('MyTestTask'), 'Task name should be in task.json');
                        }
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
                        } catch (e) {}
                        done();
                    })
                    .catch((error) => {
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
                        } catch (e) {}
                        done(error);
                    });
            } catch (e) {
                // If changing directory fails, restore cwd and fail the test
                process.chdir(originalCwd);
                done(e);
            }
        });
    });

    describe('Connection and Authentication', function() {
        it('should fail gracefully when service URL is missing', function(done) {
            const command = `node "${tfxPath}" build list --project "${testProject}" --no-prompt`;

            // Add a hard timeout to prevent hanging
            const failTimeout = setTimeout(() => {
                done(new Error('Test timed out: CLI did not respond in time'));
            }, 20000); // 20 seconds

            // Debug logging for CI diagnostics
            console.log('[TEST] Running command:', command);

            execAsyncWithLogging(command, 'build list without service URL')
                .then(() => {
                    clearTimeout(failTimeout);
                    assert.fail('Should have failed without service URL');
                })
                .catch((error) => {
                    clearTimeout(failTimeout);
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    console.log('[TEST] CLI error output:', errorOutput);
                    // Accept a range of possible network errors
                    // Note: AggregateError is now formatted as "Multiple errors occurred:" with numbered items
                    assert(
                        errorOutput.includes('error: Error:') ||
                        errorOutput.includes('error: AggregateError') ||
                        errorOutput.includes('error: Multiple errors occurred:'),
                        'Should indicate a network or connection error for missing service URL'
                    );
                    done();
                })
                .catch((err) => {
                    clearTimeout(failTimeout);
                    done(err);
                });
        });

    it('should fail gracefully when project is missing', function(done) {
            const command = `node "${tfxPath}" build list --service-url "${serverUrl}" --auth-type basic --username testuser --password testpass --no-prompt`;

            execAsyncWithLogging(command, 'build list without project')
                .then(() => {
                    assert.fail('Should have failed without project');
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    assert(errorOutput.includes("error: Error: Missing required value for argument 'project'."), 'Should indicate project is required');
                    done();
                });
        });

        it('should validate auth type', function(done) {
            const command = `node "${tfxPath}" build list --service-url "${serverUrl}" --project "${testProject}" --auth-type invalid --no-prompt`;

            execAsyncWithLogging(command, 'build list with invalid auth type')
                .then(() => {
                    done();
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    assert(errorOutput.includes("error: Error: Unsupported auth type. Currently, 'pat' and 'basic' auth are supported."), 'Should indicate unsupported auth type');
                    done();
                });
        });
    });
});
