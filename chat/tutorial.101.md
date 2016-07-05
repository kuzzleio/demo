# Kuzzle chat demo 101 - Real-time messaging

The first step of this tutorial will create a single chat room using Kuzzle's
[Javascript SDK](https://github.com/kuzzleio/sdk-javascript)

Any user connected to the chat can send and receive the messages in real time.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**

- [Sources](#sources)
- [Include Kuzzle SDK's library](#include-kuzzle-sdks-library)
- [Connecting to Kuzzle](#connecting-to-kuzzle)
- [Preparing our Chat room and linking it to Kuzzle](#preparing-our-chat-room-and-linking-it-to-kuzzle)
  - [The ChatRoom model object details](#the-chatroom-model-object-details)
    - [Constructor](#constructor)
    - [Subscribe method](#subscribe-method)
    - [sendMessage method](#sendmessage-method)
- [Handling the presentation logic](#handling-the-presentation-logic)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Sources

The complete source files can be found in our [Github repository](https://github.com/kuzzleio/demo/tree/master/chat).

* [html](https://github.com/kuzzleio/demo/tree/master/chat/101.html)
* [javascript](https://github.com/kuzzleio/demo/tree/master/chat/js/app.101.js)

## Include Kuzzle SDK's library

In order to use Kuzzle, you first need to include its Javascript SDK and its dependencies.  


```shell
cd path/to/chat/demo
bower install
```

In your html, you can then include it.

```html
101.html --
  [..]
  <script src="bower_components/kuzzle-sdk/dist/kuzzle.min.js"></script>
  <script src="config.js"></script>
  <script src="js/app.101.js"></script>
  <script>
    $(document).foundation();
  </script>
</body>
```

## Connecting to Kuzzle

Connecting to Kuzzle is just a matter of instantiating a [Kuzzle object](http://kuzzle.io/sdk-documentation/#kuzzle).

We expose it as an [Angular service](https://docs.angularjs.org/guide/services).

```javascript
js/app.101.js --
angular.module('KuzzleChatDemo', [])
  // setup kuzzle as an Angular service
  .factory('kuzzle', function () {
    return new Kuzzle(config.kuzzleUrl, {defaultIndex: config.appIndex});
  })
  [..]
```

Where config.kuzzleUrl is set to your Kuzzle server's end point, i.e.
http://localhost:7512.  
The defaultIndex is the index to use.

## Preparing our Chat room and linking it to Kuzzle

We create a ChatRoom model object that exposes methods needed to our
current functionalities: subscribe to a room and send a message.

Once again, we use Angular services and we expose the constructor as a service.

```javascript
js/app.101.js --
angular.module('KuzzleChatDemo', [])
  [..]
  // Our chatroom demo object
  .factory('ChatRoom', ['$rootScope', 'kuzzleMessagesCollection', function ($rootScope, kuzzleMessagesCollection) {

    /** Constructor. Will be returned as an Angular service ...*/
    function ChatRoom (options) {...}

    /** Subscribe to the Kuzzle Room. ...*/
    ChatRoom.prototype.subscribe = function () {...}

    /** Sends a new message to Kuzzle ...*/
    ChatRoom.prototype.sendMessage = function (message, me) {...}

    return ChatRoom;
  }])
  [..]
```

### The ChatRoom model object details

#### Constructor

```javascript
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
```

The constructor takes an `options` object as parameter, in which the chat room id
can be defined.

It also defines the chat room properties we will need.

* _messages_: An array containing the messages we get on the chat.
* _subscribed_: A boolean value that indicates if our chat room object has
subscribed to Kuzzle.
* _kuzzleSubscription_: Once the subscription to Kuzzle is established, this attribute is used to store the corresponding [KuzzleRoom](http://kuzzle.io/sdk-documentation/#kuzzleroom) object.

:warning: _The vocabulary can be confusing between our application
chat room and Kuzzle internal rooms on which it relies.
We will use the term **chat room** to designate our application room (with the
term "chat")._

Finally, our constructor automatically subscribes to Kuzzle.

#### Subscribe method

```javascript
ChatRoom.prototype.subscribe = function () {
  var self = this;

  this.kuzzleSubscription = kuzzleMessagesCollection
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
    );
  this.subscribed = true;
};
```

The `subscribe` method just registers the application to Kuzzle to receive the incoming messages using the [KuzzleDataCollection subscribe method](http://kuzzle.io/sdk-documentation/#subscribe).

Kuzzle's `subscribe` method expects to receive three parameters:

1. filters to apply to incoming documents before noticing the user back.
Only documents matching these filters will be received by our application.
2. an optional option object, not given here.
3. a callback function which will be triggered when a document matching the filter is published or modified.

In our case, we define as a filter all the documents whose chatRoom id property matches our current room one ('Main room').

The callback function appends a new simple message object to the ChatRoom messages array.

Finally, we ask Kuzzle to be notified on messages the application sends by passing the option subscribeToSelf to true.

#### sendMessage method

```javascript
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
```

The sendMessage method is just a wrapper for the [KuzzleDataCollection publish](http://kuzzle.io/sdk-documentation/#publishmessage) method.

:bulb: Note the chatRoom property in the submitted object that will match our subscription filter.

## Handling the presentation logic

Now that our ChatRoom object is ready to use, we just need to prepare an instance to be used and reflect its changes on the web application.

Thanks to AngularJs [bidirectional binding](https://docs.angularjs.org/guide/databinding), we just need to build a ChatRoom model instance in our controller and add a couple of helper functions to let the user change his nickname and messages sent.

```javascript
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
```
