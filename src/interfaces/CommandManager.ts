import { Message } from 'discord.js';

export interface CommandManagerOptions {
    prefix?: string;
    isPrefixMap?: boolean;
}

export interface Category {
    id: string;
    name: string;
    weight: number;
}

export interface CommandHandler {
    command: string;
    handler: (message: Message, args: string[], command: string) => Promise<any> | any;
    description: string;
    category: Category;
    aliases: string[];
    [key: string]: any;
}

export interface CommandRawHandler {
    command: string;
    handler: (message: Message, args: string[], command: string) => Promise<any> | any;
    description?: string;
    category?: string;
    aliases?: string[];
    [key: string]: any;
}

export interface MiddlewareHandler {
    handler: (command: Command, message: Message, next: Function) => Promise<any> | any;
}

export interface Command extends CommandHandler {
    prefix: string;
    args: string[];
}