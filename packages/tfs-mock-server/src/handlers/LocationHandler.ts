import { RequestContext, RouteHandler } from '../types';
import { BaseRouteHandler } from './BaseRouteHandler';
import { ResponseUtils } from '../utils/ResponseUtils';
import { Logger } from '../utils/Logger';

export class LocationHandler extends BaseRouteHandler {
    public getRoutes(): RouteHandler[] {
        return [
            {
                pattern: /^\/(.*\/)?\/_apis\/resourceareas?\/?$/i,
                method: 'GET',
                handler: (context) => this.handleResourceAreas(context)
            },
            {
                pattern: /^\/(.*\/)?\/_apis\/resourceareas?\/([a-f0-9\-]+)\/?$/i,
                method: 'GET',
                handler: (context) => this.handleSpecificResourceArea(context)
            },
            {
                pattern: /^\/(.*\/)?\/_apis\/connectiondata?\/?$/i,
                method: 'GET',
                handler: (context) => this.handleConnectionData(context)
            },
            {
                pattern: /^\/(.*\/)?\/_apis\/Location\/?$/i,
                method: 'GET',
                handler: (context) => this.handleLocationApi(context)
            },
            {
                pattern: '/health',
                method: 'GET',
                handler: (context) => this.handleHealthCheck(context)
            }
        ];
    }

    private handleResourceAreas(context: RequestContext): void {
        Logger.log('[Mock Server] Providing resource areas for service discovery');
        
        const resourceAreas = [
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
                id: '69D21C00-F135-441B-B5CE-3626378E0819',
                name: 'Gallery',
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
        ];

        ResponseUtils.sendSuccess(context.res, {
            count: resourceAreas.length,
            value: resourceAreas
        });
    }

    private handleSpecificResourceArea(context: RequestContext): void {
        const match = context.pathname.match(/^\/(.*\/)?\/_apis\/resourceareas?\/([a-f0-9\-]+)\/?$/i);
        if (!match) {
            ResponseUtils.sendBadRequest(context.res, 'Invalid resource area ID');
            return;
        }

        const resourceAreaId = match[2].toLowerCase();
        Logger.log(`[Mock Server] Looking up resource area: ${resourceAreaId}`);

        const resourceAreas: { [key: string]: { id: string; name: string } } = {
            '00d9565f-ed9c-4a06-9a50-00e7896ccab4': { id: '00d9565f-ed9c-4a06-9a50-00e7896ccab4', name: 'Location' },
            '965220d5-5bb9-42cf-8d67-9b146df2a5a4': { id: '965220d5-5bb9-42cf-8d67-9b146df2a5a4', name: 'build' },
            '0cd358e1-9217-4d94-8269-1c1ee6f93dcf': { id: '0cd358e1-9217-4d94-8269-1c1ee6f93dcf', name: 'build' },
            'a85b8835-c1a1-4aac-ae97-1c3d0ba72dbd': { id: 'a85b8835-c1a1-4aac-ae97-1c3d0ba72dbd', name: 'DistributedTask' },
            '6c2b0933-3600-42ae-bf8b-93d4f7e83594': { id: '6c2b0933-3600-42ae-bf8b-93d4f7e83594', name: 'ExtensionManagement' },
            '5264459e-e5e0-4bd8-b118-0985e68a4ec5': { id: '5264459e-e5e0-4bd8-b118-0985e68a4ec5', name: 'wit' },
            '69d21c00-f135-441b-b5ce-3626378e0819': { id: '69D21C00-F135-441B-B5CE-3626378E0819', name: 'Gallery' }
        };

        const resourceArea = resourceAreas[resourceAreaId];
        if (resourceArea) {
            // Some resource areas get full template info, others just basic info
            if (resourceAreaId === '00d9565f-ed9c-4a06-9a50-00e7896ccab4' ||  // Location
                resourceAreaId === '965220d5-5bb9-42cf-8d67-9b146df2a5a4' ||  // build
                resourceAreaId === '0cd358e1-9217-4d94-8269-1c1ee6f93dcf') {   // build (older)
                this.sendResourceArea(context.res, resourceArea.id, resourceArea.name);
            } else {
                // Gallery, ExtensionManagement, DistributedTask, wit get minimal response
                ResponseUtils.sendSuccess(context.res, {
                    id: resourceArea.id,
                    name: resourceArea.name,
                    locationUrl: this.getLocationUrl()
                });
            }
        } else {
            ResponseUtils.sendNotFound(context.res, 'Resource area');
        }
    }

    private handleConnectionData(context: RequestContext): void {
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
    }

    private handleLocationApi(context: RequestContext): void {
        Logger.log('[Mock Server] Handling Location API request');
        ResponseUtils.sendSuccess(context.res, {
            id: '00d9565f-ed9c-4a06-9a50-00e7896ccab4',
            name: 'Location',
            locationUrl: this.getLocationUrl(),
            locationMappings: [
                {
                    location: this.getLocationUrl(),
                    accessMappingMoniker: 'HostGuidAccessMapping'
                }
            ]
        });
    }

    private handleHealthCheck(context: RequestContext): void {
        ResponseUtils.sendSuccess(context.res, {
            status: 'healthy',
            timestamp: new Date().toISOString()
        });
    }
}
