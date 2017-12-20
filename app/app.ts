import command = require("./lib/command");
import common = require("./lib/common");
import errHandler = require("./lib/errorhandler");
import loader = require("./lib/loader");
import path = require("path");

// Set app root
common.APP_ROOT = __dirname;

namespace Bootstrap {
    export async function begin() {
        const cmd = await command.getCommand();
        common.EXEC_PATH = cmd.execPath;

        const tfCommand = await loader.load(cmd.execPath, cmd.args);
        await tfCommand.showBanner();
        const executor = await tfCommand.ensureInitialized();
        return executor(cmd);
    }
}

// Version check
const nodeVersion = process.version.substr(1);
if (parseInt(nodeVersion.charAt(0)) < 8) {
    throw new Error("TFX requires Node.js version 8 or later. Download the latest version at https://nodejs.org.");
}

Bootstrap.begin()
    .then(() => {})
    .catch(reason => {
        errHandler.errLog(reason);
    });
