const AZDO_TOKEN_ENV = 'AZURE_DEVOPS_TOKEN';

// Basic test framework hooks to avoid TypeScript complaining when used outside of test files.
declare function before(fn: Function): void;
declare function beforeEach(fn: Function): void;
declare function after(fn: Function): void;
declare function afterEach(fn: Function): void;

function clearAzureToken(): void {
    delete process.env[AZDO_TOKEN_ENV];
}

/**
 * Ensures AZURE_DEVOPS_TOKEN from the developer environment never leaks into tests unless a test sets it explicitly.
 */
export function enforceAzureTokenIsolation(): void {
    const originalToken = process.env[AZDO_TOKEN_ENV];

    before(clearAzureToken);
    beforeEach(clearAzureToken);
    afterEach(clearAzureToken);

    after(() => {
        if (originalToken === undefined) {
            clearAzureToken();
            return;
        }

        process.env[AZDO_TOKEN_ENV] = originalToken;
    });
}
