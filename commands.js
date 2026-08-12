const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('tourney')
    .setDescription('Register for the Rust tournament')
    .addStringOption((option) =>
      option
        .setName('region')
        .setDescription('Which tournament are you competing in?')
        .setRequired(true)
        .addChoices({ name: 'US', value: 'US' }, { name: 'AU', value: 'AU' })
    )
    .addStringOption((option) =>
      option
        .setName('steam_url')
        .setDescription('Your Steam profile URL, e.g. https://steamcommunity.com/id/yourname')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('teammate1_discord').setDescription("Teammate 1's Discord username (optional)").setRequired(false)
    )
    .addStringOption((option) =>
      option.setName('teammate1_steam').setDescription("Teammate 1's Steam profile URL (optional)").setRequired(false)
    )
    .addStringOption((option) =>
      option.setName('teammate2_discord').setDescription("Teammate 2's Discord username (optional)").setRequired(false)
    )
    .addStringOption((option) =>
      option.setName('teammate2_steam').setDescription("Teammate 2's Steam profile URL (optional)").setRequired(false)
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName('tourney-reset')
    .setDescription("Admin: remove a competitor's region role so they can re-register")
    .addUserOption((option) =>
      option.setName('user').setDescription('The competitor to reset').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .toJSON(),
];

module.exports = { commands };
