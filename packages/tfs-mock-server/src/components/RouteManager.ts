import { RequestContext, RouteHandler } from '../types';
import { MockDataStore } from '../data/MockDataStore';
import { LocationHandler } from '../handlers/LocationHandler';
import { BuildHandler } from '../handlers/BuildHandler';
import { WorkItemHandler } from '../handlers/WorkItemHandler';
import { ExtensionHandler } from '../handlers/ExtensionHandler';
import { DistributedTaskHandler } from '../handlers/DistributedTaskHandler';
import { ResponseUtils } from '../utils/ResponseUtils';

export class RouteManager {
    private handlers: RouteHandler[] = [];
    private port: number;

    constructor(dataStore: MockDataStore, port: number) {
        this.port = port;
        this.initializeHandlers(dataStore, port);
    }

    private initializeHandlers(dataStore: MockDataStore, port: number): void {
        const locationHandler = new LocationHandler(dataStore, port);
        const buildHandler = new BuildHandler(dataStore, port);
        const workItemHandler = new WorkItemHandler(dataStore, port);
        const extensionHandler = new ExtensionHandler(dataStore, port);
        const distributedTaskHandler = new DistributedTaskHandler(dataStore, port);

        // Collect all routes from handlers
        this.handlers = [
            ...locationHandler.getRoutes(),
            ...buildHandler.getRoutes(),
            ...workItemHandler.getRoutes(),
            ...extensionHandler.getRoutes(),
            ...distributedTaskHandler.getRoutes()
        ];

        // Add catch-all OPTIONS handler
        this.handlers.push({
            pattern: /.*/,
            method: 'OPTIONS',
            handler: (context) => this.handleOptionsRequest(context)
        });
    }

