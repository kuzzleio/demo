# Kuzzle chat demo 102 - Adding the user count

In this second part of our chat demo tutorial, we will add a small new functionality displaying the number of users currently connected to the room.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**

- [Sources](#sources)
- [Extending the ChatRoom model object](#extending-the-chatroom-model-object)
- [Adding the front-end logic](#adding-the-front-end-logic)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Sources

The complete source files can be found in our [Github repository](https://github.com/kuzzleio/demo/tree/master/chat).

* [html](https://github.com/kuzzleio/demo/tree/master/chat/102.html)
* [javascript](https://github.com/kuzzleio/demo/tree/master/chat/js/app.102.js)

## Extending the ChatRoom model object

We add a new refreshUserCount method to our ChatRoom constructor.

```javascript
js/app.102.js --
/**
 * Get the number of simultaneous users connected to the room
 */
ChatRoom.prototype.refreshUserCount = function () {
  var self = this;

  if (!this.kuzzleSubscription) {
    return;
  }
  this.kuzzleSubscription.count(function (err, result) {
    self.userCount = result.count;
    $rootScope.$apply();
  });
};
```

This method calls the [KuzzleRoom count](http://kuzzle.io/sdk-documentation/#count73) method to get the number of subscribers.

We then need to slightly modify our constructor to add the new userCount property and call the newly created method.

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

  this.subscribe();

  this.refreshUserCount();
  setInterval(function () {
    self.refreshUserCount();
  }, 2000);
}
```

NB: The subscribers count method is not implemented as a real-time event in Kuzzle.
We need to call it on a regular basis, here using a setInterval to periodically refresh the counter.

## Adding the front-end logic

As we extend the business ChatRoom object bound to the front-end, no additional action is needed on the javascript side.

We can just use the newly defined property directly in our html template:

```html
102.html --
<div class="row collapse statusbar">
  <div class="small-12 columns">Main Room:
    <ng-pluralize count="chat.chatRoom.userCount"
                  when="{'0': 'No user',
                    '1': '1 user',
                    'other': '{} users'}">
    </ng-pluralize>
  </div>
</div>
```
