import * as http from 'http';

export class ResponseUtils {
    public static sendResponse(res: http.ServerResponse, statusCode: number, data: any): void {
        res.statusCode = statusCode;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data, null, 2));
    }

    public static sendError(res: http.ServerResponse, statusCode: number, message: string): void {
        ResponseUtils.sendResponse(res, statusCode, { error: message });
    }

    public static sendNotFound(res: http.ServerResponse, resource: string = 'Resource'): void {
        ResponseUtils.sendError(res, 404, `${resource} not found`);
    }

    public static sendBadRequest(res: http.ServerResponse, message: string = 'Bad request'): void {
        ResponseUtils.sendError(res, 400, message);
    }

    public static sendSuccess(res: http.ServerResponse, data: any): void {
        ResponseUtils.sendResponse(res, 200, data);
    }

    public static sendCreated(res: http.ServerResponse, data: any): void {
        ResponseUtils.sendResponse(res, 201, data);
    }

    public static setCorsHeaders(res: http.ServerResponse): void {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, User-Agent');
        res.setHeader('Access-Control-Max-Age', '86400');
    }

    public static handleOptionsRequest(res: http.ServerResponse): void {
        ResponseUtils.setCorsHeaders(res);
        res.statusCode = 200;
        res.end();
    }
}
