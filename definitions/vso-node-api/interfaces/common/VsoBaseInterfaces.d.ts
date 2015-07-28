import Serialization = require('../../Serialization');
export interface ApiResourceLocation {
    area: string;
    id: string;
    maxVersion: string;
    minVersion: string;
    releasedVersion: string;
    resourceName: string;
    resourceVersion: number;
    routeTemplate: string;
}
export interface IBasicCredentials {
    username: string;
    password: string;
}
export interface IRequestHandler {
    prepareRequest(options: any): void;
}
export interface IHttpResponse {
    statusCode: number;
    headers: any;
}
export interface IQCoreApi {
    connect(): Q.Promise<void>;
}
export interface IHttpClient {
    get(verb: string, requestUrl: string, headers: any, onResult: (err: any, res: IHttpResponse, contents: string) => void): void;
    send(verb: string, requestUrl: string, objs: any, headers: any, onResult: (err: any, res: IHttpResponse, contents: string) => void): void;
    sendFile(verb: string, requestUrl: string, content: NodeJS.ReadableStream, headers: any, onResult: (err: any, res: IHttpResponse, contents: string) => void): void;
    getStream(requestUrl: string, apiVersion: string, headers: any, onResult: (err: any, statusCode: number, res: NodeJS.ReadableStream) => void): void;
    makeAcceptHeader(type: string, apiVersion: string): string;
    request(protocol: any, options: any, body: any, onResult: (err: any, res: IHttpResponse, contents: string) => void): void;
}
export interface IRestClient {
    baseUrl: string;
    httpClient: IHttpClient;
    getJson(relativeUrl: string, apiVersion: string, serializationData: Serialization.SerializationData, onResult: (err: any, statusCode: number, obj: any) => void): void;
    getJsonWrappedArray(relativeUrl: string, apiVersion: string, serializationData: Serialization.SerializationData, onResult: (err: any, statusCode: number, obj: any) => void): void;
    options(requestUrl: string, onResult: (err: any, statusCode: number, obj: any) => void): void;
    create(relativeUrl: string, apiVersion: string, resources: any, serializationData: Serialization.SerializationData, onResult: (err: any, statusCode: number, obj: any) => void): void;
    createJsonWrappedArray(relativeUrl: string, apiVersion: string, resources: any[], serializationData: Serialization.SerializationData, onResult: (err: any, statusCode: number, obj: any) => void): void;
    update(relativeUrl: string, apiVersion: string, resources: any, serializationData: Serialization.SerializationData, onResult: (err: any, statusCode: number, obj: any) => void): void;
    updateJsonWrappedArray(relativeUrl: string, apiVersion: string, resources: any[], serializationData: Serialization.SerializationData, onResult: (err: any, statusCode: number, obj: any) => void): void;
    uploadFile(relativeUrl: string, apiVersion: string, filePath: string, customHeaders: any, serializationData: Serialization.SerializationData, onResult: (err: any, statusCode: number, obj: any) => void): void;
    uploadStream(verb: string, relativeUrl: string, apiVersion: string, contentStream: NodeJS.ReadableStream, customHeaders: any, serializationData: Serialization.SerializationData, onResult: (err: any, statusCode: number, obj: any) => void): void;
    replace(relativeUrl: string, apiVersion: string, resources: any, serializationData: Serialization.SerializationData, onResult: (err: any, statusCode: number, obj: any) => void): void;
}
