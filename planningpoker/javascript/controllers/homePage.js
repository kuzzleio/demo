/**
 *  The homepage list all existing rooms and allow users to choose one or create a new room.
 *
 */
Poker.planning.homePage = {

    /**
     * Check parameters and load the page template
     */
    load: function()
    {
        var nickname = Poker.planning.getParameter("nickname");
        if(nickname == false) { // return to login page if nickname is missing
            window.location.href = "index.html";
        }

        Poker.planning.nickname(nickname);

        Poker.planning.loadPage("templates/homePage.html", Poker.planning.homePage.run);
    },

    /**
     * Execute actions after the template has been loaded.
     */
    run: function()
    {
        $(document).ready(function() {

            Poker.planning.homePage.displayRooms();
            Poker.planning.setTitle("Planning Poker sessions");
            Poker.planning.activeMenuButtons(["quit"]);

            // submitting room creation form
            $("#form-create-room").submit(function(e) {
                e.preventDefault();

                var roomName = $("input[id=roomName]").val().trim();
                if(roomName != "") {
                    Poker.planning.RoomManager.createRoom(roomName, function() {
                        $("input[id=roomName]").val("");
                        $(".room-creation-container").removeClass("open");
                        $('#createSessionModal').modal('hide');
                    });
                }
            });


            // subscribe to rooms update
            var subscriptionFilters = {
                term: {
                    type: "ROOM"
                }
            };

            Poker.planning.kuzzle
              .dataCollectionFactory(Poker.planning.RoomManager.KUZZLE_ROOM_COLLECTION)
              .subscribe(subscriptionFilters, function (error, response) {
                  if(error && console) {
                      console.error("Error in homePage.run() function when subscribing to room update.")
                      console.error(error);
                  }
                  else {
                      if(response.action == "delete") {
                          Poker.planning.RoomManager.removeRoomFromList(response.result._id);
                      }
                      else {
                          Poker.planning.RoomManager.updateOrCreateRoom(response);
                      }
                      Poker.planning.homePage.displayRooms();
                  }
              })
              .onDone(function (error, room) {
                 Poker.planning.pokerPage.roomIdSubscription = room;
              });
        });

    },

    /**
     * Display rooms loaded from Kuzzle
     */
    displayRooms: function()
    {
        $("ul.rooms").html("");

        var count = 0;
        for(var roomId in Poker.planning.RoomManager.rooms()) {
            var room = Poker.planning.RoomManager.rooms()[roomId];
            var url = "index.html?page=poker&nickname=" + encodeURIComponent(Poker.planning.nickname()) + "&roomid=" + encodeURIComponent(room.id());
            var users = room.users() || [];
            $("ul.rooms").append('<li><a href="'+url+'" data-room-id="' + room.id() + '">' + room.name() + '<span class="user-list">'+users.join(", ")+'</span></a></li>');
            count++;
        }

        if(count == 0) {
            $("ul.rooms").append('<li><a href="#" data-toggle="modal" data-target="#createSessionModal"><span class="glyphicon glyphicon-info-sign"></span> There is no existing session</a></li>');
        }
    },

    /**
     * Generate a JS redirection to this page. Must be called from another page.
     */
    redirectToThisPage: function() {
        if(Poker.planning.nickname() != false) {
            window.location.href = "index.html?page=list&nickname=" + encodeURIComponent(Poker.planning.nickname());
        }
        else {
            Poker.planning.loginPage.redirectToThisPage();
        }
    }

}
