import { fetchSendableChannel, fetchUser } from '../utils/utils';
import {
  Options,
  PaginationMenuPageResolvable,
  SendableMessage,
} from '../interfaces/PaginationMenu';
import {
  ButtonInteraction,
  Message,
  MessageActionRow,
  MessageButton,
  UserResolvable,
} from 'discord.js';

const defaultOptions: Options = {
  time: 5 * 60 * 1000,
  removeButtonOnStop: false,
  buttons: {
    first: { emoji: '⏮', style: 'PRIMARY', label: null },
    previous: { emoji: '◀', style: 'PRIMARY', label: null },
    next: { emoji: '▶', style: 'PRIMARY', label: null },
    last: { emoji: '⏭', style: 'PRIMARY', label: null },
    stop: { emoji: '🛑', style: 'DANGER', label: null },
  },
};

/**
 * A Util class to easily create a pagination menu in discord.
 */
export default class PaginationMenu {
  private page: number = 0;
  private pages: PaginationMenuPageResolvable = [];
  private message: Message | null = null;

  constructor(
    private channelId: string,
    private options: Options = defaultOptions
  ) {}

  /**
   * Add pages to the menu.
   * @param pages pages to add
   * @returns Menu instance
   */
  addPages(pages: PaginationMenuPageResolvable) {
    this.pages.push(...pages);
    return this;
  }

  /**
   * Sets the current page of the menu.
   * @param pageNumber Page number starts from index `0`
   * @param interaction Button interaction to pass to the page functions.
   * @returns Menu instance
   */
  async setPage(pageNumber: number, interaction?: ButtonInteraction) {
    const message = this.message;
    if (!message)
      throw new Error(
        `Message is not initialized. Make sure to call #display() before setting a page`
      );
    if (pageNumber < 0 || pageNumber > this.pages.length - 1)
      throw new Error(`Invalid page number "${pageNumber}"`);
    const sendableMessage = await this.getPage(pageNumber, interaction);
    if (!sendableMessage)
      throw new Error(`No sendable message available for page "${pageNumber}"`);
    this.page = pageNumber;
    await message.edit(sendableMessage);
    return this;
  }

  private async getPage(
    pageNumber: number,
    interaction?: ButtonInteraction
  ): Promise<SendableMessage | null> {
    let sendableMessage: SendableMessage | null = null;
    const page = this.pages[pageNumber];
    if (!page) return null;
    if (typeof page !== 'string') {
      if (typeof page === 'function' || 'then' in page)
        // @ts-ignore
        sendableMessage = await page(1, interaction ? interaction : null);
      else {
        await interaction?.update({});
        sendableMessage = page;
      }
    } else {
      await interaction?.update({});
      sendableMessage = page;
    }
    return sendableMessage;
  }

  /**
   * Stops the menu and finish end tasks.
   */
  async stop() {
    const message = this.message;
    if (!message)
      throw new Error(
        `Message is not initialized. Make sure to call #display() before stopping the menu`
      );
    if (
      this.options.removeButtonOnStop ||
      (this.options.removeButtonOnStop === undefined &&
        defaultOptions.removeButtonOnStop)
    ) {
      await message.edit({ components: [] });
      return;
    }
    const row = message.components[0];
    row.components.map((component) => component.setDisabled(true));
    await message.edit({ components: [row] });
  }

