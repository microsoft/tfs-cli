# App Extension Commands

You can manage your visual studio app market extensions page with tfx.

Ported from Microsoft/vso-extension-tools.  See: https://github.com/Microsoft/vso-extension-tools

## Permissions
You need to have a visual studio online account to create extensions at [http://app.market.visualstudio.com]
You must login by running

```bash
tfx login
```
And entering the collection URL for your visual studio online account (eg: https://yourname.visualstudio.com/DefaultCollection) and a personal access token (or alternate credentials, if you set --authtype basic)
To get a personal access token, navigate to `https://<your_account_url>/_details/security/tokens` and **Add** a new token for **All accessible accounts** and **All scopes**. Copy and paste the generated token into the settings.vset.json file.

### Prep your manifest(s)
This tool will merge any number of manifest files (all in JSON format) into the required .vsomanifest and .vxismanifest files. If you are using this tool with an extension for the first time, you may need to add a few things to your manifest:

<ol>
    <li>Add <code>"publisher": "yourpublishername"</code> to the manifest. "yourpublishername" should be replaced by the <strong>same name as the publisher you created in the Gallery</strong>.</li>
    <li>
        <p>Update the <code>icon</code> property to <code>icons</code>. Currently, we support a <code>default</code> and a <code>wide</code> icon. For example:</p>
        <p>
            <pre><code>"icons": {
    "default": "images/fabrikam-default.png",
    "wide": "images/fabrikam-wide.png"
}
            </code></pre>
        </p>
        <p>
            <strong>Note</strong>: Paths should be relative to the manifest file.
        </p>
    </li>
    <li>
        Additionally, you may want to add properties for <code>"tags"</code> and <code>"categories"</code>, each of which should be a list of strings. The following strings are valid categories: 
        <ul>
            <li>Build and release</li>
            <li>Collaboration</li>
            <li>Customer support</li>
            <li>Planning</li>
            <li>Productivity</li>
            <li>Sync and integration</li>
            <li>Testing</li>
        </ul>
    </li>
    <li>Extensions will be private by default. To specify a public extension, add <code>"public": true</code>.</li>
</ol>

## Publisher Create

Creates a publisher id that you can publish extensions as.

####Options
```txt
--publisher <string>          - Required. The formal name of the publisher to create.
--displayname <string>        - Required. The display name of the publisher. eg what shows up on the app market page.
--description "<long string>" - Required. A description of your publisher.
```

Because these are all required, the '--[optionflag]' bit is not actually required. Typing
```bash
~$ extension publisher create MyName Me description
```
would be sufficient.

####Example
```bash
~$ extension publisher create --publisher MyName --displayname Me --description description
Copyright Microsoft Corporation

Successfully created publisher
name    : MyName
display name: Me
description : description

```

## Publisher Delete

Deletes one of your existing extension publishers.

####Options
```txt
--publisher <string>  - Required. The formal name of the publisher to delete.
or just <string>
```

####Example
```bash
~$ extension publisher delete --name MyName
Copyright Microsoft Corporation

Successfully deleted publisher MyName

```

## Create

This command packages a VSIX file with your extension manifest and your assets, ready to be published to the Gallery. First, we load all the manifests matched by the manifest-glob option, parse them as JSON, and attempt to merge them all into a single object. This allows you to maintain your manifest as several files, split into logical components. Then the VSIX package is generated and written to the file system.

You have two options for supplying inputs to this command: using command-line flags or using a settings file (see below). Otherwise, the following defaults will be used:

* `outputPath`: *current working directory*/*publisher*.*extension_namespace*-*version*.vsix
* `root`: *current working directory*
* `manifestGlob`: \*\*/\*-manifest.json

Or you can override these with their corresponding command line options with the same names.

####Example
```bash
~$ extension create --outputpath ./output/MyName.my-extension-0.1.0.vsix --manifestglob ./info/my-extension.json --root ./info
Copyright Microsoft Corporation

Merged successfully

Successfully created package at [cwd]\output\MyName.my-extension-0.1.0.vsix

```

## Publish

This command publishes a VSIX file to the Gallery. The VSIX can either be generated (default) or specified manually. You must specify two options for publishing:

####Options
```txt
--vsix <string>  - If specified, publishes the VSIX at this path instead of auto-packaging.
--with <string>  - If specified, share the extension with the comma-separated list of accounts (private extensions only).
```

If you do not specify the `--vsix` argument, the tool will first package the VSIX. In this case, you may additionally specify the arguments from the package section or rely on the defaults.

####Example
```bash
~$ tfx extension publish --vsix output/MyName.my-extension-0.1.0.vsix --with "[billg]"

Copyright Microsoft Corporation

Extension not yet published, creating a new extension,
Waiting for server to validate extension package...

Successfully published VSIX from output\MyName.my-extension-0.1.0.vsix to the gallery.
Extension shared successfully with: billg

```

## Migrate
Use this command to migrate a manifest to the new model introduced in M85. For any items that may require your attention, you will see a warning.

Migrate requires two arguments, `manifestpath` and `publisher`. The 3rd argument, `outputpath`, is optional.
`manifestpath` - Specify an absolute or relative path to the manifest you wish to migrate to M85.
`publisher` - Specify the name of the publisher you created in the VSO Gallery.
`outputpath` - Specify an absolute or relative path to write the upgraded JSON. If omitted, overwrite the original file at `path_to_manifest`.

If there already exists a file at `outputpath` (or if it is omitted), you must specify `--force` to overwrite that file. 

#### Examples
`tfx extension migrate extension.json MyPublisher extension-m85.json` - Migrate and write the result to extension-m85.json.
`tfx extension migrate extension.json MyPublisher --force` - Migrate and overwrite the original file. 

## Sharing & Extension Info
You can use the commands `show`, `share`, and `unshare` to get information about a published extension, share a published extension (private), and un-share a published extension (private), respectively.

For each of these commands you must specify the extension, either by providing a path to the VSIX that was published, or by providing the publisher ID and extension ID.

####Options
```txt
--vsix <string>      - Path to the VSIX that was published.
OR
--publisher <string> - ID of the publisher of the extension
--extension <string> - ExtensionId
```

#### Examples
`tfx extension show --publisher MyName --extension my-extension` - Show information about the "my-extension" extension published by MyName.

`tfx extension show --vsix C:/temp/path/to.vsix` - Show information about the indicated *published* VSIX.

`tfx extension share --publisher MyName --extension my-private-extension --with "[billg,mom]"` - Share the "my-private-extension" extension with the billg and mom accounts.

`tfx extension unshare --publisher fabrikam --extension my-private-extension --with "[billg,mom]"` - Un-share the "my-private-extension" extension with the billg and mom accounts.

```bash
PS C:\demo\spellcheck-extension> tfx extension share --vsix output/MyName.my-extension-0.1.0.vsix --with "[mom,dad]"
Copyright Microsoft Corporation


Extension shared successfully with: mom, dad
```