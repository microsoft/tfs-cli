/// <reference path="../../node/node.d.ts" />
import VsoBaseInterfaces = require('../interfaces/common/VsoBaseInterfaces');
export declare class ApiVersionHandler implements VsoBaseInterfaces.IRequestHandler {
    apiVersion: string;
    constructor(apiVersion: string);
    prepareRequest(options: any): void;
}
