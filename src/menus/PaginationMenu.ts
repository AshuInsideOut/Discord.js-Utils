import { Message, User } from 'discord.js';
import logger from '../utils/logger';
import { SupportedChannel, MessageContent, PaginationMenuOptions, RawPaginationMenuOptions } from '../interfaces/Menus';

// Apache License

// Copyright Juby210

//Github: https://github.com/Juby210/discord.js-reaction-menu

//Migrated to TypeScript and modified by ABDevs

const defaultReactions = { first: '⏪', back: '◀', next: '▶', last: '⏩', stop: '⏹' };
class PaginationMenu {
    private options: PaginationMenuOptions;
    private message?: Message;
    constructor(private channel: SupportedChannel,
        private userId: string,
        private pages: MessageContent[],
        options: RawPaginationMenuOptions = {
            pageSingle: false,
            timeout: 120 * 1000,
            reactions: defaultReactions,
            page: 0
        }) {
        const { pageSingle = false, page = 0, timeout = 120 * 1000, reactions = defaultReactions } = options;
        this.options = { page, pageSingle, reactions, timeout };
        if (pages.length === 0) {
            logger.error(`You can't send a page menu with no pages.`);
            return;
        }
    }

    private select(pg = 0) {
        this.options.page = pg;
        this.message!.edit(this.pages[pg]);
    }

    private createCollector() {
        const options = this.options;
        const collector = this.message!.createReactionCollector((_r, u: User) => u.id == this.userId, { time: options.timeout });
        collector.on('collect', (r) => {
            if (r.emoji.name == options.reactions.first) {
                if (options.page != 0) this.select(0);
            } else if (r.emoji.name == options.reactions.back) {
                if (options.page != 0) this.select(options.page - 1);
            } else if (r.emoji.name == options.reactions.next) {
                if (options.page < this.pages.length - 1) this.select(options.page + 1);
            } else if (r.emoji.name == options.reactions.last) {
                if (options.page != this.pages.length) this.select(this.pages.length - 1);
            } else if (r.emoji.name == options.reactions.stop) collector.stop();
            r.users.remove(this.userId);
        });
        collector.on('end', () => this.message!.reactions.removeAll());
    }

    private async addReactions() {
        const options = this.options;
        if (options.reactions.first) await this.message!.react(options.reactions.first);
        if (options.reactions.back) await this.message!.react(options.reactions.back);
        if (options.reactions.next) await this.message!.react(options.reactions.next);
        if (options.reactions.last) await this.message!.react(options.reactions.last);
        if (options.reactions.stop) await this.message!.react(options.reactions.stop);
    }

    start() {
        const options = this.options;
        if (!options.pageSingle && this.pages.length === 1) {
            this.channel.send(this.pages[0]);
            return;
        }
        this.channel.send(this.pages[options.page]).then((msg) => {
            this.message = Array.isArray(msg) ? msg[0] : msg;
            this.addReactions();
            this.createCollector();
        });
    }
}

export default PaginationMenu;