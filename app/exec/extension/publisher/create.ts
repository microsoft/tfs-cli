import { TfCommand } from "../../../lib/tfcommand";
import args = require("../../../lib/arguments");
import cm = require("../../../lib/common");
import extBase = require("../default");
import extPubBase = require("./default");
import galleryInterfaces = require("azure-devops-node-api/interfaces/GalleryInterfaces");
import argm = require("../../../lib/arguments");
import trace = require("../../../lib/trace");

export function getCommand(args: string[]): TfCommand<extBase.ExtensionArguments, galleryInterfaces.Publisher> {
	// this just offers description for help and to offer sub commands
	return new ExtensionPublisherCreate(args);
}

export class ExtensionPublisherCreate extends extPubBase.ExtensionPublisherBase<galleryInterfaces.Publisher> {
	protected description = "Create a Visual Studio Marketplace publisher";
	protected serverCommand = true;

	protected getHelpArgs(): string[] {
		return ["publisher", "displayName", "description"];
	}

	protected setCommandArgs(): void {
		super.setCommandArgs();
		this.registerCommandArgument("publisher", "Publisher ID", "Use this as the publisher ID.", args.StringArgument);
	}

	public async exec(): Promise<galleryInterfaces.Publisher> {
		const galleryApi = await this.getGalleryApi();

		return Promise.all([
			this.commandArgs.publisher.val(),
			this.commandArgs.displayName.val(),
			this.commandArgs.description.val(),
		]).then<galleryInterfaces.Publisher>(values => {
			const [publisherName, displayName, description] = values;
			return galleryApi.createPublisher(<galleryInterfaces.Publisher>{
				publisherName: publisherName,
				displayName: displayName,
				shortDescription: description,
				longDescription: description,
			});
		});
	}

	protected friendlyOutput(data: galleryInterfaces.Publisher): void {
		trace.success("\n=== Completed operation: create publisher ===");
		trace.info(" - Name: %s", data.publisherName);
		trace.info(" - Display Name: %s", data.displayName);
		trace.info(" - Description: %s", data.longDescription);
	}
}
