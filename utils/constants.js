const { Client } = require('discord.js');
const logger = require('../utils/logger');

/**
 * @type {Client} 
 */
let bot = null;

/**
 * @type {string} 
 */
let prefixS = null;

/**
 * @param {Client} client
 */
function setClient(client) {
    bot = client;
}

/**
 * @return {Client}
 */
function getClient() {
    if (!bot) logger.error('Trying to access client without initializing it.');
    return bot;
}

/**
 * @return {string}
 */
function getPrefix() {
    return prefixS;
}

/**
 * @param {string} prefix
 */
function setPrefix(prefix) {
    prefixS = prefix;
}

module.exports.getClient = getClient;
module.exports.setClient = setClient;
module.exports.setPrefix = setPrefix;
module.exports.getPrefix = getPrefix;