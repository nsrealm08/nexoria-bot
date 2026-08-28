const { ApplicationCommandOptionType } = require('discord.js');

function tokenize(str) {
  const regex = /"([^"]*)"|(\S+)/g;
  const tokens = [];
  let match;
  while ((match = regex.exec(str)) !== null) {
    tokens.push(match[1] !== undefined ? match[1] : match[2]);
  }
  return tokens;
}

async function resolveOption(token, type, message) {
  switch (type) {
    case ApplicationCommandOptionType.User: {
      const id = token.replace(/[<@!>]/g, '');
      return message.client.users.fetch(id).catch(() => null);
    }
    case ApplicationCommandOptionType.Role: {
      const id = token.replace(/[<@&>]/g, '');
      return message.guild.roles.cache.get(id) || null;
    }
    case ApplicationCommandOptionType.Channel: {
      const id = token.replace(/[<#>]/g, '');
      return message.guild.channels.cache.get(id) || null;
    }
    case ApplicationCommandOptionType.Integer:
      return Number.isNaN(parseInt(token, 10)) ? null : parseInt(token, 10);
    case ApplicationCommandOptionType.Number:
      return Number.isNaN(parseFloat(token)) ? null : parseFloat(token);
    case ApplicationCommandOptionType.Boolean:
      return /^(true|yes|on|1)$/i.test(token);
    case ApplicationCommandOptionType.String:
    default:
      return token;
  }
}

module.exports = { tokenize, resolveOption };
