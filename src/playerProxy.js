module.exports = (client, peers) => {
  client.on('message', (data) => {
    peers.remotes.forEach(peer => {
      if (peer._target !== client.id) return;
      peer.send(data);
    });
  });

  return () => {
    peers.remotes.forEach(peer => peer.json({ type: 'player_list', players: peers.players.map(player => ({ id: player.id, name: player.name })) }))
  }
}
