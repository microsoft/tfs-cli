# Extensions

Package, publish, and manage Team Services and Team Foundation Server extnesions.

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

### For more information

See the [introduction to extensions](https://www.visualstudio.com/docs/integrate/extensions/overview).You will use this tool when you are ready to package and publish your Extension.

This tool will merge any number of manifest files (all in JSON format), which will then specify how to package your Extension. See the [Manifest Reference documentation](https://www.visualstudio.com/en-us/integrate/extensions/develop/manifest)

### Examples

```
tfx extension create --publisher mypublisher --manifest-globs myextension.json
```

## Publish an extension

### Usage

```
tfx extension publish
```

### Tips

* By default, `publish` first packages the extension using the same mechanism as `tfx extension create`. All options available for `create` are available for `publish`.
* If an Extension with the same ID already exists publisher, the command will attempt to update the extension.
* When you run the `publish` command, you will be prompted for a Personal Access Token to authenticate to the Marketplace. For more information about obtaining a Personal Access Token, see [Publish from the command line](https://www.visualstudio.com/en-us/integrate/extensions/publish/command-line).


### Arguments

In addition to all of the `extension create` options, the following options are available for `extension publish`:

* `--vsix`: Path to an existing VSIX (to publish or query for).
* `--share-with`: List of accounts (VSTS) with which to share the extension.

### Example

```
tfx extension publish --publisher mypublisher --manifest-globs myextension.json --share-with myaccount
```

## Other commands

* `tfx extension publisher`: Commands for creating and managing publishers.
* `tfx extension install`: Install a Visual Studio Services Extension to a list of VSTS Accounts.
* `tfx extension show`: Show information about a published extension.
* `tfx extension share`: Share an extension with an account.
* `tfx extension unshare`: Unshare an extension with an account.

For full detials, run:

```
tfx extension --help
```

