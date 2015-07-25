import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');
import am = require('../lib/auth');
import Q = require('q');

export function describe(): string {
	return 'login and cache credentials';
}

export function argsFormat(): string {
	return '<url> --username <username> --password <password>';
}

export function getCommand(): cmdm.TfCommand {
	// this just offers description for help and to offer sub commands
	return new Login();
}

export class Login extends cmdm.TfCommand {
	public exec(args: string[], options: cm.IOptions): Q.Promise<am.ICredentials> {
		var defer = Q.defer();

		// TODO: validate valid url

		// TODO: cache credentials here

		// TODO: connect - store current url in home dir

		var cred: am.ICredentials = this.connection.credentials;
		if (!cred) {
			defer.reject('Credentials not supplied');
		}
		else {
			console.log(JSON.stringify(cred, null, 2));
			defer.resolve(cred);	
		}
		
		return <Q.Promise<am.ICredentials>>defer.promise;
	}

	public output(creds: am.ICredentials): void {
		console.log('logged in successfully');
	}
}