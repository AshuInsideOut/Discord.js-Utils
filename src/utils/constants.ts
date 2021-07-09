import { Client } from 'discord.js';
import logger from './logger';

let bot: Client | null = null;

export function setClient(client: Client) {
    bot = client;
}

export function getClient() {
    if (!bot) logger.error('Trying to access client without initializing it.');
    return bot;
}