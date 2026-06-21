import {
  ChannelType,
  EmbedBuilder,
  ThreadAutoArchiveDuration,
} from 'discord.js';
import { BRAND, CATEGORY_NAMES } from './brand.mjs';
import { US_STATES } from './states.mjs';

const FORUM_NAME = 'state-connect';
const INDEX_POST = '📍 Start here — pick your state';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function statePostEmbed(stateName) {
  return new EmbedBuilder()
    .setColor(BRAND.color)
    .setTitle(`${stateName}`)
    .setDescription(
      `**${stateName}** locals — connect, share hauls, and rep ${BRAND.shopName}.\n\n` +
        `▸ Say hi and where you're at in the state\n` +
        `▸ Post setups, pickups & merch fits\n` +
        `▸ No sourcing or sales — community only\n\n` +
        `Shop → ${BRAND.site}`
    )
    .setFooter({ text: BRAND.serverName });
}

function indexPostEmbed() {
  return new EmbedBuilder()
    .setColor(BRAND.color)
    .setTitle('Connect in your state')
    .setDescription(
      `**50 state lounges in one place** — less clutter, same community.\n\n` +
        `**How it works**\n` +
        `1. Scroll or search for your state below\n` +
        `2. Open your state's post\n` +
        `3. Reply inside to meet locals & share ${BRAND.shopName} finds\n\n` +
        `Keep it friendly. No sourcing. 21+ only.\n\n` +
        `Shop → ${BRAND.site}`
    )
    .setFooter({ text: BRAND.serverName });
}

async function fetchForumThreads(forum) {
  const active = await forum.threads.fetchActive().catch(() => null);
  const archived = await forum.threads.fetchArchived({ limit: 100 }).catch(() => null);
  const names = new Set();
  for (const thread of active?.threads?.values() || []) names.add(thread.name);
  for (const thread of archived?.threads?.values() || []) names.add(thread.name);
  return names;
}

async function ensureForumPost(forum, title, embed, existingNames) {
  if (existingNames.has(title)) return false;

  await forum.threads.create({
    name: title.slice(0, 100),
    autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
    message: { embeds: [embed] },
    reason: 'KushWorld LLC state connect forum',
  });
  existingNames.add(title);
  return true;
}

export async function consolidateStateRegions(guild, communityCategory) {
  const regionsCat = [...guild.channels.cache.values()].find(
    (c) => c.type === ChannelType.GuildCategory && c.name === CATEGORY_NAMES.regions
  );

  let forum = [...guild.channels.cache.values()].find(
    (c) =>
      c.name === FORUM_NAME &&
      c.type === ChannelType.GuildForum &&
      c.parentId === communityCategory.id
  );

  if (!forum) {
    forum = await guild.channels.create({
      name: FORUM_NAME,
      type: ChannelType.GuildForum,
      parent: communityCategory.id,
      topic: `Find your state · share ${BRAND.shopName} hauls & connect with locals`,
      reason: 'KushWorld LLC — state connect forum',
    });
    console.log(`Created forum #${FORUM_NAME}`);
  } else {
    await forum.setTopic(`Find your state · share ${BRAND.shopName} hauls & connect with locals`).catch(() => null);
  }

  const existingNames = await fetchForumThreads(forum);

  const createdIndex = await ensureForumPost(forum, INDEX_POST, indexPostEmbed(), existingNames);
  if (createdIndex) {
    existingNames.add(INDEX_POST);
    console.log('  index post created');
  }

  let created = 0;
  for (const state of US_STATES) {
    const made = await ensureForumPost(forum, state.name, statePostEmbed(state.name), existingNames);
    if (made) {
      created++;
      if (created % 10 === 0) console.log(`  ${created} state posts...`);
      await sleep(1200);
    }
  }
  console.log(`State forum: ${created} new posts (${US_STATES.length} total states)`);

  if (regionsCat) {
    const legacy = [...guild.channels.cache.values()].filter(
      (c) => c.parentId === regionsCat.id && c.type === ChannelType.GuildText
    );
    if (legacy.length) {
      console.log(`Removing ${legacy.length} legacy state text channels...`);
      for (const ch of legacy) {
        await ch.delete('Consolidated into #state-connect forum').catch((e) => {
          console.warn(`  skip #${ch.name}: ${e.message}`);
        });
        await sleep(400);
      }
    }
    const remaining = [...guild.channels.cache.values()].filter((c) => c.parentId === regionsCat.id);
    if (!remaining.length) {
      await regionsCat.delete('REGIONS consolidated into #state-connect').catch(() => null);
      console.log('Removed REGIONS category');
    }
  }

  return forum;
}

export async function applyForumPermissions(guild, forum, verifiedRole) {
  if (!forum || !verifiedRole) return;
  const everyone = guild.roles.everyone;

  await forum.permissionOverwrites.edit(everyone, { ViewChannel: false }).catch(() => null);
  await forum.permissionOverwrites.edit(verifiedRole, {
    ViewChannel: true,
    ReadMessageHistory: true,
    SendMessagesInThreads: true,
    AttachFiles: true,
    EmbedLinks: true,
    AddReactions: true,
    CreatePublicThreads: false,
  }).catch(() => null);
}