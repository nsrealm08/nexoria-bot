const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { pool } = require('../database');

module.exports = [
  {
    data: new SlashCommandBuilder()
      .setName('automod-setup').setDescription('Configure auto-moderation for this server')
      .addStringOption(o => o.setName('banned_words').setDescription('Comma-separated list (replaces existing list)'))
      .addBooleanOption(o => o.setName('block_invites').setDescription('Auto-delete Discord invite links'))
      .addIntegerOption(o => o.setName('mass_mention_limit').setDescription('Max mentions per message (0 = off)'))
      .addIntegerOption(o => o.setName('spam_limit').setDescription('Max messages per 5s before action (0 = off)'))
      .addBooleanOption(o => o.setName('ai_moderation').setDescription('Auto-flag toxic messages using AI (requires bot owner to set an API key)'))
      .addStringOption(o => o.setName('ai_provider').setDescription('Which AI provider to use')
        .addChoices({ name: 'Groq', value: 'groq' }, { name: 'Gemini', value: 'gemini' }))
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
      const words = interaction.options.getString('banned_words');
      const blockInvites = interaction.options.getBoolean('block_invites');
      const mentionLimit = interaction.options.getInteger('mass_mention_limit');
      const spamLimit = interaction.options.getInteger('spam_limit');
      const aiModeration = interaction.options.getBoolean('ai_moderation');
      const aiProvider = interaction.options.getString('ai_provider');

      const { rows } = await pool.query('SELECT * FROM automod_settings WHERE guild_id=$1', [interaction.guild.id]);
      const current = rows[0] || { banned_words: [], block_invites: false, mass_mention_limit: 0, spam_limit: 0, ai_moderation: false, ai_provider: 'groq' };

      const bannedWords = words !== null ? words.split(',').map(w => w.trim().toLowerCase()).filter(Boolean) : current.banned_words;
      const invites = blockInvites !== null ? blockInvites : current.block_invites;
      const mentions = mentionLimit !== null ? mentionLimit : current.mass_mention_limit;
      const spam = spamLimit !== null ? spamLimit : current.spam_limit;
      const provider = aiProvider || current.ai_provider;
      let ai = aiModeration !== null ? aiModeration : current.ai_moderation;

      const missingKey = ai && !process.env.GROQ_API_KEY && !process.env.GEMINI_API_KEY;
      if (missingKey) ai = false;

      await pool.query(
        `INSERT INTO automod_settings (guild_id, banned_words, block_invites, mass_mention_limit, spam_limit, ai_moderation, ai_provider)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (guild_id) DO UPDATE SET banned_words=excluded.banned_words, block_invites=excluded.block_invites,
           mass_mention_limit=excluded.mass_mention_limit, spam_limit=excluded.spam_limit,
           ai_moderation=excluded.ai_moderation, ai_provider=excluded.ai_provider`,
        [interaction.guild.id, bannedWords, invites, mentions, spam, ai, provider]);

      const embed = new EmbedBuilder().setColor('Red').setTitle('Automod updated')
        .addFields(
          { name: 'Banned words', value: bannedWords.length ? bannedWords.join(', ') : 'None', inline: false },
          { name: 'Block invites', value: String(invites), inline: true },
          { name: 'Mass mention limit', value: String(mentions), inline: true },
          { name: 'Spam limit (per 5s)', value: String(spam), inline: true },
          { name: 'AI moderation', value: ai ? `On (${provider})` : 'Off', inline: true }
        );
      if (missingKey) {
        embed.setDescription('⚠️ AI moderation needs `GROQ_API_KEY` or `GEMINI_API_KEY` set in Render\'s environment first — left off for now.');
      }
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
];
