import { Message, MessageReaction, User } from 'discord.js';
import {
    MessageQuestionOptions,
    QuestionMessage,
    MessageQuestionFilter,
    MessageQuestionRun,
    ReactionQuestionOptions,
    PossibleAnswers,
    ReactionQuestionFilter,
    ReactionQuestionRun,
    QuestionOptions,
    SupportedChannel,
    LastMessageAnswer,
    LastReactionAnswer,
    MessageContent,
    ProcessedReactionQuestionResult,
    ProcessedMessageQuestionResult,
    QuestionType
} from '../interfaces/QuestionsAPI';
import logger from '../utils/logger';

export class MessageQuestion {
    public question?: QuestionMessage;
    public filter?: MessageQuestionFilter;
    public run?: MessageQuestionRun;
    public readonly userIds: string[];
    constructor(userIds: string[] | string, public readonly options?: MessageQuestionOptions) {
        this.userIds = toArray(userIds);
    }
    setQuestion(question: QuestionMessage) {
        this.question = question;
        return this;
    }
    setFilter(filter: MessageQuestionFilter) {
        this.filter = filter;
        return this;
    }
    setRun(run: MessageQuestionRun) {
        this.run = run;
        return this;
    }
    isValid() {
        return !!(this.question && this.userIds);
    }
}
export class ReactionQuestion {
    public question?: QuestionMessage;
    public possibleAnswers?: PossibleAnswers;
    public filter?: ReactionQuestionFilter;
    public run?: ReactionQuestionRun;
    public readonly userIds: string[];
    constructor(userIds: string[] | string, public readonly options?: ReactionQuestionOptions) {
        this.userIds = toArray(userIds);
    }
    setPossibleAnswers(possibleAnswers: PossibleAnswers) {
        this.possibleAnswers = possibleAnswers;
        return this;
    }
    setQuestion(question: QuestionMessage) {
        this.question = question;
        return this;
    }
    setFilter(filter: ReactionQuestionFilter) {
        this.filter = filter;
        return this;
    }
    setRun(run: ReactionQuestionRun) {
        this.run = run;
        return this;
    }
    isValid() {
        return !!(this.question && this.possibleAnswers && this.userIds);
    }
}

export class QuestionsAPI {
    private readonly registeredQuestions: QuestionType[] = [];
    private readonly defaultOptions: QuestionOptions;
    constructor(defaultOptions = {
        messageTimeout: 120 * 1000,
        reactionTimeout: 60 * 1000,
        deleteMessage: false,
        deleteQuestion: false,
        deleteReaction: false,
    }) {
        const {
            messageTimeout = 120 * 1000,
            reactionTimeout = 60 * 1000,
            deleteMessage = false,
            deleteQuestion = false,
            deleteReaction = false,
        } = defaultOptions;
        this.defaultOptions = { messageTimeout, reactionTimeout, deleteMessage, deleteQuestion, deleteReaction };
    }

    addQuestion(question: QuestionType[] | QuestionType) {
        if (!Array.isArray(question)) question = [question];
        question.forEach(question => {
            if (question.isValid()) return this.registeredQuestions.push(question);
            logger.error('The question you trying to register is not valid. Make sure to validate your question object with #isValid() function.');
        });
        return this;
    }

    async ask(channel: SupportedChannel) {
        const questions = this.registeredQuestions;
        const answered: (LastMessageAnswer | LastReactionAnswer)[] = [];
        let last: LastReactionAnswer | LastMessageAnswer | undefined = undefined;
        for (const question of questions) {
            if (question instanceof ReactionQuestion) {
                const result: ProcessedReactionQuestionResult = await askReactionQuestionProcessor(question, this.defaultOptions, channel, last);
                if (result.error) return { error: result.error, errorData: result.data = {} };
                last = result.data as LastReactionAnswer;
                answered.push(last);
                continue;
            }
            if (question instanceof MessageQuestion) {
                const result: ProcessedMessageQuestionResult = await askMessageQuestionProcessor(question, this.defaultOptions, channel, last);
                if (result.error) return { error: result.error, errorData: result.data = {} };
                last = result.data as LastMessageAnswer;
                answered.push(last);
                continue;
            }
        }
        return { data: answered };
    }
}

