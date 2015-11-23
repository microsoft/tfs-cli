import { ExtensionComposer } from "../../extension-composer";
import { ManifestBuilder } from "../../manifest";
import { VsixComponents } from "../../merger";
import { VsoManifestBuilder } from "./vso-manifest-builder";
import Q = require("q");

export class VSSExtensionComposer extends ExtensionComposer {
	public getBuilders(): ManifestBuilder[] {
		return super.getBuilders().concat([new VsoManifestBuilder(this.settings.root)]);
	}
	
	public validate(components: VsixComponents): Q.Promise<string[]> {
		return super.validate(components).then((result) => {
			let data = components.builders.filter(b => b.getType() === VsoManifestBuilder.manifestType)[0].getData();
			if (data.contributions.length === 0 && data.contributionTypes.length === 0) {
				result.push("Your extension must define at least one contribution or contribution type.");
			}
			return Q.resolve(result);
		});
	}
}