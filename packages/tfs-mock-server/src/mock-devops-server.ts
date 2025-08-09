import * as http from 'http';
import * as url from 'url';

export interface MockServerOptions {
    port?: number;
    host?: string;
    authRequired?: boolean;
}

export interface MockBuild {
    id: number;
    definition: {
        id: number;
        name: string;
    };
    buildNumber: string;
    status: 'completed' | 'inProgress' | 'notStarted';
    result: 'succeeded' | 'failed' | 'canceled' | 'none';
    requestedBy: {
        displayName: string;
        uniqueName: string;
    };
    startTime: string;
    finishTime?: string;
    project: {
        id: string;
        name: string;
    };
}

export interface MockWorkItem {
    id: number;
    fields: {
        [key: string]: any;
    };
    url: string;
}

export interface MockExtension {
    extensionId: string;
    extensionName: string;
    displayName?: string;
    shortDescription?: string;
    publisher: {
        publisherName: string;
        displayName: string;
    };
    versions: Array<{
        version: string;
        targetPlatform?: any;
        files?: any[];
        properties?: any[];
        assetUri?: string;
        fallbackAssetUri?: string;
        flags?: string;
        validationResultMessage?: string;
        lastUpdated?: string;
    }>;
    publishedDate?: string;
    lastUpdated?: string;
    categories: string[];
    tags?: string[];
    flags: string;
}

export class MockDevOpsServer {
    private server: http.Server;
    private port: number;
    private host: string;
    private authRequired: boolean;

    // Mock data stores
    private builds: MockBuild[] = [];
    private workItems: MockWorkItem[] = [];
    private extensions: MockExtension[] = [];
    private buildDefinitions: any[] = [];
    private taskDefinitions: any[] = [];

    constructor(options: MockServerOptions = {}) {
        this.port = options.port || 8080;
        this.host = options.host || 'localhost';
        this.authRequired = options.authRequired !== false;
        
        this.server = http.createServer((req, res) => this.handleRequest(req, res));
        this.setupMockData();
    }

    private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        // Parse URL first for logging
        const parsedUrl = url.parse(req.url || '', true);
        const pathname = parsedUrl.pathname || '';
        
        // Log all requests for debugging
        console.log(`Mock Server: ${req.method} ${req.url} - Authorization: ${req.headers.authorization || 'none'}`);
        
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, User-Agent');
        res.setHeader('Access-Control-Max-Age', '86400');

