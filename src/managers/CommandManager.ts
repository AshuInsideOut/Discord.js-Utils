import logger from '../utils/logger';
import { getClient } from '../utils/constants';
import { Category, Command, CommandHandler, CommandManagerOptions, CommandRawHandler, MiddlewareHandler } from '../interfaces/CommandManager';

export const registeredCommandHandlers: CommandHandler[] = [];
const middlewarePipeline: MiddlewareHandler[] = [];
const registeredCategories: Category[] = [];
let prefixMap: Map<string, string>;
const defaultCategory = {
  id: 'UnCategorized',
  name: 'UnCategorized',
  weight: 1
};

let prefixS: string = '!';

export function getPrefix(guildId?: string) {
  if (guildId && prefixMap) return prefixMap.get(guildId) || prefixS;
  return prefixS;
}

export function getPrefixMap() {
  if (!prefixMap) logger.error('Trying to access prefix map while it was disabled.');
  return prefixMap;
}

export function registerCategory(category: Category) {
  registeredCategories.push(category);
}

registeredCategories.push(defaultCategory);

middlewarePipeline.push({
  handler: (commandInfo, message) => {
    const command = commandInfo.command;
    const args = commandInfo.args;
    commandInfo.handler(message, args, command);
  }
});

export function addCommand(rawHandlerData: CommandRawHandler) {
  if (!getClient()) return logger.error('Trying to add discord commands while the command manager is disabled.');
  const description = rawHandlerData.description || 'No description provided.';
  const aliases = rawHandlerData.aliases || [];
  if (!rawHandlerData.category) rawHandlerData.category = 'UnCategorized';
  let category = registeredCategories.find(category => category.id === rawHandlerData.category);
  if (!category) {
    logger.warn(`Category named ${rawHandlerData.category} is not registered. Settings it to ${defaultCategory.id} category.`);
    category = defaultCategory;
  }
  const handlerData: CommandHandler = {
    ...rawHandlerData,
    description,
    category,
    aliases
  };
  registeredCommandHandlers.push(handlerData);
}

export function addMiddleware(middlewareHandler: MiddlewareHandler) {
  if (!getClient()) return logger.error('Trying to add discord command middleware while the command manager is disabled.');
  middlewarePipeline.splice(middlewarePipeline.length - 1, 0, middlewareHandler);
}

export function init(options: CommandManagerOptions = { prefix: '!', isPrefixMap: false }) {
  const { prefix = '!', isPrefixMap = false } = options;
  const client = getClient();
  if (!client) {
    logger.warn(`Client not provided, Command Manager has been disabled.`);
    return;
  }
  prefixS = prefix;
  if (isPrefixMap) {
    prefixMap = new Map();
    logger.info(`Enabled per-guild prefix mapping`);
  };

  client.on('message', async (message) => {
    if (message.author.bot) return;
    let command: Command | null;
    if (message.channel.type === 'text') command = findCommand(message.content, prefix, message.guild!.id);
    else command = findCommand(message.content, prefix);
    if (!command) return;
    let counter = 0;
    const next = (): void => {
      counter++;
      if (!command) return next(); //Just to get rid of the error
      middlewarePipeline[counter].handler(command, message, next);
    };
    middlewarePipeline[counter].handler(command, message, next);
  });
}

function findCommand(content: string, prefix: string, guildId?: string): Command | null {
  if (prefixMap && guildId) prefix = getPrefixMap().get(guildId) || prefix;
  const contentSplit = content.split(/\s+/);
  const executedCommand = contentSplit[0];
  contentSplit.shift();
  const args = contentSplit;
  for (const handler of registeredCommandHandlers) {
    const command = handler.command;
    const aliases = handler.aliases;
    if (executedCommand === `${prefix}${command}`) return { ...handler, args, prefix };
    for (const alias of aliases) {
      if (executedCommand !== `${prefix}${alias}`) continue;
      return { ...handler, args, prefix };
    }
  }
  return null;
}