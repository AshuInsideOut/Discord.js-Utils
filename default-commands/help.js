const { registeredCommands } = require('../managers/commandManager');
const { MessageEmbed } = require('discord.js');

module.exports = async (message) => {
    const commands = [...registeredCommands];
    const sortedCommands = commands.sort((a, b) => b.category.weight - a.category.weight);
    const categories = [];
    sortedCommands.forEach(command => {
        if (!categories.find(c => c.category.name)) categories.push(command.category);
        //if (!categories.includes(command.category)) categories.push(command.category);
    });
    const sortedCategoryCommandArray = [];
    categories.forEach(category => {
        const sortedCategoryCommand = [];
        sortedCommands.forEach(command => {
            if (command.category.name === category.name) sortedCategoryCommand.push(command);
        });
        sortedCategoryCommandArray.push(sortedCategoryCommand);
    });
    let description = '';
    sortedCategoryCommandArray.forEach(sortedCategoryCommand => {
        description += `\n 💠 **${sortedCategoryCommand[0].category.name}**\n`;
        sortedCategoryCommand.forEach(b => {
            description += `◻ \`${b.command}\`: ${b.description}\n`;
        });
    });
    const embed = new MessageEmbed();
    embed.setDescription(description).setColor('BLUE');
    message.channel.send(embed);
};