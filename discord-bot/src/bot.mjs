import { Events } from 'discord.js';
import { createClient, loginAndReady } from './client.mjs';
import { guildId } from './config.mjs';

const REACTION_ROLES = {
  '✅': 'Verified',
  '🔥': 'Deals',
  '📦': 'Drops',
  '👕': 'Merch',
};

async function handleReaction(reaction, user, add) {
  if (user.bot) return;
  if (reaction.partial) await reaction.fetch().catch(() => null);
  if (reaction.message?.partial) await reaction.message.fetch().catch(() => null);
  if (!reaction.message?.guild) return;
  if (reaction.message.channel?.name !== 'roles') return;

  const roleName = REACTION_ROLES[reaction.emoji.name];
  if (!roleName) return;

  const member = await reaction.message.guild.members.fetch(user.id).catch(() => null);
  const role = reaction.message.guild.roles.cache.find((entry) => entry.name === roleName);
  if (!member || !role) return;

  if (add) {
    await member.roles.add(role).catch(() => null);
  } else {
    await member.roles.remove(role).catch(() => null);
  }
}

async function main() {
  const client = createClient();

  client.once(Events.ClientReady, (readyClient) => {
    console.log(`Bot online as ${readyClient.user.tag}`);
    console.log(`Watching guild ${guildId()}`);
  });

  client.on(Events.MessageReactionAdd, (reaction, user) => {
    handleReaction(reaction, user, true).catch(() => null);
  });

  client.on(Events.MessageReactionRemove, (reaction, user) => {
    handleReaction(reaction, user, false).catch(() => null);
  });

  client.on(Events.GuildMemberAdd, async (member) => {
    if (member.guild.id !== guildId()) return;
    const general = member.guild.channels.cache.find(
      (channel) => channel.name === 'general' && channel.isTextBased()
    );
    if (!general?.isTextBased()) return;
    await general
      .send(`Welcome <@${member.id}> — read **#rules** and grab **@Verified** in **#roles**.`)
      .catch(() => null);
  });

  await loginAndReady(client);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});