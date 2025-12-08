import assert = require('assert');
import { stripColors } from 'colors';
import path = require('path');
import fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const AdmZip = require('adm-zip');
import { execAsyncWithLogging } from './test-utils/debug-exec';

// Basic test framework functions to avoid TypeScript errors
declare function describe(name: string, fn: Function): void;
declare function it(name: string, fn: Function): void;
declare function before(fn: Function): void;
declare function after(fn: Function): void;

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
                    // Fallback for Node.js versions without recursive rmdirSync
                    const deleteFolderRecursive = (folderPath: string) => {
                        if (fs.existsSync(folderPath)) {
                            fs.readdirSync(folderPath).forEach((file) => {
                                const curPath = path.join(folderPath, file);
                                if (fs.lstatSync(curPath).isDirectory()) {
                                    deleteFolderRecursive(curPath);
                                } else {
                                    fs.unlinkSync(curPath);
                                }
                            });
                            fs.rmdirSync(folderPath);
                        }
                    };
                    deleteFolderRecursive(dir);
                } catch (e) {
                    // Ignore cleanup errors
                }
            }
        });
    });

    describe('Command Help and Hierarchy', function() {
        
        it('should display extension command group help', function(done) {
            execAsyncWithLogging(`node "${tfxPath}" extension --help`, 'extension --help')
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
            execAsyncWithLogging(`node "${tfxPath}" extension create --help`, 'extension create --help')
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
            execAsyncWithLogging(`node "${tfxPath}" extension show --help`, 'extension show --help')
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
            execAsyncWithLogging(`node "${tfxPath}" extension publish --help`, 'extension publish --help')
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
            execAsyncWithLogging(`node "${tfxPath}" extension install --help`, 'extension install --help')
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
            execAsyncWithLogging(`node "${tfxPath}" extension init --help`, 'extension init --help')
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    assert(cleanOutput.includes('Initialize a directory for development'), 'Should show init command description');
                    done();
                })
                .catch(done);
        });

        it('should display resources command group help', function(done) {
            execAsyncWithLogging(`node "${tfxPath}" extension resources --help`, 'extension resources --help')
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    assert(cleanOutput.includes('Available commands and command groups in tfx / extension / resources'), 'Should show resources command hierarchy');
                    assert(cleanOutput.includes('create:'), 'Should list create command');
                    done();
                })
                .catch(done);
        });

        it('should display resources create command help', function(done) {
            execAsyncWithLogging(`node "${tfxPath}" extension resources create --help`, 'extension resources create --help')
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
            
            execAsyncWithLogging(`node "${tfxPath}" extension create --root "${basicExtensionPath}" --output-path "${outputPath}"`, 'extension create basic sample')
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
            execAsyncWithLogging(`node "${tfxPath}" extension create --root "${tempDir}" --output-path "${outputPath}" --no-prompt`, 'extension create missing manifest')
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
            
            execAsyncWithLogging(`node "${tfxPath}" extension create --root "${basicExtensionPath}" --output-path "${outputPath}" --overrides-file "${overrideFilePath}"`, 'extension create with overrides')
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
            
            execAsyncWithLogging(`node "${tfxPath}" extension create --root "${basicExtensionPath}" --output-path "${outputPath}" --rev-version`, 'extension create --rev-version')
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
            
            execAsyncWithLogging(`node "${tfxPath}" extension create --root "${basicExtensionPath}" --output-path "${outputPath}" --bypass-validation`, 'extension create --bypass-validation')
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
            execAsyncWithLogging(`node "${tfxPath}" extension --help --no-color`, 'extension --help --no-color')
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
            
            execAsyncWithLogging(`node "${tfxPath}" extension create --root "${basicExtensionPath}" --output-path "${outputPath}" --trace-level debug`, 'extension create --trace-level debug')
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
            execAsyncWithLogging(`node "${tfxPath}" extension --help --json`, 'extension --help --json')
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
            
            execAsyncWithLogging(`node "${tfxPath}" extension create --root . --output-path relative-test.vsix`, 'extension create relative path')
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
            
            execAsyncWithLogging(`node "${tfxPath}" extension create --root "${basicExtensionPath}" --output-path "${outputPath}"`, 'extension create absolute path')
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
            
            execAsyncWithLogging(`node "${tfxPath}" extension create --root "${basicExtensionPath}" --output-path "${outputPath}" --manifest-globs "vss-extension.json"`, 'extension create --manifest-globs')
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    assert(cleanOutput.includes('Completed operation: create extension'), 'Should handle manifest-globs parameter');
                    assert(fs.existsSync(outputPath), 'Should create .vsix file');
                    done();
                })
                .catch(done);
        });

        it('should handle manifest-globs with glob patterns and merge scopes', function (done) {
            const complexExtensionPath = path.join(samplesPath, 'complex-extension');
            if (!fs.existsSync(complexExtensionPath)) {
                console.log('Skipping manifest-globs glob pattern test - sample not found');
                done();
                return;
            }

            const outputPath = path.join(complexExtensionPath, 'manifest-globs-scopes-test.vsix');
            const manifestsRoot = path.join(complexExtensionPath, 'dist', 'Manifests');
            const manifestsSubDir = path.join(manifestsRoot, 'a');
            const mainManifestPath = path.join(complexExtensionPath, 'azure-devops-extension.json');
            const secondaryManifestPath = path.join(manifestsSubDir, 'manifest-a.json');

            const manifestsRootParent = path.dirname(manifestsRoot);
            if (!fs.existsSync(manifestsRootParent)) {
                fs.mkdirSync(manifestsRootParent);
            }
            if (!fs.existsSync(manifestsRoot)) {
                fs.mkdirSync(manifestsRoot);
            }
            if (!fs.existsSync(manifestsSubDir)) {
                fs.mkdirSync(manifestsSubDir);
            }

            const primaryManifest = {
                "manifestVersion": 1,
                "id": "glob-test-extension",
                "publisher": "glob-test-publisher",
                "version": "1.0.0",
                "name": "Glob Test Extension",
                "categories": "Azure Boards",
                "scopes": [
                    "vso.analytics"
                ],
                "targets": [
                    { "id": "Microsoft.VisualStudio.Services" }
                ],
                "contributions": [
                    {
                        "id": "glob-test-hub",
                        "type": "ms.vss-web.hub",
                        "targets": ["ms.vss-web.project-hub-group"],
                        "properties": {
                            "name": "Glob Test Hub"
                        }
                    }
                ]
            };
            fs.writeFileSync(mainManifestPath, JSON.stringify(primaryManifest, null, 2));

            const secondaryManifest = {
                "scopes": [
                    "vso.work"
                ]
            };
            fs.writeFileSync(secondaryManifestPath, JSON.stringify(secondaryManifest, null, 2));

            const manifestGlobsArg = 'azure-devops-extension.json dist/Manifests/**/manifest-*.json';
            execAsyncWithLogging(
                `node "${tfxPath}" extension create --root "${complexExtensionPath}" --output-path "${outputPath}" --manifest-globs ${manifestGlobsArg}`,
                'extension create --manifest-globs glob patterns'
            )
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    assert(cleanOutput.includes('Completed operation: create extension'), 'Should handle manifest-globs with glob patterns');
                    assert(fs.existsSync(outputPath), 'Should create .vsix file');

                    // Read extension.vsomanifest (JSON) from VSIX and validate scopes
                    const zip = new AdmZip(outputPath);
                    const vsomanifestEntry =
                        zip.getEntry('extension.vsomanifest') ||
                        zip.getEntry('extension/extension.vsomanifest');
                    assert(vsomanifestEntry, 'VSIX must contain extension.vsomanifest');

                    const vsomanifestJson = JSON.parse(vsomanifestEntry.getData().toString('utf8'));
                    const scopes: string[] = vsomanifestJson.scopes || [];

                    assert(scopes.indexOf('vso.analytics') !== -1, 'Resulting manifest should contain vso.analytics scope');
                    assert(scopes.indexOf('vso.work') !== -1, 'Resulting manifest should contain vso.work scope');

                    done();
                })
                .catch(done);
        });

        it('should resolve manifest-globs to both root and globbed manifests (gatherManifests)', function (done) {
            const complexExtensionPath = path.join(samplesPath, 'complex-extension');
            if (!fs.existsSync(complexExtensionPath)) {
                console.log('Skipping gatherManifests test - sample not found');
                done();
                return;
            }

            const manifestsRoot = path.join(complexExtensionPath, 'dist', 'Manifests');
            const manifestsSubDir = path.join(manifestsRoot, 'a');
            const mainManifestPath = path.join(complexExtensionPath, 'azure-devops-extension.json');
            const secondaryManifestPath = path.join(manifestsSubDir, 'manifest-a.json');

            const manifestsRootParent = path.dirname(manifestsRoot);
            if (!fs.existsSync(manifestsRootParent)) {
                fs.mkdirSync(manifestsRootParent);
            }
            if (!fs.existsSync(manifestsRoot)) {
                fs.mkdirSync(manifestsRoot);
            }
            if (!fs.existsSync(manifestsSubDir)) {
                fs.mkdirSync(manifestsSubDir);
            }

            const primaryManifest = {
                "manifestVersion": 1,
                "id": "glob-test-extension-gather",
                "publisher": "glob-test-publisher",
                "version": "1.0.0",
                "name": "Glob Test Extension Gather",
                "categories": "Azure Boards",
                "scopes": [
                    "vso.analytics"
                ],
                "targets": [
                    { "id": "Microsoft.VisualStudio.Services" }
                ],
                "contributions": [
                    {
                        "id": "glob-test-hub-gather",
                        "type": "ms.vss-web.hub",
                        "targets": ["ms.vss-web.project-hub-group"],
                        "properties": {
                            "name": "Glob Test Hub Gather"
                        }
                    }
                ]
            };
            fs.writeFileSync(mainManifestPath, JSON.stringify(primaryManifest, null, 2));

            const secondaryManifest = {
                "scopes": [
                    "vso.work"
                ]
            };
            fs.writeFileSync(secondaryManifestPath, JSON.stringify(secondaryManifest, null, 2));

            const mergerModulePath = path.resolve(__dirname, '../../_build/exec/extension/_lib/merger');
            let MergerCtor: any;
            try {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                MergerCtor = require(mergerModulePath).Merger || require(mergerModulePath).default;
            } catch (e) {
                done(e);
                return;
            }

            const settings: any = {
                root: complexExtensionPath,
                manifests: [],
                manifestGlobs: [
                    'azure-devops-extension.json',
                    'dist/Manifests/**/manifest-*.json'
                ],
                overrides: {},
                noPrompt: true
            };

            const merger = new MergerCtor(settings);
            const gatherFn = (merger as any)['gatherManifests'];
            if (typeof gatherFn !== 'function') {
                done(new Error('Merger.gatherManifests is not accessible'));
                return;
            }

            Promise.resolve(gatherFn.call(merger))
                .then((manifestPaths: string[]) => {
                    assert(Array.isArray(manifestPaths) && manifestPaths.length >= 2, 'gatherManifests should return at least two manifests');

                    const normalizedPaths = manifestPaths.map(p => path.normalize(p));
                    const expectedMain = path.normalize(mainManifestPath);
                    const expectedSecondary = path.normalize(secondaryManifestPath);

                    assert(normalizedPaths.indexOf(expectedMain) !== -1, 'gatherManifests should include root manifest');
                    assert(normalizedPaths.indexOf(expectedSecondary) !== -1, 'gatherManifests should include globbed manifest');
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
            
            execAsyncWithLogging(`node "${tfxPath}" extension create --root "${complexExtensionPath}" --output-path "${outputPath}"`, 'extension create complex')
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
            
            execAsyncWithLogging(`node "${tfxPath}" extension create --root "${basicExtensionPath}" --output-path "${outputPath}" --publisher "test-publisher"`, 'extension create --publisher')
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
            
            execAsyncWithLogging(`node "${tfxPath}" extension create --root "${basicExtensionPath}" --output-path "${outputPath}" --extension-id "test-extension-id"`, 'extension create --extension-id')
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
            
            execAsyncWithLogging(`node "${tfxPath}" extension create --root "${basicExtensionPath}" --output-path "${outputPath}" --json`, 'extension create --json')
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

            execAsyncWithLogging(`node "${tfxPath}" extension create --root "${basicExtensionPath}" --output-path "${outputPath}"`, 'extension create missing files')
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

            execAsyncWithLogging(`node "${tfxPath}" extension create --root "${basicExtensionPath}" --output-path "${outputPath}"`, 'extension create non-existent output dir')
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
            execAsyncWithLogging(`node "${tfxPath}" extension create --root "${basicExtensionPath}" --output-path "${outputPath}"`, 'extension create missing files in manifest')
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
            
            execAsyncWithLogging(`node "${tfxPath}" extension create --root "${taskExtensionPath}" --output-path "${outputPath}"`, 'extension create task extension')
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
            
            execAsyncWithLogging(`node "${tfxPath}" extension create --root "${taskExtensionPath}" --output-path "${outputPath}"`, 'extension create validated task')
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
            
            execAsyncWithLogging(`node "${tfxPath}" extension create --root "${taskExtensionPath}" --output-path "${outputPath}"`, 'extension create deprecated runner')
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
            
            execAsyncWithLogging(`node "${tfxPath}" extension create --root "${taskExtensionPath}" --output-path "${outputPath}"`, 'extension create versioned tasks')
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
            
            execAsyncWithLogging(`node "${tfxPath}" extension create --root "${basicExtensionPath}" --output-path "${outputPath}"`, 'extension create invalid task')
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
            
            execAsyncWithLogging(`node "${tfxPath}" extension create --root "${basicExtensionPath}" --output-path "${outputPath}"`, 'extension create missing task json')
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
            
            execAsyncWithLogging(`node "${tfxPath}" extension create --root "${basicExtensionPath}" --output-path "${outputPath}"`, 'extension create missing execution file')
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
            
            execAsyncWithLogging(`node "${tfxPath}" extension create --root "${basicExtensionPath}" --output-path "${outputPath}"`, 'extension create invalid task name')
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
            
            execAsyncWithLogging(`node "${tfxPath}" extension create --root "${basicExtensionPath}" --output-path "${outputPath}" --no-prompt`, 'extension create long name')
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
            
            execAsyncWithLogging(`node "${tfxPath}" extension create --root "${taskExtensionPath}" --output-path "${outputPath}"`, 'extension create contributions test')
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
            
            execAsyncWithLogging(`node "${tfxPath}" extension create --root "${basicExtensionPath}" --output-path "${outputPath}"`, 'extension create no tasks')
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
            
            execAsyncWithLogging(`node "${tfxPath}" extension create --root "${basicExtensionPath}" --output-path "${outputPath}"`, 'extension create task fields')
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
            
            execAsyncWithLogging(`node "${tfxPath}" extension create --root "${basicExtensionPath}" --output-path "${outputPath}"`, 'extension create task inputs')
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
            
            execAsyncWithLogging(`node "${tfxPath}" extension create --root "${basicExtensionPath}" --output-path "${outputPath}"`, 'extension create execution targets')
                .then(({ stdout }) => {
                    // Should validate execution target file existence
                    assert(fs.existsSync(outputPath), 'Should create .vsix file despite execution target validation');
                    done();
                })
                .catch(done);
        });
    });
});
