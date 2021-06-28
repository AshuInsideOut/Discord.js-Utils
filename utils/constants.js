const { Client } = require('discord.js');
const logger = require('../utils/logger');

/**
 * @type {Client} 
*/
let bot = null;

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

module.exports.getClient = getClient;
module.exports.setClient = setClient;