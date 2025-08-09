import { strict as assert } from 'assert';
import * as http from 'http';
import { MockDevOpsServer } from '../src/MockDevOpsServer';

interface TestResponse {
    statusCode: number;
    body: any;
    headers: { [key: string]: string | string[] };
}

/**
 * Behavior compatibility test suite to verify that the refactored mock server
 * behaves identically to the original monolithic implementation.
 */
describe('Mock Server Behavior Compatibility Tests', () => {
    let server: MockDevOpsServer;
    const port = 8099;

    beforeEach(async () => {
        server = new MockDevOpsServer({ port, authRequired: true });
        await server.start();
    });

    afterEach(async () => {
        if (server) {
            await server.stop();
        }
    });

    describe('Critical OPTIONS API Discovery Tests', () => {
        it('should return correct Location area discovery', async () => {
            const response = await makeRequest('OPTIONS', '/_apis/Location', {
                'Authorization': 'Basic dGVzdHVzZXI6dGVzdHBhc3M='
            });

            assert.strictEqual(response.statusCode, 200, 'Location OPTIONS should return 200');
            assert(Array.isArray(response.body.value), 'Response should contain value array');
            assert.strictEqual(response.body.value.length, 2, 'Location should have 2 resources');
            
            const connectionData = response.body.value.find((r: any) => r.resourceName === 'ConnectionData');
            assert(connectionData, 'ConnectionData resource must exist');
            assert.strictEqual(connectionData.id, '00d9565f-ed9c-4a06-9a50-00e7896ccab4');
        });

        it('should return correct ExtensionManagement area discovery with expected resource ID', async () => {
            const response = await makeRequest('OPTIONS', '/_apis/ExtensionManagement', {
                'Authorization': 'Basic dGVzdHVzZXI6dGVzdHBhc3M='
            });

            assert.strictEqual(response.statusCode, 200, 'ExtensionManagement OPTIONS should return 200');
            assert(Array.isArray(response.body.value), 'Response should contain value array');
            assert.strictEqual(response.body.value.length, 1, 'ExtensionManagement should have 1 resource');
            
            const installedExtensions = response.body.value[0];
            assert.strictEqual(installedExtensions.id, 'fb0da285-f23e-4b56-8b53-3ef5f9f6de66', 
                'ExtensionManagement must return the exact ID that CLI expects');
            assert.strictEqual(installedExtensions.area, 'ExtensionManagement');
        });

        it('should return correct gallery area discovery with all expected resource IDs', async () => {
            const response = await makeRequest('OPTIONS', '/_apis/gallery', {
                'Authorization': 'Basic dGVzdHVzZXI6dGVzdHBhc3M='
            });

            assert.strictEqual(response.statusCode, 200, 'Gallery OPTIONS should return 200');
            assert(Array.isArray(response.body.value), 'Response should contain value array');
            assert.strictEqual(response.body.value.length, 4, 'Gallery should have 4 resources');
            
            // Check for the specific gallery resource area ID that CLI looks for
            const extensionsResource = response.body.value.find((r: any) => r.id === 'a41192c8-9525-4b58-bc86-179fa549d80d');
            assert(extensionsResource, 'Extensions resource with ID a41192c8-9525-4b58-bc86-179fa549d80d must exist for CLI compatibility');
        });

        it('should return correct distributedtask area discovery', async () => {
            const response = await makeRequest('OPTIONS', '/_apis/distributedtask', {
                'Authorization': 'Basic dGVzdHVzZXI6dGVzdHBhc3M='
            });

            assert.strictEqual(response.statusCode, 200, 'DistributedTask OPTIONS should return 200');
            assert(Array.isArray(response.body.value), 'Response should contain value array');
            assert.strictEqual(response.body.value.length, 1, 'DistributedTask should have 1 resource');
            
            const tasksResource = response.body.value[0];
            assert.strictEqual(tasksResource.id, '60aac929-f0cd-4bc8-9ce4-6b30e8f1b1bd');
            assert.strictEqual(tasksResource.resourceName, 'TaskDefinitions');
        });

        it('should return correct build area discovery', async () => {
            const response = await makeRequest('OPTIONS', '/_apis/build', {
                'Authorization': 'Basic dGVzdHVzZXI6dGVzdHBhc3M='
            });

            assert.strictEqual(response.statusCode, 200, 'Build OPTIONS should return 200');
            assert(Array.isArray(response.body.value), 'Response should contain value array');
            assert.strictEqual(response.body.value.length, 3, 'Build should have 3 resources');
            
            const buildsResource = response.body.value.find((r: any) => r.id === '965220d5-5bb9-42cf-8d67-9b146df2a5a4');
            assert(buildsResource, 'Builds resource must exist');
            assert.strictEqual(buildsResource.resourceName, 'Builds');
        });

        it('should return correct wit area discovery', async () => {
            const response = await makeRequest('OPTIONS', '/_apis/wit', {
                'Authorization': 'Basic dGVzdHVzZXI6dGVzdHBhc3M='
            });

            assert.strictEqual(response.statusCode, 200, 'WIT OPTIONS should return 200');
            assert(Array.isArray(response.body.value), 'Response should contain value array');
            assert.strictEqual(response.body.value.length, 5, 'WIT should have 5 resources');
            
            const workItemsResource = response.body.value.find((r: any) => r.resourceName === 'WorkItems');
            assert(workItemsResource, 'WorkItems resource must exist');
            assert.strictEqual(workItemsResource.id, '72c7ddf8-2cdc-4f60-90cd-ab71c14a399b');
        });
    });

    describe('Core API Functionality Tests', () => {
        it('should handle connection data requests', async () => {
            const response = await makeRequest('GET', '/_apis/connectiondata', {
                'Authorization': 'Basic dGVzdHVzZXI6dGVzdHBhc3M='
            });

            assert.strictEqual(response.statusCode, 200);
            assert(response.body.authenticatedUser, 'authenticatedUser should exist');
            assert.strictEqual(response.body.authenticatedUser.id, 'test-user-id');
        });

        it('should handle resource areas discovery', async () => {
            const response = await makeRequest('GET', '/_apis/resourceareas', {
                'Authorization': 'Basic dGVzdHVzZXI6dGVzdHBhc3M='
            });

            assert.strictEqual(response.statusCode, 200);
            assert.strictEqual(response.body.count, 6);
            assert(Array.isArray(response.body.value), 'Response should contain value array');
        });

        it('should handle extension GET requests', async () => {
            const response = await makeRequest('GET', '/_apis/gallery/extensions/test-publisher/test-extension', {
                'Authorization': 'Basic dGVzdHVzZXI6dGVzdHBhc3M='
            });

            assert.strictEqual(response.statusCode, 200);
            assert.strictEqual(response.body.extensionId, 'test-extension');
            assert.strictEqual(response.body.publisher.publisherName, 'test-publisher');
        });

        it('should handle extension publish requests', async () => {
            const extensionData = {
                extensionId: 'new-extension',
                extensionName: 'New Extension',
                version: '1.0.0'
            };

            const response = await makeRequest('POST', '/_apis/gallery/extensions', {
                'Authorization': 'Basic dGVzdHVzZXI6dGVzdHBhc3M=',
                'Content-Type': 'application/json'
            }, extensionData);

            assert.strictEqual(response.statusCode, 201);
            assert(response.body.extensionId, 'Extension should have an ID');
        });

        it('should handle task definition requests', async () => {
            const response = await makeRequest('GET', '/_apis/distributedtask/tasks', {
                'Authorization': 'Basic dGVzdHVzZXI6dGVzdHBhc3M='
            });

            assert.strictEqual(response.statusCode, 200);
            assert(typeof response.body.count === 'number');
            assert(Array.isArray(response.body.value));
        });

        it('should handle build requests', async () => {
            const response = await makeRequest('GET', '/_apis/build/builds', {
                'Authorization': 'Basic dGVzdHVzZXI6dGVzdHBhc3M='
            });

            assert.strictEqual(response.statusCode, 200);
            assert(typeof response.body.count === 'number');
            assert(Array.isArray(response.body.value));
        });

        it('should handle work item requests', async () => {
            const response = await makeRequest('GET', '/_apis/wit/workitems/1', {
                'Authorization': 'Basic dGVzdHVzZXI6dGVzdHBhc3M='
            });

            assert.strictEqual(response.statusCode, 200);
            assert.strictEqual(response.body.id, 1);
            assert(response.body.fields, 'Work item should have fields');
        });
    });

    describe('Authentication and CORS Tests', () => {
        it('should require authentication for protected endpoints', async () => {
            const response = await makeRequest('GET', '/_apis/build/builds');

            assert.strictEqual(response.statusCode, 401);
        });

        it('should include CORS headers', async () => {
            const response = await makeRequest('GET', '/_apis/connectiondata', {
                'Authorization': 'Basic dGVzdHVzZXI6dGVzdHBhc3M='
            });

            assert.strictEqual(response.headers['access-control-allow-origin'], '*');
        });

        it('should handle preflight OPTIONS requests', async () => {
            const response = await makeRequest('OPTIONS', '/_apis/custom-endpoint');

            assert.strictEqual(response.statusCode, 200);
            assert.strictEqual(response.headers['access-control-allow-origin'], '*');
        });
    });

    describe('Error Handling Tests', () => {
        it('should return 404 for unknown endpoints', async () => {
            const response = await makeRequest('GET', '/_apis/unknown/endpoint', {
                'Authorization': 'Basic dGVzdHVzZXI6dGVzdHBhc3M='
            });

            assert.strictEqual(response.statusCode, 404);
            assert.strictEqual(response.body.error, 'Not Found');
        });

        it('should return health status', async () => {
            const response = await makeRequest('GET', '/health');

            assert.strictEqual(response.statusCode, 200);
            assert.strictEqual(response.body.status, 'healthy');
        });
    });

    // Helper function to make HTTP requests
    async function makeRequest(
        method: string, 
        path: string, 
        headers: { [key: string]: string } = {}, 
        body?: any
    ): Promise<TestResponse> {
        return new Promise((resolve, reject) => {
            const options: http.RequestOptions = {
                hostname: 'localhost',
                port: port,
                path: path,
                method: method,
                headers: {
                    ...headers
                }
            };

            if (body && typeof body === 'object') {
                const jsonBody = JSON.stringify(body);
                (options.headers as any)['Content-Length'] = Buffer.byteLength(jsonBody);
                if (!(options.headers as any)['Content-Type']) {
                    (options.headers as any)['Content-Type'] = 'application/json';
                }
            }

            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    let parsedBody;
                    try {
                        parsedBody = data ? JSON.parse(data) : {};
                    } catch (e) {
                        parsedBody = { rawBody: data };
                    }

                    resolve({
                        statusCode: res.statusCode || 0,
                        body: parsedBody,
                        headers: res.headers as { [key: string]: string | string[] }
                    });
                });
            });

            req.on('error', (err) => {
                reject(err);
            });

            if (body) {
                if (typeof body === 'string') {
                    req.write(body);
                } else {
                    req.write(JSON.stringify(body));
                }
            }

            req.end();
        });
    }
});
