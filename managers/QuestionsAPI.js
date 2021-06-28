const { Message, MessageReaction, User, TextChannel, DMChannel, NewsChannel } = require('discord.js');

class MessageQuestion {
    /**
     * @param {{
     * messageTimeout?: number;
     * deleteQuestion?: boolean;
     * deleteMessage?: boolean;
     * }} options
     */
    setDefaultOptionsOverride(options) {
        this.options = options;
        return this;
    }

    /**
     * @param {(arg0: { last: Object; }) => Promise<import('discord.js').MessageOptions> | import('discord.js').MessageOptions} question
     */
    setQuestion(question) {
        this.question = question;
        return this;
    }

    /**
     * @param {(arg0: { message: Message; question: Message; last: { message: Message; result: Object; question: MessageQuestion; answered: []  } | { reaction: MessageReaction; user: User; result: Object; question: ReactionQuestion; possibleAnswers: string[]; answered: [] }; }) => Promise<boolean> | boolean} filter
     */
    setFilter(filter) {
        this.filter = filter;
        return this;
    }

    /**
     * @param {(args0: { message: Message; question: Message; last: { message: Message; result: Object; question: MessageQuestion; answered: []  } | { reaction: MessageReaction; user: User; result: Object; question: ReactionQuestion; possibleAnswers: string[]; answered: [] }; }) => Promise<Object> | Object} run
     */
    setRun(run) {
        this.run = run;
        return this;
    }
}

class ReactionQuestion {

    /**
     * @param {{
     * reactionTimeout?: number;
     * deleteQuestion?: boolean;
     * deleteReaction?: boolean;
     * }} options
     */
    setDefaultOptionsOverride(options) {
        this.options = options;
        return this;
    }

    /**
     * @param {(args0: { last: { message: Message; result: Object; question: MessageQuestion; answered: []  } | { reaction: MessageReaction; user: User; result: Object; question: ReactionQuestion; possibleAnswers: string[]; answered: [] }; } ) => Promise<string[]> | string[]} possibleAnswers
     */
    setPossibleAnswers(possibleAnswers) {
        this.possibleAnswers = possibleAnswers;
        return this;
    }

    /**
     * @param {(arg0: { last: Object; }) => Promise<import('discord.js').MessageOptions> | import('discord.js').MessageOptions} question
     */
    setQuestion(question) {
        this.question = question;
        return this;
    }

    /**
     * @param {(arg0: { reaction: MessageReaction; user: User; question: Message; last: { message: Message; result: Object; question: MessageQuestion; answered: []  } | { reaction: MessageReaction; user: User; result: Object; question: ReactionQuestion; possibleAnswers: string[]; answered: [] }; }) => Promise<boolean> | boolean} filter
     */
    setFilter(filter) {
        this.filter = filter;
        return this;
    }

    /**
     * @param {(args0: { reaction: MessageReaction; user: User; question: Message;  possibleAnswers: string[]; last: { message: Message; result: Object; question: MessageQuestion; answered: []  } | { reaction: MessageReaction; user: User; result: Object; question: ReactionQuestion; possibleAnswers: string[]; answered: [] }; }) => Promise<Object> | Object} run
     */
    setRun(run) {
        this.run = run;
        return this;
    }
}

const registeredQuestions = new WeakMap();

class QuestionsAPI {
    /**
     * @param {{
     * messageTimeout: number;
     * reactionTimeout: number;
     * deleteQuestion?: boolean;
     * deleteMessage?: boolean;
     * deleteReaction?: boolean;
     * }} defaultOptions
     */
    constructor(defaultOptions = { messageTimeout: 120 * 1000, reactionTimeout: 60 * 1000 }) {
        this.defaultOptions = defaultOptions;
        registeredQuestions.set(this, []);
    }

    /**
     * @param {MessageQuestion[] | ReactionQuestion[]} question
     */
    addQuestion(...question) {
        registeredQuestions.get(this).push(...question);
        return this;
    }

    /**
     * @param {TextChannel | DMChannel | NewsChannel} channel
     */
    async ask(channel) {
        const questions = registeredQuestions.get(this);
        const answered = [];
        let last;
        for (const questionObj of questions) {
            if (questionObj instanceof ReactionQuestion) {
                // @ts-ignore
                const { data, error } = await askReactionQuestionProcessor(questionObj, this.defaultOptions, channel, last);
                if (error) return { error };
                const { reaction, possibleAnswers, question, result, user } = data;
                last = { reaction, user, result, question, possibleAnswers, answered };
                answered.push(data);
                continue;
            }
            // @ts-ignore
            const { data, error } = await askMessageQuestionProcessor(questionObj, this.defaultOptions, channel, last);
            if (error) return { error };
            const { message, result, question } = data;
            last = { message, result, question, answered };
            answered.push(data);
        }
        return { data: answered };
    }
}

/**
 * @param {Message} message
 * @param {string[] | string} reactions
 */
