/// version 1

/// mongodb://url:port/database  - spojeni na mongodb
var urlmongo = "mongodb://127.0.0.1:27017"
/// timeout dotazu na backend (ms)
var timeout = 15 * 1000;

/// port frontendu HTTP / HTTPS
var frontPortHttp = 1337;
var frontPortHttps = 1338;

// =========================================

/// CD Archa server v1
var srv = require('cdarcha1_server');

/// node.js moduly
var mongo = require('mongodb');
var client = mongo.MongoClient;
var request = require('request');
var http = require('http');
var https = require('https');
var fs = require('fs');

/// soukromy klic, certifikat a intermediate certifikat; vse pro HTTPS
var httpsOptions = {
  key: fs.readFileSync('cert/serverkey.pem'),
  cert: fs.readFileSync('cert/cache.cdarcha.pem'),
  ca: [ fs.readFileSync('cert/tcs-ca-bundle.pem') ]
};

// **********************************************
// * Navazani komunikace s MongoDB
// * Nactenu prav pristupu
// * Vytvoreni HTTP a HTTPS serveru
// **********************************************

client.connect(urlmongo, function (err, client) {
  if (err) {  return console.dir(err); }
  var db = client.db('cdarcha_db');
  console.log('mongodb connected...');

  var arg1 = process.argv.slice(2);
  var test = false;
  if (arg1=='-t' || arg1=='--test') test = true; // priznak testovaciho prostredi

  // HTTP
  http.createServer(function (req, response) {
    srv.server(req, response, db);
  }).listen(frontPortHttp);

  // HTTPS
  https.createServer(httpsOptions, function (req, response) {
    srv.server(req, response, db);
  }).listen(frontPortHttps);

});
