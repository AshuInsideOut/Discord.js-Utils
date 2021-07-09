import * as QuestionsAPI from './managers/QuestionsAPI';
import * as Menus from './menus';
import * as CommandManager from './managers/CommandManager';
import helpHandler from './default-commands/help';
import * as Utils from './utils/utils';
import { setClient } from './utils/constants';
import { Client } from 'discord.js';
import { Options } from './interfaces/Defaults';

export = {
    ...QuestionsAPI,
    ...CommandManager,
    ...Menus,
    ...Utils,
    init(client: Client, options: Options = { isCmdManager: false, isHelpCommand: false, cmdManagerOptions: { isPrefixMap: false, prefix: '!' } }) {
        const { isCmdManager = false, isHelpCommand = false, cmdManagerOptions = { isPrefixMap: false, prefix: '!' } } = options;
        const { isPrefixMap = false, prefix = '!' } = cmdManagerOptions;
        setClient(client);
        if (!isCmdManager) return;
        if (isHelpCommand) {
            CommandManager.addCommand({
                command: 'help',
                handler: helpHandler,
                description: 'Shows list of all commands.',
                category: 'UnCategorized'
            });
        }
        CommandManager.init({ isPrefixMap, prefix });
    }
};