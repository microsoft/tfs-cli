import { exec } from "child_process";
import { promisify } from "util";
import trace = require("./trace");

const execAsync = promisify(exec);

const AZURE_DEVOPS_SCOPE = "https://app.vssps.visualstudio.com/.default";
const AZURE_DEVOPS_RESOURCE = "499b84ac-1321-427f-aa17-267ca6975798";
const ENTRA_TOKEN_ENV_VAR = "TFX_ENTRA_TOKEN";

function isAzureCliMissing(err: any): boolean {
	const errorText = [err && err.stderr, err && err.message]
		.filter(message => !!message)
		.map(message => String(message))
		.join("\n")
		.toLowerCase();

	if (err && err.code === "ENOENT") {
		return true;
	}

	return (
		errorText.includes("'az' is not recognized as an internal or external command") ||
		errorText.includes('"az" is not recognized as an internal or external command') ||
		errorText.includes("the term 'az' is not recognized") ||
		errorText.includes("az: not found") ||
		errorText.includes("az: command not found") ||
		(errorText.includes("az account get-access-token") && errorText.includes("operable program or batch file"))
	);
}

function getAzureCliMissingError(): Error {
	return new Error(
		"Azure CLI (az) is required for Microsoft Entra authentication. Install Azure CLI and run 'az login' (or 'az login --service-principal' / 'az login --identity'), or set TFX_ENTRA_TOKEN.",
	);
}

function getEntraTokenFromEnvironment(): string {
	const token = process.env[ENTRA_TOKEN_ENV_VAR];
	if (token && token.trim()) {
		trace.debug(`Using Microsoft Entra token from ${ENTRA_TOKEN_ENV_VAR}.`);
		return token.trim();
	}

	return null;
}

async function getTokenFromAzureCli(command: string): Promise<string> {
	trace.debug(`Acquiring Microsoft Entra token with Azure CLI: ${command}`);
	const result = await execAsync(command);
	const token = result.stdout && result.stdout.trim();

	if (!token) {
		throw new Error("Azure CLI returned an empty access token.");
	}

	return token;
}

function getAzureCliErrorMessage(err: any): string {
	if (err && err.stderr && String(err.stderr).trim()) {
		return String(err.stderr).trim();
	}

	if (err && err.message && String(err.message).trim()) {
		return String(err.message).trim();
	}

	return null;
}

export async function getEntraAccessToken(): Promise<string> {
	const envToken = getEntraTokenFromEnvironment();
	if (envToken) {
		return envToken;
	}

	const scopeCommand = `az account get-access-token --only-show-errors --scope "${AZURE_DEVOPS_SCOPE}" --query accessToken -o tsv`;
	try {
		return await getTokenFromAzureCli(scopeCommand);
	} catch (scopeError) {
		if (isAzureCliMissing(scopeError)) {
			throw getAzureCliMissingError();
		}

		const resourceCommand = `az account get-access-token --only-show-errors --resource ${AZURE_DEVOPS_RESOURCE} --query accessToken -o tsv`;
		try {
			return await getTokenFromAzureCli(resourceCommand);
		} catch (resourceError) {
			if (isAzureCliMissing(resourceError)) {
				throw getAzureCliMissingError();
			}

			const details = [getAzureCliErrorMessage(scopeError), getAzureCliErrorMessage(resourceError)]
				.filter(message => !!message)
				.filter((message, index, messages) => messages.indexOf(message) === index);

			let message =
				"Unable to acquire a Microsoft Entra access token. Run 'az login' (or 'az login --service-principal' / 'az login --identity') first, or set TFX_ENTRA_TOKEN.";

			if (details.length > 0) {
				message += " Azure CLI output: " + details.join(" ");
			}

			throw new Error(message);
		}
	}
}