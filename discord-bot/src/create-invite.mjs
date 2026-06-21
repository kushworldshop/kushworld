import { ChannelType } from 'discord.js';
import { createClient, loginAndReady } from './client.mjs';
import { guildId } from './config.mjs';
import { BRAND } from './brand.mjs';

const PREFERRED_CHANNEL_NAMES = ['welcome', 'rules', 'announcements', 'general', 'chat'];

async function main() {
  const client = createClient();
  await loginAndReady(client);

  const guild = await client.guilds.fetch(guildId());
  await guild.channels.fetch();

  const textChannels = guild.channels.cache.filter((c) => c.type === ChannelType.GuildText);
  const channel =
    PREFERRED_CHANNEL_NAMES.map((name) => textChannels.find((c) => c.name === name)).find(Boolean) ||
    textChannels.first();

  if (!channel) {
    throw new Error('No text channel found to attach invite');
  }

  const invite = await channel.createInvite({
    maxAge: 0,
    maxUses: 0,
    unique: true,
    reason: `${BRAND.shopName} canonical server invite`,
  });

  console.log(`\nCreated invite for #${channel.name}:`);
  console.log(`  https://discord.gg/${invite.code}`);
  console.log(`\nUpdate lib/discordInvite.ts with code: ${invite.code}`);

  await client.destroy();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});