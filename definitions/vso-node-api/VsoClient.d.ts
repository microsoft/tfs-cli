/// <reference path="../q/Q.d.ts" />
import Q = require("q");
import restm = require("./RestClient");
import ifm = require("./interfaces/common/VsoBaseInterfaces");
export interface ClientVersioningData {
    apiVersion?: string;
    requestUrl?: string;
}
export declare class InvalidApiResourceVersionError implements Error {
    name: string;
    message: string;
    constructor(message?: string);
}
export declare class VsoClient {
    private static APIS_RELATIVE_PATH;
    private static PREVIEW_INDICATOR;
    private _locationsByAreaPromises;
    private _initializationPromise;
    restClient: ifm.IRestClient;
    baseUrl: string;
    basePath: string;
    constructor(baseUrl: string, restClient: restm.RestClient);
    private compareResourceVersions(locationVersion, apiVersion);
    getVersioningData(apiVersion: string, area: string, locationId: string, routeValues: any, queryParams?: any): Q.Promise<ClientVersioningData>;
    _setInitializationPromise(promise: Q.Promise<any>): void;
    _beginGetLocation(area: string, locationId: string): Q.Promise<ifm.ApiResourceLocation>;
    private beginGetAreaLocations(area);
    resolveUrl(relativeUrl: string): string;
    _issueOptionsRequest(requestUrl: string, onResult: (err: any, statusCode: number, locationsResult: any) => void): void;
    protected getRequestUrl(routeTemplate: string, area: string, resource: string, routeValues: any, queryParams?: any): string;
    private replaceRouteValues(routeTemplate, routeValues);
    _getLinkResponseHeaders(xhr: XMLHttpRequest): {
        [relName: string]: string;
    };
}
