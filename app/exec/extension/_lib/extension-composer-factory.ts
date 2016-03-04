import { ManifestBuilder } from "./manifest";
import { ExtensionComposer } from "./extension-composer";
import { MergeSettings, TargetDeclaration } from "./interfaces";
import { VsixComponents } from "./merger";
import { VsixManifestBuilder } from "./vsix-manifest-builder";
import { VsoManifestBuilder } from "./targets/Microsoft.VisualStudio.Services/vso-manifest-builder";
import { VSSExtensionComposer } from "./targets/Microsoft.VisualStudio.Services/composer";
import { VSSIntegrationComposer } from "./targets/Microsoft.VisualStudio.Services.Integration/composer";
import { VSOfferComposer } from "./targets/Microsoft.VisualStudio.Offer/composer";
import _ = require("lodash");
import Q = require("q");
import trace = require("../../../lib/trace");

export class ComposerFactory {
	public static GetComposer(settings: MergeSettings, targets: TargetDeclaration[]): ExtensionComposer {
		let composers: ExtensionComposer[] = [];
		
		// @TODO: Targets should be declared by the composer
		targets.forEach((target) => {
			switch (target.id) {
				case "Microsoft.VisualStudio.Services" :
				case "Microsoft.VisualStudio.Services.Cloud" :
					composers.push(new VSSExtensionComposer(settings));
					break;
				case "Microsoft.VisualStudio.Services.Integration" : 
					composers.push(new VSSIntegrationComposer(settings));
					break;
				case "Microsoft.VisualStudio.Offer" :
					composers.push(new VSOfferComposer(settings));
					break;
				default :
					trace.warn("'" + target.id + "' is not a recognized target. Defualting to Microsoft.VisualStudio.Services.");
					break;
			}
		});
		if (composers.length === 0) {
			if (targets.length === 0) {
				throw "No recognized targets found. Ensure that your manifest includes a target property. E.g. \"targets\":[{\"id\":\"Microsoft.VisualStudio.Services\"}],...";
			} else {
				composers.push(new VSSExtensionComposer(settings));
			}
		}
		
		// Build a new type of composer on the fly that is the
		// concatenation of all of the composers necessary for 
		// this extension.
		let PolyComposer = (() => {
			function PolyComposer(settings) {
				this.settings = settings;
			}
			PolyComposer.prototype.getBuilders = () => {
				return composers.reduce((p, c) => {
					return p.concat(c.getBuilders());
				}, []);
			};
			PolyComposer.prototype.validate = (components: VsixComponents) => {
				return Q.all<string[]>(composers.reduce((p, c) => {
					return p.concat(c.validate(components));
				}, [])).then((multi) => {
					// flatten
					return multi.reduce((p, c) => p.concat(c), []);
				});
			};
			return PolyComposer;
		})();
		
		return new PolyComposer(settings);
	}
}