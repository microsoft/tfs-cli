import * as assert from "assert";
import { PassThrough } from "stream";
import type { CoreArguments } from "../app/lib/tfcommand";
import type * as ArgsModule from "../app/lib/arguments";
import type * as CommonModule from "../app/lib/common";
import { BasicCredentialHandler } from "azure-devops-node-api/handlers/basiccreds";

type TfCommandConstructor = typeof import("../app/lib/tfcommand").TfCommand;
const args = require("../../_build/lib/arguments") as typeof import("../app/lib/arguments");
const common = require("../../_build/lib/common") as typeof import("../app/lib/common");
const { TfCommand } = require("../../_build/lib/tfcommand") as {
	TfCommand: TfCommandConstructor;
};

class CredentialTestCommand extends TfCommand<CoreArguments, void> {
	protected serverCommand = false;
	protected description = "Credential test command";
	private inputStreamOverride?: NodeJS.ReadStream;

	constructor(argsList: string[] = []) {
		super(argsList);
	}

	public setInputStream(stream: NodeJS.ReadStream): void {
		this.inputStreamOverride = stream;
	}

	protected exec(): Promise<void> {
		return Promise.resolve();
	}

	public getCredentialsForTest(serviceUrl: string = "https://example.com", useCredStore = false): Promise<BasicCredentialHandler> {
		return this.getCredentials(serviceUrl, useCredStore);
	}

	protected getInputStream(): NodeJS.ReadStream {
		return this.inputStreamOverride || super.getInputStream();
	}
}

class MockReadable extends PassThrough {
	public isTTY = false;

	constructor(private readonly tokenValue: string) {
		super();
		// Defer writing until after consumers have a chance to attach listeners.
		process.nextTick(() => {
			this.write(this.tokenValue);
			this.end();
		});
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
	const originalEnvToken = process.env.AZURE_DEVOPS_TOKEN;

	before(() => {
		commonModule.EXEC_PATH = ["tests", "credentials"];
		originalGetOptionsCache = argsModule.getOptionsCache;
		argsModule.getOptionsCache = () => Promise.resolve({});
	});

	after(() => {
		argsModule.getOptionsCache = originalGetOptionsCache;
		process.env.AZURE_DEVOPS_TOKEN = originalEnvToken;
	});

	afterEach(() => {
		process.env.AZURE_DEVOPS_TOKEN = undefined;
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

	it("still prefers explicit token argument when stdin is present", async () => {
		const stdinToken = "STDIN_TOKEN_SHOULD_BE_IGNORED";
		const argToken = "ARG_TOKEN_PRIORITY_STDIN";
		const mockStdin = new MockReadable(stdinToken) as unknown as NodeJS.ReadStream;
		const command = new CredentialTestCommand(["--token", argToken]);
		command.setInputStream(mockStdin);
		const handler = await command.getCredentialsForTest();

		assert.equal(handler.username, "OAuth");
		assert.equal(handler.password, argToken);
	});
});
