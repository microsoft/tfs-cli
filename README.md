# Cross-platform CLI for Team Foundation Server and Visual Studio Team Services

[![NPM version](https://badge.fury.io/js/tfx-cli.svg)](http://badge.fury.io/js/tfx-cli)

Command utility for interacting with Microsoft Team Foundation Server and Visual Studio Team Services. It is cross platform and supported on Windows, OS X, and Linux.

## Setup

First, download and install [Node.js](http://nodejs.org) 4.0.x or later and NPM (included with the installer)

### Linux/OSX
```bash
sudo npm install -g tfx-cli
```

### Windows
```bash
npm install -g tfx-cli
```

## Commands

To see a list of commands:
```
tfx
```

For help with an individual command:
```
tfx <command> --help
```

> Help info is dynamically generated, so it should always be the most up-to-date authority.

### Command sets

* `tfx build` ([builds](docs/builds.md)): Queue, view, and get details for builds
* `tfx build tasks` ([build tasks](docs/buildtasks.md)): Create, list, upload and delete build tasks
* `tfx extension` ([extensions](docs/extensions.md)): Package, manage, publisher Team Foundation Server / Team Services extensions
* `tfx workitem` ([work items](docs/workitems.md)): Create, query and view work items.

### Login

To avoid providing credentials with every command, you can login once. Currently supported credential types: Personal Access Tokens and basic auth credentials.

> NTLM support is under consideration

> Warning! Using this feature will store your login credentials on disk in plain text.

#### Personal access token

Start by [creating a personal access token](http://roadtoalm.com/2015/07/22/using-personal-access-tokens-to-access-visual-studio-online) and paste it into the login command.

```bash
~$ tfx login
Copyright Microsoft Corporation

> Service URL: {url}
> Personal access token: xxxxxxxxxxxx
Logged in successfully
```

Examples of valid URLs are:

* `https://marketplace.visualstudio.com` 
* `https://youraccount.visualstudio.com/DefaultCollection`

#### Basic auth

You can alternatively use basic auth by passing `--auth-type basic` (see [Configuring Basic Auth](docs/configureBasicAuth.md)).

### Settings cache

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

If you used `--save` to set a default value for an option, you may need to override it by explicitly providing the option with a different value. You can clear any saved settings by running `tfx reset`. 

### Troubleshooting

To see detailed tracing output, you can set a value for the `TFX_TRACE` environment value and then run commands.  That may offer a clue into the problem (and will certainly help if logging an issue).

### Linux/OSX
```bash
export TFX_TRACE=1
```

### Windows
```bash
set TFX_TRACE=1
```

### PowerShell
```bash
$env:TFX_TRACE=1
```

## Contributing

We take contributions and fixes via Pull Request. [Read here](docs/contributions.md) for the details.

## Code of Conduct

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
