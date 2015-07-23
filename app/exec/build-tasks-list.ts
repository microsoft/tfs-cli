import cmdm = require('../lib/tfcommand');
import cm = require('../lib/common');

export function describe(): string {
	return 'list build tasks';
}

export function getCommand(): cmdm.TfCommand {
	// this just offers description for help and to offer sub commands
	return new BuildTaskList;
}

export class BuildTaskList implements cmdm.TfCommand {
	public exec(args: string[], options: cm.IOptions): any {
		return [
			{
				id: 'guid1',
				name: 'Task 1'
			},
			{
				id: 'guid2',
				name: 'Task 2'
			}
		];
	}

	public output(data: any): void {
		if (!data) {
			throw new Error('no tasks supplied');
		}

		if (!(data instanceof Array)) {
			throw new Error('expected an array of tasks');
		}

		data.forEach((task) => {
			console.log();
			console.log('id   : ' + task.id);
			console.log('name : ' + task.name);
		});
	}	
}