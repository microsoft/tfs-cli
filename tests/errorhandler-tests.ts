import assert = require('assert');
import path = require('path');

// Import the error handler module for direct testing
// We need to test the formatAggregateError functionality indirectly through errLog

// Basic test framework functions to avoid TypeScript errors
declare function describe(name: string, fn: Function): void;
declare function it(name: string, fn: Function): void;
declare function before(fn: Function): void;
declare function beforeEach(fn: Function): void;
declare function afterEach(fn: Function): void;

// AggregateError type declaration for older TypeScript targets
declare class AggregateError extends Error {
    errors: any[];
    constructor(errors: Iterable<any>, message?: string);
}

describe('Error Handler Tests', function() {
    this.timeout(10000);

    // We'll capture what trace.error outputs
    let capturedErrors: string[] = [];
    let capturedDebug: string[] = [];
    let originalProcessExit: typeof process.exit;
    let exitCalled: boolean = false;
    let exitCode: number | undefined;

    // Store original modules
    let errHandler: any;
    let trace: any;

    before(function() {
        // Import modules
        errHandler = require('../../_build/lib/errorhandler');
        trace = require('../../_build/lib/trace');
    });

    beforeEach(function() {
        // Reset capture arrays
        capturedErrors = [];
        capturedDebug = [];
        exitCalled = false;
        exitCode = undefined;

        // Mock trace.error to capture output
        trace.error = function(msg: any, ...args: any[]) {
            if (typeof msg === 'string') {
                capturedErrors.push(msg);
            } else if (typeof msg === 'object') {
                capturedErrors.push(JSON.stringify(msg));
            } else {
                capturedErrors.push(String(msg));
            }
        };

        // Mock trace.debug to capture output
        trace.debug = function(msg: any, ...args: any[]) {
            if (msg) {
                capturedDebug.push(String(msg));
            }
        };

        // Mock process.exit to prevent test from exiting
        originalProcessExit = process.exit;
        (process as any).exit = function(code?: number) {
            exitCalled = true;
            exitCode = code;
        };
    });

    afterEach(function() {
        // Restore process.exit
        process.exit = originalProcessExit;
    });

    describe('errLog with AggregateError', function() {
        
        it('should format AggregateError with string errors', function() {
            // Create an AggregateError with string errors
            const aggregateError = new AggregateError(
                ['First error message', 'Second error message'],
                'Multiple operations failed'
            );

            errHandler.errLog(aggregateError);

            assert(exitCalled, 'process.exit should have been called');
            assert.strictEqual(exitCode, -1, 'exit code should be -1');
            assert(capturedErrors.length > 0, 'should have captured error output');
            
            const errorOutput = capturedErrors.join('\n');
            assert(errorOutput.includes('Multiple errors occurred'), 'should indicate multiple errors');
            assert(errorOutput.includes('[1]'), 'should have numbered first error');
            assert(errorOutput.includes('[2]'), 'should have numbered second error');
            assert(errorOutput.includes('First error message'), 'should include first error message');
            assert(errorOutput.includes('Second error message'), 'should include second error message');
        });

        it('should format AggregateError with Error objects', function() {
            const error1 = new Error('HTTP 401: Unauthorized');
            const error2 = new Error('HTTP 404: Not Found');
            
            const aggregateError = new AggregateError(
                [error1, error2],
                'API calls failed'
            );

            errHandler.errLog(aggregateError);

            assert(exitCalled, 'process.exit should have been called');
            
            const errorOutput = capturedErrors.join('\n');
            assert(errorOutput.includes('Multiple errors occurred'), 'should indicate multiple errors');
            assert(errorOutput.includes('HTTP 401: Unauthorized'), 'should include first error message');
            assert(errorOutput.includes('HTTP 404: Not Found'), 'should include second error message');
        });

        it('should format AggregateError with mixed error types', function() {
            const error1 = new Error('Error object message');
            const error2 = 'Plain string error';
            const error3 = { message: 'Object with message property' };
            const error4 = 42; // Non-standard error type
            
            const aggregateError = new AggregateError(
                [error1, error2, error3, error4],
                'Mixed errors'
            );

            errHandler.errLog(aggregateError);

            const errorOutput = capturedErrors.join('\n');
            assert(errorOutput.includes('Multiple errors occurred'), 'should indicate multiple errors');
            assert(errorOutput.includes('[1]'), 'should have numbered errors');
            assert(errorOutput.includes('[2]'), 'should have numbered errors');
            assert(errorOutput.includes('[3]'), 'should have numbered errors');
            assert(errorOutput.includes('[4]'), 'should have numbered errors');
            assert(errorOutput.includes('Error object message'), 'should include Error object message');
            assert(errorOutput.includes('Plain string error'), 'should include string error');
            assert(errorOutput.includes('Object with message property'), 'should include object message');
            assert(errorOutput.includes('42'), 'should include stringified non-standard error');
        });

        it('should format AggregateError with single error', function() {
            const aggregateError = new AggregateError(
                ['Single error only'],
                'One failure'
            );

            errHandler.errLog(aggregateError);

            const errorOutput = capturedErrors.join('\n');
            assert(errorOutput.includes('Multiple errors occurred'), 'should use consistent format');
            assert(errorOutput.includes('[1]'), 'should number the single error');
            assert(errorOutput.includes('Single error only'), 'should include the error message');
        });

        it('should handle empty AggregateError gracefully', function() {
            const aggregateError = new AggregateError([], 'No errors');

            errHandler.errLog(aggregateError);

            // With empty errors array, it should fall through to toString()
            assert(exitCalled, 'process.exit should have been called');
            // Empty errors array means formatAggregateError returns the header but no items
            const errorOutput = capturedErrors.join('\n');
            assert(errorOutput.includes('Multiple errors occurred') || errorOutput.includes('AggregateError'), 
                'should handle empty aggregate error');
        });
    });

    describe('errLog with regular errors', function() {
        
        it('should handle plain string errors', function() {
            errHandler.errLog('Simple error message');

            assert(exitCalled, 'process.exit should have been called');
            assert(capturedErrors.includes('Simple error message'), 'should output the string directly');
        });

        it('should handle Error objects', function() {
            const error = new Error('Standard error message');

            errHandler.errLog(error);

            assert(exitCalled, 'process.exit should have been called');
            const errorOutput = capturedErrors.join('\n');
            assert(errorOutput.includes('Standard error message'), 'should include error message');
        });

        it('should handle objects with toString', function() {
            const errorObj = {
                toString: function() { return 'Custom toString output'; }
            };

            errHandler.errLog(errorObj);

            assert(exitCalled, 'process.exit should have been called');
            const errorOutput = capturedErrors.join('\n');
            assert(errorOutput.includes('Custom toString output'), 'should use toString method');
        });
    });

    describe('httpErr function', function() {
        
        it('should throw for 401 status code', function() {
            const httpError = {
                statusCode: 401,
                message: 'Unauthorized'
            };

            assert.throws(
                () => errHandler.httpErr(httpError),
                /401.*Not Authorized.*personal access token/,
                'should throw descriptive 401 error'
            );
        });

        it('should throw for 403 status code', function() {
            const httpError = {
                statusCode: 403,
                message: 'Access denied to resource'
            };

            assert.throws(
                () => errHandler.httpErr(httpError),
                /403.*Forbidden.*Access denied to resource/,
                'should throw descriptive 403 error'
            );
        });

        it('should extract message from body', function() {
            const httpError = {
                statusCode: 500,
                body: {
                    message: 'Internal server error details'
                }
            };

            assert.throws(
                () => errHandler.httpErr(httpError),
                /Internal server error details/,
                'should extract message from body'
            );
        });

        it('should handle string body that is JSON', function() {
            const httpError = {
                statusCode: 500,
                body: JSON.stringify({ message: 'Parsed from JSON string' })
            };

            assert.throws(
                () => errHandler.httpErr(httpError),
                /Parsed from JSON string/,
                'should parse JSON string body'
            );
        });

        it('should use message property if no body', function() {
            const httpError = {
                statusCode: 500,
                message: 'Top level message'
            };

            assert.throws(
                () => errHandler.httpErr(httpError),
                /Top level message/,
                'should use message property'
            );
        });

        it('should handle string errors', function() {
            const stringError = JSON.stringify({ statusCode: 401 });

            assert.throws(
                () => errHandler.httpErr(stringError),
                /401.*Not Authorized/,
                'should parse JSON string error'
            );
        });
    });
});

