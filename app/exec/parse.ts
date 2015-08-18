import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');
import am = require('../lib/auth');
import Q = require('q');
import argm = require('../lib/arguments');
var trace = require('../lib/trace');

// export ID=tfx build get 5 | tfx parse .id
// export ID=tfx build query --top 1 | tfx parse [0].id

export function describe(): string {
    return 'parse json by piping json result from another tfx command';
}

export function getCommand(): cmdm.TfCommand {
    // this just offers description for help and to offer sub commands
    return new Parse();
}

// doesn't require auth, connect etc...
export var isServerOperation: boolean = false

// since this is parsing and assign output to script variable, we can't have banner showing
export var hideBanner: boolean = true;

export class Parse extends cmdm.TfCommand {
    requiredArguments = [argm.JSON_FILTER];
    
    public exec(args: string[], options: cm.IOptions): Q.Promise<any> {
        trace.debug('parse.exec');
        var defer = Q.defer();
        
		return this.checkArguments(args, options).then( (allArguments) => {
            var filter = allArguments[argm.JSON_FILTER.name];
    
            var contents = '';
            process.stdin.resume();  
            process.stdin.setEncoding('utf8');  
            process.stdin.on('data', function(data) {  
                contents += data.toString();
            }); 
    
            process.stdin.on('end', () => {
                try {
                    var obj = JSON.parse(contents);
                    console.log(eval('obj' + filter));
                    defer.resolve({});
                }
                catch (err) {
                    console.error(err.message);
                }
            });
        })
        .fail((err) => {
            trace.debug('Failed to gather inputs. Message: ' + err.message);
            defer.reject(err);
        })
        
        return <Q.Promise<any>>defer.promise;
    }

    public output(creds: am.ICredentials): void {
        // not s server operation
    }
}
