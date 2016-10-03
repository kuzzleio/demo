/**
 * This Todo List demo is based on the Kuzzle JS SDK 1.6.3
 */
angular.module("KuzzleTodoDemo", [])
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
    console && console.log('listening to ', config.appIndex, ' / ', config.todoCollection);
    return kuzzle.dataCollectionFactory(config.todoCollection);
  }])
  .controller("KuzzleTodoController", ["$scope", 'kuzzleMessagesCollection', function($scope, kuzzleMessagesCollection) {
    $scope.newTodo = null;
    $scope.todos = [];

    $scope.init = function () {
      console && console.log('subscribing');
      kuzzleMessagesCollection.subscribe({}, function (error, response) {
          if (error) {
            console && console.error("[Kuzzle]:" + error.message);
            return;
          }
          console && console.log('RESPONSE = ', response);
          // In case the action is "create", we call the addToList action
          if(response.action === "create") {
            var newTodo = {
              _id: response.result._id,
              label: response.result._source.label,
              done: response.result._source.done
            };

            addToList(newTodo);
          }

          // A todo has been removed, we splice the angular model for remove the entry in array
          if(response.action === "delete") {
            $scope.todos.some(function(todo, index) {
              if(todo._id === response.result._id) {
                $scope.todos.splice(index, 1);
                return true;
              }
            });
          }

          // In case the action is "update", we replace in the angular model with the new one
          if(response.action === "update") {
            $scope.todos.some(function(todo, index) {
              if(todo._id === response.result._id) {
                $scope.todos[index].done = response.result._source.done;
                return true;
              }
            });
          }
          $scope.$apply();
        })
        .onDone(function (error) {
          if (error) {
            console && console.error(error);
          }
        });

      getAllTodos();
    };

    var initFixtures = function () {
      var fixtures = [
        { "label": "Install Kuzzle", "done": true },
        { "label": "Start TODO List demo", "done": true },
        { "label": "Learn how to extend Kuzzle", "done": false }
      ];

      kuzzleMessagesCollection.deleteDocument("is_virgin");
      angular.forEach(fixtures, function (fixture) {
        kuzzleMessagesCollection.createDocument({
          type: "todo",
          label: fixture.label,
          done: fixture.done
        });
      });
    };

    var getAllTodos = function() {
      kuzzleMessagesCollection.fetchDocument("is_virgin", function (error) {
        if (!error) {
          // we got a document with id is_virgin, we inject the fixtures.
          return initFixtures();
        }

        kuzzleMessagesCollection.advancedSearch({}, function (error, response) {
          if (error) {
            console && console.error("[Kuzzle]:" + error.message);
            return;
          }

          response.documents.forEach(function (todo) {
            var newTodo = {
              _id: todo.id,
              label: todo.content.label,
              done: todo.content.done
            };
            $scope.todos.push(newTodo);
          });

          $scope.$apply();
        });
      });
    };

    /**
     * This function is triggered when the user click on 'add' button or press enter
     */
    $scope.addTodo = function() {
      kuzzleMessagesCollection.createDocument(
        {type: "todo", label: $scope.newTodo.label, done: false},
        {updateIfExist: false}
      );
      $scope.newTodo = null;
    };

    /**
     * Triggered when the user check/uncheck the 'done' checkbox
     * This function will update the document in Kuzzle
     *
     * @param index
     */
    $scope.toggleDone = function(index) {
      kuzzleMessagesCollection.updateDocument($scope.todos[index]._id, {done: !$scope.todos[index].done});
    };

    /**
     * Triggered when the user click on trash button
     * This function will delete the document in Kuzzle
     *
     * @param index
     */
    $scope.delete = function(index) {
      kuzzleMessagesCollection.deleteDocument($scope.todos[index]._id);
    };

    /**
     * Add the document in Kuzzle
     *
     * @param todo
     */
    var addToList = function(todo) {
      $scope.todos.push(todo);
    };

  }]);