async function react(message, reactions) {
    if (!Array.isArray(reactions)) reactions = [reactions];
    reactions.forEach((/** @type {string} */ reaction) => message.react(reaction).catch((e) => {
        //Suppresses errors if the user reacts before all the reactions got added.
        if (e.message !== 'Unknown Message') console.error(`Failed to add a reaction, Reason: ` + e.message);
    }));
}

/**
 * @param {ReactionQuestion} question
 * @param {DMChannel | TextChannel | NewsChannel} channel
 * @param {{messageTimeout: number;reactionTimeout: number; stopEmote?: string;deleteQuestion?: boolean;deleteMessage?: boolean;deleteReaction?: boolean;}} defaultOptions
 * @param {{message: Message;result: Object;question: MessageQuestion; answered: []; } | {reaction: MessageReaction;user: User;result: Object;question: ReactionQuestion;possibleAnswers: string[];answered: [];}} last
 * @return {Promise<{data?: { reaction: MessageReaction; possibleAnswers: string[]; question: Message; result: Object; user: User; }; error?: Error | string;}>}
 */
async function askReactionQuestionProcessor(question, defaultOptions, channel, last) {
    const options = question.options;
    const possibleAnswers = await question.possibleAnswers({ last });
    let questionMessage;
    try {
        questionMessage = await channel.send(await question.question({ last }));
        if (Array.isArray(questionMessage)) questionMessage = questionMessage[0];
    } catch (error) {
        return { error: error.message.includes('Cannot send messages to this user') ? 'dmClosed' : error };
    }
    react(questionMessage, possibleAnswers);
    let reactedBy;
    const filter = async (/** @type {MessageReaction} */ r, /** @type {User} */ u) => {
        const data = { reaction: r, user: u, question: questionMessage, possibleAnswers, last };
        const id = r.emoji.id;
        const name = r.emoji.name;
        if (!possibleAnswers.includes(name) && !possibleAnswers.includes(id)) return false;
        if (!question.filter(data)) return false;
        reactedBy = u;
        return true;
    };
    const collectorOptions = { maxEmojis: 1, errors: ['time'], time: (options && options.reactionTimeout) || defaultOptions.reactionTimeout };
    let collectedReaction;
    try {
        collectedReaction = await questionMessage.awaitReactions(filter, collectorOptions);
    } catch (error) {
        if ((options && options.deleteQuestion) || defaultOptions.deleteQuestion) questionMessage.delete();
        return { error: isIterable(error) ? 'time' : error };
    }
    const answer = collectedReaction.first();
    let result;
    if (question.run) result = await question.run({ reaction: answer, user: reactedBy, question: questionMessage, possibleAnswers, last });
    if ((options && options.deleteReaction) || defaultOptions.deleteReaction) questionMessage.reactions.resolve(answer).users.remove(reactedBy);
    if ((options && options.deleteQuestion) || defaultOptions.deleteQuestion) questionMessage.delete();
    const data = { reaction: answer, user: reactedBy, result, question: questionMessage, possibleAnswers };
    return { data };
}

/**
 * @param {MessageQuestion} question
 * @param {DMChannel | TextChannel | NewsChannel} channel
 * @param {{messageTimeout: number;reactionTimeout: number; stopEmote?: string;deleteQuestion?: boolean;deleteMessage?: boolean;deleteReaction?: boolean;}} defaultOptions
 * @param {{message: Message;result: Object;question: MessageQuestion;answered: [];} | {reaction: MessageReaction;user: User;result: Object;question: ReactionQuestion;possibleAnswers: string[];answered: [];}} last
 * @return {Promise<{data?: {message: Message; result: Object; question: Message;}; error?: Error | string }>}
 */
async function askMessageQuestionProcessor(question, defaultOptions, channel, last) {
    const options = question.options;
    let questionMessage;
    try {
        questionMessage = await channel.send(await question.question({ last }));
        if (Array.isArray(questionMessage)) questionMessage = questionMessage[0];
    } catch (error) {
        return { error: error.message.includes('Cannot send messages to this user') ? 'dmClosed' : error };
    }
    const filter = async (/** @type {Message} */ message) => question.filter({ message, question: questionMessage, last });
    const collectorOptions = { max: 1, errors: ['time'], time: (options && options.messageTimeout) || defaultOptions.messageTimeout };
    let collectedAnswer;
    let answer;
    try {
        collectedAnswer = await channel.awaitMessages(filter, collectorOptions);
    } catch (error) {
        if ((options && options.deleteQuestion) || defaultOptions.deleteQuestion) questionMessage.delete();
        return { error: isIterable(error) ? 'time' : error };
    }
    answer = collectedAnswer.first();
    if (typeof answer !== 'object' && Array.isArray(answer)) return { error: answer };
    let result;
    if (question.run) result = await question.run({ message: answer, question: questionMessage, last });
    if ((options && options.deleteQuestion) || defaultOptions.deleteQuestion) questionMessage.delete();
    if ((options && options.deleteMessage) || defaultOptions.deleteMessage) answer.delete();
    const data = { message: answer, result, question: questionMessage };
    return { data };
}

/**
 * @param {Object} obj
 */
function isIterable(obj) {
    if (obj == null) {
        return false;
    }
    return typeof obj[Symbol.iterator] === 'function';
}