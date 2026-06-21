import { createClient, loginAndReady } from './client.mjs';
import { guildId } from './config.mjs';
import { BRAND } from './brand.mjs';

const KEEP_CODE = (process.env.DISCORD_INVITE_CODE || '48HmtfDgQp').trim();

async function main() {
  const client = createClient();
  await loginAndReady(client);

  const guild = await client.guilds.fetch(guildId());
  const invites = await guild.invites.fetch();

  console.log(`\n${BRAND.serverName} — invite audit`);
  console.log(`Keeping: https://discord.gg/${KEEP_CODE}`);
  console.log(`Found ${invites.size} active invite(s):\n`);

  if (invites.size === 0) {
    console.log('No invites returned. Bot needs Manage Server permission, or none exist.');
    await client.destroy();
    return;
  }

  let deleted = 0;
  for (const invite of invites.values()) {
    const code = invite.code;
    const meta = [
      code,
      invite.inviter?.tag || 'no inviter',
      `${invite.uses ?? 0} uses`,
      invite.maxAge === 0 ? 'never expires' : `expires ${invite.maxAge}s`,
      invite.channel?.name ? `#${invite.channel.name}` : 'no channel',
    ].join(' · ');
    console.log(`  ${meta}`);

    if (code === KEEP_CODE) continue;

    await invite.delete('Kush World: retire old invite — use canonical link only');
    console.log(`    → deleted ${code}`);
    deleted += 1;
  }

  const kept = invites.has(KEEP_CODE) ? 1 : 0;
  console.log(`\nDone. Deleted ${deleted}, kept ${kept} canonical invite(s).`);
  if (!invites.has(KEEP_CODE)) {
    console.warn(
      `WARNING: canonical code ${KEEP_CODE} was not in the list. Create it in Discord Server Settings → Invites.`
    );
  }

  await client.destroy();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});