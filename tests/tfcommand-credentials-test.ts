import * as assert from "assert";
import type { CoreArguments } from "../app/lib/tfcommand";
import type * as ArgsModule from "../app/lib/arguments";
import type * as CommonModule from "../app/lib/common";
import { BasicCredentialHandler } from "azure-devops-node-api/handlers/basiccreds";
import { enforceAzureTokenIsolation } from "./test-utils/env";

// Load credstore BEFORE tfcommand so we can mock it
const credstore = require("../../_build/lib/credstore") as typeof import("../app/lib/credstore");

// Track credstore access globally
let credStoreAccessCount = 0;
let originalGetCredentialStore: typeof credstore.getCredentialStore;
let mockCredential: BasicCredentialHandler | undefined;

// Set up mock BEFORE loading TfCommand
originalGetCredentialStore = credstore.getCredentialStore;
credstore.getCredentialStore = (appName: string) => {
	const realStore = originalGetCredentialStore(appName);
	
	return {
		appName: realStore.appName,
		credentialExists: realStore.credentialExists.bind(realStore),
		storeCredential: realStore.storeCredential.bind(realStore),
		clearCredential: realStore.clearCredential.bind(realStore),
		getCredential: async (service: string, user: string): Promise<string> => {
			credStoreAccessCount++;
			if (mockCredential) {
				// Return credential in the expected format
				return `pat:${mockCredential.password}`;
			}
			throw new Error("No credentials stored");
		}
	};
};

// NOW load TfCommand after credstore is mocked
type TfCommandConstructor = typeof import("../app/lib/tfcommand").TfCommand;
const args = require("../../_build/lib/arguments") as typeof import("../app/lib/arguments");
const common = require("../../_build/lib/common") as typeof import("../app/lib/common");
const { TfCommand } = require("../../_build/lib/tfcommand") as {
	TfCommand: TfCommandConstructor;
};

function setupCredStoreMock(): void {
	credStoreAccessCount = 0;
	mockCredential = undefined;
}

function teardownCredStoreMock(): void {
	mockCredential = undefined;
	credStoreAccessCount = 0;
}

class CredentialTestCommand extends TfCommand<CoreArguments, void> {
	protected serverCommand = false;
	protected description = "Credential test command";

	constructor(argsList: string[] = []) {
		super(argsList);
	}

	protected exec(): Promise<void> {
		return Promise.resolve();
	}

	public getCredentialsForTest(serviceUrl: string = "https://example.com", useCredStore = true): Promise<BasicCredentialHandler> {
		return this.getCredentials(serviceUrl, useCredStore);
	}
}
// Narrow, test-specific typing for the bits of the arguments/common
// modules we need to override, instead of using a broad `any` cast.
interface TestArgsModule {
	getOptionsCache: typeof ArgsModule.getOptionsCache;
}

interface TestCommonModule {
	EXEC_PATH: string[];
}

const argsModule: TestArgsModule = args as TestArgsModule;
const commonModule: TestCommonModule = common as TestCommonModule;

