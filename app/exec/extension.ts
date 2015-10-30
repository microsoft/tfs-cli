import cmdm = require('../lib/tfcommand');

export function describe(): string {
    return 'manage Visual Studio Online and Team Foundation Server extensions';
}

export function getCommand(): cmdm.TfCommand {
    return null;
}