require('colors');

function info(message) {
    console.log('Discord.JS Utils'.green.bold, message.blue.bold);
}

function error(message) {
    console.log('Discord.JS Utils'.green.bold, message.red.bold);
}

function warn(message) {
    console.log('Discord.JS Utils'.green.bold, message.yellow.bold);
}

module.exports.info = info;
module.exports.warn = warn;
module.exports.error = error;