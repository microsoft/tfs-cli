import { ManifestBuilder } from "./manifest";
import { EOL } from "os";
import { ExtensionComposer } from "./extension-composer";
import { MergeSettings, TargetDeclaration } from "./interfaces";
import { VsixComponents } from "./merger";
import { VsixManifestBuilder } from "./vsix-manifest-builder";
import { VsoManifestBuilder } from "./targets/Microsoft.VisualStudio.Services/vso-manifest-builder";
import { VSSExtensionComposer } from "./targets/Microsoft.VisualStudio.Services/composer";
import { VSSIntegrationComposer } from "./targets/Microsoft.VisualStudio.Services.Integration/composer";
import { VSOfferComposer } from "./targets/Microsoft.VisualStudio.Offer/composer";
import _ = require("lodash");

import trace = require("../../../lib/trace");

export class ComposerFactory {
	public static GetComposer(settings: MergeSettings, targets: TargetDeclaration[]): ExtensionComposer {
		let composers: ExtensionComposer[] = [];

		// @TODO: Targets should be declared by the composer
		targets.forEach(target => {
			switch (target.id) {
				case "Microsoft.VisualStudio.Services":
				case "Microsoft.VisualStudio.Services.Cloud":
				case "Microsoft.TeamFoundation.Server":
					composers.push(new VSSExtensionComposer(settings));
					break;
				case "Microsoft.VisualStudio.Services.Integration":
				case "Microsoft.TeamFoundation.Server.Integration":
				case "Microsoft.VisualStudio.Services.Cloud.Integration":
					composers.push(new VSSIntegrationComposer(settings));
					break;
				case "Microsoft.VisualStudio.Offer":
					composers.push(new VSOfferComposer(settings));
					break;
				default:
					if (!settings.bypassValidation) {
						throw new Error(
							"'" +
								target.id +
								"' is not a recognized target. Valid targets are 'Microsoft.VisualStudio.Services', 'Microsoft.VisualStudio.Services.Integration', 'Microsoft.VisualStudio.Offer'",
						);
					}
					break;
			}
		});
		if (composers.length === 0 && targets.length === 0) {
			trace.warn(
				`No recognized targets found. Ensure that your manifest includes a target property. E.g. "targets":[{"id":"Microsoft.VisualStudio.Services"}],...${EOL}Defaulting to Microsoft.VisualStudio.Services`,
			);
			composers.push(new VSSExtensionComposer(settings));
		}

		// Build a new type of composer on the fly that is the
		// concatenation of all of the composers necessary for
		// this extension.
		let PolyComposer = (() => {
			function PolyComposer(settings) {
				this.settings = settings;
			}
			PolyComposer.prototype.getBuilders = () => {
				return _.uniqWith(
					composers.reduce((p, c) => {
						return p.concat(c.getBuilders());
					}, []),
					(b1: ManifestBuilder, b2: ManifestBuilder) => b1.getType() === b2.getType(),
				);
			};
			PolyComposer.prototype.validate = (components: VsixComponents) => {
				return Promise.all<string[]>(
					composers.reduce((p, c) => {
						return p.concat(c.validate(components));
					}, []),
				).then(multi => {
					// flatten
					return multi.reduce((p, c) => p.concat(c), []);
				});
			};
			return PolyComposer;
		})();

		return new PolyComposer(settings);
	}
}
