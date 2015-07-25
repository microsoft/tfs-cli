
import cm = require('./common');
import cnm = require('./connection');

export class TfCommand {
    public connection: cnm.TfsConnection;

    //
    // should return a JSON data object which will be
    // - printed in json if --json, or
    // - passed back to output for readable text
    //
    public exec(args: string[], options: cm.IOptions): Q.Promise<any> {
        var defer = Q.defer();
        defer.reject(new Error('Not implemented.  Must override'));
        return <Q.Promise<any>>defer.promise;
    }

    public output(data: any): void {
        // should override and output to console results
        // in readable text based on data from exec call
    }
}