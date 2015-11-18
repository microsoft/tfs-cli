import common = require("./common");
import path = require("path");
import Q = require("q");

export class SemanticVersion {
	
	constructor(public major: number, public minor: number, public patch: number) {
		if (major < 0 || minor < 0 || patch < 0) {
			throw "Version numbers must be positive.";
		}
		if (major === 0 && minor === 0 && patch === 0) {
			throw "Version must be greater than 0.0.0";
		}
	}
	
	/**
	 * Parse a Semantic Version from a string.
	 */
	public static parse(version: string): SemanticVersion {
		try {
			let spl = version.split(".").map(v => parseInt(v));
			if (spl.length === 3) {
				return new SemanticVersion(spl[0], spl[1], spl[2]);
			} else {
				throw "";
			}
		} catch (e) {
			throw "Could not parse '" + version + "' as a Semantic Version.";
		}
	}
	
	/**
	 * Return a string-representation of this semantic version, e.g. 2.10.5
	 */
	public toString(): string {
		return [this.major, this.minor, this.patch].join(".");
	}
	
	/**
	 * Return -1 if this version is less than other,
	 * 1 if this version is greater than other, 
	 * and 0 if they are equal.
	 */
	public compareTo(other: SemanticVersion): number {
		if (this.major < other.major) {
			return -1;
		} 
		if (this.major > other.major) {
			return 1;
		}
		if (this.minor < other.minor) {
			return -1;
		} 
		if (this.minor > other.minor) {
			return 1;
		}
		if (this.patch < other.patch) {
			return -1;
		} 
		if (this.patch > other.patch) {
			return 1;
		}
		return 0;
	}
}

export function getTfxVersion(): Q.Promise<SemanticVersion> {
	let packageJson = require(path.join(common.APP_ROOT, "package.json"));
	return Q.resolve(SemanticVersion.parse(packageJson.version));
}