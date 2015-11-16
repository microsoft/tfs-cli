# VSO Extensions Command Line Utility

[![NPM version](https://badge.fury.io/js/tfx-cli.png)](http://badge.fury.io/js/tfx-cli)

This is a utility to manage extensions for VSO.  It is cross platform and supported on Windows, OSX and Linux.

## Setup
### Tooling
This app requires [NodeJS](http://nodejs.org) and npm (included with the NodeJS installer).

### Install
```bash
sudo npm install -g tfx-cli
```
<sub>Note: Windows does not need sudo</sub>

## Help
Just type `tfx` to see a list of commands. To get help with an individual command, tpye `tfx <command> --help`.
![tfs-cli](docs/tfx-cli.png "TFS cross platform command line")

## Login
To avoid providing credentials in every command, you can login once.
Currently supported credential types are Personal Access Tokens and basic auth.
[Create a personal access token](http://roadtoalm.com/2015/07/22/using-personal-access-tokens-to-access-visual-studio-online) and paste it in the login command.
```bash
~$ tfx login
Copyright Microsoft Corporation

> Service URL: https://marketplace.visualstudio.com (for extensions) https://youraccount.visualstudio.com/DefaultCollection (other)
> Personal access token: 
Logged in successfully
```

You can alternatively use basic auth by passing `--auth-type basic` (read [Configuring Basic Auth](docs/configureBasicAuth.md)).  NTLM will come soon.

Note: Using this feature will store your login credentials on disk in plain text.

## Settings Cache
To avoid providing other options in every command, you can save options out to a settings file by adding the --save flag.

```bash
~$ tfx build list --project MyProject --definition-name println --top 5 --save

...

id              : 1
definition name : TestDefinition
requested by    : Teddy Ward
status          : NotStarted
queue time      : Fri Aug 21 2015 15:07:49 GMT-0400 (Eastern Daylight Time)

~$ tfx build list
Copyright Microsoft Corporation

...

id              : 1
definition name : TestDefinition
requested by    : Teddy Ward
status          : NotStarted
queue time      : Fri Aug 21 2015 15:07:49 GMT-0400 (Eastern Daylight Time)
```

## Command Documentation
[Build Tasks](docs/buildtasks.md): create, list, upload and delete your build tasks

[App Extensions](docs/appext.md): manage your app extensions

[Builds](docs/builds.md): manage your builds

## Troubleshooting
Check your settings file to make sure you don't have an option already set.
To see detailed tracing output, you can set a value for the TFX_TRACE environment value and then run commands.  That may offer a clue into the problem.  It will certainly help if logging an issue.

<sub>Linux/OSX</sub>
```bash
export TFX_TRACE=1
```

<sub>Windows</sub>
```bash
set TFX_TRACE=1
```

<sub>PowerShell</sub>
```bash
$env:TFX_TRACE=1
```

setting `TFX_TRACE_CREDS=1` or `TFX_TRACE_CACHE=1` will trace out cred storage.  Typically those should not be set (to avoid leaking creds when sending traces).  Only set if you are troubleshooting credentials.

## Contributing

We take contributions and fixes.  [Read here](docs/contributions.md) for the details.
