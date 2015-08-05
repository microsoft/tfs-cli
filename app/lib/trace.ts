var colors = require('colors');
var enabled = process.env['TFX_TRACE'];

var _write = function(msg) {
    console.log(colors.cyan(new Date().toISOString() + ' : ') + colors.grey(msg));
}

module.exports = function trace (msg) {
    if (enabled) {
        var t = typeof(msg);
        if (t === 'string') {
            _write(msg);
        }
        else if (msg instanceof Array) {
            msg.forEach(function(line) {
                if (typeof(line) === 'string') {
                    _write(line);
                }
            })
        }
        else if(t === 'object') {
            _write(JSON.stringify(msg, null, 2));
        } 
    }
};