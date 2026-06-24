import 'dotenv/config';
import { runMigrations } from './db/connection';
import { createBot } from './collector/bot';

async function main(): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const channelId = process.env.TELEGRAM_CHANNEL_ID;

  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set');
  if (!channelId) throw new Error('TELEGRAM_CHANNEL_ID is not set');

  await runMigrations();
  console.log('Database ready');

  const bot = createBot(token, channelId);

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));

  await bot.launch();
  console.log('Bot polling started');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
