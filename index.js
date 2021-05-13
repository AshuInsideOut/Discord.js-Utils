async function askMessageQuestion(questionObj, channel) {
    return await askMessageQuestionProcesser(questionObj, channel);
}

async function askReactionQuestion(questionObj, channel) {
    return await askReactionQuestionProcesser(questionObj, channel);
}

/*
Options:
  stopReaction: String,
  timeout: Number,
  deleteReaction: Boolean,
  deleteBotMessage: Boolean
*/

async function askReactionQuestionProcesser(questionObj, channel, last) {
    try {
        const options = questionObj.options;
        const possibleAnswers = questionObj.possibleAnswers;
        let sentQuestion;
        try {
            sentQuestion = await channel.send(await questionObj.content(last));
        } catch (error) {
            if (channel.type === 'dm') return 'dmClosed';
            return error.message;
        }
        possibleAnswers.forEach(possibleAnswer => {
            sentQuestion.react(possibleAnswer);
            if (options) {
                if (options.stopReaction) sentQuestion.react(options.stopReaction);
            }
        });
        let reactedBy;
        const filter = (r, u) => {
            if (options) {
                if (options.stopReaction) {
                    if (r.emoji.name === options.stopReaction) {
                        if (options.stopReactionFilter)
                            return options.stopReactionFilter({ reaction: r, user: u, question: sentQuestion, last, });
                        return true;
                    }
                }
            }
            if (!possibleAnswers.includes(r.emoji.name)) return false;
            if (!questionObj.filter({ reaction: r, user: u, question: sentQuestion, last })) return false;
            reactedBy = u;
            return true;
        };
        const collectorOptions = { maxEmojis: 1, errors: ['time'] };
        if (options) {
            if (options.timeout) collectorOptions.time = options.timeout * 1000;
        }
        const collectedReaction = await sentQuestion.awaitReactions(filter, collectorOptions);
        const answer = collectedReaction.first();
        if (options) {
            if (options.stopReaction) {
                if (answer.emoji.name === options.stopReaction) return 'stopped';
            }
        }
        let processedData;
        if (questionObj.run) processedData = await questionObj.run({ reaction: answer, user: reactedBy, question: sentQuestion, last });
        if (options) {
            if (options.deleteReaction) sentQuestion.reactions.resolve(answer).users.remove(reactedBy);
            if (options.deleteBotMessage) sentQuestion.delete();
        }
        return { answer, reactedBy, processedData, sentQuestion };
    } catch (error) {
        return 'time';
    }
}

/*
Options:
  stopReaction: String,
  timeout: Number,
  deleteUserMessage: Boolean,
  deleteBotMessage: Boolean
*/

async function askMessageQuestionProcesser(questionObj, channel, last) {
    try {
        const options = questionObj.options;
        let sentQuestion;
        try {
            sentQuestion = await channel.send(await questionObj.content(last));
        } catch (error) {
            if (channel.type === 'dm') return 'dmClosed';
            return error.message;
        }
        if (options) {
            if (options.stopReaction) sentQuestion.react(options.stopReaction);
        }
        const filter = message => questionObj.filter({ message, question: sentQuestion, last, });
        const collectorOptions = { max: 1, errors: ['time'] };
        if (options) {
            if (options.timeout) collectorOptions.time = options.timeout * 1000;
        }
        let answer;
        if (options) {
            if (options.stopReaction) {
                const stopReactionFilter = (r, u) => {
                    if (r.emoji.name !== options.stopReaction) return false;
                    if (options.stopReactionFilter) return options.stopReactionFilter({ reaction: r, user: u, question: sentQuestion, last, });
                    return false;
                };
                const stopReactionOptions = { maxEmojis: 1 };
                if (options) {
                    if (options.timeout) stopReactionOptions.time = options.timeout * 1000;
                }
                answer = await awaitMessage({ channel, filter, options: collectorOptions }, { message: sentQuestion, filter: stopReactionFilter, options: stopReactionOptions });
            }
        } else {
            const collectedAnswer = await channel.awaitMessages(filter, collectorOptions);
            answer = collectedAnswer.first();
        }
        if (typeof answer !== 'object') return answer;
        let processedData;
        if (questionObj.run) processedData = await questionObj.run({ message: answer, question: sentQuestion, last });
        if (options) {
            if (options.deleteBotMessage) sentQuestion.delete();
            if (options.deleteUserMessage) answer.delete();
        }
        return { answer, processedData, sentQuestion };
    } catch (error) {
        return 'time';
    }
}

