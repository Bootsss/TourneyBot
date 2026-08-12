// Optional standalone script — the bot now also registers commands automatically
// on every startup (see index.js), so you generally don't need to run this file
// manually. Kept here in case you ever want to register from a local machine.
require('dotenv').config();
const { REST, Routes } = require('discord.js');
const { commands } = require('./commands');

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Registering slash commands...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('Done.');
  } catch (err) {
    console.error('Failed to register commands:', err);
    process.exit(1);
  }
})();
