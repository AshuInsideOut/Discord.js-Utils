import { Message, MessageOptions, MessageReaction, User, TextChannel, NewsChannel, DMChannel, APIMessageContentResolvable, MessageAdditions } from 'discord.js';
import { ReactionQuestion, MessageQuestion } from '../managers/QuestionsAPI';

export interface QuestionOptions {
    messageTimeout?: number;
    reactionTimeout?: number;
    deleteQuestion?: boolean;
    deleteMessage?: boolean;
    deleteReaction?: boolean;
}

export interface MessageQuestionOptions {
    messageTimeout?: number;
    deleteQuestion?: boolean;
    deleteMessage?: boolean;
}

export interface ReactionQuestionOptions {
    reactionTimeout?: number;
    deleteQuestion?: boolean;
    deleteReaction?: boolean;
}

export interface LastReactionAnswer {
    reaction: MessageReaction;
    user: User;
    result: Object;
    question: Message;
    possibleAnswers: string[];
}

export interface LastMessageAnswer {
    message: Message;
    result: Object;
    question: Message;
}

export interface MessageQuestionData {
    message: Message;
    question: Message;
    last?: LastMessageAnswer | LastReactionAnswer;
}

export interface MessageReactionData {
    reaction: MessageReaction;
    user: User;
    question: Message;
    possibleAnswers: string[];
    last?: LastMessageAnswer | LastReactionAnswer;
}

export interface ProcessedData {
    data?: (LastMessageAnswer | LastReactionAnswer)[];
    error?: Error;
    errorData?: ProcessedReactionQuestionData | ProcessedMessageQuestionData;
}

export interface ProcessedReactionQuestionData {
    reaction?: MessageReaction;
    user?: User;
    result?: Object;
    question?: Message;
    possibleAnswers?: string[];
}

export interface ProcessedMessageQuestionData {
    message?: Message;
    result?: Object;
    question?: Message;
}

export interface ProcessedReactionQuestionResult {
    data?: ProcessedReactionQuestionData;
    error?: Error;
}

export interface ProcessedMessageQuestionResult {
    data?: ProcessedMessageQuestionData;
    error?: Error;
}

export interface Last {
    last?: LastMessageAnswer | LastReactionAnswer;
}

export type MessageContent = MessageOptions;
export type QuestionMessage = ((data: Last) => (Promise<MessageContent> | MessageContent)) | MessageContent;
export type MessageQuestionFilter = (data: MessageQuestionData) => (Promise<boolean> | boolean);
export type MessageQuestionRun = (data: MessageQuestionData) => (Promise<any> | any);
export type PossibleAnswers = ((data: Last) => (Promise<string | string[]> | string | string[])) | string | string[];
export type ReactionQuestionFilter = (data: MessageReactionData) => (Promise<boolean> | boolean);
export type ReactionQuestionRun = (data: MessageReactionData) => (Promise<any> | any);
export type QuestionType = (ReactionQuestion | MessageQuestion);
export type SupportedChannel = TextChannel | NewsChannel | DMChannel;