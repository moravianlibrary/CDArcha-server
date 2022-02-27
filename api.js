/**
 * CDArcha API
 */
const cdarcha = require('cdarcha_api');
const dotenv = require('dotenv');
const http = require('http');
const https = require('https');
const fs = require('fs');

/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
dotenv.config({ path: '.env' });

const MongoClient = require('mongodb').MongoClient;
const client = new MongoClient(process.env.MONGODB_URI, { useUnifiedTopology: true });

/**
 * Cesty k souborum pro rozbehnuti HTTPS
 */
const httpsOptions = {
  key: fs.readFileSync(process.env.HTTPS_PRIV_FILE),
  cert: fs.readFileSync(process.env.HTTPS_CERT_FILE),
  ca: [ fs.readFileSync(process.env.HTTPS_CA_FILE) ]
};

/**
 * Nastartovani API serverove casti CDArcha, HTTP + HTTPS
 */
client.connect().then((client, err) => {
  if (err) { return console.dir(err); }
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
