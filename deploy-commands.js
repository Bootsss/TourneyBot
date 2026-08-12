// Run this ONCE (and again any time you change the command definition):
//   npm run deploy-commands
require('dotenv').config();
const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

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
    .setDescription('Admin: remove a competitor\'s region role so they can re-register')
    .addUserOption((option) =>
      option.setName('user').setDescription('The competitor to reset').setRequired(true)
    )
    // Hides the command from anyone without Manage Roles by default.
    // Server owners can further restrict it in Integrations settings if desired.
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .toJSON(),
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Registering slash command...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('Done. /tourney is now available in your server (guild-scoped commands show up instantly).');
  } catch (err) {
    console.error('Failed to register command:', err);
    process.exit(1);
  }
})();
