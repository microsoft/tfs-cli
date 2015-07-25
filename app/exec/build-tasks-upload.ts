import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');

export function describe(): string {
    return 'upload a build task';
}

export function getCommand(): cmdm.TfCommand {
    // this just offers description for help and to offer sub commands
    return new BuildTaskUpload();
}

// requires auth, connect etc...
export var isServerOperation: boolean = true;

// unless you have a good reason, should not hide
export var hideBanner: boolean = false;

export class BuildTaskUpload extends cmdm.TfCommand {
    public exec(args: string[], options: cm.IOptions): any {
        var taskPath = args[0];
        if (!taskPath) {
            throw new Error('task path not supplied.');
        }

        var result: any = {};
        result.task = { name: 'Sample Task'};
        result.source = taskPath;

        return result;
    }

    public output(data: any): void {
        console.log('source: ' + data.source);
        console.log(data.task.name + ' uploaded successfully!')
    }
}