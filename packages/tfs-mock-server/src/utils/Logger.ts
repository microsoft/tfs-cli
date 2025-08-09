import { MockServerOptions } from '../types';

export class Logger {
    private static verbose: boolean = false;

    public static configure(options: MockServerOptions): void {
        Logger.verbose = options.verbose === true;
    }

    public static log(message: string, ...args: any[]): void {
        if (Logger.verbose) {
            console.log(message, ...args);
        }
    }

    public static error(message: string, ...args: any[]): void {
        // Always show errors regardless of verbose setting
        console.error(message, ...args);
    }

    public static logRequest(method: string, pathname: string, authorization?: string): void {
        if (Logger.verbose) {
            const obscuredAuth = Logger.obscureAuthorization(authorization);
            console.log(`Mock Server: ${method} ${pathname} - Authorization: ${obscuredAuth}`);
        }
    }

    private static obscureAuthorization(auth?: string): string {
        if (!auth) {
            return 'none';
        }

        // Handle Basic authentication
        if (auth.startsWith('Basic ')) {
            const token = auth.substring(6);
            return `Basic ${Logger.obscureToken(token)}`;
        }

        // Handle Bearer token (PAT)
        if (auth.startsWith('Bearer ')) {
            const token = auth.substring(7);
            return `Bearer ${Logger.obscureToken(token)}`;
        }

        // Handle other authorization types
        const parts = auth.split(' ');
        if (parts.length === 2) {
            return `${parts[0]} ${Logger.obscureToken(parts[1])}`;
        }

        // If we can't parse it, just obscure the whole thing
        return Logger.obscureToken(auth);
    }

    private static obscureToken(token: string): string {
        if (!token || token.length < 8) {
            return '***';
        }
        
        const start = token.substring(0, 3);
        const end = token.substring(token.length - 3);
        const middle = '*'.repeat(Math.max(3, token.length - 6));
        
        return `${start}${middle}${end}`;
    }
}
