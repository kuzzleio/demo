var kuzzle = new Kuzzle(config.kuzzleUrl, {
  defaultIndex: config.index,
  ioPort: 7512,
  wsPort: 7513
});
var kuzzleChannel = "chooseyourday";

var chooseYourDay = angular.module("chooseyourday", [
  "ngRoute",
  "ui.bootstrap.datetimepicker"
]);

chooseYourDay.config(["$routeProvider",
  function ($routeProvider) {
    $routeProvider.when("/ListEvent", {
      templateUrl: "templates/event_list.html",
      controller: "ListEventController"
    }).when("/Event/:eventId", {
      templateUrl: "templates/event_show.html",
      controller: "EventController"
    }).otherwise({
      redirectTo: "/ListEvent"
    });
  }
]);

chooseYourDay.controller("ListEventController", ["$scope", "$location", function ($scope, $location) {
  $scope.events = [];
  $scope.room = null;
  $scope.viewForm = false;
  $scope._event = null;
  $scope.isNew = false;

  $scope.init = function () {
    $scope.getAllEvents();
    moment.locale('en');

    kuzzle
      .dataCollectionFactory(kuzzleChannel)
      .subscribe({"term": {type: "chooseyourday_event"}}, function (error, response) {
        if (error) {
          console && console.error(error);
          return false;
        }

        if (response.action === "create") {
          $scope.addToList(response.result._id, response.result._source);
        }

        if (response.action === "delete") {
          $scope.events.some(function (event, index) {
                                                       if (event._id === response.result._id) {
                                                       $scope.events.splice(index, 1);
                                                       return true;
                                                       }
                                                       });
        }

        if (response.action === "update") {
          $scope.events.some(function (event, index) {
                                                       if (event._id === response.result._id) {
                                                       $scope.events[index].name = response.result._source.name;
                                                       $scope.events[index].dates = response.result._source.dates;
                                                       return true;
                                                       }
                                                       });
        }

        $scope.$apply();
      })
      .onDone(function(error, room) {
        if (error && console) {
          return console.error(error);
        }

        $scope.room = room;
      });
  };

  $scope.$on("$destroy", function () {
    $scope.room.unsubscribe();
  });

  $scope.getAllEvents = function () {
    kuzzle.dataCollectionFactory(kuzzleChannel).advancedSearch({"filter": {"term": {type: "chooseyourday_event"}}}, function (error, response) {
      if (error) {
        console.error(error);
        return false;
      }

      response.documents.forEach(function (event) {
        $scope.addToList(event.id, event.content);
      });

      $scope.$apply();
    });
  };

  $scope.addToList = function (id, data) {
    var _event = {
      "_id": id,
      "name": data.name,
      "dates": data.dates
    };

    $scope.events.push(_event);
  };

  $scope.delete = function (index) {
    kuzzle.dataCollectionFactory(kuzzleChannel).deleteDocument($scope.events[index]._id);
  };

  $scope.newEvent = function () {
    $scope.isNew = true;
    $scope.viewForm = true;
    $scope._event = {
      "name": "",
      "dates": []
    };
    $scope.addADay();
  };

  $scope.showEvent = function (id) {
    $location.path("/Event/" + id);
  };

  $scope.editEvent = function (id) {
    $scope.isNew = false;
    $scope.viewForm = true;
    kuzzle.dataCollectionFactory(kuzzleChannel).fetchDocument(id, function (error, response) {
      if (error) {
        console.error(error);
        return false;
      }

      $scope._event = {
        "_id": response.id,
        "name": response.content.name,
        "dates": response.content.dates
      };

      $scope.$apply();
    });
  };

  $scope.addADay = function (value) {
    if (typeof (value) === "undefined") value = "";
    var i = $scope._event.dates.length;
    $scope._event.dates[i] = {"value": value, "active": true};
  };

  $scope.removeADay = function (index) {
    if ($scope.isNew) {
      if (index !== 0) {
        $scope._event.dates.splice(index, 1);
      }
    } else {
      $scope._event.dates[index].active = false;
    }
  };

  $scope.addEvent = function () {
    if ($scope.isNew) {
      kuzzle.dataCollectionFactory(kuzzleChannel).createDocument({
        "type": "chooseyourday_event",
        "name": $scope._event.name,
        "dates": $scope._event.dates
      });
    } else {
      kuzzle.dataCollectionFactory(kuzzleChannel).updateDocument($scope._event._id, {
        "type": "chooseyourday_event",
        "name": $scope._event.name,
        "dates": $scope._event.dates
      });
    }

    $scope._event = null;
    $scope.viewList();
  };

  $scope.viewList = function () {
    $scope.viewForm = false;
  }

}]);

