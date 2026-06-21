import {
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
} from 'discord.js';
import { createClient, loginAndReady } from './client.mjs';
import { guildId } from './config.mjs';

const BRAND = {
  name: 'Kush World',
  color: 0x00ff9d,
  site: 'https://kushworld.shop',
  tagline: 'Lab-tested hemp · Studio merch · Built different',
};

const CATEGORY_NAMES = {
  info: 'INFO',
  shop: 'SHOP',
  products: 'PRODUCTS',
  community: 'COMMUNITY',
  media: 'MEDIA',
  regions: 'REGIONS',
  voice: 'VOICE',
  staff: 'STAFF',
};

const RULES_BODY =
  `**${BRAND.name}** — ${BRAND.tagline}\n\n` +
  `**01** · 21+ only · follow your local laws\n` +
  `**02** · Be respectful — no harassment, hate, or drama\n` +
  `**03** · No sourcing, illegal sales, or sketchy DMs\n` +
  `**04** · Order help → <#ORDER_HELP> · don't post personal info publicly\n` +
  `**05** · No medical claims — adults only, shop responsibly\n\n` +
  `Get <@&VERIFIED_ROLE> in <#ROLES_CH> to unlock the server.\n` +
  `Shop → ${BRAND.site}`;

function findChannel(guild, name, parentName) {
  const parent = parentName
    ? [...guild.channels.cache.values()].find(
        (c) => c.type === ChannelType.GuildCategory && c.name === parentName
      )
    : null;
  return [...guild.channels.cache.values()].find(
    (c) =>
      c.name === name &&
      (parent ? c.parentId === parent.id : true) &&
      c.type !== ChannelType.GuildCategory
  );
}

function findCategory(guild, name) {
  return [...guild.channels.cache.values()].find(
    (c) => c.type === ChannelType.GuildCategory && c.name === name
  );
}

async function ensureCategory(guild, name) {
  const existing = findCategory(guild, name);
  if (existing) return existing;
  return guild.channels.create({
    name,
    type: ChannelType.GuildCategory,
    reason: 'Kush World rebrand',
  });
}

async function renameCategory(channel, name) {
  if (channel.name !== name) {
    await channel.setName(name, 'Kush World rebrand');
    console.log(`Category → ${name}`);
  }
  return channel;
}

async function renameChannel(channel, name) {
  if (channel.name !== name) {
    await channel.setName(name, 'Kush World rebrand');
    console.log(`  #${channel.name} → #${name}`);
  }
}

async function moveToCategory(channel, category) {
  if (channel.parentId !== category.id) {
    await channel.setParent(category.id, { lockPermissions: false });
    console.log(`  moved #${channel.name} → ${category.name}`);
  }
}

async function setReadOnly(channel) {
  const everyone = channel.guild.roles.everyone;
  await channel.permissionOverwrites.edit(everyone, {
    ViewChannel: true,
    ReadMessageHistory: true,
    SendMessages: false,
  });
}

async function mergeRole(guild, fromName, toName) {
  const from = guild.roles.cache.find((r) => r.name === fromName);
  const to = guild.roles.cache.find((r) => r.name === toName);
  if (!from || !to || from.id === to.id) return;

  const members = [...guild.members.cache.values()].filter((m) => m.roles.cache.has(from.id));
  for (const member of members) {
    await member.roles.add(to).catch(() => null);
    await member.roles.remove(from).catch(() => null);
  }
  await from.delete('Kush World rebrand — merged role').catch(() => null);
  console.log(`Role merged: ${fromName} → ${toName}`);
}

async function styleRoles(guild) {
  const styles = [
    { name: 'Verified', color: BRAND.color },
    { name: 'Deals', color: 0x5865f2 },
    { name: 'Drops', color: 0xfaa61a },
    { name: 'Merch', color: 0xeb459e },
    { name: 'Mod', color: 0xed4245 },
    { name: 'Staff', color: 0x99aab5 },
    { name: 'Member', color: 0x2f3136 },
  ];

  for (const spec of styles) {
    let role = guild.roles.cache.find((r) => r.name === spec.name);
    if (!role && spec.name === 'Member') {
      const legacy = guild.roles.cache.find((r) => r.name === 'stoners' || r.name === 'KWLLC');
      if (legacy) {
        await legacy.setName('Member', 'Kush World rebrand');
        await legacy.setColor(spec.color);
        console.log(`Role renamed → Member`);
        continue;
      }
    }
    if (role) {
      await role.setColor(spec.color).catch(() => null);
    }
  }

  await mergeRole(guild, 'VERIFIED', 'Verified');
  const kwllc = guild.roles.cache.find((r) => r.name === 'KWLLC');
  if (kwllc) {
    await kwllc.setName('Kush World', 'Kush World rebrand').catch(() => null);
    await kwllc.setColor(BRAND.color).catch(() => null);
  }
}

