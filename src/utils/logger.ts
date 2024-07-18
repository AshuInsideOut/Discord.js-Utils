import chalk from 'chalk';

function info(message: string) {
    console.log(chalk.blueBright('[INFO]: '), chalk.blueBright('[Discord.JS Utils]'), chalk.blueBright(message));
}

function error(message: string) {
    console.log(chalk.red('[ERROR]: '), chalk.red('[Discord.JS Utils]'), chalk.red(message));
}

function warn(message: string) {
    console.log(chalk.yellowBright('[WARN]: '), chalk.yellowBright('[Discord.JS Utils]'), chalk.yellowBright(message));
}

function debug(message: string) {
    const color = chalk.hex(`#800080`);
    console.log(color.bold('[DEBUG]: '), color.bold('[Discord.JS Utils]'), color.bold(message));

}

export default {
    info,
    warn,
    error,
    debug
};