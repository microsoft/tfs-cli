import admZip = require("adm-zip");
import archiver = require("archiver");
//import del = require("del");
import { extractZip } from "../../../lib/zipUtils";
import fs = require("fs");
var ncp = require('ncp').ncp; // shell cp says "cp: omitting directory 'C:/Users/stephen/AppData/Local/Temp/task-FR6WUc/task-after-sign'"
import os = require("os");
import path = require("path");
import shell = require("shelljs");
import tasksBase = require("./default");
import trace = require("../../../lib/trace");

export interface TaskSignResult {
  signingSuccessful: boolean;
}

export function getCommand(args: string[]): BuildTaskSign {
  return new BuildTaskSign(args);
}

export class BuildTaskSign extends tasksBase.BuildTaskBase<TaskSignResult> {
  protected description = "Sign a task.";
  protected serverCommand = true;

  constructor(args: string[]) {
    super(args);
  }

  protected getHelpArgs(): string[] {
    return ["certFingerprint", "taskPath", "newGuid", "newNameSuffix"];
  }

  // tfx build tasks sign --task-path {TASK_PATH} --cert-fingerprint {FINGERPRINT} --new-guid {GUID} --new-name-suffix 'SIGNED'
  // tfx build tasks sign --task-path "D:\customtask" --cert-fingerprint 6E45D9EEE6227589D9AD56D3F29C096F84153284 --new-guid F256057D-52CB-4E38-8974-BCD36D618834 --new-name-suffix 'SIGNED'
  // node tfx-cli.js build tasks sign --task-path "D:\customtask" --cert-fingerprint 6E45D9EEE6227589D9AD56D3F29C096F84153284 --new-guid F256057D-52CB-4E38-8974-BCD36D618834 --new-name-suffix 'SIGNED'
  // --new-guid and --new-name-suffix are optional
  public async exec(): Promise<TaskSignResult> {
    const taskZipsPath: string[] | null = await this.commandArgs.taskPath.val();
    const taskZipPath = taskZipsPath[0];
    const certFingerprint:
      | string
      | null = await this.commandArgs.certFingerprint.val();
    const newGuid: string | null = await this.commandArgs.newGuid.val();
    const newNameSuffix:
      | string
      | null = await this.commandArgs.newNameSuffix.val();

    // verify that we can find NuGet
    const nuGetPath: string = shell.which("nuget");
    if (!nuGetPath) {
      throw new Error(
        "Unable to find NuGet. Please add NuGet to the PATH before continuing."
      );
    }

    const tempFolder: string = fs.mkdtempSync(path.join(os.tmpdir(), "task-"));
    trace.info(`temp folder: ${tempFolder}`);
    let taskTempFolder: string = path.join(tempFolder, "task");
    const taskTempZipPath: string = path.join(tempFolder, "task.zip");
    const taskTempNupkgPath: string = path.join(tempFolder, "task.nupkg");

    // Create temp folder
    fs.mkdirSync(taskTempFolder);

    // Copy task contents to temp folder
    shell.cp("-R", taskZipPath, taskTempFolder);

    // Task temp folder is now task\PREVIOUS_NAME
    taskTempFolder = path.join(taskTempFolder, path.basename(taskZipPath));

    // Update guid/name
    const needToUpdateTaskJson: boolean = !!newGuid || !!newNameSuffix;
    if (needToUpdateTaskJson) {
      const taskJsonPath: string = path.join(taskTempFolder, "task.json");
      const taskLocJsonPath: string = path.join(taskTempFolder, "task.loc.json");

      if (fs.existsSync(taskJsonPath)) {
        this.updateTaskMetadata(taskJsonPath, newGuid, newNameSuffix);
      }

      if (fs.existsSync(taskLocJsonPath)) {
        this.updateTaskMetadata(taskLocJsonPath, newGuid, newNameSuffix);
      }

      // \ef505e8e-03bc-4ce1-97b5-93098dee5b30.1.160.3\Strings\resources.resjson\en-US\resources.resjson"
      const resourcesPath: string = path.join(taskTempFolder, "Strings", "resources.resjson", "en-US", "resources.resjson");
      if (fs.existsSync(resourcesPath)) {
        trace.info("resources file exists, modifying");

        const data: string = fs.readFileSync(resourcesPath, "utf8");
        let taskJson: any = JSON.parse(data);

        taskJson["loc.friendlyName"] = `${taskJson["loc.friendlyName"]} ${newNameSuffix.replace(/'/g, "")}`;

        fs.writeFileSync(resourcesPath, JSON.stringify(taskJson, null, 4));
      }

      // TODO: Do we need to change friendlyName in Strings\resources.resjson\en-US\resources.resjson?
      // Does localization run for tfx installed tasks?
    }

    // Write nuspec file
    trace.info("writing nuspec file");
    const nuspecPath: string = path.join(taskTempFolder, ".nuspec");
    this.writeNuspecFile(nuspecPath, certFingerprint);

    // Zip
    await this.zipDirectory(taskTempFolder, taskTempZipPath);

    // Rename to nupkg
    fs.renameSync(taskTempZipPath, taskTempNupkgPath);

    // Sign
    const command: string = `"${nuGetPath}" sign ${taskTempNupkgPath} -CertificateFingerprint ${certFingerprint} -NonInteractive`;
    trace.info(`Executing command: '${command}'`);
    const execResult: any = shell.exec(command, { silent: true });
    if (execResult.code === 1) {
      trace.info(execResult.output);
      //await del(tempFolder, { force: true });
      shell.rm('-rf', tempFolder);

      const result: TaskSignResult = { signingSuccessful: false };
      return result;
    }

    // Rename .nupkg back to to .zip
    fs.renameSync(taskTempNupkgPath, taskTempZipPath);

    // Extract into new temp task folder
    // const taskAfterSignTempFolder: string = path.join(
    //   tempFolder,
    //   "task-after-sign"
    // );
    // fs.mkdirSync(taskAfterSignTempFolder);
    // const zip = new admZip(taskTempZipPath);
    // zip.extractAllTo(taskAfterSignTempFolder);
    //await extractZip(taskTempZipPath, taskAfterSignTempFolder);

    // Copy task contents
    // This can include the new signature file as well as a modified task.json
    // trace.info("copying task contents");
    // await this.ncpAsync(taskAfterSignTempFolder, taskZipPath);
    //shell.cp('-r', taskAfterSignTempFolder, taskZipPath)

    // await this.ensureInitialized();
    trace.info("done running ensure initialized");

    const collectionUrl = this.connection.getCollectionUrl();
    console.log("Collection URL: " + collectionUrl);
    let agentApi = await this.webApi.getTaskAgentApi(collectionUrl);







    const overwrite: boolean = false;
    trace.info("creating read stream");
    // let archive = archiver("zip");
    // archive.file()
    const archive = fs.createReadStream(taskTempZipPath);

    fs.copyFileSync(taskTempZipPath, 'D:\\runningagent\\_work\\_taskzips2\\foo.zip');

    trace.info("uploading task definition");
    await agentApi.uploadTaskDefinition(null, <any>archive, newGuid, overwrite); // TODO: Handle where the GUID isn't passed and we use existing task id.

    // Delete temp folder
    trace.info("deleting temp folder");
    //await del(tempFolder, { force: true });
    //shell.rm('-rf', tempFolder);
    trace.info(`temp folder: ${tempFolder}`); // TODO: Remove this, uncomment line above.
      // causes ENOTEMPTY a lot on Windows
    trace.info("done deleting temp folder");

    const result: TaskSignResult = { signingSuccessful: true };
    return result;
  }

