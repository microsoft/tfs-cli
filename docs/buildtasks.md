# Build Tasks

You can create, list, upload and delete build tasks with tfx.

## Permissions

You need to be in the top level Agent Pool Administrators group to manipulate tasks. [See here](https://msdn.microsoft.com/Library/vs/alm/Build/agents/admin)

Account admins can add users to that group

## Build Tasks Create

Creates a templated task ready for you to start editing

### Build Tasks Create Example

```bash
~$ tfx build tasks create
Copyright Microsoft Corporation

Enter short name > sample
Enter friendly name > Sample Task
Enter description > Sample Task for Docs
Enter author > Me

created task @ /Users/bryanmac/sample
id   : 305898e0-3eba-11e5-af7a-1181c3c6c966
name: sample

A temporary task icon was created. Replace with a 32x32 png with transparencies

~$ ls ./sample
icon.png    sample.js   sample.ps1  task.json
```

## Build Tasks Upload

You can upload a task by specifying the directory (fully qualified or relative) which has the files.

As an example we can upload the Octopus Deploy custom task.

### Build Tasks Upload Example

```bash
~$ git clone https://github.com/OctopusDeploy/OctoTFS
Cloning into 'OctoTFS'...
Checking connectivity... done.

~$ cd OctoTFS/source/CustomBuildSteps
```

It's task is in the

```bash
~$ tfx build tasks upload --task-path ./CreateOctopusRelease
```

Build tasks are cached by version on the agent. The implementation by that version is considered to be immutable. If you are changing the implementation and uploading, bump at least the patch version.

## Build Tasks List

To list the tasks that are on the server ...

### Build Tasks List Example

```bash
~$ tfx build tasks list

...

id   : 4e131b60-5532-4362-95b6-7c67d9841b4f
name : OctopusCreateRelease
friendly name : Create Octopus Release
visibility: Build,Release
description: Create a Release in Octopus Deploy
version: 0.1.2

```

## Build Tasks Delete

You can delete a task by supplying the id. Use list above to get the id
As an example, this would delete the Octopus task we uploaded above

Of course, be cautious deleting tasks.

### Build Tasks Delete Example

```bash
~/$ tfx build tasks delete --task-id 4e131b60-5532-4362-95b6-7c67d9841b4f
Copyright Microsoft Corporation

task: 4e131b60-5532-4362-95b6-7c67d9841b4f deleted successfully!
```
