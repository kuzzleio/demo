var Configuration = {
  gameOptions: {
    music: false,
    fullscreen: false
  },

  server: {
    room: 'tournament-server-room',
    minPlayersPerRoom: 2,
    maxPlayersPerRoom: 8,
    kuzzleUrl: 'localhost',
    kuzzleIndex: 'tournament'
  },

  player: {
    hp: 80
  },

  events: {
    PLAYER_JOINED: 1,
    PLAYER_LEFT: 2,
    NOT_ENOUGH_PLAYERS: 3,
    GAME_START: 4,
    GAME_END: 5,
    PLAYER_UPDATE: 6,
    PLAYER_DIE: 7
  }
};

if (typeof module === 'object' && module.exports) {
  module.exports = Configuration;
} else {
  // running in the browser
  Configuration.server.kuzzleUrl = window.location.hostname;
}
