module.exports = (client, peers) => {
  client.on('json', (data) => {
    if (data.initialConnect && typeof data.target !== 'undefined') {
      if (client._target) return;
      client._target = data.target;
      logger.info(`Linking remote:client(${client.id}) to player:client(${client._target})`);
      peers.players.forEach(peer => {
        if (peer.id === data.target) {
          peer.json({ namespace: 'inital_burst', method: 'inital_burst' });
        }
      });
      return;
    }
    if (typeof client._target === 'undefined') {
      logger.error(`Failed to proxy message from remote:client(${client.id}) to an unknown target`);
      return;
    }
    const targetPlayer = peers.players.find(c => c.id === client._target);
    if (!targetPlayer) {
      logger.error(`Failed to find player with id: ${client._target}`)
      return;
    }
    targetPlayer.json(data);
  });

  return () => {
    peers.remotes.forEach(peer => peer.json({ type: 'player_list', players: peers.players.map(player => ({ id: player.id, name: player.name })) }))
  }
}
