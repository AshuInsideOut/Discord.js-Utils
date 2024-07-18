import { Message, PermissionString, ReactionCollector } from 'discord.js';
import { MessageContent, SupportedChannel } from '../interfaces/Menus';
import { EventEmitter } from 'events';
const requiredMenuPerms = ['SEND_MESSAGES', 'EMBED_LINKS', 'ADD_REACTIONS', 'MANAGE_MESSAGES'];

// MIT License

// Copyright (c) 2020 Thomas Jowsey

//Github: https://github.com/jowsey/discord.js-menu

//Migrated to TypeScript and Modified by Arnav Gupta

/**
 * A page object that the menu can display.
 */
class Page {
    constructor(public name: string, public content: MessageContent, public reactions: { [key: string]: string | Function; }, public index: number) { }
}

/**
 * A menu with customizable reactions for every page.
 * Blacklisted page names are: `first, last, previous, next, stop, delete`.
 * These names perform special functions and should only be used as reaction destinations.
 */
export default class ReactionMenu extends EventEmitter {
    private pages: Page[] = [];
    private currentPage: Page;
    private pageIndex: number;
    private menu: Message | null = null;
    private reactionCollector: ReactionCollector | null = null;
    constructor(private channel: SupportedChannel, private userID: string, pages: Page[], private ms = 180000, private useSameReactions = false) {
        super();
        const missingPerms: string[] = [];

        requiredMenuPerms.forEach(perm => {
            if (!this.channel.permissionsFor(this.channel.client.user!)!.toArray().includes(perm as PermissionString))
                missingPerms.push(perm);
        });
        if (missingPerms.length) console.log(`\x1B[96m[discord.js-menu]\x1B[0m Looks like you're missing ${missingPerms.join(', ')} in #${this.channel.name} (${this.channel.guild.name}). This perm is needed for basic menu operation. You'll probably experience problems sending menus in this channel.`);

        let i = 0;

        pages.forEach(page => {
            this.pages.push(new Page(page.name, page.content, page.reactions, i));
            i++;
        });
        /**
         * The page the Menu is currently displaying in chat.
         */
        this.currentPage = this.pages[0];
        /**
         * The index of the Pages array we're currently on.
         */
        this.pageIndex = 0;
    }

    /**
     * Send the Menu and begin listening for reactions.
     */
    start() {
        this.emit('pageChange', this.currentPage);
        this.channel.send(this.currentPage.content).then(menu => {
            this.menu = Array.isArray(menu) ? menu[0] : menu;
            this.addReactions();
            this.awaitReactions();
        }).catch(error => {
            console.log(`\x1B[96m[discord.js-menu]\x1B[0m ${error.toString()} (whilst trying to send menu message) | You're probably missing 'SEND_MESSAGES' or 'EMBED_LINKS' in #${this.channel.name} (${this.channel.guild.name}), needed for sending the menu message.`);
        });
    }

    /**
     * Stop listening for new reactions.
     */
    stop() {
        if (this.reactionCollector) {
            this.reactionCollector.stop();
            this.clearReactions();
        }
    }

    /**
     * Delete the menu message.
     */
    delete() {
        if (this.reactionCollector) this.reactionCollector.stop();
        if (this.menu) this.menu.delete();
    }

    /**
     * Remove all reactions from the menu message.
     */
    clearReactions() {
        if (this.menu) {
            return this.menu.reactions.removeAll().catch(error => {
                console.log(`\x1B[96m[discord.js-menu]\x1B[0m ${error.toString()} (whilst trying to remove message reactions) | You're probably missing 'MANAGE_MESSAGES' in #${this.channel.name} (${this.channel.guild.name}), needed for removing reactions when changing pages.`);
            });
        }
    }

    /**
     * Jump to a new page in the Menu.
     */
    setPage(page = 0) {
        this.emit('pageChange', this.pages[page]);

        this.pageIndex = page;
        this.currentPage = this.pages[this.pageIndex];
        this.menu!.edit(this.currentPage.content);

        this.reactionCollector!.stop();
        this.addReactions();
        this.awaitReactions();
    }