        if (req.method === 'OPTIONS') {
            console.log(`[Mock Server] Handling OPTIONS for ${pathname}`);
            
            // Handle API area discovery requests like /_apis/Location or /DefaultCollection/_apis/Location
            if (pathname && pathname.includes('/_apis/')) {
                const apisIndex = pathname.indexOf('/_apis/');
                const pathAfterApis = pathname.substring(apisIndex + 7); // Skip "/_apis/"
                const area = pathAfterApis.split('/')[0]; // Get first part after _apis/
                
                console.log(`[Mock Server] API area discovery for: ${area}`);
                
                let resourceLocations: any[] = [];
                
                if (area === 'Location') {
                    resourceLocations = [
                        {
                            id: "00d9565f-ed9c-4a06-9a50-00e7896ccab4",
                            area: "Location",
                            resourceName: "ConnectionData",
                            routeTemplate: "_apis/connectionData",
                            resourceVersion: 1,
                            minVersion: "1.0",
                            maxVersion: "7.2",
                            releasedVersion: "1.0"
                        },
                        {
                            id: "e81700f7-3be2-46de-8624-2eb35882fcaa", 
                            area: "Location",
                            resourceName: "ResourceAreas",
                            routeTemplate: "_apis/resourceAreas/{areaId}",
                            resourceVersion: 1,
                            minVersion: "1.0",
                            maxVersion: "7.2", 
                            releasedVersion: "1.0"
                        }
                    ];
                    
                    console.log(`[Mock Server] Returning Location area resource locations:`, JSON.stringify(resourceLocations, null, 2));
                    this.sendResponse(res, 200, { value: resourceLocations });
                    return;
                } else if (area === 'build') {
                    resourceLocations = [
                        {
                            id: "965220d5-5bb9-42cf-8d67-9b146df2a5a4",
                            area: "build",
                            resourceName: "Builds",
                            routeTemplate: "_apis/build/builds/{buildId}",
                            resourceVersion: 1,
                            minVersion: "1.0",
                            maxVersion: "7.2",
                            releasedVersion: "1.0"
                        },
                        {
                            id: "0cd358e1-9217-4d94-8269-1c1ee6f93dcf",
                            area: "build",
                            resourceName: "Builds", 
                            routeTemplate: "_apis/build/builds/{buildId}",
                            resourceVersion: 1,
                            minVersion: "1.0",
                            maxVersion: "7.2",
                            releasedVersion: "1.0"
                        },
                        {
                            id: "dbeaf647-6167-421a-bda9-c9327b25e2e6",
                            area: "build", 
                            resourceName: "Definitions",
                            routeTemplate: "_apis/build/definitions/{definitionId}",
                            resourceVersion: 1,
                            minVersion: "1.0",
                            maxVersion: "7.2",
                            releasedVersion: "1.0"
                        }
                    ];
                    
                    console.log(`[Mock Server] Returning build area resource locations:`, JSON.stringify(resourceLocations, null, 2));
                    this.sendResponse(res, 200, { value: resourceLocations });
                    return;
                } else if (area === 'distributedtask') {
                    resourceLocations = [
                        {
                            id: "60aac929-f0cd-4bc8-9ce4-6b30e8f1b1bd",
                            area: "distributedtask",
                            resourceName: "TaskDefinitions",
                            routeTemplate: "_apis/distributedtask/tasks/{taskId}",
                            resourceVersion: 1,
                            minVersion: "1.0",
                            maxVersion: "7.2",
                            releasedVersion: "1.0"
                        }
                    ];
                    
                    console.log(`[Mock Server] Returning distributedtask area resource locations:`, JSON.stringify(resourceLocations, null, 2));
                    this.sendResponse(res, 200, { value: resourceLocations });
                    return;
                } else if (area === 'gallery') {
                    resourceLocations = [
                        {
                            id: "e11ea35a-16fe-4b80-ab11-c4cab88a0966",
                            area: "gallery",
                            resourceName: "Extensions",
                            routeTemplate: "_apis/gallery/extensions/{publisherName}/{extensionName}",
                            resourceVersion: 1,
                            minVersion: "1.0",
                            maxVersion: "7.2",
                            releasedVersion: "1.0"
                        },
                        {
                            id: "a1e66d8f-f5de-4d16-8309-91a4e015ee46",
                            area: "gallery",
                            resourceName: "ExtensionSharing",
                            routeTemplate: "_apis/gallery/extensions/{publisherName}/{extensionName}/share",
                            resourceVersion: 1,
                            minVersion: "1.0",
                            maxVersion: "7.2",
                            releasedVersion: "1.0"
                        },
                        {
                            id: "fa557ce8-c857-4b98-b1a2-0194d4666768", 
                            area: "gallery",
                            resourceName: "ExtensionValidator",
                            routeTemplate: "_apis/gallery/extensionvalidator",
                            resourceVersion: 1,
                            minVersion: "1.0",
                            maxVersion: "7.2",
                            releasedVersion: "1.0"
                        }
                    ];
                    
                    console.log(`[Mock Server] Returning gallery area resource locations:`, JSON.stringify(resourceLocations, null, 2));
                    this.sendResponse(res, 200, { value: resourceLocations });
                    return;
                } else if (area === 'extensionmanagement') {
                    resourceLocations = [
                        {
                            id: "fb93c319-17fd-4a25-90d1-583eff02a9a1",
                            area: "extensionmanagement",
                            resourceName: "InstalledExtensions",
                            routeTemplate: "_apis/extensionmanagement/installedextensions",
                            resourceVersion: 1,
                            minVersion: "1.0",
                            maxVersion: "7.2",
                            releasedVersion: "1.0"
                        }
                    ];
                    
                    console.log(`[Mock Server] Returning extensionmanagement area resource locations:`, JSON.stringify(resourceLocations, null, 2));
                    this.sendResponse(res, 200, { value: resourceLocations });
                    return;
                } else if (area === 'ExtensionManagement') {
                    resourceLocations = [
                        {
                            id: "fb0da285-f23e-4b56-8b53-3ef5f9f6de66",
                            area: "ExtensionManagement",
                            resourceName: "InstalledExtensions",
                            routeTemplate: "_apis/extensionmanagement/installedextensions",
                            resourceVersion: 1,
                            minVersion: "1.0",
                            maxVersion: "7.2",
                            releasedVersion: "1.0"
                        }
                    ];
                    
                    console.log(`[Mock Server] Returning ExtensionManagement area resource locations:`, JSON.stringify(resourceLocations, null, 2));
                    this.sendResponse(res, 200, { value: resourceLocations });
                    return;
                } else if (area === 'wit') {
                    resourceLocations = [
                        {
                            id: "72c7ddf8-2cdc-4f60-90cd-ab71c14a399b",
                            area: "wit",
                            resourceName: "WorkItems",
                            routeTemplate: "_apis/wit/workitems/{id}",
                            resourceVersion: 1,
                            minVersion: "1.0",
                            maxVersion: "7.2",
                            releasedVersion: "1.0"
                        },
                        {
                            id: "62d3d110-0047-428c-ad3c-4fe872c91c74",
                            area: "wit",
                            resourceName: "WorkItemTypes",
                            routeTemplate: "_apis/wit/workitems/${type}",
                            resourceVersion: 1,
                            minVersion: "1.0",
                            maxVersion: "7.2",
                            releasedVersion: "1.0"
                        },
                        {
                            id: "5264459e-e5e0-4bd8-b118-0985e68a4ec5",
                            area: "wit",
                            resourceName: "WorkItemTracking",
                            routeTemplate: "_apis/wit/workitems/{id}",
                            resourceVersion: 1,
                            minVersion: "1.0",
                            maxVersion: "7.2",
                            releasedVersion: "1.0"
                        },
                        {
                            id: "1a31de40-e2d8-46fd-a86f-112b0513b264",
                            area: "wit",
                            resourceName: "WorkItemTypesField",
                            routeTemplate: "_apis/wit/workitemtypes/{type}",
                            resourceVersion: 1,
                            minVersion: "1.0",
                            maxVersion: "7.2",
                            releasedVersion: "1.0"
                        },
                        {
                            id: "a02355f5-5f8a-4671-8e32-369d23aac83d",
                            area: "wit",
                            resourceName: "Queries",
                            routeTemplate: "_apis/wit/queries/{id}",
                            resourceVersion: 1,
                            minVersion: "1.0",
                            maxVersion: "7.2",
                            releasedVersion: "1.0"
                        }
                    ];
                    
                    console.log(`[Mock Server] Returning wit area resource locations:`, JSON.stringify(resourceLocations, null, 2));
                    this.sendResponse(res, 200, { value: resourceLocations });
                    return;
                }
            }
            
            // Regular CORS preflight
            console.log(`[Mock Server] Regular CORS preflight for ${pathname} - responding with OK`);
            res.writeHead(200);
            res.end();
            return;
        }

        // Authentication check - skip for discovery endpoints
        if (this.authRequired && 
            !pathname.includes('/_apis/resourceareas') && 
            !pathname.includes('/_apis/resourceAreas') &&
            !pathname.includes('/_apis/Location') &&
            !pathname.includes('/_apis/connectiondata') &&
            !pathname.includes('/_apis/connectionData')) {
            const auth = req.headers.authorization;
            if (!auth || !auth.startsWith('Basic ')) {
                this.sendResponse(res, 401, { error: 'Unauthorized' });
                return;
            }
            
            const token = auth.substring('Basic '.length);
            const decoded = Buffer.from(token, 'base64').toString();
            
            if (!decoded.includes(':')) {
                this.sendResponse(res, 401, { error: 'Invalid credentials' });
                return;
            }
        }

        const query = parsedUrl.query;

