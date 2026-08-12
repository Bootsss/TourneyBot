require('dotenv').config();
const { Client, GatewayIntentBits, Events, PermissionFlagsBits, REST, Routes } = require('discord.js');
const { commands } = require('./commands');

const {
  DISCORD_TOKEN,
  SIGNUP_CHANNEL_ID,
  US_ROLE_ID,
  AU_ROLE_ID,
  SHEETS_WEBHOOK_URL,
  SHEETS_SECRET,
  INVITE_LINK,
} = process.env;

for (const [name, val] of Object.entries({
  DISCORD_TOKEN, SIGNUP_CHANNEL_ID, US_ROLE_ID, AU_ROLE_ID, SHEETS_WEBHOOK_URL, SHEETS_SECRET, INVITE_LINK,
})) {
  if (!val) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
}

const STEAM_URL_REGEX = /^https:\/\/steamcommunity\.com\/(id|profiles)\/[\w-]+\/?$/i;

function buildInviteMessage(registrantName) {
  return (
    `Hey! **${registrantName}** has invited you to a Rust tournament — competing for $100, no sign-up fee. ` +
    `Join the Discord to get involved: ${INVITE_LINK}`
  );
}

// Try to find a guild member by exact username (case-insensitive) using Discord's
// member search endpoint. Returns the GuildMember or null. This only finds people
// who are ALREADY in the server — bots cannot look up or DM arbitrary non-members.
async function findMemberByUsername(guild, username) {
  if (!username) return null;
  try {
    const results = await guild.members.search({ query: username, limit: 5 });
    const match = results.find((m) => m.user.username.toLowerCase() === username.toLowerCase());
    return match || null;
  } catch (err) {
    console.error(`Member search failed for "${username}":`, err);
    return null;
  }
}

async function logToSheet(payload) {
  const res = await fetch(SHEETS_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: SHEETS_SECRET, timestamp: new Date().toISOString(), ...payload }),
  });
  if (!res.ok) throw new Error(`Sheets webhook returned ${res.status}`);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async (c) => {
  console.log(`Logged in as ${c.user.tag}`);

  try {
    const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
    await rest.put(Routes.applicationGuildCommands(c.user.id, process.env.GUILD_ID), { body: commands });
    console.log('Slash commands registered.');
  } catch (err) {
    console.error('Failed to auto-register slash commands:', err);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    if (interaction.commandName === 'tourney') {
      await handleTourney(interaction);
    } else if (interaction.commandName === 'tourney-reset') {
      await handleTourneyReset(interaction);
    }
  } catch (err) {
    console.error('Unhandled interaction error:', err);
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: 'Something went wrong. Please try again.', ephemeral: true }).catch(() => {});
    }
  }
});