function react(message: Message, reactions: string[] | string) {
    reactions = toArray(reactions);
    reactions.forEach(reaction => message.react(reaction).catch((e) => {
        //Suppresses errors if the user reacts before all the reactions got added.
        if (e.message !== 'Unknown Message') console.error(`Failed to add a reaction, Reason: ` + e.message);
    }));
}

function removeReaction(message: Message, reaction: MessageReaction, user: User) {
    const resolved = message!.reactions.resolve(reaction);
    if (resolved) resolved.users.remove(user).catch((e: Error) => {
        if (!e.message.includes('Cannot execute action on a DM channel')) return;
        logger.warn(`Failed to delete reaction of ${user.tag}. Not allowed in DM.`);
    });
}

function deleteMessage(message: Message) {
    message.delete().catch((e: Error) => {
        if (!e.message.includes('Cannot execute action on a DM channel')) return;
        logger.warn(`Failed to delete message of ${message.author.tag}. Not allowed in DM.`);
    });
}

function checkOverrides<T>(propertyName: string, defaultOptions: any, options: any, defaultValue: T): T {
    if (options && options.hasOwnProperty(propertyName)) return options[propertyName];
    if (defaultOptions && defaultOptions.hasOwnProperty(propertyName)) return defaultOptions[propertyName];
    return defaultValue;
}

async function askReactionQuestionProcessor(question: ReactionQuestion, defaultOptions: QuestionOptions, channel: SupportedChannel, last?: LastReactionAnswer | LastMessageAnswer): Promise<ProcessedReactionQuestionResult> {
    //Final validation check
    if (!question.isValid()) return { error: new Error('Invalid body') };
    const options = question.options;
    const userIds = question.userIds;
    let possibleAnswers: string[];
    //Getting the possible reactions for the question message
    if (typeof question.possibleAnswers! === 'function')
        possibleAnswers = toArray(await question.possibleAnswers!({ last }));
    else possibleAnswers = toArray(question.possibleAnswers!);
    let questionMessage: Message;
    try {
        //Trying to get the content and sending it to the channel.
        let content: MessageContent;
        if (typeof question.question! === 'function')
            content = await question.question!({ last });
        else content = question.question!;
        const message = await channel.send(content);
        if (Array.isArray(message)) questionMessage = message[0];
        else questionMessage = message;
    } catch (error) {
        //If error then checking if it's because of time or else return the error.
        return {
            data: { possibleAnswers },
            error: error instanceof Error ? (channel.type === 'dm' && error.message.includes('Cannot send messages to this user') ? new Error('dmClosed') : error) : new Error('Unknown')
        };
    }
    //Setting all the reactions
    react(questionMessage, possibleAnswers);
    let reactedBy: User;
    const filter = async (r: MessageReaction, u: User) => {
        //Checking if the reaction is added by the provided users
        if (!userIds.includes(u.id)) return false;
        const id = r.emoji.id;
        const name = r.emoji.name;
        if (!possibleAnswers.includes(name) && id && !possibleAnswers.includes(id)) return false;
        const data = { reaction: r, user: u, question: questionMessage, possibleAnswers, last };
        if (question.filter && !(await question.filter!(data))) return false;
        reactedBy = u;
        return true;
    };
    const collectorOptions = { maxEmojis: 1, errors: ['time'], time: checkOverrides('reactionTimeout', defaultOptions, options, 60 * 1000) };
    let collectedReaction;
    try {
        collectedReaction = await questionMessage.awaitReactions(filter, collectorOptions);
    } catch (error) {
        if (checkOverrides('deleteQuestion', defaultOptions, options, false)) deleteMessage(questionMessage);
        return {
            data: { question: questionMessage, possibleAnswers },
            error: isIterable(error) ? new Error('time') : (error instanceof Error ? error : new Error('Unknown')),
        };
    }
    const answer = collectedReaction.first();
    if (!answer || !reactedBy!) return {
        data: { question: questionMessage, possibleAnswers },
        error: new Error('No collected reaction found')
    };
    let result;
    if (question.run) result = await question.run({ reaction: answer, user: reactedBy, question: questionMessage, possibleAnswers, last });
    if (checkOverrides('deleteReaction', defaultOptions, options, false)) removeReaction(questionMessage, answer, reactedBy);
    if (checkOverrides('deleteQuestion', defaultOptions, options, false)) deleteMessage(questionMessage);
    const data = { reaction: answer, user: reactedBy, result, question: questionMessage, possibleAnswers };
    return { data };
}

