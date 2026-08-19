// Not needed until Nexoria is in ~2000+ servers. Discord requires sharding
// past 2500 guilds. To switch: `npm run start:sharded` instead of `npm start`.
// Render: change the Start Command to `node shard.js`.
require('dotenv').config();
const { ShardingManager } = require('discord.js');

const manager = new ShardingManager('./index.js', {
  token: process.env.DISCORD_TOKEN,
  totalShards: 'auto'
});

manager.on('shardCreate', (shard) => console.log(`🔧 Launched shard ${shard.id}`));
manager.spawn();
