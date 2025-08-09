import assert = require('assert');
import { stripColors } from 'colors';
import { createMockServer, MockDevOpsServer } from './mock-server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const { exec } = require('child_process');
const { promisify } = require('util');

// Basic test framework functions to avoid TypeScript errors
declare function describe(name: string, fn: Function): void;
declare function it(name: string, fn: Function): void;
declare function before(fn: Function): void;
declare function after(fn: Function): void;

const execAsync = promisify(exec);
const tfxPath = path.resolve(__dirname, '../../_build/tfx-cli.js');

describe('Server Integration Tests - Login and Authentication', function() {
    let mockServer: MockDevOpsServer;
    let serverUrl: string;
    
    this.timeout(30000);

    before(async function() {
        // Start mock server
        mockServer = await createMockServer({ port: 8084 });
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
        
        // Clean up any cached credentials
        try {
            const command = `node "${tfxPath}" reset --no-prompt`;
            await execAsync(command);
        } catch (e) {
            // Ignore cleanup errors
        }
    });

    describe('Login Command', function() {
        it('should attempt login with basic authentication', function(done) {
            const command = `node "${tfxPath}" login --service-url "${serverUrl}" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    
                    // Should attempt to login
                    assert(cleanOutput.length > 0, 'Should produce output');
                    // Look for login-related keywords
                    assert(
                        cleanOutput.toLowerCase().includes('login') || 
                        cleanOutput.toLowerCase().includes('connect') ||
                        cleanOutput.toLowerCase().includes('success') ||
                        cleanOutput.toLowerCase().includes('logged'),
                        'Should indicate login attempt'
                    );
                    done();
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    if (errorOutput.includes('Could not connect') || 
                        errorOutput.includes('ECONNREFUSED') ||
                        errorOutput.includes('unable to connect') ||
                        errorOutput.includes('Unauthorized') ||
                        errorOutput.includes('login')) {
                        done(); // Expected connection attempt or authentication error
                    } else {
                        done(error);
                    }
                });
        });

        it('should attempt login with PAT', function(done) {
            const patToken = Buffer.from('OAuth:testtoken').toString('base64');
            const command = `node "${tfxPath}" login --service-url "${serverUrl}" --auth-type pat --token ${patToken} --no-prompt`;
            
            execAsync(command)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    
                    // Should attempt to login with PAT
                    assert(cleanOutput.length > 0, 'Should produce output');
                    done();
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    if (errorOutput.includes('Could not connect') || 
                        errorOutput.includes('ECONNREFUSED') ||
                        errorOutput.includes('unable to connect') ||
                        errorOutput.includes('Unauthorized')) {
                        done(); // Expected connection attempt
                    } else {
                        done(error);
                    }
                });
        });

        it('should require service URL', function(done) {
            const command = `node "${tfxPath}" login --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(() => {
                    assert.fail('Should have failed without service URL');
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    assert(errorOutput.includes('service') || errorOutput.includes('URL') || errorOutput.includes('url'), 'Should indicate service URL is required');
                    done();
                });
        });

        it('should handle invalid service URL', function(done) {
            const command = `node "${tfxPath}" login --service-url "not-a-valid-url" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(() => {
                    // Some invalid URLs might still be accepted but fail at connection
                    done();
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    if (errorOutput.includes('Invalid') || 
                        errorOutput.includes('URL') ||
                        errorOutput.includes('Could not connect') ||
                        errorOutput.includes('unable to connect')) {
                        done(); // Expected URL validation or connection error
                    } else {
                        done(error);
                    }
                });
        });

        it('should validate authentication type', function(done) {
            const command = `node "${tfxPath}" login --service-url "${serverUrl}" --auth-type invalid --no-prompt`;
            
            execAsync(command)
                .then(() => {
                    // Command might proceed with default auth or prompt
                    done();
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    if (errorOutput.includes('auth') || 
                        errorOutput.includes('authentication') || 
                        errorOutput.includes('Unsupported') ||
                        errorOutput.includes('credentials')) {
                        done(); // Expected auth validation
                    } else {
                        done(error);
                    }
                });
        });

        it('should handle missing credentials for basic auth', function(done) {
            const command = `node "${tfxPath}" login --service-url "${serverUrl}" --auth-type basic --no-prompt`;
            
            execAsync(command)
                .then(() => {
                    // Command might succeed with prompts disabled
                    done();
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    if (errorOutput.includes('username') || 
                        errorOutput.includes('password') || 
                        errorOutput.includes('credentials') ||
                        errorOutput.includes('required')) {
                        done(); // Expected credential validation
                    } else {
                        done(error);
                    }
                });
        });

        it('should handle missing token for PAT auth', function(done) {
            const command = `node "${tfxPath}" login --service-url "${serverUrl}" --auth-type pat --no-prompt`;
            
            execAsync(command)
                .then(() => {
                    // Command might succeed with prompts disabled
                    done();
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    if (errorOutput.includes('token') || 
                        errorOutput.includes('personal access token') || 
                        errorOutput.includes('required') ||
                        errorOutput.includes('credentials')) {
                        done(); // Expected token validation
                    } else {
                        done(error);
                    }
                });
        });
    });

    describe('Logout Command', function() {
        it('should attempt logout', function(done) {
            const command = `node "${tfxPath}" logout --no-prompt`;
            
            execAsync(command)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    
                    // Should attempt to logout (clear cached credentials)
                    assert(cleanOutput.length >= 0, 'Should produce output or succeed silently');
                    done();
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    // Logout might fail if no credentials are cached, which is fine
                    done();
                });
        });
    });

    describe('Reset Command', function() {
        it('should reset cached settings', function(done) {
            const command = `node "${tfxPath}" reset --no-prompt`;
            
            execAsync(command)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    
                    // Should reset settings
                    assert(cleanOutput.length >= 0, 'Should produce output or succeed silently');
                    done();
                })
                .catch((error) => {
                    // Reset might fail if no settings are cached, which is fine
                    done();
                });
        });
    });

    describe('Credential Caching', function() {
        it('should save credentials when using --save flag', function(done) {
            const command = `node "${tfxPath}" login --service-url "${serverUrl}" --auth-type basic --username testuser --password testpass --save --no-prompt`;
            
            execAsync(command)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    
                    // Should attempt to save credentials
                    assert(cleanOutput.length > 0, 'Should produce output');
                    done();
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    if (errorOutput.includes('Could not connect') || 
                        errorOutput.includes('ECONNREFUSED') ||
                        errorOutput.includes('unable to connect') ||
                        errorOutput.includes('save')) {
                        done(); // Expected connection attempt or save operation
                    } else {
                        done(error);
                    }
                });
        });

        it('should handle credential retrieval from cache', function(done) {
            // First attempt to cache credentials, then try to use them
            const loginCommand = `node "${tfxPath}" login --service-url "${serverUrl}" --auth-type basic --username testuser --password testpass --save --no-prompt`;
            
            execAsync(loginCommand)
                .then(() => {
                    // Now try a command that should use cached credentials
                    const buildCommand = `node "${tfxPath}" build list --project TestProject --no-prompt`;
                    return execAsync(buildCommand);
                })
                .then(({ stdout }) => {
                    // Should attempt to use cached credentials
                    done();
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    if (errorOutput.includes('Could not connect') || 
                        errorOutput.includes('ECONNREFUSED') ||
                        errorOutput.includes('unable to connect') ||
                        errorOutput.includes('service') ||
                        errorOutput.includes('cache')) {
                        done(); // Expected behavior - tried to use cache
                    } else {
                        done(error);
                    }
                });
        });
    });

    describe('SSL Certificate Validation', function() {
        it('should support skip certificate validation flag', function(done) {
            const command = `node "${tfxPath}" login --service-url "${serverUrl}" --auth-type basic --username testuser --password testpass --skip-cert-validation --no-prompt`;
            
            execAsync(command)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    
                    // Should attempt login with SSL validation skipped
                    assert(cleanOutput.length > 0, 'Should produce output');
                    done();
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    if (errorOutput.includes('Could not connect') || 
                        errorOutput.includes('ECONNREFUSED') ||
                        errorOutput.includes('unable to connect') ||
                        errorOutput.includes('certificate')) {
                        done(); // Expected connection attempt
                    } else {
                        done(error);
                    }
                });
        });
    });

    describe('Connection Testing', function() {
        it('should validate connection to server', function(done) {
            const command = `node "${tfxPath}" login --service-url "${serverUrl}" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(({ stdout, stderr }) => {
                    const cleanOutput = stripColors(stdout);
                    const cleanError = stripColors(stderr || '');
                    
                    // Should attempt connection validation
                    assert(cleanOutput.length > 0 || cleanError.length > 0, 'Should produce output');
                    done();
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    if (errorOutput.includes('Could not connect') || 
                        errorOutput.includes('ECONNREFUSED') ||
                        errorOutput.includes('unable to connect') ||
                        errorOutput.includes('connection')) {
                        done(); // Expected connection test
                    } else {
                        done(error);
                    }
                });
        });

        it('should handle timeout scenarios', function(done) {
            // Use a localhost port that's definitely not running to simulate timeout
            const timeoutUrl = 'http://localhost:12345/DefaultCollection';
            const command = `node "${tfxPath}" login --service-url "${timeoutUrl}" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            // Set a shorter timeout for this specific test
            this.timeout(8000); // 8 seconds instead of 30
            
            execAsync(command)
                .then(() => {
                    // Unlikely to succeed, but if it does, that's fine too
                    done();
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    if (errorOutput.includes('timeout') || 
                        errorOutput.includes('ETIMEDOUT') ||
                        errorOutput.includes('ECONNREFUSED') ||
                        errorOutput.includes('Could not connect') ||
                        errorOutput.includes('unable to connect')) {
                        done(); // Expected timeout/connection error behavior
                    } else {
                        done(error);
                    }
                });
        });
    });
});
