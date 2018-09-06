import common = require("./common");
import path = require("path");
import { DynamicVersion } from "./dynamicVersion";

export class SemanticVersion extends DynamicVersion {
	constructor(public major: number, public minor: number, public patch: number) {
		super(major, minor, patch);
	}

	/**
	 * Parse a Semantic Version from a string.
	 */
	public static parse(version: string): SemanticVersion {
		try {
			const spl = version.split(".").map(v => parseInt(v));
			if (spl.length === 3 && !spl.some(e => isNaN(e))) {
				return new SemanticVersion(spl[0], spl[1], spl[2]);
			} else {
				throw "";
			}
		} catch (e) {
			throw new Error("Could not parse '" + version + "' as a Semantic Version.");
		}
	}
}

export function getTfxVersion(): Promise<SemanticVersion> {
	let packageJson = require(path.join(common.APP_ROOT, "package.json"));
	return Promise.resolve(SemanticVersion.parse(packageJson.version));
}