    /**
     * React to the new page with all of it's defined reactions
     */
    addReactions() {
        for (const reaction in this.currentPage.reactions) {
            this.menu!.react(reaction).catch(error => {
                if (error.toString().indexOf('Unknown Emoji') >= 0) {
                    console.log(`\x1B[96m[discord.js-menu]\x1B[0m ${error.toString()} (whilst trying to add reactions to message) | The emoji you were trying to add to page "${this.currentPage.name}" (${reaction}) probably doesn't exist. You probably entered the ID wrong when adding a custom emoji.`);
                } else {
                    console.log(`\x1B[96m[discord.js-menu]\x1B[0m ${error.toString()} (whilst trying to add reactions to message) | You're probably missing 'ADD_REACTIONS' in #${this.channel.name} (${this.channel.guild.name}), needed for adding reactions to the page.`);
                }
            });
        }
    }

    /**
     * Start a reaction collector and switch pages where required.
     */
    awaitReactions() {
        this.reactionCollector = this.menu!.createReactionCollector({ filter: (reaction, user) => user.id !== this.menu!.client.user!.id, idle: this.ms });

        let sameReactions: boolean;
        this.reactionCollector.on('end', (reactions) => {
            // Whether the end was triggered by pressing a reaction or the menu just ended.
            if (reactions) {
                return !sameReactions ? this.clearReactions() : [...reactions.values()][0].users.remove(this.menu!.client.users.cache.get(this.userID));
            } else {
                return this.clearReactions();
            }
        });

        this.reactionCollector.on('collect', (reaction, user) => {
            // If the name exists, priorities using that, otherwise, use the ID. If neither are in the list, don't run anything.
            const reactionName = Object.prototype.hasOwnProperty.call(this.currentPage.reactions, reaction.emoji.name!)
                ? reaction.emoji.name
                : Object.prototype.hasOwnProperty.call(this.currentPage.reactions, reaction.emoji.id!) ? reaction.emoji.id : null;

            // If a 3rd party tries to add reactions or the reaction isn't registered, delete it.
            if (user.id !== this.userID || !Object.keys(this.currentPage.reactions).includes(reactionName!)) {
                return reaction.users.remove(user);
            }

            if (reactionName) {
                if (typeof this.currentPage.reactions[reactionName] === 'function') {
                    // @ts-ignore
                    return this.currentPage.reactions[reactionName]();
                }

                switch (this.currentPage.reactions[reactionName]) {
                    case 'first':
                        sameReactions = this.useSameReactions || JSON.stringify([...this.menu!.reactions.cache.keys()]) === JSON.stringify(Object.keys(this.pages[0].reactions));
                        this.setPage(0);
                        break;
                    case 'last':
                        sameReactions = this.useSameReactions || JSON.stringify([...this.menu!.reactions.cache.keys()]) === JSON.stringify(Object.keys(this.pages[this.pages.length - 1].reactions));
                        this.setPage(this.pages.length - 1);
                        break;
                    case 'previous':
                        if (this.pageIndex > 0) {
                            sameReactions = this.useSameReactions || JSON.stringify([...this.menu!.reactions.cache.keys()]) === JSON.stringify(Object.keys(this.pages[this.pageIndex - 1].reactions));
                            this.setPage(this.pageIndex - 1);
                        }
                        break;
                    case 'next':
                        if (this.pageIndex < this.pages.length - 1) {
                            sameReactions = this.useSameReactions || JSON.stringify([...this.menu!.reactions.cache.keys()]) === JSON.stringify(Object.keys(this.pages[this.pageIndex + 1].reactions));
                            this.setPage(this.pageIndex + 1);
                        }
                        break;
                    case 'stop':
                        this.stop();
                        break;
                    case 'delete':
                        this.delete();
                        break;
                    default:
                        sameReactions = this.useSameReactions || JSON.stringify([...this.menu!.reactions.cache.keys()]) === JSON.stringify(Object.keys(this.pages.find(p => p.name === this.currentPage.reactions[reactionName])!.reactions));
                        this.setPage(this.pages.findIndex(p => p.name === this.currentPage.reactions[reactionName]));
                        break;
                }
            }
        });
    }
};