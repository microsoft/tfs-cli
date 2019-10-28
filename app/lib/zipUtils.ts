import fs = require("fs");
import * as jszip from "jszip";
import path = require("path");
import * as trace from "./trace";

/**
 * Extract the contents of a zip file.
 */
export function extractZip(zipPath: string, destinationPath: string): Promise<void> {
	return new Promise((resolve, reject) => {
		fs.readFile(zipPath, async (err, data) => {
			if (err) {
				reject(err);
			} else {
				await jszip.loadAsync(data).then(async zip => {
					// Write each file in the zip to the file system in the same directory as the zip file.
					for (const fileName of Object.keys(zip.files)) {
						trace.debug("Save file " + fileName);
						await zip.files[fileName].async("nodebuffer").then(async buffer => {
							trace.debug("Writing buffer for " + fileName);
							const noLeadingFolderFileName = fileName.substr(fileName.indexOf("/"));
							const fullPath = path.join(destinationPath, noLeadingFolderFileName);
							if (fullPath.endsWith("\\")) {
								// don't need to "write" the folders since they are handled by createFolderIfNotExists().
								return;
							}
							trace.debug("Creating folder if it doesn't exist: " + path.dirname(fullPath));
							await this.createFolderIfNotExists(path.dirname(fullPath));
							fs.writeFile(fullPath, buffer, err => {
								if (err) {
									console.log("err: " + err);
									reject(err);
								}
							});
						});
					}
				});
				resolve();
			}
		});
	});
}
