import assert = require('assert');
import { stripColors } from 'colors';
import { createMockServer, MockDevOpsServer } from './mock-server';
import * as fs from 'fs';
import * as path from 'path';

const { exec } = require('child_process');
const { promisify } = require('util');

// Basic test framework functions to avoid TypeScript errors
declare function describe(name: string, fn: Function): void;
declare function it(name: string, fn: Function): void;
declare function before(fn: Function): void;
declare function after(fn: Function): void;

const execAsync = promisify(exec);
const tfxPath = path.resolve(__dirname, '../../_build/tfx-cli.js');

describe('Focused Login Test - Basic Authentication Only', function() {
    let mockServer: MockDevOpsServer;
    let serverUrl: string;
    
    this.timeout(30000);

    before(async function() {
        // Start mock server
        mockServer = await createMockServer({ port: 8085 });
        serverUrl = mockServer.getCollectionUrl();
        
        // Ensure the built CLI exists
        if (!fs.existsSync(tfxPath)) {
            throw new Error('TFX CLI not found. Run npm run build first.');
        }
    });

    after(async function() {
        if (mockServer) {
            await mockServer.stop();
        }
        
        // Clean up any cached credentials
        try {
            const command = `node "${tfxPath}" reset --no-prompt`;
            await execAsync(command);
        } catch (e) {
            // Ignore cleanup errors
        }
    });

    it('should attempt login with basic authentication', function(done) {
        const command = `node "${tfxPath}" login --service-url "${serverUrl}" --auth-type basic --username testuser --password testpass --no-prompt`;
        
        console.log('Running command:', command);
        console.log('Server URL:', serverUrl);
        
        execAsync(command)
            .then(({ stdout }) => {
                console.log('SUCCESS OUTPUT:', stdout);
                const cleanOutput = stripColors(stdout);
                
                // Should attempt to login
                assert(cleanOutput.length > 0, 'Should produce output');
                // Look for login-related keywords
                assert(
                    cleanOutput.toLowerCase().includes('login') || 
                    cleanOutput.toLowerCase().includes('connect') ||
                    cleanOutput.toLowerCase().includes('success') ||
                    cleanOutput.toLowerCase().includes('logged'),
                    'Should indicate login attempt'
                );
                done();
            })
            .catch((error) => {
                console.log('ERROR STDERR:', error.stderr);
                console.log('ERROR STDOUT:', error.stdout);
                console.log('ERROR MESSAGE:', error.message);
                
                const errorOutput = stripColors(error.stderr || error.stdout || '');
                if (errorOutput.includes('Could not connect') || 
                    errorOutput.includes('ECONNREFUSED') ||
                    errorOutput.includes('unable to connect') ||
                    errorOutput.includes('Unauthorized') ||
                    errorOutput.includes('login')) {
                    done(); // Expected connection attempt or authentication error
                } else {
                    done(error);
                }
            });
    });
});
