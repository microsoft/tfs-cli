import { ExtensionComposer } from "../../extension-composer";
import { ManifestBuilder } from "../../manifest";
import { VsixComponents } from "../../merger";
import { VsixManifestBuilder } from "../../vsix-manifest-builder";
import _ = require("lodash");

export class VSSIntegrationComposer extends ExtensionComposer {
	public validate(components: VsixComponents): Q.Promise<string[]> {
		return super.validate(components).then((result) => {
			let vsixData = components.builders.filter(b => b.getType() === VsixManifestBuilder.manifestType)[0].getData();
			
			// Ensure that an Action link or a Getstarted link exists.
			let properties = _.get(vsixData, "PackageManifest.Metadata[0].Properties[0].Property", []);
			let pIds = properties.map(p => _.get(p, "$.Id"));
			
			if (_.intersection(["Microsoft.VisualStudio.Services.Links.Action", "Microsoft.VisualStudio.Services.Links.Getstarted"], pIds).length === 0) {
				result.push("An 'integration' extension must provide a 'getstarted' link.");
			}
			return result;
		});
	}
}