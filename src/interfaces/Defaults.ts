import { DMChannel, MessageEmbed, NewsChannel, StageChannel, TextChannel, ThreadChannel, VoiceChannel } from 'discord.js';
import { CommandManagerOptions } from './CommandManager';

export interface Options {
    isCmdManager?: boolean;
    isDebug?: boolean;
    defaultEmbed?: MessageEmbed,
    cmdManagerOptions?: CommandManagerOptions;
}

export type JoinableChannel = VoiceChannel | StageChannel;
export type SendableChannel = DMChannel | TextChannel | NewsChannel | ThreadChannel;