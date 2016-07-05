function ConnectingState () {}
ConnectingState.prototype = {
  create: function () {
    name = null;
    self = this;

    if(this.game.hasMusic) {
      musicConnecting = this.game.add.audio('music-connecting');
      musicConnecting.play();
    }

    fragmentSrc = [
      "precision mediump float;",
      "uniform float     time;",
      "uniform vec2      resolution;",
      "uniform vec2      mouse;",

      "const float Tau        = 6.2832;",
      "const float speed  = .2;",
      "const float density    = .02;",
      "const float shape  = .03;",

      "float random( vec2 seed ) {",
      "return fract(sin(seed.x+seed.y*1e3)*1e5);",
      "}",

      "float Cell(vec2 coord) {",
      "vec2 cell = fract(coord) * vec2(.5,2.) - vec2(.0,.5);",
      "return (1.-length(cell*2.-1.))*step(random(floor(coord)),density)*2.;",
      "}",

      "void main( void ) {",

      "vec2 p = gl_FragCoord.xy / resolution  - vec2(.5,.0);",

      "float a = fract(atan(p.x, p.y) / Tau);",
      "float d = length(p);",

      "vec2 coord = vec2(pow(d, shape), a)*256.;",
      "vec2 delta = vec2(-time*speed*256., .5);",
      "//vec2 delta = vec2(-time*speed*256., cos(length(p)*10.)*2e0+time*5e-1); // wavy wavy",

      "float c = 0.1;",
      "for(int i=0; i<3; i++) {",
      "coord += delta;",
      "c = max(c, Cell(coord));",
      "}",

      "gl_FragColor = vec4(c*d);",
      "}"
    ];
    filter = new Phaser.Filter(this.game, null, fragmentSrc);
    filter.setResolution(640, 360);
    sprite = this.game.add.sprite();
    sprite.width = 640;
    sprite.height = 360;
    sprite.tint = 0x00FFFF;
    var blurX = this.game.add.filter('BlurX');
    var blurY = this.game.add.filter('BlurY');
    sprite.filters = [filter/*, blurX, blurY*/];

    kuzzleLogo = this.game.add.sprite(320, 180, 'kuzzleTitle');
    kuzzleLogo.anchor.setTo(0.5, 1.25);
    this.game.add.tween(kuzzleLogo.scale).to({x: 6.0, y: 6.0}, 200, Phaser.Easing.Exponential.Out).start();
    kuzzleLogo.filters = [blurX, blurY];

    menuItemConnecting = [
      {
        id: 'OK',
        selected: true,
        spriteIdentifier: 'go',
        action: this.selectName
      },
      {
        id: 'BACK',
        selected: false,
        spriteIdentifier: 'options-menu-back',
        action: this.selectBack
      }
    ];

    menuItemConnecting[0]['sprite'] = this.game.add.sprite(320, 180, 'go-selected');
    menuItemConnecting[0]['sprite'].anchor.setTo(0.5, -0.5);
    this.game.add.tween(menuItemConnecting[0]['sprite']).from({x: 1200}, 1200, Phaser.Easing.Quintic.Out).start();

    menuItemConnecting[1]['sprite'] = this.game.add.sprite(320, 180, 'options-menu-back-unselected');
    menuItemConnecting[1]['sprite'].anchor.setTo(0.5, -2.5);
    this.game.add.tween(menuItemConnecting[1]['sprite']).from({x: 1200}, 1200, Phaser.Easing.Quintic.Out).delay(200).start();

    kuzzleGame = this.game;
    kuzzleGame.name = "";
    kuzzleGame.started = false;

    this.keyDown = this.game.input.keyboard.addKey(Phaser.Keyboard.DOWN);
    this.keyDown.onDown.add(this.updateMenu, this);
    this.keyUp = this.game.input.keyboard.addKey(Phaser.Keyboard.UP);
    this.keyUp.onDown.add(this.updateMenu, this);

    this.enterKey = this.game.input.keyboard.addKey(Phaser.Keyboard.ENTER);
    this.enterKey.onDown.add(function () {
      this.getSelectedMenu().action()
    }, this);

    this.enterName();

    menuItemConnecting[0]['sprite'].inputEnabled = true;
    menuItemConnecting[0]['sprite'].events.onInputDown.add(this.selectName, this);
    menuItemConnecting[1]['sprite'].inputEnabled = true;
    menuItemConnecting[1]['sprite'].events.onInputDown.add(this.selectBack, this);
  },

  connectToKuzzle: function () {
    kuzzle = new Kuzzle(this.game.kuzzleUrl, {autoReconnect: false});

    kuzzle.addListener('disconnected', function () {
      game.stateTransition.to('main-menu');
    });

    connectText = this.game.add.text(320, 180, "Connecting to server...\n");
    connectText.font = 'Arial';
    connectText.fontWeight = 'bold';
    connectText.fontSize = 36;
    connectText.align = 'center';
    var grd = connectText.context.createLinearGradient(0, 0, 0, connectText.height);
    grd.addColorStop(0, '#8ED6FF');
    grd.addColorStop(1, '#004CB3');
    connectText.fill = grd;
    connectText.anchor.set(0.5, 1.0);
    connectText.alpha = 0.0;
    connectTextTweenOut = this.game.add.tween(connectText).to({alpha: 0.0}, 500).delay(1000);

    connectTextTweenOut.onComplete.addOnce(this.goToLobby, this);

    var connectTextTweenIn = this.game.add.tween(connectText).to({alpha: 1.0}, 500, Phaser.Easing.Exponential.Out).start();
    connectTextTweenIn.onComplete.addOnce(this.roomRequest, this);
  },

  goToLobby: function () {
    if (this.game.hasMusic) {
      musicConnecting.stop();
    }

    this.game.stateTransition.to('lobby', true, false, {player: game.player});
  },

  subscribeAndGo: function () {
    var gameStarted = false;

    connectText.setText("Connecting to server...\nOK!");

    kuzzle
      .dataCollectionFactory(Room.id, Configuration.server.kuzzleIndex)
      .subscribe({}, {users: 'none', subscribeToSelf: false}, function (error, data) {
        switch (data.result._source.event) {
          case Configuration.events.PLAYER_JOINED:
            if (data.result._source.player.id !== game.player.id) {
              Players[data.result._source.player.id] = data.result._source.player;
              Players[data.result._source.player.id].updated = false;
              Players[data.result._source.player.id].hp = Configuration.player.hp;

              if (gameStarted) {
                text = game.add.text(game.camera.width / 2, 32, "A new challenger appears: " + data.result._source.player.username);
                text.fixedToCamera = true;
                text.font = 'Arial';
                text.fontWeight = 'bold';
                text.fontSize = 24;
                text.align = 'center';
                var grd = text.context.createLinearGradient(0, 0, 0, text.height);
                grd.addColorStop(0, '#8ED6FF');
                grd.addColorStop(1, '#004CB3');
                text.fill = grd;
                text.anchor.set(0.5);
                text.alpha = 0.0;
                var textTweenOut = game.add.tween(text).to({alpha: 0.0}, 1000).delay(3000);
                game.add.tween(text).to({alpha: 1.0}, 1000, Phaser.Easing.Exponential.Out).start().chain(textTweenOut);

                if (typeof self.drawLobby === 'function') {
                  self.drawLobby();
                }
              }
              else if (typeof self.drawLobby === 'function') {
                self.drawLobby();
              }
            }
            break;

          case Configuration.events.PLAYER_LEFT:
            text = game.add.text(game.camera.width / 2, 32, "Player " + Players[data.result._source.id].username + " left the game");
            text.fixedToCamera = true;
            text.font = 'Arial';
            text.fontWeight = 'bold';
            text.fontSize = 24;
            text.align = 'center';
            var grd = text.context.createLinearGradient(0, 0, 0, text.height);
            grd.addColorStop(0, '#8ED6FF');
            grd.addColorStop(1, '#004CB3');
            text.fill = grd;
            text.anchor.set(0.5);
            text.alpha = 0.0;
            var textTweenOut = game.add.tween(text).to({alpha: 0.0}, 1000).delay(3000);
            game.add.tween(text).to({alpha: 1.0}, 1000, Phaser.Easing.Exponential.Out).start().chain(textTweenOut);

            if (Players[data.result._source.id]) {
              if (Players[data.result._source.id].sprite) {
                Players[data.result._source.id].sprite.body.enable = false;
                Players[data.result._source.id].sprite.kill();
                Players[data.result._source.id].sprite.destroy();
              }

              if (Players[data.result._source.id].shadow) {
                Players[data.result._source.id].shadow.kill();
                Players[data.result._source.id].shadow.destroy();
              }

              if (Players[data.result._source.id].hpMeter) {
                Players[data.result._source.id].hpMeter.kill();
                Players[data.result._source.id].hpMeter.destroy();
              }

              if (Players[data.result._source.id].tag) {
                Players[data.result._source.id].tag.kill();
                Players[data.result._source.id].tag.destroy();
              }

              delete Players[data.result._source.id];

              if (!gameStarted) {
                self.drawLobby(true);
              }
            }
            break;

          case Configuration.events.NOT_ENOUGH_PLAYERS:
            kuzzle.logout();
            game.stateTransition.to('not-enough-players');
            break;

          case Configuration.events.GAME_START:
            Room.rules = data.result._source.rules;
            Room.winner = undefined;

            if (typeof game.state.states.lobby.startGame === 'function') {
              game.state.states.lobby.startGame(gameStarted);
              gameStarted = true;
            }
            break;
          case Configuration.events.GAME_END:
            Room.winner = data.result._source.winner;
            self.prepareToGameEnd();
            break;

          case Configuration.events.PLAYER_UPDATE:
            if (data.result._source.id !== game.player.id && typeof self.updatePlayer === 'function') {
              self.updatePlayer(data.result._source);
            }
            break;

          case Configuration.events.PLAYER_DIE:
            if (data.result._source.player.id !== game.player.id && typeof self.playerDies === 'function') {
              self.playerDies(Players[data.result._source.player.id], false);
            }
        }
      });
    self.subscribed = true;
    connectTextTweenOut.start();
console.log('SENDING TO ', Room.id, ': ', {event: Configuration.events.PLAYER_JOINED, player: game.player});
    kuzzle
      .dataCollectionFactory(Room.id, Configuration.server.kuzzleIndex)
      .publishMessage({event: Configuration.events.PLAYER_JOINED, player: game.player});

    if (Room.state === 'game_launched') {
      var interval = setInterval(function () {
        if (game.state.states.lobby.startGame) {
          game.state.states.lobby.startGame(false);
          clearInterval(interval);
        }
      }, 1000);
      gameStarted = true;
    }
  },

  roomRequest: function() {
    var
      randColor = Phaser.Color.getRandomColor(30, 220),
      looks = ["pierre", "gilles"],
      myId = uuid.v4(),
      look = looks[Math.floor(Math.random() * looks.length)];

    game.player = {
      id: myId,
      username: kuzzleGame.name,
      color: randColor,
      look: look
    };

    kuzzle
      .dataCollectionFactory(Configuration.server.room, Configuration.server.kuzzleIndex)
      .subscribe({}, {metadata: game.player, subscribeToSelf: false}, function (error, data) {
        if (data.result._source.id === myId) {
          Room = data.result._source.room;

          Players = {};

          data.result._source.players.forEach(function (p) {
            Players[p.id] = p;

            if (p.id === game.player.id) {
              game.player = p;
            }
          });

          if (!self.subscribed) {
            self.subscribeAndGo();
          }
        }
      });
  },

  enterName: function() {
    var
      namePrompt = "Enter your name:\n",
      nameText = this.game.add.text(320, 180, namePrompt),
      grd = nameText.context.createLinearGradient(0, 0, 0, nameText.height);

    grd.addColorStop(0, '#8ED6FF');
    grd.addColorStop(1, '#004CB3');

    nameText.font = 'Arial';
    nameText.fontWeight = 'bold';
    nameText.fontSize = 36;
    nameText.align = 'center';
    nameText.fill = grd;
    nameText.anchor.set(0.5, 1.0);
    nameText.alpha = 0.0;

    nameTextTweenOut = kuzzleGame.add.tween(nameText).to({alpha: 0.0}, 1000);
    kuzzleGame.add.tween(nameText).to({alpha: 1.0}, 1000, Phaser.Easing.Exponential.Out).start();

    this.keyBackspace = game.input.keyboard.addKey(Phaser.Keyboard.BACKSPACE);
    this.keyBackspace.onDown.add(function () {
      if (kuzzleGame.name.length > 0) {
        kuzzleGame.name = kuzzleGame.name.substr(0, kuzzleGame.name.length - 1);
        nameText.setText(namePrompt + kuzzleGame.name);
      }
    }, this);

    this.game.input.keyboard.addCallbacks(this, null, null, function(char) {
      if (char.charCodeAt(0) !== 0) {
        kuzzleGame.name += char;
        nameText.setText(namePrompt + kuzzleGame.name);
      }
    });
  },

  updateMenu: function(ev) {
    var
    selectedMenu = 0,
    nextMenu = ev.event.keyCode == 40 ? 1 : -1;

    menuItemConnecting.forEach(function(e, i) {
      if(e.selected) {
        e.selected = false;
        e.sprite.loadTexture(e.spriteIdentifier + '-unselected');

        selectedMenu = (i + nextMenu) % menuItemConnecting.length;

        if (selectedMenu < 0) {
          selectedMenu = menuItemConnecting.length - 1;
        }
      }
    });

    menuItemConnecting[selectedMenu].sprite.loadTexture(menuItemConnecting[selectedMenu].spriteIdentifier + '-selected');
    menuItemConnecting[selectedMenu].selected = true;
  },

  selectName: function() {
    if(kuzzleGame.name !== '' && !kuzzleGame.started) {
      kuzzleGame.started = true;
      nameTextTweenOut.start();
      self.connectToKuzzle();
    }
  },

  selectBack: function() {
    if(game.hasMusic) {
      musicConnecting.stop();
    }

    game.stateTransition.to('main-menu');
  },

  getSelectedMenu: function() {
    var selectedMenu = 0;
    menuItemConnecting.forEach(function(e, i) {
      if(e.selected) selectedMenu = i;
    });
    return menuItemConnecting[selectedMenu];
  },

  update: function() {
    filter.update();
  }
};
