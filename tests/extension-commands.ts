import assert = require('assert');
import { stripColors } from 'colors';
const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');

// Basic test framework functions to avoid TypeScript errors
declare function describe(name: string, fn: Function): void;
declare function it(name: string, fn: Function): void;
declare function before(fn: Function): void;
declare function after(fn: Function): void;

const execAsync = promisify(exec);
const tfxPath = path.resolve(__dirname, '../../_build/tfx-cli.js');
const samplesPath = path.resolve(__dirname, '../extension-samples');

describe('Extension Commands', function() {
    this.timeout(30000);

    before((done) => {
        if (!fs.existsSync(samplesPath)) {
            throw new Error('Extension samples directory not found: ' + samplesPath);
        }
        done();
    });

    after(function() {
        // cleanup - remove any generated .vsix files
        const basicExtensionPath = path.join(samplesPath, 'basic-extension');
        if (fs.existsSync(basicExtensionPath)) {
            const files = fs.readdirSync(basicExtensionPath);
            files.forEach(file => {
                if (file.endsWith('.vsix')) {
                    fs.unlinkSync(path.join(basicExtensionPath, file));
                }
            });
        }
    });

    describe('Extension Command Group', function() {
        
        it('should display extension command group help', function(done) {
            execAsync(`node "${tfxPath}" extension --help`)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    assert(cleanOutput.includes('Available commands and command groups in tfx / extension'), 'Should show extension command hierarchy');
                    assert(cleanOutput.includes('create:'), 'Should list create command');
                    assert(cleanOutput.includes('publish:'), 'Should list publish command');
                    assert(cleanOutput.includes('show:'), 'Should list show command');
                    assert(cleanOutput.includes('install:'), 'Should list install command');
                    done();
                })
                .catch(done);
        });
    });

    describe('Extension Create Command', function() {
        
        it('should display create command help', function(done) {
            execAsync(`node "${tfxPath}" extension create --help`)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    assert(cleanOutput.includes('Create a vsix package for an extension'), 'Should show create command description');
                    assert(cleanOutput.includes('--root'), 'Should show root argument');
                    assert(cleanOutput.includes('--output-path'), 'Should show output-path argument');
                    done();
                })
                .catch(done);
        });

        it('should create extension from basic sample', function(done) {
            const basicExtensionPath = path.join(samplesPath, 'basic-extension');
            const outputPath = path.join(basicExtensionPath, 'test-extension.vsix');
            
            execAsync(`node "${tfxPath}" extension create --root "${basicExtensionPath}" --output-path "${outputPath}"`)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    assert(cleanOutput.includes('Completed operation: create extension'), 'Should indicate successful creation');
                    assert(fs.existsSync(outputPath), 'Should create .vsix file');
                    
                    const stats = fs.statSync(outputPath);
                    assert(stats.size > 0, 'Created .vsix file should not be empty');
                    done();
                })
                .catch(done);
        });

        it('should handle missing manifest file', function(done) {
            const tempDir = path.join(samplesPath, 'empty-dir');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir);
            }
            
            const outputPath = path.join(__dirname, 'temp-extension-create.vsix');
            execAsync(`node "${tfxPath}" extension create --root "${tempDir}" --output-path "${outputPath}" --no-prompt`)
                .then(() => {
                    done(new Error('Should have failed with missing manifest'));
                })
                .catch((error) => {
                    const cleanOutput = stripColors(error.stderr || error.stdout || error.message);
                    assert(cleanOutput.includes('ENOENT') || cleanOutput.includes('vss-extension.json') || cleanOutput.includes('manifest') || cleanOutput.includes('no manifests found'), 'Should mention missing manifest file');
                    
                    // Cleanup
                    try {
                        if (fs.existsSync(outputPath)) {
                            fs.unlinkSync(outputPath);
                        }
                        if (fs.existsSync(tempDir)) {
                            fs.rmSync(tempDir, { recursive: true, force: true });
                        }
                    } catch (e) {
                        // Ignore cleanup errors
                    }
                    done();
                });
        });
    });

    describe('Extension Show Command', function() {
        
        it('should display show command help', function(done) {
            execAsync(`node "${tfxPath}" extension show --help`)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    assert(cleanOutput.includes('Show info about a published Azure DevOps Services Extension'), 'Should show show command description');
                    assert(cleanOutput.includes('--publisher'), 'Should show publisher argument');
                    assert(cleanOutput.includes('--extension-id'), 'Should show extension-id argument');
                    done();
                })
                .catch(done);
        });
    });

    describe('Extension Publish Command', function() {
        
        it('should display publish command help', function(done) {
            execAsync(`node "${tfxPath}" extension publish --help`)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    assert(cleanOutput.includes('Publish a Visual Studio Marketplace Extension'), 'Should show publish command description');
                    assert(cleanOutput.includes('--token'), 'Should show token argument');
                    assert(cleanOutput.includes('--vsix'), 'Should show vsix argument');
                    done();
                })
                .catch(done);
        });
    });

    describe('Extension Install Command', function() {
        
        it('should display install command help', function(done) {
            execAsync(`node "${tfxPath}" extension install --help`)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    assert(cleanOutput.includes('Install a Azure DevOps Extension'), 'Should show install command description');
                    assert(cleanOutput.includes('--publisher'), 'Should show publisher argument');
                    assert(cleanOutput.includes('--extension-id'), 'Should show extension-id argument');
                    done();
                })
                .catch(done);
        });
    });

    describe('Extension Init Command', function() {
        
        it('should display init command help', function(done) {
            execAsync(`node "${tfxPath}" extension init --help`)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    assert(cleanOutput.includes('Initialize a directory for development'), 'Should show init command description');
                    done();
                })
                .catch(done);
        });
    });
});
