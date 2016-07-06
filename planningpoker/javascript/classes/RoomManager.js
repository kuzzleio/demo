/**
 * This object allows to manage poker planning room collection.
 *
 */
Poker.planning.RoomManager = {

    // collection used for room storage in Kuzzle
    KUZZLE_ROOM_COLLECTION: "jl_planning_poker_rooms",

    /**
     * Contains all existing rooms. Structure :
     * {
     *      <room id>: <room object>,
     *      <room id>: <room object>,
     *      ...
     * }
     */
    _rooms: {},

    /**
     * Contains the current room ID if the user is in a room, otherwise false.
     */
    _currentRoomId: "",

    /**
     * getter for room collection.
     */
    rooms: function() {
        return this._rooms;
    },

    /**
     * Returns the current room object.
     * @param roomId : if filled, set the current room ID.
     * @returns {*}
     */
    currentRoom: function(roomId)
    {
        if(roomId != undefined && roomId != false) {
            this._currentRoomId = roomId;
        }

        if (this._rooms[this._currentRoomId] != undefined) {
            return this._rooms[this._currentRoomId];
        }
        return false;
    },

    /**
     * Create a new room an store it on Kuzzle server.
     * @param name
     * @param users
     */
    createRoom: function(name, callback)
    {
        var room = new Poker.planning.Room();
        room.name(name);
        room.store(callback);
    },

    /**
     * Load existing rooms by requesting Kuzzle server.
     * @param callback
     */
    loadRooms: function(callback)
    {
        this._rooms = {};

        // Kuzzle request
        Poker.planning.kuzzle.dataCollectionFactory(this.KUZZLE_ROOM_COLLECTION).advancedSearch({size: 50}, function(error, response) {
            if(error) {
                console.error(error);
                callback();
                return false;
            }

            if(callback != undefined) {
                for(var i = 0; i < response.documents.length; i++) {
                    var roomInfos = response.documents[i];
                    var room = new Poker.planning.Room();
                    room.datas = roomInfos.content;
                    room.id(roomInfos.id);
                    Poker.planning.RoomManager._rooms[room.id()] = room;
                }

                callback();
            }

        });
    },

    /**
     * Removes a room by its ID and send a deletion request to KUZZLE
     * @param roomId
     * @param callback
     * @returns {boolean}
     */
    removeRoom: function(roomId, callback)
    {
        if(roomId == undefined) {
            return false;
        }

        Poker.planning.kuzzle.dataCollectionFactory(Poker.planning.RoomManager.KUZZLE_ROOM_COLLECTION).deleteDocument(roomId, function (error, response) {

            if (error) {
                console.error(error);
            }

            if(Poker.planning.RoomManager.currentRoom() != false && Poker.planning.RoomManager.currentRoom().id() == roomId) {
                Poker.planning.RoomManager.currentRoom(false);
            }

            Poker.planning.RoomManager.removeRoomFromList(roomId);

            if(callback != undefined) {
                callback();
            }
        });
    },

    /**
     * Removes a room by its ID but without sending a request to KUZZLE.
     * @param roomId
     */
    removeRoomFromList: function(roomId) {
        if(Poker.planning.RoomManager.rooms()[roomId] != undefined) {
            delete Poker.planning.RoomManager._rooms[roomId];
        }
    },

    /**
     * Check if a Room result returned by Kuzzle already exists in the local room collection and create it or update the
     * relating local room.
     * @param kuzzleResponse
     */
    updateOrCreateRoom: function(kuzzleResponse) {
        if(Poker.planning.RoomManager.rooms()[kuzzleResponse.result._id] != undefined) {
            Poker.planning.RoomManager.rooms()[kuzzleResponse.result._id].refresh(kuzzleResponse.result._id, kuzzleResponse.result._source);
        }
        else {
            var room = new Poker.planning.Room();
            room.refresh(kuzzleResponse.result._id, kuzzleResponse.result._source);
            Poker.planning.RoomManager._rooms[kuzzleResponse.result._id] = room;
        }
    }

}
