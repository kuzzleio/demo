
/*
    Javascript code of login page : the user muse enter his nickname before getting in the application.
 */
Poker.planning.loginPage = {

    /**
     * Loads the template loginPage.html
     */
    load: function() {
        Poker.planning.loadPage("templates/loginPage.html", Poker.planning.loginPage.run);
    },

    /**
     * Add events after the template has been loaded.
     */
    run: function() {
        Poker.planning.activeMenuButtons([]);
        Poker.planning.setTitle("Welcome to Kuzzle Planning Poker");

        $("body").addClass("login");
        $('.form-login').submit(function(){
            var input = $('.form-login input[type=text]');

            if(input.val() != "") {
                window.location.href = "index.html?page=list&nickname=" + encodeURIComponent(input.val());
            }

            return false;
        });

    },

    redirectToThisPage: function() {
        window.location.href = "index.html";
    }
}
