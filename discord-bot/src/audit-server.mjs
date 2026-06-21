import { ChannelType } from 'discord.js';
import { createClient, loginAndReady } from './client.mjs';
import { guildId } from './config.mjs';

async function main() {
  const client = createClient();
  await loginAndReady(client);
  const guild = await client.guilds.fetch(guildId());
  await guild.channels.fetch();

  const categories = [...guild.channels.cache.values()]
    .filter((c) => c.type === ChannelType.GuildCategory)
    .sort((a, b) => a.rawPosition - b.rawPosition);

  console.log(`Server: ${guild.name} (${guild.memberCount} members)\n`);

  for (const cat of categories) {
    console.log(`[${cat.name}] (${cat.id})`);
    const children = [...guild.channels.cache.values()]
      .filter((c) => c.parentId === cat.id)
      .sort((a, b) => a.rawPosition - b.rawPosition);
    for (const ch of children) {
      const kind = ch.type === ChannelType.GuildVoice ? 'voice' : 'text';
      console.log(`  #${ch.name} (${kind})`);
    }
    if (!children.length) console.log('  (empty)');
    console.log('');
  }

  const uncategorized = [...guild.channels.cache.values()]
    .filter((c) => !c.parentId && c.type !== ChannelType.GuildCategory)
    .sort((a, b) => a.rawPosition - b.rawPosition);
  if (uncategorized.length) {
    console.log('[UNCATEGORIZED]');
    for (const ch of uncategorized) {
      console.log(`  #${ch.name}`);
    }
  }

  console.log('\nRoles:');
  for (const role of [...guild.roles.cache.values()].sort((a, b) => b.position - a.position)) {
    if (role.name === '@everyone') continue;
    console.log(`  ${role.name} (${role.id})`);
  }

  await client.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});