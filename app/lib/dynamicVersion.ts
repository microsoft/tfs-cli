export class DynamicVersion {

	protected numbers: number[];

	constructor(...numbers: number[]) {
		if (numbers.some(n => n < 0)) {
			throw "Version numbers must be positive.";
		}

		if (numbers.every(n => n === 0)) {
			throw "Version must be greater than 0.0.0";
		}

		this.numbers = numbers;
	}

	/**
	 * Parse a DynamicVersion from a string.
	 */
	public static parse(version: string): DynamicVersion {
		try {
			const spl = version.split(".").map(v => parseInt(v));
			if (!spl.some(e => isNaN(e))) {
				return new DynamicVersion(...spl);
			} else {
				throw "";
			}
		} catch (e) {
			throw "Could not parse '" + version + "' as a Semantic Version.";
		}
	}

	/**
	 * Increase the last number of a dynamic version and returns the new version.
	 */
	public static increase(version: DynamicVersion): DynamicVersion {
		const newVersion = version.numbers;
		newVersion[newVersion.length - 1] = newVersion[newVersion.length - 1] + 1; 
		return new DynamicVersion(...newVersion);
	}

	/**
	 * Return a string-representation of this dynamic version, e.g. 2.10.5.42
	 */
	public toString(): string {
		return this.numbers.join(".");
	}

	/**
	 * Return -1 if this version is less than other,
	 * 1 if this version is greater than other, 
	 * and 0 if they are equal.
	 * 
	 * If this version length is less than than other 
	 * this version is less than other.
	 */
	public compareTo(other: DynamicVersion): number {
		// [2,0,7] --- [2,0,7,1]
		for (let i = 0; i < this.numbers.length && i < other.numbers.length; i++) {
			const thisV = this.numbers[i];
			const otherV = other.numbers[i];

			if (thisV < otherV) {
				return -1;
			}

			if (thisV > otherV) {
				return 1;
			}
		}

		if (this.numbers.length < other.numbers.length) {
			return -1;
		}

		if (this.numbers.length > other.numbers.length) {
			return 1;
		}

		return 0;
	}
}
