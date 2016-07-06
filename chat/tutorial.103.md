# Kuzzle chat demo 103 - Adding some multi-room support

In this last part of our chat tutorial, we will extend our application to support some multiple rooms.

The list of rooms will be persisted in Kuzzle.

The user can join several rooms at the same time and receive some messages on all of them at the same time.

When a user is the last one to exit a room, it is automatically deleted, both from Kuzzle and from all users chat room lists.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**

- [Sources](#sources)
- [Modifying our ChatRoom model](#modifying-our-chatroom-model)
  - [Implementation details](#implementation-details)
    - [Constructor](#constructor)
    - [unsubscribe method](#unsubscribe-method)
- [Adding a new model for the room list](#adding-a-new-model-for-the-room-list)
  - [Implementation details](#implementation-details-1)
    - [Constructor](#constructor-1)
    - [subscribe method](#subscribe-method)
    - [getAll method](#getall-method)
    - [refreshActive method](#refreshactive-method)
    - [add method](#add-method)
    - [del method](#del-method)
    - [addNewRoom method](#addnewroom-method)
    - [activeRoom and unactiveRoom methods](#activeroom-and-unactiveroom-methods)
- [Handling the presentation logic](#handling-the-presentation-logic)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Sources

The complete source files can be found in our [Github repository](https://github.com/kuzzleio/demo/tree/master/chat).

* [html](https://github.com/kuzzleio/demo/tree/master/chat/index.html)
* [javascript](https://github.com/kuzzleio/demo/tree/master/chat/js/app.js)

## Modifying our ChatRoom model

In this new step, we need to handle a list of ChatRooms. Among these chat rooms, only the ones the user has joined are considered active.

On our application level, this also means that only the active rooms have a Kuzzle subscription.

We need to slightly modify our ChatRoom model object to reflect this change.

### Implementation details

#### Constructor

```javascript
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
```

We use a new `subscribe` property to our `options` object. We subscribe to the room notifications on Kuzzle side only if it set to true.

#### unsubscribe method

We also need a new method to allow the user to quit a chat room.

```javascript
ChatRoom.prototype.unsubscribe = function () {
  this.kuzzleSubscription.unsubscribe();

  this.kuzzleSubscription = null;
  this.subscribed = false;
};
```

This method just calls the [KuzzleRoom unsubscribe](http://kuzzle.io/sdk-documentation/#unsubscribe) method and updates the current object state.

## Adding a new model for the room list

```javascript

.factory('kuzzleChatRoomListCollection', ['kuzzle', function (kuzzle) {
  return kuzzle.dataCollectionFactory('KuzzleChatDemoRoomList');
}])

.factory('ChatRoomList', ['$rootScope', 'kuzzleChatRoomListCollection', 'ChatRoom', function ($rootScope, kuzzleChatRoomListCollection, ChatRoom) {
  function ChatRoomList () {...}

  /** Real-time subscription to the room list collection. ...*/
  ChatRoomList.prototype.subscribe = function () {...}

  /** Filters the list of rooms to get only the active ones. ...*/
  ChatRoomList.prototype.refreshActive = function () {...}

  /** Gets the list of rooms persisted in Kuzzle database. ...*/
  ChatRoomList.prototype.getAll = function () {...}

  ChatRoomList.prototype.add = function (chatRoom) {...}

  ChatRoomList.prototype.del = function (roomId) {...}

  ChatRoomList.prototype.addNewRoom = function (name) {...}

  ChatRoomList.prototype.activeRoom = function (roomId) {...}

  ChatRoomList.prototype.unactiveRoom = function (roomId) {...}

  return ChatRoomList;
}])

```

We first declare a new [Angular service](https://docs.angularjs.org/guide/services) that returns a [KuzzleDataCollection](http://kuzzle.io/sdk-documentation/#kuzzledatacollection) object.

We will use this new collection to store and persist the list of available rooms.

We then declare a new constructor for our chatrooms list.

### Implementation details

#### Constructor

```javascript
function ChatRoomList () {
  this.all = {};
  this.active = [];
  this.current = null;

  this.getAll();
  this.subscribe();
}
```

The constructor defines the available properties:

* _all_: An object containing all the available rooms. It is a key => value set where the key is the room id and the value is a ChatRoom model object instance.
* _active_: An array containing only the active rooms (the ones the current user is listening).
* _current_: A reference to the currently highlighted chat room.

The constructor then retrieves all the available rooms from Kuzzle by calling its getAll method and subscribes to the room list collection notifications.

#### subscribe method

```javascript
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
      },
      {subscribeToSelf: true}
    )
};
```

The `subscribe` method allows to receive the real-time notifications updates from the room list collection.

:bulb: Note the empty object given as a filter. This is equivalent to "receive all" notifications.

:bulb: Contrary to our previous ChatRoom object where no document could be deleted, we here need to perform a different action where a room is removed.
This can be achieved checking on the `action` property from the response object we get from Kuzzle.

#### getAll method

```javascript
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
```

This method is called only once, by the constructor. It uses the [KuzzleDataCollection fetchAllDocuments](http://kuzzle.io/sdk-documentation/#fetchalldocuments) method to retrieve the list of persisted documents for the collection.

From the returned list, it fills the ChatRoomList `all` property.

We also add a default "Main room" that will always be available.

#### refreshActive method

This internal method just filters all the available rooms to put in the `active` array only the ones that the user is listening to.

#### add method

This internal method adds a new ChatRoom object to the `all` collection and triggers the refreshActive filter.

This method applies to the ChatRoomList model object only and does not perform any action on Kuzzle.

#### del method

This internal method removes a ChatRoom object to the current object list.

This method applies to the ChatRoomList model object only and does not perform any action on Kuzzle.

#### addNewRoom method

```javascript
ChatRoomList.prototype.addNewRoom = function (name) {
  var self = this;

  kuzzleChatRoomListCollection
    .documentFactory({_id: name})
    .save({}, function (err, result) {
      var chatRoom = new ChatRoom({
        id: result.id,
        subscribe: true
      });

      self.add(chatRoom);
      self.activeRoom(chatRoom.id);
    });
};
```

Given a room name, this method will create a new [KuzzleDocument](http://kuzzle.io/sdk-documentation/#kuzzledocument) and persist it in Kuzzle.

Once the object is persisted, on the callback, it adds a new matching ChatRoom object to the internal list.

#### activeRoom and unactiveRoom methods

These methods allow to toggle a given chat room active state to let the user join or quit it.

When quitting a room, if the user was the last subscriber, the room is automatically deleted from Kuzzle.

## Handling the presentation logic

Instead of binding a single chat room to our template, we can now use our new ChatRoomList model object and add few helpers that will trigger new actions.

```javascript
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
```

Finally, the [html template](https://github.com/kuzzleio/demo/tree/master/chat/index.html) also needs some modifications to handle our new functionalities.
