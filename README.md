# Vermongo Mongoose Plugin

[![npm version](https://badge.fury.io/js/mongoose-vermongo.svg)](https://badge.fury.io/js/mongoose-vermongo)[![Build Status](https://travis-ci.org/TheCodela/mongoose-vermongo.svg?branch=master)](https://travis-ci.org/TheCodela/mongoose-vermongo)  

Keeps history for mongoose documents.  

Spec for Vermongo [[link](https://github.com/thiloplanz/v7files/wiki/Vermongo)]

## Installation
```
npm install mongoose-vermongo
```

## Usage
```javascript  
var mongoose = require('mongoose');
var vermongo = require('mongoose-vermongo');
mongoose.Promise = require('bluebird');

var Schema = mongoose.Schema;

var pageSchema = new Schema({
  title : { type : String, required : true},
  content : { type : String, required : true },
  path : { type : String, required : true},
  tags : [String],

  lastModified : Date,
  created : Date
});
pageSchema.plugin(vermongo, "pageschemas.vermongo");

mongoose.connect("mongodb://localhost:27017/mongotest");
mongoose.connection.on('error', () => {
  console.log(`MongoDB connection error. Please make sure MongoDB is running.`);
  process.exit();
});

mongoose.connection.on('connected', () => {
  const Page = mongoose.model('PageSchema', pageSchema);
  var page = new Page({ title: "test", content: "foobar", path: "lala", tags: ["a", "b"] });
  page.save()
    .then((page) => { page.title = "test 2"; return page.save(); })
    .then((page) => { return page.remove(); })
    .then((page) => { process.exit(); })
    .catch((err) => { console.log(err); process.exit(); })
});
```

Which will result in two Collections,

### pageschemas  
There will be 0 records

### pageschemas.vermongo
There will be 3 records:  

```javascript
{
    "_id" : {
        "_version" : 1,
        "_id" : ObjectId("589dd2b21dd3a1d7ef101e98")
    },
    "title" : "test",
    "content" : "foobar",
    "path" : "lala",
    "_version" : 1,
    "tags" : [ 
        "a", 
        "b"
    ]
}

/* 2 */
{
    "_id" : {
        "_version" : 2,
        "_id" : ObjectId("589dd2b21dd3a1d7ef101e98")
    },
    "title" : "test 2",
    "content" : "foobar",
    "path" : "lala",
    "_version" : 2,
    "tags" : [ 
        "a", 
        "b"
    ]
}

/* 3 */
{
    "_id" : {
        "_version" : 3,
        "_id" : ObjectId("589dd2b21dd3a1d7ef101e98")
    },
    "_version" : -1,
    "tags" : []
}
```

## LICENSE

[MIT License](./LICENSE.md)
