async function askMessageQuestion(questionObj, channel) {
    return await askMessageQuestionProcesser(questionObj, channel);
}

async function askReactionQuestion(questionObj, channel) {
    return await askReactionQuestionProcesser(questionObj, channel);
}

async function askReactionQuestionProcesser(questionObj, channel, last) {
    try {
        let timeout = 60;
        const options = questionObj.options;
        const possibleAnswers = questionObj.possibleAnswers;
        const sentQuestion = await channel.send(await questionObj.content(last));
        possibleAnswers.forEach(possibleAnswer => sentQuestion.react(possibleAnswer));
        let reactedBy;
        const filter = (r, u) => {
            if (!possibleAnswers.includes(r.emoji.name)) return false;
            if (!questionObj.filter({ reaction: r, user: u, last })) return false;
            reactedBy = u;
            return true;
        };
        if (options) {
            if (options.timeout) timeout = options.timeout;
        }
        const collectedReaction = await sentQuestion.awaitReactions(filter, { time: timeout * 1000, maxEmojis: 1, errors: ['time'] });
        const answer = collectedReaction.first();
        let processedData;
        if (questionObj.run) processedData = await questionObj.run({ reaction: answer, user: reactedBy, last });
        if (questionObj.options) {
            if (questionObj.options.deleteReaction) sentQuestion.reactions.resolve(answer).users.remove(reactedBy);
            if (questionObj.options.deleteBotMessage) sentQuestion.delete();
            if (questionObj.options.deleteUserMessage) answer.delete();
        }
        return { answer, reactedBy, processedData, sentQuestion };
    } catch (error) {
        return;
    }
}

async function askMessageQuestionProcesser(questionObj, channel, last) {
    try {
        let timeout = 60;
        const options = questionObj.options;
        const sentQuestion = await channel.send(await questionObj.content(last));
        const filter = message => questionObj.filter({ message, last });
        if (options) {
            if (options.timeout) timeout = options.timeout;
        }
        const collectedAnswer = await channel.awaitMessages(filter, { max: 1, time: timeout * 1000, errors: ['time'] });
        const answer = collectedAnswer.first();
        let processedData;
        if (questionObj.run) processedData = await questionObj.run({ message: answer, last });
        if (options) {
            if (options.deleteBotMessage) sentQuestion.delete();
            if (options.deleteUserMessage) answer.delete();
        }
        return { answer, processedData, sentQuestion };
    } catch (error) {
        return;
    }
}


async function askMessageQuestions(questionObjs, channel) {
    const answers = [];
    let lastAnswer;
    let lastQuestion;
    let lastProcessedData;
    for (const questionObj of questionObjs) {
        const last = { lastAnswer, lastProcessedData, lastQuestion, processedAnswers: answers };
        const data = await askMessageQuestionProcesser(questionObj, channel, last);
        if (!data) return;
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
        try {
            const last = { lastAnswer, lastAnsweredBy, lastProcessedData, processedAnswers: answers };
            const data = await askReactionQuestionProcesser(questionObj, channel, last);
            if (!data) return;
            const { answer, reactedBy, processedData, sentQuestion } = data;
            lastAnswer = answer;
            lastAnsweredBy = reactedBy;
            lastProcessedData = processedData;
            lastQuestion = sentQuestion;
            answers.push({ answer, reactedBy });
        } catch (error) {
            return;
        }
    }
    return answers;
}

async function askQuestions(questionObjs, channel) {
    const answers = [];
    let last;
    for (const questionObj of questionObjs) {
        if (questionObj.type === 'message') {
            const data = await askMessageQuestionProcesser(questionObj, channel, last);
            if (!data) return;
            const { answer, processedData, sentQuestion } = data;
            last = { lastAnswer: answer, lastProcessedData: processedData, lastQuestion: sentQuestion, processedAnswers: answers };
            answers.push(answer);
            continue;
        }
        const data = await askReactionQuestionProcesser(questionObj, channel, last);
        if (!data) return;
        const { answer, reactedBy, processedData, sentQuestion } = data;
        last = { lastAnswer: answer, lastAnsweredBy: reactedBy, lastProcessedData: processedData, lastQuestion: sentQuestion, processedAnswers: answers };
        answers.push({ answer, reactedBy });
    }
    return answers;
}

module.exports.askReactionQuestion = askReactionQuestion;
module.exports.askMessageQuestion = askMessageQuestion;
module.exports.askReactionQuestions = askReactionQuestions;
module.exports.askMessageQuestions = askMessageQuestions;
module.exports.askQuestions = askQuestions;