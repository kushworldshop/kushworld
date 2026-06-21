import {
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import { createClient, loginAndReady } from './client.mjs';
import { guildId } from './config.mjs';
import { BRAND, CATEGORY_NAMES, RULES_BODY } from './brand.mjs';
import { consolidateStateRegions, applyForumPermissions } from './regions-forum.mjs';

const STAFF_ROLES = ['Staff', 'Mod', 'Kush World'];

function staffRoles(guild) {
  return STAFF_ROLES.map((name) => guild.roles.cache.find((r) => r.name === name)).filter(Boolean);
}

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
  await from.delete('Kush World rebrand — merged role').catch((e) => {
    console.warn(`  could not delete role ${fromName}: ${e.message}`);
  });
  console.log(`Role merged: ${fromName} → ${toName}`);
}

async function tryElevateBotRole(guild, client) {
  const me = await guild.members.fetch(client.user.id);
  const botRole = me.roles.highest;
  const managedNames = [
    'Verified', 'Deals', 'Drops', 'Merch', 'Mod', 'Staff',
    'VERIFIED', 'stoners', 'Member',
  ];
  const managed = guild.roles.cache
    .filter((r) => managedNames.includes(r.name))
    .sort((a, b) => b.position - a.position);
  if (!managed.size) return;

  const target = managed.first().position + 1;
  if (botRole.position >= target) {
    console.log('BOT role hierarchy OK');
    return;
  }

  await botRole.setPosition(target).catch((e) => {
    console.warn(`Could not elevate BOT role: ${e.message}`);
    console.warn('Drag BOT above Verified/legacy roles in Server Settings → Roles.');
  });
  if (botRole.position >= target) console.log(`BOT role elevated to pos ${botRole.position}`);
}

async function styleRoles(guild) {
  const styles = [
    { name: 'Verified', color: BRAND.color },
    { name: 'Deals', color: 0x5865f2 },
    { name: 'Drops', color: 0xfaa61a },
    { name: 'Merch', color: 0xeb459e },
    { name: 'Mod', color: 0xed4245 },
    { name: 'Staff', color: 0x99aab5 },
    { name: 'Member', color: 0x4f545c },
  ];

  for (const spec of styles) {
    let role = guild.roles.cache.find((r) => r.name === spec.name);
    if (!role && spec.name === 'Member') {
      const legacy = guild.roles.cache.find((r) => r.name === 'stoners');
      if (legacy) {
        await legacy.setName('Member', 'Kush World rebrand');
        await legacy.setColors({ primaryColor: spec.color });
        console.log('Role renamed → Member');
        continue;
      }
    }
    if (role) {
      await role.setColors({ primaryColor: spec.color }).catch((e) => {
        console.warn(`  color ${spec.name}: ${e.message}`);
      });
      console.log(`  styled ${spec.name}`);
    }
  }

  await mergeRole(guild, 'VERIFIED', 'Verified');

  const mod = guild.roles.cache.find((r) => r.name === 'Mod');
  if (mod) {
    await mod.setPermissions([
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ManageMessages,
      PermissionFlagsBits.KickMembers,
      PermissionFlagsBits.BanMembers,
      PermissionFlagsBits.ModerateMembers,
      PermissionFlagsBits.ReadMessageHistory,
      PermissionFlagsBits.ManageThreads,
    ]).catch((e) => console.warn(`  Mod perms: ${e.message}`));
  }

  const staff = guild.roles.cache.find((r) => r.name === 'Staff');
  if (staff) {
    await staff.setPermissions([
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ManageMessages,
      PermissionFlagsBits.ReadMessageHistory,
      PermissionFlagsBits.ManageThreads,
    ]).catch((e) => console.warn(`  Staff perms: ${e.message}`));
    await staff.setColors({ primaryColor: 0x99aab5 }).catch(() => null);
  }
}

