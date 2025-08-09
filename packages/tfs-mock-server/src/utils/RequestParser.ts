import * as http from 'http';
import * as url from 'url';

export class RequestParser {
    public static parseRequest(req: http.IncomingMessage): Promise<{
        method: string;
        pathname: string;
        query: any;
        body: any;
    }> {
        return new Promise((resolve, reject) => {
            const parsedUrl = url.parse(req.url || '', true);
            const method = req.method || 'GET';
            const pathname = parsedUrl.pathname || '';
            const query = parsedUrl.query;
            const contentType = req.headers['content-type'] || '';

            if (method === 'GET' || method === 'DELETE' || method === 'OPTIONS') {
                resolve({
                    method,
                    pathname,
                    query,
                    body: null
                });
            } else {
                // For task upload endpoints with binary content, don't parse as JSON
                const isTaskUpload = pathname.includes('/distributedtask/tasks/') && method === 'PUT';
                const isBinaryContent = contentType.includes('application/octet-stream') || 
                                      contentType.includes('application/zip') ||
                                      isTaskUpload;
                
                if (isBinaryContent) {
                    // For binary uploads, we'll just store the raw data
                    // The specific handler can process it as needed
                    const chunks: Buffer[] = [];
                    
                    req.on('data', (chunk: Buffer) => {
                        chunks.push(chunk);
                    });

                    req.on('end', () => {
                        const binaryData = Buffer.concat(chunks);
                        resolve({
                            method,
                            pathname,
                            query,
                            body: binaryData
                        });
                    });

                    req.on('error', (error) => {
                        reject(error);
                    });
                } else {
                    // Handle JSON content as before
                    let body = '';
                    req.on('data', (chunk) => {
                        body += chunk.toString();
                    });

                    req.on('end', () => {
                        try {
                            const parsedBody = body ? JSON.parse(body) : {};
                            resolve({
                                method,
                                pathname,
                                query,
                                body: parsedBody
                            });
                        } catch (error) {
                            reject(error);
                        }
                    });

                    req.on('error', (error) => {
                        reject(error);
                    });
                }
            }
        });
    }

    public static logRequest(method: string, pathname: string, headers: http.IncomingHttpHeaders): void {
        console.log(`Mock Server: ${method} ${pathname} - Authorization: ${headers.authorization || 'none'}`);
    }
}
