# Tutorial - geoSpatial

This tutorial will try to show you how to make some geospatial searchs and filters with the Cabble demo as an example.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of content**

- [Before to start](#before-to-start)
- [Advanced search](#advanced-search)
- [Subscriptions](#subscriptions)
  - [Keep moving](#keep-moving)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Before to start

Since Kuzzle is using ElasticSearch as a datastorage, geospatial search and filters will need to have the right mapping in ElasticSearch.

To do so, you have the choice between:

* put the mapping before your application starts
* put the mapping when the first client connects

As we wanted the Cabble demo as simple as possible, we've choosen the second choice: at the very early stage of the application launch, we retrieve the mapping of the geospatial collection, test if the geospatial field is right, and if not, we put the right mapping into it.

Here is an example:

```js
var collection;
var mapping = {
    pos: {type: 'geo_point'}, // <- this is our geospatial field
    type: {type: 'string', index: 'analyzed', null_value: 'none'},
    status: {type: 'string', index: 'analyzed', null_value: 'none'}
};

var kuzzle = new Kuzzle(
  'http://localhost:7512',
  {autoReconnect: true, defaultIndex: 'cabble'},
  function(err, res) {
    // handle a collection named "users"
    collection = kuzzle.dataCollectionFactory('users');
    // get the current mapping
    collection.getMapping(function(err, res) {
      if (res === undefined) {
        // if the collection does not exists yet
        // of have been created but have nor mapping or document in it
        // res will be === undefined
        collection.putMapping(mapping, function(err, res){
          // handle errors etc
        });		
      } else {
        // the collection already have a mapping...
        // here you may have a problem since ElasticSearch will refuse
        // to put the geo_point type on some kind of fields
        // the best solution here is to empty the collection then
        // to put the mapping
        collection.delete(function (err, res) {
          collection = kuzzle.dataCollectionFactory('users');
          collection.putMapping(mapping, function(err, res){
            // handle errors etc
          });		
        });
      }
    });
  }
);
```

Please refer to the [ElasticSearch documentation](https://www.elastic.co/guide/en/elasticsearch/reference/2.2/geo-point.html) to learn how to write the mapping.

**Remember:** no geospatial search or filter will work without the right mappings

## Advanced search

In Cabble, when a new user is connecting, we need to populate the map with the other relevant actually connected users. To do so, we do an advanced search with a geospatial filter.

Here is an example of such a query:

```javascript
var query = {
  query: {
    terms: {
      // lets say that the user is curently a cab
      // it is useful to see all types of users
      type: ['customer', 'cab']
    }
  },
  filter: {
    and: [
      {
        terms: {
          // we want to see all those kind of statuses
          status: ['idle', 'wanttohire', 'tohire', 'riding']
        }
      },
      {
        // we want to see only people in a range of 10 kilometers
        // around the curent user location
        geo_distance: {
          distance: '10km',
          pos: {
            lat: 43.607478,
            lon: 3.912804
          }
        }
      }
    ]
  }
};
collection.advancedSearch(query, function (err, res) {
// res will be like:
{
  documents: [ an array of kuzzle documents],
  total: the number of matching documents
}
});

```

You can refer to the [ElasticSearch Filters documentation](https://www.elastic.co/guide/en/elasticsearch/reference/2.2/query-dsl-geo-bounding-box-query.html) to learn more about the geospatial filters.

## Subscriptions

In order to be warned when a new user is entering the current scope (10km around the current user position) and put it onto the map, we need to create a room, like a kind of chatroom, based on a filter.

Fortunately, the [Kuzzle DSL](http://kuzzle.io/guide/#filtering-syntax) is matching the ElasticSearch DSL so that the subscription filter is quite the same as the advanced search.

The [subscription](http://kuzzle.io/sdk-documentation/#subscribe) is done like this:

```javascript
var filter: {
  and: [
    terms: {
      // note this terms is now into the and close
      type: ['customer', 'cab']
    },
    {
      terms: {
        status: ['idle', 'wanttohire', 'tohire', 'riding']
      }
    },
    {
      geo_distance: {
        distance: '10km',
        pos: {
          lat: 43.607478,
          lon: 3.912804
        }
      }
    }
  ]
};

var room = collection.subscribe(
  filter,
  {subscribeToSelf: false},
  function(err, res) {
    // this callback will be called each time a new document is
    // changing (entering or exiting the scope too)
    // res is a kuzzle document
  }
);

```

**Note:** Of course, each time the current user is moving, you'll need to unsubscribe to the room and subscribe to another based on the new user coordinates. See the next chapter

### Keep moving

If the user moves, we need to refresh the search zone. This means that we have to unsubscribe to the current room, then to resubscribe to a new one. Sounds heavy, but it is not: we can use the [renew](http://kuzzle.io/sdk-documentation/#renew) method on the room with a new filter to automagically do all the process.
