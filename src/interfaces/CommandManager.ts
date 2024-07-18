import { ApplicationCommandOptionData, CommandInteraction, CommandInteractionOptionResolver, Message } from 'discord.js';

export interface CommandManagerOptions {
    prefix?: string;
    isPrefixMap?: boolean;
    isHelpCommand?: boolean;
    defaultCategory?: string;
    categories?: string[];
    dev?: {
        guilds?: string[];
    };
}

export interface BaseSlashData {
    defaultPermission?: boolean;
}

export interface ChatInputSlashData extends BaseSlashData {
    options?: ApplicationCommandOptionData[];
    type?: 'CHAT_INPUT';
    description: string;
}

export interface UserSlashData extends BaseSlashData {
    type: 'USER';
}

export interface MessageSlashData extends BaseSlashData {
    type: 'MESSAGE';
}

export type SlashData = UserSlashData | MessageSlashData | ChatInputSlashData;

export interface BaseCommand {
    name: string;
    [key: string]: any;
}

export interface SlashCommand extends BaseCommand {
    type: 'SLASH';
    slash: SlashData;
    handler: (interaction: CommandInteraction, options: CommandInteractionOptionResolver, additionalData: any) => any;
}

export interface MessageCommand extends BaseCommand {
    type?: 'MESSAGE';
    description?: string;
    aliases?: string[];
    category?: string;
    handler: (message: Message, args: string[], additionalData: any) => any;
}

export interface CombinedCommand extends BaseCommand {
    type: 'COMBINED';
    description?: string;
    aliases?: string[];
    category?: string;
    slash: SlashData;
    handler: (context: Message | CommandInteraction, args: string[] | CommandInteractionOptionResolver, additionalData: any) => any;
}

export type Command = MessageCommand | SlashCommand | CombinedCommand;

export interface MessageCommandMiddleware {
    type?: 'MESSAGE',
    handler: (info: { command: MessageCommand; message: Message; args: string[]; }, additionalData: any) => any;
}

export interface SlashCommandMiddleware {
    type: 'SLASH',
    handler: (info: { command: SlashCommand; interaction: CommandInteraction; options: CommandInteractionOptionResolver; }, additionalData: any) => any;
}

export interface CombinedCommandMiddleware {
    type: 'COMBINED',
    handler: (info: { command: CombinedCommand; context: Message | CommandInteraction; args: string[] | CommandInteractionOptionResolver; }, additionalData: any) => any;
}

export type Middleware = MessageCommandMiddleware | SlashCommandMiddleware | CombinedCommandMiddleware;