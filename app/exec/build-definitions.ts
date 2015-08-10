import cmdm = require('../lib/tfcommand');

export function describe(): string {
    return 'manage build definitions';
}

export function getCommand(): cmdm.TfCommand {
    // this just offers description for help and to offer sub commands
    return null;
}