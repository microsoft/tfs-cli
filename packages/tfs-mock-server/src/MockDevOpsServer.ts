import * as http from 'http';
import { MockServerOptions, MockBuild, MockWorkItem, RequestContext } from './types';
import { MockDataStore } from './data/MockDataStore';
import { MockDataInitializer } from './data/MockDataInitializer';
import { ServerLifecycleManager } from './components/ServerLifecycleManager';
import { RouteManager } from './components/RouteManager';
import { RequestParser, Logger } from './utils';
import { ResponseUtils } from './utils/ResponseUtils';

export class MockDevOpsServer {
    private dataStore: MockDataStore;
    private lifecycleManager: ServerLifecycleManager;
    private routeManager: RouteManager;
    private authRequired: boolean;

    constructor(options: MockServerOptions = {}) {
        this.authRequired = options.authRequired !== false;
        
        // Configure logger with verbose setting
        Logger.configure(options);
        
        this.dataStore = new MockDataStore();
        this.lifecycleManager = new ServerLifecycleManager(options, (req, res) => this.handleRequest(req, res));
        this.routeManager = new RouteManager(this.dataStore, this.lifecycleManager.getPort());
        
        this.initializeMockData();
    }

    private initializeMockData(): void {
        MockDataInitializer.initialize(this.dataStore);
    }

    private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        try {
            // Set CORS headers
            ResponseUtils.setCorsHeaders(res);
            
            // Parse request
            const { method, pathname, query, body } = await RequestParser.parseRequest(req);
            
            // Log request
            RequestParser.logRequest(method, pathname, req.headers);
            
            // Check authentication for protected endpoints (except discovery endpoints)
            if (this.authRequired && this.isProtectedEndpoint(method, pathname)) {
                if (!this.isAuthenticated(req)) {
                    ResponseUtils.sendError(res, 401, 'Unauthorized');
                    return;
                }
            }
            
            // Create request context
            const context: RequestContext = {
                method,
                pathname,
                query,
                body,
                req,
                res
            };

            // Route the request
            const handled = this.routeManager.routeRequest(context);
            
            if (!handled) {
                Logger.log(`[Mock Server] No handler found for ${method} ${pathname}`);
                ResponseUtils.sendError(res, 404, 'Not Found');
            }
            
        } catch (error) {
            Logger.error('[Mock Server] Error handling request:', error);
            ResponseUtils.sendError(res, 500, 'Internal server error');
        }
    }

    private isProtectedEndpoint(method: string, pathname: string): boolean {
        // Allow discovery endpoints without authentication
        if (pathname.includes('/_apis/resourceareas')) return false;
        if (pathname.includes('/health')) return false;
        if (method === 'OPTIONS') return false;
        
        // All other _apis endpoints require authentication
        return pathname.includes('/_apis/');
    }

    private isAuthenticated(req: http.IncomingMessage): boolean {
        const authHeader = req.headers.authorization;
        if (!authHeader) return false;
        
        // Simple basic auth check - looking for "Basic " prefix
        return authHeader.startsWith('Basic ');
    }

    // Public API methods
    public async start(): Promise<void> {
        return this.lifecycleManager.start();
    }

    public async stop(): Promise<void> {
        return this.lifecycleManager.stop();
    }

    public getBaseUrl(): string {
        return this.lifecycleManager.getBaseUrl();
    }

    public getCollectionUrl(): string {
        return this.lifecycleManager.getCollectionUrl();
    }

    public isRunning(): boolean {
        return this.lifecycleManager.isRunning();
    }

    // Helper methods for tests to manipulate mock data
    public addBuild(build: Partial<MockBuild>): MockBuild {
        return this.dataStore.addBuild(build);
    }

    public addWorkItem(workItem: Partial<MockWorkItem>): MockWorkItem {
        return this.dataStore.addWorkItem(workItem);
    }

    public clearData(): void {
        this.dataStore.clearAll();
        this.initializeMockData();
    }

    public getBuildById(id: number): MockBuild | undefined {
        return this.dataStore.getBuildById(id);
    }

    public getWorkItemById(id: number): MockWorkItem | undefined {
        return this.dataStore.getWorkItemById(id);
    }
}

// Utility function to create and start a mock server
export async function createMockServer(options: MockServerOptions = {}): Promise<MockDevOpsServer> {
    const server = new MockDevOpsServer(options);
    await server.start();
    return server;
}
