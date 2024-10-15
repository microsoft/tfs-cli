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

Bootstrap.begin()
	.then(() => {})
	.catch(reason => {
		errHandler.errLog(reason);
	});
