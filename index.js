const questionManager = require('./managers/questionManager');
const commandManager = require('./managers/commandManager');
const helpHanlder = require('./default-commands/help');

module.exports.init = (options, client) => {
    if (!options.removeHelpCommand) {
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
    commandManager.init(client, options);
    return { questionManager, commandManager };
};
module.exports.questionManager = questionManager;
module.exports.commandManager = commandManager;