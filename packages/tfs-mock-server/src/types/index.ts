import * as http from 'http';

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

export interface RequestContext {
    method: string;
    pathname: string;
    query: any;
    body: any;
    req: http.IncomingMessage;
    res: http.ServerResponse;
}

export interface RouteHandler {
    pattern: RegExp | string;
    method: string;
    handler: (context: RequestContext) => void;
}
