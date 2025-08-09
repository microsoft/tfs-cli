#!/usr/bin/env node

// CLI script to start the TFS Mock Server
const { createMockServer } = require('../lib/mock-devops-server');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {};

// Parse basic options
args.forEach(arg => {
    if (arg.startsWith('--port=')) {
        options.port = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--host=')) {
        options.host = arg.split('=')[1];
    } else if (arg === '--no-auth') {
        options.authRequired = false;
    }
});

// Default port for the CLI version
if (!options.port) {
    options.port = 8084;
}

console.log('Starting TFS Mock Server...');
console.log(`Port: ${options.port || 8084}`);
console.log(`Host: ${options.host || 'localhost'}`);
console.log(`Auth Required: ${options.authRequired !== false}`);

createMockServer(options)
    .then(server => {
        console.log(`TFS Mock Server listening on ${server.getBaseUrl()}`);
        console.log('Press Ctrl+C to stop');
        
        process.on('SIGINT', () => {
            console.log('\nShutting down TFS Mock Server...');
            server.stop().then(() => {
                process.exit(0);
            });
        });
    })
    .catch(error => {
        console.error('Failed to start TFS Mock Server:', error);
        process.exit(1);
    });
