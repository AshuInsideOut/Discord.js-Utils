require('colors');

function info(message) {
    console.log('[INFO]: '.blue, '[Discord.JS Utils]'.green, message.blue);
}

function error(message) {
    console.log('[ERROR]: '.red, '[Discord.JS Utils]'.green, message.red);
}

function warn(message) {
    console.log('[WARN]: '.yellow, '[Discord.JS Utils]'.green, message.yellow);
}

module.exports.info = info;
module.exports.warn = warn;
module.exports.error = error;