  /**
   * Send the menu to the target channel and active the listeners.
   * @param userResolvable user resolvable object
   * @returns Menu instance
   */
  async display(userResolvable: UserResolvable | UserResolvable[]) {
    const userIds: string[] = [];
    if (Array.isArray(userResolvable)) {
      for (const resolvable of userResolvable) {
        const user = await fetchUser(resolvable);
        if (!user) continue;
        userIds.push(user.id);
      }
    } else {
      const user = await fetchUser(userResolvable);
      if (user) userIds.push(user.id);
    }
    if (!userIds.length) throw new Error(`No valid users are provided`);
    if (!this.pages.length) throw new Error(`No pages found`);
    const channel = await fetchSendableChannel(this.channelId);
    if (!channel)
      throw new Error(`The provided channel id "${this.channelId}" is invalid`);
    const buttonOptions = this.options.buttons || defaultOptions.buttons!;
    const defaultButtonOptions = defaultOptions.buttons!;
    const firstButton = new MessageButton().setCustomId('first');
    if (buttonOptions.first) {
      if (buttonOptions.first.emoji !== null)
        firstButton.setEmoji(
          buttonOptions.first.emoji || defaultButtonOptions.first!.emoji!
        );
      if (buttonOptions.first.label !== null)
        firstButton.setLabel(
          buttonOptions.first.label || defaultButtonOptions.first!.label!
        );
      if (buttonOptions.first.style !== null)
        firstButton.setStyle(
          buttonOptions.first.style || defaultButtonOptions.first!.style!
        );
    } else {
      firstButton.setEmoji(defaultButtonOptions.first!.emoji!);
      firstButton.setStyle(defaultButtonOptions.first!.style!);
    }
    const previousButton = new MessageButton().setCustomId('previous');
    if (buttonOptions.previous) {
      if (buttonOptions.previous.emoji !== null)
        previousButton.setEmoji(
          buttonOptions.previous.emoji || defaultButtonOptions.previous!.emoji!
        );
      if (buttonOptions.previous.label !== null)
        previousButton.setLabel(
          buttonOptions.previous.label || defaultButtonOptions.previous!.label!
        );
      if (buttonOptions.previous.style !== null)
        previousButton.setStyle(
          buttonOptions.previous.style || defaultButtonOptions.previous!.style!
        );
    } else {
      previousButton.setEmoji(defaultButtonOptions.previous!.emoji!);
      previousButton.setStyle(defaultButtonOptions.previous!.style!);
    }
    const nextButton = new MessageButton().setCustomId('next');
    if (buttonOptions.next) {
      if (buttonOptions.next.emoji !== null)
        nextButton.setEmoji(
          buttonOptions.next.emoji || defaultButtonOptions.next!.emoji!
        );
      if (buttonOptions.next.label !== null)
        nextButton.setLabel(
          buttonOptions.next.label || defaultButtonOptions.next!.label!
        );
      if (buttonOptions.next.style !== null)
        nextButton.setStyle(
          buttonOptions.next.style || defaultButtonOptions.next!.style!
        );
    } else {
      nextButton.setEmoji(defaultButtonOptions.next!.emoji!);
      nextButton.setStyle(defaultButtonOptions.next!.style!);
    }
    const lastButton = new MessageButton().setCustomId('last');
    if (buttonOptions.last) {
      if (buttonOptions.last.emoji !== null)
        lastButton.setEmoji(
          buttonOptions.last.emoji || defaultButtonOptions.last!.emoji!
        );
      if (buttonOptions.last.label !== null)
        lastButton.setLabel(
          buttonOptions.last.label || defaultButtonOptions.last!.label!
        );
      if (buttonOptions.last.style !== null)
        lastButton.setStyle(
          buttonOptions.last.style || defaultButtonOptions.last!.style!
        );
    } else {
      lastButton.setEmoji(defaultButtonOptions.last!.emoji!);
      lastButton.setStyle(defaultButtonOptions.last!.style!);
    }
    const stopButton = new MessageButton().setCustomId('stop');
    if (buttonOptions.stop) {
      if (buttonOptions.stop.emoji !== null)
        stopButton.setEmoji(
          buttonOptions.stop.emoji || defaultButtonOptions.stop!.emoji!
        );
      if (buttonOptions.stop.label !== null)
        stopButton.setLabel(
          buttonOptions.stop.label || defaultButtonOptions.stop!.label!
        );
      if (buttonOptions.stop.style !== null)
        stopButton.setStyle(
          buttonOptions.stop.style || defaultButtonOptions.stop!.style!
        );
    } else {
      stopButton.setEmoji(defaultButtonOptions.stop!.emoji!);
      stopButton.setStyle(defaultButtonOptions.stop!.style!);
    }
    const firstRow = new MessageActionRow().addComponents(
      firstButton,
      previousButton,
      stopButton,
      nextButton,
      lastButton
    );
    let sendableMessage = (await this.getPage(0))!;
    if (typeof sendableMessage === 'string')
      sendableMessage = { content: sendableMessage, components: [firstRow] };
    else sendableMessage.components = [firstRow];
    const message = await channel.send(sendableMessage);
    this.message = message;
    const collector = message.createMessageComponentCollector({
      componentType: 'BUTTON',
      time: this.options.time || defaultOptions.time,
      filter: (interaction) =>
        userIds.includes(interaction.user.id) &&
        ['first', 'previous', 'next', 'last', 'stop'].includes(
          interaction.customId
        ),
    });
    collector.on('collect', async (interaction: ButtonInteraction) => {
      if (interaction.customId === 'first') {
        this.setPage(0, interaction);
        return;
      }
      if (interaction.customId === 'previous') {
        if (this.page === 0) {
          interaction.update({});
          return;
        }
        this.setPage(this.page - 1, interaction);
        return;
      }
      if (interaction.customId === 'next') {
        if (this.page === this.pages.length - 1) {
          interaction.update({});
          return;
        }
        this.setPage(this.page + 1, interaction);
        return;
      }
      if (interaction.customId === 'last') {
        this.setPage(this.pages.length - 1, interaction);
        return;
      }
      if (interaction.customId === 'stop') {
        interaction.update({});
        collector.stop(`button`);
        return;
      }
    });
    collector.on('end', () => this.stop());
    return this;
  }
}
