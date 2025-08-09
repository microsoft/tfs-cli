import { RequestContext, RouteHandler } from '../types';
import { BaseRouteHandler } from './BaseRouteHandler';
import { ResponseUtils } from '../utils/ResponseUtils';
import { Logger } from '../utils/Logger';

export class WorkItemHandler extends BaseRouteHandler {
    public getRoutes(): RouteHandler[] {
        return [
            // OPTIONS route for API area discovery
            {
                pattern: /^\/(.*\/)?_apis\/wit\/?$/i,
                method: 'OPTIONS',
                handler: (context) => this.handleWitAreaDiscovery(context)
            },
            {
                pattern: /^\/([^\/]+)\/_apis\/wit\/workitems$/,
                method: 'GET',
                handler: (context) => this.handleWorkItemsList(context)
            },
            {
                pattern: /^\/([^\/]+)\/_apis\/wit\/workitems$/,
                method: 'POST',
                handler: (context) => this.handleWorkItemCreate(context)
            },
            {
                pattern: /^\/([^\/]+)\/_apis\/wit\/workitems\/(\d+)$/,
                method: 'GET',
                handler: (context) => this.handleWorkItemById(context)
            },
            {
                pattern: /^\/([^\/]+)\/_apis\/wit\/workitems\/(\d+)$/,
                method: 'PATCH',
                handler: (context) => this.handleWorkItemUpdate(context)
            },
            {
                pattern: /^\/([^\/]+)\/_apis\/wit\/workitems\/\$([^\/]+)$/,
                method: 'POST',
                handler: (context) => this.handleWorkItemCreateByType(context)
            },
            // Root-level work item endpoints (no project)
            {
                pattern: /^\/_apis\/wit\/workitems\/(\d+)$/,
                method: 'GET',
                handler: (context) => this.handleRootWorkItemById(context)
            },
            {
                pattern: /^\/_apis\/wit\/workitems\/\$([^\/]+)$/,
                method: 'POST',
                handler: (context) => this.handleRootWorkItemCreateByType(context)
            },
            {
                pattern: /^\/_apis\/wit\/workitems\/(\d+)$/,
                method: 'PATCH',
                handler: (context) => this.handleRootWorkItemUpdate(context)
            },
            // WIQL queries
            {
                pattern: /^\/([^\/]+)\/_apis\/wit\/wiql$/,
                method: 'POST',
                handler: (context) => this.handleWorkItemQuery(context)
            }
        ];
    }

    private handleWorkItemsList(context: RequestContext): void {
        const match = context.pathname.match(/^\/([^\/]+)\/_apis\/wit\/workitems$/);
        if (!match) {
            ResponseUtils.sendBadRequest(context.res, 'Invalid project name');
            return;
        }

        const project = match[1];
        const ids = context.query.ids;
        const fields = context.query.fields;
        
        let workItems = this.dataStore.getWorkItems();
        
        if (ids) {
            const idArray = ids.toString().split(',').map((id: string) => parseInt(id));
            workItems = workItems.filter(w => idArray.includes(w.id));
        }
        
        // Filter fields if specified
        if (fields) {
            const fieldArray = fields.toString().split(',');
            workItems = workItems.map(w => ({
                ...w,
                fields: this.filterFields(w.fields, fieldArray)
            }));
        }
        
        ResponseUtils.sendSuccess(context.res, {
            count: workItems.length,
            value: workItems
        });
    }

    private handleWorkItemCreate(context: RequestContext): void {
        const match = context.pathname.match(/^\/([^\/]+)\/_apis\/wit\/workitems$/);
        if (!match) {
            ResponseUtils.sendBadRequest(context.res, 'Invalid project name');
            return;
        }

        const project = match[1];
        
        if (!context.body || !Array.isArray(context.body)) {
            ResponseUtils.sendBadRequest(context.res, 'Invalid work item data');
            return;
        }

        const fields: { [key: string]: any } = {};
        
        // Process JSON patch operations
        context.body.forEach((operation: any) => {
            if (operation.op === 'add' && operation.path && operation.value) {
                const fieldName = operation.path.replace('/fields/', '');
                fields[fieldName] = operation.value;
            }
        });

        const newWorkItem = this.dataStore.addWorkItem({
            fields: fields,
            url: `${this.getLocationUrl()}/${project}/_apis/wit/workitems/${this.dataStore.getWorkItems().length + 1}`
        });
        
        ResponseUtils.sendCreated(context.res, newWorkItem);
    }

    private handleWorkItemById(context: RequestContext): void {
        const match = context.pathname.match(/^\/([^\/]+)\/_apis\/wit\/workitems\/(\d+)$/);
        if (!match) {
            ResponseUtils.sendBadRequest(context.res, 'Invalid project or work item ID');
            return;
        }

        const workItemId = parseInt(match[2]);
        const workItem = this.dataStore.getWorkItemById(workItemId);
        
        if (workItem) {
            ResponseUtils.sendSuccess(context.res, workItem);
        } else {
            ResponseUtils.sendNotFound(context.res, 'Work item');
        }
    }

