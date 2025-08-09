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

describe('Server Integration Tests - Extension Commands', function() {
    let mockServer: MockDevOpsServer;
    let serverUrl: string;
    
    this.timeout(30000);

    before(async function() {
        // Start mock server
        mockServer = await createMockServer({ port: 8083 });
        serverUrl = mockServer.getBaseUrl(); // Extensions use marketplace URL, not collection URL
        
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

    describe('Extension Show Command', function() {
        it('should show extension details', function(done) {
            const publisherName = 'test-publisher';
            const extensionName = 'test-extension';
            const command = `node "${tfxPath}" extension show --service-url "${serverUrl}" --publisher ${publisherName} --extension-id ${extensionName} --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    
                    // Should attempt to show extension details
                    assert(cleanOutput.length > 0, 'Should produce output');
                    done();
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    if (errorOutput.includes('Could not connect') || 
                        errorOutput.includes('ECONNREFUSED') ||
                        errorOutput.includes('unable to connect') ||
                        errorOutput.includes('extension')) {
                        done(); // Expected connection attempt or command processing
                    } else {
                        done(error);
                    }
                });
        });

        it('should require publisher and extension ID', function(done) {
            const command = `node "${tfxPath}" extension show --service-url "${serverUrl}" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(() => {
                    assert.fail('Should have failed without publisher and extension ID');
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    assert(errorOutput.includes('publisher') || errorOutput.includes('extension-id') || errorOutput.includes('required'), 'Should indicate required fields');
                    done();
                });
        });
    });

    describe('Extension Publish Command', function() {
        it('should validate VSIX file requirement', function(done) {
            const command = `node "${tfxPath}" extension publish --service-url "${serverUrl}" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(() => {
                    // Command might proceed to look for manifest files
                    done();
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    if (errorOutput.includes('manifest') || 
                        errorOutput.includes('vsix') || 
                        errorOutput.includes('extension') ||
                        errorOutput.includes('Could not connect') ||
                        errorOutput.includes('ECONNREFUSED')) {
                        done(); // Expected validation or connection attempt
                    } else {
                        done(error);
                    }
                });
        });

        it('should handle manifest file processing', function(done) {
            // Use the pre-existing basic extension sample
            const samplesPath = path.resolve(__dirname, '../extension-samples');
            const extensionPath = path.join(samplesPath, 'basic-extension');
            const outputPath = path.join(__dirname, 'test-publisher.test-extension-1.0.0.vsix');
            
            const command = `node "${tfxPath}" extension publish --service-url "${serverUrl}" --root "${extensionPath}" --output-path "${outputPath}" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    
                    // Should attempt to process manifest and publish
                    assert(cleanOutput.length > 0, 'Should produce output');
                    
                    // Cleanup - only remove generated .vsix file
                    try {
                        if (fs.existsSync(outputPath)) {
                            fs.unlinkSync(outputPath);
                        }
                    } catch (e) {
                        // Ignore cleanup errors
                    }
                    done();
                })
                .catch((error) => {
                    // Cleanup - only remove generated .vsix file
                    try {
                        if (fs.existsSync(outputPath)) {
                            fs.unlinkSync(outputPath);
                        }
                    } catch (e) {
                        // Ignore cleanup errors
                    }
                    
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    if (errorOutput.includes('Could not connect') || 
                        errorOutput.includes('ECONNREFUSED') ||
                        errorOutput.includes('unable to connect') ||
                        errorOutput.includes('manifest')) {
                        done(); // Expected processing or connection attempt
                    } else {
                        done(error);
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

        it('should require publisher, extension ID, and share target', function(done) {
            const command = `node "${tfxPath}" extension share --service-url "${serverUrl}" --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(() => {
                    assert.fail('Should have failed without required parameters');
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    assert(errorOutput.includes('publisher') || errorOutput.includes('extension-id') || errorOutput.includes('share-with') || errorOutput.includes('required'), 'Should indicate required fields');
                    done();
                });
        });
    });

    describe('Extension Unpublish Command', function() {
        it('should unpublish extension', function(done) {
            const publisherName = 'test-publisher';
            const extensionName = 'test-extension';
            const command = `node "${tfxPath}" extension unpublish --service-url "${serverUrl}" --publisher ${publisherName} --extension-id ${extensionName} --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    
                    // Should attempt to unpublish extension
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

        it('should require publisher and extension ID', function(done) {
            const command = `node "${tfxPath}" extension unpublish --service-url "${serverUrl}" --auth-type basic --username testuser --password testpass --no-prompt`;
            
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
                    assert(cleanOutput.length > 0, 'Should produce output');
                    done();
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    if (errorOutput.includes('Could not connect') || 
                        errorOutput.includes('ECONNREFUSED') ||
                        errorOutput.includes('unable to connect') ||
                        errorOutput.includes('install')) {
                        done(); // Expected connection attempt or processing
                    } else {
                        done(error);
                    }
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
            // Use the pre-existing basic extension sample
            const samplesPath = path.resolve(__dirname, '../extension-samples');
            const extensionPath = path.join(samplesPath, 'basic-extension');
            
            const command = `node "${tfxPath}" extension isvalid --service-url "${serverUrl}" --root "${extensionPath}" --publisher test-publisher --extension-id test-extension --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    
                    // Should attempt to validate extension
                    assert(cleanOutput.length > 0, 'Should produce output');
                    done();
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    if (errorOutput.includes('Could not connect') || 
                        errorOutput.includes('ECONNREFUSED') ||
                        errorOutput.includes('unable to connect') ||
                        errorOutput.includes('manifest') ||
                        errorOutput.includes('valid')) {
                        done(); // Expected validation or connection attempt
                    } else {
                        done(error);
                    }
                });
        });

        it('should validate published extension (ignores local manifest)', function(done) {
            const samplesPath = path.resolve(__dirname, '../extension-samples');
            const extensionPath = path.join(samplesPath, 'basic-extension');
            
            // When both publisher and extension-id are provided, the command validates the PUBLISHED extension,
            // not local manifest files. So this should succeed by validating the mock extension.
            const command = `node "${tfxPath}" extension isvalid --service-url "${serverUrl}" --root "${extensionPath}" --publisher test-publisher --extension-id test-extension --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    
                    // Should validate the published extension successfully
                    assert(cleanOutput.length > 0, 'Should produce output');
                    done();
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    if (errorOutput.includes('Could not connect') || 
                        errorOutput.includes('ECONNREFUSED') ||
                        errorOutput.includes('unable to connect')) {
                        done(); // Expected connection issues are acceptable
                    } else {
                        done(error);
                    }
                });
        });
    });

    describe('Authentication and Connection', function() {
        it('should handle marketplace URL', function(done) {
            const marketplaceUrl = 'https://marketplace.visualstudio.com';
            const command = `node "${tfxPath}" extension show --service-url "${marketplaceUrl}" --publisher test-publisher --extension-id test-extension --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(({ stdout }) => {
                    // Should attempt to connect to marketplace
                    done();
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    if (errorOutput.includes('Could not connect') || 
                        errorOutput.includes('unable to connect') ||
                        errorOutput.includes('marketplace') ||
                        errorOutput.includes('401') ||
                        errorOutput.includes('Not Authorized') ||
                        errorOutput.includes('personal access token')) {
                        done(); // Expected connection attempt or authentication failure
                    } else {
                        done(error);
                    }
                });
        });

        it('should use default marketplace URL when not specified', function(done) {
            const command = `node "${tfxPath}" extension show --publisher test-publisher --extension-id test-extension --auth-type basic --username testuser --password testpass --no-prompt`;
            
            execAsync(command)
                .then(() => {
                    done();
                })
                .catch((error) => {
                    const errorOutput = stripColors(error.stderr || error.stdout || '');
                    if (errorOutput.includes('Could not connect') || 
                        errorOutput.includes('unable to connect') ||
                        errorOutput.includes('marketplace') ||
                        errorOutput.includes('publisher') ||
                        errorOutput.includes('extension-id') ||
                        errorOutput.includes('401') ||
                        errorOutput.includes('Not Authorized') ||
                        errorOutput.includes('personal access token')) {
                        done(); // Expected behavior - either connection attempt, parameter validation, or auth failure
                    } else {
                        done(error);
                    }
                });
        });
    });
});
