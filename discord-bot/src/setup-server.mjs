import {
  ChannelType,
  PermissionFlagsBits,
} from 'discord.js';
import { createClient, loginAndReady } from './client.mjs';
import { guildId } from './config.mjs';

const RULES_TEXT = `**Welcome to Kush World**

1. **21+ / legal only** — follow your local laws. No sourcing or illegal sales.
2. **Be respectful** — no harassment, hate, or drama.
3. **No spam** — no unsolicited DMs, ads, or scam links.
4. **Order help** — use **#order-help** or open a ticket; don't post personal info in public channels.
5. **No medical claims** — products are for adults; don't ask for medical advice here.

React with ✅ in **#roles** to get **@Verified** and full access.`;

const ROLES = [
  { name: 'Verified', color: 0x00ff9d, mentionable: false },
  { name: 'Deals', color: 0x5865f2, mentionable: false },
  { name: 'Drops', color: 0xfaa61a, mentionable: false },
  { name: 'Merch', color: 0xeb459e, mentionable: false },
  { name: 'Mod', color: 0xed4245, mentionable: true },
];

const LAYOUT = [
  {
    name: 'INFO',
    channels: [
      { name: 'rules', type: ChannelType.GuildText, topic: 'Server rules — read before chatting' },
      { name: 'announcements', type: ChannelType.GuildText, topic: 'Official Kush World updates', readOnly: true },
      { name: 'roles', type: ChannelType.GuildText, topic: 'Pick your roles and verify' },
    ],
  },
  {
    name: 'SHOP',
    channels: [
      { name: 'new-drops', type: ChannelType.GuildText, topic: 'New products and restocks' },
      { name: 'deals', type: ChannelType.GuildText, topic: 'Promos and sales' },
      { name: 'order-help', type: ChannelType.GuildText, topic: 'Order and shipping questions' },
    ],
  },
  {
    name: 'COMMUNITY',
    channels: [
      { name: 'general', type: ChannelType.GuildText, topic: 'Main chat' },
      { name: 'show-your-setup', type: ChannelType.GuildText, topic: 'Gear, fits, and setups' },
      { name: 'music-media', type: ChannelType.GuildText, topic: 'Music, memes, and media' },
    ],
  },
  {
    name: 'VOICE',
    channels: [
      { name: 'Lounge', type: ChannelType.GuildVoice },
      { name: 'staff-room', type: ChannelType.GuildVoice, staffOnly: true },
    ],
  },
];

async function ensureRole(guild, spec) {
  const existing = guild.roles.cache.find((role) => role.name === spec.name);
  if (existing) return existing;
  return guild.roles.create({
    name: spec.name,
    color: spec.color,
    mentionable: spec.mentionable,
    reason: 'Kush World bot setup',
  });
}

async function ensureCategory(guild, name) {
  const existing = guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildCategory && channel.name === name
  );
  if (existing) return existing;
  return guild.channels.create({
    name,
    type: ChannelType.GuildCategory,
    reason: 'Kush World bot setup',
  });
}

async function ensureChannel(guild, category, spec) {
  const existing = guild.channels.cache.find(
    (channel) =>
      channel.parentId === category.id &&
      channel.name === spec.name &&
      channel.type === spec.type
  );
  if (existing) return existing;

  const everyone = guild.roles.everyone;
  const overwrites = [];

  if (spec.readOnly) {
    overwrites.push({
      id: everyone.id,
      deny: [PermissionFlagsBits.SendMessages],
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
    });
  }

  return guild.channels.create({
    name: spec.name,
    type: spec.type,
    parent: category.id,
    topic: spec.topic,
    permissionOverwrites: overwrites,
    reason: 'Kush World bot setup',
  });
}

async function seedChannelMessages(guild, roles) {
  const rulesChannel = guild.channels.cache.find((c) => c.name === 'rules' && c.type === ChannelType.GuildText);
  if (rulesChannel) {
    const recent = await rulesChannel.messages.fetch({ limit: 5 }).catch(() => null);
    const hasRules = recent?.some((message) => message.author.id === guild.client.user.id && message.content.includes('Welcome to Kush World'));
    if (!hasRules) {
      await rulesChannel.send(RULES_TEXT);
    }
  }

  const rolesChannel = guild.channels.cache.find((c) => c.name === 'roles' && c.type === ChannelType.GuildText);
  const verifiedRole = roles.find((role) => role.name === 'Verified');
  if (rolesChannel && verifiedRole) {
    const recent = await rolesChannel.messages.fetch({ limit: 5 }).catch(() => null);
    const hasRoles = recent?.some((message) => message.author.id === guild.client.user.id && message.content.includes('Pick your roles'));
    if (!hasRoles) {
      const message = await rolesChannel.send(
        `**Pick your roles**\n\n` +
          `✅ — @${verifiedRole.name} (required to participate)\n` +
          `🔥 — @Deals\n` +
          `📦 — @Drops\n` +
          `👕 — @Merch\n\n` +
          `Shop: https://kushworld.shop`
      );
      await message.react('✅');
      await message.react('🔥');
      await message.react('📦');
      await message.react('👕');
    }
  }

  const announcements = guild.channels.cache.find(
    (c) => c.name === 'announcements' && c.type === ChannelType.GuildText
  );
  if (announcements) {
    const recent = await announcements.messages.fetch({ limit: 3 }).catch(() => null);
    const hasWelcome = recent?.some((message) => message.author.id === guild.client.user.id);
    if (!hasWelcome) {
      await announcements.send(
        '**Kush World Discord is live.**\n' +
          'Read #rules, grab roles in #roles, and pull up to #general.\n' +
          'https://kushworld.shop'
      );
    }
  }
}

async function main() {
  const client = createClient();
  await loginAndReady(client);

  const guild = await client.guilds.fetch(guildId());
  await guild.channels.fetch();
  await guild.roles.fetch();

  console.log(`Setting up server: ${guild.name}`);

  const createdRoles = [];
  for (const spec of ROLES) {
    const role = await ensureRole(guild, spec);
    createdRoles.push(role);
    console.log(`Role: ${role.name}`);
  }

  for (const section of LAYOUT) {
    const category = await ensureCategory(guild, section.name);
    console.log(`Category: ${category.name}`);
    for (const channelSpec of section.channels) {
      const channel = await ensureChannel(guild, category, channelSpec);
      console.log(`  #${channel.name}`);
    }
  }

  await seedChannelMessages(guild, createdRoles);

  console.log('Setup complete.');
  await client.destroy();
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});