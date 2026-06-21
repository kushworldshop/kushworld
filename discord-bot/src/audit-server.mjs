import { ChannelType } from 'discord.js';
import { createClient, loginAndReady } from './client.mjs';
import { guildId } from './config.mjs';
import { BRAND, CATEGORY_NAMES } from './brand.mjs';

const EXPECTED_LAYOUT = [
  CATEGORY_NAMES.info,
  CATEGORY_NAMES.shop,
  CATEGORY_NAMES.products,
  CATEGORY_NAMES.community,
  CATEGORY_NAMES.theater,
  CATEGORY_NAMES.media,
  CATEGORY_NAMES.voice,
  CATEGORY_NAMES.staff,
];

const THEATER_CHANNEL_NAMES = ['theater', 'theater-live'];
const STAFF_VOICE_NAMES = ['staff-room', 'meeting'];

const LEGACY_ROLES = ['VERIFIED', 'stoners', 'KWLLC', 'BOT'];
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
  console.log(`Discord server: ${BRAND.serverName} · Shop: ${BRAND.shopName}`);
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

  const regionsCat = categories.find((c) => c.name === CATEGORY_NAMES.regions);
  if (regionsCat) {
    const legacyCount = [...guild.channels.cache.values()].filter((c) => c.parentId === regionsCat.id).length;
    issues.push(`REGIONS category still has ${legacyCount} channels — run npm run discord:rebrand to migrate`);
  }

  const stateForum = [...guild.channels.cache.values()].find(
    (c) => c.name === 'state-connect' && c.type === ChannelType.GuildForum
  );
  if (stateForum) {
    ok.push('#state-connect forum replaces 50 state text channels');
  } else {
    issues.push('Missing #state-connect forum — run npm run discord:rebrand');
  }

  const theaterCat = categories.find((c) => c.name === CATEGORY_NAMES.theater);
  if (theaterCat) {
    const theaterKids = [...guild.channels.cache.values()].filter((c) => c.parentId === theaterCat.id);
    const missingTheater = THEATER_CHANNEL_NAMES.filter(
      (name) => !theaterKids.some((c) => c.name === name)
    );
    if (!missingTheater.length) {
      ok.push('THEATER section complete (#theater, theater-live)');
    } else {
      issues.push(`THEATER missing: ${missingTheater.join(', ')} — run npm run discord:rebrand`);
    }
  } else {
    issues.push('Missing THEATER category — run npm run discord:rebrand');
  }

  const voiceCat = categories.find((c) => c.name === CATEGORY_NAMES.voice);
  if (voiceCat) {
    const voiceKids = [...guild.channels.cache.values()].filter((c) => c.parentId === voiceCat.id);
    const missingStaffVoice = STAFF_VOICE_NAMES.filter(
      (name) => !voiceKids.some((c) => c.name === name && c.type === ChannelType.GuildVoice)
    );
    if (!missingStaffVoice.length) {
      ok.push('Staff-only voice in VOICE (staff-room, meeting)');
    } else {
      issues.push(`VOICE missing staff channels: ${missingStaffVoice.join(', ')} — run npm run discord:rebrand`);
    }
  } else {
    issues.push('Missing VOICE category — run npm run discord:rebrand');
  }

  if (guild.name === BRAND.serverName) {
    ok.push(`Server name is "${BRAND.serverName}" (Discord policy-safe)`);
  } else {
    issues.push(`Server display name is "${guild.name}" — expected "${BRAND.serverName}"`);
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