import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { token } from './config.mjs';

export function createClient() {
  return new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMessageReactions,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
  });
}

export async function loginAndReady(client) {
  await client.login(token());
  if (client.isReady()) return client;
  await new Promise((resolve) => client.once('ready', resolve));
  return client;
}