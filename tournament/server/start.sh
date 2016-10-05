#!/bin/sh

DIR=$(dirname "$(readlink -f "$0")")
cd "$DIR/.."

npm install
npm install -g bower
bower install --allow-root

while ! curl -s -o /dev/null http://proxy:7511/api/1.0; do
  echo "waiting for kuzzle"
  sleep 5
done

while true; do
  node ./server/tournament_server.js
done

