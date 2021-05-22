require('colors');

function info(message) {
    console.log('[INFO]'.blue.bold, '[Discord.JS Utils]'.green.bold, message.blue.bold);
}

function error(message) {
    console.log('[ERROR]'.red.bold, '[Discord.JS Utils]'.green.bold, message.red.bold);
}

function warn(message) {
    console.log('[WARN]'.yellow.bold, '[Discord.JS Utils]'.green.bold, message.yellow.bold);
}

module.exports.info = info;
module.exports.warn = warn;
module.exports.error = error;