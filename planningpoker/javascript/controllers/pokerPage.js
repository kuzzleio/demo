/**
 * The poker page manage a poker planning session.
 */
Poker.planning.pokerPage = {

    // Collection name which contains poker actions
    KUZZLE_POKER_ACTION_COLLECTION: "jl_planning_poker_actions",

    // poker actions
    ACTION_LAUNCH_VOTE: "LAUNCH_VOTE",
    ACTION_VOTE: "VOTE",

    // contains the kuzzle subscription id for current room information update
    roomIdSubscription: null,
    // contains the kuzzle subscription id for poker actions
    actionSubscription: null,

    // contains a settimeout ID when the user is modifying the H1 title. It allows to cancel timeout when needed.
    saveTitleSetTimeout: null,

    // indicates if the current user is voting
    isVoting: false,

    // indicates the remaining time to vote
    remainingTime: Poker.planning.params.VOTE_DELAY,

    /**
     * Contains current session votes. Structure :
     * {
     *      "user1": "vote value 1",
     *      "user2": "vote value 2",
     *      "user3": "vote value 3",
     * }
     */
    userVotes: {},

    /**
     * Check parameters and load the page template
     */
    load: function() {

        var nickname = Poker.planning.getParameter("nickname");
        var roomid = Poker.planning.getParameter("roomid");

        if(nickname == false && !roomid) { // return to login page if nickname or roomid parameter is missing
            Poker.planning.loginPage.redirectToThisPage();
        }
        else if(!roomid) {
            Poker.planning.nickname(nickname);
            Poker.planning.homePage.redirectToThisPage();
        }
        else {
            Poker.planning.nickname(nickname);
            Poker.planning.RoomManager.currentRoom(roomid);
            Poker.planning.loadPage("templates/pokerPage.html", Poker.planning.pokerPage.run);
        }
    },

    /**
     * Execute actions after the template has been loaded.
     */
    run: function() {

        $(document).ready(function() {

            // if the room has been removed
            if(Poker.planning.RoomManager.currentRoom() == false) {
                window.location.href = "index.html?page=list&nickname=" + encodeURIComponent(Poker.planning.nickname());
                return;
            }

            $("h1").attr("contenteditable", "true");
            $("h1").keydown(function(e) {
                var text = $(this).text();

                if(e.keyCode == 13) {
                    e.preventDefault();

                    if(Poker.planning.pokerPage.saveTitleSetTimeout != null) {
                        clearTimeout(Poker.planning.pokerPage.saveTitleSetTimeout);
                        Poker.planning.pokerPage.saveTitleSetTimeout = null;
                    }
                    Poker.planning.RoomManager.currentRoom().name(text);
                    Poker.planning.RoomManager.currentRoom().store();
                }
                else if($(this).text() != "") {

                    if(Poker.planning.pokerPage.saveTitleSetTimeout != null) {
                        clearTimeout(Poker.planning.pokerPage.saveTitleSetTimeout);
                        Poker.planning.pokerPage.saveTitleSetTimeout = null;
                    }

                    Poker.planning.pokerPage.saveTitleSetTimeout = setTimeout(function() {
                        Poker.planning.RoomManager.currentRoom().name(text);
                        Poker.planning.RoomManager.currentRoom().store();
                        Poker.planning.pokerPage.saveTitleSetTimeout = null;
                    }, 3000);
                }
            });

            Poker.planning.RoomManager.currentRoom().addUser(Poker.planning.nickname());

            // removing the current player when unload the page
            $(window).unload(function(e) {
                var currentRoom = Poker.planning.RoomManager.currentRoom();
                if (currentRoom) {
                    currentRoom.removeUser();
                }
            });

            // event change the iframe URL
            $("#openLinkButton").css("display", "none");
            $("input[name=iframeURL]").change(function() {
                var url = $(this).val().trim();

                if(url != "" && url.substring(0, 4) != "http") {
                    url = "http://" + url;
                    $(this).val(url);
                }

                Poker.planning.RoomManager.currentRoom().url(url);
                if(url != "") {
                    $("#openLinkButton").css("display", "block");
                }
                else {
                    $("#openLinkButton").css("display", "none");
                }
            });

            $("#openLinkButton").bind("touchstart click", function(e) {
                e.preventDefault();

                if($("input[name=iframeURL]").val().trim() != "") {
                    window.open($("input[name=iframeURL]").val().trim(), "_blank");
                }
            });

            // event click on a poker card
            $(".cards a").bind("touchstart click", function(e) {
                e.preventDefault();
                $(".cards a.active").removeClass("active");
                $(this).addClass("active");
                Poker.planning.pokerPage.vote($(this).text());
            });

            $("#resumeButton").bind("touchstart click", function(e) {
                e.preventDefault();
                $(this).removeClass("active");
                Poker.planning.pokerPage.vote('Resume');
            });

            // subscribe to room update
            var subscriptionFilters = {
                term: {
                    copy_id: Poker.planning.RoomManager.currentRoom().copyId()
                }
            };

            Poker.planning.kuzzle
              .dataCollectionFactory(Poker.planning.RoomManager.KUZZLE_ROOM_COLLECTION)
              .subscribe(subscriptionFilters, function (error, response) {
                  if(error && console) {
                      console.error("Error in pokerPage.run() function when subscribing to room update.");
                      console.error(error);
                  }
                  else {
                      if (response.action == "delete") {
                          Poker.planning.pokerPage.unsubscribe();
                          alert("The session has been deleted.");
                          Poker.planning.homePage.redirectToThisPage();
                      }
                      else {
                          Poker.planning.RoomManager.currentRoom().refresh(response.result._id, response.result._source);
                          Poker.planning.pokerPage.display();
                      }
                  }
              })
              .onDone(function (error, room) {
                  if (error && console) {
                      return console.error(error);
                  }
                  Poker.planning.pokerPage.roomIdSubscription = room;
              });

            // Subscribes to poker actions
            Poker.planning.pokerPage.actionSubscription = Poker.planning.kuzzle
              .dataCollectionFactory(Poker.planning.pokerPage.KUZZLE_POKER_ACTION_COLLECTION)
              .subscribe({term: {roomid: Poker.planning.RoomManager.currentRoom().id()}}, function(error, response) {
                if(error) {
                    console.error(error);
                }
                else {
                    var body = response.result._source;
                    switch(body.action) {

                        case Poker.planning.pokerPage.ACTION_LAUNCH_VOTE:
                            Poker.planning.pokerPage.receiveLaunchVoteAction();
                            break;

                        case Poker.planning.pokerPage.ACTION_VOTE:
                            Poker.planning.pokerPage.receiveUserVote(body.user, body.vote);
                            break;

                        default:
                            console.error("undefined poker action", body);
                            break;
                    }
                }})
              .onDone(function (error, room) {
                 if (error && console) {
                     return console.error(error);
                 }
                 Poker.planning.pokerPage.actionSubscription = room;
              });

            Poker.planning.pokerPage.display();
        });


        $("#inviteFriendModal input").change(function() {

            if($("input[id=friendName]").val().trim() != "" && Poker.planning.pokerPage.validateEmail($("input[id=friendEmail]").val().trim())) {

                var nickname = $("input[id=friendName]").val().trim();
                var email = $("input[id=friendEmail]").val().trim();

                var url = "mailto:";
                url += encodeURIComponent(email);
                url += "?subject=Invitation to Kuzzle poker planning session";
                url += "&body=Hello " + nickname + "! You received an invitation to a Planning poker session : ";
                url += encodeURIComponent(Poker.planning.params.APPLICATION_URL + "?page=poker&nickname=" + nickname + "&roomid=" + Poker.planning.RoomManager.currentRoom().id());
                $("#sendInviteLink").attr("href", url);
            }
            else {
                $("#sendInviteLink").attr("href", "#");
            }

        });

        $("#sendInviteLink").bind("touchstart click", function(e) {

            if($(this).attr("href") == "#") {
                e.preventDefault();
                return false;
            }

            $("#inviteFriendModal").modal("hide");
            return true;
        });
    },

    /**
     * Check if the mail given in parameters has the right syntax.
     * @param mail
     * @returns {boolean}
     */
    validateEmail: function (mail)
    {
        if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(mail))
        {
            return (true)
        }
        return (false)
    },

    /**
     * Unsubscribe the current user from all Kuzzle subscriptions.
     */
    unsubscribe: function()
    {
        if(Poker.planning.pokerPage.roomIdSubscription != null) {
            Poker.planning.pokerPage.roomIdSubscription.unsubscribe();
        }

        if(Poker.planning.pokerPage.actionSubscription != null) {
            Poker.planning.pokerPage.actionSubscription.unsubscribe();
        }
    },

    /**
     * This function is call to refresh the screen after the room has been updated.
     */
    display: function()
    {
        var currentRoom = Poker.planning.RoomManager.currentRoom();
        Poker.planning.setTitle(currentRoom.name());

        if(currentRoom.url().trim() != $("input[name=iframeURL]").val().trim()) {
            /*
            if(!$("input[name=iframeURL]").is(":focus")) {
                $("input[name=iframeURL]").val(currentRoom.url().trim());
            }
            */
            $("input[name=iframeURL]").val(currentRoom.url().trim());

            if(currentRoom.url().trim() != "") {
                $("#openLinkButton").css("display", "block");
            }
            else {
                $("#openLinkButton").css("display", "none");
            }
        }

        Poker.planning.activeMenuButtons(["back", "lead", "vote", "remove", "quit", "invite"]);

        // updating user list
        for (var i = 0; i < currentRoom.users().length; i++) {
            if($('.users li[data-user-name="'+currentRoom.users()[i]+'"]').length == 0) {
                $(".users ul").append('<li data-user-name="' + currentRoom.users()[i] + '"><span class="user-picture glyphicon glyphicon-user"></span> ' + currentRoom.users()[i] + '<span class="user-card"></span></li>');
            }
        }

        // removing left users
        $(".users li").each(function(index) {
            var username = $(this).data("user-name");
            if(currentRoom.users().indexOf(username) == -1) {
                $(this).remove();
            }
        });

        // check if current user is in the room, or return to the room list
        if(currentRoom.users().indexOf(Poker.planning.nickname()) == -1) {
            window.location.url = "index.html?page=list&nickname=" + encodeURIComponent(nickname);
        }
    },

    /**
     * Action when the current user click on a poker card during the vote.
     * @param value : the value of the card (text)
     */
    vote: function(value) {
        Poker.planning.kuzzle.dataCollectionFactory(Poker.planning.pokerPage.KUZZLE_POKER_ACTION_COLLECTION).createDocument(
            {
                action: Poker.planning.pokerPage.ACTION_VOTE,
                roomid: Poker.planning.RoomManager.currentRoom().id(),
                user: Poker.planning.nickname(),
                vote: value
            },
            function(error, response) {
                if(error) {
                    console.error("Error in pokerPage.vote function");
                    console.error(error);
                }
            }
        );
    },

    /**
     * Event when the current user receive other users vote values.
     * @param username
     * @param vote : value of the poker card
     */
    receiveUserVote: function( username, vote) {
        this.userVotes[username] = vote;

        if (Poker.planning.pokerPage.isVoting) {
            if (vote == "Pause") {
                this.receivePauseVoteAction();
            }
        } else {
            Poker.planning.pokerPage.displayUserVotes();
        }
    },

    /**
     * Displays other user votes. This function is call after the vote time is expired.
     */
    displayUserVotes: function() {

        for(var user in this.userVotes) {
            $('.users li[data-user-name="'+user+'"]').find(".user-card").text(this.userVotes[user]);
            $('.users li[data-user-name="'+user+'"]').find(".user-card").addClass("active");
        }

    },

    /**
     * Send a Kuzzle notification to all users to launch a vote.
     * This function is triggered when the user clicks on the "launch vote" button in the menu.
     */
    sendLaunchVoteAction: function() {
        if(Poker.planning.pokerPage.isVoting == false) {
            Poker.planning.kuzzle.dataCollectionFactory(Poker.planning.pokerPage.KUZZLE_POKER_ACTION_COLLECTION).createDocument(
            {
                action: Poker.planning.pokerPage.ACTION_LAUNCH_VOTE,
                roomid: Poker.planning.RoomManager.currentRoom().id()
            },
            function(error, response) {
                if(error) {
                    console.error(error);
                }
            });
        }
    },

    /**
     * Displays planning poker cards when a "launch vote" action has been received from kuzzle.
     */
    receiveLaunchVoteAction: function() {
        Poker.planning.pokerPage.isVoting = true;
        $(".users .user-card").removeClass("active");
        $(".cards").fadeIn();
        Poker.planning.pokerPage.userVotes = {};
        this._timeTimeout = setTimeout(function(){$(".time").addClass("active");}, 50);
        this._endVoteTimeout = setTimeout(Poker.planning.pokerPage.endVote, Poker.planning.pokerPage.remainingTime);
        this._remainingTimeInterval = setInterval(Poker.planning.pokerPage.countTime, 1);
    },

    /**
     *  Well, count the time...
     */
    countTime: function(){
        this.remainingTime--;
    },

    /**
     * Displays planning poker cards when a "pause vote" action has been received from kuzzle.
     */
    receivePauseVoteAction: function() {
        clearTimeout(this._timeTimeout);
        clearTimeout(this._endVoteTimeout);
        clearTimeout(this._remainingTimeInterval)
        Poker.planning.pokerPage.isVoting = false;
        $(".users .user-card").removeClass("active");
        $(".cards").fadeOut();
        $(".time").removeClass("active");
        $(".resume").addClass("active");
    },

    /**
     * Hides planning poker cards when the vote is expired.
     */
    endVote: function() {
        $(".cards").fadeOut();
        $(".time").removeClass("active");
        $(".cards a.active").removeClass("active");

        // displaying votes
        Poker.planning.pokerPage.displayUserVotes();
        Poker.planning.pokerPage.isVoting = false;
    },

    /**
     * Removes the current room from kuzzle and return to the homepage.
     * @returns {boolean}
     */
    removeCurrentRoomAndReturnToList: function() {
        if(!confirm("Confirm removal ?")) {
            return false;
        }
        Poker.planning.RoomManager.removeRoom(Poker.planning.RoomManager.currentRoom().id());
    },

    /**
     * Action to click on the "back to list" menu button.
     * Removes the current user from the room and redirect on room list page.
     * @returns {boolean}
     */
    backMenuButtonClick: function() {
        Poker.planning.pokerPage.unsubscribe();
        Poker.planning.RoomManager.currentRoom().removeUser(Poker.planning.nickname(), function() {
            Poker.planning.homePage.redirectToThisPage();
        });
        return false;
    },

    /**
     * Generate a JS redirection to this page. Must be called from another page.
     */
    redirectToThisPage: function() {
        if(Poker.planning.nickname() != false && Poker.planning.RoomManager.currentRoom() != false)  {
            window.location.href = "index.html?page=poker&nickname=" + encodeURIComponent(Poker.planning.nickname()) + "&roomid=" + Poker.planning.RoomManager.currentRoom().id();
        }
        else {
            Poker.planning.loginPage.redirectToThisPage();
        }
    },

    /**
     * Displays invit a friend modal.
     */
    inviteMember: function() {
        $("#inviteFriendModal").modal("show");
    }

}
