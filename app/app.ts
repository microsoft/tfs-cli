import command = require("./lib/command");
import common = require("./lib/common");
import errHandler = require("./lib/errorhandler");
import loader = require("./lib/loader");
import path = require("path");
import Q = require("q");

// Set app root
common.APP_ROOT = __dirname;

namespace Bootstrap {
	export function begin() {
		return command.getCommand().then((cmd) => {
			common.EXEC_PATH = cmd.execPath;
			return loader.load(cmd.execPath, cmd.args).then((tfCommand) => {
				return tfCommand.showBanner().then(() => {
					return tfCommand.ensureInitialized().then((executor) => {
						return executor(cmd);
					});
				});
			});
		});
	}
}

Bootstrap.begin().then(() => {
	
}).catch((reason) => {
	errHandler.errLog(reason);
});