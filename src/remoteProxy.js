module.exports = (client, peers) => {
  client.on('json', (data) => {
    if (typeof data.target === 'undefined') return;
    if (data.initialConnect) {
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
    const targetPlayer = peers.players.find(c => c.id === data.target);
    if (!targetPlayer) return;
    targetPlayer.json(data.payload);
  });

  return () => {
    peers.remotes.forEach(peer => peer.json({ type: 'player_list', players: peers.players.map(player => ({ id: player.id, name: player.name })) }))
  }
}
