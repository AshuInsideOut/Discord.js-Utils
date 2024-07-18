import { Client } from 'discord.js';
import { Options } from '../interfaces/Defaults';
import logger from './logger';

let bot: Client | null = null;
let options: Options = {};

export function setClient(client: Client) {
    bot = client;
}

export function getClient() {
    if (!bot) logger.error('Trying to access client without initializing it.');
    return bot;
}

export function setOptions(opts: Options) {
    options = opts;
}

export function getOptions() {
    return options;
}