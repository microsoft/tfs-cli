# Node CLI for Azure DevOps

> NOTE: If you are looking for the new Azure DevOps CLI, see [vsts-cli](https://github.com/microsoft/vsts-cli)

[![NPM version](https://badge.fury.io/js/tfx-cli.svg)](http://badge.fury.io/js/tfx-cli)
#### Internal Deploy / Pull Request validation
[![build passing](https://shfeldma.visualstudio.com/_apis/public/build/definitions/f4b6db46-e446-49f0-a424-0bfb52c0925d/2/badge)](https://shfeldma.visualstudio.com/_apis/public/build/definitions/f4b6db46-e446-49f0-a424-0bfb52c0925d/2/badge)

Command utility for interacting with Microsoft Team Foundation Server and Azure DevOps Services (formerly VSTS). It is cross platform and supported on Windows, OS X, and Linux.

## Setup

First, download and install [Node.js](http://nodejs.org) 7.0.x or later and NPM (included with the installer or from sources)

### Linux/OSX
```bash
sudo -E npm install -g tfx-cli
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
* `tfx build definition` ([build definition/definitions](docs/definitions.md)): Create, manage, show, list, export, upload and delete build definitions
* `tfx extension` ([extensions](docs/extensions.md)): Package, manage, publisher Team Foundation Server / Azure DevOps extensions
* `tfx workitem` ([work items](docs/workitems.md)): Create, query and view work items.

### Login

To avoid providing credentials with every command, you can login once. Currently supported credential types: Personal Access Tokens and basic auth credentials.

> NTLM support is under consideration

> Warning! Using this feature will store your login credentials on disk in plain text.

> To skip certificate validation connecting to On-Prem Azure DevOps Server you can use parameter `--skip-cert-validation`

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

To avoid providing other options in every command, you can save options out to a settings file by adding the `--save` flag.

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

## Manual installation (from sources)
* refer to installation for your OS (and follow the installation steps).
* clone the repository.
* to compile the sources run (see additional node modules):
```bash 
npm update
npm run build `(from the repository root)`
```
`link the executable (and make executable)`
### Linux (bash)
```bash
sudo ln -s <repository root>\app.js /usr/bin/tfx
sudo chmod 755 /usr/bin/tfx
```
### windows 
replace the content of `%appdata%\npm\tfx.cmd` with the following: 
```bash
@IF EXIST "%~dp0\node.exe" (
  "%~dp0\node.exe"  "%~dp0\node_modules\tfx-cli\_build\app.js" %*
) ELSE (
  @SETLOCAL
  @SET PATHEXT=%PATHEXT:;.JS;=;%
  node  "%~dp0\node_modules\tfx-cli\_build\app.js" %*
)
```
### additional node modules
`run "npm outdated / update" to resolve modules dependecy or install the following modules (this may need to happen befor compilation)`
```bash
npm install archiver colors graceful-fs gulp-filter gulp-mocha gulp-tsb gulp-util is-utf8 pug jszip node-uuid prompt q readable-stream ts-promise typescript unique-stream user-home validator azure-devops-node-api xml2js del os-homedir copy-paste shelljs lodash minimatch@3.0.2 pretty-hrtime liftoff tildify interpret v8flags minimist onecolor winreg glob json-in-place mkdirp
```
