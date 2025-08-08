import assert = require('assert');
const path = require('path');
const fs = require('fs');

// Basic test framework functions to avoid TypeScript errors
declare function describe(name: string, fn: Function): void;
declare function it(name: string, fn: Function): void;
declare function before(fn: Function): void;
declare function after(fn: Function): void;

const samplesPath = path.resolve(__dirname, '../build-samples');

describe('Build Task Validation', function() {
	this.timeout(10000);

	before((done) => {
		if (!fs.existsSync(samplesPath)) {
			throw new Error('Build samples directory not found: ' + samplesPath);
		}
		done();
	});

	describe('Task.json File Validation', function() {
		
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
	});

	describe('Task File Structure Validation', function() {
		
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
	});

	describe('Task Content Validation', function() {
		
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
});
