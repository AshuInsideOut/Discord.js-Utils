import { getClient as getConstClient, getOptions as getConstOptions } from './constants';
import fs from 'fs';
import fse from 'fs-extra';
import logger from './logger';
import yaml from 'yaml';
import path from 'path';
import {
    Channel, DMChannel, Guild, GuildEmoji, GuildMember, Message, MessageEmbed, NewsChannel,
    GuildResolvable, Role, ChannelResolvable, TextChannel, ThreadChannel, ThreadMember,
    User, UserResolvable, GuildChannel, Invite, Snowflake, VoiceChannel, StageChannel,
    GuildMemberResolvable, RoleResolvable, EmojiResolvable, ReactionEmoji
} from 'discord.js';
import { JoinableChannel, SendableChannel } from '../interfaces/Defaults';

/**
 * Handle normal or async function errors without try-catch hell.
 * @param awaitableFunction A normal or async function
 * @param thisArg The object to be used as the this object
 * @param args Function args
 * @returns Data or Error
 */
export async function errorHandler<T, K>(awaitableFunction: (this: K, ...args: any[]) => Promise<T> | T, thisArg: K, ...args: any[]): Promise<{ data?: T, error?: any; }> {
    try {
        const data = await awaitableFunction.apply(thisArg, args);
        return { data };
    } catch (error) {
        return { error };
    }
}
/**
 * Deep clones a javascript object with loose i.e. Doesn't work for complex objects.
 * @param obj A javascript object to clone
 * @returns cloned copy of the object
 */
export function deepCloneWithLose<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Checks if the given string is a valid snowflake.
 * @param snowflake snowflake string
 * @returns if is snowflake
 */
export function isValidSnowflake(snowflake: Snowflake): boolean {
    const re = /^[0-9]{18}$/;
    return re.test(String(snowflake));
}

/**
 * Fetches a user from the given resolvable or null if not found.
 * @param userResolvable A user resolvable object
 * @returns User object or null if not found
 */
export async function fetchUser(userResolvable: UserResolvable): Promise<User | null> {
    const bot = getConstClient();
    if (!bot) throw new Error(`Client not initialized`);
    if (typeof userResolvable === 'string') {
        if (isValidSnowflake(userResolvable)) {
            const { data } = await errorHandler(bot.users.fetch, bot.users, userResolvable);
            return data ? data : null;
        }
        const regex = /<@!?(\d{17,19})>/g;
        const exec = regex.exec(userResolvable);
        if (!exec) return null;
        const userId = exec[1];
        if (isValidSnowflake(userId)) {
            const { data } = await errorHandler(bot.users.fetch, bot.users, userId);
            return data ? data : null;
        }
        return null;
    }
    if (userResolvable instanceof User) return userResolvable;
    if (userResolvable instanceof Message) return userResolvable.author;
    if (userResolvable instanceof GuildMember || userResolvable instanceof ThreadMember) return userResolvable.user;
    return null;
}

/**
 * Fetches a guild from the given resolvable or null if not found.
 * @param guildResolvable A guild resolvable object
 * @returns Guild object or null if not found
 */
export async function fetchGuild(guildResolvable: GuildResolvable): Promise<Guild | null> {
    const bot = getConstClient();
    if (!bot) throw new Error(`Client not initialized`);
    if (typeof guildResolvable === 'string') {
        if (isValidSnowflake(guildResolvable)) {
            const found = bot.guilds.cache.get(guildResolvable);
            return found ? found : null;
        };
        const found = bot.guilds.cache.find((guild) => guild.name === guildResolvable);
        return found ? found : null;
    }
    if (guildResolvable instanceof Guild) return guildResolvable;
    if (guildResolvable instanceof GuildChannel || guildResolvable instanceof GuildMember || guildResolvable instanceof GuildEmoji || guildResolvable instanceof Role) return guildResolvable.guild;
    if (guildResolvable instanceof Invite && guildResolvable.guild instanceof Guild) return guildResolvable.guild;
    return null;
}

/**
 * Fetches a channel from the given resolvable or null if not found.
 * @param channelResolvable A channel resolvable object
 * @returns Channel object or null if not found
 */
export async function fetchChannel(channelResolvable: ChannelResolvable): Promise<Channel | null> {
    const bot = getConstClient();
    if (!bot) throw new Error(`Client not initialized`);
    if (typeof channelResolvable === 'string') {
        if (isValidSnowflake(channelResolvable)) {
            const { data } = await errorHandler(bot.channels.fetch, bot.channels, channelResolvable);
            return data ? data : null;
        }
        const re = /<#(\d{17,19})>/g;
        const exec = re.exec(channelResolvable);
        if (!exec) return null;
        const channelId = exec[1];
        if (isValidSnowflake(channelId)) {
            const { data } = await errorHandler(bot.channels.fetch, bot.channels, channelId);
            return data ? data : null;
        }
        return null;
    }
    return channelResolvable instanceof Channel ? channelResolvable : null;
}

