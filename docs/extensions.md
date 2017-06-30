# TFX extension commands

Package, publish, and manage Team Services and Team Foundation Server extensions. To learn more, see an [introduction to extensions](https://www.visualstudio.com/docs/integrate/extensions/overview).

## Get started

To learn more about TFX, its pre-reqs and how to install, see the [readme](../README.md)

## Package an extension

### Usage

`tfx extension create`

### Arguments

* `--root`: Root directory.
* `--manifests`: List of individual manifest files (space separated).
* `--manifest-globs`: List of globs to find manifests (space separated).
* `--override`: JSON string which is merged into the manifests, overriding any values.
* `--overrides-file`: Path to a JSON file with overrides. This partial manifest will always take precedence over any values in the manifests.
* `--rev-version`: Rev the patch-version of the extension and save the result.
* `--bypass-validation`: Bypass local validation.
* `--publisher`: Use this as the publisher ID instead of what is specified in the manifest.
* `--extension-id`: Use this as the extension ID instead of what is specified in the manifest.
* `--output-path`: Path to write the VSIX.
* `--loc-root`: Root of localization hierarchy (see README for more info).

### Examples

#### Package for a different publisher

```
tfx extension create --publisher mypublisher --manifest-globs myextension.json
```

#### Increment (rev) the patch segment of the extension version

For example, assume the extension's version is currently `0.4.0`

```
tfx extension create --rev-version
```

The version included in the packaged .VSIX and in the source manifest file is now `0.4.1`.

### Tips

1. This tool will merge any number of manifest files (all in JSON format), which will then specify how to package your Extension. See the [Manifest Reference documentation](https://www.visualstudio.com/en-us/integrate/extensions/develop/manifest)

## Publish an extension

### Usage

```
tfx extension publish
```

### Arguments

In addition to all of the `extension create` options, the following options are available for `extension publish`:

* `--vsix`: Path to an existing VSIX (to publish or query for).
* `--share-with`: List of accounts (VSTS) with which to share the extension.

### Examples

```
tfx extension publish --publisher mypublisher --manifest-globs myextension.json --share-with myaccount
```

#### Install/update an extension for an on-premise (hosted) TFS instance

```
tfx extension publish --service-url <root-tfs-url> --token <personal-access-token>
```

### Tips

1. By default, `publish` first packages the extension using the same mechanism as `tfx extension create`. All options available for `create` are available for `publish`.
2. If an Extension with the same ID already exists publisher, the command will attempt to update the extension.
3. When you run the `publish` command, you will be prompted for a Personal Access Token to authenticate to the Marketplace. For more information about obtaining a Personal Access Token, see [Publish from the command line](https://www.visualstudio.com/en-us/docs/integrate/extensions/publish/command-line). You can also use the `--token <personal-access-token>` flag to avoid having to fill in the prompt every time you publish.



## Other commands

* `tfx extension publisher`: Commands for creating and managing publishers.
* `tfx extension install`: Install a Visual Studio Services Extension to a list of VSTS Accounts.
* `tfx extension show`: Show information about a published extension.
* `tfx extension share`: Share an extension with an account.
* `tfx extension unshare`: Unshare an extension with an account.

For more details on a specific command, run:

```bash
tfx extension {command} --help
```

