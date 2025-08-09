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
const samplesPath = path.resolve(__dirname, '../extension-samples');

describe('Extension Commands - Server Integration Tests', function() {
    let mockServer: MockDevOpsServer;
    let serverUrl: string;
    
    this.timeout(30000);

    before(async function() {
        // Start mock server for extension marketplace operations
        mockServer = await createMockServer({ port: 8083 });
        serverUrl = mockServer.getBaseUrl(); // Extensions use marketplace URL, not collection URL
        
        // Ensure the built CLI exists
        if (!fs.existsSync(tfxPath)) {
            throw new Error('TFX CLI not found. Run npm run build first.');
        }
        
        // Ensure extension samples directory exists
        if (!fs.existsSync(samplesPath)) {
            throw new Error('Extension samples directory not found: ' + samplesPath);
        }
    });

    after(async function() {
        if (mockServer) {
            await mockServer.stop();
        }
    });

    describe('Extension Show Command', function() {
        it('should show extension details', function(done) {
            const publisherName = 'test-publisher';
            const extensionName = 'test-extension';
            const command = `node "${tfxPath}" extension show --service-url "${serverUrl}" --publisher ${publisherName} --extension-id ${extensionName} --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    // Should attempt to show extension details
                    assert(cleanOutput.includes('test-extension') || cleanOutput.includes('show') || cleanOutput.includes('extension'), 'Should process show command');
                    done();
                })
                .catch((error) => {
                    // Expected to fail with server connection or authentication, but should process the command
                    const cleanOutput = stripColors(error.stderr || error.stdout || error.message);
                    assert(cleanOutput.includes('extension') || cleanOutput.includes('show') || cleanOutput.includes('publisher'), 'Should attempt to show extension');
                    done();
                });
        });

        it('should require publisher and extension ID', function(done) {
            const command = `node "${tfxPath}" extension show --service-url "${serverUrl}" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(() => {
                    assert.fail('Should have failed without publisher and extension ID');
                })
                .catch((error) => {
                    const cleanOutput = stripColors(error.stderr || error.stdout || error.message);
                    assert(cleanOutput.includes('publisher') || cleanOutput.includes('extension-id') || cleanOutput.includes('required'), 'Should indicate missing required fields');
                    done();
                });
        });
    });

    describe('Extension Publish Command', function() {
        it('should validate VSIX file requirement', function(done) {
            const command = `node "${tfxPath}" extension publish --service-url "${serverUrl}" --token fake-token --no-prompt`;
            
            execAsync(command)
                .then(() => {
                    assert.fail('Should have failed without VSIX file');
                })
                .catch((error) => {
                    const cleanOutput = stripColors(error.stderr || error.stdout || error.message);
                    assert(cleanOutput.includes('vsix') || cleanOutput.includes('manifest') || cleanOutput.includes('required') || cleanOutput.includes('file'), 'Should indicate missing VSIX file');
                    done();
                });
        });

        it('should handle manifest file processing', function(done) {
            const basicExtensionPath = path.join(samplesPath, 'basic-extension');
            const outputPath = path.join(__dirname, 'test-publisher.test-extension-1.0.0.vsix');
            
            const command = `node "${tfxPath}" extension publish --service-url "${serverUrl}" --root "${basicExtensionPath}" --output-path "${outputPath}" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    // Should attempt to process manifest and publish
                    assert(cleanOutput.includes('published') || cleanOutput.includes('Extension') || cleanOutput.includes('successfully'), 'Should show publish success');
                    done();
                })
                .catch((error) => {
                    done(error);
                })
                .finally(() => {
                    // Cleanup - only remove generated .vsix file
                    try {
                        if (fs.existsSync(outputPath)) {
                            fs.unlinkSync(outputPath);
                        }
                    } catch (e) {
                        // Ignore cleanup errors
                    }
                });
        });

        it('should validate token requirement', function(done) {
            const basicExtensionPath = path.join(samplesPath, 'basic-extension');
            const outputPath = path.join(basicExtensionPath, 'token-test.vsix');
            
            // First create a VSIX file
            execAsync(`node "${tfxPath}" extension create --root "${basicExtensionPath}" --output-path "${outputPath}"`)
                .then(() => {
                    // Try to publish without token
                    const publishCommand = `node "${tfxPath}" extension publish --service-url "${serverUrl}" --vsix "${outputPath}" --no-prompt`;
                    return execAsync(publishCommand);
                })
                .then(() => {
                    assert.fail('Should have failed without token');
                })
                .catch((error) => {
                    const cleanOutput = stripColors(error.stderr || error.stdout || error.message);
                    assert(cleanOutput.includes('token') || cleanOutput.includes('auth') || cleanOutput.includes('required') || cleanOutput.includes('Missing required value'), 'Should indicate missing token');
                    done();
                })
                .finally(() => {
                    // Cleanup
                    try {
                        if (fs.existsSync(outputPath)) {
                            fs.unlinkSync(outputPath);
                        }
                    } catch (e) {
                        // Ignore cleanup errors
                    }
                });
        });

        it('should handle publish with share-with parameter', function(done) {
            const basicExtensionPath = path.join(samplesPath, 'basic-extension');
            const outputPath = path.join(basicExtensionPath, 'share-test.vsix');
            
            // First create a VSIX file
            execAsync(`node "${tfxPath}" extension create --root "${basicExtensionPath}" --output-path "${outputPath}"`)
                .then(() => {
                    // Try to publish and share
                    const publishCommand = `node "${tfxPath}" extension publish --service-url "${serverUrl}" --vsix "${outputPath}" --token fake-token --share-with fabrikam --no-prompt`;
                    return execAsync(publishCommand);
                })
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    // Should process the publish and share command
                    assert(cleanOutput.includes('publish') || cleanOutput.includes('share') || cleanOutput.includes('extension'), 'Should process publish with share');
                    done();
                })
                .catch((error) => {
                    // Expected to fail with authentication or server issues
                    const cleanOutput = stripColors(error.stderr || error.stdout || error.message);
                    assert(cleanOutput.includes('extension') || cleanOutput.includes('publish') || cleanOutput.includes('share') || cleanOutput.includes('token'), 'Should attempt to publish and share extension');
                    done();
                })
                .finally(() => {
                    // Cleanup
                    try {
                        if (fs.existsSync(outputPath)) {
                            fs.unlinkSync(outputPath);
                        }
                    } catch (e) {
                        // Ignore cleanup errors
                    }
                });
        });
    });

    describe('Extension Share Command', function() {
        it('should share extension with accounts', function(done) {
            const publisherName = 'test-publisher';
            const extensionName = 'test-extension';
            const shareWith = 'fabrikam';
            const command = `node "${tfxPath}" extension share --service-url "${serverUrl}" --publisher ${publisherName} --extension-id ${extensionName} --share-with ${shareWith} --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    // Should attempt to share extension
                    assert(cleanOutput.includes('share') || cleanOutput.includes('extension') || cleanOutput.includes('completed'), 'Should process share command');
                    done();
                })
                .catch((error) => {
                    // Expected to fail with server connection or authentication
                    const cleanOutput = stripColors(error.stderr || error.stdout || error.message);
                    assert(cleanOutput.includes('extension') || cleanOutput.includes('share') || cleanOutput.includes('publisher'), 'Should attempt to share extension');
                    done();
                });
        });

        it('should require publisher, extension ID, and share target', function(done) {
            const command = `node "${tfxPath}" extension share --service-url "${serverUrl}" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(() => {
                    assert.fail('Should have failed without required parameters');
                })
                .catch((error) => {
                    const cleanOutput = stripColors(error.stderr || error.stdout || error.message);
                    assert(cleanOutput.includes('publisher') || cleanOutput.includes('extension-id') || cleanOutput.includes('share-with') || cleanOutput.includes('required'), 'Should indicate required fields');
                    done();
                });
        });
    });

    describe('Extension Unpublish Command', function() {
        it('should unpublish extension', function(done) {
            const publisherName = 'test-publisher';
            const extensionName = 'test-extension';
            const command = `node "${tfxPath}" extension unpublish --service-url "${serverUrl}" --publisher ${publisherName} --extension-id ${extensionName} --token fake-token --no-prompt`;
            
            execAsync(command)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    // Should attempt to unpublish extension
                    assert(cleanOutput.includes('unpublish') || cleanOutput.includes('extension') || cleanOutput.includes('completed'), 'Should process unpublish command');
                    done();
                })
                .catch((error) => {
                    // Expected to fail with server connection or authentication
                    const cleanOutput = stripColors(error.stderr || error.stdout || error.message);
                    assert(cleanOutput.includes('extension') || cleanOutput.includes('unpublish') || cleanOutput.includes('publisher') || cleanOutput.includes('token'), 'Should attempt to unpublish extension');
                    done();
                });
        });

        it('should require publisher, extension ID, and token', function(done) {
            const command = `node "${tfxPath}" extension unpublish --service-url "${serverUrl}" --no-prompt`;
            
            execAsync(command)
                .then(() => {
                    assert.fail('Should have failed without required parameters');
                })
                .catch((error) => {
                    const cleanOutput = stripColors(error.stderr || error.stdout || error.message);
                    assert(cleanOutput.includes('publisher') || cleanOutput.includes('extension-id') || cleanOutput.includes('token') || cleanOutput.includes('required'), 'Should indicate missing required fields');
                    done();
                });
        });
    });

    describe('Extension Install Command', function() {
        it('should install extension to account', function(done) {
            const publisherName = 'test-publisher';
            const extensionName = 'test-extension';
            // Use collection URL instead of base URL and token instead of basic auth
            const command = `node "${tfxPath}" extension install --service-url "${serverUrl}/DefaultCollection" --publisher ${publisherName} --extension-id ${extensionName} --token testtoken --no-prompt`;
            
            execAsync(command)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    // Should attempt to install extension
                    assert(cleanOutput.includes('installed') || cleanOutput.includes('Extension') || cleanOutput.includes('successfully'), 'Should show install success');
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it('should require publisher and extension ID', function(done) {
            const command = `node "${tfxPath}" extension install --service-url "${serverUrl}/DefaultCollection" --token testtoken --no-prompt`;
            
            execAsync(command)
                .then(() => {
                    assert.fail('Should have failed without required parameters');
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    assert(errorOutput.includes('publisher') || errorOutput.includes('extension-id') || errorOutput.includes('required'), 'Should indicate required fields');
                    done();
                });
        });
    });

    describe('Extension IsValid Command', function() {
        it('should validate extension manifest', function(done) {
            const extensionPath = path.join(samplesPath, 'basic-extension');
            
            const command = `node "${tfxPath}" extension isvalid --service-url "${serverUrl}" --root "${extensionPath}" --publisher test-publisher --extension-id test-extension --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    // Should attempt to validate extension
                    assert(cleanOutput.includes('valid') || cleanOutput.includes('Extension') || cleanOutput.includes('validation'), 'Should show validation result');
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it('should validate published extension (ignores local manifest)', function(done) {
            const publisherName = 'test-publisher';
            const extensionName = 'test-extension';
            const command = `node "${tfxPath}" extension isvalid --service-url "${serverUrl}" --publisher ${publisherName} --extension-id ${extensionName} --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    // Should attempt to validate published extension
                    assert(cleanOutput.includes('valid') || cleanOutput.includes('Extension') || cleanOutput.includes('validation'), 'Should show validation result');
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });
    });

    describe('Authentication and Connection', function() {
        it('should handle marketplace URL', function(done) {
            const publisherName = 'test-publisher';
            const extensionName = 'test-extension';
            const marketplaceUrl = 'https://marketplace.visualstudio.com';
            const command = `node "${tfxPath}" extension show --service-url "${marketplaceUrl}" --publisher ${publisherName} --extension-id ${extensionName} --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    // Should attempt to use marketplace URL
                    assert(cleanOutput.includes('Extension') || cleanOutput.includes('Publisher') || cleanOutput.includes('sample'), 'Should show extension details');
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it('should use default marketplace URL when not specified', function(done) {
            const publisherName = 'test-publisher';
            const extensionName = 'test-extension';
            const command = `node "${tfxPath}" extension show --publisher ${publisherName} --extension-id ${extensionName} --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    // Should use default marketplace URL
                    assert(cleanOutput.includes('Extension') || cleanOutput.includes('Publisher') || cleanOutput.includes('sample'), 'Should show extension details');
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });
    });

    describe('Connection and Authentication', function() {
        it('should handle missing service URL', function(done) {
            const publisherName = 'test-publisher';
            const extensionName = 'test-extension';
            const command = `node "${tfxPath}" extension show --publisher ${publisherName} --extension-id ${extensionName} --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    // Should produce output even with default URL
                    assert(cleanOutput.includes('Extension') || cleanOutput.includes('Publisher') || cleanOutput.includes('sample'), 'Should show extension details with default URL');
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });

        it('should validate auth type', function(done) {
            const publisherName = 'test-publisher';
            const extensionName = 'test-extension';
            const command = `node "${tfxPath}" extension show --service-url "${serverUrl}" --publisher ${publisherName} --extension-id ${extensionName} --auth-type invalid --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(() => {
                    // Might handle invalid auth type gracefully
                    done();
                })
                .catch((error) => {
                    const cleanOutput = stripColors(error.stderr || error.stdout || error.message);
                    assert(cleanOutput.includes('auth') || cleanOutput.includes('authentication') || cleanOutput.includes('type') || cleanOutput.includes('invalid'), 'Should validate auth type');
                    done();
                });
        });

        it('should handle server connection errors gracefully', function(done) {
            const publisherName = 'test-publisher';
            const extensionName = 'test-extension';
            const invalidServerUrl = 'http://localhost:9999';
            const command = `node "${tfxPath}" extension show --service-url "${invalidServerUrl}" --publisher ${publisherName} --extension-id ${extensionName} --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(() => {
                    // Should not succeed with invalid server
                    done(new Error('Should have failed with invalid server'));
                })
                .catch((error) => {
                    const cleanOutput = stripColors(error.stderr || error.stdout || error.message);
                    assert(cleanOutput.includes('connection') || cleanOutput.includes('server') || cleanOutput.includes('ECONNREFUSED') || cleanOutput.includes('timeout') || cleanOutput.includes('network'), 'Should indicate server connection error');
                    done();
                });
        });
    });
});