describe('AggregateError in Promise.all scenarios', function() {
    this.timeout(10000);

    it('should properly format errors from Promise.all with multiple rejections', async function() {
        // Simulate what happens with share-with failing for multiple accounts
        const shareOperations = [
            Promise.reject(new Error('Organization "account1" not found')),
            Promise.reject(new Error('Organization "account2" access denied')),
        ];

        try {
            await Promise.all(shareOperations);
            assert.fail('Should have thrown');
        } catch (err) {
            // Promise.all throws the first error, not AggregateError
            // AggregateError comes from Promise.any or when explicitly created
            assert(err instanceof Error, 'Should be an Error');
            assert(err.message.includes('account1'), 'Should include first error');
        }
    });

    it('should create AggregateError when collecting multiple failures', function() {
        // This simulates how we might manually collect and report multiple failures
        const errors = [
            new Error('First operation failed'),
            new Error('Second operation failed')
        ];
        
        const aggregateError = new AggregateError(errors, 'Multiple operations failed');
        
        assert.strictEqual(aggregateError.errors.length, 2, 'Should have 2 errors');
        assert(aggregateError.errors[0].message.includes('First operation'), 'Should include first error');
        assert(aggregateError.errors[1].message.includes('Second operation'), 'Should include second error');
        assert.strictEqual(aggregateError.name, 'AggregateError', 'Should have correct name');
    });
});

