var urlmongo = "mongodb://localhost:27017/cdarcha_db"
var metaCollection = "media"

// =========================================

var mongo = require('mongodb');
var client = mongo.MongoClient;

client.connect(urlmongo, function (err, db) {
  if (err) {  return console.dir(err); }

  db.collection(metaCollection).ensureIndex({ean13:1}, {w:1}, function(err, result) {
    if (err) {  return console.dir(err); }

    db.collection(metaCollection).ensureIndex({nbn:1}, {w:1}, function(err, result) {
      if (err) {  return console.dir(err); }

      db.collection(metaCollection).ensureIndex({oclc:1}, {w:1}, function(err, result) {
        if (err) {  return console.dir(err); }

        db.collection(metaCollection).ensureIndex({mediaFileId:1}, {w:1}, function(err, result) {
          if (err) {  return console.dir(err); }

          console.log('ok');
          db.close();
        });
      });
    });
  });
});