    public routeRequest(context: RequestContext): boolean {
        console.log(`[Mock Server] Routing ${context.method} ${context.pathname}`);

        // Handle OPTIONS requests for CORS and Location API discovery
        if (context.method === 'OPTIONS') {
            // Handle Location API area discovery requests specifically
            if (context.pathname && context.pathname.includes('/_apis/Location')) {
                console.log(`[Mock Server] Handling OPTIONS for ${context.pathname}`);
                
                const apisIndex = context.pathname.indexOf('/_apis/');
                const pathAfterApis = context.pathname.substring(apisIndex + 7); // Skip "/_apis/"
                const area = pathAfterApis.split('/')[0]; // Get first part after _apis/
                
                console.log(`[Mock Server] API area discovery for: ${area}`);
                
                if (area === 'Location') {
                    const resourceLocations = [
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
                    ResponseUtils.sendSuccess(context.res, { value: resourceLocations });
                    return true;
                }
            }
            
            // For non-Location OPTIONS requests, let them fall through to specific handlers
            // If no specific handler matches, then handle as regular CORS preflight at the end
        }

        // Find matching route
        for (const route of this.handlers) {
            if (this.matchesRoute(route, context)) {
                console.log(`[Mock Server] Found matching route for ${context.method} ${context.pathname}`);
                try {
                    route.handler(context);
                    return true;
                } catch (error) {
                    console.error(`[Mock Server] Error handling route:`, error);
                    ResponseUtils.sendError(context.res, 500, 'Internal server error');
                    return true;
                }
            }
        }

        // Handle missing GET requests that the original handled with exact matching
        if (context.method === 'GET') {
            // Connection data endpoint - handle both root and collection level
            if (context.pathname === '/_apis/connectiondata' || context.pathname === '/DefaultCollection/_apis/connectiondata' ||
                context.pathname === '/_apis/connectionData' || context.pathname === '/DefaultCollection/_apis/connectionData') {
                console.log(`[Mock Server] Handling connection data request`);
                ResponseUtils.sendSuccess(context.res, {
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
                return true;
            }

            // Resource areas endpoint - handle both root and collection level  
            if (context.pathname === '/_apis/resourceareas' || context.pathname === '/DefaultCollection/_apis/resourceareas' ||
                context.pathname === '/_apis/resourceAreas' || context.pathname === '/DefaultCollection/_apis/resourceAreas') {
                console.log(`[Mock Server] Providing resource areas for service discovery`);
                ResponseUtils.sendSuccess(context.res, {
                    count: 6,
                    value: [
                        {
                            id: '00d9565f-ed9c-4a06-9a50-00e7896ccab4',
                            name: 'Location',
                            locationUrl: this.getLocationUrl(),
                            routeTemplate: '/DefaultCollection/_apis/{area}',
                            resourceVersion: 1
                        },
                        {
                            id: '965220d5-5bb9-42cf-8d67-9b146df2a5a4',
                            name: 'build',
                            locationUrl: this.getLocationUrl(),
                            routeTemplate: '/DefaultCollection/_apis/{area}',
                            resourceVersion: 1
                        },
                        {
                            id: '0cd358e1-9217-4d94-8269-1c1ee6f93dcf',
                            name: 'build',
                            locationUrl: this.getLocationUrl(),
                            routeTemplate: '/DefaultCollection/_apis/{area}',
                            resourceVersion: 1
                        },
                        {
                            id: 'a85b8835-c1a1-4aac-ae97-1c3d0ba72dbd',
                            name: 'DistributedTask',
                            locationUrl: this.getLocationUrl(),
                            routeTemplate: '/DefaultCollection/_apis/{area}',
                            resourceVersion: 1
                        },
                        {
                            id: '6c2b0933-3600-42ae-bf8b-93d4f7e83594',
                            name: 'ExtensionManagement',
                            locationUrl: this.getLocationUrl(),
                            routeTemplate: '/DefaultCollection/_apis/{area}',
                            resourceVersion: 1
                        },
                        {
                            id: '5264459e-e5e0-4bd8-b118-0985e68a4ec5',
                            name: 'wit',
                            locationUrl: this.getLocationUrl(),
                            routeTemplate: '/DefaultCollection/_apis/{area}',
                            resourceVersion: 1
                        }
                    ]
                });
                return true;
            }
        }

        console.log(`[Mock Server] No matching route found for ${context.method} ${context.pathname}`);
        return false;
    }

    private getLocationUrl(): string {
        return `http://localhost:${this.port}`;
    }

    private matchesRoute(route: RouteHandler, context: RequestContext): boolean {
        if (route.method !== context.method) {
            return false;
        }

        if (typeof route.pattern === 'string') {
            return route.pattern === context.pathname;
        }

        return route.pattern.test(context.pathname);
    }

    private handleOptionsRequest(context: RequestContext): void {
        // Handle specific OPTIONS requests for API discovery
        const pathname = context.pathname;
        
        console.log(`[Mock Server] Handling OPTIONS for: ${pathname}`);
        
        // Handle API area discovery requests
        if (pathname.includes('/_apis/')) {
            const apisIndex = pathname.indexOf('/_apis/');
            const pathAfterApis = pathname.substring(apisIndex + 7);
            const area = pathAfterApis.split('/')[0];
            
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
            } else if (area === 'extensionmanagement') {
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
                
                console.log(`[Mock Server] Returning extensionmanagement area resource locations:`, JSON.stringify(resourceLocations, null, 2));
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
            }
            
            if (resourceLocations.length > 0) {
                console.log(`[Mock Server] Returning ${resourceLocations.length} resource locations for area: ${area}`);
                console.log(`[Mock Server] Resource locations:`, JSON.stringify(resourceLocations, null, 2));
                ResponseUtils.sendSuccess(context.res, { value: resourceLocations });
                return;
            }
        }
        
        // Regular CORS preflight
        console.log(`[Mock Server] Regular CORS preflight for ${pathname} - responding with OK`);
        ResponseUtils.handleOptionsRequest(context.res);
    }
}
