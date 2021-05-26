const questionManager = require('./managers/questionManager');
const commandManager = require('./managers/commandManager');
const helpHanlder = require('./default-commands/help');
const utils = require('./utils/utils');
const { setClient } = require('./utils/constants');

function init(options, client) {
    setClient(client);
    if (options && options.commandManager && !options.removeHelpCommand) {
        commandManager.addCommand({
            command: 'help',
            handler: helpHanlder,
            description: 'Shows list of all commands.',
            category: {
                name: 'General',
                weight: 100
            }
        });
    }
    if (options && options.commandManager) commandManager.init(options);
}

module.exports = {
    ...questionManager,
    ...commandManager,
    ...utils,
    init
};