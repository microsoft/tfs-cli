import { TfCommand, CoreArguments } from "../lib/tfcommand";
import { DiskCache } from "../lib/diskcache";
import { getCredentialStore } from "../lib/credstore";
import colors = require("colors");
import os = require("os");
import trace = require("../lib/trace");

export function getCommand(args: string[]): Login {
	// this just offers description for help and to offer sub commands
	return new Login(args);
}

export interface LoginResult {
	success: boolean;
}

/**
 * Facilitates a "log in" to a service by caching credentials.
 */
export class Login extends TfCommand<CoreArguments, LoginResult> {
	protected description = "Login and cache credentials using a PAT, basic auth, or Microsoft Entra auth.";
	protected serverCommand = true;

	private async getCredentialCacheValue(authHandler: any): Promise<string> {
		const [authType, token, username, password] = await Promise.all([
			this.commandArgs.authType.val(),
			this.commandArgs.token.val(true),
			this.commandArgs.username.val(true),
			this.commandArgs.password.val(true),
		]);
		const normalizedAuthType = (authType || "pat").toLowerCase();

		if (username && password) {
			return "basic:" + username + ":" + password;
		}

		if (token) {
			return "pat:" + token;
		}

		if (normalizedAuthType === "entra") {
			return "entra";
		}

		if (normalizedAuthType === "basic") {
			return "basic:" + authHandler.username + ":" + authHandler.password;
		}

		return "pat:" + authHandler.password;
	}

	public async exec(): Promise<LoginResult> {
		trace.debug("Login.exec");
		return this.commandArgs.serviceUrl.val().then(async collectionUrl => {
			const skipCertValidation = await this.commandArgs.skipCertValidation.val(false);

			const authHandler = await this.getCredentials(collectionUrl, false);
			const webApi = await this.getWebApi({
				ignoreSslError: skipCertValidation
			});
			const locationsApi = await webApi.getLocationsApi();

			try {
				const connectionData = await locationsApi.getConnectionData();
				let tfxCredStore = getCredentialStore("tfx");
				let tfxCache = new DiskCache("tfx");
				const credString = await this.getCredentialCacheValue(authHandler);
				await tfxCredStore.storeCredential(collectionUrl, "allusers", credString);
				await tfxCache.setItem("cache", "connection", collectionUrl);
				await tfxCache.setItem("cache", "skipCertValidation", skipCertValidation.toString());
				return { success: true } as LoginResult;
			} catch (err) {
				if (err && err.statusCode && err.statusCode === 401) {
					trace.debug("Connection failed: invalid credentials.");
					throw new Error("Invalid credentials. " + err.message);
				} else if (err) {
					trace.debug("Connection failed.");
					throw new Error(
						"Connection failed. Check your internet connection & collection URL." +
							os.EOL +
							"Message: " +
							err.message,
					);
				} else {
					throw new Error("Unknown error logging in.");
				}
			}
		});
	}

	public friendlyOutput(data: LoginResult): void {
		if (data.success) {
			trace.info(colors.green("Logged in successfully"));
		} else {
			trace.error("login unsuccessful.");
		}
	}
}
