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

    /**
     * Constructor. Will be returned as an Angular service
     * @param {Object} options
     * @constructor
     */
    function ChatRoom (options) {
      var opts = options || {};

      this.id = opts.id || null;
      this.messages = [];
      this.subscribed = false;

      this.kuzzleSubscription = null;

      this.subscribe();
    }

    /**
     * Subscribe to the Kuzzle Room.
     */
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

    /**
     * Sends a new message to Kuzzle
     * @param {String} message The message to send
     * @param {Object} me. An object representing the current user.
     */
    ChatRoom.prototype.sendMessage = function (message, me) {
      kuzzleMessagesCollection
        .publishMessage({
          content: message,
          color: me.color,
          nickName: me.nickName,
          chatRoom: this.id
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
