#!/bin/bash
mongo  mongotest --eval "db.dropDatabase()"
npm run build
node `dirname $0`/test.js