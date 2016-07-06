var
  _ = require('lodash'),
  CaptainsLog = require('captains-log'),
  logger = CaptainsLog(),
  uuid = require('node-uuid'),
  fs = require('fs'),
  Kuzzle = require('kuzzle-sdk'),
  Configuration = require('../config.js'),
  Players = {},
  Rooms = {},
  kuzzle;

startServer();

function startServer() {
  kuzzle = new Kuzzle(Configuration.server.kuzzleUrl, function (err, res) {
    if (err) {
      logger.error('Cannot connect to Kuzzle instance: ', err);
      return false;
    }

    logger.info('Listening to client requests...');

    // Listening to connected/disconnected players
    kuzzle
      .dataCollectionFactory(Configuration.server.room, Configuration.server.kuzzleIndex)
      .subscribe({}, {subscribeToSelf: false, users: 'all'}, (error, data) => {
        var
        roomId,
        players = [];

        if (data.action === 'on') {
          logger.info('New player: ', data.metadata.username, ' - ', data.metadata.id);
          roomId = addPlayer(data.metadata);

          Object.keys(Rooms[roomId].players).forEach(p => players.push(Rooms[roomId].players[p]));
          kuzzle
            .dataCollectionFactory(Configuration.server.room, Configuration.server.kuzzleIndex)
            .publishMessage({id: data.metadata.id, room: Rooms[roomId], players: players });
        } else if (data.action === 'off') {
          logger.info('Player left: ', data.metadata.username, ' - ' , data.metadata.id);
          removePlayer(data.metadata.id);
        }
      });
  });
}

function addPlayer(playerData) {
  var room;

  if (Players[playerData.id]) {
    removePlayer(playerData.id);
  }

  room = _.find(Rooms, function (item) {
    return (Object.keys(item.players).length < Configuration.server.maxPlayersPerRoom);
  });

  // No spots found in existing room. Creating a new one...
  if (!room) {
    room = createRoom();
  }

  Players[playerData.id] = room.id;
  room.players[playerData.id] = playerData;
  room.players[playerData.id].hp = Configuration.player.hp;
  room.players[playerData.id].state = 'playing';

  return room.id;
}

function removePlayer(playerId) {
  var roomId;

  if (!Players[playerId]) {
    return false;
  }

  if (Players[playerId]) {
    roomId = Players[playerId];
    kuzzle
      .dataCollectionFactory(roomId, Configuration.server.kuzzleIndex)
      .publishMessage({event: Configuration.events.PLAYER_LEFT, id: playerId});
    delete Rooms[roomId].players[playerId];
  }

  delete Players[playerId];
}

function createRoom () {
  var room = {
    id: uuid.v4(),
    state: 'created',
    players: []
  },
  roomId = room.id,
  subscribedRoom,
  kuzzleRoom = kuzzle.dataCollectionFactory(roomId, Configuration.server.kuzzleIndex);

  logger.info('Creating new room: ', roomId);
  Rooms[roomId] = room;

  subscribedRoom = kuzzleRoom.subscribe({}, {users: 'none'}, function (error, data) {
    var alivePlayer = [];

    switch (data.result._source.event) {
      case Configuration.events.PLAYER_JOINED:
        logger.info('Player ' + data.result._source.player.username + ' joined the game');
        if (Object.keys(room.players).length >= Configuration.server.minPlayersPerRoom && room.state !== 'game_launched') {
          // We got enough connected players to start a new game on that room
          startNewGame(roomId);
        }
        break;
      case Configuration.events.PLAYER_LEFT:
        if (room.state === 'game_launched') {
          if (Object.keys(room.players).length < Configuration.server.minPlayersPerRoom) {
            kuzzleRoom
              .publishMessage({event: Configuration.events.NOT_ENOUGH_PLAYERS});

            subscribedRoom.unsubscribe();

            Object.keys(room.players).forEach(function (id) {
              delete Players[id];
            });

            logger.info('Not enough players remaining on room ', room.id, '. Destroying it.');
            delete Rooms[roomId];
          }
          else {
            checkWinner(roomId);
          }
        }
        break;
      case Configuration.events.PLAYER_DIE:
        logger.info('Player ' + data.result._source.player.username + ' died');
        room.players[data.result._source.player.id].state = 'died';
        checkWinner(roomId);
        break;
    }
  });

  return room;
}

function startNewGame (roomId) {
  var
    modes = [
      {id: 'FFA', label: 'Free for all!'}
    ],
    levels = [
      {id: 'CITY', label: 'City'},
      {id: 'KUZZLE', label: 'Kuzzle'},
      {id: 'GLITCH', label: 'Glitch world'}
    ],
    room = Rooms[roomId],
    nextTeam = 'blue';

  /*
   The room has been destroyed between the moment we launched a delayed
   new game, and the moment the game really starts
  */
  if (!room) {
    return false;
  }

  if (room.players.length > 2 && (room.players.length % 2) === 0) {
      modes.push({id: 'TM', label: 'Team Deathmatch!'});
  }

  room.rules = {
    mode: modes[Math.floor(Math.random() * modes.length)],
    level: levels[Math.floor(Math.random() * levels.length)],
    teams: {
      blue: [],
      red: []
    }
  };

  room.state = 'game_launched';

  _.forEach(_.shuffle(Object.keys(room.players)), function (player) {
    room.players[player].state = 'playing';

    if (room.rules.mode.id === 'TM') {
      room.rules.teams[nextTeam].push(player);
      nextTeam = (nextTeam === 'blue' ? 'red' : 'blue');
    }
  });

  setTimeout(function () {
    logger.info('Room', room.id, ': launching new game');
    kuzzle
      .dataCollectionFactory(room.id, Configuration.server.kuzzleIndex)
      .publishMessage({event: Configuration.events.GAME_START, rules: room.rules});
  }, 5000);
}

function checkWinner(roomId) {
  var
    room = Rooms[roomId],
    kuzzleRoom = kuzzle.dataCollectionFactory(roomId, Configuration.server.kuzzleIndex),
    teams = {blue: 0, red: 0},
    alivePlayers = [];

  // If only 1 player remains, declare a winner
  Object.keys(room.players).forEach(function (id) {
    if (room.players[id].state === 'playing') {
      alivePlayers.push(id);
    }
  });

  if (Rooms[roomId].rules.mode.id === 'FFA') {
    if (alivePlayers.length === 1) {
      logger.info('Room', roomId, ': player', Rooms[roomId].players[alivePlayers].username, 'wins');
      kuzzleRoom.publishMessage({event: Configuration.events.GAME_END, winner: alivePlayers[0]});
      setTimeout(function () {
        startNewGame(roomId);
      }, 5000);
    }
  }
  else if (Rooms[roomId].rules.mode.id === 'TM') {
    alivePlayers.forEach(function (pid) {
      if (_.indexOf(Rooms[roomId].rules.blue, pid) !== -1) {
        teams.blue++;
      }
      else {
        teams.red++;
      }
    });

    if (teams.blue === 0 || teams.red === 0) {
      logger.info('Room', roomId, ': team', (teams.blue !== 0 ? 'blue' : 'red'), 'wins');
      kuzzleRoom.publishMessage({event: Configuration.events.GAME_END, winner: (teams.blue !== 0 ? 'blue' : 'red')})
      setTimeout(function () {
        startNewGame(roomId);
      }, 5000);
    }
  }
}
