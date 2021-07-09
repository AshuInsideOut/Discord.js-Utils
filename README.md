# Discord.js Utils (Re-Coded in TypeScript)

A utils package for discord.js lib. This contains utils function and classes to easily work with Discord.js

# Support

Join our [Discord Server](http://discord.abdevs.org) for any support related queries.

# Installation

`npm i @abdevs/discord.js-utils` or `yarn add @abdevs/discord.js-utils`

# Options

| Option            | Default                              | Description             |
| ----------------- | ------------------------------------ | ----------------------- |
| isCmdManager      | `false`                              | Enables command manager |
| isHelpCommand     | `false`                              | Adds a help command     |
| cmdManagerOptions | `{ isPrefixMap: false, prefix: '!'}` | Command Manager Options |

# Features

| Function / Class                      | Description                                                                                        |
| ------------------------------------- | -------------------------------------------------------------------------------------------------- |
| MessageQuestion                       | Builds message question object                                                                     |
| ReactionQuestion                      | Builds reaction question object                                                                    |
| [QuestionsAPI](#questionsapi-example) | Build the questions API. Lets you easily ask long sets of questions from single or multiple users. |
| askReactionQuestion                   | Lets your ask a single reaction question                                                           |
| askMessageQuestion                    | Lets your ask a single message question                                                            |
| ReactionMenu                          | Builds a reaction menu (Credits: [Juby210](https://github.com/Juby210/discord.js-reaction-menu))   |
| PaginationMenu                        | Builds a pagination menu (Credits: [Thomas Jowsey](https://github.com/jowsey/discord.js-menu))     |
| errorHandler                          | One liner error handler                                                                            |
| deepCloneWithLose                     | Deep clones a non-complex object                                                                   |
| isValidSnowflake                      | If the provide string is a valid snowflake                                                         |
| fetchUser                             | Fetches a user                                                                                     |
| fetchChannel                          | Fetches a channel                                                                                  |
| fetchGuild                            | Fetches a guild                                                                                    |
| fetchMember                           | Fetches a member                                                                                   |
| fetchRole                             | Fetches a role                                                                                     |
| toTimestamp                           | Converts string time eg: `5h2m` into milliseconds                                                  |
| toTimeLeft                            | Converts milliseconds to `1 Minute 20 Seconds` format                                              |
| getRandomInt                          | A random number between the provided range                                                         |
| findCodeBlock                         | Finds the groups between a string code block                                                       |
| findEmoteById                         | Finds a emote by id                                                                                |
| isValidEmail                          | Checks if an email address is valid                                                                |
| getConfig                             | Creates a config file or `yml` or `json` and returns the config object                             |
| SpamHandler                           | Checks if a user is spamming                                                                       |
| getPrefix                             | Gets the default prefix or guild prefix                                                            |
| getPrefixMap                          | Gets the guild prefix map                                                                          |
| registerCategory                      | Registers a category                                                                               |
| addCommand                            | Adds a command                                                                                     |
| addMiddleware                         | Adds a middleware                                                                                  |

# Examples

### QuestionsAPI Example

```js
const {
  addCommand,
  MessageQuestion,
  ReactionQuestion,
  QuestionsAPI,
} = require('@abdevs/discord.js-utils');
const { MessageEmbed } = require('discord.js');

module.exports = async () => {
  addCommand({
    command: 'helpme',
    handler: async (message) => {
      const typeEmbed = new MessageEmbed({
        description: `What type of help you want?
            ❤: *Love Life*
            💰: *Money*`,
        color: 'RANDOM',
      });
      const moreInfo = new MessageEmbed({
        description: 'We need additional about your situation',
        color: 'RANDOM',
      });
      const api = new QuestionsAPI();
      const typeQuestion = new ReactionQuestion(message.author.id)
        .setQuestion({ embed: typeEmbed, reply: message.author })
        .setPossibleAnswers(['❤', '💰'])
        .setRun(({ reaction }) => {
          if (reaction.emoji.name === '❤') return 'Love';
          return 'Money';
        });
      const helpQuestion = new MessageQuestion(message.author.id)
        .setQuestion({ embed: moreInfo, reply: message.author })
        .setRun(({ message }) => message.content);
      api.addQuestion([typeQuestion, helpQuestion]);
      const { data } = await api.ask(message.channel);
      const type = data[0].result;
      const info = data[1].result;
      const embed = new MessageEmbed({
        description: `${message.author.toString()} needs help with **${type}**
            *Here is some additional information:*
            ${info}`,
      });
      message.channel.send({ embed });
    },
  });
};
```

# Terms and Conditions

This Repository only available for code look up and personal use.

You are not allowed to steal the code from this repository.
