import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

export function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name} in discord-bot/.env`);
  }
  return value;
}

export const token = () => requireEnv('DISCORD_BOT_TOKEN');
export const guildId = () => requireEnv('DISCORD_GUILD_ID');