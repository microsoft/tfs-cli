import Q = require('q');
import restm = require('./restclient');
import httpm = require('./httpclient');
import vsom = require('./VsoClient');
import VsoBaseInterfaces = require('./interfaces/common/VsoBaseInterfaces');
export declare class ClientApiBase {
    baseUrl: string;
    userAgent: string;
    httpClient: httpm.HttpClient;
    restClient: restm.RestClient;
    vsoClient: vsom.VsoClient;
    constructor(baseUrl: string, handlers: VsoBaseInterfaces.IRequestHandler[], userAgent?: string);
    setUserAgent(userAgent: string): void;
    connect(onResult: (err: any, statusCode: number, obj: any) => void): void;
}
export declare class QClientApiBase {
    api: ClientApiBase;
    constructor(baseUrl: string, handlers: VsoBaseInterfaces.IRequestHandler[], api: typeof ClientApiBase);
    connect(): Q.Promise<any>;
}
