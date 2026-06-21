import { ChannelType } from 'discord.js';
import { createClient, loginAndReady } from './client.mjs';
import { guildId } from './config.mjs';
import { CATEGORY_NAMES } from './brand.mjs';
import { consolidateStateRegions, applyForumPermissions } from './regions-forum.mjs';

async function main() {
  const client = createClient();
  await loginAndReady(client);
  const guild = await client.guilds.fetch(guildId());
  await guild.channels.fetch();

  const community = [...guild.channels.cache.values()].find(
    (c) => c.type === ChannelType.GuildCategory && c.name === CATEGORY_NAMES.community
  );
  if (!community) throw new Error('COMMUNITY category not found');

  console.log('Migrating 50 state channels → #state-connect forum...\n');
  const forum = await consolidateStateRegions(guild, community);

  const verified = guild.roles.cache.find((r) => r.name === 'Verified');
  if (verified) await applyForumPermissions(guild, forum, verified);

  console.log('\nMigration complete.');
  await client.destroy();
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});