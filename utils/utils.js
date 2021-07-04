const { User, Guild, Channel, GuildMember, Role, TextChannel, DMChannel, NewsChannel, Message, MessageReaction } = require('discord.js');
const { getClient } = require('./constants');
const fs = require('fs');
const logger = require('./logger');
const yaml = require('yaml');
const path = require('path');
const appDir = path.dirname(require.main.filename);

/**
 * @param {(args) => Promise<any> | any} asyncFunction
 * @param {any} thisArg
 * @param {any[]} args
 */
async function errorHandler(asyncFunction, thisArg, ...args) {
    try {
        const data = await asyncFunction.call(thisArg, ...args);
        return { data };
    } catch (error) {
        return { error };
    }
}

/**
 * @param {Object} obj
 * @return {Object}
 */
function deepCloneWithLose(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * @param {string} snowflake
 * @return {boolean}
 */
function isValidSnowflake(snowflake) {
    const re = /^[0-9]{18}$/;
    return re.test(String(snowflake));
}

/**
 * @param {string} userResolvable
 * @return {Promise<User>}
 */
async function fetchUser(userResolvable) {
    const bot = getClient();
    if (isValidSnowflake(userResolvable)) {
        const { data } = await errorHandler(bot.users.fetch, bot.users, userResolvable);
        return data ? data : undefined;
    }
    const re = /<@!?(\d{17,19})>/g;
    const exec = re.exec(userResolvable);
    if (!exec) return;
    const userId = exec[1];
    if (isValidSnowflake(userId)) {
        const { data } = await errorHandler(bot.users.fetch, bot.users, userId);
        return data ? data : undefined;
    }
}

/**
 * @param {string} guildResolvable
 * @return {Promise<Guild>}
 */
async function fetchGuild(guildResolvable) {
    const bot = getClient();
    if (isValidSnowflake(guildResolvable)) return bot.guilds.cache.get(guildResolvable);
    return bot.guilds.cache.find((/** @type {{ name: string; }} */ guild) => guild.name === guildResolvable);
}

/**
 * @param {string} channelResolvable
 * @return {Promise<Channel>}
 */
async function fetchChannel(channelResolvable) {
    const bot = getClient();
    if (isValidSnowflake(channelResolvable)) {
        const { data } = await errorHandler(bot.channels.fetch, bot.channels, channelResolvable);
        return data ? data : undefined;
    }
    const re = /<#(\d{17,19})>/g;
    const exec = re.exec(channelResolvable);
    if (!exec) return;
    const channelId = exec[1];
    if (isValidSnowflake(channelId)) {
        const { data } = await errorHandler(bot.channels.fetch, bot.channels, channelId);
        return data ? data : undefined;
    }
}

/**
 * @param {string} memberResolvable
 * @param {Guild} guild
 * @return {Promise<GuildMember>}
 */
async function fetchMember(memberResolvable, guild) {
    if (isValidSnowflake(memberResolvable)) {
        const { data } = await errorHandler(guild.members.fetch, guild.members, memberResolvable);
        return data ? data : undefined;
    }
    const re = /<@!?(\d{17,19})>/g;
    const exec = re.exec(memberResolvable);
    if (!exec) return;
    const memberId = exec[1];
    if (isValidSnowflake(memberId)) {
        const { data } = await errorHandler(guild.members.fetch, guild.members, memberId);
        return data ? data : undefined;
    }
}
/**
 * @param {string} roleResolvable
 * @param {Guild} guild
 * @return {Promise<Role>}
 */
async function fetchRole(roleResolvable, guild) {
    if (isValidSnowflake(roleResolvable)) {
        const { data } = await errorHandler(guild.roles.fetch, guild.roles, roleResolvable);
        return data ? data : undefined;
    }
    const re = /<@&(\d{17,19})>/g;
    const exec = re.exec(roleResolvable);
    if (!exec) return guild.roles.cache.find(role => role.name === roleResolvable);
    const roleId = exec[1];
    if (isValidSnowflake(roleId)) {
        const { data } = await errorHandler(guild.roles.fetch, guild.roles, roleId);
        return data ? data : undefined;
    }
}

//MIT License

//Copyright (c) astur <astur@yandex.ru> (http://kozlov.am/)

//Github: https://github.com/astur/dhms

/**
 * @param {string} string
 * @param {boolean} sec
 */
function toTimestamp(string, sec = false) {
    const x = sec ? 1 : 1000;
    if (typeof string !== 'string') return 0;
    const fixed = string.replace(/\s/g, '');
    const tail = +fixed.match(/-?\d+$/g) || 0;
    const parts = (fixed.match(/-?\d+[^-0-9]+/g) || [])
        .map(v => +v.replace(/[^-0-9]+/g, '') * ({ s: x, m: 60 * x, h: 3600 * x, d: 86400 * x }[v.replace(/[-0-9]+/g, '')] || 0));
    return [tail, ...parts].reduce((a, b) => a + b, 0);
};

/**
 * @param {number} seconds
 */
function toTimeLeft(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 3600 % 60);
    var hDisplay = h > 0 ? h + (h == 1 ? ' Hour ' : ' Hours ') : '';
    var mDisplay = m > 0 ? m + (m == 1 ? ' Minute ' : ' Minutes ') : '';
    var sDisplay = s > 0 ? s + (s == 1 ? ' Second' : ' Seconds') : '';
    return `${hDisplay}${mDisplay}${sDisplay}`.trim();
}

/**
 * @param {number} min
 * @param {number} max
 */
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function findCodeBlock(content) {
    const re = /```(?:(?<lang>\S+)\n)?\s?(?<code>[^]+?)\s?```/;
    return re.exec(content).groups;
}

function findEmoteById(id) {
    return getClient().emojis.cache.get(id);
}

function isValidEmail(email) {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

/**
 * @param {string} fileNameOrDir file name or directory
 * @param {T} defaultObject
 * @param {'yml' | 'json'} type
 * @return {T}
 * @template T
 */
function getConfig(fileNameOrDir, defaultObject, type = 'yml') {
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
            logger.error(`Something went wrong while loading ${fileNameOrDir}.${type} config file. This could happen because your wrongly configured the file. Error: ${error.message}`);
        }
        return obj;
    }
    const rawData = type === 'yml' ? yaml.stringify(defaultObject) : JSON.stringify(defaultObject, null, 2);
    fs.writeFile(path, rawData, (err) => {
        if (err) logger.error(`Something went wrong while create new ${fileNameOrDir}.${type} config file. Error: ${err.message}`);
    });
    return defaultObject;
}

module.exports = {
    isValidSnowflake,
    errorHandler,
    fetchUser,
    fetchGuild,
    fetchChannel,
    fetchMember,
    fetchRole,
    toTimestamp,
    toTimeLeft,
    getRandomInt,
    findCodeBlock,
    findEmoteById,
    isValidEmail,
    deepCloneWithLose,
    getConfig
};