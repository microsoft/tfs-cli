import { RequestContext, RouteHandler } from '../types';
import { BaseRouteHandler } from './BaseRouteHandler';
import { ResponseUtils } from '../utils/ResponseUtils';

export class DistributedTaskHandler extends BaseRouteHandler {
    public getRoutes(): RouteHandler[] {
        return [
            // OPTIONS route for API area discovery
            {
                pattern: /^\/(.*\/)?_apis\/distributedtask\/?$/i,
                method: 'OPTIONS',
                handler: (context) => this.handleDistributedTaskAreaDiscovery(context)
            },
            // Task definitions endpoints
            {
                pattern: /^(\/[^\/]+)?\/_apis\/distributedtask\/tasks$/,
                method: 'GET',
                handler: (context) => this.handleTasksList(context)
            },
            {
                pattern: /^(\/[^\/]+)?\/_apis\/distributedtask\/tasks$/,
                method: 'POST',
                handler: (context) => this.handleTaskCreate(context)
            },
            {
                pattern: /^(\/[^\/]+)?\/_apis\/distributedtask\/tasks\/([^\/]+)$/,
                method: 'GET',
                handler: (context) => this.handleTaskGet(context)
            },
            {
                pattern: /^(\/[^\/]+)?\/_apis\/distributedtask\/tasks\/([^\/]+)$/,
                method: 'PUT',
                handler: (context) => this.handleTaskUpdate(context)
            },
            {
                pattern: /^(\/[^\/]+)?\/_apis\/distributedtask\/tasks\/([^\/]+)$/,
                method: 'DELETE',
                handler: (context) => this.handleTaskDelete(context)
            }
        ];
    }

    private handleDistributedTaskAreaDiscovery(context: RequestContext): void {
        console.log('[Mock Server] API area discovery for: distributedtask');
        
        const resourceLocations = [
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
        
        console.log('[Mock Server] Returning distributedtask area resource locations:', JSON.stringify(resourceLocations, null, 2));
        ResponseUtils.sendSuccess(context.res, { value: resourceLocations });
    }

    private handleTasksList(context: RequestContext): void {
        const taskIdParam = context.query.taskId || context.query.taskid;
        
        if (taskIdParam) {
            // Filter tasks by ID for getTaskDefinitions(taskId) calls
            const matchingTasks = this.dataStore.getTaskDefinitions().filter(t => t.id === taskIdParam);
            console.log(`[Mock Server] Filtered tasks by ID ${taskIdParam}: found ${matchingTasks.length} tasks`);
            ResponseUtils.sendSuccess(context.res, {
                count: matchingTasks.length,
                value: matchingTasks
            });
        } else {
            // Return all tasks for general list calls
            const tasks = this.dataStore.getTaskDefinitions();
            ResponseUtils.sendSuccess(context.res, {
                count: tasks.length,
                value: tasks
            });
        }
    }

    private handleTaskCreate(context: RequestContext): void {
        const newTask = {
            id: `task-${this.dataStore.getTaskDefinitions().length + 1}`,
            name: context.body.name || 'Test Task',
            friendlyName: context.body.friendlyName || 'Test Task',
            version: context.body.version || { major: 1, minor: 0, patch: 0 },
            ...context.body
        };
        
        this.dataStore.addTaskDefinition(newTask);
        ResponseUtils.sendCreated(context.res, newTask);
    }

    private handleTaskGet(context: RequestContext): void {
        const match = context.pathname.match(/^(\/[^\/]+)?\/_apis\/distributedtask\/tasks\/([^\/]+)$/);
        if (!match) {
            ResponseUtils.sendBadRequest(context.res, 'Invalid task ID');
            return;
        }
        
        const taskId = match[2];
        console.log(`[Mock Server] Looking for task with ID: ${taskId}`);
        const task = this.dataStore.getTaskDefinitions().find(t => t.id === taskId);
        console.log(`[Mock Server] Found task:`, task ? task.id : 'NOT FOUND');
        
        if (task) {
            // getTaskDefinitions always returns an array, even for individual tasks
            ResponseUtils.sendSuccess(context.res, [task]);
        } else {
            // Return empty array when task not found
            ResponseUtils.sendSuccess(context.res, []);
        }
    }

    private handleTaskUpdate(context: RequestContext): void {
        const match = context.pathname.match(/^(\/[^\/]+)?\/_apis\/distributedtask\/tasks\/([^\/]+)$/);
        if (!match) {
            ResponseUtils.sendBadRequest(context.res, 'Invalid task ID');
            return;
        }
        
        const taskId = match[2];
        const updatedTask = {
            id: taskId,
            name: context.body.name || 'Updated Task',
            friendlyName: context.body.friendlyName || 'Updated Task',
            version: context.body.version || { major: 1, minor: 0, patch: 0 },
            ...context.body
        };
        
        // Update existing task or add new one
        const tasks = this.dataStore.getTaskDefinitions();
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            tasks[taskIndex] = updatedTask;
        } else {
            this.dataStore.addTaskDefinition(updatedTask);
        }
        
        ResponseUtils.sendSuccess(context.res, updatedTask);
    }

    private handleTaskDelete(context: RequestContext): void {
        const match = context.pathname.match(/^(\/[^\/]+)?\/_apis\/distributedtask\/tasks\/([^\/]+)$/);
        if (!match) {
            ResponseUtils.sendBadRequest(context.res, 'Invalid task ID');
            return;
        }
        
        const taskId = match[2];
        console.log(`[Mock Server] Attempting to delete task with ID: ${taskId}`);
        const tasks = this.dataStore.getTaskDefinitions();
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        console.log(`[Mock Server] Task index for deletion:`, taskIndex);
        
        if (taskIndex !== -1) {
            const deletedTask = tasks.splice(taskIndex, 1)[0];
            console.log(`[Mock Server] Successfully deleted task:`, deletedTask.id);
            ResponseUtils.sendSuccess(context.res, deletedTask);
        } else {
            console.log(`[Mock Server] Task not found for deletion: ${taskId}`);
            ResponseUtils.sendNotFound(context.res, 'Task');
        }
    }
}
