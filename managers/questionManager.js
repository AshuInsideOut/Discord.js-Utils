const logger = require('../utils/logger');
const defaultStopEmoji = '🛑';

/**
 * @deprecated
 * Use QuestionsAPI
 */
async function askMessageQuestion(questionObj, channel) {
    return await askMessageQuestionProcessor(questionObj, channel);
}

/**
 * @deprecated
 * Use QuestionsAPI
 */
async function askReactionQuestion(questionObj, channel) {
    return await askReactionQuestionProcessor(questionObj, channel);
}

async function react(message, reactions) {
    if (!Array.isArray(reactions)) reactions = [reactions];
    reactions.forEach(reaction => message.react(reaction).catch(e => {
        //Suppresses errors if the user reacts before all the reactions got added.
        if (e.message !== 'Unknown Message') logger.error(`Failed to add a reaction, Reason: ` + e.message);
    }));
}

async function askReactionQuestionProcessor(questionObj, channel, last) {
    const options = questionObj.options;
    const possibleAnswers = await questionObj.possibleAnswers({ last });
    const isStopEnabled = options && options.stopReaction;
    const stopReactionObj = options.stopReaction;
    const stopReaction = stopReactionObj ? (stopReactionObj.reaction || defaultStopEmoji) : undefined;
    let question;
    try {
        question = await channel.send(await questionObj.content({ last }));
    } catch (error) {
        return { error: channel.type === 'dm' ? 'dmClosed' : error };
    }
    react(question, possibleAnswers);
    if (isStopEnabled) react(question, stopReaction);
    let reactedBy;
    const filter = async (r, u) => {
        const data = { reaction: r, user: u, question, possibleAnswers, last };
        const id = r.emoji.id;
        const name = r.emoji.name;
        if (isStopEnabled && (name === stopReaction || id === stopReaction))
            return stopReactionObj.filter ? await stopReactionObj.filter(data) : true;
        if (!possibleAnswers.includes(name) && !possibleAnswers.includes(id)) return false;
        if (!questionObj.filter(data)) return false;
        reactedBy = u;
        return true;
    };
    const collectorOptions = { maxEmojis: 1, errors: ['time'] };
    if (options && options.time) collectorOptions.time = options.time * 1000;
    let collectedReaction;
    try {
        collectedReaction = await question.awaitReactions(filter, collectorOptions);
    } catch (error) {
        if (options && options.deleteQuestion) question.delete();
        return { error: isIterable(error) ? 'time' : error };
    }
    const answer = collectedReaction.first();
    if (isStopEnabled && (answer.emoji.name === stopReaction || answer.emoji.id === stopReaction))
        return { error: 'stopped' };
    let result;
    if (questionObj.run) result = await questionObj.run({ reaction: answer, user: reactedBy, question, possibleAnswers, last });
    if (options && options.deleteReaction) question.reactions.resolve(answer).users.remove(reactedBy);
    if (options && options.deleteQuestion) question.delete();
    const data = { reaction: answer, user: reactedBy, result, question, possibleAnswers };
    return { data };
}

async function askMessageQuestionProcessor(questionObj, channel, last) {
    const options = questionObj.options;
    const isStopEnabled = options && options.stopReaction;
    const stopReactionObj = options.stopReaction;
    const stopReaction = stopReactionObj ? (stopReactionObj.reaction || defaultStopEmoji) : undefined;
    let question;
    try {
        question = await channel.send(await questionObj.content({ last }));
    } catch (error) {
        return { error: channel.type === 'dm' ? 'dmClosed' : error };
    }
    if (isStopEnabled) react(question, stopReaction);
    const filter = async message => questionObj.filter({ message, question, last });
    const collectorOptions = { max: 1, errors: ['time'] };
    if (options && options.time) collectorOptions.time = options.time * 1000;
    let answer;
    if (isStopEnabled) {
        const stopReactionFilter = async (r, u) => {
            if (r.emoji.name !== stopReaction && r.emoji.id !== stopReaction) return false;
            return stopReactionObj.filter ? await stopReactionObj.filter({ reaction: r, user: u, question, last }) : true;
        };
        const stopReactionOptions = { maxEmojis: 1 };
        if (options && options.time) stopReactionOptions.time = options.time * 1000;
        answer = await awaitMessage({ channel, filter, options: collectorOptions }, { message: question, filter: stopReactionFilter, options: stopReactionOptions });
    } else {
        let collectedAnswer;
        try {
            collectedAnswer = await channel.awaitMessages(filter, collectorOptions);
        } catch (error) {
            if (options && options.deleteQuestion) question.delete();
            return { error: isIterable(error) ? 'time' : error };
        }
        answer = collectedAnswer.first();
    }
    if (typeof answer !== 'object' && Array.isArray(answer)) return { error: answer };
    let result;
    if (questionObj.run) result = await questionObj.run({ message: answer, question: question, last });
    if (options && options.deleteQuestion) question.delete();
    if (options && options.deleteMessage) answer.delete();
    const data = { message: answer, result, question };
    return { data };
}

async function awaitMessage(channelData, messageData) {
    return await new Promise((resolve) => {
        const messageCollector = channelData.channel.createMessageCollector(channelData.filter, messageData.options);
        messageCollector.on('collect', m => {
            resolve(m);
            messageCollector.stop();
        });
        messageCollector.on('end', (c, reason) => resolve(reason));
        if (messageData) {
            const reactionCollector = messageData.message.createReactionCollector(messageData.filter, messageData.options);
            reactionCollector.on('collect', r => {
                resolve('stopped');
                reactionCollector.stop();
            });
        }
    });
}

/**
 * @deprecated
 * Use QuestionsAPI
 */
async function askMessageQuestions(questionObjs, channel) {
    const answered = [];
    let last;
    for (const questionObj of questionObjs) {
        const { data, error } = await askMessageQuestionProcessor(questionObj, channel, last);
        if (error) return { error };
        const { message, result, question } = data;
        last = { message, result, question, answered };
        answered.push(data);
    }
    return { data: answered };
}

/**
 * @deprecated
 * Use QuestionsAPI
 */
async function askReactionQuestions(questionObjs, channel) {
    const answered = [];
    let last;
    for (const questionObj of questionObjs) {
        const { data, error } = await askReactionQuestionProcessor(questionObj, channel, last);
        if (error) return { error };
        const { reaction, user, result, question, possibleAnswers } = data;
        last = { reaction, user, question, result, possibleAnswers, answered };
        answered.push(data);
    }
    return { data: answered };
}

/**
 * @deprecated
 * Use QuestionsAPI
 */
async function askQuestions(questionObjs, channel) {
    const answered = [];
    let last;
    for (const questionObj of questionObjs) {
        if (questionObj.type === 'reaction') {
            const { data, error } = await askReactionQuestionProcessor(questionObj, channel, last);
            if (error) return { error };
            const { reaction, user, result, question, possibleAnswers } = data;
            last = { reaction, user, result, question, possibleAnswers, answered };
            answered.push(data);
            continue;
        }
        const { data, error } = await askMessageQuestionProcessor(questionObj, channel, last);
        if (error) return { error };
        const { message, result, question } = data;
        last = { message, result, question, answered };
        answered.push(data);
    }
    return { data: answered };
}



function isIterable(obj) {
    if (obj == null) {
        return false;
    }
    return typeof obj[Symbol.iterator] === 'function';
}

module.exports.askReactionQuestion = askReactionQuestion;
module.exports.askMessageQuestion = askMessageQuestion;
module.exports.askReactionQuestions = askReactionQuestions;
module.exports.askMessageQuestions = askMessageQuestions;
module.exports.askQuestions = askQuestions;