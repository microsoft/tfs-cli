# Build Tasks

You can queue, show, and list builds using tfx.

## Queue

Queues a build for a given project with a given definition.

### Options
```txt
--project <string>         - Required. The name of the project to queue a build for.
AND
--definition-id <number>    - The id of the build definition to build against.
OR
--definition-name <string>  - The name of the build definition to build against.
```

```txt
Additional optional Parameters
  --parameters  - Build process Parameters JSON file / string.
  --priority    - Queue a build with priority 1 [High] - 5 [Low] default = 3 [Normal]).
  --version   	- the source version for the queued build.
  --shelveset   - the shelveset to queue in the build.
  --demands   	- Demands string [semi-colon separator] for Queued Build [key / key -equals value].
  --wait    	- wait for the triggered build
  --timeout   	- Maximum time to wait for the build to complete (in seconds).
```

####Example
```bash
~$ tfx build queue --project MyProject --definition-name TestDefinition
Copyright Microsoft Corporation

Queued new build:
id              : 1
definition name : TestDefinition
requested by    : Teddy Ward
status          : NotStarted
queue time      : Fri Aug 21 2015 15:07:49 GMT-0400 (Eastern Daylight Time)
```

## Show

Shows information for a given build.

### Options
```txt
--project <string> - Required. The name of the project to queue a build for.
--id <number>      - Required. The id of the build to show.
```

### Example
```bash
$ tfx build show --project MyProject --id 1
Copyright Microsoft Corporation


id              : 1
definition name : TestDefinition
requested by    : Teddy Ward
status          : NotStarted
queue time      : Fri Aug 21 2015 15:07:49 GMT-0400 (Eastern Daylight Time)
```

## Details

####Options
```txt
  --project, -p  Project name.
  --build-id  Identifies a particular Build.
```

####Example
```bash
$tfx build details --project MyProject --build-id MyBuildID

Copyright Microsoft Corporation

id              : MyBuildID
number (name)   : MyBuildNumber
definition name : MyDefinition
definition id   : MyDefinitionID
requested by    : Owner
status          : InProgress
result          : unknown
queue time      : 2017-04-04T10:09:20.367Z
start time      : 2017-04-04T10:09:27.084Z
finish time     : in progress
quality         :
reason          : Manual
version         : Changeset / Commit ID
API URL         : https://MyServerURL/tfs/MyProject/BuildAPI_Guid/_apis/build/Builds/BuildID
```

## List

Queries for a list of builds.

### Options
```txt
--project <string>        - Required. The name of the project to queue a build for.
--defintion-id <number>    - The id of a build definition.
--definition-name <string> - The name of a build definition.
--status <string>         - The status of the build (eg: NotStarted, Completed).
--top <number>            - Show the first X builds that satisfy the other query criteria.
```

### Example
```bash
~$ tfx build list

Copyright Microsoft Corporation

...

id              : 1
definition name : TestDefinition
requested by    : Teddy Ward
status          : NotStarted
queue time      : Fri Aug 21 2015 15:07:49 GMT-0400 (Eastern Daylight Time)

```

