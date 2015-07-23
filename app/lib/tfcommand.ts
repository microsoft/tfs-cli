
import cm = require('./common');

export class TfCommand {

	//
	// should return a JSON data object which will be
	// - printed in json if --json, or
	// - passed back to output for readable text
	//
	public exec(args: string[], options: cm.IOptions): any {
		// should override
		return null;
	}

	public output(data: any): void {
		// should override and output to console results
		// in readable text based on data from exec call
	}
}