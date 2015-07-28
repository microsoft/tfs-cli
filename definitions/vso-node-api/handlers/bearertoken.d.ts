/// <reference path="../../node/node.d.ts" />
import VsoBaseInterfaces = require('../interfaces/common/VsoBaseInterfaces');
export declare class BearerCredentialHandler implements VsoBaseInterfaces.IRequestHandler {
    token: string;
    constructor(token: string);
    prepareRequest(options: any): void;
}
