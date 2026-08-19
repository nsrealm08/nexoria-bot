const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../database');
const { getRank, getLeaderboard, xpForLevel } = require('../utils/leveling');

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('rank').setDescription('Check your (or another user\'s) level')
      .addUserOption(o => o.setName('user').setDescription('User')),
    async execute(interaction) {
      const user = interaction.options.getUser('user') || interaction.user;
      const row = getRank(interaction.guild.id, user.id) || { xp: 0, level: 0 };
      await interaction.reply({ embeds: [new EmbedBuilder().setColor('Blue')
        .setDescription(`**${user.tag}** — Level **${row.level}** (${row.xp}/${xpForLevel(row.level)} XP)`)] });
    }
  },
  {
    data: new SlashCommandBuilder().setName('leaderboard').setDescription('Top members by level'),
    async execute(interaction) {
      const rows = getLeaderboard(interaction.guild.id, 10);
      if (!rows.length) return interaction.reply('No data yet.');
      const desc = rows.map((r, i) => `**${i + 1}.** <@${r.userId}> — Level ${r.level} (${r.xp} XP)`).join('\n');
      await interaction.reply({ embeds: [new EmbedBuilder().setColor('Blue').setTitle('🏆 Leaderboard').setDescription(desc)] });
    }
  },
  {
    data: new SlashCommandBuilder()
      .setName('setlevelchannel').setDescription('Set channel for level-up announcements')
      .addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(true))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const channel = interaction.options.getChannel('channel');
      db.prepare(`INSERT INTO settings (guildId, levelChannel) VALUES (?, ?)
        ON CONFLICT(guildId) DO UPDATE SET levelChannel=excluded.levelChannel`).run(interaction.guild.id, channel.id);
      await interaction.reply({ content: `✅ Level-up messages will post in ${channel}.`, ephemeral: true });
    }
  }
];
