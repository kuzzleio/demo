# Kuzzle Tournament - Tutorial

Kuzzle Tournament is a multiplayer combat game running in web browsers.

This is an advanced tutorial, meant to only explain two specific Kuzzle features:

* How to setup an application server working in pair with Kuzzle
* How to handle client disconnections

This tutorial uses the [Kuzzle Javascript SDK](https://github.com/kuzzleio/sdk-javascript)

The complete SDK documentation is available [here](http://kuzzleio.github.io/sdk-documentation)

**Table of content:**

* [Why another back-end server?](#why-another-back-end-server)
* [How does it work?](#how-does-it-work)
* [Handling players connection and disconnection](#handling-players-connection-and-disconnection)
* [Adding information to subscriptions](#adding-information-to-subscriptions)


# Why another back-end server?

One of Kuzzle's purposes is to handle communications between the different components of an application. Other tutorials show how to synchronize application clients, but here we wanted to show how Kuzzle can also handle communications between different components of an application.

Kuzzle Tournament is a good example of a multi-components application:

* the game client handles the graphical interface
* the game server manages rooms and game rules. It also starts and ends games
* Kuzzle handles the communications between these components

# How does it work?

There are several ways to add an application server to Kuzzle. The most natural way to do it for a simple client-server application is to interface a server between clients and Kuzzle, hiding Kuzzle from clients of the application.

In this demo, we adopted a different approach, by putting Kuzzle at the center of the communication flow between our game clients and the game server.  
We did this mainly because we wanted to show how Kuzzle can act as a central point of communication between independent and different components of an application.

Here is how it looks like:

![Base Architecture](http://kuzzle.io/wp-content/uploads/2016/01/Kuzzle-Tournament-Base-Architecture.png)


Here is what happens when a new player starts a game:

1. The client subscribes to the server room, with the player information in the metadata
* The server receive a ``new user`` notification from Kuzzle, and replies to the client with an appropriate room, the list of this room's players, and the current game rules
* The client can then subscribe to the assigned game room. He starts receiving game updates from other players, and sends its own to them

The game server itself subscribes to all room it creates, in order to listen to the game updates, and to orchestrate how the game goes.  
The game server also ask Kuzzle to send notifications when players exit the game, and eventually notify other players to end the game when there is not enough players left in it.

The game server is implemented in the following file: [server/tournament_server.js](https://github.com/kuzzleio/demo/blob/master/tournament/server/tournament_server.js)

# Handling players connection and disconnection

Other tutorials cover notifications, mostly demonstrating the usefulness of document notifications. But there are two special kinds of notifications, unrelated to documents:

* *New connection* notification
* *Disconnection* notification

These events are fired whenever someone enters or leaves a room you're listening to. Be aware that a *room* is in fact a set of filters, so to receive one of these notifications, you need to use the same filters than the application entering or leaving the room.

In Kuzzle Tournament, the game server listens to these notifications in order to detect when a player entered or left the game, and to act accordingly.

By default, subscriptions made with the Javascript SDK are configured so that connection/disconnection notifications are not forwarded by Kuzzle.  
We need to pass the appropriate options when making a subscription to receive these notifications:

```js
// Listening to connected/disconnected players
kuzzle
  .dataCollectionFactory(Configuration.server.room)
  .subscribe({}, {users: 'all'}, (error, data) => {
    var
    roomId,
    players = [];

    if (data.action === 'on') {
      logger.info('New player: ', data.metadata.username);
      roomId = addPlayer(data.metadata);

      Object.keys(Rooms[roomId].players).forEach(p => players.push(Rooms[roomId].players[p]));
      kuzzle
        .dataCollectionFactory(Configuration.server.room)
        .publishMessage({id: data.metadata.id, room: Rooms[roomId], players: players });
    } else if (data.action === 'off') {
      logger.info('Player left: ', data.metadata.username);
      removePlayer(data.metadata.id);
    }
  });
```


This snippet starts line 25 of the ``server/tournament_server.js`` file.

##Subscription explanation:

* We create a new object representing the data collection ``Configuration.server.room``
* We subscribe to the filter ``{}``, meaning that we'll be notified for any change detected on this data collection
* We pass the option ``scope: 'none'``, meaning that we don't want to receive notifications related to document changes
* We pass the option ``users: 'all'``, meaning that we want to receive all notifications related to users activity
* Every time a notification is received, the callback is executed

##Callback details:

The ``data.action`` variable tells the server if the received notification is about a new subscription occurring on the room (``data.action === 'on'``), or if a connected user left it (``data.action === 'off'``).  
Depending of this information, the game server takes the appropriate action by adding the player to the game, or by removing it.

For more information about subscription configuration, see the KuzzleRoom constructor in [SDK Documentation](http://kuzzle.io/sdk-documentation/#constructors71)

# Adding information to subscriptions

By default, user notifications don't contain useful information, apart from the corresponding room ID, and the fact that a user subscribed or unsubscribed to that room.

For the Kuzzle Tournament server, this is a problem: with these notifications, how can it know who is connecting to the game? How can it tell who is leaving, in order to notify other players?

This is where the metadata feature comes in.

Query metadata is a useful Kuzzle feature, allowing applications to add volatile data to any query. These volatile data have no impact on the query itself, their sole purpose is to be forwarded without modification by Kuzzle in the corresponding notifications.

For instance, if a query is used to create a new document, any metadata provided in the query will be forwarded in the ``document created`` notifications sent by Kuzzle.

For user notifications, the metadata are taken from the subscription query.  
Here is the query made by a game client when connecting to the game:

```js
game.player = {
  id: myId,
  username: kuzzleGame.name,
  color: randColor,
  look: look
};

kuzzle
  .dataCollectionFactory(Configuration.server.room)
  .subscribe({}, {metadata: game.player, subscribeToSelf: false}, function (error, data) {
    // ...
  });
```

Prior to connecting to the server, we gather the player informations. These informations are passed as the ``metadata`` option in the ``subscribe`` SDK method.

The game server, listening to any new connection on the same room, will receive these metadata embedded in the notification.  
More importantly, these metadata are stored by Kuzzle, and forwarded once again in the ``off`` notification.

Using these metadata, the game server can now get the information it needs to manage players and their associated rooms.

For more information about query metadata, you can check [Kuzzle API Documentation](http://kuzzle.io/api-reference/?websocket#sending-metadata)