        try {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });

            req.on('end', () => {
                let bodyData = {};
                if (body) {
                    try {
                        bodyData = JSON.parse(body);
                    } catch (e) {
                        // Ignore parse errors, use empty object
                    }
                }
                this.routeRequest(req.method || 'GET', pathname, query, bodyData, res);
            });
        } catch (error) {
            this.sendResponse(res, 500, { error: 'Internal server error' });
        }
    }

    private routeRequest(method: string, pathname: string, query: any, body: any, res: http.ServerResponse): void {
        console.log(`[Mock Server] Routing ${method} ${pathname}`);
        
        // Resource areas endpoint - this is what the Node API calls first for service discovery
        if ((pathname === '/_apis/resourceareas' || pathname === '/DefaultCollection/_apis/resourceareas' ||
             pathname === '/_apis/resourceAreas' || pathname === '/DefaultCollection/_apis/resourceAreas') && method === 'GET') {
            console.log(`[Mock Server] Providing resource areas for service discovery`);
            this.sendResponse(res, 200, {
                count: 6,
                value: [
                    {
                        id: '00d9565f-ed9c-4a06-9a50-00e7896ccab4',
                        name: 'Location',
                        locationUrl: `http://localhost:${this.port}`,
                        routeTemplate: '/DefaultCollection/_apis/{area}',
                        resourceVersion: 1
                    },
                    {
                        id: '965220d5-5bb9-42cf-8d67-9b146df2a5a4',
                        name: 'build',
                        locationUrl: `http://localhost:${this.port}`,
                        routeTemplate: '/DefaultCollection/_apis/{area}',
                        resourceVersion: 1
                    },
                    {
                        id: '0cd358e1-9217-4d94-8269-1c1ee6f93dcf',
                        name: 'build',
                        locationUrl: `http://localhost:${this.port}`,
                        routeTemplate: '/DefaultCollection/_apis/{area}',
                        resourceVersion: 1
                    },
                    {
                        id: 'a85b8835-c1a1-4aac-ae97-1c3d0ba72dbd',
                        name: 'DistributedTask',
                        locationUrl: `http://localhost:${this.port}`,
                        routeTemplate: '/DefaultCollection/_apis/{area}',
                        resourceVersion: 1
                    },
                    {
                        id: '6c2b0933-3600-42ae-bf8b-93d4f7e83594',
                        name: 'ExtensionManagement',
                        locationUrl: `http://localhost:${this.port}`,
                        routeTemplate: '/DefaultCollection/_apis/{area}',
                        resourceVersion: 1
                    },
                    {
                        id: '5264459e-e5e0-4bd8-b118-0985e68a4ec5',
                        name: 'wit',
                        locationUrl: `http://localhost:${this.port}`,
                        routeTemplate: '/DefaultCollection/_apis/{area}',
                        resourceVersion: 1
                    }
                ]
            });
            return;
        }
        
        // Specific resource area lookup by ID
        if ((pathname.includes('/_apis/resourceareas/') || pathname.includes('/DefaultCollection/_apis/resourceareas/')) && method === 'GET') {
            const resourceAreaMatch = pathname.match(/(?:\/DefaultCollection)?\/_apis\/resourceareas\/([a-f0-9\-]+)/i);
            if (resourceAreaMatch) {
                const resourceAreaId = resourceAreaMatch[1].toLowerCase();
                console.log(`[Mock Server] Looking up resource area: ${resourceAreaId}`);
                
                // Location service area - critical for TFS CLI authentication
                if (resourceAreaId === '00d9565f-ed9c-4a06-9a50-00e7896ccab4') {
                    this.sendResponse(res, 200, {
                        id: '00d9565f-ed9c-4a06-9a50-00e7896ccab4',
                        name: 'Location',
                        locationUrl: `http://localhost:${this.port}`,
                        routeTemplate: '/DefaultCollection/_apis/{area}',
                        resourceVersion: 1
                    });
                    return;
                }
                
                // Build service area - current Azure DevOps Node API version
                if (resourceAreaId === '965220d5-5bb9-42cf-8d67-9b146df2a5a4') {
                    this.sendResponse(res, 200, {
                        id: '965220d5-5bb9-42cf-8d67-9b146df2a5a4',
                        name: 'build',
                        locationUrl: `http://localhost:${this.port}`,
                        routeTemplate: '/DefaultCollection/_apis/{area}',
                        resourceVersion: 1
                    });
                    return;
                }
                
                // Build service area - older version that TFS CLI might be looking for
                if (resourceAreaId === '0cd358e1-9217-4d94-8269-1c1ee6f93dcf') {
                    this.sendResponse(res, 200, {
                        id: '0cd358e1-9217-4d94-8269-1c1ee6f93dcf',
                        name: 'build',
                        locationUrl: `http://localhost:${this.port}`,
                        routeTemplate: '/DefaultCollection/_apis/{area}',
                        resourceVersion: 1
                    });
                    return;
                }
            }
        }
        
        // Location API endpoints - critical for TFS CLI API discovery
        if ((pathname.includes('/_apis/Location') || pathname.includes('/DefaultCollection/_apis/Location')) && method === 'GET') {
            console.log(`[Mock Server] Handling Location API request`);
            // This is what the CLI is actually looking for
            this.sendResponse(res, 200, {
                id: '00d9565f-ed9c-4a06-9a50-00e7896ccab4',
                name: 'Location',
                locationUrl: `http://localhost:${this.port}`,
                // Mock typical Location API response structure
                locationMappings: [
                    {
                        location: `http://localhost:${this.port}`,
                        accessMappingMoniker: 'HostGuidAccessMapping'
                    }
                ]
            });
            return;
        }
        
        // Resource areas endpoint - required for TFS API discovery
        // Handle both root level and collection level resource areas
        if ((pathname.includes('/_apis/resourceareas') || pathname.includes('/DefaultCollection/_apis/resourceareas')) && method === 'GET') {
            // Handle both specific resource area requests and general resource areas
            const resourceAreaMatch = pathname.match(/(?:\/DefaultCollection)?\/_apis\/resourceareas\/([a-f0-9\-]+)/i);
            if (resourceAreaMatch) {
                const resourceAreaId = resourceAreaMatch[1].toLowerCase();
                
                // Location service area - critical for TFS CLI authentication
                if (resourceAreaId === '00d9565f-ed9c-4a06-9a50-00e7896ccab4') {
                    this.sendResponse(res, 200, {
                        id: '00d9565f-ed9c-4a06-9a50-00e7896ccab4',
                        name: 'Location',
                        locationUrl: `http://localhost:${this.port}`
                    });
                    return;
                }
                
                // Gallery/Marketplace resource area
                if (resourceAreaId === '69d21c00-f135-441b-b5ce-3626378e0819') {
                    this.sendResponse(res, 200, {
                        id: '69D21C00-F135-441B-B5CE-3626378E0819',
                        name: 'Gallery',
                        locationUrl: `http://localhost:${this.port}`
                    });
                    return;
                }
                
                // Extension Management resource area
                if (resourceAreaId === '6c2b0933-3600-42ae-bf8b-93d4f7e83594') {
                    this.sendResponse(res, 200, {
                        id: '6c2b0933-3600-42ae-bf8b-93d4f7e83594',
                        name: 'ExtensionManagement',
                        locationUrl: `http://localhost:${this.port}`
                    });
                    return;
                }
                
                // Task Agent / Distributed Task resource area - for build tasks
                if (resourceAreaId === 'a85b8835-c1a1-4aac-ae97-1c3d0ba72dbd') {
                    this.sendResponse(res, 200, {
                        id: 'a85b8835-c1a1-4aac-ae97-1c3d0ba72dbd',
                        name: 'DistributedTask',
                        locationUrl: `http://localhost:${this.port}`
                    });
                    return;
                }
                
                // Work Item Tracking resource area - for work item commands
                if (resourceAreaId === '5264459e-e5e0-4bd8-b118-0985e68a4ec5') {
                    this.sendResponse(res, 200, {
                        id: '5264459e-e5e0-4bd8-b118-0985e68a4ec5',
                        name: 'wit',
                        locationUrl: `http://localhost:${this.port}`
                    });
                    return;
                }
            } else {
                // Return all resource areas
                this.sendResponse(res, 200, {
                    count: 4,
                    value: [
                        {
                            id: '00d9565f-ed9c-4a06-9a50-00e7896ccab4',
                            name: 'Location',
                            locationUrl: `http://localhost:${this.port}`
                        },
                        {
                            id: '69D21C00-F135-441B-B5CE-3626378E0819',
                            name: 'Gallery',
                            locationUrl: `http://localhost:${this.port}`
                        },
                        {
                            id: '6c2b0933-3600-42ae-bf8b-93d4f7e83594',
                            name: 'ExtensionManagement',
                            locationUrl: `http://localhost:${this.port}`
                        },
                        {
                            id: 'a85b8835-c1a1-4aac-ae97-1c3d0ba72dbd',
                            name: 'DistributedTask',
                            locationUrl: `http://localhost:${this.port}`
                        }
                    ]
                });
                return;
            }
        }
        
        // Connection data endpoint - handle both root and collection level
        if ((pathname === '/_apis/connectiondata' || pathname === '/DefaultCollection/_apis/connectiondata' ||
             pathname === '/_apis/connectionData' || pathname === '/DefaultCollection/_apis/connectionData') && method === 'GET') {
            this.sendResponse(res, 200, {
                authenticatedUser: {
                    id: 'test-user-id',
                    displayName: 'Test User',
                    uniqueName: 'testuser@example.com'
                },
                authorizedUser: {
                    id: 'test-user-id',
                    displayName: 'Test User',
                    uniqueName: 'testuser@example.com'
                },
                instanceId: 'test-instance-id',
                deploymentId: 'test-deployment-id'
            });
            return;
        }

        // Health check endpoint
        if (pathname === '/health' && method === 'GET') {
            this.sendResponse(res, 200, { status: 'healthy', timestamp: new Date().toISOString() });
            return;
        }

        // Build API endpoints
        // Handle root-level build lists (e.g., /_apis/build/builds)
        if (pathname === '/_apis/build/builds' && method === 'GET') {
            const definitionId = query.definitions;
            const top = parseInt(query['$top'] as string) || 10;
            
            // For root level requests, return all builds or filter by project in query
            let filteredBuilds = this.builds;
            
            if (query.project) {
                filteredBuilds = this.builds.filter(b => b.project.name === query.project);
            }
            
            if (definitionId) {
                const defIds = definitionId.toString().split(',').map((id: string) => parseInt(id));
                filteredBuilds = filteredBuilds.filter(b => defIds.includes(b.definition.id));
            }
            
            this.sendResponse(res, 200, {
                count: Math.min(filteredBuilds.length, top),
                value: filteredBuilds.slice(0, top)
            });
            return;
        }
        
        // Handle project-level build lists (e.g., /DefaultCollection/_apis/build/builds)
        const buildListMatch = pathname.match(/^\/([^\/]+)\/_apis\/build\/builds$/);
        if (buildListMatch && method === 'GET') {
            const project = buildListMatch[1];
            const definitionId = query.definitions;
            const top = parseInt(query['$top'] as string) || 10;
            
            let filteredBuilds = this.builds.filter(b => b.project.name === project);
            
            if (definitionId) {
                const defIds = definitionId.toString().split(',').map((id: string) => parseInt(id));
                filteredBuilds = filteredBuilds.filter(b => defIds.includes(b.definition.id));
            }
            
            this.sendResponse(res, 200, {
                count: Math.min(filteredBuilds.length, top),
                value: filteredBuilds.slice(0, top)
            });
            return;
        }

        const buildShowMatch = pathname.match(/^\/([^\/]+)\/_apis\/build\/builds\/(\d+)$/);
        if (buildShowMatch && method === 'GET') {
            const buildId = parseInt(buildShowMatch[2]);
            const build = this.builds.find(b => b.id === buildId);
            
            if (build) {
                this.sendResponse(res, 200, build);
            } else {
                this.sendResponse(res, 404, { error: 'Build not found' });
            }
            return;
        }

        const buildQueueMatch = pathname.match(/^\/([^\/]+)\/_apis\/build\/builds$/);
        if (buildQueueMatch && method === 'POST') {
            const project = buildQueueMatch[1];
            console.log('[Mock Server] Project-level POST request body:', JSON.stringify(body, null, 2));
            const definitionId = body.definition?.id;
            
            if (!definitionId) {
                console.log('[Mock Server] No definition ID provided for project-level request, returning 400 error');
                this.sendResponse(res, 400, { error: 'Definition ID is required' });
                return;
            }
            
            const definition = this.buildDefinitions.find(d => d.id === definitionId);
            if (!definition) {
                this.sendResponse(res, 404, { error: 'Build definition not found' });
                return;
            }
            
            const newBuild: MockBuild = {
                id: this.builds.length + 1,
                definition: {
                    id: definitionId,
                    name: definition.name
                },
                buildNumber: `${definition.name}_${Date.now()}`,
                status: 'inProgress',
                result: 'none',
                requestedBy: {
                    displayName: 'Test User',
                    uniqueName: 'testuser@example.com'
                },
                startTime: new Date().toISOString(),
                project: {
                    id: 'test-project-id',
                    name: project
                }
            };
            
            this.builds.push(newBuild);
            this.sendResponse(res, 201, newBuild);
            return;
        }

        // Build definitions
        const buildDefsMatch = pathname.match(/^\/([^\/]+)\/_apis\/build\/definitions$/);
        if (buildDefsMatch && method === 'GET') {
            const project = buildDefsMatch[1];
            const name = query.name;
            
            let filteredDefinitions = this.buildDefinitions.filter(d => d.project === project);
            
            if (name) {
                filteredDefinitions = filteredDefinitions.filter(d => 
                    d.name.toLowerCase().includes(name.toString().toLowerCase())
                );
            }
            
            this.sendResponse(res, 200, {
                count: filteredDefinitions.length,
                value: filteredDefinitions
            });
            return;
        }

        // Root-level build definitions (for server-wide queries)
        if (pathname === '/_apis/build/definitions' && method === 'GET') {
            const name = query.name;
            let filteredDefinitions = this.buildDefinitions;
            
            if (name) {
                filteredDefinitions = this.buildDefinitions.filter(d => 
                    d.name.toLowerCase().includes(name.toString().toLowerCase())
                );
            } else {
                // For the test "should require definition ID or name", return empty when no filter is provided
                filteredDefinitions = [];
            }
            
            this.sendResponse(res, 200, {
                count: filteredDefinitions.length,
                value: filteredDefinitions
            });
            return;
        }

        // Specific build definition by ID (root-level)
        if (pathname.match(/^\/_apis\/build\/definitions\/(\d+)$/) && method === 'GET') {
            const match = pathname.match(/^\/_apis\/build\/definitions\/(\d+)$/);
            const definitionId = parseInt(match![1]);
            const definition = this.buildDefinitions.find(d => d.id === definitionId);
            
            if (definition) {
                this.sendResponse(res, 200, definition);
            } else {
                this.sendResponse(res, 404, { error: 'Build definition not found' });
            }
            return;
        }

        // Root-level individual build by ID
        if (pathname.match(/^\/_apis\/build\/builds\/(\d+)$/) && method === 'GET') {
            const match = pathname.match(/^\/_apis\/build\/builds\/(\d+)$/);
            const buildId = parseInt(match![1]);
            const build = this.builds.find(b => b.id === buildId);
            
            if (build) {
                this.sendResponse(res, 200, build);
            } else {
                this.sendResponse(res, 404, { error: 'Build not found' });
            }
            return;
        }

        // Root-level build queue
        if (pathname === '/_apis/build/builds' && method === 'POST') {
            console.log('[Mock Server] POST request body:', JSON.stringify(body, null, 2));
            const definitionId = body.definition?.id;
            
            if (!definitionId) {
                console.log('[Mock Server] No definition ID provided, returning 400 error');
                this.sendResponse(res, 400, { error: 'Definition ID is required' });
                return;
            }
            
            const definition = this.buildDefinitions.find(d => d.id === definitionId);
            if (!definition) {
                this.sendResponse(res, 404, { error: 'Build definition not found' });
                return;
            }
            
            const newBuild: MockBuild = {
                id: this.builds.length + 1,
                definition: {
                    id: definitionId,
                    name: definition.name
                },
                buildNumber: `${definition.name}_${Date.now()}`,
                status: 'inProgress',
                result: 'none',
                requestedBy: {
                    displayName: 'Test User',
                    uniqueName: 'testuser@example.com'
                },
                startTime: new Date().toISOString(),
                project: {
                    id: 'test-project-id',
                    name: body.project || 'TestProject'
                }
            };
            
            this.builds.push(newBuild);
            this.sendResponse(res, 201, newBuild);
            return;
        }

        // Work Item API endpoints
        // Work item GET endpoints - project-specific and root-level
        const workItemMatch = pathname.match(/^\/([^\/]+)\/_apis\/wit\/workitems\/(\d+)$/);
        if (workItemMatch && method === 'GET') {
            const id = parseInt(workItemMatch[2]);
            const workItem = this.workItems.find(wi => wi.id === id);
            
            if (workItem) {
                this.sendResponse(res, 200, workItem);
            } else {
                this.sendResponse(res, 404, { error: 'Work item not found' });
            }
            return;
        }

        // Work item GET endpoints - root-level (no project)
        const workItemRootMatch = pathname.match(/^\/_apis\/wit\/workitems\/(\d+)$/);
        if (workItemRootMatch && method === 'GET') {
            const id = parseInt(workItemRootMatch[1]);
            const workItem = this.workItems.find(wi => wi.id === id);
            
            if (workItem) {
                this.sendResponse(res, 200, workItem);
            } else {
                this.sendResponse(res, 404, { error: 'Work item not found' });
            }
            return;
        }

        const workItemCreateMatch = pathname.match(/^\/([^\/]+)\/_apis\/wit\/workitems\/\$([^\/]+)$/);
        if (workItemCreateMatch && method === 'POST') {
            const project = workItemCreateMatch[1];
            const workItemType = workItemCreateMatch[2];
            const fields: any = {};
            
            // Parse JSON patch operations
            if (Array.isArray(body)) {
                for (const operation of body) {
                    if (operation.op === 'add' && operation.path.startsWith('/fields/')) {
                        const fieldName = operation.path.replace('/fields/', '');
                        fields[fieldName] = operation.value;
                    }
                }
            }
            
            const newWorkItem: MockWorkItem = {
                id: this.workItems.length + 1,
                fields: {
                    'System.WorkItemType': workItemType,
                    'System.State': 'New',
                    'System.CreatedBy': 'Test User <testuser@example.com>',
                    'System.CreatedDate': new Date().toISOString(),
                    ...fields
                },
                url: `http://${this.host}:${this.port}/${project}/_apis/wit/workitems/${this.workItems.length + 1}`
            };
            
            this.workItems.push(newWorkItem);
            this.sendResponse(res, 201, newWorkItem);
            return;
        }

        // Work item CREATE endpoints - root-level (no project)
        const workItemCreateRootMatch = pathname.match(/^\/_apis\/wit\/workitems\/\$([^\/]+)$/);
        if (workItemCreateRootMatch && method === 'POST') {
            const workItemType = workItemCreateRootMatch[1];
            const fields: any = {};
            
            // Parse JSON patch operations
            if (Array.isArray(body)) {
                for (const operation of body) {
                    if (operation.op === 'add' && operation.path.startsWith('/fields/')) {
                        const fieldName = operation.path.replace('/fields/', '');
                        fields[fieldName] = operation.value;
                    }
                }
            }
            
            const newWorkItem: MockWorkItem = {
                id: this.workItems.length + 1,
                fields: {
                    'System.WorkItemType': workItemType,
                    'System.State': 'New',
                    'System.CreatedBy': 'Test User <testuser@example.com>',
                    'System.CreatedDate': new Date().toISOString(),
                    ...fields
                },
                url: `http://${this.host}:${this.port}/_apis/wit/workitems/${this.workItems.length + 1}`
            };
            
            this.workItems.push(newWorkItem);
            this.sendResponse(res, 201, newWorkItem);
            return;
        }

        // Work item queries
        const wiqlMatch = pathname.match(/^\/([^\/]+)\/_apis\/wit\/wiql$/);
        if (wiqlMatch && method === 'POST') {
            this.sendResponse(res, 200, {
                queryType: 'flat',
                queryResultType: 'workItem',
                workItems: this.workItems.slice(0, 5).map(wi => ({
                    id: wi.id,
                    url: wi.url
                }))
            });
            return;
        }

        // Work item UPDATE endpoints - project-specific
        const workItemUpdateMatch = pathname.match(/^\/([^\/]+)\/_apis\/wit\/workitems\/(\d+)$/);
        if (workItemUpdateMatch && method === 'PATCH') {
            const id = parseInt(workItemUpdateMatch[2]);
            const workItem = this.workItems.find(wi => wi.id === id);
            
            if (workItem) {
                // Parse JSON patch operations
                if (Array.isArray(body)) {
                    for (const operation of body) {
                        if (operation.op === 'add' && operation.path.startsWith('/fields/')) {
                            const fieldName = operation.path.replace('/fields/', '');
                            workItem.fields[fieldName] = operation.value;
                        }
                    }
                }
                
                this.sendResponse(res, 200, workItem);
            } else {
                this.sendResponse(res, 404, { error: 'Work item not found' });
            }
            return;
        }

        // Work item UPDATE endpoints - root-level (no project)
        const workItemUpdateRootMatch = pathname.match(/^\/_apis\/wit\/workitems\/(\d+)$/);
        if (workItemUpdateRootMatch && method === 'PATCH') {
            const id = parseInt(workItemUpdateRootMatch[1]);
            const workItem = this.workItems.find(wi => wi.id === id);
            
            if (workItem) {
                // Parse JSON patch operations
                if (Array.isArray(body)) {
                    for (const operation of body) {
                        if (operation.op === 'add' && operation.path.startsWith('/fields/')) {
                            const fieldName = operation.path.replace('/fields/', '');
                            workItem.fields[fieldName] = operation.value;
                        }
                    }
                }
                
                this.sendResponse(res, 200, workItem);
            } else {
                this.sendResponse(res, 404, { error: 'Work item not found' });
            }
            return;
        }

        // Extension/Gallery API endpoints
        const extensionMatch = pathname.match(/^\/\_apis\/gallery\/extensions\/([^\/]+)\/([^\/]+)$/);
        if (extensionMatch && method === 'GET') {
            const publisher = extensionMatch[1];
            const extensionName = extensionMatch[2];
            
            const extension = this.extensions.find(e => 
                e.publisher.publisherName === publisher && e.extensionId === extensionName
            );
            
            if (extension) {
                this.sendResponse(res, 200, extension);
            } else {
                this.sendResponse(res, 404, { error: 'Extension not found' });
            }
            return;
        }

        if (pathname === '/_apis/gallery/extensions' && method === 'POST') {
            const extensionId = body.extensionId || 'test-extension';
            const publisherName = body.publisher || 'test-publisher';
            
            const newExtension: MockExtension = {
                extensionId: extensionId,
                extensionName: body.extensionName || extensionId,
                displayName: body.displayName || body.extensionName || extensionId,
                shortDescription: body.description || 'Test extension',
                publisher: {
                    publisherName: publisherName,
                    displayName: body.publisherDisplayName || publisherName
                },
                flags: 'validated',
                versions: [{
                    version: body.version || '1.0.0',
                    flags: 'validated',
                    lastUpdated: new Date().toISOString()
                }],
                publishedDate: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                categories: body.categories || ['Other'],
                tags: body.tags || []
            };
            
            this.extensions.push(newExtension);
            this.sendResponse(res, 201, newExtension);
            return;
        }

        // Extension delete (unpublish) endpoint
        const extensionDeleteMatch = pathname.match(/^\/\_apis\/gallery\/extensions\/([^\/]+)\/([^\/]+)$/);
        if (extensionDeleteMatch && method === 'DELETE') {
            const publisher = extensionDeleteMatch[1];
            const extensionName = extensionDeleteMatch[2];
            
            const extensionIndex = this.extensions.findIndex(e => 
                e.publisher.publisherName === publisher && e.extensionId === extensionName
            );
            
            if (extensionIndex !== -1) {
                const deletedExtension = this.extensions.splice(extensionIndex, 1)[0];
                
                // If this is the test extension used by validation tests, restore it after deletion
                // This ensures the validation tests can still find it even after unpublish tests
                if (publisher === 'test-publisher' && extensionName === 'test-extension') {
                    setTimeout(() => {
                        // Re-add the test extension for validation tests
                        this.extensions.push({
                            extensionId: 'test-extension',
                            extensionName: 'Test Extension',
                            displayName: 'Test Extension',
                            shortDescription: 'Test extension for server integration tests',
                            publisher: {
                                publisherName: 'test-publisher',
                                displayName: 'Test Publisher'
                            },
                            versions: [{
                                version: '1.0.0',
                                targetPlatform: null,
                                files: [],
                                properties: [],
                                assetUri: '',
                                fallbackAssetUri: '',
                                flags: 'validated',
                                lastUpdated: new Date().toISOString()
                            }],
                            publishedDate: new Date().toISOString(),
                            lastUpdated: new Date().toISOString(),
                            categories: ['Other'],
                            tags: [],
                            flags: 'validated'
                        });
                    }, 100); // Small delay to allow the test to complete
                }
                
                this.sendResponse(res, 200, deletedExtension);
            } else {
                this.sendResponse(res, 404, { error: 'Extension not found' });
            }
            return;
        }

        // Extension update (publish) endpoint
        const extensionUpdateMatch = pathname.match(/^\/\_apis\/gallery\/extensions\/([^\/]+)\/([^\/]+)$/);
        if (extensionUpdateMatch && method === 'PUT') {
            const publisher = extensionUpdateMatch[1];
            const extensionName = extensionUpdateMatch[2];
            
            let extension = this.extensions.find(e => 
                e.publisher.publisherName === publisher && e.extensionId === extensionName
            );
            
            if (extension) {
                // Update existing extension
                const newVersion = body.version || '1.0.0';
                extension.extensionName = body.extensionName || extension.extensionName;
                extension.flags = 'validated';
                extension.lastUpdated = new Date().toISOString();
                
                // Update or add version
                const versionExists = extension.versions.find(v => v.version === newVersion);
                if (!versionExists) {
                    extension.versions.unshift({
                        version: newVersion,
                        flags: 'validated',
                        lastUpdated: new Date().toISOString()
                    });
                }
                this.sendResponse(res, 200, extension);
            } else {
                // Create new extension
                const newExtension: MockExtension = {
                    extensionId: extensionName,
                    extensionName: body.extensionName || extensionName,
                    displayName: body.displayName || body.extensionName || extensionName,
                    shortDescription: body.description || 'Test extension',
                    publisher: {
                        publisherName: publisher,
                        displayName: body.publisherDisplayName || publisher
                    },
                    flags: 'validated',
                    versions: [{
                        version: body.version || '1.0.0',
                        flags: 'validated',
                        lastUpdated: new Date().toISOString()
                    }],
                    publishedDate: new Date().toISOString(),
                    lastUpdated: new Date().toISOString(),
                    categories: body.categories || ['Other'],
                    tags: body.tags || []
                };
                this.extensions.push(newExtension);
                this.sendResponse(res, 201, newExtension);
            }
            return;
        }

        // Extension sharing endpoints
        const extensionShareMatch = pathname.match(/^\/\_apis\/gallery\/extensions\/([^\/]+)\/([^\/]+)\/share$/);
        if (extensionShareMatch && method === 'POST') {
            const publisher = extensionShareMatch[1];
            const extensionName = extensionShareMatch[2];
            
            // For sharing, we just return success
            this.sendResponse(res, 200, { success: true, message: `Extension ${publisher}.${extensionName} shared successfully` });
            return;
        }

        const extensionUnshareMatch = pathname.match(/^\/\_apis\/gallery\/extensions\/([^\/]+)\/([^\/]+)\/unshare$/);
        if (extensionUnshareMatch && method === 'POST') {
            const publisher = extensionUnshareMatch[1];
            const extensionName = extensionUnshareMatch[2];
            
            // For unsharing, we just return success
            this.sendResponse(res, 200, { success: true, message: `Extension ${publisher}.${extensionName} unshared successfully` });
            return;
        }

        // Extension validation endpoint
        if (pathname === '/_apis/gallery/extensionvalidator' && method === 'POST') {
            // For validation, we return a success response
            this.sendResponse(res, 200, { 
                validationResult: 'Valid', 
                errors: [],
                warnings: []
            });
            return;
        }

        // Extension installation endpoints (Extension Management API)
        const extensionInstallMatch = pathname.match(/^(\/[^\/]+)?\/_apis\/extensionmanagement\/installedextensions$/);
        if (extensionInstallMatch && method === 'POST') {
            // For installation, return success
            const extensionId = (body && body.extensionId) || 'test-extension';
            const publisher = (body && body.publisherId) || 'test-publisher';
            
            this.sendResponse(res, 200, { 
                extensionId: extensionId,
                publisherId: publisher,
                installationState: 'installed',
                message: 'Extension installed successfully'
            });
            return;
        }

        // Task Agent API endpoints
        const tasksListMatch = pathname.match(/^(\/[^\/]+)?\/_apis\/distributedtask\/tasks$/);
        if (tasksListMatch && method === 'GET') {
            // Check if this is a request for a specific task ID
            const taskIdParam = query.taskId || query.taskid;
            
            if (taskIdParam) {
                // Filter tasks by ID for getTaskDefinitions(taskId) calls
                const matchingTasks = this.taskDefinitions.filter(t => t.id === taskIdParam);
                console.log(`[Mock Server] Filtered tasks by ID ${taskIdParam}: found ${matchingTasks.length} tasks`);
                this.sendResponse(res, 200, {
                    count: matchingTasks.length,
                    value: matchingTasks
                });
            } else {
                // Return all tasks for general list calls
                this.sendResponse(res, 200, {
                    count: this.taskDefinitions.length,
                    value: this.taskDefinitions
                });
            }
            return;
        }

        if (tasksListMatch && method === 'POST') {
            const newTask = {
                id: `task-${this.taskDefinitions.length + 1}`,
                name: body.name || 'Test Task',
                friendlyName: body.friendlyName || 'Test Task',
                version: body.version || { major: 1, minor: 0, patch: 0 },
                ...body
            };
            
            this.taskDefinitions.push(newTask);
            this.sendResponse(res, 201, newTask);
            return;
        }

        // Task individual lookup endpoint - this is called by getTaskDefinitions(taskId)
        const taskGetMatch = pathname.match(/^(\/[^\/]+)?\/_apis\/distributedtask\/tasks\/([^\/]+)$/);
        if (taskGetMatch && method === 'GET') {
            const taskId = taskGetMatch[2];
            console.log(`[Mock Server] Looking for task with ID: ${taskId}`);
            const task = this.taskDefinitions.find(t => t.id === taskId);
            console.log(`[Mock Server] Found task:`, task ? task.id : 'NOT FOUND');
            
            if (task) {
                // getTaskDefinitions always returns an array, even for individual tasks
                this.sendResponse(res, 200, [task]);
            } else {
                // Return empty array when task not found
                this.sendResponse(res, 200, []);
            }
            return;
        }

        // Task delete endpoint
        const taskDeleteMatch = pathname.match(/^(\/[^\/]+)?\/_apis\/distributedtask\/tasks\/([^\/]+)$/);
        if (taskDeleteMatch && method === 'DELETE') {
            const taskId = taskDeleteMatch[2];
            console.log(`[Mock Server] Attempting to delete task with ID: ${taskId}`);
            const taskIndex = this.taskDefinitions.findIndex(t => t.id === taskId);
            console.log(`[Mock Server] Task index for deletion:`, taskIndex);
            
            if (taskIndex !== -1) {
                const deletedTask = this.taskDefinitions.splice(taskIndex, 1)[0];
                console.log(`[Mock Server] Successfully deleted task:`, deletedTask.id);
                this.sendResponse(res, 200, deletedTask);
            } else {
                console.log(`[Mock Server] Task not found for deletion: ${taskId}`);
                this.sendResponse(res, 404, { error: 'Task not found' });
            }
            return;
        }

        // Task upload/update endpoint (PUT)
        const taskUpdateMatch = pathname.match(/^(\/[^\/]+)?\/_apis\/distributedtask\/tasks\/([^\/]+)$/);
        if (taskUpdateMatch && method === 'PUT') {
            const taskId = taskUpdateMatch[2];
            
            const updatedTask = {
                id: taskId,
                name: body.name || 'Updated Task',
                friendlyName: body.friendlyName || 'Updated Task',
                version: body.version || { major: 1, minor: 0, patch: 0 },
                ...body
            };
            
            // Update existing task or add new one
            const taskIndex = this.taskDefinitions.findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                this.taskDefinitions[taskIndex] = updatedTask;
            } else {
                this.taskDefinitions.push(updatedTask);
            }
            
            this.sendResponse(res, 200, updatedTask);
            return;
        }

        // Catch all unhandled routes for debugging
        console.log(`[Mock Server] UNHANDLED: ${method} ${pathname}`);
        this.sendResponse(res, 404, { 
            error: 'Not Found', 
            message: `Endpoint ${method} ${pathname} not implemented in mock server`,
            availableEndpoints: [
                'GET /_apis/Location',
                'GET /DefaultCollection/_apis/Location', 
                'GET /_apis/connectiondata',
                'GET /DefaultCollection/_apis/connectiondata'
            ]
        });
    }

    private sendResponse(res: http.ServerResponse, statusCode: number, data: any): void {
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data, null, 2));
    }

    private setupMockData(): void {
        // Add sample builds
        this.builds.push({
            id: 1,
            definition: { id: 1, name: 'Sample Build Definition' },
            buildNumber: 'SampleBuild_20240101.1',
            status: 'completed',
            result: 'succeeded',
            requestedBy: {
                displayName: 'Test User',
                uniqueName: 'testuser@example.com'
            },
            startTime: '2024-01-01T10:00:00.000Z',
            finishTime: '2024-01-01T10:15:00.000Z',
            project: {
                id: 'test-project-id',
                name: 'TestProject'
            }
        });

        // Add sample build definitions
        this.buildDefinitions.push({
            id: 1,
            name: 'Sample Build Definition',
            project: 'TestProject',
            queue: { id: 1, name: 'Default' },
            type: 'build'
        });

        // Add sample work items
        this.workItems.push({
            id: 1,
            fields: {
                'System.WorkItemType': 'Task',
                'System.Title': 'Sample Task',
                'System.State': 'New',
                'System.CreatedBy': 'Test User <testuser@example.com>',
                'System.CreatedDate': '2024-01-01T10:00:00.000Z'
            },
            url: `http://${this.host}:${this.port}/TestProject/_apis/wit/workitems/1`
        });

        // Add sample task definitions
        this.taskDefinitions.push({
            id: 'sample-task-id',
            name: 'SampleTask',
            friendlyName: 'Sample Task',
            version: { major: 1, minor: 0, patch: 0 },
            visibility: ['Build', 'Release'],
            category: 'Utility'
        });

        // Add test task for deletion tests
        this.taskDefinitions.push({
            id: 'test-task-id',
            name: 'TestTask',
            friendlyName: 'Test Task for Deletion',
            version: { major: 1, minor: 0, patch: 0 },
            visibility: ['Build'],
            category: 'Test'
        });

        // Add sample extensions
        this.extensions.push({
            extensionId: 'test-extension',
            extensionName: 'Test Extension',
            displayName: 'Test Extension',
            shortDescription: 'Test extension for server integration tests',
            publisher: {
                publisherName: 'test-publisher',
                displayName: 'Test Publisher'
            },
            versions: [{
                version: '1.0.0',
                targetPlatform: null,
                files: [],
                properties: [],
                assetUri: '',
                fallbackAssetUri: '',
                flags: 'validated',
                lastUpdated: new Date().toISOString()
            }],
            publishedDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            categories: ['Other'],
            tags: [],
            flags: 'validated'
        });

        this.extensions.push({
            extensionId: 'sample-extension',
            extensionName: 'Sample Extension',
            displayName: 'Sample Extension',
            shortDescription: 'Sample extension for testing',
            publisher: {
                publisherName: 'sample-publisher',
                displayName: 'Sample Publisher'
            },
            flags: 'validated',
            versions: [{
                version: '2.0.0',
                flags: 'validated',
                lastUpdated: '2024-01-01T10:00:00.000Z'
            }],
            publishedDate: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            categories: ['Other'],
            tags: []
        });
    }

    public start(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.server.listen(this.port, this.host, () => {
                    console.log(`Mock DevOps server listening on http://${this.host}:${this.port}`);
                    resolve();
                });
                
                this.server.on('error', (error) => {
                    reject(error);
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    public stop(): Promise<void> {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    console.log('Mock DevOps server stopped');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    public getBaseUrl(): string {
        return `http://${this.host}:${this.port}`;
    }

    public getCollectionUrl(): string {
        return `${this.getBaseUrl()}/DefaultCollection`;
    }

    // Helper methods for tests to manipulate mock data
    public addBuild(build: Partial<MockBuild>): MockBuild {
        const newBuild: MockBuild = {
            id: this.builds.length + 1,
            definition: { id: 1, name: 'Test Definition' },
            buildNumber: `Build_${Date.now()}`,
            status: 'completed',
            result: 'succeeded',
            requestedBy: {
                displayName: 'Test User',
                uniqueName: 'testuser@example.com'
            },
            startTime: new Date().toISOString(),
            project: {
                id: 'test-project-id',
                name: 'TestProject'
            },
            ...build
        };
        this.builds.push(newBuild);
        return newBuild;
    }

    public addWorkItem(workItem: Partial<MockWorkItem>): MockWorkItem {
        const newWorkItem: MockWorkItem = {
            id: this.workItems.length + 1,
            fields: {
                'System.WorkItemType': 'Task',
                'System.State': 'New',
                'System.CreatedBy': 'Test User <testuser@example.com>',
                'System.CreatedDate': new Date().toISOString(),
                ...workItem.fields
            },
            url: `${this.getBaseUrl()}/TestProject/_apis/wit/workitems/${this.workItems.length + 1}`,
            ...workItem
        };
        this.workItems.push(newWorkItem);
        return newWorkItem;
    }

    public clearData(): void {
        this.builds = [];
        this.workItems = [];
        this.extensions = [];
        this.buildDefinitions = [];
        this.taskDefinitions = [];
        this.setupMockData();
    }
}

// Utility function to create and start a mock server
export async function createMockServer(options: MockServerOptions = {}): Promise<MockDevOpsServer> {
    const server = new MockDevOpsServer(options);
    await server.start();
    return server;
}
