# Node CLI for Azure DevOps

> NOTE: If you are looking for the new _Azure DevOps CLI_, see [vsts-cli](https://github.com/microsoft/vsts-cli)

[![NPM version](https://badge.fury.io/js/tfx-cli.svg)](http://badge.fury.io/js/tfx-cli)

This is a command-line utility for interacting with _Microsoft Team Foundation Server_ and _Azure DevOps Services_ (formerly _VSTS_). It is cross platform and supported on _Windows_, _MacOS_, and _Linux_.

## Setup

First, download and install [Node.js](http://nodejs.org) 4.0.x or later and npm (included with the installer)

### Linux/OSX

```bash
sudo npm install -g tfx-cli
```

### Windows

```bash
npm install -g tfx-cli
```

## Commands

To see the list of commands:

```bash
tfx
```

For help with an individual command:

```bash
tfx <command> --help
```

> Help info is dynamically generated, so it should always be the most up-to-date authority.

### Command sets

* `tfx build` ([builds](docs/builds.md)): Queue, view, and get details for builds.
* `tfx build tasks` ([build tasks](docs/buildtasks.md)): Create, list, upload and delete build tasks.
* `tfx extension` ([extensions](docs/extensions.md)): Package, manage, publish _Team Foundation Server_ / _Azure DevOps_ extensions.
* `tfx workitem` ([work items](docs/workitems.md)): Create, query and view work items.

### Login

To avoid providing credentials with every command, you can login once. Currently supported credential types: _Personal Access Tokens_ and _basic authentication credentials_.

> NTLM support is under consideration
>
> Warning! Using this feature will store your login credentials on disk in plain text.
>
> To skip certificate validation connecting to on-prem _Azure DevOps Server_ use the `--skip-cert-validation` parameter.

#### Personal access token

Start by [creating a Personal Access Token](http://roadtoalm.com/2015/07/22/using-personal-access-tokens-to-access-visual-studio-online) and paste it into the login command.

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

You can also use basic authentication by passing the `--auth-type basic` parameter (see [Configuring Basic Auth](docs/configureBasicAuth.md) for details).

### Settings cache

To avoid providing options with every command, you can save them to a settings file by adding the `--save` flag.

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

If you used `--save` to set a default value for an option, you may need to override it by explicitly providing a different value. You can clear any saved settings by running `tfx reset`.

### Troubleshooting

To see detailed tracing output, set a value for the `TFX_TRACE` environment variable and then run commands. This may provide clues to the issue and can be helpful when logging an issue.

### Troubleshooting on Linux/OSX

```bash
export TFX_TRACE=1
```

### Troubleshooting on Windows

```bash
set TFX_TRACE=1
```

#### PowerShell

```bash
$env:TFX_TRACE=1
```

## Contributing

We accept contributions and fixes via Pull Requests. Please read the [Contributions guide](docs/contributions.md) for more details.

## Code of Conduct

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
