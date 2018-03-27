var urlmongo = "mongodb://localhost:27017"
var metaCollection = "media"

// =========================================

var mongo = require('mongodb');
var client = mongo.MongoClient;

client.connect(urlmongo, function (err, client) {
  if (err) {  return console.dir(err); }
  var db = client.db('cdarcha_db');
  console.log('connected...');

  db.collection(metaCollection).ensureIndex({ean13:1}, {w:1}, function(err, result) {
    if (err) {  return console.dir(err); }

    db.collection(metaCollection).ensureIndex({nbn:1}, {w:1}, function(err, result) {
      if (err) {  return console.dir(err); }

      db.collection(metaCollection).ensureIndex({oclc:1}, {w:1}, function(err, result) {
        if (err) {  return console.dir(err); }

        db.collection(metaCollection).ensureIndex({mediaFileId:1}, {w:1}, function(err, result) {
          if (err) {  return console.dir(err); }

          console.log('ok');
          client.close();
        });
      });
    });
  });
});