async function deleteChannel(channel, reason) {
  console.log(`Delete #${channel.name} (${reason})`);
  await channel.delete(reason).catch((e) => console.warn(`  skip delete: ${e.message}`));
}

async function seedBranding(guild, channels) {
  const { rules, roles, announcements } = channels;
  const verifiedRole = guild.roles.cache.find((r) => r.name === 'Verified');
  const orderHelp = findChannel(guild, 'order-help', CATEGORY_NAMES.shop);

  const rulesText = RULES_BODY.replace('<#ORDER_HELP>', orderHelp?.id ? `<#${orderHelp.id}>` : '#order-help')
    .replace('<#ROLES_CH>', roles?.id ? `<#${roles.id}>` : '#roles')
    .replace('@&VERIFIED_ROLE', verifiedRole ? `<@&${verifiedRole.id}>` : '@Verified');

  if (rules) {
    await setReadOnly(rules);
    await rules.setTopic(`${BRAND.name} community guidelines`);
    const embed = new EmbedBuilder()
      .setColor(BRAND.color)
      .setTitle(`${BRAND.name} · Rules`)
      .setDescription(rulesText)
      .setFooter({ text: BRAND.site });
    const recent = await rules.messages.fetch({ limit: 8 }).catch(() => null);
    const hasBrand = recent?.some((m) => m.author.id === guild.client.user.id && m.embeds[0]?.title?.includes('Rules'));
    if (!hasBrand) {
      await rules.send({ embeds: [embed] });
    }
  }

  if (announcements) {
    await setReadOnly(announcements);
    await announcements.setTopic(`Official ${BRAND.name} updates`);
    const embed = new EmbedBuilder()
      .setColor(BRAND.color)
      .setTitle(`Welcome to ${BRAND.name}`)
      .setDescription(
        `${BRAND.tagline}\n\n` +
          `▸ Read <#${rules?.id || 'rules'}>\n` +
          `▸ Verify in <#${roles?.id || 'roles'}>\n` +
          `▸ Shop ${BRAND.site}`
      );
    const recent = await announcements.messages.fetch({ limit: 5 }).catch(() => null);
    const hasWelcome = recent?.some((m) => m.author.id === guild.client.user.id && m.embeds[0]?.title?.includes('Welcome'));
    if (!hasWelcome) {
      await announcements.send({ embeds: [embed] });
    }
  }

  if (roles && verifiedRole) {
    const embed = new EmbedBuilder()
      .setColor(BRAND.color)
      .setTitle('Roles')
      .setDescription(
        `React to opt in:\n\n` +
          `✅ **Verified** — required to participate\n` +
          `🔥 **Deals** — promos & sales\n` +
          `📦 **Drops** — new products & restocks\n` +
          `👕 **Merch** — apparel alerts\n\n` +
          BRAND.site
      );
    const recent = await roles.messages.fetch({ limit: 8 }).catch(() => null);
    const botMsg = recent?.find((m) => m.author.id === guild.client.user.id && m.embeds[0]?.title === 'Roles');
    if (!botMsg) {
      const msg = await roles.send({ embeds: [embed] });
      await msg.react('✅');
      await msg.react('🔥');
      await msg.react('📦');
      await msg.react('👕');
    }
  }
}

async function setCategoryOrder(guild, orderedNames) {
  let pos = 0;
  for (const name of orderedNames) {
    const cat = findCategory(guild, name);
    if (cat) {
      await cat.setPosition(pos++).catch(() => null);
    }
  }
}

