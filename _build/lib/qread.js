"use strict";
var prompt = require("prompt");
var Q = require("q");
prompt.delimiter = "";
prompt.message = "> ";
var queue = [];
// This is the read lib that uses Q instead of callbacks.
function read(name, message, silent) {
    if (silent === void 0) { silent = false; }
    var promise = Q.Promise(function (resolve, reject) {
        var schema = {
            properties: {}
        };
        schema.properties[name] = {
            required: true,
            description: message + ":",
            hidden: silent
        };
        Promise.all(queue.filter(function (x) { return x !== promise; })).then(function () {
            prompt.start();
            prompt.get(schema, function (err, result) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(result[name]);
                }
                queue.shift();
            });
        });
    });
    queue.unshift(promise);
    return promise;
}
exports.read = read;
