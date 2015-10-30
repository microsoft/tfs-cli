import { TfCommand, CoreArguments } from "../lib/tfcommand";
import common = require("../lib/common");
import path = require("path");
import Q = require("q");
import trace = require("../lib/trace");

export function getCommand(args: string[]): TfCommand<CoreArguments, SemanticVersion> {
    return new Version(args);
}

export interface SemanticVersion {
    major: number;
    minor: number;
    patch: number;
}

export class Version extends TfCommand<CoreArguments, SemanticVersion> {
    protected description = "Output the version of this tool.";
    
    public exec(): Q.Promise<SemanticVersion> {
        trace.debug('version.exec');
        var packageJson = require(path.join(common.APP_ROOT, "../../package.json"));
        return Q.resolve(this.parseVersion(packageJson.version));
    }
    
    private parseVersion(version: string): SemanticVersion {
        try {
            let spl = version.split(".").map(v => parseInt(v));
            if (spl.length === 3) {
                return {
                    major: spl[0],
                    minor: spl[1],
                    patch: spl[2]
                };
            } else {
                throw "";
            }
        } catch (e) {
            throw "Could not parse version '" + version + "'.";
        }
    }

    public friendlyOutput(data: SemanticVersion): void {
        trace.info('Version %s', data.major + "." + data.minor + "." + data.patch);
    }
}