async function main() {
  const client = createClient();
  await loginAndReady(client);
  const guild = await client.guilds.fetch(guildId());
  await guild.channels.fetch();
  await guild.roles.fetch();

  console.log(`Rebranding: ${guild.name}\n`);

  // Rename legacy categories
  const legacyMap = [
    ['KUSH GOODNESS', CATEGORY_NAMES.products],
    ['MONKEY BIDNESS', CATEGORY_NAMES.media],
    ["STATE'S WE SMOKE IN", CATEGORY_NAMES.regions],
    ['Voice Channels', CATEGORY_NAMES.voice],
  ];
  for (const [oldName, newName] of legacyMap) {
    const cat = findCategory(guild, oldName);
    if (cat) await renameCategory(cat, newName);
  }

  const info = await ensureCategory(guild, CATEGORY_NAMES.info);
  const shop = await ensureCategory(guild, CATEGORY_NAMES.shop);
  const products = findCategory(guild, CATEGORY_NAMES.products) || (await ensureCategory(guild, CATEGORY_NAMES.products));
  const community = findCategory(guild, CATEGORY_NAMES.community) || (await ensureCategory(guild, CATEGORY_NAMES.community));
  const media = findCategory(guild, CATEGORY_NAMES.media) || (await ensureCategory(guild, CATEGORY_NAMES.media));
  const regions = findCategory(guild, CATEGORY_NAMES.regions) || (await ensureCategory(guild, CATEGORY_NAMES.regions));
  const voice = findCategory(guild, CATEGORY_NAMES.voice) || (await ensureCategory(guild, CATEGORY_NAMES.voice));
  const staff = await ensureCategory(guild, CATEGORY_NAMES.staff);

  // Product channel renames
  const productRenames = [
    ['flower', 'flower'],
    ['wax', 'wax'],
    ['310-carts', 'carts'],
    ['disposables', 'disposables'],
    ['hash', 'hash'],
  ];
  for (const [from, to] of productRenames) {
    const ch = findChannel(guild, from);
    if (ch) {
      await renameChannel(ch, to);
      await moveToCategory(ch, products);
      await ch.setTopic(`${BRAND.name} · ${to}`).catch(() => null);
    }
  }

  // Media
  for (const name of ['memes', 'nsfw']) {
    const ch = findChannel(guild, name);
    if (ch) {
      await moveToCategory(ch, media);
      if (name === 'nsfw') await ch.setNSFW(true).catch(() => null);
    }
  }

  // Community — prefer main-chat, drop duplicate general
  const mainChat = findChannel(guild, 'main-chat');
  const newGeneral = findChannel(guild, 'general', CATEGORY_NAMES.community);
  if (mainChat) {
    await renameChannel(mainChat, 'chat');
    await moveToCategory(mainChat, community);
    await mainChat.setTopic(`${BRAND.name} main lounge`).catch(() => null);
  }
  if (newGeneral && mainChat) {
    await deleteChannel(newGeneral, 'duplicate of main-chat');
  }

  for (const name of ['show-your-setup', 'music-media']) {
    const ch = findChannel(guild, name, CATEGORY_NAMES.community);
    if (ch) await ch.setTopic(`${BRAND.name} community`).catch(() => null);
  }

  // Shop + info channels
  for (const name of ['rules', 'announcements', 'roles']) {
    const ch = findChannel(guild, name, CATEGORY_NAMES.info);
    if (ch) await moveToCategory(ch, info);
  }
  for (const name of ['new-drops', 'deals', 'order-help']) {
    const ch = findChannel(guild, name, CATEGORY_NAMES.shop);
    if (ch) await moveToCategory(ch, shop);
  }

  // Voice consolidation
  for (const name of ['HOOKA LOUNGE', 'DAB CENTRAL', 'Lounge']) {
    const ch = [...guild.channels.cache.values()].find(
      (c) => c.name === name && c.type === ChannelType.GuildVoice
    );
    if (ch) {
      const voiceName = name === 'HOOKA LOUNGE' ? 'hookah-lounge' : name === 'DAB CENTRAL' ? 'dab-lounge' : 'lounge';
      await renameChannel(ch, voiceName);
      await moveToCategory(ch, voice);
    }
  }

  // Staff
  const modOnly = findChannel(guild, 'moderator-only');
  if (modOnly) {
    await renameChannel(modOnly, 'mod-chat');
    await moveToCategory(modOnly, staff);
    await modOnly.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false }).catch(() => null);
  }

  // Remove duplicates (uncategorized / typos)
  const infoRules = findChannel(guild, 'rules', CATEGORY_NAMES.info);
  for (const ch of [...guild.channels.cache.values()]) {
    if (!ch.parentId && ch.type === ChannelType.GuildText) {
      if (ch.name === 'rules' && infoRules && ch.id !== infoRules.id) {
        await deleteChannel(ch, 'duplicate rules');
      }
      if (ch.name === 'announcments') {
        await deleteChannel(ch, 'typo duplicate announcements');
      }
    }
  }

  // Region channel topics
  for (const ch of [...guild.channels.cache.values()]) {
    if (ch.parentId === regions.id && ch.type === ChannelType.GuildText) {
      await ch.setTopic(`${BRAND.name} · ${ch.name.replace(/-/g, ' ')}`).catch(() => null);
    }
  }

  await styleRoles(guild);

  await setCategoryOrder(guild, [
    CATEGORY_NAMES.info,
    CATEGORY_NAMES.shop,
    CATEGORY_NAMES.products,
    CATEGORY_NAMES.community,
    CATEGORY_NAMES.media,
    CATEGORY_NAMES.voice,
    CATEGORY_NAMES.regions,
    CATEGORY_NAMES.staff,
  ]);

  const brandedChannels = {
    rules: findChannel(guild, 'rules', CATEGORY_NAMES.info),
    roles: findChannel(guild, 'roles', CATEGORY_NAMES.info),
    announcements: findChannel(guild, 'announcements', CATEGORY_NAMES.info),
  };
  await seedBranding(guild, brandedChannels);

  console.log('\nRebrand complete.');
  await client.destroy();
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});