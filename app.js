/// CD Archa server v1
const cdarcha = require('cdarcha_server');

/// node.js moduly
const request = require('request');
const http = require('http');
const https = require('https');
const fs = require('fs');
const dotenv = require('dotenv');

// nacteni konfigurace
dotenv.config({ path: '.env' });

const MongoClient = require('mongodb').MongoClient;
const client = new MongoClient(process.env.MONGODB_URI, { useUnifiedTopology: true });

/// soukromy klic, certifikat a intermediate certifikat; vse pro HTTPS
const httpsOptions = {
  key: fs.readFileSync(process.env.HTTPS_PRIV_FILE),
  cert: fs.readFileSync(process.env.HTTPS_CERT_FILE),
  ca: [ fs.readFileSync(process.env.HTTPS_CA_FILE) ]
};

// **********************************************
//   Serverova cast Front-End API obalkyknih.cz
// **********************************************
// * Navazani komunikace s MongoDB
// * Nactenu prav pristupu
// * Vytvoreni HTTP a HTTPS serveru
// **********************************************

client.connect().then((client, err) => {
  if (err) {  return console.dir(err); }
  const db = client.db();
  console.log('mongodb connected...');

  const arg1 = process.argv.slice(2);
  var test = false;
  if (arg1=='-t' || arg1=='--test') test = true; // priznak testovaciho prostredi

  // HTTP
  http.createServer(function (req, response) {
    cdarcha.server(req, response, db);
  }).listen(process.env.HTTP_BACK_PORT);

  // HTTPS
  https.createServer(httpsOptions, function (req, response) {
    cdarcha.server(req, response, db);
  }).listen(process.env.HTTPS_BACK_PORT);

});
