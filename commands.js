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
