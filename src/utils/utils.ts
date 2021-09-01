import { getClient as getConstClient } from './constants';
import fs from 'fs';
import logger from './logger';
import yaml from 'yaml';
import path from 'path';
import { Channel, DMChannel, Guild, GuildEmoji, GuildMember, NewsChannel, Role, Snowflake, TextChannel, ThreadChannel, User } from 'discord.js';
const appDir = path.dirname(require.main!.filename);

export async function errorHandler<T, K>(asyncFunction: (this: K, ...args: any[]) => Promise<T> | T, thisArg: K, ...args: any[]): Promise<{ data?: T, error?: Error; }> {
    try {
        const data = await asyncFunction.apply(thisArg, args);
        return { data };
    } catch (error) {
        return { error: error instanceof Error ? error : (typeof error === 'string' ? new Error(error) : new Error('Unknown')) };
    }
}

export function deepCloneWithLose<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

export function isValidSnowflake(snowflake: Snowflake): boolean {
    const re = /^[0-9]{18}$/;
    return re.test(String(snowflake));
}

export async function fetchUser(userResolvable: string): Promise<User | null> {
    const bot = getConstClient();
    if (!bot) return null;
    if (isValidSnowflake(userResolvable)) {
        const { data } = await errorHandler(bot.users.fetch, bot.users, userResolvable);
        return data ? data : null;
    }
    const re = /<@!?(\d{17,19})>/g;
    const exec = re.exec(userResolvable);
    if (!exec) return null;
    const userId = exec[1];
    if (isValidSnowflake(userId)) {
        const { data } = await errorHandler(bot.users.fetch, bot.users, userId);
        return data ? data : null;
    }
    return null;
}

export async function fetchGuild(guildResolvable: string): Promise<Guild | null> {
    const bot = getConstClient();
    if (!bot) return null;
    if (isValidSnowflake(guildResolvable)) {
        const found = bot.guilds.cache.get(guildResolvable);
        return found ? found : null;
    };
    const found = bot.guilds.cache.find((guild) => guild.name === guildResolvable);
    return found ? found : null;
}

export async function fetchChannel(channelResolvable: string): Promise<DMChannel | TextChannel | NewsChannel | ThreadChannel | null> {
    const bot = getConstClient();
    if (!bot) return null;
    function parseChannel(channel: Channel) {
        switch (channel.type) {
            case 'DM': return channel as DMChannel;
            case 'GUILD_TEXT': return channel as TextChannel;
            case 'GUILD_NEWS': return channel as NewsChannel;
            case 'GUILD_PUBLIC_THREAD':
            case 'GUILD_PRIVATE_THREAD':
            case 'GUILD_NEWS_THREAD': return channel as ThreadChannel;
            default: return null;
        }
    }
    if (isValidSnowflake(channelResolvable)) {
        const { data } = await errorHandler(bot.channels.fetch, bot.channels, channelResolvable);
        if (!data) return null;
        return parseChannel(data);
    }
    const re = /<#(\d{17,19})>/g;
    const exec = re.exec(channelResolvable);
    if (!exec) return null;
    const channelId = exec[1];
    if (isValidSnowflake(channelId)) {
        const { data } = await errorHandler(bot.channels.fetch, bot.channels, channelId);
        if (!data) return null;
        return parseChannel(data);
    }
    return null;
}

export async function fetchMember(memberResolvable: string, guild: string | Guild): Promise<GuildMember | null> {
    if (typeof guild === 'string') {
        const fetchedGuild = await fetchGuild(guild);
        if (!fetchedGuild) return null;
        guild = fetchedGuild;
    };
    if (isValidSnowflake(memberResolvable)) {
        const { data } = await errorHandler(guild.members.fetch, guild.members, memberResolvable);
        return data instanceof GuildMember ? data : null;
    }
    const re = /<@!?(\d{17,19})>/g;
    const exec = re.exec(memberResolvable);
    if (!exec) return null;
    const memberId = exec[1];
    if (isValidSnowflake(memberId)) {
        const { data } = await errorHandler(guild.members.fetch, guild.members, memberId);
        return data instanceof GuildMember ? data : null;
    }
    return null;
}

export async function fetchRole(roleResolvable: string, guild: string | Guild): Promise<Role | null> {
    if (typeof guild === 'string') {
        const fetchedGuild = await fetchGuild(guild);
        if (!fetchedGuild) return null;
        guild = fetchedGuild;
    };
    if (isValidSnowflake(roleResolvable)) {
        const { data } = await errorHandler(guild.roles.fetch, guild.roles, roleResolvable);
        return data instanceof Role ? data : null;
    }
    const re = /<@&(\d{17,19})>/g;
    const exec = re.exec(roleResolvable);
    if (!exec) {
        const fetchedRole = guild.roles.cache.find(role => role.name === roleResolvable);
        return fetchedRole ? fetchedRole : null;
    }
    const roleId = exec[1];
    if (isValidSnowflake(roleId)) {
        const { data } = await errorHandler(guild.roles.fetch, guild.roles, roleId);
        return data instanceof Role ? data : null;
    }
    return null;
}

//MIT License

//Copyright (c) astur <astur@yandex.ru> (http://kozlov.am/)

//Github: https://github.com/astur/dhms

export function toTimestamp(string: string, sec = false) {
    const x = sec ? 1 : 1000;
    if (typeof string !== 'string') return 0;
    const fixed = string.replace(/\s/g, '');
    const tail = +(fixed.match(/-?\d+$/g) || 0);
    const parts = (fixed.match(/-?\d+[^-0-9]+/g) || [])
        .map(v => +v.replace(/[^-0-9]+/g, '') * ({ s: x, m: 60 * x, h: 3600 * x, d: 86400 * x }[v.replace(/[-0-9]+/g, '')] || 0));
    return [tail, ...parts].reduce((a, b) => a + b, 0);
};

