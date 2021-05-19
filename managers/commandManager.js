const logger = require('../utils/logger');

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
  const regFailedTemplate = 'Failed to register a command. Reason: ';
  if (!handlerObj.command) return logger.error(`${regFailedTemplate}provide a command property.`);
  if (!handlerObj.handler) return logger.error(`${regFailedTemplate}provide a handler property.`);
  if (!handlerObj.description) handlerObj.description = 'No description provided.';
  if (!handlerObj.category) handlerObj.category = {
    name: 'Uncategorized',
    weight: 1
  };
  if (!handlerObj.aliases) handlerObj.aliases = [];
  const commandObj = { ...handlerObj };
  delete commandObj.handler;
  registeredCommands.push(commandObj);
  commandHandlerObjs.push(handlerObj);
}

function addMiddleware(handlerObj) {
  middlewarePipeline.splice(middlewarePipeline.length - 1, 0, handlerObj);
}

function init(client, options) {
  if (!client) {
    logger.warn(`Client not provided, Command Manager has been disabled.`);
    return;
  }
  let prefix = options.prefix;
  let isPrefixMapEnabled = false;
  if (!options || !options.prefix) {
    prefix = '!';
    logger.warn(`Prefix not provided, setting default one '!'.`);
  }

  if (!options && options.prefixMap) {
    isPrefixMapEnabled = true;
    prefixMap = new Map();
    logger.info(`Enabled per-guild prefix mapping`);
  };

  client.on('message', async (message) => {
    let executedCommand;
    if (message.channel.type === 'dm' || !isPrefixMapEnabled)
      executedCommand = `${prefix}${message.content}`;
    else executedCommand = getPrefixMap().get(message.guild.id) || `${prefix}${message.content}`;
    const handlerObj = findCommandObj(executedCommand, prefix);
    if (!handlerObj) return;
    let counter = 0;
    const next = () => {
      counter++;
      middlewarePipeline[counter](handlerObj, message, next);
    };
    middlewarePipeline[counter](handlerObj, message, next);
  });
}

function findCommandObj(content, prefix) {
  for (const handlerObj of commandHandlerObjs) {
    const command = handlerObj.command;
    const aliases = handlerObj.aliases || [];
    const contentSplit = content.split(/\s+/);
    const executedCommand = contentSplit[0];
    contentSplit.shift();
    const args = contentSplit;
    const obj = { ...handlerObj };
    obj.command = command;
    obj.args = args;
    if (executedCommand === `${prefix}${command}`) return obj;
    for (const alias of aliases) {
      if (executedCommand !== `${prefix}${alias}`) continue;
      return obj;
    }
  }
}

module.exports.init = init;
module.exports.addMiddleware = addMiddleware;
module.exports.addCommand = addCommand;
module.exports.getPrefixMap = getPrefixMap;
module.exports.registeredCommands = registeredCommands;