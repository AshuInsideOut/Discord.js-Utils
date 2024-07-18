import {
  CombinedCommand,
  CombinedCommandMiddleware,
  Command,
  CommandManagerOptions,
  MessageCommand,
  Middleware,
  SlashCommand,
} from '../interfaces/CommandManager';
import {
  ApplicationCommandData,
  CommandInteraction,
  Message,
  Util,
} from 'discord.js';
import { getClient, getOptions } from '../utils/constants';
import { fetchGuild, getEmbed } from '../utils/utils';
import logger from '../utils/logger';

const registeredCommands: Command[] = [];
const registeredMiddlewares: Middleware[] = [];

const defaultPrefix = '!';
const options: CommandManagerOptions = {};
let prefixMap: Map<string, string> | null = null;

const coreMiddleware: Middleware = {
  type: 'COMBINED',
  handler({ context, args, command }, additionalData) {
    command.handler(context, args, additionalData);
  },
};

registeredMiddlewares.push(coreMiddleware);

export function getRegisteredCommands() {
  return registeredCommands;
}

export function getPrefix(guildId?: string) {
  if (guildId && !prefixMap) return null;
  if (!guildId) return options.prefix!;
  if (!prefixMap) return null;
  const found = prefixMap.get(guildId);
  return found ? found : null;
}

export function getPrefixMap() {
  if (!options.isPrefixMap) {
    if (getOptions().isDebug)
      logger.debug(`Trying to access prefix map while it's disabled.`);
    return;
  }
  return prefixMap;
}

export function addCommand(...commands: Command[]) {
  const client = getClient();
  if (!client) {
    if (getOptions().isDebug)
      logger.debug(
        `Trying to register command without initializing client. Make sure you are calling Discord.jsUtils#init() before adding the command.`
      );
    return false;
  }
  commands.forEach((command) => {
    if (command.type !== 'SLASH' && command.type !== 'COMBINED') return;
    const commandData: ApplicationCommandData = {
      name: command.name,
      description: 'No description provided',
      defaultPermission: command.slash.defaultPermission || true,
      type: command.slash.type || 'CHAT_INPUT',
    };
    if ('description' in command.slash && commandData.type === 'CHAT_INPUT') {
      commandData.description =
        command.slash.description || 'No description provided';
      commandData.options = command.slash.options || [];
    }
    const dev = options.dev!;
    if (Array.isArray(dev.guilds) && dev.guilds.length > 0) {
      return dev.guilds.forEach(async (guildId) => {
        const guild = await fetchGuild(guildId);
        guild?.commands.create(commandData);
      });
    }
    client.application?.commands.create(commandData);
  });
  registeredCommands.push(...commands);
  return true;
}

export function addMiddleware(...middlewares: Middleware[]) {
  registeredMiddlewares.splice(
    registeredMiddlewares.length - 1,
    0,
    ...middlewares
  );
}

export function init(
  opts: CommandManagerOptions = {
    categories: ['UnCategorized'],
    defaultCategory: 'UnCategorized',
    isHelpCommand: false,
    isPrefixMap: false,
    prefix: defaultPrefix,
    dev: {
      guilds: [],
    },
  }
) {
  options.categories = opts.categories || ['UnCategorized'];
  options.defaultCategory = opts.defaultCategory || 'UnCategorized';
  options.isHelpCommand = opts.isHelpCommand || false;
  options.isPrefixMap = opts.isPrefixMap || false;
  options.prefix = opts.prefix || defaultPrefix;
  options.dev = { guilds: options.dev?.guilds || [] };

  const client = getClient();
  const isDebug = getOptions().isDebug;
  if (!client) {
    if (isDebug)
      logger.debug(`Client not provided, Command Manager has been disabled.`);
    return;
  }
  if (options.isPrefixMap) {
    if (isDebug) logger.debug(`Enabled per-guild prefix mapping`);
    prefixMap = new Map<string, string>();
  }

  client.on('messageCreate', async (message) => {
    const { author } = message;
    if (author.bot) return;
    const context = findMessageCommand(message);
    if (!context) return;
    const command = context.command;
    let lastAdditionalData = null;
    for (const middleware of registeredMiddlewares) {
      if (middleware.type === 'SLASH') continue;
      if (
        (!middleware.type || middleware.type === 'MESSAGE') &&
        (!command.type || command.type === 'MESSAGE')
      ) {
        lastAdditionalData = await middleware.handler(
          { command, message, args: context.args },
          lastAdditionalData
        );
        continue;
      }
      lastAdditionalData = await (
        middleware as CombinedCommandMiddleware
      ).handler(
        {
          context: message,
          args: context.args,
          command: command as CombinedCommand,
        },
        lastAdditionalData
      );
    }
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;
    const context = findInteractionCommand(interaction);
    if (!context) return;
    const command = context.command;
    let lastAdditionalData = null;
    for (const middleware of registeredMiddlewares) {
      if (!middleware.type || middleware.type === 'MESSAGE') continue;
      if (middleware.type === 'SLASH' && command.type === 'SLASH') {
        lastAdditionalData = await middleware.handler(
          {
            command: command as SlashCommand,
            interaction,
            options: interaction.options,
          },
          lastAdditionalData
        );
        continue;
      }
      lastAdditionalData = await (
        middleware as CombinedCommandMiddleware
      ).handler(
        {
          context: interaction,
          args: interaction.options,
          command: command as CombinedCommand,
        },
        lastAdditionalData
      );
    }
  });

  if (!options.isHelpCommand) return;
  addCommand({
    name: `help`,
    category: options.defaultCategory,
    handler(message) {
      const { channel } = message;
      const commands = registeredCommands.filter(
        (command) => command.type !== 'COMBINED'
      ) as MessageCommand[];
      const sortedCommandsCategories: { [key: string]: MessageCommand[] } = {};
      options.categories?.forEach((category) => {
        const categoryCommands = commands.filter(
          (command) =>
            (command.category || options.defaultCategory) === category
        );
        sortedCommandsCategories[
          categoryCommands[0].category || options.defaultCategory!
        ] = categoryCommands;
      });
      if (Object.keys(sortedCommandsCategories).length === 0) {
        channel.send({ embeds: [getEmbed(`No commands found.`)] });
        return;
      }

      const description: string[] = [];
      for (const commands in sortedCommandsCategories) {
        //TODO: Complete this
      }
    },
    description: `List all available commands`,
  });
}

function findInteractionCommand(interaction: CommandInteraction) {
  const command = registeredCommands
    .filter((command) => command.type && command.type !== 'MESSAGE')
    .find((command) => command.name === interaction.commandName);
  if (!command) return null;
  return { command: command as CombinedCommand | SlashCommand };
}

function findMessageCommand(message: Message) {
  const { guild, content } = message;
  const split = content.trim().split(/\s+/);
  const executedCommandName = split.shift();
  if (!executedCommandName) return null;
  let prefix = getPrefix()!;
  if (guild) {
    const guildPrefix = getPrefix(guild.id);
    prefix = guildPrefix ? guildPrefix : prefix;
  }
  const command = registeredCommands
    .filter((command) => command.type !== 'SLASH')
    .find((command) => {
      if (
        executedCommandName.toLowerCase() ===
        `${prefix}${command.name}`.toLowerCase()
      )
        return true;
      if (!command.aliases) return;
      for (const alias of command.aliases) {
        if (
          `${prefix}${alias}`.toLowerCase() ===
          `${prefix}${command.name}`.toLowerCase()
        )
          return true;
      }
    });
  if (!command) return null;
  return {
    command: command as MessageCommand | CombinedCommand,
    args: split,
  };
}