    private handleWorkItemUpdate(context: RequestContext): void {
        const match = context.pathname.match(/^\/([^\/]+)\/_apis\/wit\/workitems\/(\d+)$/);
        if (!match) {
            ResponseUtils.sendBadRequest(context.res, 'Invalid project or work item ID');
            return;
        }

        const workItemId = parseInt(match[2]);
        const workItem = this.dataStore.getWorkItemById(workItemId);
        
        if (!workItem) {
            ResponseUtils.sendNotFound(context.res, 'Work item');
            return;
        }

        if (!context.body || !Array.isArray(context.body)) {
            ResponseUtils.sendBadRequest(context.res, 'Invalid patch data');
            return;
        }

        // Process JSON patch operations
        context.body.forEach((operation: any) => {
            if (operation.op === 'replace' && operation.path && operation.value !== undefined) {
                const fieldName = operation.path.replace('/fields/', '');
                workItem.fields[fieldName] = operation.value;
            }
        });

        ResponseUtils.sendSuccess(context.res, workItem);
    }

    private handleWorkItemCreateByType(context: RequestContext): void {
        const match = context.pathname.match(/^\/([^\/]+)\/_apis\/wit\/workitems\/\$([^\/]+)$/);
        if (!match) {
            ResponseUtils.sendBadRequest(context.res, 'Invalid project or work item type');
            return;
        }

        const project = match[1];
        const workItemType = match[2];

        if (!context.body || !Array.isArray(context.body)) {
            ResponseUtils.sendBadRequest(context.res, 'Invalid work item data');
            return;
        }

        const fields: { [key: string]: any } = {
            'System.WorkItemType': workItemType
        };
        
        // Process JSON patch operations
        context.body.forEach((operation: any) => {
            if (operation.op === 'add' && operation.path && operation.value) {
                const fieldName = operation.path.replace('/fields/', '');
                fields[fieldName] = operation.value;
            }
        });

        const newWorkItem = this.dataStore.addWorkItem({
            fields: fields,
            url: `${this.getLocationUrl()}/${project}/_apis/wit/workitems/${this.dataStore.getWorkItems().length + 1}`
        });
        
        ResponseUtils.sendCreated(context.res, newWorkItem);
    }

    private filterFields(fields: { [key: string]: any }, allowedFields: string[]): { [key: string]: any } {
        const filtered: { [key: string]: any } = {};
        allowedFields.forEach(field => {
            if (fields.hasOwnProperty(field)) {
                filtered[field] = fields[field];
            }
        });
        return filtered;
    }

    private handleWitAreaDiscovery(context: RequestContext): void {
        Logger.log('[Mock Server] API area discovery for: wit');
        
        const resourceLocations = [
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
        
        Logger.log('[Mock Server] Returning wit area resource locations:', JSON.stringify(resourceLocations, null, 2));
        ResponseUtils.sendSuccess(context.res, { value: resourceLocations });
    }

    private handleRootWorkItemById(context: RequestContext): void {
        const match = context.pathname.match(/^\/_apis\/wit\/workitems\/(\d+)$/);
        if (!match) {
            ResponseUtils.sendBadRequest(context.res, 'Invalid work item ID');
            return;
        }

        const id = parseInt(match[1]);
        const workItem = this.dataStore.getWorkItemById(id);
        
        if (workItem) {
            ResponseUtils.sendSuccess(context.res, workItem);
        } else {
            ResponseUtils.sendNotFound(context.res, 'Work item');
        }
    }

    private handleRootWorkItemCreateByType(context: RequestContext): void {
        const match = context.pathname.match(/^\/_apis\/wit\/workitems\/\$([^\/]+)$/);
        if (!match) {
            ResponseUtils.sendBadRequest(context.res, 'Invalid work item type');
            return;
        }

        const workItemType = match[1];
        const fields: any = {};
        
        // Parse JSON patch operations
        if (Array.isArray(context.body)) {
            context.body.forEach((operation: any) => {
                if (operation.op === 'add' && operation.path.startsWith('/fields/')) {
                    const fieldName = operation.path.replace('/fields/', '');
                    fields[fieldName] = operation.value;
                }
            });
        }

        const newWorkItem = this.dataStore.addWorkItem({
            fields: {
                'System.WorkItemType': workItemType,
                'System.State': 'New',
                'System.CreatedBy': 'Test User <testuser@example.com>',
                'System.CreatedDate': new Date().toISOString(),
                ...fields
            },
            url: `${this.getLocationUrl()}/_apis/wit/workitems/${this.dataStore.getWorkItems().length + 1}`
        });
        
        ResponseUtils.sendCreated(context.res, newWorkItem);
    }

    private handleRootWorkItemUpdate(context: RequestContext): void {
        const match = context.pathname.match(/^\/_apis\/wit\/workitems\/(\d+)$/);
        if (!match) {
            ResponseUtils.sendBadRequest(context.res, 'Invalid work item ID');
            return;
        }

        const id = parseInt(match[1]);
        const workItem = this.dataStore.getWorkItemById(id);
        
        if (!workItem) {
            ResponseUtils.sendNotFound(context.res, 'Work item');
            return;
        }

        // Parse JSON patch operations
        if (Array.isArray(context.body)) {
            context.body.forEach((operation: any) => {
                if (operation.op === 'add' && operation.path.startsWith('/fields/')) {
                    const fieldName = operation.path.replace('/fields/', '');
                    workItem.fields[fieldName] = operation.value;
                }
            });
        }
        
        ResponseUtils.sendSuccess(context.res, workItem);
    }

    private handleWorkItemQuery(context: RequestContext): void {
        ResponseUtils.sendSuccess(context.res, {
            queryType: 'flat',
            queryResultType: 'workItem',
            workItems: this.dataStore.getWorkItems().slice(0, 5).map(wi => ({
                id: wi.id,
                url: wi.url
            }))
        });
    }
}
