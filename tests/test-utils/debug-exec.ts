import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Enhanced debug logging utility for test commands
 */
export class DebugLogger {
    private static isEnabled(): boolean {
        return process.env.DEBUG_CLI_OUTPUT === 'true';
    }

    private static formatOutput(label: string, content: string): string {
        if (!content || content.trim() === '') {
            return `${label}: (empty)`;
        }
        
        const lines = content.trim().split('\n');
        if (lines.length === 1) {
            return `${label}: ${content.trim()}`;
        }
        
        return `${label}:\n${content.trim()}`;
    }

    private static logSection(title: string, content?: string): void {
        if (!this.isEnabled()) return;

        console.log('\n' + '='.repeat(80));
        console.log(`[DEBUG] ${title}`);
        console.log('='.repeat(80));
        
        if (content) {
            console.log(content);
        }
    }

    private static logResult(success: boolean, stdout?: string, stderr?: string): void {
        if (!this.isEnabled()) return;

        console.log('-'.repeat(80));
        console.log(`[DEBUG] RESULT: ${success ? 'SUCCESS' : 'FAILURE'}`);
        console.log('-'.repeat(80));
        
        if (stdout) {
            console.log(this.formatOutput('STDOUT', stdout));
        }
        
        if (stderr) {
            console.log(this.formatOutput('STDERR', stderr));
        }
        
        console.log('='.repeat(80));
    }

    /**
     * Execute a command with comprehensive debug logging
     * @param command The command to execute
     * @param description Optional description for the command
     * @returns Promise with stdout and stderr
     */
    static async execWithLogging(command: string, description?: string): Promise<{ stdout: string; stderr: string }> {
        const logTitle = description ? `${description}` : 'COMMAND EXECUTION';
        
        this.logSection(logTitle, `Command: ${command}`);
        
        try {
            const result = await execAsync(command);
            this.logResult(true, result.stdout, result.stderr);
            return result;
        } catch (error: any) {
            this.logResult(false, error.stdout, error.stderr);
            throw error;
        }
    }

    /**
     * Log a general debug message with formatting
     * @param message The message to log
     * @param details Optional additional details
     */
    static log(message: string, details?: string): void {
        if (!this.isEnabled()) return;

        console.log('\n' + '-'.repeat(60));
        console.log(`[DEBUG] ${message}`);
        if (details) {
            console.log(details);
        }
        console.log('-'.repeat(60));
    }

    /**
     * Log test section start/end
     * @param testName The name of the test
     * @param phase 'START' or 'END'
     */
    static logTestPhase(testName: string, phase: 'START' | 'END'): void {
        if (!this.isEnabled()) return;

        const symbol = phase === 'START' ? '▶' : '◀';
        console.log('\n' + '█'.repeat(100));
        console.log(`[DEBUG TEST ${phase}] ${symbol} ${testName} ${symbol}`);
        console.log('█'.repeat(100));
    }
}

/**
 * Convenience function for backward compatibility
 */
export async function execAsyncWithLogging(command: string, description?: string): Promise<{ stdout: string; stderr: string }> {
    return DebugLogger.execWithLogging(command, description);
}
