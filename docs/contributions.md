# Contributions

We accept contributions.  Supply a pull request.

## Pre-reqs

Typescript (>=1.6):
`sudo npm install tsc -g`

Install Dev Dependencies from root of repo:
`npm install`

## Build

We build the product using gulp.  Just type `gulp` in the root of the repo.

This builds the product in the _build/app directory

```bash
~/Projects/tfs-cli$ gulp
[16:26:47] Using gulpfile ~/Projects/tfs-cli/gulpfile.js
[16:26:47] Starting 'clean'...
[16:26:47] Finished 'clean' after 16 ms
[16:26:47] Starting 'compileApp'...
[16:26:47] Starting 'compileTests'...
[16:26:47] Starting 'resources'...
[16:26:47] Finished 'resources' after 39 ms
[16:26:47] Starting 'copy'...
[16:26:47] Finished 'copy' after 15 ms
[16:26:47] Compiling TypeScript files using tsc version 1.5.3
[16:26:47] Compiling TypeScript files using tsc version 1.5.3
[16:26:49] Finished 'compileTests' after 2.06 s
[16:26:49] Finished 'compileApp' after 2.87 s
[16:26:49] Starting 'build'...
[16:26:49] Finished 'build' after 16 μs
[16:26:49] Starting 'default'...
[16:26:49] Finished 'default' after 3.56 μs
```

## Install for Verification

To install the product globally without pushing the npm (you cannot, we do that), run npm install by specifying the directory instead of the name

After building, from the _build directory ...

```bash
~/Projects/tfs-cli/_build$ sudo npm install ./app -g
Password:
/usr/local/bin/tfx -> /usr/local/lib/node_modules/tfx-cli/tfx-cli.js
tfx-cli@0.1.8 /usr/local/lib/node_modules/tfx-cli
├── os-homedir@1.0.1
├── async@1.4.2
├── colors@1.1.2
├── minimist@1.1.3
├── node-uuid@1.4.3
├── q@1.4.1
├── validator@3.43.0
├── shelljs@0.5.1
├── vso-node-api@0.3.0
├── read@1.0.6 (mute-stream@0.0.5)
└── archiver@0.14.4 (buffer-crc32@0.2.5, lazystream@0.1.0, async@0.9.2, readable-stream@1.0.33, tar-stream@1.1.5, lodash@3.2.0, zip-stream@0.5.2, glob@4.3.5)
```
The product with your local changes is now installed globally.  You can now validate your changes as customers would run after installing from npm globally

## Tracing

Ensure your changes include ample tracing.  After installing your changes globally (above), set TFX_TRACE=1 (export on *nix) and run the tool with your changes.  Trace output should validate it's doing what you intended, for the reason you intended and provide tracing for others down the road.

## Unit Test

If you're changing core parts of the CL engine, ensure unit tests are run and optionally cover the changes you are making.

TODO: unit testing details (we use mocha) - pending changes