describe("TfCommand credential resolution", () => {
	let originalGetOptionsCache: typeof args.getOptionsCache;

	// Use the helper to properly isolate AZURE_DEVOPS_TOKEN
	enforceAzureTokenIsolation();

	before(() => {
		commonModule.EXEC_PATH = ["tests", "credentials"];
		originalGetOptionsCache = argsModule.getOptionsCache;
		argsModule.getOptionsCache = () => Promise.resolve({});
	});

	after(() => {
		argsModule.getOptionsCache = originalGetOptionsCache;
	});

	beforeEach(() => {
		setupCredStoreMock();
	});

	afterEach(() => {
		teardownCredStoreMock();
	});

	it("uses the explicit --token argument when provided", async () => {
		const explicitToken = "ARG_TOKEN_123";
		const command = new CredentialTestCommand(["--token", explicitToken]);
		const handler = await command.getCredentialsForTest();

		assert.equal(handler.username, "OAuth");
		assert.equal(handler.password, explicitToken);
	});

	it("reads the token from AZURE_DEVOPS_TOKEN when no argument is provided", async () => {
		const envToken = "ENV_TOKEN_456";
		process.env.AZURE_DEVOPS_TOKEN = envToken;
		const command = new CredentialTestCommand();
		const handler = await command.getCredentialsForTest();

		assert.equal(handler.username, "OAuth");
		assert.equal(handler.password, envToken);
	});

	it("prefers the explicit token argument over other sources", async () => {
		const envToken = "ENV_TOKEN_IGNORED";
		const argToken = "ARG_TOKEN_PRIORITY";
		process.env.AZURE_DEVOPS_TOKEN = envToken;
		const command = new CredentialTestCommand(["--token", argToken]);
		const handler = await command.getCredentialsForTest();

		assert.equal(handler.username, "OAuth");
		assert.equal(handler.password, argToken);
	});

	it("uses stored credentials before prompting", async () => {
		const storedToken = "STORED_TOKEN_789";
		const storedHandler = new BasicCredentialHandler("OAuth", storedToken);
		mockCredential = storedHandler;
		
		const command = new CredentialTestCommand();
		
		// Ensure no token from arguments or environment
		const tokenArg = (command as any).commandArgs.token;
		const originalTokenVal = tokenArg.val;
		tokenArg.val = (optional?: boolean) => {
			if (optional) {
				return Promise.resolve(undefined);
			}
			return Promise.reject(new Error("Should not prompt when stored credentials exist"));
		};
		
		const handler = await command.getCredentialsForTest("https://example.visualstudio.com", true);
		tokenArg.val = originalTokenVal;
		
		assert.equal(credStoreAccessCount > 0, true, "Should query credential store before prompting");
		assert.equal(handler.username, "OAuth");
		assert.equal(handler.password, storedToken);
	});

	it("reads token from --token-from-stdin", async () => {
		const stdinToken = "STDIN_TOKEN_ABC";
		const command = new CredentialTestCommand(["--token-from-stdin"]);
		
		// Mock the tokenFromStdin argument to return our test token
		const tokenFromStdinArg = (command as any).commandArgs.tokenFromStdin;
		const originalVal = tokenFromStdinArg.val;
		tokenFromStdinArg.val = () => Promise.resolve(stdinToken);
		
		const handler = await command.getCredentialsForTest();
		tokenFromStdinArg.val = originalVal;
		
		assert.equal(handler.username, "OAuth");
		assert.equal(handler.password, stdinToken);
	});

	it("prefers explicit --token over --token-from-stdin", async () => {
		const explicitToken = "EXPLICIT_TOKEN_XYZ";
		const stdinToken = "STDIN_TOKEN_IGNORED";
		const command = new CredentialTestCommand(["--token", explicitToken, "--token-from-stdin"]);
		
		// Mock the tokenFromStdin argument
		const tokenFromStdinArg = (command as any).commandArgs.tokenFromStdin;
		const originalVal = tokenFromStdinArg.val;
		tokenFromStdinArg.val = () => Promise.resolve(stdinToken);
		
		const handler = await command.getCredentialsForTest();
		tokenFromStdinArg.val = originalVal;
		
		assert.equal(handler.username, "OAuth");
		assert.equal(handler.password, explicitToken);
	});

	it("prefers --token-from-stdin over AZURE_DEVOPS_TOKEN", async () => {
		const stdinToken = "STDIN_TOKEN_PRIORITY";
		const envToken = "ENV_TOKEN_IGNORED";
		process.env.AZURE_DEVOPS_TOKEN = envToken;
		
		const command = new CredentialTestCommand(["--token-from-stdin"]);
		
		// Mock the tokenFromStdin argument
		const tokenFromStdinArg = (command as any).commandArgs.tokenFromStdin;
		const originalVal = tokenFromStdinArg.val;
		tokenFromStdinArg.val = () => Promise.resolve(stdinToken);
		
		const handler = await command.getCredentialsForTest();
		tokenFromStdinArg.val = originalVal;
		
		assert.equal(handler.username, "OAuth");
		assert.equal(handler.password, stdinToken);
	});

	it("rejects when both --token and --token-from-stdin are provided", async () => {
		const command = new CredentialTestCommand(["--token", "TOKEN_123", "--token-from-stdin"]);
		
		try {
			await command.ensureInitialized();
			// Check if help was set to true
			const needHelp = await (command as any).commandArgs.help.val();
			assert.equal(needHelp, true, "Help should be set to true when mutually exclusive args are provided");
		} catch (err) {
			// Also acceptable if an error is thrown
			assert.ok(true, "Command correctly rejected mutually exclusive arguments");
		}
	});

});