async function handleTourney(interaction) {
  if (interaction.channelId !== SIGNUP_CHANNEL_ID) {
    await interaction.reply({ content: `Please use \`/tourney\` in <#${SIGNUP_CHANNEL_ID}>.`, ephemeral: true });
    return;
  }

  const member = interaction.member;
  if (member.roles.cache.has(US_ROLE_ID) || member.roles.cache.has(AU_ROLE_ID)) {
    await interaction.reply({
      content: "You're already registered. Contact an admin if you need to change your region.",
      ephemeral: true,
    });
    return;
  }

  const region = interaction.options.getString('region', true);
  const steamUrl = interaction.options.getString('steam_url', true).trim();
  const roleId = region === 'US' ? US_ROLE_ID : AU_ROLE_ID;

  if (!STEAM_URL_REGEX.test(steamUrl)) {
    await interaction.reply({
      content:
        "That doesn't look like a valid Steam profile URL. It should look like " +
        '`https://steamcommunity.com/id/yourname` or `https://steamcommunity.com/profiles/7656119...`.',
      ephemeral: true,
    });
    return;
  }

  // Collect teammate slots, validating that discord+steam are provided as a pair.
  const teammateSlots = [1, 2].map((n) => ({
    discord: interaction.options.getString(`teammate${n}_discord`)?.trim() || null,
    steam: interaction.options.getString(`teammate${n}_steam`)?.trim() || null,
  }));

  for (const [i, slot] of teammateSlots.entries()) {
    if ((slot.discord && !slot.steam) || (!slot.discord && slot.steam)) {
      await interaction.reply({
        content: `Teammate ${i + 1}: please provide both their Discord username and Steam URL, or leave both blank.`,
        ephemeral: true,
      });
      return;
    }
    if (slot.steam && !STEAM_URL_REGEX.test(slot.steam)) {
      await interaction.reply({
        content: `Teammate ${i + 1}'s Steam URL doesn't look valid. Expected format: https://steamcommunity.com/id/name`,
        ephemeral: true,
      });
      return;
    }
  }

  // Assign the role first — don't log or message anyone if this fails.
  try {
    await member.roles.add(roleId);
  } catch (err) {
    console.error('Role assignment failed:', err);
    await interaction.reply({
      content: "I couldn't assign your role (likely a bot permissions issue). Please ping an admin.",
      ephemeral: true,
    });
    return;
  }

  // Attempt to DM any teammate already in the server; always prepare the message
  // text as a fallback the registrant can send manually.
  const registrantName = interaction.user.username;
  const inviteMessage = buildInviteMessage(registrantName);
  const teammateResults = [];

  for (const slot of teammateSlots) {
    if (!slot.discord) continue;

    const foundMember = await findMemberByUsername(interaction.guild, slot.discord);
    let dmSent = false;

    if (foundMember) {
      try {
        await foundMember.send(inviteMessage);
        dmSent = true;
      } catch (err) {
        // Common cause: their DMs are closed to non-friends. Not an error worth logging loudly.
        dmSent = false;
      }
    }

    teammateResults.push({ discord: slot.discord, steam: slot.steam, dmSent, inServer: !!foundMember });
  }

  try {
    await logToSheet({
      discordUsername: interaction.user.username,
      discordId: interaction.user.id,
      steamUrl,
      region,
      teammate1Discord: teammateResults[0]?.discord || '',
      teammate1Steam: teammateResults[0]?.steam || '',
      teammate1DmSent: teammateResults[0] ? String(teammateResults[0].dmSent) : '',
      teammate2Discord: teammateResults[1]?.discord || '',
      teammate2Steam: teammateResults[1]?.steam || '',
      teammate2DmSent: teammateResults[1] ? String(teammateResults[1].dmSent) : '',
    });
  } catch (err) {
    console.error('Sheet logging failed:', err);
    await interaction.reply({
      content: `Role assigned (${region} Competitor), but I couldn't save your entry to the spreadsheet. Please tell an admin.`,
      ephemeral: true,
    });
    return;
  }

  // Build the reply: confirmation + per-teammate status + manual-send text for anyone not auto-DMed.
  let reply = `You're registered as **${region} Competitor**. Good luck!`;

  const notReached = teammateResults.filter((t) => !t.dmSent);
  const reached = teammateResults.filter((t) => t.dmSent);

  if (reached.length) {
    reply += `\n\nInvited automatically: ${reached.map((t) => t.discord).join(', ')}.`;
  }
  if (notReached.length) {
    reply +=
      `\n\nCouldn't auto-message: ${notReached.map((t) => t.discord).join(', ')} ` +
      `(they're either not in the server yet or have DMs closed). Send them this yourself:\n\n${inviteMessage}`;
  }

  await interaction.reply({ content: reply, ephemeral: true });
}

async function handleTourneyReset(interaction) {
  if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageRoles)) {
    await interaction.reply({ content: "You don't have permission to use this.", ephemeral: true });
    return;
  }

  const targetUser = interaction.options.getUser('user', true);
  const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

  if (!targetMember) {
    await interaction.reply({ content: 'Could not find that member in this server.', ephemeral: true });
    return;
  }

  const hadUS = targetMember.roles.cache.has(US_ROLE_ID);
  const hadAU = targetMember.roles.cache.has(AU_ROLE_ID);

  if (!hadUS && !hadAU) {
    await interaction.reply({ content: `${targetUser.username} doesn't have a region role — nothing to reset.`, ephemeral: true });
    return;
  }

  try {
    if (hadUS) await targetMember.roles.remove(US_ROLE_ID);
    if (hadAU) await targetMember.roles.remove(AU_ROLE_ID);
  } catch (err) {
    console.error('Role removal failed:', err);
    await interaction.reply({
      content: "Couldn't remove the role — check the bot's role position and Manage Roles permission.",
      ephemeral: true,
    });
    return;
  }

  await interaction.reply({
    content: `Reset ${targetUser.username} (removed ${[hadUS && 'US', hadAU && 'AU'].filter(Boolean).join(' + ')} Competitor). They can now run \`/tourney\` again.`,
    ephemeral: true,
  });
}

client.login(DISCORD_TOKEN);
