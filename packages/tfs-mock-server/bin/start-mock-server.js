#!/usr/bin/env node

// CLI script to start the TFS Mock Server
const { createMockServer } = require('../lib/index');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {};

// Show help
if (args.includes('--help') || args.includes('-h')) {
    console.log(`
TFS Mock Server CLI

Usage: start-mock-server [options]

Options:
  --port=<number>     Port to listen on (default: 8084)
  --host=<string>     Host to bind to (default: localhost)
  --no-auth          Disable authentication requirement
  --help, -h         Show this help message

Examples:
  start-mock-server
  start-mock-server --port=8080 --host=0.0.0.0
  start-mock-server --no-auth --port=3000
`);
    process.exit(0);
}

// Parse basic options
args.forEach(arg => {
    if (arg.startsWith('--port=')) {
        const port = parseInt(arg.split('=')[1]);
        if (isNaN(port) || port < 1 || port > 65535) {
            console.error('Error: Port must be a valid number between 1 and 65535');
            process.exit(1);
        }
        options.port = port;
    } else if (arg.startsWith('--host=')) {
        options.host = arg.split('=')[1];
    } else if (arg === '--no-auth') {
        options.authRequired = false;
    } else if (!arg.startsWith('--')) {
        console.error(`Error: Unknown argument: ${arg}`);
        console.error('Use --help to see available options');
        process.exit(1);
    }
});

// Default port for the CLI version
if (!options.port) {
    options.port = 8084;
}

console.log('Starting TFS Mock Server...');
console.log(`Port: ${options.port}`);
console.log(`Host: ${options.host || 'localhost'}`);
console.log(`Auth Required: ${options.authRequired !== false ? 'yes' : 'no'}`);
console.log('');

createMockServer(options)
    .then(server => {
        console.log(`✓ TFS Mock Server is running!`);
        console.log(`  URL: ${server.getBaseUrl()}`);
        console.log(`  Collection URL: ${server.getCollectionUrl()}`);
        console.log('');
        console.log('Available endpoints:');
        console.log('  GET  /_apis/resourceareas          - Service discovery');
        console.log('  GET  /_apis/connectiondata         - Connection info');
        console.log('  GET  /_apis/build/builds           - List builds');
        console.log('  POST /_apis/build/builds           - Queue build');
        console.log('  GET  /_apis/build/definitions      - List build definitions');
        console.log('  GET  /health                       - Health check');
        console.log('');
        console.log('Press Ctrl+C to stop');
        
        // Graceful shutdown
        const shutdown = async () => {
            console.log('\n\nShutting down TFS Mock Server...');
            try {
                await server.stop();
                console.log('✓ Server stopped gracefully');
                process.exit(0);
            } catch (error) {
                console.error('Error during shutdown:', error);
                process.exit(1);
            }
        };
        
        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
    })
    .catch(error => {
        console.error('✗ Failed to start TFS Mock Server:');
        console.error(error.message);
        
        if (error.code === 'EADDRINUSE') {
            console.error(`\nPort ${options.port} is already in use. Try a different port with --port=<number>`);
        } else if (error.code === 'EACCES') {
            console.error(`\nPermission denied. Try using a port number above 1024 or run as administrator.`);
        }
        
        process.exit(1);
    });
