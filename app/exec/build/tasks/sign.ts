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

  constructor(args: string[]) {
    super(args);
  }

  protected getHelpArgs(): string[] {
    return ["certFingerprint", "taskPath", "newGuid", "newNameSuffix"];
  }

  // tfx build tasks sign --task-path {TASK_PATH} --cert-fingerprint {FINGERPRINT} --new-guid {GUID} --new-name-suffix ' - SIGNED'
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
      const data: string = fs.readFileSync(taskJsonPath, "utf8");
      let taskJson: any = JSON.parse(data);

      if (newGuid) {
        taskJson.id = newGuid;
      }

      if (newNameSuffix) {
        taskJson.name = `${taskJson.name}${newNameSuffix.replace(/'/g, "")}`;
      }

      fs.writeFileSync(taskJsonPath, JSON.stringify(taskJson, null, 4));
    }

    // Write nuspec file
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
    const taskAfterSignTempFolder: string = path.join(
      tempFolder,
      "task-after-sign"
    );
    fs.mkdirSync(taskAfterSignTempFolder);
    const zip = new admZip(taskTempZipPath);
    zip.extractAllTo(taskAfterSignTempFolder);
    //await extractZip(taskTempZipPath, taskAfterSignTempFolder);

    // Copy task contents
    // This can include the new signature file as well as a modified task.json
    await this.ncpAsync(taskAfterSignTempFolder, taskZipPath);
    //shell.cp('-R', taskAfterSignTempFolder, taskZipPath)

    // Delete temp folder
    //await del(tempFolder, { force: true });
    shell.rm('-rf', tempFolder);
      // causes ENOTEMPTY a lot on Windows

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

  // Wrap ncp in Promise so we can async it
  private ncpAsync(src: string, dest: string): Promise<void> {
    return new Promise(function(resolve, reject) {
      ncp(src, dest, function(err) {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });
  }

  // Write nuspec file into contents of task
  // This allows nuget to verify the signature of the package
  // We also use this file to store what cert was used to sign the package
  private writeNuspecFile(nuspecFilePath: string, certFingerprint: string): void {
    let contents: string = '';

    contents += '<?xml version="1.0" encoding="utf-8"?>;';
    contents += '<package xmlns="http://schemas.microsoft.com/packaging/2010/07/nuspec.xsd">';
    contents += '    <metadata>';
    contents += '        <!-- Required elements-->';
    contents += '        <id></id>';
    contents += '        <version></version>';
    contents += '        <description></description>';
    contents += '        <authors></authors>';
    contents += '';
    contents += '        <!-- Optional elements -->';
    contents += `        <certificateFingerprint>${certFingerprint}</certificateFingerprint>`;
    contents += '    </metadata>';
    contents += `    <!-- Optional 'files' node -->`;
    contents += '</package>';

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
