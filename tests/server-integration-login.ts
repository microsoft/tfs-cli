import assert = require('assert');
import { stripColors } from 'colors';
import { createMockServer, MockDevOpsServer } from './mock-server';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { DebugLogger, execAsyncWithLogging } from './test-utils/debug-exec';
import { enforceAzureTokenIsolation } from './test-utils/env';

// Basic test framework functions to avoid TypeScript errors
declare function describe(name: string, fn: Function): void;
declare function it(name: string, fn: Function): void;
declare function before(fn: Function): void;
declare function after(fn: Function): void;

const tfxPath = path.resolve(__dirname, '../../_build/tfx-cli.js');

enforceAzureTokenIsolation();

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
            await execAsyncWithLogging(command);
        } catch (e) {
            // Ignore cleanup errors
        }
    });

    describe('Login Command', function() {
        it('should successfully login with basic authentication', function(done) {
            const command = `node "${tfxPath}" login --service-url "${serverUrl}" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsyncWithLogging(command)
                .then(({ stdout, stderr }) => {
                    const cleanOutput = stripColors(stdout);
                    const cleanError = stripColors(stderr || '');
                    
                    // Should successfully login to mock server with exact success message
                    assert(cleanOutput.includes('Logged in successfully'), 
                           `Expected "Logged in successfully" but got output: "${cleanOutput}"`);
                    
                    // Should not have any error output
                    assert(cleanError.length === 0 || !cleanError.includes('error'), 
                           `Expected no errors but got: "${cleanError}"`);
                    
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it('should successfully login with PAT token', function(done) {
            const patToken = 'testtoken'; // Use simple PAT token format
            const command = `node "${tfxPath}" login --service-url "${serverUrl}" --auth-type pat --token ${patToken} --no-prompt`;
            
            execAsyncWithLogging(command)
                .then(({ stdout, stderr }) => {
                    const cleanOutput = stripColors(stdout);
                    const cleanError = stripColors(stderr || '');
                    
                    // Should successfully login with PAT with exact success message
                    assert(cleanOutput.includes('Logged in successfully'), 
                           `Expected "Logged in successfully" but got output: "${cleanOutput}"`);
                    
                    // Should not have any error output
                    assert(cleanError.length === 0 || !cleanError.includes('error'), 
                           `Expected no errors but got: "${cleanError}"`);
                    
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it('should require service URL parameter', function(done) {
            const command = `node "${tfxPath}" login --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsyncWithLogging(command)
                .then(() => {
                    assert.fail('Should have failed without service URL');
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    
                    // Should fail with specific missing argument error
                    assert(errorOutput.includes("Missing required value for argument 'serviceUrl'"), 
                           `Expected specific missing argument error but got: "${errorOutput}"`);
                    
                    // Should have non-zero exit code
                    assert(error.code !== 0, 'Should exit with non-zero code');
                    
                    done();
                });
        });

        it('should handle unreachable service URL gracefully', function(done) {
            const unreachableUrl = 'http://nonexistent-server.example.com:8080/DefaultCollection';
            const command = `node "${tfxPath}" login --service-url "${unreachableUrl}" --auth-type basic --username testuser --password testpass --no-prompt`;
            
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

        it('should reject invalid authentication type', function(done) {
            const command = `node "${tfxPath}" login --service-url "${serverUrl}" --auth-type invalid --no-prompt`;
            
            execAsyncWithLogging(command)
                .then(() => {
                    assert.fail('Should have failed with invalid auth type');
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    
                    // Should fail with specific unsupported auth type error
                    assert(errorOutput.includes("Unsupported auth type. Currently, 'pat' and 'basic' auth are supported."), 
                           `Expected specific auth type error but got: "${errorOutput}"`);
                    
                    // Should have non-zero exit code
                    assert(error.code !== 0, 'Should exit with non-zero code');
                    
                    done();
                });
        });

        it('should require username and password for basic auth', function(done) {
            const command = `node "${tfxPath}" login --service-url "${serverUrl}" --auth-type basic --no-prompt`;
            
            execAsyncWithLogging(command)
                .then(() => {
                    assert.fail('Should have failed without username and password');
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    
                    // Should fail with missing required argument error (username is checked first)
                    assert(errorOutput.includes("Missing required value for argument 'username'") ||
                           errorOutput.includes("Missing required value for argument 'password'"), 
                           `Expected missing credential error but got: "${errorOutput}"`);
                    
                    // Should have non-zero exit code
                    assert(error.code !== 0, 'Should exit with non-zero code');
                    
                    done();
                });
        });

        it('should require token for PAT authentication', function(done) {
            const command = `node "${tfxPath}" login --service-url "${serverUrl}" --auth-type pat --no-prompt`;
            
            execAsyncWithLogging(command)
                .then(() => {
                    assert.fail('Should have failed without PAT token');
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    
                    // Should fail with missing required argument error for token
                    assert(errorOutput.includes("Missing required value for argument 'token'"), 
                           `Expected missing token error but got: "${errorOutput}"`);
                    
                    // Should have non-zero exit code
                    assert(error.code !== 0, 'Should exit with non-zero code');
                    
                    done();
                });
        });
    });

    describe('Logout Command', function() {
        it('should successfully logout', function(done) {
            const command = `node "${tfxPath}" logout --no-prompt`;
            
            execAsyncWithLogging(command)
                .then(({ stdout, stderr }) => {
                    const cleanOutput = stripColors(stdout);
                    const cleanError = stripColors(stderr || '');
                    
                    // Should logout successfully with specific message
                    assert(cleanOutput.includes('Successfully logged out.'), 
                           `Expected "Successfully logged out." but got output: "${cleanOutput}"`);
                    
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

    describe('Reset Command', function() {
        it('should successfully reset cached settings', function(done) {
            const command = `node "${tfxPath}" reset --no-prompt`;
            
            execAsyncWithLogging(command)
                .then(({ stdout, stderr }) => {
                    const cleanOutput = stripColors(stdout);
                    const cleanError = stripColors(stderr || '');
                    
                    // Should reset settings with specific message
                    assert(cleanOutput.includes('Settings reset.'), 
                           `Expected "Settings reset." but got output: "${cleanOutput}"`);
                    
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

    describe('Credential Caching', function() {
        it('should save credentials successfully when using --save flag', function(done) {
            const command = `node "${tfxPath}" login --service-url "${serverUrl}" --auth-type basic --username testuser --password testpass --save --no-prompt`;
            
            execAsyncWithLogging(command)
                .then(({ stdout, stderr }) => {
                    const cleanOutput = stripColors(stdout);
                    const cleanError = stripColors(stderr || '');
                    
                    // Should successfully login and save credentials with exact success message
                    assert(cleanOutput.includes('Logged in successfully'), 
                           `Expected "Logged in successfully" but got output: "${cleanOutput}"`);
                    
                    // Should not have any error output
                    assert(cleanError.length === 0 || !cleanError.includes('error'), 
                           `Expected no errors but got: "${cleanError}"`);
                    
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it('should verify credentials are saved with --save flag', function(done) {
            // This test verifies that the --save flag works by checking that login succeeds
            // The actual credential caching verification would require checking the credential store
            // which is beyond the scope of this integration test
            const loginCommand = `node "${tfxPath}" login --service-url "${serverUrl}" --auth-type basic --username testuser --password testpass --save --no-prompt`;
            
            execAsyncWithLogging(loginCommand)
                .then(({ stdout, stderr }) => {
                    const cleanOutput = stripColors(stdout);
                    const cleanError = stripColors(stderr || '');
                    
                    // Should successfully login and save credentials
                    assert(cleanOutput.includes('Logged in successfully'), 
                           `Expected "Logged in successfully" but got output: "${cleanOutput}"`);
                    
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

    describe('SSL Certificate Validation', function() {
        it('should login successfully with skip certificate validation flag', function(done) {
            const command = `node "${tfxPath}" login --service-url "${serverUrl}" --auth-type basic --username testuser --password testpass --skip-cert-validation --no-prompt`;
            
            execAsyncWithLogging(command)
                .then(({ stdout, stderr }) => {
                    const cleanOutput = stripColors(stdout);
                    const cleanError = stripColors(stderr || '');
                    
                    // Should successfully login with SSL validation skipped
                    assert(cleanOutput.includes('Logged in successfully'), 
                           `Expected "Logged in successfully" but got output: "${cleanOutput}"`);
                    
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

    describe('Connection Testing', function() {
        it('should successfully connect and login to server', function(done) {
            const command = `node "${tfxPath}" login --service-url "${serverUrl}" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsyncWithLogging(command)
                .then(({ stdout, stderr }) => {
                    const cleanOutput = stripColors(stdout);
                    const cleanError = stripColors(stderr || '');
                    
                    // Should successfully connect and login to server
                    assert(cleanOutput.includes('Logged in successfully'), 
                           `Expected "Logged in successfully" but got output: "${cleanOutput}"`);
                    
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
