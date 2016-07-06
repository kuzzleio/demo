 KuzzleGame.KuzzleManager = {

  kuzzle: false,
  isHost: false,
  hostID: false,
  peering: false,
  registeredOnMainRoom: false,
  uniquid: false,
  connexionEstablished: false,
  connexionLastCheck: 0,
  connexionInterval: false,
  debug: false,
  server: config.kuzzleUrl,
  kuzzleGame: false,
  mainRoom: config.mainRoom,
  mainIndex: 'arrowhero',


  initServer: function(cb) {
    if (!this.kuzzle) { // if it has not be done yet...
      this.kuzzle = new Kuzzle(this.server, {defaultIndex: this.mainIndex}, cb);
    }
  },

  init: function(kuzzleGame) {

    this.initServer((err, res) => {
      if (err) {
        console.error('Cannot connect to Kuzzle instance: ', err);
        return false;
      }

      if (!this.uniquid) { // generate a unique ID for the player if it has not been done yet
        this.uniquid = this.generateUid();
      }

      this.kuzzleGame = kuzzleGame;
      this.findHost(); // go to find host
    });

  },

  /**
   * Find host,
   * if a host cannot be found , the current client became host.
   */
  findHost: function() {

    var filters = {
      "filter": {
        "term": {
          "hostDifficulty": KuzzleGame.Difficulty.currentDifficulty
        }
      }
    };

    KuzzleGame.KuzzleManager.kuzzle.dataCollectionFactory(this.mainRoom).advancedSearch(filters, (error, response) => {
      if (error) {
        console.error(error);
      }

      if (error || response.total == 0) {
        KuzzleGame.KuzzleManager.log('no host found');
        KuzzleGame.KuzzleManager.registerAsHost();

      } else {
        KuzzleGame.KuzzleManager.log('host found');
        KuzzleGame.KuzzleManager.hostID = response.documents[0].content.hostID;
        KuzzleGame.KuzzleManager.log(response.documents[0]);
        KuzzleGame.KuzzleManager.subscribeToHost();
        KuzzleGame.KuzzleManager.checkConnexion();
      }
    });
  },

  /**
   * register the current client as host in main room , and create a subchannel
   */
  registerAsHost: function(createSubchannel) {

    if (typeof(createSubchannel) === 'undefined') createSubchannel = true;

    KuzzleGame.KuzzleManager.log('registering as host');

    this.kuzzle.dataCollectionFactory("kg_main_room").createDocument({
      hostID: this.uniquid,
      hostDifficulty: KuzzleGame.Difficulty.currentDifficulty
    }, function(error, response) {
      if (error) {
        console.error(error);
      } else {

        KuzzleGame.KuzzleManager.hostID = KuzzleGame.KuzzleManager.uniquid;
        KuzzleGame.KuzzleManager.isHost = true;
        KuzzleGame.KuzzleManager.registeredOnMainRoom = true;

        KuzzleGame.KuzzleManager.log('host registered as ' + KuzzleGame.KuzzleManager.hostID);

        if (createSubchannel) {

          KuzzleGame.KuzzleManager.log('creating subchannel');

          KuzzleGame.KuzzleManager.createHostSubChannel();

          $(window).on('beforeunload', function() {
            KuzzleGame.KuzzleManager.hostUnregister();
          });
        }
      }
    });
  },

  /**
   * Unregister host from main room , and delete his subchannel
   */
  hostUnregister: function(callbackFunc) {
    this.deleteHostSubChannel();
    this.hostUnregisterFromMainRoom(callbackFunc);
  },


  hostUnregisterFromMainRoom: function(callbackFunc, clearHostId) {

    var filters = {
      "filter": {
        "term": {
          "hostID": this.hostID
        }
      }
    };

    if (typeof(clearHostId) === 'undefined') clearHostId = true;


    this.kuzzle.dataCollectionFactory(this.mainRoom).deleteDocument(filters, (error, response) => {

      if (error) {
        console.error(error);
      }

      KuzzleGame.KuzzleManager.log("unloadind host");
      KuzzleGame.KuzzleManager.log(response);

      KuzzleGame.KuzzleManager.registeredOnMainRoom = false;

      if (callbackFunc != 'undefined' && callbackFunc != null) {
        if (this.debug) {
          console.log(callbackFunc);
        }
        callbackFunc();
      }

      if (clearHostId) {
        KuzzleGame.KuzzleManager.hostID = false;
      }

    });

  },

  /**
   * Create the host subchannel
   */
  createHostSubChannel: function() {
    if (this.hostID) {
      this.kuzzle.dataCollectionFactory("kg_room_" + this.hostID).createDocument({
        hostID: this.hostID
      }, (error, response) => {
        if (error) {
          console.error(error);
        } else {
          KuzzleGame.KuzzleManager.subscribeToHost();
        }
      });
    }
  },

  /**
   * Delete host subchannel
   */
  deleteHostSubChannel: function() {
    KuzzleGame.KuzzleManager.log('Deleting host Subchannel');


    var filters = {
      "filter": {
        "term": {
          "hostID": this.hostID
        }
      }
    };

    this.kuzzle.dataCollectionFactory("kg_room_" + this.hostID).deleteDocument(filters, (error, response) => {
      if (error) {
        console.error(error);
      }
      KuzzleGame.KuzzleManager.log(response);

    });
  },

  /**
   * Subscribe to the host subChannel room
   */
  subscribeToHost: function() {
    var filters = {
      not: {
        term: {
          event_owner: this.uniquid
        }
      },
      term: {
        event: " kg_event"
      }
    };

    this.kuzzle.dataCollectionFactory("kg_room_" + this.hostID).subscribe(filters, this.fireEvent);

  },

  /**
   * Catching event
   * @param response
   */
  fireEvent: function(error, response) {

    var eventExploded = response.result._source.event_type.split('_');

    for (var i = 0; i < eventExploded.length; i++) {
      eventExploded[i] = eventExploded[i].toLowerCase();
      eventExploded[i] = eventExploded[i].charAt(0).toUpperCase() + eventExploded[i].slice(1);
    }

    var eventFunctionName = 'event' + eventExploded.join('');
    KuzzleGame.KuzzleManager.log('Event Fired : ' + response.result._source.event_type + ' , calling ' + eventFunctionName);

    if ((KuzzleGame.KuzzleManager.isHost && KuzzleGame.KuzzleManager.peering === false) || (!KuzzleGame.KuzzleManager.isHost && KuzzleGame.KuzzleManager.peering === false && KuzzleGame.KuzzleManager.hostID == response.result._source.event_owner)) {
      KuzzleGame.KuzzleManager.peering = response.result._source.event_owner;
    }

    if (KuzzleGame.KuzzleManager.peering == response.result._source.event_owner) {

      window["KuzzleGame"]["KuzzleManager"][eventFunctionName](response.result._source.event_value);
    }

  },


  /**
   * throw event on the host subchannel room
   * @param eventType
   * @param value
   */
  throwEvent: function(eventType, value) {
    this.kuzzle.dataCollectionFactory("kg_room_" + this.hostID).createDocument({
      event: "kg_event",
      event_type: eventType,
      event_value: value,
      event_owner: KuzzleGame.KuzzleManager.uniquid
    }, (error, response) => {
      if (error) {
        console.error(error);
      }
    });
  },


  /**
   * generate unique id for current client
   * @param separator
   * @returns {*}
   */
  generateUid: function(separator) {

    var delim = separator || '';

    function S4() {
      return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    }

    return (S4() + S4() + delim + S4() + delim + S4() + delim + S4() + delim + S4() + S4() + S4());
  },

  /**
   * Log data into console if debug is activated
   * @param sentence
   */
  log: function(data) {

    if (this.debug && data != 'undefined') {
      console.log("[KUZZLE]", data);
    }
  },


  /**
   * Check if connexion is established with host.
   */
  checkConnexion: function() {
    this.synchronize();

    if (!this.connexionInterval) {

      this.connexionInterval = setInterval(function() {

        KuzzleGame.KuzzleManager.synchronize();

        if (KuzzleGame.KuzzleManager.hostID) {

          var currentTime = KuzzleGame.KuzzleManager.time();

          if (currentTime - KuzzleGame.KuzzleManager.connexionLastCheck > 5) {

            KuzzleGame.KuzzleManager.connexionLost();

          } else {

            if (!KuzzleGame.KuzzleManager.connexionEstablished) {

              KuzzleGame.KuzzleManager.connexionSuccess();

            }

          }

        }

      }, 1000);


    }

  },

  synchronize: function() {
    this.throwEvent('CONNEXION_STATUS', 'SYN');
  },

  acknowledge: function() {
    this.throwEvent('CONNEXION_STATUS', 'ACK');
  },

  time: function() {
    return Math.floor(Date.now() / 1000)
  },

  connexionLost: function() {

    KuzzleGame.KuzzleManager.peering = false;
    KuzzleGame.KuzzleManager.connexionEstablished = false;
    KuzzleGame.KuzzleManager.log('Connexion LOST');

    clearInterval(KuzzleGame.KuzzleManager.connexionInterval);

    KuzzleGame.KuzzleManager.connexionInterval = false;

    KuzzleGame.KuzzleManager.hostUnregister(function() {
      KuzzleGame.KuzzleManager.kuzzleGame.stop()
    });


  },


  connexionSuccess: function() {
    KuzzleGame.KuzzleManager.connexionEstablished = true;
    KuzzleGame.KuzzleManager.log('connexion ESTABLISHED');
    KuzzleGame.KuzzleManager.hostUnregisterFromMainRoom(null, false);

    if (this.isHost) {
      this.throwEvent('LOAD_MUSIC', KuzzleGame.MusicManager.currentMusic.identifier);
    }
  },

  eventConnexionStatus: function(value) {
    this.connexionLastCheck = this.time();

    if (value == 'SYN') {

      KuzzleGame.KuzzleManager.log('SYN');
      KuzzleGame.KuzzleManager.acknowledge();

      if (KuzzleGame.KuzzleManager.isHost && KuzzleGame.KuzzleManager.connexionEstablished == false) {
        KuzzleGame.KuzzleManager.checkConnexion();
      }

    }

    if (value == 'ACK') {
      KuzzleGame.KuzzleManager.log('ACK');
    }
  },

  /**
   * To delete after dev
   * @param ID
   */
  utilsDelete: function(ID) {
    this.kuzzle.delete("kg_main_room", ID, function(error, response) {
      console.log('OK');
    });
  },

  eventLevelGeneration: function(arrows) {
    KuzzleGame.Level.arrowsMatrix = arrows;
    KuzzleGame.Arrow.generateArrows();

    this.throwEvent('START_COUNT_DOWN', true);
    this.kuzzleGame.startGameCountDown();
  },

  eventSendSpell: function(spellType) {
    KuzzleGame.Spell.receiveSpell(spellType);
  },

  eventOpponentScore: function(score) {
    KuzzleGame.Player.opponentScore = score;
    KuzzleGame.Text.displayOpponentScore();
  },

  eventLoadMusic: function(identifier) {
    KuzzleGame.MusicManager.loadMusicByIdentifier(identifier, this.kuzzleGame.game);
  },

  eventMusicLoaded: function(value) {
    //generate arrows
    this.kuzzleGame.generateLevel();
  },

  eventStartCountDown: function(value) {
    this.kuzzleGame.startGameCountDown();
  },

  eventPause: function(value) {
    this.kuzzleGame.togglePause();
  }
};
