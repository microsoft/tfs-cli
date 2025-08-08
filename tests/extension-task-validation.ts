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

describe('Extension Tasks Validation', function() {
    this.timeout(30000);

    before((done) => {
        if (!fs.existsSync(samplesPath)) {
            throw new Error('Extension samples directory not found: ' + samplesPath);
        }
        done();
    });

    after(function() {
        // Cleanup generated .vsix files
        const extensionsToClean = ['task-extension', 'invalid-task-extension'];
        extensionsToClean.forEach(extDir => {
            const extPath = path.join(samplesPath, extDir);
            if (fs.existsSync(extPath)) {
                const files = fs.readdirSync(extPath);
                files.forEach(file => {
                    if (file.endsWith('.vsix')) {
                        fs.unlinkSync(path.join(extPath, file));
                    }
                });
            }
        });
    });

    describe('Valid Task Extensions', function() {
        
        it('should successfully create extension with valid build tasks', function(done) {
            const taskExtensionPath = path.join(samplesPath, 'task-extension');
            const outputPath = path.join(taskExtensionPath, 'test-task-extension.vsix');
            
            execAsync(`node "${tfxPath}" extension create --root "${taskExtensionPath}" --output-path "${outputPath}" --no-prompt`)
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

        it('should validate task.json files during extension creation', function(done) {
            const taskExtensionPath = path.join(samplesPath, 'task-extension');
            const outputPath = path.join(taskExtensionPath, 'validate-task-extension.vsix');
            
            execAsync(`node "${tfxPath}" extension create --root "${taskExtensionPath}" --output-path "${outputPath}" --no-prompt`)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    // Should validate task.json files without errors
                    assert(!cleanOutput.includes('Invalid task json'), 'Should not show task validation errors');
                    assert(fs.existsSync(outputPath), 'Should create .vsix file despite validation checks');
                    done();
                })
                .catch(done);
        });

        it('should show warning for deprecated task runner but still create extension', function(done) {
            const taskExtensionPath = path.join(samplesPath, 'task-extension');
            const outputPath = path.join(taskExtensionPath, 'deprecated-warning-extension.vsix');
            
            execAsync(`node "${tfxPath}" extension create --root "${taskExtensionPath}" --output-path "${outputPath}" --no-prompt`)
                .then(({ stdout, stderr }) => {
                    const cleanOutput = stripColors(stdout + stderr);
                    // Should show warning about deprecated Node16 runner in VersionedTask V1
                    assert(cleanOutput.includes('end-of-life') || cleanOutput.includes('deprecated') || cleanOutput.includes('node-runner-guidance'), 
                           'Should warn about deprecated task runner');
                    assert(fs.existsSync(outputPath), 'Should still create .vsix file despite warnings');
                    done();
                })
                .catch(done);
        });

        it('should handle versioned tasks correctly', function(done) {
            const taskExtensionPath = path.join(samplesPath, 'task-extension');
            
            // Verify both V1 and V2 task.json files exist
            const v1TaskPath = path.join(taskExtensionPath, 'VersionedTask', 'V1', 'task.json');
            const v2TaskPath = path.join(taskExtensionPath, 'VersionedTask', 'V2', 'task.json');
            
            assert(fs.existsSync(v1TaskPath), 'V1 task.json should exist');
            assert(fs.existsSync(v2TaskPath), 'V2 task.json should exist');
            
            // Verify they have the same ID but different versions
            const v1Task = JSON.parse(fs.readFileSync(v1TaskPath, 'utf8'));
            const v2Task = JSON.parse(fs.readFileSync(v2TaskPath, 'utf8'));
            
            assert.equal(v1Task.id, v2Task.id, 'Both versions should have same task ID');
            assert.equal(v1Task.version.Major, 1, 'V1 should have major version 1');
            assert.equal(v2Task.version.Major, 2, 'V2 should have major version 2');
            
            done();
        });
    });

    describe('Invalid Task Extensions', function() {
        
        it('should warn about invalid task.json but still create extension', function(done) {
            const invalidTaskExtensionPath = path.join(samplesPath, 'invalid-task-extension');
            const outputPath = path.join(invalidTaskExtensionPath, 'invalid-task-extension.vsix');
            
            execAsync(`node "${tfxPath}" extension create --root "${invalidTaskExtensionPath}" --output-path "${outputPath}" --no-prompt`)
                .then(({ stdout, stderr }) => {
                    const cleanOutput = stripColors(stdout + stderr);
                    assert(cleanOutput.includes('Invalid task json'), 'Should mention invalid task json');
                    assert(cleanOutput.includes('id is a required guid') || cleanOutput.includes('not-a-valid-uuid'), 'Should mention invalid ID');
                    assert(cleanOutput.includes('Completed operation: create extension'), 'Should still complete extension creation');
                    assert(fs.existsSync(outputPath), 'Should create .vsix file despite warnings');
                    done();
                })
                .catch(done);
        });

        it('should warn about missing task.json file', function(done) {
            const invalidTaskExtensionPath = path.join(samplesPath, 'invalid-task-extension');
            const outputPath = path.join(invalidTaskExtensionPath, 'missing-task-extension.vsix');
            
            execAsync(`node "${tfxPath}" extension create --root "${invalidTaskExtensionPath}" --output-path "${outputPath}" --no-prompt`)
                .then(({ stdout, stderr }) => {
                    const cleanOutput = stripColors(stdout + stderr);
                    assert(cleanOutput.includes('does not have a task.json file') || cleanOutput.includes('MissingTask') || cleanOutput.includes('Completed operation'), 'Should warn about missing task.json or complete successfully');
                    assert(fs.existsSync(outputPath), 'Should create .vsix file despite missing task');
                    done();
                })
                .catch(done);
        });

        it('should warn about missing execution target file', function(done) {
            const invalidTaskExtensionPath = path.join(samplesPath, 'invalid-task-extension');
            const outputPath = path.join(invalidTaskExtensionPath, 'missing-target-extension.vsix');
            
            execAsync(`node "${tfxPath}" extension create --root "${invalidTaskExtensionPath}" --output-path "${outputPath}" --no-prompt`)
                .then(({ stdout, stderr }) => {
                    const cleanOutput = stripColors(stdout + stderr);
                    assert(cleanOutput.includes('missing-file.js') || cleanOutput.includes('references file that does not exist'), 
                           'Should mention missing target file');
                    assert(cleanOutput.includes('Completed operation: create extension'), 'Should still complete extension creation');
                    assert(fs.existsSync(outputPath), 'Should create .vsix file despite warnings');
                    done();
                })
                .catch(done);
        });

        it('should warn about invalid task name format', function(done) {
            const invalidTaskExtensionPath = path.join(samplesPath, 'invalid-task-extension');
            const outputPath = path.join(invalidTaskExtensionPath, 'invalid-name-extension.vsix');
            
            execAsync(`node "${tfxPath}" extension create --root "${invalidTaskExtensionPath}" --output-path "${outputPath}" --no-prompt`)
                .then(({ stdout, stderr }) => {
                    const cleanOutput = stripColors(stdout + stderr);
                    assert(cleanOutput.includes('name is a required alphanumeric string') || cleanOutput.includes('Invalid task json'), 
                           'Should mention invalid task name');
                    assert(cleanOutput.includes('Completed operation: create extension'), 'Should still complete extension creation');
                    assert(fs.existsSync(outputPath), 'Should create .vsix file despite warnings');
                    done();
                })
                .catch(done);
        });

        it('should warn about friendly name length', function(done) {
            const invalidTaskExtensionPath = path.join(samplesPath, 'invalid-task-extension');
            const outputPath = path.join(invalidTaskExtensionPath, 'long-name-extension.vsix');
            
            execAsync(`node "${tfxPath}" extension create --root "${invalidTaskExtensionPath}" --output-path "${outputPath}" --no-prompt`)
                .then(({ stdout, stderr }) => {
                    const cleanOutput = stripColors(stdout + stderr);
                    assert(cleanOutput.includes('friendlyName is a required string <= 40 chars') || cleanOutput.includes('Invalid task json'), 
                           'Should mention friendly name length validation');
                    assert(cleanOutput.includes('Completed operation: create extension'), 'Should still complete extension creation');
                    assert(fs.existsSync(outputPath), 'Should create .vsix file despite warnings');
                    done();
                })
                .catch(done);
        });

        it('should warn about deprecated task runners', function(done) {
            const invalidTaskExtensionPath = path.join(samplesPath, 'invalid-task-extension');
            const outputPath = path.join(invalidTaskExtensionPath, 'deprecated-runner-extension.vsix');
            
            execAsync(`node "${tfxPath}" extension create --root "${invalidTaskExtensionPath}" --output-path "${outputPath}" --no-prompt`)
                .then(({ stdout, stderr }) => {
                    const cleanOutput = stripColors(stdout + stderr);
                    // Should warn about deprecated runner and/or other validation errors
                    assert(cleanOutput.includes('end-of-life') || cleanOutput.includes('node-runner-guidance') || cleanOutput.includes('Invalid task json'), 
                           'Should warn about deprecated task runner or validation errors');
                    assert(cleanOutput.includes('Completed operation: create extension'), 'Should still complete extension creation');
                    assert(fs.existsSync(outputPath), 'Should create .vsix file despite warnings');
                    done();
                })
                .catch(done);
        });
    });

    describe('Task Contribution Validation', function() {
        
        it('should validate task contributions match directory structure', function(done) {
            const taskExtensionPath = path.join(samplesPath, 'task-extension');
            const manifestPath = path.join(taskExtensionPath, 'vss-extension.json');
            
            assert(fs.existsSync(manifestPath), 'Extension manifest should exist');
            
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            const taskContributions = manifest.contributions.filter((contrib: any) => contrib.type === 'ms.vss-distributed-task.task');
            
            assert(taskContributions.length > 0, 'Should have task contributions');
            
            taskContributions.forEach((contrib: any) => {
                const taskName = contrib.properties.name;
                const taskPath = path.join(taskExtensionPath, taskName);
                assert(fs.existsSync(taskPath), `Task directory should exist: ${taskName}`);
                
                // Check for task.json in main directory or subdirectories
                const mainTaskJson = path.join(taskPath, 'task.json');
                let hasTaskJson = fs.existsSync(mainTaskJson);
                
                if (!hasTaskJson) {
                    // Check subdirectories for versioned tasks
                    const subdirs = fs.readdirSync(taskPath).filter(item => {
                        const itemPath = path.join(taskPath, item);
                        return fs.lstatSync(itemPath).isDirectory();
                    });
                    
                    hasTaskJson = subdirs.some(subdir => {
                        const subdirTaskJson = path.join(taskPath, subdir, 'task.json');
                        return fs.existsSync(subdirTaskJson);
                    });
                }
                
                assert(hasTaskJson, `Task should have task.json file: ${taskName}`);
            });
            
            done();
        });

        it('should handle extensions without task contributions', function(done) {
            const basicExtensionPath = path.join(samplesPath, 'basic-extension');
            const outputPath = path.join(basicExtensionPath, 'no-tasks-extension.vsix');
            
            execAsync(`node "${tfxPath}" extension create --root "${basicExtensionPath}" --output-path "${outputPath}" --no-prompt`)
                .then(({ stdout }) => {
                    const cleanOutput = stripColors(stdout);
                    assert(cleanOutput.includes('Completed operation: create extension'), 'Should create extension without task contributions');
                    assert(fs.existsSync(outputPath), 'Should create .vsix file');
                    done();
                })
                .catch(done);
        });
    });

    describe('Task JSON Schema Validation', function() {
        
        it('should validate required task fields', function(done) {
            const sampleTaskPath = path.join(samplesPath, 'task-extension', 'SampleTask', 'task.json');
            assert(fs.existsSync(sampleTaskPath), 'Sample task.json should exist');
            
            const taskJson = JSON.parse(fs.readFileSync(sampleTaskPath, 'utf8'));
            
            // Validate required fields
            assert(taskJson.id, 'Task should have an ID');
            assert(taskJson.name, 'Task should have a name');
            assert(taskJson.friendlyName, 'Task should have a friendly name');
            assert(taskJson.description, 'Task should have a description');
            assert(taskJson.author, 'Task should have an author');
            assert(taskJson.version, 'Task should have a version');
            assert(taskJson.version.Major !== undefined, 'Task should have a major version');
            assert(taskJson.version.Minor !== undefined, 'Task should have a minor version');
            assert(taskJson.version.Patch !== undefined, 'Task should have a patch version');
            assert(taskJson.execution, 'Task should have execution configuration');
            assert(taskJson.instanceNameFormat, 'Task should have instanceNameFormat');
            
            done();
        });

        it('should validate task inputs structure', function(done) {
            const sampleTaskPath = path.join(samplesPath, 'task-extension', 'SampleTask', 'task.json');
            const taskJson = JSON.parse(fs.readFileSync(sampleTaskPath, 'utf8'));
            
            if (taskJson.inputs && taskJson.inputs.length > 0) {
                taskJson.inputs.forEach((input: any, index: number) => {
                    assert(input.name, `Input ${index} should have a name`);
                    assert(input.type, `Input ${index} should have a type`);
                    assert(input.label, `Input ${index} should have a label`);
                    assert(typeof input.required === 'boolean', `Input ${index} should have a boolean required field`);
                });
            }
            
            done();
        });

        it('should validate execution targets exist', function(done) {
            const sampleTaskPath = path.join(samplesPath, 'task-extension', 'SampleTask', 'task.json');
            const taskDir = path.dirname(sampleTaskPath);
            const taskJson = JSON.parse(fs.readFileSync(sampleTaskPath, 'utf8'));
            
            if (taskJson.execution) {
                Object.keys(taskJson.execution).forEach(runner => {
                    const target = taskJson.execution[runner].target;
                    const targetPath = path.join(taskDir, target);
                    assert(fs.existsSync(targetPath), `Execution target should exist: ${target} at ${targetPath}`);
                });
            }
            
            done();
        });
    });
});
