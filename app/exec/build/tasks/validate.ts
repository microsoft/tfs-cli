import { TfCommand } from "../../../lib/tfcommand";
import agentContracts = require('vso-node-api/interfaces/TaskAgentInterfaces');
import archiver = require('archiver');
import args = require("../../../lib/arguments");
import fs = require('fs');
import path = require('path');
import tasksBase = require("./default");
import trace = require('../../../lib/trace');
import vm = require('../../../lib/jsonvalidate')

export function getCommand(args: string[]): BuildTaskValidate {
	return new BuildTaskValidate(args);
}

var c_taskJsonFile: string = 'task.json';

export class BuildTaskValidate extends tasksBase.BuildTaskBase<agentContracts.TaskDefinition> {
	protected description = "Upload a Build Task.";
	protected serverCommand = true;

	protected getHelpArgs(): string[] {
		return ["taskPath", "overwrite"];
	}

	public exec(): any {
		console.log('validate success');
	}

	public friendlyOutput(data: agentContracts.TaskDefinition): void {
		trace.println();
		trace.success('Validate successfully!', data.sourceLocation);
	}
}