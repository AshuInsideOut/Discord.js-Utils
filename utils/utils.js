const { getClient } = require('./constants');

function isValidSnowflake(snowflake) {
    const re = /^[0-9]{18}$/;
    return re.test(String(snowflake));
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

async function fetchUser(userResolveable) {
    if (isValidSnowflake(userResolveable)) return await getClient().users.fetch(userResolveable);
    const re = /<@!?(\d{17,19})>/g;
    const exec = re.exec(userResolveable);
    if (!exec) return;
    const userId = exec[1];
    if (isValidSnowflake(userId)) return await getClient().users.fetch(userId);
}

async function fetchChannel(channelResolveable) {
    if (isValidSnowflake(channelResolveable)) return await getClient().channels.fetch(channelResolveable);
    const re = /<#(\d{17,19})>/g;
    const exec = re.exec(channelResolveable);
    if (!exec) return;
    const channelId = exec[1];
    if (isValidSnowflake(channelId)) return await getClient().channels.fetch(channelId);
}

function parseMessage(messageObj) {
    if (typeof messageObj === 'string') return { content: messageObj, embed: null };
    return { content: messageObj.message, embed: new MessageEmbed(messageObj) };
}

module.exports = {
    isValidSnowflake,
    findCodeBlock,
    findEmoteById,
    isValidEmail,
    fetchUser,
    fetchChannel,
    parseMessage
};