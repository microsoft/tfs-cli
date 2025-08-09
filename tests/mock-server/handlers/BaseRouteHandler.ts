import { RequestContext, RouteHandler } from '../types';
import { MockDataStore } from '../data/MockDataStore';
import { ResponseUtils } from '../utils/ResponseUtils';

export abstract class BaseRouteHandler {
    protected dataStore: MockDataStore;
    protected port: number;

    constructor(dataStore: MockDataStore, port: number) {
        this.dataStore = dataStore;
        this.port = port;
    }

    abstract getRoutes(): RouteHandler[];

    protected matchPattern(pattern: RegExp | string, pathname: string): RegExpMatchArray | null {
        if (typeof pattern === 'string') {
            return pathname === pattern ? [pathname] : null;
        }
        return pathname.match(pattern);
    }

    protected handleRequest(context: RequestContext, pattern: RegExp | string, handler: (context: RequestContext, match?: RegExpMatchArray) => void): boolean {
        const match = this.matchPattern(pattern, context.pathname);
        if (match) {
            handler(context, match);
            return true;
        }
        return false;
    }

    protected getLocationUrl(): string {
        return `http://localhost:${this.port}`;
    }

    protected sendResourceArea(res: any, id: string, name: string): void {
        ResponseUtils.sendSuccess(res, {
            id,
            name,
            locationUrl: this.getLocationUrl(),
            routeTemplate: '/DefaultCollection/_apis/{area}',
            resourceVersion: 1
        });
    }
}