chooseYourDay.controller("EventController", ["$scope", "$location", "$routeParams", function ($scope, $location, $routeParams) {
  $scope.currentEvent = null;
  $scope.participants = [];
  $scope.editingParticipant = "new";
  $scope.newParticipant = null;
  $scope.room = null;

  $scope.init = function () {
    kuzzle.dataCollectionFactory(kuzzleChannel).fetchDocument($routeParams.eventId, function (error, response) {
      if (error) {
        console.error(error);
        return false;
      }

      $scope.currentEvent = {
        "_id": response.id,
        "type": response.content.type,
        "name": response.content.name,
        "dates": response.content.dates
      };

      $scope.initNewParticipant();

      $scope.getAllParticipants();
      $scope.subscribeParticipants();

      $scope.$apply();
    });
  };

  $scope.createParticipant = function () {
    kuzzle.dataCollectionFactory(kuzzleChannel).createDocument({
      "type": "chooseyourday_p",
      "name": $scope.newParticipant.name,
      "answers": $scope.newParticipant.answers,
      "event": $scope.newParticipant.event
    }, (err, result) => {
      if (err) {
        console.error(err);
        return false;
      }
    });
    $scope.initNewParticipant();
  };

  $scope.removeParticipant = function (index) {
    kuzzle.dataCollectionFactory(kuzzleChannel).deleteDocument($scope.participants[index]._id);
  };

  $scope.initNewParticipant = function () {
    $scope.newParticipant = {
      "type": "chooseyourday_p",
      "name": "",
      "answers": [],
      "event": $scope.currentEvent._id
    };

    angular.forEach($scope.currentEvent.dates, function (value, key) {
      var i = $scope.newParticipant.answers.length;
      $scope.newParticipant.answers[i] = {"value": false};
    });
  };

  $scope.editParticipant = function (index) {
    $scope.editingParticipant = index;
  };

  $scope.updateParticipant = function (participant) {
    kuzzle.dataCollectionFactory(kuzzleChannel).updateDocument(participant._id, {
      "name": participant.name,
      "answers": participant.answers
    });
    $scope.editingParticipant = 'new';
  };

  $scope.toggleDate = function (date) {
    date.value = !date.value;
  };

  $scope.getAllParticipants = function () {
    var filter = {
      "filter": {
        "and": [
          {"term": {"type": "chooseyourday_p"}},
          {"term": {"event": $scope.currentEvent._id}}
        ]
      }
    };

    kuzzle.dataCollectionFactory(kuzzleChannel).advancedSearch(filter, function (error, response) {
      if (error) {
        console.error(error);
        return false;
      }

      response.documents.forEach(function (participant) {
        $scope.addToParticipants(participant.id, participant.content);
      });
      $scope.$apply();
    });
  };

  $scope.subscribeParticipants = function () {
    var terms = {
      "and": [
        {"term": {"type": "chooseyourday_p"}},
        {"term": {"event": $scope.currentEvent._id}}
      ]
    };

    kuzzle
      .dataCollectionFactory(kuzzleChannel)
      .subscribe(terms, function (error, response) {
        if (error) {
          console && console.error(error);
          return false;
        }

        if (response.action === "create") {
          $scope.addToParticipants(response.result._id, response.result._source);
        }

        if (response.action === "delete") {
          $scope.participants.some(function (participant, index) {
                                                                   if (participant._id === response.result._id) {
                                                                   $scope.participants.splice(index, 1);
                                                                   return true;
                                                                   }
                                                                   });
        }

        if (response.action === "update") {
          $scope.participants.some(function (participant, index) {
                                                                   if (participant._id === response._id) {
                                                                   $scope.participants[index].name = response._source.name;
                                                                   $scope.participants[index].answers = response._source.answers;
                                                                   return true;
                                                                   }
                                                                   });
        }

        $scope.$apply();
      })
      .onDone(function (error, room) {
        if (error && console) {
          return console.error(error);
        }

        $scope.room = room;
      });
  };

  $scope.$on("$destroy", function () {
    $scope.room.unsubscribe();
  });

  $scope.addToParticipants = function (id, data) {
    var newParticipant = {
      "type": "chooseyourday_p",
      "_id": id,
      "name": data.name,
      "answers": data.answers,
      "event": data.event
    };

    if (typeof newParticipant.answers == "undefined") {
      newParticipant.answers = [];
    }

    while (newParticipant.answers.length < $scope.currentEvent.dates.length) {
      var i = newParticipant.answers.length;
      newParticipant.answers[i] = {"value": false};
    }

    $scope.participants.push(newParticipant);
  };

  $scope.changeView = function (view) {
    $location.path(view);
  };
}]);
