import * as QuestionsAPI from './managers/QuestionsAPI';
import * as Menus from './menus';
import * as CommandManager from './managers/CommandManager';
import * as Utils from './utils/utils';
import { setClient, setOptions } from './utils/constants';
import { Client, MessageEmbed } from 'discord.js';
import { Options } from './interfaces/Defaults';

export = {
    ...QuestionsAPI,
    ...CommandManager,
    ...Menus,
    ...Utils,
    init(client: Client, options: Options = { isCmdManager: false, isDebug: false, defaultEmbed: new MessageEmbed({ color: 'AQUA' }) }) {
        const { isCmdManager = false, cmdManagerOptions, isDebug = false, defaultEmbed = new MessageEmbed({ color: 'AQUA' }) } = options;
        setOptions({ isCmdManager, cmdManagerOptions, isDebug, defaultEmbed });
        setClient(client);
        if (!isCmdManager) return;
        CommandManager.init(cmdManagerOptions);
    }
};