const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const TABLE_CHANNEL_ID = process.env.TABLE_CHANNEL_ID;
const NOTIFICATION_CHANNEL_ID = process.env.NOTIFICATION_CHANNEL_ID;

if (!EMAIL || !PASSWORD || !DISCORD_TOKEN || !TABLE_CHANNEL_ID || !NOTIFICATION_CHANNEL_ID) {
  throw new Error('Missing required environment variables');
}

export {
  EMAIL,
  PASSWORD,
  DISCORD_TOKEN,
  TABLE_CHANNEL_ID,
  NOTIFICATION_CHANNEL_ID
};