  public friendlyOutput(data: TaskSignResult): void {
    trace.println();

    if (data.signingSuccessful) {
      trace.success("Task signed successfully!");
    } else {
      trace.error("Task signing failed.");
    }
  }

  // Update name and name suffix for task metadata
  // This file can be either task.json or task.loc.json
  private updateTaskMetadata(path: string, newGuid: string | null, newNameSuffix: string | null) {
    const data: string = fs.readFileSync(path, "utf8");
      let taskJson: any = JSON.parse(data);

      if (newGuid) {
        taskJson.id = newGuid;
      }

      if (newNameSuffix) { // dont replace for loc for now, see if it works. Maybe we just replace id for loc?
        // "loc.friendlyName": "Use Node.js ecosystem",
        // 
        taskJson.name = `${taskJson.name}${newNameSuffix.replace(/'/g, "")}`; // updating the name for use in yaml

        // Don't update if it's a loc string.
        // Maybe we need to update the en-us string?
        if (taskJson.friendlyName.indexOf("loc.") === -1) {
          // update friendly name if this isn't a loc file
          // this is what user created tasks have
          taskJson.friendlyName = `${taskJson.friendlyName} ${newNameSuffix.replace(/'/g, "")}`; // updating friendly name for use in the ui
        } else {
          // if there is a loc file, we want to modify the localization file instead
        }
      }

      fs.writeFileSync(path, JSON.stringify(taskJson, null, 4));
  }

