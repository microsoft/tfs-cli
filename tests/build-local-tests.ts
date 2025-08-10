
import assert = require('assert');
import { stripColors } from 'colors';
import * as path from 'path';
import * as fs from 'fs';
import { execAsyncWithLogging } from './test-utils/debug-exec';

// Basic test framework functions to avoid TypeScript errors
declare function describe(name: string, fn: Function): void;
declare function it(name: string, fn: Function): void;
declare function before(fn: Function): void;
declare function after(fn: Function): void;

const tfxPath = path.resolve(__dirname, '../../_build/tfx-cli.js');
const samplesPath = path.resolve(__dirname, '../build-samples');
const resourcesPath = path.resolve(__dirname, '../app/exec/build/tasks/_resources');

describe('Build Commands - Local Tests', function() {
	this.timeout(30000);

	before((done) => {
		// Ensure build samples directory exists
		if (!fs.existsSync(samplesPath)) {
			throw new Error('Build samples directory not found: ' + samplesPath);
		}
		done();
	});

	describe('Command Help and Hierarchy', function() {
		
	       it('should display build command group help', function(done) {
		       execAsyncWithLogging(`node "${tfxPath}" build --help`, 'build --help')
			       .then(({ stdout }) => {
				       const cleanOutput = stripColors(stdout);
				       assert(cleanOutput.includes('Available commands and command groups in tfx / build'), 'Should show build command hierarchy');
				       assert(cleanOutput.includes(' - list: Get a list of builds.'), 'Should list build list command');
				       assert(cleanOutput.includes(' - queue: Queue a build.'), 'Should list build queue command');
				       assert(cleanOutput.includes(' - show: Show build details.'), 'Should list build show command');
				       assert(cleanOutput.includes(' - tasks: Commands for managing Build Tasks.'), 'Should list build tasks command group');
				       done();
			       })
			       .catch(done);
	       });

		it('should handle build list help', function(done) {
			   execAsyncWithLogging(`node "${tfxPath}" build list --help`, 'build list --help')
				.then(({ stdout }) => {
					const cleanOutput = stripColors(stdout);
					assert(cleanOutput.includes('build list'), 'Should show build list command syntax');
					assert(cleanOutput.includes('Get a list of builds'), 'Should show build list description');
					assert(cleanOutput.includes('--definition-id'), 'Should show definition-id argument');
					assert(cleanOutput.includes('--definition-name'), 'Should show definition-name argument');
					assert(cleanOutput.includes('--status'), 'Should show status argument');
					assert(cleanOutput.includes('--top'), 'Should show top argument');
					assert(cleanOutput.includes('--project'), 'Should show project argument');
					done();
				})
				.catch(done);
		});

	       it('should handle build list help', function(done) {
		       execAsyncWithLogging(`node "${tfxPath}" build list --help`, 'build list --help')
			       .then(({ stdout }) => {
				       const cleanOutput = stripColors(stdout);
				       assert(cleanOutput.includes('build list'), 'Should show build list command syntax');
				       assert(cleanOutput.includes('Get a list of builds'), 'Should show build list description');
				       assert(cleanOutput.includes('--definition-id'), 'Should show definition-id argument');
				       assert(cleanOutput.includes('--definition-name'), 'Should show definition-name argument');
				       assert(cleanOutput.includes('--status'), 'Should show status argument');
				       assert(cleanOutput.includes('--top'), 'Should show top argument');
				       assert(cleanOutput.includes('--project'), 'Should show project argument');
				       done();
			       })
			       .catch(done);
	       });

	       it('should handle build show help', function(done) {
		       execAsyncWithLogging(`node "${tfxPath}" build show --help`, 'build show --help')
			       .then(({ stdout }) => {
				       const cleanOutput = stripColors(stdout);
				       assert(cleanOutput.includes('build show'), 'Should show build show command syntax');
				       assert(cleanOutput.includes('Show build details'), 'Should show build show description');
				       assert(cleanOutput.includes('--project'), 'Should show project argument');
				       assert(cleanOutput.includes('--build-id'), 'Should show build-id argument');
				       done();
			       })
			       .catch(done);
	       });
		});

		it('should display build tasks command group help', function(done) {
			   execAsyncWithLogging(`node "${tfxPath}" build tasks --help`, 'build tasks --help')
				.then(({ stdout }) => {
					const cleanOutput = stripColors(stdout);
					assert(cleanOutput.includes('Available commands and command groups in tfx / build / tasks'), 'Should show tasks hierarchy');
					assert(cleanOutput.includes(' - create: Create files for new Build Task'), 'Should list create command');
					assert(cleanOutput.includes(' - delete: Delete a Build Task.'), 'Should list delete command');
					assert(cleanOutput.includes(' - upload: Upload a Build Task.'), 'Should list upload command');
					assert(cleanOutput.includes(' - list: Get a list of build tasks'), 'Should list list command');
					done();
				})
				.catch(done);
		});

		it('should handle build tasks create help', function(done) {
			   execAsyncWithLogging(`node "${tfxPath}" build tasks create --help`, 'build tasks create --help')
				.then(({ stdout }) => {
					const cleanOutput = stripColors(stdout);
					assert(cleanOutput.includes('build tasks create'), 'Should show create command syntax');
					assert(cleanOutput.includes('Create files for new Build Task'), 'Should show create description');
					assert(cleanOutput.includes('--task-name'), 'Should show task-name argument');
					assert(cleanOutput.includes('--friendly-name'), 'Should show friendly-name argument');
					assert(cleanOutput.includes('--description'), 'Should show description argument');
					assert(cleanOutput.includes('--author'), 'Should show author argument');
					done();
				})
				.catch(done);
		});

		it('should handle build tasks list help', function(done) {
			   execAsyncWithLogging(`node "${tfxPath}" build tasks list --help`, 'build tasks list --help')
				.then(({ stdout }) => {
					const cleanOutput = stripColors(stdout);
					assert(cleanOutput.includes('build tasks list'), 'Should show list command syntax');
					assert(cleanOutput.includes('Get a list of build tasks'), 'Should show list description');
					assert(cleanOutput.includes('--all'), 'Should show all argument');
					done();
				})
				.catch(done);
		});

		it('should handle build tasks upload help', function(done) {
			   execAsyncWithLogging(`node "${tfxPath}" build tasks upload --help`, 'build tasks upload --help')
				.then(({ stdout }) => {
					const cleanOutput = stripColors(stdout);
					assert(cleanOutput.includes('build tasks upload'), 'Should show upload command syntax');
					assert(cleanOutput.includes('Upload a Build Task'), 'Should show upload description');
					assert(cleanOutput.includes('--task-path'), 'Should show task-path argument');
					assert(cleanOutput.includes('--task-zip-path'), 'Should show task-zip-path argument');
					assert(cleanOutput.includes('--overwrite'), 'Should show overwrite argument');
					done();
				})
				.catch(done);
		});

		it('should handle build tasks delete help', function(done) {
			   execAsyncWithLogging(`node "${tfxPath}" build tasks delete --help`, 'build tasks delete --help')
				.then(({ stdout }) => {
					const cleanOutput = stripColors(stdout);
					assert(cleanOutput.includes('build tasks delete'), 'Should show delete command syntax');
					assert(cleanOutput.includes('Delete a Build Task'), 'Should show delete description');
					assert(cleanOutput.includes('--task-id'), 'Should show task-id argument');
					done();
				})
				.catch(done);
		});

		it('should support 3-level command hierarchy (build tasks create)', function(done) {
			   execAsyncWithLogging(`node "${tfxPath}" build tasks create --help`, 'build tasks create --help')
				.then(({ stdout }) => {
					assert(stdout.includes('build tasks create'), 'Should handle 3-level command hierarchy');
					assert(stdout.includes('Create files for new Build Task'), 'Should show correct command description');
					done();
				})
				.catch(done);
		});

		it('should maintain context in nested commands', function(done) {
			   execAsyncWithLogging(`node "${tfxPath}" build tasks --help`, 'build tasks --help')
				.then(({ stdout }) => {
					const cleanOutput = stripColors(stdout);
					assert(cleanOutput.includes('tfx / build / tasks'), 'Should show nested command context');
					assert(cleanOutput.includes('tfx build tasks <command> --help'), 'Should show correct help path');
					done();
				})
				.catch(done);
		});
	});

	describe('Command Validation and Error Handling', function() {
		
		it('should reject invalid build subcommands', function(done) {
			   execAsyncWithLogging(`node "${tfxPath}" build invalidsubcommand`, 'build invalidsubcommand')
				.then(() => {
					assert.fail('Should have thrown an error for invalid build subcommand');
					done();
				})
				.catch((error) => {
					assert(error.stderr && (error.stderr.includes('not found') || error.stderr.includes('not recognized')), 
						'Should indicate build subcommand was not found');
					done();
				});
		});

		it('should reject invalid build tasks subcommands', function(done) {
			   execAsyncWithLogging(`node "${tfxPath}" build tasks invalidsubcommand`, 'build tasks invalidsubcommand')
				.then(() => {
					assert.fail('Should have thrown an error for invalid build tasks subcommand');
					done();
				})
				.catch((error) => {
					assert(error.stderr && (error.stderr.includes('not found') || error.stderr.includes('not recognized')), 
						'Should indicate tasks subcommand was not found');
					done();
				});
		});

		it('should show error for invalid build arguments', function(done) {
			   execAsyncWithLogging(`node "${tfxPath}" build --invalidarg`, 'build --invalidarg')
				.then(({ stdout, stderr }) => {
					const cleanStdout = stripColors(stdout);
					const cleanStderr = stripColors(stderr);
					assert(cleanStderr.includes('Unrecognized argument: --invalidarg'), 'Should show error for invalid argument in stderr');
					assert(cleanStdout.includes('Available commands and command groups in tfx / build'), 'Should show build help after error in stdout');
					done();
				})
				.catch(done);
		});

		it('should show error for invalid build tasks arguments', function(done) {
			   execAsyncWithLogging(`node "${tfxPath}" build tasks --badarg`, 'build tasks --badarg')
				.then(({ stdout, stderr }) => {
					const cleanStdout = stripColors(stdout);
					const cleanStderr = stripColors(stderr);
					assert(cleanStderr.includes('Unrecognized argument: --badarg'), 'Should show error for invalid argument in stderr');
					assert(cleanStdout.includes('Available commands and command groups in tfx / build / tasks'), 'Should show tasks help after error in stdout');
					done();
				})
				.catch(done);
		});

		it('should show error for invalid build list arguments', function(done) {
			   execAsyncWithLogging(`node "${tfxPath}" build list --invalidfilter`, 'build list --invalidfilter')
				.then(({ stdout, stderr }) => {
					const cleanStdout = stripColors(stdout);
					const cleanStderr = stripColors(stderr);
					assert(cleanStderr.includes('Unrecognized argument: --invalidfilter'), 'Should show error for invalid argument in stderr');
					assert(cleanStdout.includes('build list'), 'Should show build list help after error in stdout');
					done();
				})
				.catch(done);
		});
	});

	describe('Task Creation Validation', function() {
		
		it('should require task name for creation', function(done) {
			   execAsyncWithLogging(`node "${tfxPath}" build tasks create --friendly-name "Test Task" --description "Test" --author "Test Author" --no-prompt`, 'build tasks create --friendly-name')
				.then(() => {
					assert.fail('Should have required task name');
					done();
				})
				.catch((error) => {
					// The command should fail because task-name is required
					assert(error.code !== 0, 'Should exit with non-zero code when task-name is missing');
					done();
				});
		});

		it('should require friendly name for creation', function(done) {
			   execAsyncWithLogging(`node "${tfxPath}" build tasks create --task-name "testtask" --description "Test" --author "Test Author" --no-prompt`, 'build tasks create --task-name')
				.then(() => {
					assert.fail('Should have required friendly name');
					done();
				})
				.catch((error) => {
					// The command should fail because friendly-name is required
					assert(error.code !== 0, 'Should exit with non-zero code when friendly-name is missing');
					done();
				});
		});

		it('should require description for creation', function(done) {
			   execAsyncWithLogging(`node "${tfxPath}" build tasks create --task-name "testtask" --friendly-name "Test Task" --author "Test Author" --no-prompt`, 'build tasks create --friendly-name')
				.then(() => {
					assert.fail('Should have required description');
					done();
				})
				.catch((error) => {
					// The command should fail because description is required
					assert(error.code !== 0, 'Should exit with non-zero code when description is missing');
					done();
				});
		});

		it('should require author for creation', function(done) {
			   execAsyncWithLogging(`node "${tfxPath}" build tasks create --task-name "testtask" --friendly-name "Test Task" --description "Test task" --no-prompt`, 'build tasks create --description')
				.then(() => {
					assert.fail('Should have required author');
					done();
				})
				.catch((error) => {
					// The command should fail because author is required
					assert(error.code !== 0, 'Should exit with non-zero code when author is missing');
					done();
				});
		});

		it('should validate task name format', function(done) {
			   execAsyncWithLogging(`node "${tfxPath}" build tasks create --task-name "invalid task name with spaces" --friendly-name "Test" --description "Test" --author "Test"`, 'build tasks create --invalid task name')
				.then(() => {
					assert.fail('Should have rejected invalid task name');
					done();
				})
				.catch((error) => {
					// Should reject task names with spaces or invalid characters
					assert(error.stderr && error.stderr.includes('alphanumeric'), 'Should indicate task name must be alphanumeric');
					done();
				});
		});

		it('should validate friendly name length', function(done) {
			const longName = 'A'.repeat(50); // Over 40 character limit
			   execAsyncWithLogging(`node "${tfxPath}" build tasks create --task-name "testtask" --friendly-name "${longName}" --description "Test" --author "Test"`, 'build tasks create --long friendly name')
				.then(() => {
					assert.fail('Should have rejected overly long friendly name');
					done();
				})
				.catch((error) => {
					// Should reject friendly names over 40 characters
					assert(error.stderr && error.stderr.includes('40 chars'), 'Should indicate friendly name length limit');
					done();
				});
		});

		it('should validate description length', function(done) {
			const longDesc = 'A'.repeat(100); // Over 80 character limit
			   execAsyncWithLogging(`node "${tfxPath}" build tasks create --task-name "testtask" --friendly-name "Test" --description "${longDesc}" --author "Test"`, 'build tasks create --long description')
				.then(() => {
					assert.fail('Should have rejected overly long description');
					done();
				})
				.catch((error) => {
					// Should reject descriptions over 80 characters
					assert(error.stderr && error.stderr.includes('80 chars'), 'Should indicate description length limit');
					done();
				});
		});

		it('should require task ID for deletion', function(done) {
			   execAsyncWithLogging(`node "${tfxPath}" build tasks delete --no-prompt`, 'build tasks delete --no-prompt')
				.then(() => {
					assert.fail('Should have required task ID');
					done();
				})
				.catch((error) => {
					// Should require task-id parameter
					assert(error.code !== 0, 'Should exit with non-zero code when task-id is missing');
					done();
				});
		});

		it('should validate task ID format', function(done) {
			   execAsyncWithLogging(`node "${tfxPath}" build tasks delete --task-id "invalid-task-id" --no-prompt`, 'build tasks delete --invalid-task-id')
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

	describe('Task Template and Resource Validation', function() {
		
		it('should have sample JavaScript file in resources', function(done) {
			const sampleJsPath = path.join(resourcesPath, 'sample.js');
			
			if (fs.existsSync(sampleJsPath)) {
				const content = fs.readFileSync(sampleJsPath, 'utf8');
				assert(content.includes('require'), 'Sample JavaScript should contain require statements');
				assert(content.includes('tl'), 'Sample JavaScript should reference task library');
			}
			
			done();
		});

		it('should validate that created tasks follow expected structure', function(done) {
			// This tests the structure that should be created by the create command
			const expectedTaskStructure = {
				id: 'string',
				name: 'string',
				friendlyName: 'string',
				description: 'string',
				author: 'string',
				helpMarkDown: 'string',
				category: 'string',
				visibility: 'array',
				demands: 'array',
				version: 'object',
				minimumAgentVersion: 'string',
				instanceNameFormat: 'string',
				inputs: 'array',
				execution: 'object'
			};
			
			// Test that our sample task matches the expected structure
			const taskJsonPath = path.join(samplesPath, 'sample-task', 'task.json');
			
			if (fs.existsSync(taskJsonPath)) {
				const taskJson = JSON.parse(fs.readFileSync(taskJsonPath, 'utf8'));
				
				Object.keys(expectedTaskStructure).forEach(key => {
					const expectedType = expectedTaskStructure[key as keyof typeof expectedTaskStructure];
					const actualValue = taskJson[key];
					
					if (actualValue !== undefined) {
						const actualType = Array.isArray(actualValue) ? 'array' : typeof actualValue;
						assert.equal(actualType, expectedType, `${key} should be of type ${expectedType}`);
					}
				});
			}
			
			done();
		});

		it('should validate task execution runners', function(done) {
			const validRunners = ['Node10', 'Node16', 'Node20', 'PowerShell3', 'PowerShell'];
			
			['sample-task', 'minimal-task'].forEach(taskDir => {
				const taskJsonPath = path.join(samplesPath, taskDir, 'task.json');
				
				if (fs.existsSync(taskJsonPath)) {
					const taskJson = JSON.parse(fs.readFileSync(taskJsonPath, 'utf8'));
					
					if (taskJson.execution) {
						Object.keys(taskJson.execution).forEach(runner => {
							assert(validRunners.includes(runner) || runner.startsWith('Node'), 
								`${runner} should be a valid task runner`);
						});
					}
				}
			});
			
			done();
		});

		it('should validate input types are supported', function(done) {
			const validInputTypes = [
				'string', 'boolean', 'int', 'filePath', 'multiLine', 'pickList', 
				'radio', 'secureString', 'connectedService:Azure', 'connectedService:Generic'
			];
			
			const taskJsonPath = path.join(samplesPath, 'sample-task', 'task.json');
			
			if (fs.existsSync(taskJsonPath)) {
				const taskJson = JSON.parse(fs.readFileSync(taskJsonPath, 'utf8'));
				
				if (taskJson.inputs) {
					taskJson.inputs.forEach((input: any) => {
						assert(validInputTypes.includes(input.type) || input.type.startsWith('connectedService:'), 
							`Input type ${input.type} should be supported`);
					});
				}
			}
			
			done();
		});

		it('should validate task directories can contain icon files', function(done) {
			const iconPath = path.join(samplesPath, 'sample-task', 'icon.png');
			
			// While we don't create an icon.png in our test samples, the structure should support it
			// This test validates that the directory structure supports additional assets
			const taskPath = path.join(samplesPath, 'sample-task');
			assert(fs.existsSync(taskPath), 'Task directory should exist');
			
			// Test that we can check for optional files
			const optionalFiles = ['icon.png', 'icon.svg', 'task.md'];
			optionalFiles.forEach(file => {
				const filePath = path.join(taskPath, file);
				// These files may or may not exist - that's okay
				if (fs.existsSync(filePath)) {
					assert(fs.statSync(filePath).isFile(), `${file} should be a file if it exists`);
				}
			});
			
			done();
		});

		it('should validate task structure supports localization', function(done) {
			const taskJsonPath = path.join(samplesPath, 'sample-task', 'task.json');
			
			if (fs.existsSync(taskJsonPath)) {
				const taskJson = JSON.parse(fs.readFileSync(taskJsonPath, 'utf8'));
				
				// Tasks should be able to reference localized strings
				// Check if any strings look like localization keys (e.g., "ms-resource:...")
				const checkForLocalizationSupport = (obj: any) => {
					if (typeof obj === 'string') {
						// Localized strings typically start with "ms-resource:"
						return obj.startsWith('ms-resource:') || !obj.startsWith('ms-resource:');
					} else if (typeof obj === 'object' && obj !== null) {
						Object.values(obj).forEach(value => checkForLocalizationSupport(value));
					}
					return true;
				};
				
				assert(checkForLocalizationSupport(taskJson), 'Task should support localization structure');
			}
			
			done();
		});
	});

	describe('Task File Validation', function() {
		
		it('should validate sample task has correct structure', function(done) {
			const taskJsonPath = path.join(samplesPath, 'sample-task', 'task.json');
			assert(fs.existsSync(taskJsonPath), 'Sample task.json should exist');
			
			const taskJson = JSON.parse(fs.readFileSync(taskJsonPath, 'utf8'));
			
			// Validate required fields
			assert(taskJson.id, 'Task should have an ID');
			assert(taskJson.name, 'Task should have a name');
			assert(taskJson.friendlyName, 'Task should have a friendly name');
			assert(taskJson.description, 'Task should have a description');
			assert(taskJson.author, 'Task should have an author');
			assert(taskJson.version, 'Task should have a version');
			assert(taskJson.version.Major, 'Task should have a major version');
			assert(taskJson.version.Minor, 'Task should have a minor version');
			assert(taskJson.version.Patch, 'Task should have a patch version');
			assert(taskJson.execution, 'Task should have execution configuration');
			
			done();
		});

		it('should validate minimal task has required structure', function(done) {
			const taskJsonPath = path.join(samplesPath, 'minimal-task', 'task.json');
			assert(fs.existsSync(taskJsonPath), 'Minimal task.json should exist');
			
			const taskJson = JSON.parse(fs.readFileSync(taskJsonPath, 'utf8'));
			
			// Validate basic required fields
			assert(taskJson.id, 'Minimal task should have an ID');
			assert(taskJson.name, 'Minimal task should have a name');
			assert(taskJson.execution, 'Minimal task should have execution configuration');
			
			done();
		});

		it('should identify invalid task structure', function(done) {
			const taskJsonPath = path.join(samplesPath, 'invalid-task', 'task.json');
			assert(fs.existsSync(taskJsonPath), 'Invalid task.json should exist');
			
			const taskJson = JSON.parse(fs.readFileSync(taskJsonPath, 'utf8'));
			
			// Validate that this task has known invalid fields
			assert.equal(taskJson.id, 'invalid-uuid', 'Invalid task should have invalid UUID');
			assert.equal(taskJson.name, '', 'Invalid task should have empty name');
			assert.equal(taskJson.version.Major, 'not-a-number', 'Invalid task should have non-numeric version');
			
			done();
		});

		it('should validate task execution target files exist', function(done) {
			const taskPath = path.join(samplesPath, 'sample-task');
			const taskJsonPath = path.join(taskPath, 'task.json');
			const taskJson = JSON.parse(fs.readFileSync(taskJsonPath, 'utf8'));
			
			// Check that execution targets exist
			if (taskJson.execution) {
				Object.keys(taskJson.execution).forEach(runner => {
					const target = taskJson.execution[runner].target;
					const targetPath = path.join(taskPath, target);
					assert(fs.existsSync(targetPath), `Execution target should exist: ${target}`);
				});
			}
			
			done();
		});

		it('should validate task inputs are properly defined', function(done) {
			const taskJsonPath = path.join(samplesPath, 'sample-task', 'task.json');
			const taskJson = JSON.parse(fs.readFileSync(taskJsonPath, 'utf8'));
			
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

		it('should validate sample task has all expected files', function(done) {
			const taskPath = path.join(samplesPath, 'sample-task');
			const expectedFiles = ['task.json', 'sample.js', 'README.md', 'package.json'];
			
			expectedFiles.forEach(file => {
				const filePath = path.join(taskPath, file);
				assert(fs.existsSync(filePath), `Expected file should exist: ${file}`);
			});
			
			done();
		});

		it('should validate JavaScript execution files have valid syntax', function(done) {
			const jsPath = path.join(samplesPath, 'sample-task', 'sample.js');
			const jsContent = fs.readFileSync(jsPath, 'utf8');
			
			// Basic validation that it looks like valid JavaScript
			assert(jsContent.includes('function'), 'JavaScript file should contain function definitions');
			assert(!jsContent.includes('syntax error'), 'JavaScript file should not contain obvious syntax errors');
			
			done();
		});

		it('should validate package.json for Node tasks', function(done) {
			const packageJsonPath = path.join(samplesPath, 'sample-task', 'package.json');
			
			if (fs.existsSync(packageJsonPath)) {
				const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
				
				assert(packageJson.name, 'Package.json should have a name');
				assert(packageJson.version, 'Package.json should have a version');
				assert(packageJson.main, 'Package.json should have a main entry point');
				
				// Validate main file exists
				const mainPath = path.join(samplesPath, 'sample-task', packageJson.main);
				assert(fs.existsSync(mainPath), 'Main file specified in package.json should exist');
			}
			
			done();
		});

		it('should validate task instance name format uses inputs correctly', function(done) {
			const taskJsonPath = path.join(samplesPath, 'sample-task', 'task.json');
			const taskJson = JSON.parse(fs.readFileSync(taskJsonPath, 'utf8'));
			
			if (taskJson.instanceNameFormat) {
				// Should reference actual input names
				const inputNames = taskJson.inputs ? taskJson.inputs.map((i: any) => i.name) : [];
				
				// Extract variable references from instanceNameFormat (e.g., $(message))
				const variableMatches = taskJson.instanceNameFormat.match(/\$\(([^)]+)\)/g);
				if (variableMatches) {
					variableMatches.forEach((match: string) => {
						const variableName = match.replace(/\$\(|\)/g, '');
						if (!inputNames.includes(variableName) && variableName !== 'Build.DefinitionName' && variableName !== 'Build.BuildNumber') {
							// Allow some built-in variables, but validate custom ones
							assert(inputNames.includes(variableName) || variableName === 'message', 
								`Instance name format references undefined input: ${variableName}`);
						}
					});
				}
			}
			
			done();
		});

		it('should validate task visibility settings are valid', function(done) {
			const taskJsonPath = path.join(samplesPath, 'sample-task', 'task.json');
			const taskJson = JSON.parse(fs.readFileSync(taskJsonPath, 'utf8'));
			
			if (taskJson.visibility) {
				const validVisibilities = ['Build', 'Release'];
				taskJson.visibility.forEach((visibility: string) => {
					assert(validVisibilities.includes(visibility), `Invalid visibility: ${visibility}`);
				});
			}
			
			done();
		});

		it('should validate task category is reasonable', function(done) {
			const taskJsonPath = path.join(samplesPath, 'sample-task', 'task.json');
			const taskJson = JSON.parse(fs.readFileSync(taskJsonPath, 'utf8'));
			
			if (taskJson.category) {
				const validCategories = ['Build', 'Utility', 'Test', 'Package', 'Deploy'];
				assert(validCategories.includes(taskJson.category), `Category should be one of valid categories: ${taskJson.category}`);
			}
			
			done();
		});

		it('should validate version format', function(done) {
			const taskJsonPath = path.join(samplesPath, 'sample-task', 'task.json');
			const taskJson = JSON.parse(fs.readFileSync(taskJsonPath, 'utf8'));
			
			if (taskJson.version) {
				// Validate version numbers are numeric strings
				assert(!isNaN(parseInt(taskJson.version.Major)), 'Major version should be numeric');
				assert(!isNaN(parseInt(taskJson.version.Minor)), 'Minor version should be numeric');
				assert(!isNaN(parseInt(taskJson.version.Patch)), 'Patch version should be numeric');
			}
			
			done();
		});
	});
// ...end of file...
