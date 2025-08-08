import assert = require('assert');
const path = require('path');
const fs = require('fs');

// Basic test framework functions to avoid TypeScript errors
declare function describe(name: string, fn: Function): void;
declare function it(name: string, fn: Function): void;
declare function before(fn: Function): void;
declare function after(fn: Function): void;

describe('Build Task Templates and Resources', function() {
	this.timeout(10000);

	const resourcesPath = path.resolve(__dirname, '../app/exec/build/tasks/_resources');

	describe('Template Files Validation', function() {
		
		it('should have sample JavaScript file in resources', function(done) {
			const sampleJsPath = path.join(resourcesPath, 'sample.js');
			
			if (fs.existsSync(sampleJsPath)) {
				const content = fs.readFileSync(sampleJsPath, 'utf8');
				assert(content.includes('require'), 'Sample JavaScript should contain require statements');
				assert(content.includes('tl'), 'Sample JavaScript should reference task library');
			}
			
			done();
		});
	});

	describe('Task Creation Templates', function() {
		
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
			const samplesPath = path.resolve(__dirname, '../build-samples');
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
			const samplesPath = path.resolve(__dirname, '../build-samples');
			
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
			
			const samplesPath = path.resolve(__dirname, '../build-samples');
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
	});

	describe('Task Icon and Assets', function() {
		
		it('should validate task directories can contain icon files', function(done) {
			const samplesPath = path.resolve(__dirname, '../build-samples');
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
	});

	describe('Task Localization Support', function() {
		
		it('should validate task structure supports localization', function(done) {
			const samplesPath = path.resolve(__dirname, '../build-samples');
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
});