  // Wrap ncp in Promise so we can async it
  // private ncpAsync(src: string, dest: string): Promise<void> {
  //   return new Promise(function(resolve, reject) {
  //     ncp(src, dest, function(err) {
  //       if (err) {
  //         reject(err);
  //       }
  //       resolve();
  //     });
  //   });
  // }

  // Write nuspec file into contents of task
  // This allows nuget to verify the signature of the package
  // We also use this file to store what cert was used to sign the package
  private writeNuspecFile(nuspecFilePath: string, certFingerprint: string): void {
    let contents: string = '';

    contents += `<?xml version="1.0" encoding="utf-8"?>${os.EOL}`;
    contents += `<package xmlns="http://schemas.microsoft.com/packaging/2010/07/nuspec.xsd">${os.EOL}`;
    contents += `    <metadata>${os.EOL}`;
    contents += `        <!-- Required elements-->${os.EOL}`;
    contents += `        <id>Task</id>${os.EOL}`;
    contents += `        <version>0.0.0</version>${os.EOL}`;
    contents += `        <description>This is used for signing only.</description>${os.EOL}`;
    contents += `        <authors>This is used for signing only.</authors>${os.EOL}`;
    contents += `${os.EOL}`;
    contents += `        <!-- Optional elements -->${os.EOL}`;
    //contents += `        <certificateFingerprint>${certFingerprint}</certificateFingerprint>${os.EOL}`; // TODO: When we sign I think we need to pass the sha256, that is what needs to be stored here as that's what we use to verify. Not the thumbprint.
    // TODO: Can we drop this and use verify and pass in multiple fingerprints to do validation instead? Test that.
    contents += `        <certificateFingerprint>F25A1708C41B49011641458B2108F230F0B968484E329ED6018BD5E8A279AABD</certificateFingerprint>${os.EOL}`; // TODO: When we sign I think we need to pass the sha256, that is what needs to be stored here as that's what we use to verify. Not the thumbprint.
    contents += `    </metadata>${os.EOL}`;
    contents += `    <!-- Optional 'files' node -->${os.EOL}`;
    contents += `</package>`;

    fs.writeFileSync(nuspecFilePath, contents);
  }

  // Helper function to zip a directory
  private zipDirectory(source: string, out: string): Promise<any> {
    const archive = archiver("zip", { zlib: { level: 9 } });
    const stream = fs.createWriteStream(out);

    return new Promise((resolve, reject) => {
      archive
        .directory(source, false)
        .on("error", err => reject(err))
        .pipe(stream);

      stream.on("close", () => resolve());
      archive.finalize();
    });
  }
}
