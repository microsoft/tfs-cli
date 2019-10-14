import shell = require("shelljs");
import tasksBase = require("./default");

export interface TaskSignResult {
	signingSuccessful: boolean;
}

export class TaskSign extends tasksBase.BuildTaskBase<TaskSignResult> {
	constructor(args: string[]) {
		super(args);
	}

	// tfx build tasks sign --taskZipPath .\Foo\foo.zip
	// tfx build tasks sign --taskSigningManifestPath .\Foo\manifest.json
	public async exec(): Promise<TaskSignResult> {
		const taskZipPath: string | null = await this.commandArgs.taskZipPath.val();
		const taskSigningManifestPath: string | null = await this.commandArgs.taskSigningManifestPath.val();

		if (taskZipPath && taskSigningManifestPath) {
			throw new Error('Cannot provide both taskZipPath and taskSigningManifestPath.');
		}

		if (!taskZipPath && !taskSigningManifestPath) {
			throw new Error('Must provide either taskZipPath or taskSigningManifestPath.');
		}

		// verify that we can find NuGet
		const nuGetPath: string = shell.which('nuget');
		if (!nuGetPath) {
			throw new Error('Unable to find NuGet. Please add NuGet to the PATH before continuing.');
		}

		if (taskZipPath) {
			// Sign a single zip

		}

		if (taskSigningManifestPath) {
			// Process the manifest file

		}

		// TODO: Do we want to generate a manifest file optionally for them?
		// TODO: Should we allow them to pass a flag if it's in the box?

		const result: TaskSignResult = <TaskSignResult>{};

		//shell.exec


		return result;
	}

	protected getHelpArgs(): string[] {
		return ["taskZipPath", "taskSigningManifestPath"];
	}

}