export function toTimeLeft(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 3600 % 60);
    var hDisplay = h > 0 ? h + (h == 1 ? ' Hour ' : ' Hours ') : '';
    var mDisplay = m > 0 ? m + (m == 1 ? ' Minute ' : ' Minutes ') : '';
    var sDisplay = s > 0 ? s + (s == 1 ? ' Second' : ' Seconds') : '';
    return `${hDisplay}${mDisplay}${sDisplay}`.trim();
}

export function getRandomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function findCodeBlock(content: string) {
    const re = /```(?:(?<lang>\S+)\n)?\s?(?<code>[^]+?)\s?```/;
    const ex = re.exec(content);
    if (!ex) return null;
    return ex.groups;
}

export function findEmoteById(emojiResolvable: string): GuildEmoji | null {
    const bot = getConstClient();
    if (!bot) return null;
    const found = bot.emojis.cache.get(emojiResolvable);
    return found ? found : null;
}

export function isValidEmail(email: string) {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

export function getConfig<T>(fileNameOrDir: string, defaultObject: T, type: 'yml' | 'json' = 'yml'): T {
    if (type !== 'yml' && type !== 'json') type = 'yml';
    const isDir = fileNameOrDir.startsWith('.');
    const defaultDir = `${appDir}/configs`;
    const path = isDir ? fileNameOrDir : `${defaultDir}/${fileNameOrDir}.${type}`;
    if (!isDir && !fs.existsSync(defaultDir)) fs.mkdirSync(defaultDir);
    if (fs.existsSync(path)) {
        let obj;
        try {
            if (type === 'yml') obj = yaml.parse(fs.readFileSync(path, 'utf-8'));
            else obj = JSON.parse(fs.readFileSync(path, 'utf-8'));
        } catch (error) {
            logger.error(`Something went wrong while loading ${fileNameOrDir}.${type} config file. This could happen because your wrongly configured the file. Error: ${error instanceof Error ? error.message : error}`);
        }
        return obj;
    }
    const rawData = type === 'yml' ? yaml.stringify(defaultObject) : JSON.stringify(defaultObject, null, 2);
    try {
        fs.writeFileSync(path, fixComments(rawData));
    } catch (err) {
        logger.error(`Something went wrong while create new ${fileNameOrDir}.${type} config file. Error: ${err instanceof Error ? err.message : `${err}`}`);
    }
    return defaultObject;
}

function fixComments(text: string) {
    return text.replace(/("|')?~(\d+)?("|')?:\s("|')?.+("|')?/g, match => "# " + match.replace(/("|')?~(\d+)?("|')?:\s/g, '').replace(/("|')/g, ''));
}

export function getClient() {
    return getConstClient();
}

export class SpamHandler {
    private dataMap = new Map();
    private timeoutMap = new Map();
    constructor(private timeout: number, private messageCount: number) { }

    isSpamming(discordId: string): boolean {
        if (!this.dataMap.has(discordId)) {
            this.dataMap.set(discordId, { count: 1 });
            const timeout = setTimeout(() => {
                this.dataMap.delete(discordId);
                this.timeoutMap.delete(discordId);
            }, this.timeout);
            this.timeoutMap.set(discordId, timeout);
            return false;
        }
        const data = this.dataMap.get(discordId);
        if (data.count > this.messageCount) return true;
        data.count++;
        return false;
    }

    resetUser(discordId: string) {
        const timeout = this.timeoutMap.get(discordId);
        if (!timeout) return;
        clearTimeout(timeout);
        this.timeoutMap.delete(discordId);
    }
}

export async function setPlaceholders(message: string | string[], variables: { [key: string]: any; }) {
    if (!Array.isArray(message)) message = [message];
    if (!variables) return message.join('\n');
    const isFunction = (fun: any) => fun[Symbol.toStringTag] === 'AsyncFunction' || {}.toString.call(fun) === '[object Function]';
    const generateKeyRegex = (variableKey: string, key: string) => {
        const rawRegex = `{${variableKey}_${key.replace(/\s+/g, '')}}`;
        return new RegExp(rawRegex, 'g');
    };
    const setVariablePlaceholders = async (line: string, variableKey: string, obj: { [key: string]: any; }) => {
        const hasObjKey = new RegExp(`{${variableKey}_(?<key>[A-Za-z1-9_]+)}`, 'g');
        let matches;
        let result = line;
        while ((matches = hasObjKey.exec(line)) !== null) {
            if (!matches.groups) continue;
            const key = matches.groups.key;
            const value = obj[key];
            if (value === undefined || value === null) {
                logger.warn(`Trying to use ${key} placeholder while the value returned is undefined or null`);
                continue;
            }
            if (isFunction(value)) {
                let returned = value.call(obj);
                if (returned !== 'string') returned = returned.toString();
                result = result.replace(generateKeyRegex(variableKey, key), returned);
                continue;
            }
            result = result.replace(generateKeyRegex(variableKey, key), value.toString());
        }
        return result;
    };
    for (const variable in variables) message = await Promise.all(message.map(line => {
        if (typeof variables[variable] === 'object') return setVariablePlaceholders(line, variable, variables[variable]);
        return line.includes(`{${variable}}`) ? line.replace(new RegExp(`{${variable}}`, 'g'), variables[variable]) : line;
    }));
    return message.join('\n');
}