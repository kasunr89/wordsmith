import { Telegraf } from 'telegraf';
import { insertWord } from '../words/repository';

export function parseWords(text: string): string[] {
  return text
    .split('\n')
    .map(line => line.trim().toLowerCase())
    .filter(line => line.length > 0);
}

export function createBot(token: string, channelId: string): Telegraf {
  const bot = new Telegraf(token);

  bot.on('channel_post', async (ctx) => {
    if (String(ctx.channelPost.chat.id) !== channelId) return;

    const text = 'text' in ctx.channelPost ? ctx.channelPost.text : undefined;
    if (!text) return;

    const words = parseWords(text);
    if (words.length === 0) return;

    const results = await Promise.all(words.map(w => insertWord(w)));

    const saved = words.filter((_, i) => results[i] === 'saved');
    const known = words.filter((_, i) => results[i] === 'known');

    const parts: string[] = [];
    if (saved.length > 0) parts.push(`Saved: ${saved.join(', ')}`);
    if (known.length > 0) parts.push(`Already known: ${known.join(', ')}`);

    await ctx.telegram.sendMessage(ctx.channelPost.chat.id, parts.join(' | '));
  });

  bot.catch((err, ctx) => {
    console.error(`Error handling update ${ctx.update.update_id}:`, err);
  });

  return bot;
}