async function awaitMessage(channelData, messageData) {
    return await new Promise((resolve) => {
        const messageCollector = channelData.channel.createMessageCollector(channelData.filter, messageData.options);
        messageCollector.on('collect', m => {
            resolve(m);
            messageCollector.stop();
        });
        messageCollector.on('end', (c, reason) => {
            if (reason === 'time') resolve(reason);
        });
        if (messageData) {
            const reactionCollector = messageData.message.createReactionCollector(messageData.filter, messageData.options);
            reactionCollector.on('collect', r => {
                resolve('stopped');
                reactionCollector.stop();
            });
        }
    });
}

/*
    try {
        const options = questionObj.options;
        let sentQuestion;
        try {
            sentQuestion = await channel.send(await questionObj.content(last));
        } catch (error) {
            if (channel.type === 'dm') return 'dmClosed';
            return error.message;
        }
        const filter = message => questionObj.filter({ message, question: sentQuestion, last, });
        const collectorOptions = { max: 1, errors: ['time'] };
        if (options) {
            if (options.timeout) collectorOptions.time = options.timeout * 1000;
        }
        const collectedAnswer = await channel.awaitMessages(filter, collectorOptions);
        const answer = collectedAnswer.first();
        let processedData;
        if (questionObj.run) processedData = await questionObj.run({ message: answer, question: sentQuestion, last });
        if (options) {
            if (options.deleteBotMessage) sentQuestion.delete();
            if (options.deleteUserMessage) answer.delete();
        }
        return { answer, processedData, sentQuestion };
    } catch (error) {
        return 'time';
    }
*/


async function askMessageQuestions(questionObjs, channel) {
    const answers = [];
    let lastAnswer;
    let lastQuestion;
    let lastProcessedData;
    for (const questionObj of questionObjs) {
        const last = { lastAnswer, lastProcessedData, lastQuestion, processedAnswers: answers };
        const data = await askMessageQuestionProcesser(questionObj, channel, last);
        if (typeof data !== 'object') return data;
        const { answer, processedData, sentQuestion } = data;
        lastAnswer = answer;
        lastProcessedData = processedData;
        lastQuestion = sentQuestion;
        answers.push(answer);
    }
    return answers;
}

async function askReactionQuestions(questionObjs, channel) {
    const answers = [];
    let lastAnswer;
    let lastAnsweredBy;
    let lastQuestion;
    let lastProcessedData;
    for (const questionObj of questionObjs) {
        const last = { lastAnswer, lastAnsweredBy, lastQuestion, lastProcessedData, processedAnswers: answers };
        const data = await askReactionQuestionProcesser(questionObj, channel, last);
        if (typeof data !== 'object') return data;
        const { answer, reactedBy, processedData, sentQuestion } = data;
        lastAnswer = answer;
        lastAnsweredBy = reactedBy;
        lastProcessedData = processedData;
        lastQuestion = sentQuestion;
        answers.push({ answer, reactedBy });
    }
    return answers;
}

async function askQuestions(questionObjs, channel) {
    const answers = [];
    let last;
    for (const questionObj of questionObjs) {
        if (questionObj.type === 'reaction') {
            const data = await askReactionQuestionProcesser(questionObj, channel, last);
            if (typeof data !== 'object') return data;
            const { answer, reactedBy, processedData, sentQuestion } = data;
            last = { lastAnswer: answer, lastAnsweredBy: reactedBy, lastProcessedData: processedData, lastQuestion: sentQuestion, processedAnswers: answers };
            answers.push({ answer, reactedBy });
            continue;
        }
        const data = await askMessageQuestionProcesser(questionObj, channel, last);
        if (typeof data !== 'object') return data;
        const { answer, processedData, sentQuestion } = data;
        last = { lastAnswer: answer, lastProcessedData: processedData, lastQuestion: sentQuestion, processedAnswers: answers };
        answers.push(answer);
    }
    return answers;
}

module.exports.askReactionQuestion = askReactionQuestion;
module.exports.askMessageQuestion = askMessageQuestion;
module.exports.askReactionQuestions = askReactionQuestions;
module.exports.askMessageQuestions = askMessageQuestions;
module.exports.askQuestions = askQuestions;