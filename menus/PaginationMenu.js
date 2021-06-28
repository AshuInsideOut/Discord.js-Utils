const { TextChannel, DMChannel, NewsChannel, Message, MessageReaction, User } = require('discord.js');
const logger = require('../utils/logger');

// Apache License

// Copyright Juby210

//Github: https://github.com/Juby210/discord.js-reaction-menu

class PaginationMenu {
    static defaultReactions = { first: '⏪', back: '◀', next: '▶', last: '⏩', stop: '⏹' };

    /**
     * @param {{ channel: TextChannel | DMChannel | NewsChannel ; discordId: string; pages: import('discord.js').MessageOptions[]; pageSingle?: boolean; page?: number; time?: number; reactions?: { first: string; back: string; next: string; last: string; stop: string; }; }} options
     */
    constructor(options) {
        const { channel, discordId, pageSingle = false, pages, page = 0, time = 120 * 1000, reactions = PaginationMenu.defaultReactions } = options;
        if (pages.length === 0) {
            logger.error(`You can't send a page menu with no pages.`);
            return;
        }
        if (!pageSingle && pages.length === 1) {
            channel.send(pages[0]);
            return;
        }
        this.channel = channel;
        this.pages = pages;
        this.time = time;
        this.reactions = reactions;
        this.page = page;
        channel.send(pages[page]).then((/** @type {Message} */ msg) => {
            this.msg = msg;
            this.addReactions();
            this.createCollector(discordId);
        });
    }
    select(pg = 0) {
        this.page = pg;
        this.msg.edit(this.pages[pg]);
    }
    /**
     * @param {string} uid
     */
    createCollector(uid) {
        const collector = this.msg.createReactionCollector((/** @type {MessageReaction} */ _r, /** @type {User} */ u) => u.id == uid, { time: this.time });
        this.collector = collector;
        collector.on('collect', (/** @type {MessageReaction} */ r) => {
            if (r.emoji.name == this.reactions.first) {
                if (this.page != 0) this.select(0);
            } else if (r.emoji.name == this.reactions.back) {
                if (this.page != 0) this.select(this.page - 1);
            } else if (r.emoji.name == this.reactions.next) {
                if (this.page < this.pages.length - 1) this.select(this.page + 1);
            } else if (r.emoji.name == this.reactions.last) {
                if (this.page != this.pages.length) this.select(this.pages.length - 1);
            } else if (r.emoji.name == this.reactions.stop) collector.stop();
            r.users.remove(uid);
        });
        collector.on('end', () => this.msg.reactions.removeAll());
    }
    async addReactions() {
        if (this.reactions.first) await this.msg.react(this.reactions.first);
        if (this.reactions.back) await this.msg.react(this.reactions.back);
        if (this.reactions.next) await this.msg.react(this.reactions.next);
        if (this.reactions.last) await this.msg.react(this.reactions.last);
        if (this.reactions.stop) await this.msg.react(this.reactions.stop);
    }
}

module.exports = PaginationMenu;