async function setupVerificationGate(guild, verifiedRole) {
  if (!verifiedRole) {
    console.warn('No Verified role — skipping verification gate');
    return;
  }

  const everyone = guild.roles.everyone;
  const staff = staffRoles(guild);

  for (const cat of [...guild.channels.cache.values()].filter((c) => c.type === ChannelType.GuildCategory)) {
    if (cat.name === CATEGORY_NAMES.info) {
      await cat.permissionOverwrites.edit(everyone, { ViewChannel: true }).catch(() => null);
      continue;
    }

    if (cat.name === CATEGORY_NAMES.staff) {
      await cat.permissionOverwrites.edit(everyone, { ViewChannel: false }).catch(() => null);
      await cat.permissionOverwrites.edit(verifiedRole, { ViewChannel: false }).catch(() => null);
      for (const role of staff) {
        await cat.permissionOverwrites.edit(role, { ViewChannel: true }).catch(() => null);
      }
      continue;
    }

    await cat.permissionOverwrites.edit(everyone, { ViewChannel: false }).catch(() => null);
    await cat.permissionOverwrites.edit(verifiedRole, { ViewChannel: true }).catch(() => null);
    for (const role of staff) {
      await cat.permissionOverwrites.edit(role, { ViewChannel: true }).catch(() => null);
    }
  }

  console.log('Verification gate applied — new members only see INFO until ✅');
}

async function setupChannelPermissions(guild, verifiedRole) {
  const everyone = guild.roles.everyone;
  const staff = staffRoles(guild);

  const infoReadOnly = ['rules', 'announcements'];
  for (const name of infoReadOnly) {
    const ch = findChannel(guild, name, CATEGORY_NAMES.info);
    if (!ch) continue;
    await ch.permissionOverwrites.edit(everyone, {
      ViewChannel: true,
      ReadMessageHistory: true,
      SendMessages: false,
      AddReactions: false,
    }).catch(() => null);
  }

  const rolesCh = findChannel(guild, 'roles', CATEGORY_NAMES.info);
  if (rolesCh) {
    await rolesCh.permissionOverwrites.edit(everyone, {
      ViewChannel: true,
      ReadMessageHistory: true,
      SendMessages: false,
      AddReactions: true,
    }).catch(() => null);
  }

  if (verifiedRole) {
    const memberPerms = {
      ViewChannel: true,
      ReadMessageHistory: true,
      SendMessages: true,
      AddReactions: true,
      AttachFiles: true,
      EmbedLinks: true,
      UseExternalEmojis: true,
    };

    for (const catName of [CATEGORY_NAMES.products, CATEGORY_NAMES.community, CATEGORY_NAMES.media]) {
      for (const ch of [...guild.channels.cache.values()]) {
        if (ch.parent?.name !== catName) continue;
        if (ch.type === ChannelType.GuildText && ch.name !== 'nsfw') {
          await ch.permissionOverwrites.edit(verifiedRole, memberPerms).catch(() => null);
        }
      }
    }

    const stateForum = [...guild.channels.cache.values()].find(
      (c) => c.name === 'state-connect' && c.type === ChannelType.GuildForum
    );
    if (stateForum) await applyForumPermissions(guild, stateForum, verifiedRole);

    const orderHelp = findChannel(guild, 'order-help', CATEGORY_NAMES.shop);
    if (orderHelp) {
      await orderHelp.permissionOverwrites.edit(verifiedRole, memberPerms).catch(() => null);
    }

    for (const ch of [...guild.channels.cache.values()]) {
      if (ch.parent?.name !== CATEGORY_NAMES.voice || ch.type !== ChannelType.GuildVoice) continue;
      await ch.permissionOverwrites.edit(verifiedRole, {
        ViewChannel: true,
        Connect: true,
        Speak: true,
        Stream: true,
      }).catch(() => null);
    }
  }

  for (const name of ['new-drops', 'deals']) {
    const ch = findChannel(guild, name, CATEGORY_NAMES.shop);
    if (!ch) continue;
    await setReadOnly(ch);
    if (verifiedRole) {
      await ch.permissionOverwrites.edit(verifiedRole, {
        ViewChannel: true,
        ReadMessageHistory: true,
        SendMessages: false,
      }).catch(() => null);
    }
    for (const role of staff) {
      await ch.permissionOverwrites.edit(role, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
      }).catch(() => null);
    }
  }

  const nsfw = findChannel(guild, 'nsfw', CATEGORY_NAMES.media);
  if (nsfw) {
    await nsfw.setNSFW(true).catch(() => null);
    if (verifiedRole) {
      await nsfw.permissionOverwrites.edit(verifiedRole, {
        ViewChannel: true,
        ReadMessageHistory: true,
        SendMessages: true,
        AttachFiles: true,
      }).catch(() => null);
    }
  }

  const modChat = findChannel(guild, 'mod-chat', CATEGORY_NAMES.staff);
  if (modChat) {
    await modChat.permissionOverwrites.edit(everyone, { ViewChannel: false }).catch(() => null);
    if (verifiedRole) {
      await modChat.permissionOverwrites.edit(verifiedRole, { ViewChannel: false }).catch(() => null);
    }
    for (const role of staff) {
      await modChat.permissionOverwrites.edit(role, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
        AttachFiles: true,
      }).catch(() => null);
    }
  }

  console.log('Channel permissions synced');
}

