(function (global) {
'use strict';

var BRUSH_WIDTH               = 12;

var TOUCH_DEVICE              = 'ontouchstart' in global ||
                                'onmsgesturechange' in global;


(function setupController () {
  var body,
    input,
    viewport,
    channel,
    controls,
    lines = [];

  body = document.body;

  function dataHandler (data) {
    if ('c' in data == false) {
      data.c = controls.color;
      channel.send(data);
    }
    viewport.draw(data);
  }
  function localDataHandler (data) {
    dataHandler(data);
    lines.push(data);
  }

  function startMoveHandler () {
    body.className = 'painting online';
  }

  function stopMoveHandler () {
    body.className = 'online';
  }

  function synchronize() {
    if (lines.length > 0 ) {
      channel.write(lines);
      lines = [];
    }
  }

  setInterval(synchronize, 1000);

  channel = new PaintChannel(config);
  controls = new PaintControls(document.getElementById('menu'));
  viewport = new CanvasViewport(document.getElementById('canvas'));
  input = TOUCH_DEVICE ? new TouchInterface(document.getElementById('canvas'))
                       : new PointerInterface(document.getElementById('canvas'));

  input.ondata = localDataHandler;
  input.onstartmove = startMoveHandler;
  input.onstopmove = stopMoveHandler;
  channel.ondata = dataHandler;
  channel.onclear = viewport.clear;
}());



function PaintChannel (config) {
  var
    self = this,
    kuzzle,
    paintCollection,
    userid;

  this.userId = Math.round(Math.random() * Date.now());

  this.send = function (data) {
    var content = {type: 'line', emitter: self.userId, line: JSON.stringify(data)};
    paintCollection.publishMessage(content);
  };

  this.write = function (data) {
    var content = {type: 'lines', emitter: self.userId, timestamp: Date.now(), lines: JSON.stringify(data)};
    paintCollection.createDocument(content);
  };

  this.loadLines = function(query, offset, limit) {

    var
      maxcount = 10000,
      searchQuery = {
        filter: query,
        from: offset,
        size: limit,
        sort: {timestamp: {order: 'asc'}}
    };

    paintCollection.count({query: query}, function (error, result) {
      if (error){
        console.log(error);
        return false
      }
      if (result == 0) {
        return false;
      }

      paintCollection.advancedSearch(searchQuery, function (error, result) {
        if (error) {
          console.log(error);
          return false;
        }
        result.documents.forEach(function(item) {
          item = JSON.parse(item);
          if (item.body && item.body.type == 'lines') {
            var lines = JSON.parse(item.body.lines);
            lines.forEach(function(line) {
              self.ondata(line);
            });
          }
        });
        if ( offset + limit < Math.min(maxcount, result.total)) {
          self.loadLines(query, offset + limit, limit);
        }
      });

    });
  };

  (function setup () {
    var
      filters = {term: {type: 'line'}},
      query = {term: {type: 'lines'}},
      clearFilters = {term: {type: 'clear'}};

    kuzzle = new Kuzzle(config.kuzzleUrl, {
      defaultIndex: config.appIndex,
      autoReconnect: true,
      ioPort: 7511,
      wsPort: 7513
    });
    paintCollection = kuzzle.dataCollectionFactory('paint');

    var newLineNotif = function (error, response) {
      self.ondata(JSON.parse(response.result._source.line));
    };

    var clearNotif = function (error, result) {
      self.onclear();
    };

    paintCollection.subscribe(filters, newLineNotif);
    paintCollection.subscribe(clearFilters, clearNotif);
    self.loadLines(query, 0, 50);

  }());
}


function TouchInterface (target) {
  var
   self = this,
   moves = null;

  function translate (t) {
    var target = t.target;
    return { x: (t.pageX - (target.parentNode.offsetLeft +
                            target.parentNode.offsetTop)) *
                    (target.width / target.clientWidth),
             y: (t.pageY - target.parentNode.offsetTop) *
                    (target.height / target.clientHeight) };
  }

  document.addEventListener('touchstart', function (event) {
    if (!event.target.control) {
      event.preventDefault();
    }
  });

  // Fix issue with iOS devices and orientation change
  window.addEventListener('orientationchange', function() {
    window.scrollTo(0, 0);
  });

  target.addEventListener('touchstart', function (event) {
    var touch;

    self.onstartmove();

    event.preventDefault();

    moves = moves || {};

    for (var i = 0; i < event.changedTouches.length; i++) {
      touch = event.changedTouches[i];
      console.log(translate(touch));
      moves[touch.identifier] = translate(touch);
    }
  });

  target.addEventListener('touchmove', function (event) {
    var
     touch,
     move,
     pos;

    if (!moves) {
      return;
    }

    event.preventDefault();

    for (var i = 0; i < event.changedTouches.length; i++) {
      touch = event.changedTouches[i];

      if (!(move = moves[touch.identifier])) {
        continue;
      }

      pos = translate(touch);
      self.ondata({ x: pos.x, y: pos.y, px: move.x, py: move.y });
      moves[touch.identifier] = pos;
    }
  });

  target.addEventListener('touchend', function (event) {
    var touch;

    self.onstopmove();

    if (!moves) {
      return;
    }

    event.preventDefault();

    for (var i = 0; i < event.changedTouches.length; i++) {
      touch = event.changedTouches[i];
      if (touch.identifier in moves) {
        delete moves[touch.identifier];
      }
    }

    if (Object.keys(moves) == 0) {
      moves = null;
    }
  });
}


function PointerInterface (target) {
  var
    self = this,
    state = null;

  function translate (e) {
    return { x: (e.offsetX || e.layerX) * (target.width / target.clientWidth),
             y: (e.offsetY || e.layerY) * (target.height / target.clientHeight)};
  }

  function handler (name, callback) {
    if (target.attachEvent) {
      target.attachEvent('on' + name, callback);
    } else {
      target.addEventListener(name, callback);
    }
  }

  handler('mousedown', function (event) {

    self.onstartmove();

    state = translate(event);

    return false;
  });

  handler('mousemove', function (event) {
    var pos;

    if (!state) {
      return;
    }

    pos = translate(event);
    self.ondata({ x: pos.x, y: pos.y, px: state.x, py: state.y });
    state = pos;

    return false;
  });

  handler('mouseup', function (event) {
    self.onstopmove();
    state = null;
    return false;
  });
}


function CanvasViewport (target) {
  var context;

  if (typeof G_vmlCanvasManager == 'object') {
    G_vmlCanvasManager.initElement(target);
  }

  context = target.getContext('2d');

  target.style.transform = "translatez(0)";
  target.onselectstart = function() { return false; };

  this.draw = function (data) {
    context.strokeStyle = data.c;
    context.beginPath();
    context.moveTo(data.px, data.py);
    context.lineTo(data.x, data.y);
    context.lineWidth = BRUSH_WIDTH;
    context.lineCap = 'round';
    context.stroke();
  };

  this.clear = function() {
    context.clearRect(0, 0, target.width, target.height);
  }

}


function PaintControls (target) {
  var
    self = this,
    users,
    all,
    alls,
    initial,
    menu;

  users = document.getElementById('users-online');
  menu = document.getElementById('menu-expander');

  all = target.getElementsByTagName('input');
  initial = all[0];

  this.color = initial.value;

  this.setOnlineUsers = function (value) {
    users.innerHTML = value;
  };

  function onmenuclick () {
    target.className = target.className ? '' : 'visible';
    return false;
  }

  function onchange (event) {
    if (event.preventDefault) {
      event.preventDefault();
    }
    self.color = event.target.value;
  }

  if (target.addEventListener) {
    target.addEventListener('change', onchange);
    menu.addEventListener('touchstart', onmenuclick);
    menu.addEventListener('click', onmenuclick);
  } else {
    all = target.getElementsByTagName('label');
    for (var i = 0; i < all.length; i++) {
      (function (label) {
        label.attachEvent('onclick', function () {
          var input = document.getElementById(label.getAttribute('for'));
          onchange({ target: input });
        });
      }(all[i]));
    }
    menu.attachEvent('onclick', onmenuclick);
  }
}

}(this));