/**
 * Fetches a sendable channel from the given resolvable or null if not found.
 * @param channelResolvable A channel resolvable object
 * @returns Sendable Channel object or null if not found
 */
export async function fetchSendableChannel(channelResolvable: ChannelResolvable): Promise<SendableChannel | null> {
    const channel = await fetchChannel(channelResolvable);
    if (!channel) return null;
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

/**
 * Fetches a joinable channel from the given resolvable or null if not found.
 * @param channelResolvable A channel resolvable object
 * @returns Joinable Channel object or null if not found
 */
export async function fetchJoinableChannel(channelResolvable: ChannelResolvable): Promise<JoinableChannel | null> {
    const channel = await fetchChannel(channelResolvable);
    if (!channel) return null;
    switch (channel.type) {
        case 'GUILD_VOICE': return channel as VoiceChannel;
        case 'GUILD_STAGE_VOICE': return channel as StageChannel;
        default: return null;
    }
}

/**
 * Fetches a guild member from the given resolvable or null if not found.
 * @param memberResolvable A guild member resolvable object
 * @param guildResolvable A guild resolvable object
 * @returns Guild Member object or null if not found
 */
export async function fetchMember(memberResolvable: GuildMemberResolvable, guildResolvable: GuildResolvable): Promise<GuildMember | null> {
    const guild = await fetchGuild(guildResolvable);
    if (!guild) return null;
    const user = await fetchUser(memberResolvable);
    if (!user) return null;
    const { data } = await errorHandler(guild.members.fetch, guild.members, user);
    return data instanceof GuildMember ? data : null;
}

/**
 * Fetches a role from the given resolvable or null if not found.
 * @param roleResolvable A role resolvable object
 * @param guildResolvable A guild resolvable object
 * @returns Role object or null if not found
 */
export async function fetchRole(roleResolvable: RoleResolvable, guildResolvable: GuildResolvable): Promise<Role | null> {
    const guild = await fetchGuild(guildResolvable);
    if (!guild) return null;
    if (roleResolvable instanceof Role) return roleResolvable;
    if (isValidSnowflake(roleResolvable)) {
        const { data } = await errorHandler(guild.roles.fetch, guild.roles, roleResolvable);
        return data instanceof Role ? data : null;
    }
    const regex = /<@&(\d{17,19})>/g;
    const exec = regex.exec(roleResolvable);
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

/**
 * Converts raw duration string i.e. `1d`, `20s`, `20d6m2s` to timestamp i.e. `86400000(1d)`, `20000(20s)`, `1728000000(20d) + 360000(6m) + 2000(2s) = 1728362000(20d6m2s)`.
 * Also supports negative durations i.e. `-1d`, `-20s`, `-20d6m2s`
 * @param raw raw string duration
 * @param toEpoch should return Epoch instead of Unix timestamp
 * @returns timestamp
 */
export function toTimestamp(raw: string, toEpoch = false) {
    const x = toEpoch ? 1 : 1000;
    if (typeof raw !== 'string') return 0;
    const fixed = raw.replace(/\s/g, '');
    const tail = +(fixed.match(/-?\d+$/g) || 0);
    const parts = (fixed.match(/-?\d+[^-0-9]+/g) || [])
        .map(v => +v.replace(/[^-0-9]+/g, '') * ({ s: x, m: 60 * x, h: 3600 * x, d: 86400 * x }[v.replace(/[-0-9]+/g, '')] || 0));
    return [tail, ...parts].reduce((a, b) => a + b, 0);
};

/**
 * Converts Unix timestamp to formatted duration string e.g. `1 Days 2 Hours 3 Minutes 50 Seconds`.
 * @param unixTimestamp Unix timestamp
 * @returns Duration string
 */
export function toTimeLeft(unixTimestamp: number) {
    unixTimestamp = unixTimestamp / 1000;
    const d = Math.floor(unixTimestamp / 3600 / 24);
    const h = Math.floor(unixTimestamp / 3600);
    const m = Math.floor(unixTimestamp % 3600 / 60);
    const s = Math.floor(unixTimestamp % 3600 % 60);
    var dDisplay = d > 0 ? d + (d == 1 ? ' Day ' : ' Days ') : '';
    var hDisplay = h > 0 ? h + (h == 1 ? ' Hour ' : ' Hours ') : '';
    var mDisplay = m > 0 ? m + (m == 1 ? ' Minute ' : ' Minutes ') : '';
    var sDisplay = s > 0 ? s + (s == 1 ? ' Second' : ' Seconds') : '';
    const formatted = `${dDisplay}${hDisplay}${mDisplay}${sDisplay}`.trim();
    if (!formatted) return `${unixTimestamp} Second`;
    return formatted;
}

/**
 * Picks and returns a random number between min and max ranges.
 * @param min Minium range
 * @param max Maximum range
 * @returns Random number between min and max range
 */
export function getRandomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Finds a code block inside a string.
 * @param content string to look for code block
 * @returns if found `lang` of code block and `code` in code block. null if not found
 */
export function findCodeBlock(content: string): { lang?: string; code: string; } | null {
    const regex = /```(?:(?<lang>\S+)\n)?\s?(?<code>[^]+?)\s?```/;
    const ex = regex.exec(content);
    if (!ex || !ex.groups || !ex.groups.code) return null;
    return { code: ex.groups.code, lang: ex.groups.lang };
}

/**
 * Fetches a guild emoji from the given resolvable or null if not found.
 * @param emojiResolvable A emoji resolvable object
 * @returns Guild Emoji object or null if not found
 */
export function fetchEmote(emojiResolvable: EmojiResolvable): GuildEmoji | null {
    const bot = getConstClient();
    if (!bot) throw new Error(`Client not initialized`);
    if (typeof emojiResolvable === 'string') {
        const found = bot.emojis.cache.get(emojiResolvable);
        return found ? found : null;
    }
    if (emojiResolvable instanceof GuildEmoji) return emojiResolvable;
    if (emojiResolvable instanceof ReactionEmoji) {
        if (!emojiResolvable.id) return null;
        const found = bot.emojis.cache.get(emojiResolvable.id);
        return found ? found : null;
    }
    return null;
}

/**
 * Checks if an email is in valid format.
 * @param email email to validate
 * @returns if is valid email format
 */
export function isValidEmail(email: string) {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email.toLowerCase());
}

/**
 * Creates a config file at a given path
 * @param filePath path to the config file e.g. `config.yml`, `configs/config.json`
 * @param defaultObject javascript object of the config`
 * @param type type of the config file
 * @returns javascript object of the config
 */
export function getConfig<T>(filePath: string, defaultObject: T, type: 'yml' | 'json' = 'yml'): T {
    if (type !== 'yml' && type !== 'json') type = 'yml';
    if (!require.main) throw new Error('NodeJS.Require.main is undefined');
    const configPath = path.resolve(filePath);
    if (fs.existsSync(configPath)) {
        let obj;
        try {
            if (type === 'yml') obj = yaml.parse(fs.readFileSync(configPath, 'utf-8'));
            else obj = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        } catch (error) {
            logger.error(`Something went wrong while loading "${filePath}" config file. This could happen because your wrongly configured the file. Error: ${error}`);
        }
        return obj;
    }
    const rawData = type === 'yml' ? yaml.stringify(defaultObject) : JSON.stringify(defaultObject, null, 2);
    try {
        fse.outputFileSync(configPath, fixComments(rawData));
    } catch (err) {
        logger.error(`Something went wrong while create new "${filePath}" config file. Error: ${err}`);
    }
    return defaultObject;
}

function fixComments(text: string) {
    return text.replace(/("|')?~(\d+)?("|')?:\s("|')?.+("|')?/g, match => "# " + match.replace(/("|')?~(\d+)?("|')?:\s/g, '').replace(/("|')/g, ''));
}

/**
 * Safely access discord client from anywhere.
 * @returns discord client
 */
export function getClient() {
    return getConstClient();
}
/**
 * Safely access discord.js-utils options from anywhere.
 * @returns discord.js-utils options
 */
export function getOptions() {
    return getConstOptions();
}
/**
 * Builds a new embed with the default settings
 * @param description description of the embed
 * @returns Message Embed object
 */
export function getEmbed(description?: string) {
    const embed = new MessageEmbed(getOptions().defaultEmbed);
    if (description) embed.setDescription(description);
    return embed;
}

/**
 * A Util class to handle user message send rate limits.
 * Checks if a user is spamming.
 */
export class SpamHandler {
    private dataMap = new Map();
    private timeoutMap = new Map();
    /**
     * Initializes the SpamHandler class.
     * @param timeout Rate limit in milliseconds
     * @param messageCount User message send limit per {@param timeout}
     */
    constructor(private timeout: number, private messageCount: number) { }

    /**
     * Checks if a user is spamming or not. Call this before executing your command logic and check for spam.
     * @param discordId discord user id
     * @returns if user is spamming
     */
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

    /**
     * Resets a user's current rate limit.
     * @param discordId discord user id
     */
    resetUser(discordId: string): void {
        const timeout = this.timeoutMap.get(discordId);
        if (!timeout) return;
        clearTimeout(timeout);
        this.timeoutMap.delete(discordId);
    }
}

/**
 * Replaces placeholders the provided message with the variable values.
 * @param message string or string array message
 * @param variables javascript object
 * @returns Parsed string
 */
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