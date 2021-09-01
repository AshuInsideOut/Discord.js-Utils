import { registeredCommandHandlers, getPrefix } from '../managers/CommandManager';
import { Message, MessageEmbed } from 'discord.js';
import { Category, CommandHandler } from '../interfaces/CommandManager';

export default async (message: Message) => {
    const commands = [...registeredCommandHandlers];
    const sortedCommands = commands.sort((a, b) => b.category.weight - a.category.weight);
    const categories: Category[] = [];
    sortedCommands.forEach(command => {
        if (!categories.includes(command.category)) categories.push(command.category);
    });
    const sortedCategoryCommandArray: CommandHandler[][] = [];
    categories.forEach(category => {
        const sortedCategoryCommand: CommandHandler[] = [];
        sortedCommands.forEach(command => {
            if (command.category.name === category.name) sortedCategoryCommand.push(command);
        });
        sortedCategoryCommandArray.push(sortedCategoryCommand);
    });
    let description = '';
    sortedCategoryCommandArray.forEach(sortedCategoryCommand => {
        description += `\n 💠 **${sortedCategoryCommand[0].category.name}**\n`;
        sortedCategoryCommand.forEach(b => {
            description += `▫ \`${getPrefix(message.guild?.id)}${b.command}\`: ${b.description}\n`;
        });
    });
    const embed = new MessageEmbed();
    embed.setDescription(description).setColor('BLUE');
    message.channel.send({ embeds: [embed] });
};