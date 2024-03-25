import { BasicCredentialHandler } from "azure-devops-node-api/handlers/basiccreds";

import url = require("url");
import apim = require("azure-devops-node-api/WebApi");
import apibasem = require("azure-devops-node-api/interfaces/common/VsoBaseInterfaces");
import trace = require("./trace");

export class TfsConnection {
	private parsedUrl: url.Url;

	private accountUrl: string;
	private collectionUrl: string;

	constructor(private serviceUrl: string) {
		this.parsedUrl = url.parse(this.serviceUrl);

		var splitPath: string[] = this.parsedUrl.path.split("/").slice(1);
		this.accountUrl = this.parsedUrl.protocol + "//" + this.parsedUrl.host;

		if (splitPath.length === 2 && splitPath[0] === "tfs") {
			// on prem
			this.accountUrl += "/" + "tfs";
		} else if (!this.parsedUrl.protocol || !this.parsedUrl.host) {
			throw new Error("Invalid service url - protocol and host are required");
		} else if (splitPath.length > 1) {
			throw new Error(
				"Invalid service url - path is too long. A service URL should include the account/application URL and the collection, e.g. https://fabrikam.visualstudio.com/DefaultCollection or http://tfs-server:8080/tfs/DefaultCollection",
			);
		} else if (splitPath.length === 0 || (splitPath[0] === "tfs" && splitPath.length === 1)) {
			throw new Error("Expected URL path (collection name missing).");
		}

		if (splitPath[0].trim() !== "" || (splitPath[0] === "tfs" && splitPath[1].trim() !== "")) {
			this.collectionUrl = this.serviceUrl;
		}
	}

	/**
	 * Returns the account URL from the given service URL
	 */
	public getAccountUrl() {
		return this.accountUrl;
	}

	/**
	 * Returns the collection URL from the given service URL
	 * if a collection is available. Otherwise, throws.
	 * @TODO maybe make this prompt for a new url?
	 */
	public getCollectionUrl() {
		if (this.collectionUrl) {
			return this.collectionUrl;
		} else {
			throw new Error(
				"Provided URL '" +
					this.serviceUrl +
					"' is not a collection-level URL. Ensure the URL contains a collection, e.g. https://fabrikam.visualstudio.com/DefaultCollection.",
			);
		}
	}
}
