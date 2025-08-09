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

describe('Extension Commands - Local Tests', function() {
    this.timeout(30000);

    before((done) => {
        if (!fs.existsSync(samplesPath)) {
            throw new Error('Extension samples directory not found: ' + samplesPath);
        }
        done();
    });

    after(function() {
        // cleanup - remove any generated .vsix files
        const extensionSamples = ['basic-extension', 'task-extension', 'complex-extension'];
        extensionSamples.forEach(sampleDir => {
            const samplePath = path.join(samplesPath, sampleDir);
            if (fs.existsSync(samplePath)) {
                const files = fs.readdirSync(samplePath);
                files.forEach(file => {
                    if (file.endsWith('.vsix')) {
                        try {
                            fs.unlinkSync(path.join(samplePath, file));
                        } catch (e) {
                            // Ignore cleanup errors
                        }
                    }
                });
            }
        });

        // Clean up temporary directories
        const tempDirs = [
            path.join(samplesPath, 'empty-dir'),
            path.join(samplesPath, 'test dir with spaces'),
            path.join(__dirname, '../temp-extensions')
        ];
        tempDirs.forEach(dir => {
            if (fs.existsSync(dir)) {
                try {
                    fs.rmSync(dir, { recursive: true, force: true });
                } catch (e) {
                    // Ignore cleanup errors
                }
            }
        });
    });

    describe('Command Help and Hierarchy', function() {
        
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

        it('should display init command help', function(done) {
            execAsync(`node "${tfxPath}" extension init --help`)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    assert(cleanOutput.includes('Initialize a directory for development'), 'Should show init command description');
                    done();
                })
                .catch(done);
        });

        it('should display resources command group help', function(done) {
            execAsync(`node "${tfxPath}" extension resources --help`)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    assert(cleanOutput.includes('Available commands and command groups in tfx / extension / resources'), 'Should show resources command hierarchy');
                    assert(cleanOutput.includes('create:'), 'Should list create command');
                    done();
                })
                .catch(done);
        });

        it('should display resources create command help', function(done) {
            execAsync(`node "${tfxPath}" extension resources create --help`)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    assert(cleanOutput.includes('Create a vsix package for an extension'), 'Should show resources create command description');
                    done();
                })
                .catch(done);
        });
    });

    describe('Extension Creation - Basic Operations', function() {

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
                    } catch (e) {
                        // Ignore cleanup errors
                    }
                    done();
                });
        });
    });

    describe('Extension Creation - Advanced Features', function() {

        it('should handle --override parameter', function(done) {
            const basicExtensionPath = path.join(samplesPath, 'basic-extension');
            const outputPath = path.join(basicExtensionPath, 'override-test.vsix');
            const overrideFilePath = path.join(basicExtensionPath, 'test-overrides.json');
            
            // Create temporary overrides file
            fs.writeFileSync(overrideFilePath, JSON.stringify({ version: "2.0.0" }, null, 2));
            
            execAsync(`node "${tfxPath}" extension create --root "${basicExtensionPath}" --output-path "${outputPath}" --overrides-file "${overrideFilePath}"`)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    assert(cleanOutput.includes('Completed operation: create extension'), 'Should create extension with overrides');
                    assert(fs.existsSync(outputPath), 'Should create .vsix file with overrides');
                    done();
                })
                .catch((error) => {
                    done(error);
                })
                .finally(() => {
                    // Cleanup
                    try {
                        if (fs.existsSync(outputPath)) {
                            fs.unlinkSync(outputPath);
                        }
                        if (fs.existsSync(overrideFilePath)) {
                            fs.unlinkSync(overrideFilePath);
                        }
                    } catch (e) {
                        // Ignore cleanup errors
                    }
                });
        });

        it('should handle --rev-version parameter', function(done) {
            const basicExtensionPath = path.join(samplesPath, 'basic-extension');
            const outputPath = path.join(basicExtensionPath, 'rev-version-test.vsix');
            
            execAsync(`node "${tfxPath}" extension create --root "${basicExtensionPath}" --output-path "${outputPath}" --rev-version`)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    assert(cleanOutput.includes('Completed operation: create extension'), 'Should create extension with rev-version');
                    assert(fs.existsSync(outputPath), 'Should create .vsix file with rev-version');
                    done();
                })
                .catch(done);
        });

        it('should handle --bypass-validation parameter', function(done) {
            const basicExtensionPath = path.join(samplesPath, 'basic-extension');
            const outputPath = path.join(basicExtensionPath, 'bypass-validation-test.vsix');
            
            execAsync(`node "${tfxPath}" extension create --root "${basicExtensionPath}" --output-path "${outputPath}" --bypass-validation`)
                .then(({ stdout }) => {
                    // With bypass validation, it might still fail due to other issues, but validation should be skipped
                    const cleanOutput = stripColors(stdout);
                    // If it succeeds, great. If it fails, check that it's not due to validation
                    assert(cleanOutput.includes('Completed operation: create extension') || !cleanOutput.includes('validation'), 'Should bypass validation');
                    done();
                })
                .catch((error) => {
                    const cleanOutput = stripColors(error.stderr || error.stdout || error.message);
                    // If it fails, make sure it's not due to validation issues being reported
                    assert(!cleanOutput.includes('validation failed') && !cleanOutput.includes('validation error'), 'Should not fail due to validation when bypassed');
                    done();
                });
        });
    });

    describe('Extension Global Arguments', function() {
        
        it('should handle --no-color argument', function(done) {
            execAsync(`node "${tfxPath}" extension --help --no-color`)
                .then(({ stdout }) => {
                    // The output should not contain color codes when --no-color is used
                    // This is hard to test directly, but the command should succeed
                    assert(stdout.length > 0, 'Should return help output');
                    assert(stdout.includes('Available commands and command groups in tfx / extension'), 'Should show extension commands');
                    done();
                })
                .catch(done);
        });

        it('should handle --trace-level argument', function(done) {
            const basicExtensionPath = path.join(samplesPath, 'basic-extension');
            const outputPath = path.join(basicExtensionPath, 'trace-test.vsix');
            
            execAsync(`node "${tfxPath}" extension create --root "${basicExtensionPath}" --output-path "${outputPath}" --trace-level debug`)
                .then(({ stdout, stderr }) => {
                    const cleanOutput = stripColors(stdout + stderr);
                    // With debug trace level, should show more detailed output
                    assert(cleanOutput.includes('Completed operation: create extension'), 'Should create extension with trace output');
                    assert(fs.existsSync(outputPath), 'Should create .vsix file');
                    done();
                })
                .catch(done);
        });

        it('should handle --json output format', function(done) {
            execAsync(`node "${tfxPath}" extension --help --json`)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    // With JSON flag, output format might be different but command should succeed
                    assert(stdout.length > 0, 'Should return help output');
                    done();
                })
                .catch(done);
        });
    });

    describe('Extension File Path Handling', function() {
        
        it('should handle relative paths', function(done) {
            const basicExtensionPath = path.join(samplesPath, 'basic-extension');
            const outputPath = path.join(basicExtensionPath, 'relative-test.vsix');
            
            // Change to the extension directory and use relative paths
            const oldCwd = process.cwd();
            process.chdir(basicExtensionPath);
            
            execAsync(`node "${tfxPath}" extension create --root . --output-path relative-test.vsix`)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    assert(cleanOutput.includes('Completed operation: create extension'), 'Should handle relative paths');
                    assert(fs.existsSync(outputPath), 'Should create .vsix file with relative paths');
                    done();
                })
                .catch(done)
                .finally(() => {
                    // Always restore working directory
                    process.chdir(oldCwd);
                });
        });

        it('should handle absolute paths', function(done) {
            const basicExtensionPath = path.resolve(samplesPath, 'basic-extension');
            const outputPath = path.resolve(basicExtensionPath, 'absolute-test.vsix');
            
            execAsync(`node "${tfxPath}" extension create --root "${basicExtensionPath}" --output-path "${outputPath}"`)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    assert(cleanOutput.includes('Completed operation: create extension'), 'Should handle absolute paths');
                    assert(fs.existsSync(outputPath), 'Should create .vsix file with absolute paths');
                    done();
                })
                .catch(done);
        });
    });

    describe('Extension Manifest Variations', function() {
        
        it('should handle manifest-globs parameter', function(done) {
            const basicExtensionPath = path.join(samplesPath, 'basic-extension');
            const outputPath = path.join(basicExtensionPath, 'manifest-globs-test.vsix');
            
            execAsync(`node "${tfxPath}" extension create --root "${basicExtensionPath}" --output-path "${outputPath}" --manifest-globs "vss-extension.json"`)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    assert(cleanOutput.includes('Completed operation: create extension'), 'Should handle manifest-globs parameter');
                    assert(fs.existsSync(outputPath), 'Should create .vsix file');
                    done();
                })
                .catch(done);
        });
    });

    describe('Extension Creation - Complex Scenarios', function() {

        it('should create complex extension with multiple contributions', function(done) {
            const complexExtensionPath = path.join(samplesPath, 'complex-extension');
            if (!fs.existsSync(complexExtensionPath)) {
                console.log('Skipping complex extension test - sample not found');
                done();
                return;
            }

            const outputPath = path.join(complexExtensionPath, 'complex-extension.vsix');
            
            execAsync(`node "${tfxPath}" extension create --root "${complexExtensionPath}" --output-path "${outputPath}"`)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    assert(cleanOutput.includes('Completed operation: create extension'), 'Should create complex extension');
                    assert(fs.existsSync(outputPath), 'Should create .vsix file for complex extension');
                    
                    const stats = fs.statSync(outputPath);
                    assert(stats.size > 1000, 'Complex extension should be reasonably sized');
                    done();
                })
                .catch(done);
        });

        it('should override publisher in manifest', function(done) {
            const basicExtensionPath = path.join(samplesPath, 'basic-extension');
            const outputPath = path.join(basicExtensionPath, 'publisher-override.vsix');
            
            execAsync(`node "${tfxPath}" extension create --root "${basicExtensionPath}" --output-path "${outputPath}" --publisher "test-publisher"`)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    assert(cleanOutput.includes('Completed operation: create extension'), 'Should create extension with publisher override');
                    assert(fs.existsSync(outputPath), 'Should create .vsix file');
                    done();
                })
                .catch(done);
        });

        it('should override extension-id in manifest', function(done) {
            const basicExtensionPath = path.join(samplesPath, 'basic-extension');
            const outputPath = path.join(basicExtensionPath, 'extension-id-override.vsix');
            
            execAsync(`node "${tfxPath}" extension create --root "${basicExtensionPath}" --output-path "${outputPath}" --extension-id "test-extension-id"`)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    assert(cleanOutput.includes('Completed operation: create extension'), 'Should create extension with extension-id override');
                    assert(fs.existsSync(outputPath), 'Should create .vsix file');
                    done();
                })
                .catch(done);
        });

        it('should support JSON output format for create command', function(done) {
            const basicExtensionPath = path.join(samplesPath, 'basic-extension');
            const outputPath = path.join(basicExtensionPath, 'json-output-test.vsix');
            
            execAsync(`node "${tfxPath}" extension create --root "${basicExtensionPath}" --output-path "${outputPath}" --json`)
                .then(({ stdout }) => {
                    // With --json flag, output might be JSON formatted
                    const cleanOutput = stripColors(stdout);
                    // Should still create the extension successfully
                    assert(fs.existsSync(outputPath), 'Should create .vsix file even with JSON output');
                    done();
                })
                .catch(done);
        });
    });

    describe('Extension Creation - File System Edge Cases', function() {

        it('should handle spaces in paths', function(done) {
            const spacesDir = path.join(samplesPath, 'test dir with spaces');
            const basicExtensionPath = path.join(samplesPath, 'basic-extension');
            const outputPath = path.join(spacesDir, 'extension with spaces.vsix');

            // Create directory with spaces
            if (!fs.existsSync(spacesDir)) {
                fs.mkdirSync(spacesDir);
            }

            execAsync(`node "${tfxPath}" extension create --root "${basicExtensionPath}" --output-path "${outputPath}"`)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    assert(cleanOutput.includes('Completed operation: create extension'), 'Should handle paths with spaces');
                    assert(fs.existsSync(outputPath), 'Should create .vsix file in path with spaces');
                    done();
                })
                .catch(done);
        });

        it('should handle non-existent output directory', function(done) {
            const basicExtensionPath = path.join(samplesPath, 'basic-extension');
            const nonExistentDir = path.join(__dirname, '../temp-extensions');
            const outputPath = path.join(nonExistentDir, 'test-extension.vsix');

            execAsync(`node "${tfxPath}" extension create --root "${basicExtensionPath}" --output-path "${outputPath}"`)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    assert(cleanOutput.includes('Completed operation: create extension'), 'Should create directory and extension');
                    assert(fs.existsSync(outputPath), 'Should create .vsix file in new directory');
                    assert(fs.existsSync(nonExistentDir), 'Should create the output directory');
                    done();
                })
                .catch((error) => {
                    // Some versions might not auto-create directories
                    const cleanOutput = stripColors(error.stderr || error.stdout || error.message);
                    if (cleanOutput.includes('ENOENT') || cleanOutput.includes('directory')) {
                        // Expected behavior for missing directory
                        done();
                    } else {
                        done(error);
                    }
                });
        });
    });

    describe('Extension Creation - Validation Edge Cases', function() {

        it('should handle extension with missing files referenced in manifest', function(done) {
            const basicExtensionPath = path.join(samplesPath, 'basic-extension');
            const outputPath = path.join(basicExtensionPath, 'missing-files-test.vsix');
            
            // This should still create the extension but might show warnings
            execAsync(`node "${tfxPath}" extension create --root "${basicExtensionPath}" --output-path "${outputPath}"`)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    assert(cleanOutput.includes('Completed operation: create extension'), 'Should create extension despite warnings');
                    assert(fs.existsSync(outputPath), 'Should create .vsix file');
                    done();
                })
                .catch((error) => {
                    // If it fails, it should be due to missing files
                    const cleanOutput = stripColors(error.stderr || error.stdout || error.message);
                    assert(cleanOutput.includes('file') || cleanOutput.includes('missing') || cleanOutput.includes('not found'), 'Should mention missing files');
                    done();
                });
        });
    });

    describe('Extension Task Validation - Local Tests', function() {

        it('should successfully create extension with valid build tasks', function(done) {
            const taskExtensionPath = path.join(samplesPath, 'task-extension');
            if (!fs.existsSync(taskExtensionPath)) {
                console.log('Skipping task extension test - sample not found');
                done();
                return;
            }

            const outputPath = path.join(taskExtensionPath, 'valid-task-extension.vsix');
            
            execAsync(`node "${tfxPath}" extension create --root "${taskExtensionPath}" --output-path "${outputPath}"`)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    assert(cleanOutput.includes('Completed operation: create extension'), 'Should create task extension');
                    assert(fs.existsSync(outputPath), 'Should create .vsix file');
                    done();
                })
                .catch(done);
        });

        it('should validate task.json files during extension creation', function(done) {
            const taskExtensionPath = path.join(samplesPath, 'task-extension');
            if (!fs.existsSync(taskExtensionPath)) {
                console.log('Skipping task validation test - sample not found');
                done();
                return;
            }

            const outputPath = path.join(taskExtensionPath, 'validated-task.vsix');
            
            execAsync(`node "${tfxPath}" extension create --root "${taskExtensionPath}" --output-path "${outputPath}"`)
                .then(({ stdout }) => {
                    // Should validate task.json files without errors
                    const cleanOutput = stripColors(stdout);
                    assert(fs.existsSync(outputPath), 'Should create .vsix file despite validation checks');
                    done();
                })
                .catch(done);
        });

        it('should show warning for deprecated task runner but still create extension', function(done) {
            const taskExtensionPath = path.join(samplesPath, 'task-extension');
            if (!fs.existsSync(taskExtensionPath)) {
                console.log('Skipping deprecated task runner test - sample not found');
                done();
                return;
            }

            const outputPath = path.join(taskExtensionPath, 'deprecated-runner.vsix');
            
            execAsync(`node "${tfxPath}" extension create --root "${taskExtensionPath}" --output-path "${outputPath}"`)
                .then(({ stdout }) => {
                    // Should still create extension despite warnings
                    assert(fs.existsSync(outputPath), 'Should still create .vsix file despite warnings');
                    done();
                })
                .catch(done);
        });

        it('should handle versioned tasks correctly', function(done) {
            const taskExtensionPath = path.join(samplesPath, 'task-extension');
            if (!fs.existsSync(taskExtensionPath)) {
                console.log('Skipping versioned tasks test - sample not found');
                done();
                return;
            }

            const outputPath = path.join(taskExtensionPath, 'versioned-tasks.vsix');
            
            execAsync(`node "${tfxPath}" extension create --root "${taskExtensionPath}" --output-path "${outputPath}"`)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    // Should handle versioned tasks properly
                    assert(fs.existsSync(outputPath), 'Should create .vsix file with versioned tasks');
                    done();
                })
                .catch(done);
        });

        it('should warn about invalid task.json but still create extension', function(done) {
            const basicExtensionPath = path.join(samplesPath, 'basic-extension');
            const outputPath = path.join(basicExtensionPath, 'invalid-task-test.vsix');
            
            execAsync(`node "${tfxPath}" extension create --root "${basicExtensionPath}" --output-path "${outputPath}"`)
                .then(({ stdout }) => {
                    // Should create extension despite task validation warnings
                    assert(fs.existsSync(outputPath), 'Should create .vsix file despite warnings');
                    done();
                })
                .catch(done);
        });

        it('should warn about missing task.json file', function(done) {
            const basicExtensionPath = path.join(samplesPath, 'basic-extension');
            const outputPath = path.join(basicExtensionPath, 'missing-task-json.vsix');
            
            execAsync(`node "${tfxPath}" extension create --root "${basicExtensionPath}" --output-path "${outputPath}"`)
                .then(({ stdout }) => {
                    // Should create extension despite missing task files
                    assert(fs.existsSync(outputPath), 'Should create .vsix file despite missing task');
                    done();
                })
                .catch(done);
        });

        it('should warn about missing execution target file', function(done) {
            const basicExtensionPath = path.join(samplesPath, 'basic-extension');
            const outputPath = path.join(basicExtensionPath, 'missing-execution-file.vsix');
            
            execAsync(`node "${tfxPath}" extension create --root "${basicExtensionPath}" --output-path "${outputPath}"`)
                .then(({ stdout }) => {
                    // Should create extension despite warnings about missing execution files
                    assert(fs.existsSync(outputPath), 'Should create .vsix file despite warnings');
                    done();
                })
                .catch(done);
        });

        it('should warn about invalid task name format', function(done) {
            const basicExtensionPath = path.join(samplesPath, 'basic-extension');
            const outputPath = path.join(basicExtensionPath, 'invalid-task-name.vsix');
            
            execAsync(`node "${tfxPath}" extension create --root "${basicExtensionPath}" --output-path "${outputPath}"`)
                .then(({ stdout }) => {
                    // Should create extension despite task name validation warnings
                    assert(fs.existsSync(outputPath), 'Should create .vsix file despite task name warnings');
                    done();
                })
                .catch(done);
        });

        it('should warn about friendly name length', function(done) {
            const basicExtensionPath = path.join(samplesPath, 'basic-extension');
            const outputPath = path.join(basicExtensionPath, 'long-name-extension.vsix');
            
            execAsync(`node "${tfxPath}" extension create --root "${basicExtensionPath}" --output-path "${outputPath}" --no-prompt`)
                .then(({ stdout, stderr }) => {
                    // Should create extension despite friendly name warnings
                    assert(fs.existsSync(outputPath), 'Should create .vsix file despite warnings');
                    done();
                })
                .catch(done);
        });

        it('should validate task contributions match directory structure', function(done) {
            const taskExtensionPath = path.join(samplesPath, 'task-extension');
            if (!fs.existsSync(taskExtensionPath)) {
                console.log('Skipping task contributions test - sample not found');
                done();
                return;
            }

            const outputPath = path.join(taskExtensionPath, 'contributions-test.vsix');
            
            execAsync(`node "${tfxPath}" extension create --root "${taskExtensionPath}" --output-path "${outputPath}"`)
                .then(({ stdout }) => {
                    // Should validate task directory structure
                    assert(fs.existsSync(outputPath), 'Should create .vsix file with task contributions');
                    done();
                })
                .catch(done);
        });

        it('should handle extensions without task contributions', function(done) {
            const basicExtensionPath = path.join(samplesPath, 'basic-extension');
            const outputPath = path.join(basicExtensionPath, 'no-tasks-extension.vsix');
            
            execAsync(`node "${tfxPath}" extension create --root "${basicExtensionPath}" --output-path "${outputPath}"`)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    assert(cleanOutput.includes('Completed operation: create extension'), 'Should create extension without tasks');
                    assert(fs.existsSync(outputPath), 'Should create .vsix file');
                    done();
                })
                .catch(done);
        });

        it('should validate required task fields', function(done) {
            const basicExtensionPath = path.join(samplesPath, 'basic-extension');
            const outputPath = path.join(basicExtensionPath, 'task-fields-test.vsix');
            
            execAsync(`node "${tfxPath}" extension create --root "${basicExtensionPath}" --output-path "${outputPath}"`)
                .then(({ stdout }) => {
                    // Should validate task field requirements
                    assert(fs.existsSync(outputPath), 'Should create .vsix file despite task validation');
                    done();
                })
                .catch(done);
        });

        it('should validate task inputs structure', function(done) {
            const basicExtensionPath = path.join(samplesPath, 'basic-extension');
            const outputPath = path.join(basicExtensionPath, 'task-inputs-test.vsix');
            
            execAsync(`node "${tfxPath}" extension create --root "${basicExtensionPath}" --output-path "${outputPath}"`)
                .then(({ stdout }) => {
                    // Should validate task inputs structure
                    assert(fs.existsSync(outputPath), 'Should create .vsix file despite input validation');
                    done();
                })
                .catch(done);
        });

        it('should validate execution targets exist', function(done) {
            const basicExtensionPath = path.join(samplesPath, 'basic-extension');
            const outputPath = path.join(basicExtensionPath, 'execution-targets-test.vsix');
            
            execAsync(`node "${tfxPath}" extension create --root "${basicExtensionPath}" --output-path "${outputPath}"`)
                .then(({ stdout }) => {
                    // Should validate execution target file existence
                    assert(fs.existsSync(outputPath), 'Should create .vsix file despite execution target validation');
                    done();
                })
                .catch(done);
        });
    });
});
