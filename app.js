/// version 1.18.10

/// mongodb://url:port/database  - spojeni na mongodb
var urlmongo = 'mongodb://localhost:27017';
var mongodb = 'cdarcha_db';
/// timeout dotazu na backend (ms)
var timeout = 15 * 1000;

/// port frontendu HTTP / HTTPS
var frontPortHttp = 1337;
var frontPortHttps = 1338;

// =========================================

/// CD Archa server v1
var okcz = require('cdarcha1_server');

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
  cert: fs.readFileSync('cert/cache.obalkyknih.cz-1404285806.pem'),
  ca: [ fs.readFileSync('cert/tcs-ca-bundle.pem') ]
};

// **********************************************
//   Serverova cast Front-End API obalkyknih.cz
// **********************************************
// * Navazani komunikace s MongoDB
// * Nactenu prav pristupu
// * Vytvoreni HTTP a HTTPS serveru
// **********************************************

client.connect(urlmongo, function (err, client) {
  if (err) {  return console.dir(err); }
  var db = client.db(mongodb);

  var arg1 = process.argv.slice(2);
  var test = false;
  if (arg1=='-t' || arg1=='--test') test = true; // priznak testovaciho prostredi

  // HTTP
  http.createServer(function (req, response) {
    okcz.server(req, response, db);
  }).listen(frontPortHttp);

  // HTTPS
  https.createServer(httpsOptions, function (req, response) {
    okcz.server(req, response, db);
  }).listen(frontPortHttps);

});
