const QuestionManager = require('./managers/QuestionManager');
const QuestionsAPI = require('./managers/QuestionsAPI');
const Menus = require('./menus');
const CommandManager = require('./managers/CommandManager');
const helpHandler = require('./default-commands/help');
const utils = require('./utils/utils');
const { setClient, setPrefix } = require('./utils/constants');

module.exports = {
    ...QuestionManager,
    ...QuestionsAPI,
    ...CommandManager,
    ...Menus,
    ...utils,
    /**
     * @param {import("discord.js").Client} client
     * @param {{ isCmdManager: boolean; isHelpCommand: boolean; prefix: string; }} [options]
     */
    init(client, options = { isCmdManager: false, isHelpCommand: false, prefix: '!' }) {
        setClient(client);
        setPrefix(options.prefix);
        const isCmdManager = options && options.isCmdManager;
        if (!isCmdManager) return;
        if (options.isHelpCommand) {
            CommandManager.addCommand({
                command: 'help',
                handler: helpHandler,
                description: 'Shows list of all commands.',
                category: {
                    name: 'General',
                    weight: 100
                }
            });
        }
        CommandManager.init(options);
    }
};