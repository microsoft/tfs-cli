import prompt = require("prompt");

prompt.delimiter = "";
prompt.message = "> ";

var queue = [];

// This is the read lib that uses Q instead of callbacks.
export function read(name: string, message: string, silent: boolean = false, promptDefault?: string): Promise<string> {
	let promise = null;
	promise = new Promise<string>((resolve, reject) => {
		let schema: prompt.PromptSchema = {
			properties: {},
		};
		schema.properties[name] = {
			hidden: silent,
		};
		if (typeof promptDefault === "undefined") {
			schema.properties[name].required = true;
			schema.properties[name].description = message + ":";
		} else {
			schema.properties[name].description = message + " (default = " + promptDefault + ")" + ":";
		}
		Promise.all(queue.filter(x => x !== promise)).then(() => {
			prompt.start();
			prompt.get(schema, (err, result) => {
				if (err) {
					reject(err);
				} else {
					if (!result || !result[name] || !result[name].trim || !result[name].trim()) {
						resolve(promptDefault);
					} else {
						resolve(result[name]);
					}
				}
				queue.shift();
			});
		});
	});
	queue.unshift(promise);
	return <any>promise;
}
