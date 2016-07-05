var config = {
    kuzzleUrl: 'http://localhost:7512',
    index: 'cabble',
    collections: {
        names: {
            users: 'users',
            rides: 'rides'
        },
        mapping: {
            users: {
                pos: {type: 'geo_point'},
                type: {type: 'string', index: 'analyzed', null_value: 'none'},
                status: {type: 'string', index: 'analyzed'},
                sibling: {type: 'string', index: 'analyzed', null_value: 'none'}
            },
            rides: {
                from: {type: 'string'},
                to: {type: 'string'},
                status: {type: 'string'}
            }
        }
    },
    map: {
        defaultZoom: 16,
        defaultLoc: {lat: 48.8566140, lon: 2.352222}
    },
    cabble: {
        distanceFilter: 5000
    }
};
