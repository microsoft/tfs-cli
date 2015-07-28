/// <reference path="../../node/node.d.ts" />
import VsoBaseInterfaces = require('../interfaces/common/VsoBaseInterfaces');
export declare class BasicCredentialHandler implements VsoBaseInterfaces.IRequestHandler {
    username: string;
    password: string;
    constructor(username: string, password: string);
    prepareRequest(options: any): void;
}
