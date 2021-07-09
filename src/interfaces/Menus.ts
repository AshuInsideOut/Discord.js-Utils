import {
    MessageOptions,
    NewsChannel,
    TextChannel
} from 'discord.js';

export interface PaginationMenuOptions {
    pageSingle: boolean;
    timeout: number;
    page: number;
    reactions: {
        first: string;
        back: string;
        next: string;
        last: string;
        stop: string;
    };
}

export interface RawPaginationMenuOptions {
    pageSingle?: boolean;
    timeout?: number;
    page?: number;
    reactions?: {
        first: string;
        back: string;
        next: string;
        last: string;
        stop: string;
    };
}

export type SupportedChannel = TextChannel | NewsChannel;
export type MessageContent = MessageOptions;