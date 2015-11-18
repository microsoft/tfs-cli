import prompt = require("prompt");
import Q = require("q");

prompt.delimiter = "";
prompt.message = "> ";

var queue = [];

// This is the read lib that uses Q instead of callbacks.
export function read(name: string, message: string, silent: boolean = false): Q.Promise<string> {
	let promise = Q.Promise<string>((resolve, reject) => {
		let schema: prompt.PromptSchema = {
			properties: { }
		};
		schema.properties[name] = {
			required: true,
			description: message + ":",
			hidden: silent
		};
		Q.all(queue.filter(x => x !== promise)).then(() => {
			prompt.start();
			prompt.get(schema, (err, result) => {
				if (err) {
					reject(err);
				} else {
					resolve(result[name]);
				}
				queue.shift();
			});
		});
	});
	queue.unshift(promise);
	return promise;
}