const logger = require('../utils/logger');
const { getClient } = require('../utils/constants');

const registeredCommands = [];
const commandHandlerObjs = [];
const middlewarePipeline = [];
let prefixMap;

function getPrefixMap() {
  if (!prefixMap) logger.error('Trying to access prefix map while it was disabled.');
  return prefixMap;
}

middlewarePipeline.push(async (commandInfo, message) => {
  const command = commandInfo.command;
  const args = commandInfo.args;
  commandInfo.handler(message, args, command);
});

function addCommand(handlerObj) {
  if (!getClient()) return logger.error('Trying to add discord commands while the command manager is disabled.');
  const regFailedTemplate = 'Failed to register a command. Reason: ';
  if (!handlerObj.command) return logger.error(`${regFailedTemplate}provide a command property.`);
  if (!handlerObj.handler) return logger.error(`${regFailedTemplate}provide a handler property.`);
  if (!handlerObj.description) handlerObj.description = 'No description provided.';
  if (!handlerObj.category) handlerObj.category = {
    name: 'UnCategorized',
    weight: 1
  };
  if (!handlerObj.aliases) handlerObj.aliases = [];
  const commandObj = { ...handlerObj };
  delete commandObj.handler;
  registeredCommands.push(commandObj);
  commandHandlerObjs.push(handlerObj);
}

function addMiddleware(handlerObj) {
  if (!getClient()) return logger.error('Trying to add discord command middleware while the command manager is disabled.');
  middlewarePipeline.splice(middlewarePipeline.length - 1, 0, handlerObj);
}

function init(options) {
  const client = getClient();
  if (!client) {
    logger.warn(`Client not provided, Command Manager has been disabled.`);
    return;
  }
  let prefix = options.prefix;
  if (!options || !options.prefix) {
    prefix = '!';
    logger.warn(`Prefix not provided, setting default one '!'.`);
  }

  if (!options && options.prefixMap) {
    prefixMap = new Map();
    logger.info(`Enabled per-guild prefix mapping`);
  };

  client.on('message', async (message) => {
    if (message.author.bot) return;
    let handlerObj;
    if (message.channel.type === 'text') handlerObj = findCommandObj(message.content, message.guild.id, prefix);
    else handlerObj = findCommandObj(message.content, undefined, prefix);
    if (!handlerObj) return;
    let counter = 0;
    const next = () => {
      counter++;
      middlewarePipeline[counter](handlerObj, message, next);
    };
    middlewarePipeline[counter](handlerObj, message, next);
  });
}

function findCommandObj(content, guildId, prefix) {
  if (prefixMap && guildId) prefix = getPrefixMap().get(guildId) || prefix;
  const contentSplit = content.split(/\s+/);
  const executedCommand = contentSplit[0];
  contentSplit.shift();
  const args = contentSplit;
  for (const handlerObj of commandHandlerObjs) {
    const command = handlerObj.command;
    const aliases = handlerObj.aliases || [];
    if (executedCommand === `${prefix}${command}`) return { ...handlerObj, command, args, aliases };
    for (const alias of aliases) {
      if (executedCommand !== `${prefix}${alias}`) continue;
      return { ...handlerObj, command, args };
    }
  }
}

module.exports.init = init;
module.exports.addMiddleware = addMiddleware;
module.exports.addCommand = addCommand;
module.exports.getPrefixMap = getPrefixMap;
module.exports.registeredCommands = registeredCommands;