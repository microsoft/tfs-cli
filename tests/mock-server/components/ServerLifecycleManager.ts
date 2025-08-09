import * as http from 'http';
import { MockServerOptions } from '../types';

export class ServerLifecycleManager {
    private server: http.Server | null = null;
    private port: number;
    private host: string;
    private isStarted: boolean = false;

    constructor(options: MockServerOptions, requestHandler: (req: http.IncomingMessage, res: http.ServerResponse) => void) {
        this.port = options.port || 8080;
        this.host = options.host || 'localhost';
        this.server = http.createServer(requestHandler);
        this.setupErrorHandling();
    }

    private setupErrorHandling(): void {
        if (this.server) {
            this.server.on('error', (error) => {
                console.error('Mock DevOps server error:', error);
            });

            this.server.on('close', () => {
                console.log('Mock DevOps server closed');
                this.isStarted = false;
            });
        }
    }

    public start(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.isStarted) {
                resolve();
                return;
            }

            if (!this.server) {
                reject(new Error('Server not initialized'));
                return;
            }

            try {
                this.server.listen(this.port, this.host, () => {
                    console.log(`Mock DevOps server listening on http://${this.host}:${this.port}`);
                    this.isStarted = true;
                    resolve();
                });
                
                this.server.on('error', (error) => {
                    reject(error);
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    public stop(): Promise<void> {
        return new Promise((resolve) => {
            if (!this.server || !this.isStarted) {
                resolve();
                return;
            }

            this.server.close(() => {
                console.log('Mock DevOps server stopped');
                this.isStarted = false;
                resolve();
            });
        });
    }

    public getBaseUrl(): string {
        return `http://${this.host}:${this.port}`;
    }

    public getCollectionUrl(): string {
        return `${this.getBaseUrl()}/DefaultCollection`;
    }

    public isRunning(): boolean {
        return this.isStarted;
    }

    public getPort(): number {
        return this.port;
    }

    public getHost(): string {
        return this.host;
    }
}
