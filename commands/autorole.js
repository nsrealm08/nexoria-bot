const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { pool } = require('../database');

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('setautorole').setDescription('Automatically give new members a role when they join')
      .addRoleOption(o => o.setName('role').setDescription('Role to auto-assign (omit to disable)'))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    async execute(interaction) {
      const role = interaction.options.getRole('role');
      await pool.query(
        `INSERT INTO settings (guild_id, autorole) VALUES ($1,$2)
         ON CONFLICT (guild_id) DO UPDATE SET autorole=excluded.autorole`,
        [interaction.guild.id, role ? role.id : null]);
      await interaction.reply({
        content: role ? `✅ New members will automatically get ${role}.` : '✅ Auto-role disabled.',
        ephemeral: true
      });
    }
  }
];
