import { TfCommand } from "../lib/tfcommand";
import args = require("../lib/arguments");
import Q = require("q");

export function getCommand(args: string[]): TfCommand<any, void> {
    return new HelpCommand(args);
}

export class HelpCommand extends TfCommand<any, void> {
    constructor(passedArgs: string[]) {
        super(passedArgs);
    }
    
    public exec(cmd?: any): Q.Promise<any> {
        return this.getHelp(cmd);
    }
}