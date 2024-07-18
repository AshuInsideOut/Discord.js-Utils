import { ButtonInteraction, EmojiIdentifierResolvable, MessageButtonStyleResolvable, MessageOptions } from 'discord.js';

export interface ButtonProperty {
    label?: string | null;
    emoji?: EmojiIdentifierResolvable | null;
    style?: MessageButtonStyleResolvable;
}

export interface Options {
    time?: number;
    removeButtonOnStop?: boolean;
    buttons?: {
        first?: ButtonProperty;
        previous?: ButtonProperty;
        next?: ButtonProperty;
        last?: ButtonProperty;
        stop?: ButtonProperty;
    };
}

export type SendableMessage = string | MessageOptions;
export type SendableMessageResolvable = (page: number, interaction: ButtonInteraction | null) => SendableMessage | Promise<SendableMessage>;

export type PaginationMenuPageResolvable = (SendableMessage | SendableMessageResolvable)[];