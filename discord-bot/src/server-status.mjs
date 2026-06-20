import { ChannelType } from 'discord.js';
import { createClient, loginAndReady } from './client.mjs';
import { guildId } from './config.mjs';

async function main() {
  const client = createClient();
  await loginAndReady(client);

  const guild = await client.guilds.fetch(guildId());
  await guild.channels.fetch();
  await guild.roles.fetch();

  const channels = [...guild.channels.cache.values()]
    .filter((channel) => channel.type === ChannelType.GuildText)
    .sort((a, b) => a.rawPosition - b.rawPosition)
    .map((channel) => `#${channel.name}`);

  const roles = [...guild.roles.cache.values()]
    .filter((role) => role.name !== '@everyone')
    .sort((a, b) => b.position - a.position)
    .map((role) => role.name);

  console.log(`Server: ${guild.name}`);
  console.log(`Members: ${guild.memberCount}`);
  console.log(`Text channels (${channels.length}): ${channels.join(', ')}`);
  console.log(`Roles (${roles.length}): ${roles.join(', ')}`);

  await client.destroy();
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});