async function askMessageQuestionProcessor(question: MessageQuestion, defaultOptions: QuestionOptions, channel: SupportedChannel, last?: LastReactionAnswer | LastMessageAnswer): Promise<ProcessedMessageQuestionResult> {
    if (!question.isValid()) return { error: new Error('Invalid body') };
    const options = question.options;
    const userIds = question.userIds;
    let questionMessage: Message;
    try {
        let content: MessageContent;
        if (typeof question.question! === 'function')
            content = await question.question!({ last });
        else content = question.question!;
        const message = await channel.send(content);
        if (Array.isArray(message)) questionMessage = message[0];
        else questionMessage = message;
    } catch (error) {
        return {
            error: error instanceof Error ? (channel.type === 'dm' && error.message.includes('Cannot send messages to this user') ? new Error('dmClosed') : error) : new Error('Unknown')
        };
    }
    const filter = async (message: Message) => {
        if (!userIds.includes(message.author.id)) return false;
        return !question.filter ? true : await question.filter!({ message, question: questionMessage, last });
    };
    const collectorOptions = { max: 1, errors: ['time'], time: checkOverrides('messageTimeout', defaultOptions, options, 120 * 1000) };
    let collectedAnswer;
    try {
        collectedAnswer = await channel.awaitMessages(filter, collectorOptions);
    } catch (error) {
        if (checkOverrides('deleteQuestion', defaultOptions, options, false)) deleteMessage(questionMessage);
        return {
            data: { question: questionMessage },
            error: isIterable(error) ? new Error('time') : (error instanceof Error ? error : new Error('Unknown'))
        };
    }
    const answer = collectedAnswer.first();
    if (!answer) return {
        data: { question: questionMessage },
        error: new Error('No collected reaction found')
    };
    let result;
    if (question.run) result = await question.run({ message: answer, question: questionMessage, last });
    if (checkOverrides('deleteQuestion', defaultOptions, options, false)) deleteMessage(questionMessage);
    if (checkOverrides('deleteMessage', defaultOptions, options, false)) deleteMessage(answer);
    const data = { message: answer, result, question: questionMessage };
    return { data };
}

function isIterable(obj: any) {
    if (obj == null) return false;
    return typeof obj[Symbol.iterator] === 'function';
}

export async function askReactionQuestion(emojis: string | string[], userIds: string | string[], channel: SupportedChannel, messageObj: MessageContent, timeout = 120 * 1000) {
    if (typeof emojis === 'string') emojis = [emojis];
    const question = new ReactionQuestion(userIds)
        .setQuestion(messageObj)
        .setPossibleAnswers(emojis);
    return await askReactionQuestionProcessor(question, { reactionTimeout: timeout }, channel);
}

export async function askMessageQuestion(userIds: string | string[], channel: SupportedChannel, messageObj: MessageContent, filter?: MessageQuestionFilter, timeout = 120 * 1000) {
    if (typeof userIds === 'string') userIds = [userIds];
    const question = new MessageQuestion(userIds)
        .setQuestion(messageObj);
    if (filter) question.setFilter(async i => await filter(i));
    return await askMessageQuestionProcessor(question, { messageTimeout: timeout }, channel);
}

function toArray(data: string | string[]): string[] {
    if (typeof data === 'string') return [data];
    return data;
}