async function setupGuildProfile(guild, rulesChannel) {
  await guild.edit({
    description: BRAND.description,
    ...(rulesChannel ? { rulesChannel: rulesChannel.id } : {}),
  }).catch((e) => console.warn(`Guild profile: ${e.message}`));

  await guild.setAFKChannel(null).catch(() => null);
  console.log('Guild description updated');
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
    await rules.setTopic(`${BRAND.serverName} community guidelines`);
    const embed = new EmbedBuilder()
      .setColor(BRAND.color)
      .setTitle(`${BRAND.serverName} · Rules`)
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
    await announcements.setTopic(`Official ${BRAND.serverName} updates`);
    const embed = new EmbedBuilder()
      .setColor(BRAND.color)
      .setTitle(`Welcome to ${BRAND.serverName}`)
      .setDescription(
        `${BRAND.tagline}\n\n` +
          `▸ Read <#${rules?.id || 'rules'}>\n` +
          `▸ Verify on ${BRAND.site} (Discord + government ID)\n` +
          `▸ Shop ${BRAND.site}`
      );
    const recent = await announcements.messages.fetch({ limit: 5 }).catch(() => null);
    const hasWelcome = recent?.some((m) => m.author.id === guild.client.user.id && m.embeds[0]?.title?.includes('Welcome'));
    if (!hasWelcome) {
      await announcements.send({ embeds: [embed] });
    }
  }

  if (roles) {
    const embed = new EmbedBuilder()
      .setColor(BRAND.color)
      .setTitle('Roles')
      .setDescription(
        `**Verified** — staff grants this after you link Discord on ${BRAND.site} and your government ID is approved.\n\n` +
          `Optional alerts (react below):\n` +
          `🔥 **Deals** — promos & sales\n` +
          `📦 **Drops** — new products & restocks\n` +
          `👕 **Merch** — apparel alerts`
      );
    const recent = await roles.messages.fetch({ limit: 8 }).catch(() => null);
    const botMsg = recent?.find((m) => m.author.id === guild.client.user.id && m.embeds[0]?.title === 'Roles');
    if (botMsg) {
      await botMsg.edit({ embeds: [embed] }).catch(() => null);
    } else {
      const msg = await roles.send({ embeds: [embed] });
      for (const emoji of ['🔥', '📦', '👕']) {
        await msg.react(emoji).catch(() => null);
      }
    }
  }

  for (const name of ['new-drops', 'deals']) {
    const ch = findChannel(guild, name, CATEGORY_NAMES.shop);
    if (ch) {
      await setReadOnly(ch);
      await ch.setTopic(`${BRAND.serverName} · ${name.replace('-', ' ')}`).catch(() => null);
    }
  }

  const orderHelpCh = findChannel(guild, 'order-help', CATEGORY_NAMES.shop);
  if (orderHelpCh) {
    await orderHelpCh.setTopic(`${BRAND.serverName} · order & shipping support`).catch(() => null);
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

  await tryElevateBotRole(guild, client);

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
  const voice = findCategory(guild, CATEGORY_NAMES.voice) || (await ensureCategory(guild, CATEGORY_NAMES.voice));
  const staff = await ensureCategory(guild, CATEGORY_NAMES.staff);

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
      await ch.setTopic(`${BRAND.serverName} · ${to}`).catch(() => null);
    }
  }

  for (const name of ['memes', 'nsfw']) {
    const ch = findChannel(guild, name);
    if (ch) {
      await moveToCategory(ch, media);
      if (name === 'nsfw') await ch.setNSFW(true).catch(() => null);
    }
  }

  const mainChat = findChannel(guild, 'main-chat');
  const newGeneral = findChannel(guild, 'general', CATEGORY_NAMES.community);
  if (mainChat) {
    await renameChannel(mainChat, 'chat');
    await moveToCategory(mainChat, community);
    await mainChat.setTopic(`${BRAND.serverName} main lounge`).catch(() => null);
  }
  if (newGeneral && mainChat) {
    await deleteChannel(newGeneral, 'duplicate of main-chat');
  }

  for (const name of ['show-your-setup', 'music-media']) {
    const ch = findChannel(guild, name, CATEGORY_NAMES.community);
    if (ch) await ch.setTopic(`${BRAND.serverName} community`).catch(() => null);
  }

  for (const name of ['rules', 'announcements', 'roles']) {
    const ch = findChannel(guild, name, CATEGORY_NAMES.info);
    if (ch) await moveToCategory(ch, info);
  }
  for (const name of ['new-drops', 'deals', 'order-help']) {
    const ch = findChannel(guild, name, CATEGORY_NAMES.shop);
    if (ch) await moveToCategory(ch, shop);
  }

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

  const modOnly = findChannel(guild, 'moderator-only');
  if (modOnly) {
    await renameChannel(modOnly, 'mod-chat');
    await moveToCategory(modOnly, staff);
    await modOnly.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false }).catch(() => null);
  }

  const infoRules = findChannel(guild, 'rules', CATEGORY_NAMES.info);
  for (const ch of [...guild.channels.cache.values()]) {
    if (!ch.parentId && ch.type === ChannelType.GuildText) {
      if (ch.name === 'rules') {
        await moveToCategory(ch, info);
        if (infoRules && ch.id !== infoRules.id) {
          await deleteChannel(infoRules, 'duplicate rules channel');
        }
      }
      if (ch.name === 'announcments') {
        await deleteChannel(ch, 'typo duplicate announcements');
      }
    }
  }

  const voiceCats = [...guild.channels.cache.values()].filter(
    (c) => c.type === ChannelType.GuildCategory && c.name === CATEGORY_NAMES.voice
  );
  if (voiceCats.length > 1) {
    for (const cat of voiceCats) {
      const kids = [...guild.channels.cache.values()].filter((c) => c.parentId === cat.id);
      if (!kids.length) {
        await cat.delete('Kush World rebrand — empty voice category').catch(() => null);
        console.log('Removed empty VOICE category');
      }
    }
  }

  await consolidateStateRegions(guild, community);

  await setCategoryOrder(guild, [
    CATEGORY_NAMES.info,
    CATEGORY_NAMES.shop,
    CATEGORY_NAMES.products,
    CATEGORY_NAMES.community,
    CATEGORY_NAMES.media,
    CATEGORY_NAMES.voice,
    CATEGORY_NAMES.staff,
  ]);

  const brandedChannels = {
    rules: findChannel(guild, 'rules', CATEGORY_NAMES.info),
    roles: findChannel(guild, 'roles', CATEGORY_NAMES.info),
    announcements: findChannel(guild, 'announcements', CATEGORY_NAMES.info),
  };

  await setupGuildProfile(guild, brandedChannels.rules);
  await seedBranding(guild, brandedChannels);

  const verifiedRole = guild.roles.cache.find((r) => r.name === 'Verified');
  await setupVerificationGate(guild, verifiedRole);
  await setupChannelPermissions(guild, verifiedRole);

  const stateForum = [...guild.channels.cache.values()].find(
    (c) => c.name === 'state-connect' && c.type === ChannelType.GuildForum
  );
  if (stateForum && verifiedRole) await applyForumPermissions(guild, stateForum, verifiedRole);

  try {
    await styleRoles(guild);
  } catch (error) {
    console.warn(`Role styling skipped: ${error.message || error}`);
    console.warn('Drag the BOT role above other roles in Server Settings → Roles.');
  }

  const me = await guild.members.fetch(client.user.id);
  await me.setNickname(BRAND.serverName).catch(() => null);

  console.log('\nRebrand complete.');
  await client.destroy();
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});