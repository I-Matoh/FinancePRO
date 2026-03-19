const { createClient } = require('redis');

let client;
let connecting;

async function getRedis() {
  if (client) return client;
  if (connecting) return connecting;
  client = createClient({ url: process.env.REDIS_URL });
  client.on('error', (err) => {
    console.error('Redis error', err);
  });
  connecting = client
    .connect()
    .then(() => client)
    .catch((err) => {
      client = null;
      connecting = null;
      throw err;
    });
  return connecting;
}

module.exports = { getRedis };
 
