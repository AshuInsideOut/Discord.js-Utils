import _ from 'colors';

function info(message: string) {
    console.log('[INFO]: '.blue, '[Discord.JS Utils]'.green, message.blue);
}

function error(message: string) {
    console.log('[ERROR]: '.red, '[Discord.JS Utils]'.green, message.red);
}

function warn(message: string) {
    console.log('[WARN]: '.yellow, '[Discord.JS Utils]'.green, message.yellow);
}

export default {
    info,
    warn,
    error
};