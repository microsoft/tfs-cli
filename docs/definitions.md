# Build definitions tasks

You can queue, show, and list builds using tfx.

## Queue Status

Queues a build for a given project with a given definition.

####Options
```txt
--project <string>         - Required. The name of the project to queue a build for.
AND
--definition-id <number>    - The id of the build definition to build against.
AND
--status <string>  - desired queue status (Enabled / Disabled / Paused).
```

####Example
```bash
~$ tfx build definitions queuestatus --project MyProject --definition-id 123 --status "paused"
build definition TestDefinition (current status is: Disabled)
setting definition TestDefinition to Paused

Build Definition TestDefinition Paused successfully!
```

## definition

Shows information for a given build.

####Options
```txt
--project <string> - Required. The name of the project to queue a build for.
--id <number>      - Required. The id of the build to show.
```

####Example
```bash
$ tfx build definition --project MyProject --id 1
Copyright Microsoft Corporation


name            : TestDefinition
id              : 1
revision        : 123
Created Date    : dd-mm-yyyy
Queue Status    : Enabled
type            : Build
url             : https://<MyAccount>:/MyProject>/<project-uuid>/_apis/build/Definitions/1
```

## List

Queries for a list of builds.

####Options
```txt
--project <string>        - Required. The name of the project to queue a build for.
```

####Example
```bash
~$ tfx build definitions list

Copyright Microsoft Corporation

...

id            : 1
name          : TestDefinition
type          : Build

id            : 2
name          : XamlTestDefinition
type          : Xaml

```
## export

export a build definition to Json file.

####Options
```txt
--project <string>         Project name.
--definition-id <number>  Identifies a build definition.
--definition-path <string> Local path to a Build Definition Json (default file name is <definitionName>-<definitionId>-<revision>.json).
--overwrite        Overwrite existing Build Definition Json.
--revision <number>         Get specific definition revision.

```

####Example
```bash
~$ tfx build definitions export --project MyProject --definition-id 1

Copyright Microsoft Corporation
Build Definition 1 exported successfully

```
## update

update a build definition from Json file.

####Options
```txt
--project <string>         - Required, Project name.
--definition-id <number>   - Required, Identifies a build definition.
--definition-path <string> - Required, Local path to a Build Definition.

```
####Example
```bash
~$ tfx build definitions update --project MyProject --definition-id 1 --definition-path ./TestDefinition-1-123.json
Copyright Microsoft Corporation

id            : 1
name          : TestDefinition
revision      : 124

```

## create

create a new Build definition from Json file.

####Options
```txt
--project <string>         - Required, Project name.
--definition-path <string> - Required, Local path to a Build Definition.
--name <string>            - Required, Name of the Build Definition.

```
####Example
```bash
~$ tfx build definitions create --project MyProject --definition-path ./TestDefinition-1-123.json --name NewBuildDefinition
Copyright Microsoft Corporation

id            : 2
name          : NewBuildDefinition
type          : Build

```
## delete

delete a build definition.

####Options
```txt
--project <string>			- Required, Project name.
--definition-id <number>	- Required, Identifies a build definition.
```

####Example
```bash
~$ tfx build definitions delete --project MyProject --definition-id 2
Copyright Microsoft Corporation

Build Definition 2 deleted successfully!
```