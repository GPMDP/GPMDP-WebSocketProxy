const mkdirp = require('mkdirp');
const path = require('path');
const winston = require('winston');
const { Server } = require('ws');

const handlePlayer = require('./playerProxy');
const handleRemote = require('./remoteProxy');

mkdirp.sync('./logs');

global.logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)(),
    new (winston.transports.File)({ filename: 'logs/gpmdp_connect.log' })
  ]
});
logger.info('Initializing WebSocket Proxy Server');

const EMAIL_DB = {
  allowed: () => true,
};

const clients = {

}

const server = new Server({ port: 9090 });
let id_counter = 0;

server.on('connection', (client) => {
  client.id = id_counter++;
  logger.info(`Connected to client(${client.id})`);
  client.json = (o) => {
    client.send(JSON.stringify(o));
  }
  client.message = (type, o) => client.json(Object.assign({ type }, o));
  client.disconnect = (reason) => {
    logger.info(`Disconnecting from client(${client.id}): ${reason}`)
    client.message('disconnect', { reason });
    client.close();
  };
  const killTimer = setTimeout(() => {
    logger.info('Killing connection with client: NO_EMAIL_PROVIDED')
    client.disconnect('NO_EMAIL_PROVIDED');
  }, 3000);
  client.on('message', (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch (err) {
      logger.error('Recieved bad message that could not be parsed', msg);
      return;
    }
    if (client.clientType === 'players') return;
    switch (data.type) {
      case 'connect': {
        if (client._allowed) return;
        if (EMAIL_DB.allowed(data.email)) {
          clearTimeout(killTimer);
        } else {
          client.disconnect('INVALID_EMAIL_ADDRESS');
          return;
        }
        clients[data.email] = clients[data.email] || { players: [], remotes: [] };
        let clientType = 'remotes';
        let notifier;
        if (data.clientType === 'player') {
          clientType = 'players';
          notifier = handlePlayer(client, clients[data.email]);
        } else {
          notifier = handleRemote(client, clients[data.email]);
        }
        clients[data.email][clientType].push(client);
        notifier();
        client.on('close', () => {
          clients[data.email][clientType] = clients[data.email][clientType].filter(c => c.id !== client.id);
          notifier();
        });
        client._allowed = true;
        client.clientType = clientType;
        logger.info(`Authenticated ${data.clientType}:client(${client.id}) for email: ${data.email}`);
        return;
      }
    }
    client.emit('json', data);
  });
})
