# TFX extension commands

Package, publish, and manage Team Services and Team Foundation Server extensions. To learn more, see an [introduction to extensions](https://docs.microsoft.com/azure/devops/extend/overview?view=vsts).

## Get started

To learn more about TFX, its pre-reqs and how to install, see the [readme](../README.md)

## Package an extension

### Extension Create Usage

`tfx extension create`

### Extension Create Arguments

* `--root`: Root directory.
* `--manifest-js`: Manifest in the form of a standard Node.js CommonJS module with an exported function. If present then the manifests and manifest-globs arguments are ignored.
* `--env`: Environment variables passed to the manifestJs module.
* `--manifests`: List of individual manifest files (space separated).
* `--manifest-globs`: List of globs to find manifests (space separated).
* `--override`: JSON string which is merged into the manifests, overriding any values.
* `--overrides-file`: Path to a JSON file with overrides. This partial manifest will always take precedence over any values in the manifests.
* `--rev-version`: Rev the latest version number of the extension and save the result.
* `--bypass-validation`: Bypass local validation.
* `--publisher`: Use this as the publisher ID instead of what is specified in the manifest.
* `--extension-id`: Use this as the extension ID instead of what is specified in the manifest.
* `--output-path`: Path to write the VSIX.
* `--loc-root`: Root of localization hierarchy (see README for more info).

### Extension Create Examples

#### Package for a different publisher

```bash
tfx extension create --publisher mypublisher --manifest-js myextension.config.js --env mode=production
```

#### Increment (rev) the patch segment of the extension version

For example, assume the extension's version is currently `0.4.0`

```bash
tfx extension create --rev-version
```

The version included in the packaged .VSIX and in the source manifest file is now `0.4.1`.

#### Manifest JS file

Eventually you will find the need to disambiguate in your manifest contents between development and production builds. Use the `--manifest-js` option to supply a Node.JS CommonJS module and export a function. The function will be invoked with an environment property bag as a parameter, and must return the manifest JSON object.

Environment variables for the property bag are specified with the `--env` command line parameter. These are space separated key-value pairs, e.g. `--env mode=production rootpath="c:\program files" size=large`.

An example manifest JS file might look like the following:

```js
module.exports = (env) => {
  let [idPostfix, namePostfix] = (env.mode == "development") ? ["-dev", " [DEV]"] : ["", ""];

  let manifest = {
    manifestVersion: 1,
    id: `myextensionidentifier${idPostfix}`,
    name: `My Great Extension${namePostfix}`,
    ...
    contributions: [
      {
        id: "mywidgetidentifier",
        properties: {
          name: `Super Widget${namePostfix}`,
          ...
        },
        ...
      }
    ]
  }

  if (env.mode == 'development') {
    manifest.baseUri = "https://localhost:3000";
  }

  return manifest;
}
```

## Publish an extension

### Extension Publish Usage

```bash
tfx extension publish
```

### Extension Publish Arguments

In addition to all of the `extension create` options, the following options are available for `extension publish`:

* `--vsix`: Path to an existing VSIX (to publish or query for).
* `--share-with`: List of accounts (VSTS) with which to share the extension.
* `--nowait-validation`: Use this paramater if you or the pipeline don’t want to wait for the CLI tool to complete. The extension is published and available in the Marketplace only after completion successful validation.

### Extension Publish Example

```bash
tfx extension publish --publisher mypublisher --manifest-js myextension.config.js --env mode=development --share-with myaccount
```

### Tips

1. By default, `publish` first packages the extension using the same mechanism as `tfx extension create`. All options available for `create` are available for `publish`.
2. If an Extension with the same ID already exists publisher, the command will attempt to update the extension.
3. When you run the `publish` command, you will be prompted for a Personal Access Token to authenticate to the Marketplace. For more information about obtaining a Personal Access Token, see [Publish from the command line](https://docs.microsoft.com/azure/devops/extend/publish/command-line?view=vsts).

## Other commands

* `tfx extension install`: Install a Visual Studio Services Extension to a list of VSTS Accounts.
* `tfx extension show`: Show information about a published extension.
* `tfx extension share`: Share an extension with an account.
* `tfx extension unshare`: Unshare an extension with an account.
* `tfx extension isvalid`: Checks if an extension is valid.

For more details on a specific command, run:

```bash
tfx extension {command} --help
```
