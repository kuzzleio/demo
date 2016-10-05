angular.module('KuzzleChatDemo', ['luegg.directives'])
  // setup kuzzle as an Angular service
  .factory('kuzzle', function () {
    return new Kuzzle(config.kuzzleUrl, {
      defaultIndex: config.appIndex,
      ioPort: 7512,
      wsPort: 7513
    });
  })

  // KuzzleDataCollection on which the messages are submited
  .factory('kuzzleMessagesCollection', ['kuzzle', function (kuzzle) {
    return kuzzle.dataCollectionFactory('KuzzleChatDemoMessages');
  }])

  // Our chatroom demo object
  .factory('ChatRoom', ['$rootScope', 'kuzzleMessagesCollection', function ($rootScope, kuzzleMessagesCollection) {
    function ChatRoom (options) {
      var
        opts = options || {},
        self = this;

      this.id = opts.id || null;
      this.messages = [];
      this.userCount = 0;
      this.subscribed = false;

      this.kuzzleSubscription = null;

      if (opts.subscribe) {
        this.subscribe();
      }

      this.refreshUserCount();
      setInterval(function () {
        self.refreshUserCount();
      }, 2000);
    }

    ChatRoom.prototype.subscribe = function () {
      var self = this;

      this.subscribed = true;

      kuzzleMessagesCollection
        .subscribe(
          {term: {chatRoom: self.id}},
          function (err, response) {
            self.messages.push({
              color: response.result._source.color,
              nickName: response.result._source.nickName,
              content: response.result._source.content
            });
            $rootScope.$apply();
          }
        )
        .onDone(function (err, room) {
          if (err) {
            console && console.error(err);
            return;
          }

          self.kuzzleSubscription = room;
        });
    };

    ChatRoom.prototype.unsubscribe = function () {
      this.kuzzleSubscription.unsubscribe();

      this.kuzzleSubscription = null;
      this.subscribed = false;
    };

    ChatRoom.prototype.sendMessage = function (message, me) {
      kuzzleMessagesCollection
        .publishMessage({
          content: message,
          color: me.color,
          nickName: me.nickName,
          chatRoom: this.id
        });
    };

    ChatRoom.prototype.refreshUserCount = function () {
      var self = this;

      if (!this.kuzzleSubscription || !this.kuzzleSubscription.roomId) {
        return;
      }
      this.kuzzleSubscription.count(function (err, result) {
        self.userCount = result;
        $rootScope.$apply();
      });
    };

    return ChatRoom;
  }])

  .factory('kuzzleChatRoomListCollection', ['kuzzle', function (kuzzle) {
    return kuzzle.dataCollectionFactory('KuzzleChatDemoRoomList');
  }])

  .factory('ChatRoomList', ['$rootScope', 'kuzzleChatRoomListCollection', 'ChatRoom', function ($rootScope, kuzzleChatRoomListCollection, ChatRoom) {
    function ChatRoomList () {
      this.all = {};
      this.active = [];
      this.current = null;

      this.getAll();
      this.subscribe();
    }

    /**
     * Real-time subscription to the room list collection.
     * Allows to be informed when a new room is created by another user.
     */
    ChatRoomList.prototype.subscribe = function () {
      var self = this;

      kuzzleChatRoomListCollection
        .subscribe(
          {},
          function (err, response) {
            var result = response.result;

            if (response.action === 'delete') {
              self.del(result._id);
              return;
            }

            var chatRoom = new ChatRoom({
              id: result._id,
              name: result._source.name,
              subscribe: false
            });
            self.add(chatRoom);
          }
        )
    };

    /**
     * Filters the list of rooms to get only the active ones.
     * A chat room is considered active when the user has subscribed to it.
     */
    ChatRoomList.prototype.refreshActive = function () {
      this.active = [];

      for (k in this.all) {
        if (this.all.hasOwnProperty(k) && this.all[k].subscribed) {
          this.active.push(this.all[k]);
        }
      }
      if (this.current === null) {
        this.current = this.active[0];
      }
    };

    /**
     * Gets the list of rooms persisted in Kuzzle database.
     * Called during init to populate the initial list.
     */
    ChatRoomList.prototype.getAll = function () {
      var self = this;

      if (!self.all['Main room']) {
        self.all['Main room'] = new ChatRoom({
          id: 'Main room',
          subscribe: true
        });
        self.refreshActive();
      }

      kuzzleChatRoomListCollection
        .fetchAllDocuments(function (err, result) {
          if (err) {
            console.log(err);
            return false;
          }

          $.each(result.documents, function (k, doc) {
            if (!self.all[doc.id]) {
              self.all[doc.id] = new ChatRoom({
                id: doc.id,
                subscribe: false
              })
            }
          });

          self.refreshActive();

          $rootScope.$apply();
        });
    };

    ChatRoomList.prototype.add = function (chatRoom) {
      if (!this.all[chatRoom.id]) {
        this.all[chatRoom.id] = chatRoom;
      }
      this.refreshActive();
    };

    ChatRoomList.prototype.del = function (roomId) {
      this.unactiveRoom(roomId);
      delete this.all[roomId];
    };

    ChatRoomList.prototype.addNewRoom = function (name) {
      var self = this;

      kuzzleChatRoomListCollection
        .documentFactory(name, {foo: 'bar'})
        .save({}, function (err, result) {
          var chatRoom = new ChatRoom({
            id: result.id,
            subscribe: true
          });

          self.add(chatRoom);
          self.activeRoom(chatRoom.id);
        });
    };

    ChatRoomList.prototype.activeRoom = function (roomId) {
      if (!this.all[roomId].subscribed) {
        this.all[roomId].subscribe();
      }

      this.current = this.all[roomId];
      this.current.refreshUserCount();

      this.refreshActive();
    };

    ChatRoomList.prototype.unactiveRoom = function (roomId) {
      if (this.all[roomId].subscribed) {
        this.all[roomId].unsubscribe();
      }
      if (this.all[roomId].userCount <= 1) {
        kuzzleChatRoomListCollection
          .documentFactory(this.all[roomId].id, {})
          .delete(function (err, result) {
            if (err) {
              console.log(err);
            }
          });
      }

      this.current = null;

      this.refreshActive();
    };

    return ChatRoomList;
  }])

  .controller('KuzzleChatController', ['$scope', 'ChatRoom', 'ChatRoomList', function ($scope, ChatRoom, ChatRoomList) {
    var chat = this;

    this.me = {
      nickName: 'Anonymous',
      color: '#' + Math.floor(Math.random() * 16777215).toString(16)
    };

    this.rooms = new ChatRoomList();

    this.sendMessage = function () {
      chat.rooms.current.sendMessage(chat.messageText, chat.me);
      chat.messageText = '';
    };

    $scope.updateNickName = function () {
      var newNickName = prompt('Please enter your new nickname:');

      if ($.trim(newNickName) !== '') {
        chat.me.nickName = newNickName;
      }
    };

    $scope.addNewChatRoom = function () {
      var newChatRoom = prompt('Please a name for the new room:');

      if ($.trim(newChatRoom) !== '') {
        chat.rooms.addNewRoom(newChatRoom);
      }
    };

    $scope.activeRoom = function (id) {
      chat.rooms.activeRoom(id);
      $('#inputChatMessage').focus();
    };

    $scope.unactiveRoom = function (id) {
      chat.rooms.unactiveRoom(id);
    };
  }]);

