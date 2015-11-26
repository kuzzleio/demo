angular.module('KuzzleChatDemo', ['luegg.directives'])
  // setup kuzzle as an Angular service
  .factory('kuzzle', function () {
    return new Kuzzle(config.kuzzleUrl);
  })
  // KuzzleDataCollection on which the messages are submited
  .factory('kuzzleMessagesCollection', ['kuzzle', function (kuzzle) {
    return kuzzle.dataCollectionFactory('KuzzleChatDemoMessages');
  }])
  // Our chatroom demo object
  .factory('ChatRoom', ['$rootScope', 'kuzzleMessagesCollection', function ($rootScope, kuzzleMessagesCollection) {
    /**
     * Constructor. Will be returned as an Angular service
     * @param {Object} options
     * @constructor
     */
    function ChatRoom (options) {
      var
        opts = options || {},
        self = this;

      this.id = opts.id || null;
      this.messages = [];
      this.userCount = 0;
      this.subscribed = false;

      this.kuzzleSubscription = null;

      this.subscribe();

      this.refreshUserCount();
      setInterval(function () {
        self.refreshUserCount();
      }, 2000);
    }

    /**
     * Subscribe to the Kuzzle Room.
     */
    ChatRoom.prototype.subscribe = function () {
      var self = this;

      this.kuzzleSubscription = kuzzleMessagesCollection
        .subscribe(
          {term: {chatRoom: self.id}},
          function (err, result) {
            self.messages.push({
              color: result._source.color,
              nickName: result._source.nickName,
              content: result._source.content
            });
            $rootScope.$apply();
          },
          {subscribeToSelf: true}
        );
      this.subscribed = true;
    };

    /**
     * Sends a new message to Kuzzle
     * @param {String} message The message to send
     * @param {Object} me. An object representing the current user.
     */
    ChatRoom.prototype.sendMessage = function (message, me) {
      kuzzleMessagesCollection
        .publish({
          content: message,
          color: me.color,
          nickName: me.nickName,
          chatRoom: this.id
        });
    };

    /**
     * Get the number of simultaneous users connected to the room
     */
    ChatRoom.prototype.refreshUserCount = function () {
      var self = this;

      if (!this.kuzzleSubscription) {
        return;
      }
      this.kuzzleSubscription.count(function (err, response) {
        self.userCount = response.result;
        $rootScope.$apply();
      });
    };

    return ChatRoom;
  }])

  .controller('KuzzleChatController', ['$scope', 'ChatRoom', function ($scope, ChatRoom) {
    var chat = this;

    this.me = {
      nickName: 'Anonymous',
      color: '#' + Math.floor(Math.random() * 16777215).toString(16)
    };
    this.chatRoom = new ChatRoom({id: 'Main room'});

    this.sendMessage = function () {
      chat.chatRoom.sendMessage(chat.messageText, chat.me);
      chat.messageText = '';
    };

    $scope.updateNickName = function () {
      var newNickName = prompt('Please enter your new nickname:');

      if ($.trim(newNickName) !== '') {
        chat.me.nickName = newNickName;
      }
    };

  }]);
