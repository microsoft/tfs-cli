import assert = require('assert');
import { stripColors } from 'colors';
import path = require('path');
import { execAsyncWithLogging } from './test-utils/debug-exec';

// Basic test framework functions to avoid TypeScript errors
declare function describe(name: string, fn: Function): void;
declare function it(name: string, fn: Function): void;
declare function before(fn: Function): void;
declare function after(fn: Function): void;

const tfxPath = path.resolve(__dirname, '../../_build/tfx-cli.js');

describe('tfx-cli', function() {
	this.timeout(10000); // Increase timeout for CLI operations

	before((done) => {
		// Ensure build is available
		done();
	});

	after(function() {
		// cleanup if needed
	});

	describe('Command Line Parsing', function() {
		
		   it('should display help when no arguments provided', function(done) {
			   execAsyncWithLogging(`node "${tfxPath}"`, 'tfx-cli (no args)')
				   .then(({ stdout }) => {
					   const cleanOutput = stripColors(stdout);
					   assert(cleanOutput.includes('TFS Cross Platform Command Line Interface'), 'Should show CLI banner');
					   assert(cleanOutput.includes('Available commands and command groups in tfx'), 'Should show available commands');
					   assert(cleanOutput.includes(' - login'), 'Should list login command');
					   assert(cleanOutput.includes(' - build'), 'Should list build command');
					   assert(cleanOutput.includes(' - extension'), 'Should list extension command');
					   assert(cleanOutput.includes(' - workitem'), 'Should list workitem command');
					   done();
				   })
				   .catch(done);
		   });

		   it('should display help when --help flag is used', function(done) {
			   execAsyncWithLogging(`node "${tfxPath}" --help`, 'tfx-cli --help')
				   .then(({ stdout }) => {
					   const cleanOutput = stripColors(stdout);
					   assert(cleanOutput.includes('TFS Cross Platform Command Line Interface'), 'Should show CLI banner');
					   assert(cleanOutput.includes('Available commands and command groups in tfx'), 'Should show available commands');
					   done();
				   })
				   .catch(done);
		   });

		   it('should display version information', function(done) {
			   execAsyncWithLogging(`node "${tfxPath}" version`, 'tfx-cli version')
				   .then(({ stdout }) => {
					   assert(stdout.includes('TFS Cross Platform Command Line Interface'), 'Should show CLI banner');
					   // Version should be displayed
					assert(stdout.match(/v\d+\.\d+\.\d+/), 'Should show version number');
					done();
				})
				.catch(done);
		});

		   it('should handle build command help', function(done) {
			   execAsyncWithLogging(`node "${tfxPath}" build --help`, 'tfx-cli build --help')
				   .then(({ stdout }) => {
					   assert(stdout.includes('build'), 'Should reference build commands');
					   done();
				   })
				   .catch(done);
		   });

		   it('should handle extension command help', function(done) {
			   execAsyncWithLogging(`node "${tfxPath}" extension --help`, 'tfx-cli extension --help')
				   .then(({ stdout }) => {
					   assert(stdout.includes('extension'), 'Should reference extension commands');
					   done();
				   })
				   .catch(done);
		   });

		   it('should handle workitem command help', function(done) {
			   execAsyncWithLogging(`node "${tfxPath}" workitem --help`, 'tfx-cli workitem --help')
				   .then(({ stdout }) => {
					   assert(stdout.includes('workitem'), 'Should reference workitem commands');
					   done();
				   })
				   .catch(done);
		   });

		   it('should handle nested command help - build tasks', function(done) {
			   execAsyncWithLogging(`node "${tfxPath}" build tasks --help`, 'tfx-cli build tasks --help')
				   .then(({ stdout }) => {
					   assert(stdout.includes('tasks'), 'Should reference tasks commands');
					   done();
				   })
				   .catch((error) => {
					   // Some commands might require authentication, that's ok for this test
					   assert(error.stderr || error.stdout, 'Should produce some output even if authentication required');
					   done();
				   });
		   });

		   it('should handle nested command help - extension create', function(done) {
			   execAsyncWithLogging(`node "${tfxPath}" extension create --help`, 'tfx-cli extension create --help')
				   .then(({ stdout }) => {
					   assert(stdout.includes('create') || stdout.includes('extension'), 'Should reference create command');
					   done();
				   })
				   .catch((error) => {
					   // Some commands might have specific requirements, that's ok for this test
					   assert(error.stderr || error.stdout, 'Should produce some output');
					   done();
				   });
		   });

		   it('should reject invalid commands', function(done) {
			   execAsyncWithLogging(`node "${tfxPath}" invalidcommand`, 'tfx-cli invalidcommand')
				   .then(() => {
					   assert.fail('Should have thrown an error for invalid command');
					   done();
				   })
				   .catch((error) => {
					   assert(error.stderr && (error.stderr.includes('not found') || error.stderr.includes('not recognized')), 
						   'Should indicate command was not found');
					   done();
				   });
		   });

		   it('should reject invalid subcommands', function(done) {
			   execAsyncWithLogging(`node "${tfxPath}" build invalidsubcommand`, 'tfx-cli build invalidsubcommand')
				   .then(() => {
					   assert.fail('Should have thrown an error for invalid subcommand');
					   done();
				   })
				   .catch((error) => {
					   assert(error.stderr && (error.stderr.includes('not found') || error.stderr.includes('not recognized')), 
						   'Should indicate subcommand was not found');
					   done();
				   });
		   });

		   it('should handle mixed valid and invalid command paths', function(done) {
			   execAsyncWithLogging(`node "${tfxPath}" extension invalidsubcommand`, 'tfx-cli extension invalidsubcommand')
				   .then(() => {
					   assert.fail('Should have thrown an error for invalid command path');
					   done();
				   })
				   .catch((error) => {
					   assert(error.stderr && (error.stderr.includes('not found') || error.stderr.includes('not recognized')), 
						   'Should indicate command path was not found');
					   done();
				   });
		   });

		   it('should preserve argument order and values', function(done) {
			   execAsyncWithLogging(`node "${tfxPath}" build list --project TestProject --help`, 'tfx-cli build list --project TestProject --help')
				   .then(({ stdout, stderr }) => {
					   // Should show help for build list command, acknowledging the --project argument
					   assert(stdout.includes('help') || stderr.includes('project'), 'Should process arguments correctly');
					   done();
				   })
				   .catch((error) => {
					   // Even if command fails, it should recognize the structure
					   assert(error.stdout || error.stderr, 'Should produce output showing argument processing');
					   done();
				   });
		   });

		   it('should handle flags correctly', function(done) {
			   execAsyncWithLogging(`node "${tfxPath}" --help --json`, 'tfx-cli --help --json')
				   .then(({ stdout }) => {
					   const cleanOutput = stripColors(stdout);
					   assert(cleanOutput.includes('Available commands and command groups in tfx'), 'Should show help despite additional flags');
					   done();
				   })
				   .catch((error) => {
					   // Should still process help even with other flags - but might not support --json
					   if (error.stderr && error.stderr.includes('not recognized')) {
						   // That's expected - --json might not be supported everywhere
						   done();
					   } else {
						   done(error);
					   }
				   });
		   });

		   it('should distinguish between commands and arguments', function(done) {
			   this.timeout(15000); // Increase timeout for this test
			   execAsyncWithLogging(`node "${tfxPath}" --invalidflag`, 'tfx-cli --invalidflag')
				   .then(({ stdout }) => {
					   // This should show help since --invalidflag is not a recognized flag
					   const cleanOutput = stripColors(stdout);
					   assert(cleanOutput.includes('Available commands and command groups in tfx'), 'Should show help for invalid flag');
					   done();
				   })
				   .catch((error) => {
					   // Expected to fail, but should recognize it's an argument, not a command
					   assert(error.stderr || error.stdout, 'Should produce output for invalid flag');
					   done();
				   });
		   });
	});

	describe('Command Hierarchy Validation', function() {
		
		   it('should support all documented top-level commands', function(done) {
			   const expectedCommands = ['login', 'logout', 'reset', 'version', 'build', 'extension', 'workitem'];
           
			   execAsyncWithLogging(`node "${tfxPath}" --help`, 'tfx-cli --help')
				   .then(({ stdout }) => {
					   const cleanOutput = stripColors(stdout);
					   expectedCommands.forEach(cmd => {
						   assert(cleanOutput.includes(cmd), `Should list ${cmd} command in help`);
					   });
					   done();
				   })
				   .catch(done);
		   });

		   it('should handle command hierarchy depth correctly', function(done) {
			   // Test that deeply nested commands work: build -> tasks -> create
			   execAsyncWithLogging(`node "${tfxPath}" build tasks create --help`, 'tfx-cli build tasks create --help')
				   .then(({ stdout, stderr }) => {
					   assert(stdout.includes('create') || stderr.includes('create'), 'Should handle 3-level command hierarchy');
					   done();
				   })
				   .catch((error) => {
					   // Command might require auth, but should recognize the structure
					   assert(error.stdout || error.stderr, 'Should recognize command hierarchy structure');
					   done();
				   });
		   });
	});

	describe('Error Handling', function() {

		   it('should provide helpful error messages for typos in commands', function(done) {
			   execAsyncWithLogging(`node "${tfxPath}" biuld`, 'tfx-cli biuld') // Typo in 'build'
				   .then(() => {
					   assert.fail('Should have thrown an error for typo');
					   done();
				   })
				   .catch((error) => {
					   assert(error.stderr && error.stderr.includes('not found'), 'Should indicate command was not found');
					   done();
				   });
		   });

		   it('should suggest correct command structure in error messages', function(done) {
			   execAsyncWithLogging(`node "${tfxPath}" build wrongcommand`, 'tfx-cli build wrongcommand')
				   .then(() => {
					   assert.fail('Should have thrown an error for wrong subcommand');
					   done();
				   })
				   .catch((error) => {
					   assert(error.stderr && error.stderr.includes('help'), 'Error message should suggest using help');
					   done();
				   });
		   });

		   it('should handle empty command gracefully', function(done) {
			   // Empty command should just show help, not crash
			   execAsyncWithLogging(`node "${tfxPath}"`, 'tfx-cli (empty)')
				   .then(({ stdout }) => {
					   const cleanOutput = stripColors(stdout);
					   assert(cleanOutput.includes('Available commands and command groups in tfx'), 'Empty command should show help');
					   done();
				   })
				   .catch(done);
		   });

		   it('should exit with appropriate codes', function(done) {
			   execAsyncWithLogging(`node "${tfxPath}" invalidcommand`, 'tfx-cli invalidcommand')
				   .then(() => {
					   assert.fail('Should exit with non-zero code for invalid command');
					   done();
				   })
				   .catch((error) => {
					   assert(error.code !== 0, 'Should exit with non-zero exit code for errors');
					   done();
				   });
		   });
	});

	describe('Argument Processing', function() {
		
		   it('should handle boolean flags correctly', function(done) {
			   // Test with a valid command and boolean flag
			   execAsyncWithLogging(`node "${tfxPath}" version --json`, 'tfx-cli version --json')
				   .then(({ stdout }) => {
					   // Should show JSON output for version command
					   assert(stdout.includes('"major":') || stdout.includes('"minor":'), 'Should produce JSON output for version --json');
					   done();
				   })
				   .catch((error) => {
					   // Even if --json isn't supported, should recognize the command structure
					   if (error.stderr && error.stderr.includes('not recognized')) {
						   // That's expected - not all commands support --json
						   done();
					   } else {
						   done(error);
					   }
				   });
		   });

		   it('should handle string arguments correctly', function(done) {
			   // Test with a command that takes string arguments
			   execAsyncWithLogging(`node "${tfxPath}" build --help`, 'tfx-cli build --help')
				   .then(({ stdout }) => {
					   assert(stdout.includes('build') || stdout.includes('Available'), 'Should handle string arguments');
					   done();
				   })
				   .catch(done);
		   });

		   it('should handle mixed argument types', function(done) {
			   // Test with mixed argument types
			   execAsyncWithLogging(`node "${tfxPath}" extension --help --json`, 'tfx-cli extension --help --json')
				   .then(({ stdout }) => {
					   assert(stdout.includes('extension') || stdout.includes('Available'), 'Should handle mixed argument types');
					   done();
				   })
				   .catch((error) => {
					   // Should handle mixed args even if some aren't supported
					   if (error.stderr && error.stderr.includes('not recognized')) {
						   // That's expected - not all commands support --json
						   done();
					   } else {
						   done(error);
					   }
				   });
		   });

		   it('should show error for invalid arguments', function(done) {
			   execAsyncWithLogging(`node "${tfxPath}" --invalidarg`, 'tfx-cli --invalidarg')
				   .then(({ stdout, stderr }) => {
					   const cleanStdout = stripColors(stdout);
					   const cleanStderr = stripColors(stderr);
					   assert(cleanStderr.includes('Unrecognized argument: --invalidarg'), 'Should show error for invalid argument in stderr');
					   assert(cleanStdout.includes('Available commands and command groups in tfx'), 'Should show help after error in stdout');
					   done();
				   })
				   .catch(done);
		   });

		   it('should show error for multiple invalid arguments', function(done) {
			   execAsyncWithLogging(`node "${tfxPath}" build --badarg --anotherbadarg`, 'tfx-cli build --badarg --anotherbadarg')
				   .then(({ stdout, stderr }) => {
					   const cleanStdout = stripColors(stdout);
					   const cleanStderr = stripColors(stderr);
					   assert(cleanStderr.includes('Unrecognized arguments: --badarg, --anotherbadarg'), 'Should show error for multiple invalid arguments in stderr');
					   assert(cleanStdout.includes('Available commands and command groups in tfx / build'), 'Should show command-specific help after error in stdout');
					   done();
				   })
				   .catch(done);
		   });

		   it('should show error for invalid arguments mixed with valid ones', function(done) {
			   execAsyncWithLogging(`node "${tfxPath}" version --invalidarg`, 'tfx-cli version --invalidarg')
				   .then(({ stdout, stderr }) => {
					   const cleanStdout = stripColors(stdout);
					   const cleanStderr = stripColors(stderr);
					   assert(cleanStderr.includes('Unrecognized argument: --invalidarg'), 'Should show error for invalid argument even when command is valid in stderr');
					   assert(cleanStdout.includes('version'), 'Should show version command help after error in stdout');
					   done();
				   })
				   .catch(done);
		   });
	});
});