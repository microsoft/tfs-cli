import { TfCommand } from "../../../lib/tfcommand";
import args = require("../../../lib/arguments");
import cm = require("../../../lib/common");
import extBase = require("../default");
import extPubBase = require("./default");
import gallerym = require("vso-node-api/GalleryApi");
import galleryifm = require("vso-node-api/interfaces/GalleryInterfaces");
import argm = require("../../../lib/arguments");
import trace = require("../../../lib/trace");

export function getCommand(args: string[]): TfCommand<extBase.ExtensionArguments, DeletePublisherResult> {
	return new ExtensionPublisherDelete(args);
}

export interface DeletePublisherResult {
	publisher: galleryifm.Publisher;
}

export class ExtensionPublisherDelete extends extPubBase.ExtensionPublisherBase<DeletePublisherResult> {
	protected description = "Delete a Visual Studio Marketplace publisher";
	protected serverCommand = true;

	protected getHelpArgs(): string[] {
		return ["publisher"];
	}

	protected setCommandArgs(): void {
		super.setCommandArgs();
		this.registerCommandArgument("publisher", "Publisher ID", "ID of Publisher to delete.", args.StringArgument);
	}

	public exec(): Promise<DeletePublisherResult> {
		let galleryApi = this.webApi.getGalleryApi(this.webApi.serverUrl);
		return this.commandArgs.publisher.val().then(publisherName => {
			return galleryApi.deletePublisher(publisherName).then(() => {
				return <DeletePublisherResult>{
					publisher: {
						publisherName: publisherName,
					},
				};
			});
		});
	}

	protected friendlyOutput(data: DeletePublisherResult): void {
		trace.success("\n=== Completed operation: delete publisher ===");
		trace.info(" - Name: %s", data.publisher.publisherName);
	}
}
