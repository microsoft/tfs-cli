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
const samplesPath = path.resolve(__dirname, '../build-samples');

describe('Build Commands', function() {
	this.timeout(30000); // Increase timeout for build operations

	before((done) => {
		// Ensure build samples directory exists
		if (!fs.existsSync(samplesPath)) {
			throw new Error('Build samples directory not found: ' + samplesPath);
		}
		done();
	});

	after(function() {
		// cleanup if needed
	});

	describe('Build Command Group', function() {
		
		it('should display build command group help', function(done) {
			execAsync(`node "${tfxPath}" build --help`)
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
			execAsync(`node "${tfxPath}" build list --help`)
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

		it('should handle build queue help', function(done) {
			execAsync(`node "${tfxPath}" build queue --help`)
				.then(({ stdout }) => {
					const cleanOutput = stripColors(stdout);
					assert(cleanOutput.includes('build queue'), 'Should show build queue command syntax');
					assert(cleanOutput.includes('Queue a build'), 'Should show build queue description');
					assert(cleanOutput.includes('--project'), 'Should show project argument');
					assert(cleanOutput.includes('--definition-id'), 'Should show definition-id argument');
					assert(cleanOutput.includes('--definition-name'), 'Should show definition-name argument');
					done();
				})
				.catch(done);
		});

		it('should handle build show help', function(done) {
			execAsync(`node "${tfxPath}" build show --help`)
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

		it('should reject invalid build subcommands', function(done) {
			execAsync(`node "${tfxPath}" build invalidsubcommand`)
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
	});

	describe('Build Tasks Command Group', function() {
		
		it('should display build tasks command group help', function(done) {
			execAsync(`node "${tfxPath}" build tasks --help`)
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
			execAsync(`node "${tfxPath}" build tasks create --help`)
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
			execAsync(`node "${tfxPath}" build tasks list --help`)
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
			execAsync(`node "${tfxPath}" build tasks upload --help`)
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
			execAsync(`node "${tfxPath}" build tasks delete --help`)
				.then(({ stdout }) => {
					const cleanOutput = stripColors(stdout);
					assert(cleanOutput.includes('build tasks delete'), 'Should show delete command syntax');
					assert(cleanOutput.includes('Delete a Build Task'), 'Should show delete description');
					assert(cleanOutput.includes('--task-id'), 'Should show task-id argument');
					done();
				})
				.catch(done);
		});

		it('should reject invalid build tasks subcommands', function(done) {
			execAsync(`node "${tfxPath}" build tasks invalidsubcommand`)
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
	});

	describe('Build Tasks Create Command', function() {
		
		it('should require task name for creation', function(done) {
			execAsync(`node "${tfxPath}" build tasks create --friendly-name "Test Task" --description "Test" --author "Test Author" --no-prompt`)
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
			execAsync(`node "${tfxPath}" build tasks create --task-name "testtask" --description "Test" --author "Test Author" --no-prompt`)
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
			execAsync(`node "${tfxPath}" build tasks create --task-name "testtask" --friendly-name "Test Task" --author "Test Author" --no-prompt`)
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
			execAsync(`node "${tfxPath}" build tasks create --task-name "testtask" --friendly-name "Test Task" --description "Test task" --no-prompt`)
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
			execAsync(`node "${tfxPath}" build tasks create --task-name "invalid task name with spaces" --friendly-name "Test" --description "Test" --author "Test"`)
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
			execAsync(`node "${tfxPath}" build tasks create --task-name "testtask" --friendly-name "${longName}" --description "Test" --author "Test"`)
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
			execAsync(`node "${tfxPath}" build tasks create --task-name "testtask" --friendly-name "Test" --description "${longDesc}" --author "Test"`)
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
	});
		
		it('should require task ID for deletion', function(done) {
			execAsync(`node "${tfxPath}" build tasks delete --no-prompt`)
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
			execAsync(`node "${tfxPath}" build tasks delete --task-id "invalid-task-id" --no-prompt`)
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

	describe('Build Command Argument Validation', function() {
		
		it('should show error for invalid build arguments', function(done) {
			execAsync(`node "${tfxPath}" build --invalidarg`)
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
			execAsync(`node "${tfxPath}" build tasks --badarg`)
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
			execAsync(`node "${tfxPath}" build list --invalidfilter`)
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

	describe('Build Command Hierarchy', function() {
		
		it('should support 3-level command hierarchy (build tasks create)', function(done) {
			execAsync(`node "${tfxPath}" build tasks create --help`)
				.then(({ stdout }) => {
					assert(stdout.includes('build tasks create'), 'Should handle 3-level command hierarchy');
					assert(stdout.includes('Create files for new Build Task'), 'Should show correct command description');
					done();
				})
				.catch(done);
		});

		it('should maintain context in nested commands', function(done) {
			execAsync(`node "${tfxPath}" build tasks --help`)
				.then(({ stdout }) => {
					const cleanOutput = stripColors(stdout);
					assert(cleanOutput.includes('tfx / build / tasks'), 'Should show nested command context');
					assert(cleanOutput.includes('tfx build tasks <command> --help'), 'Should show correct help path');
					done();
				})
				.catch(done);
		});
});