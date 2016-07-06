
Poker = {};
Poker.planning = {

    params: {
        // Contains the nickname of the current user
        nickname: false,

        KUZZLE_SERVER: "http://localhost:7512",

        KUZZLE_INDEX: "planningpoker",

        // URL of the application, ex: http://www.poker.kaliop.com/index.html
        // DO NOT ADD SLASH AT THE END
        APPLICATION_URL: "http://localhost/index.html",

        // delay of vote in milliseconds
        VOTE_DELAY: 10000
    },

    kuzzle: false,

    /**
     * Main function of the application
     */
    run: function() {

        this.kuzzle = new Kuzzle(config.kuzzleUrl, {defaultIndex: config.index});

        // activating bootstrap tooltips
        $('[data-toggle="tooltip"]').tooltip();

        // click event for main menu action button
        $('a[data-action="back"]').bind("touchstart click", function(e) {
            e.preventDefault();
            Poker.planning.pokerPage.backMenuButtonClick();
        });

        $('a[data-action="vote"]').bind("touchstart click", function(e) {
            e.preventDefault();
            Poker.planning.pokerPage.sendLaunchVoteAction();
        });

        $('a[data-action="remove"]').bind("touchstart click", function(e) {
            e.preventDefault();
            Poker.planning.pokerPage.removeCurrentRoomAndReturnToList();
        });

        $('a[data-action="quit"]').bind("touchstart click", function(e) {
            e.preventDefault();
            Poker.planning.disconnect();
        });

        $('a[data-action="invite"]').bind("touchstart click", function(e) {
            e.preventDefault();
            Poker.planning.pokerPage.inviteMember();
        });


        // function to execute after rooms have been loaded from Kuzzle
        var postConfig = function() {
            // loading GET parameters
            var page = Poker.planning.getParameter("page");
            switch(page) {

                case "list":
                    Poker.planning.homePage.load();
                    break;

                case "poker":
                    Poker.planning.pokerPage.load();
                    break;

                default: // login page
                    Poker.planning.loginPage.load();
                    break;
            }

        }

        // loading existing rooms
        Poker.planning.RoomManager.loadRooms(postConfig);
    },

    /**
     * Loads html code available at the given URL and append it into div#content tag.
     * @param url
     * @param callback
     */
    loadPage: function(url, callback)
    {
        $.ajax({
            url: url,
            dataType: 'html',
            success: function(data, textStatus, jqXHR) {
                $('#content').html(data);
                callback();
            },
        })
    },

    /**
     * Helper for getting GET parameters
     * @param variable
     * @returns string
     */
    getParameter: function(variable)
    {
        var query = decodeURIComponent(window.location.search).substring(1);
        var vars = query.split("&");
        for (var i=0;i<vars.length;i++) {
            var pair = vars[i].split("=");
            if(pair[0] == variable){return pair[1];}
        }
        return(false);
    },

    /**
     * Get or Set the current user nickname
     * @param nickname
     * @returns string|boolean
     */
    nickname: function(nickname)
    {
        if(nickname != undefined) {
            this.params.nickname = nickname;
            $(".user-nickname").text("Hello " + nickname);
        }
        return this.params.nickname;
    },

    /**
     * Remove the user from current room and redirect to login page
     * @returns {boolean}
     */
    disconnect: function() {
        if(!confirm("Do you want to quit ?")) {
            return false;
        }

        if(Poker.planning.RoomManager.currentRoom() != false) {
            Poker.planning.pokerPage.unsubscribe();
            Poker.planning.RoomManager.currentRoom().removeUser(this.nickname(), function() {
                Poker.planning.loginPage.redirectToThisPage();
            });
        }
        else {
            Poker.planning.nickname(false);
            Poker.planning.loginPage.redirectToThisPage();
        }

    },

    /**
     * Set the H1 title of the page.
     * @param title
     */
    setTitle: function(title) {
        $("#header h1").text(title);
    },

    /**
     * Activate only certains buttons in the menu. Give in parameter an array containing data-action values.
     * Ex: ["vote", "quit"] => activate buttons which have data-action="vote" or data-action="quit" values.
     * @param buttons
     */
    activeMenuButtons: function(buttons)
    {
        $(".menu li.active").removeClass("active");
        for(var i = 0; i < buttons.length; i++) {
            $(".menu a[data-action="+buttons[i]+"]").parent().addClass("active");
        }
    },
}

$(document).ready(function() {
    Poker.planning.run();
});
