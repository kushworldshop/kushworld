import { ChannelType } from 'discord.js';
import { createClient, loginAndReady } from './client.mjs';
import { guildId } from './config.mjs';
import { BRAND, CATEGORY_NAMES } from './brand.mjs';

const EXPECTED_LAYOUT = [
  CATEGORY_NAMES.info,
  CATEGORY_NAMES.shop,
  CATEGORY_NAMES.products,
  CATEGORY_NAMES.community,
  CATEGORY_NAMES.media,
  CATEGORY_NAMES.voice,
  CATEGORY_NAMES.regions,
  CATEGORY_NAMES.staff,
];

const LEGACY_ROLES = ['VERIFIED', 'stoners', 'KWLLC'];
const CORE_ROLES = ['Verified', 'Deals', 'Drops', 'Merch', 'Mod'];

function channelKind(ch) {
  if (ch.type === ChannelType.GuildVoice) return 'voice';
  if (ch.type === ChannelType.GuildForum) return 'forum';
  return 'text';
}

async function main() {
  const client = createClient();
  await loginAndReady(client);
  const guild = await client.guilds.fetch(guildId());
  await guild.channels.fetch();
  await guild.roles.fetch();

  const me = await guild.members.fetch(client.user.id);
  const botRole =
    me.roles.cache.find((r) => r.name === 'BOT') ||
    me.roles.highest;
  const issues = [];
  const ok = [];

  console.log(`Server: ${guild.name} (${guild.memberCount} members)`);
  console.log(`Brand target: ${BRAND.name}`);
  console.log(`Bot: ${client.user.tag} · role "${botRole.name}" (pos ${botRole.position})\n`);

  const categories = [...guild.channels.cache.values()]
    .filter((c) => c.type === ChannelType.GuildCategory)
    .sort((a, b) => a.rawPosition - b.rawPosition);

  for (const cat of categories) {
    console.log(`[${cat.name}] (${cat.id})`);
    const children = [...guild.channels.cache.values()]
      .filter((c) => c.parentId === cat.id)
      .sort((a, b) => a.rawPosition - b.rawPosition);
    for (const ch of children) {
      console.log(`  #${ch.name} (${channelKind(ch)})`);
    }
    if (!children.length) {
      console.log('  (empty)');
      issues.push(`Empty category: ${cat.name}`);
    }
    console.log('');
  }

  const uncategorized = [...guild.channels.cache.values()]
    .filter((c) => !c.parentId && c.type !== ChannelType.GuildCategory)
    .sort((a, b) => a.rawPosition - b.rawPosition);
  if (uncategorized.length) {
    console.log('[UNCATEGORIZED]');
    for (const ch of uncategorized) {
      console.log(`  #${ch.name}`);
      issues.push(`Uncategorized channel: #${ch.name}`);
    }
    console.log('');
  } else {
    ok.push('All channels categorized');
  }

  const categoryOrder = categories.map((c) => c.name);
  const orderSlice = categoryOrder.slice(0, EXPECTED_LAYOUT.length);
  if (orderSlice.join(',') === EXPECTED_LAYOUT.join(',')) {
    ok.push('Category order matches Kush World layout');
  } else {
    issues.push(`Category order: got [${categoryOrder.join(', ')}]`);
  }

  console.log('Roles (high → low):');
  const roles = [...guild.roles.cache.values()]
    .filter((r) => r.name !== '@everyone')
    .sort((a, b) => b.position - a.position);

  for (const role of roles) {
    const marker = role.id === botRole.id ? ' ← bot' : '';
    console.log(`  ${role.name} (pos ${role.position})${marker}`);
  }
  console.log('');

  for (const name of LEGACY_ROLES) {
    if (guild.roles.cache.find((r) => r.name === name)) {
      issues.push(`Legacy role still present: ${name}`);
    }
  }

  for (const name of CORE_ROLES) {
    if (guild.roles.cache.find((r) => r.name === name)) {
      ok.push(`Core role present: ${name}`);
    } else {
      issues.push(`Missing core role: ${name}`);
    }
  }

  const managedHigh = roles.find(
    (r) =>
      r.id !== botRole.id &&
      [...CORE_ROLES, ...LEGACY_ROLES, 'Staff', 'Server Booster'].includes(r.name)
  );
  if (managedHigh && botRole.position <= managedHigh.position) {
    issues.push(
      `Bot role "${botRole.name}" (pos ${botRole.position}) is below "${managedHigh.name}" — in Server Settings → Roles, drag "${botRole.name}" above Verified/legacy roles, then re-run npm run discord:rebrand`
    );
  } else {
    ok.push('Bot role hierarchy looks OK for role management');
  }

  if (!me.roles.cache.some((r) => r.name === 'BOT') && me.roles.highest.name === 'KWLLC') {
    issues.push('Bot uses KWLLC as its top role — either assign the BOT role to the bot or drag KWLLC above managed roles');
  }

  const verified = guild.roles.cache.find((r) => r.name === 'Verified');
  const info = categories.find((c) => c.name === CATEGORY_NAMES.info);
  if (verified && info) {
    const community = categories.find((c) => c.name === CATEGORY_NAMES.community);
    const everyoneDeniedCommunity =
      community &&
      community.permissionOverwrites.cache.get(guild.roles.everyone.id)?.deny.has('ViewChannel');
    if (everyoneDeniedCommunity) {
      ok.push('Verification gate active (COMMUNITY hidden from @everyone)');
    } else {
      issues.push('No verification gate — new members see all channels (run rebrand)');
    }
  }

  const regionCount = [...guild.channels.cache.values()].filter(
    (c) => c.parentId && categories.find((cat) => cat.id === c.parentId && cat.name === CATEGORY_NAMES.regions)
  ).length;
  if (regionCount > 10) {
    issues.push(`${regionCount} region channels — main sidebar clutter (optional: collapse later)`);
  }

  if (guild.name !== BRAND.name) {
    issues.push(`Server display name is "${guild.name}" — owner can rename to "${BRAND.name}" in Server Settings`);
  }

  console.log('── Health ──');
  for (const item of ok) console.log(`  ✓ ${item}`);
  for (const item of issues) console.log(`  ⚠ ${item}`);
  console.log(`\nScore: ${ok.length} OK · ${issues.length} to fix`);

  await client.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});