# Extensions

You can manage your Visual Studio Marketplace Extensions with tfx.

## Create An Extension Package
For information about creating an Extension for the Visual Studio Marketplace, visit the [Extensions Overview documentation](https://www.visualstudio.com/integrate/extensions/overview). You will use this tool when you are ready to package and publish your Extension.

This tool will merge any number of manifest files (all in JSON format), which will then specify how to package your Extension. See the [Manifest Reference documentation](https://www.visualstudio.com/en-us/integrate/extensions/develop/manifest) for more information about how to author an Extension Manifest.

To package your extension, type `tfx extension create` from the root of your extension folder. Additionally, you may specify any of the following options:

```
  --root               Root directory.
  --manifest-globs     List of globs to find manifests.
  --override           JSON string which is merged into the manifests, overriding any values.
  --bypass-validation  Bypass local validation.
  --publisher          Use this as the publisher ID instead of what is specified in the manifest.
  --extension-id       Use this as the extension ID instead of what is specified in the manifest.
  --output-path        Path to write the VSIX.
```
You can also view this help by typing `tfx extension create --help`.

### Example
```
tfx extension create --publisher mypublisher --manifest-globs myextension.json
```

## Publish An Extension
When you're ready to push your Extension to the Visual Studio Marketplace, you can use the `publish` command. By default, `publish` will first package your extension using the same mechanism as `tfx extension create`. Therefore, all the options available in `create` are available to `publish`.

When you run the `publish` command, you will be prompted for a Personal Access Token to authenticate to the Marketplace. For more information about obtaining a Personal Access Token, see [Publish from the command line](https://www.visualstudio.com/en-us/integrate/extensions/publish/command-line).

In addition to all of the `extension create` options, the following options are available for `publish`:
```
Arguments:
  --vsix               Path to an existing VSIX (to publish or query for).
  --share-with         List of VSTS accounts with which to share the extension.

Global server command arguments:
  --auth-type    Method of authentication ('pat' or 'basic').
  --username     Username to use for basic authentication.
  --password     Password to use for basic authentication.
  --token        Personal access token.
  --service-url  URL to the VSS Marketplace.
```

Note: If an Extension with the same ID already exists for your Publisher, the command will attempt to **update** that extension.

### Example
```
C:\myextension>tfx extension publish --publisher mypublisher --manifest-globs myextension.json --share-with myaccount

Copyright Microsoft Corporation
Checking if this extension is already published
It is, update the extension
Waiting for server to validate extension package...
Sharing extension with myaccount.

=== Completed operation: publish extension ===
 - Packaging: C:\myextension\mypublisher.myextension-0.1.0.vsix
 - Publishing: success
 - Sharing: shared with myaccount
```

## Other Extension commands
To see a list of all Extensions commands, type `tfx extension --help`.