/**
 * CDArcha API
 */
const cdarcha = require('cdarcha_server');
const dotenv = require('dotenv');
const request = require('request');
const http = require('http');
const https = require('https');
const fs = require('fs');

/**
 * CDArcha WEB
 */
const express = require('express');
const compression = require('compression');
const session = require('express-session');
const bodyParser = require('body-parser');
const logger = require('morgan');
const chalk = require('chalk');
const errorHandler = require('errorhandler');
const lusca = require('lusca');
const MongoStore = require('connect-mongo');
const flash = require('express-flash');
const path = require('path');
const mongoose = require('mongoose');
const passport = require('passport');
const sass = require('node-sass-middleware');
const moment = require('moment');
const multer = require('multer');
const upload = multer({ dest: path.join(__dirname, 'uploads') });
const { check, validationResult } = require('express-validator');

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

/**
 * Controllers (route handlers).
 */
const homeController = require('./controllers/home');
const userController = require('./controllers/user');
const apiController = require('./controllers/api');
const biblioController = require('./controllers/biblio');
const archiveController = require('./controllers/archive');
const contentController = require('./controllers/content');
const cronlogController = require('./controllers/cronlog');

/**
 * API keys and Passport configuration.
 */
const passportConfig = require('./config/passport');

/**
 * Create Express server.
 */
const app = express();

/**
 * Connect to MongoDB.
 */
mongoose.connect(process.env.MONGODB_URI);
mongoose.connection.on('error', (err) => {
  console.error(err);
  console.log('%s MongoDB connection error. Please make sure MongoDB is running.', chalk.red('✗'));
  process.exit();
});

/**
 * Express configuration.
 */
app.set('host', '0.0.0.0');
app.set('port', process.env.HTTP_FRONT_PORT);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(compression());
app.use(sass({
  src: path.join(__dirname, 'public'),
  dest: path.join(__dirname, 'public'),
  prefix:  '/cdarcha',
  debug: true,
  outputStyle: 'compressed'
}));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  resave: true,
  saveUninitialized: true,
  secret: process.env.SESSION_SECRET,
  cookie: { maxAge: 1209600000 }, // two weeks in milliseconds
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    autoReconnect: true,
  })
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
/*
app.use((req, res, next) => {
  if (req.path === '/cdarcha/api/upload') {
    next();
  } else {
    lusca.csrf()(req, res, next);
  }
});
app.use(lusca.xframe('SAMEORIGIN'));
app.use(lusca.xssProtection(true));
*/
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.locals.user = req.user;
  res.locals.moment = require('moment');
  next();
});
app.use((req, res, next) => {
  // After successful login, redirect back to the intended page
  if (!req.user &&
    req.path !== '/cdarcha/login' &&
    req.path !== '/cdarcha/signup' &&
    !req.path.match(/^\/cdarcha\/auth/) &&
    !req.path.match(/\./)) {
    req.session.returnTo = req.originalUrl;
  } else if (req.user &&
    (req.path === '/cdarcha/account' || req.path.match(/^\/cdarcha\/api/))) {
    req.session.returnTo = req.originalUrl;
  }
  next();
});
app.use('/cdarcha', express.static(path.join(__dirname, 'public'), { maxAge: 31557600000 }));

/**
 * Users
 */
app.get('/cdarcha', homeController.index);
app.get('/cdarcha/login', userController.getLogin);
app.post('/cdarcha/login', check('email').isEmail(), check('password').notEmpty(), userController.postLogin);
app.get('/cdarcha/logout', userController.logout);
app.get('/cdarcha/forgot', userController.getForgot);
app.post('/cdarcha/forgot', check('email').isEmail(), userController.postForgot);
app.get('/cdarcha/reset/:token', userController.getReset);
app.post('/cdarcha/reset/:token', userController.postReset);
app.get('/cdarcha/signup', userController.getSignup);
app.post('/cdarcha/signup', check('email').isEmail(), userController.postSignup);
app.get('/cdarcha/account', passportConfig.isAuthenticated, userController.getAccount);
app.post('/cdarcha/account/profile', check('email').isEmail(), passportConfig.isAuthenticated, userController.postUpdateProfile);
app.post('/cdarcha/account/password', check('password').isLength({ min: 4 }), passportConfig.isAuthenticated, userController.postUpdatePassword);
app.post('/cdarcha/account/delete', passportConfig.isAuthenticated, userController.postDeleteAccount);
app.get('/cdarcha/account/unlink/:provider', passportConfig.isAuthenticated, userController.getOauthUnlink);
app.get('/cdarcha/userslist', userController.getUsersList);
app.get('/cdarcha/userslist/dataset', userController.getUsersListDataset);
app.get('/cdarcha/userslist/edit/:id', userController.getEdit);
app.post('/cdarcha/userslist/edit/:id', check('email').isEmail(), userController.postEdit);
app.get('/cdarcha/userslist/remove/:id', userController.removeUser);
app.get('/cdarcha/home/dataset', homeController.getListDataset);

/**
 * Biblio
 */
app.get('/cdarcha/bibliolist', biblioController.getList);
app.get('/cdarcha/bibliolist/dataset', biblioController.getListDataset);

/**
 * Archive
 */
app.get('/cdarcha/archivelist', archiveController.getList);
app.get('/cdarcha/archivelist/dataset', archiveController.getListDataset);
app.get('/cdarcha/archivelist/edit', archiveController.getEditForm);
app.post('/cdarcha/archivelist/edit', archiveController.postEditForm);
app.get('/cdarcha/archivelist/del', archiveController.delArchive);
app.get('/cdarcha/archive/mount', archiveController.mountArchive);
app.get('/cdarcha/archive/unmount', archiveController.unmountArchive);

/**
 * Content
 */
app.get('/cdarcha/content/', contentController.redirect);
app.get('/cdarcha/content/media/dataset', contentController.getMediaDataset);
app.get('/cdarcha/content/files/dataset', contentController.getFilesDataset);

/**
 * Log
 */
app.get('/cdarcha/cronlog', cronlogController.getList);
app.get('/cdarcha/cronlog/dataset', cronlogController.getDataset);

/**
 * API examples routes.
 */
app.get('/cdarcha/api', apiController.getApi);
app.get('/cdarcha/api/github', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getGithub);

/**
 * OAuth authentication routes. (Sign in)
 */
app.get('/cdarcha/auth/github', passport.authenticate('github'));
app.get('/cdarcha/auth/github/callback', passport.authenticate('github', { failureRedirect: '/cdarcha/login' }), (req, res) => {
  res.redirect(req.session.returnTo || '/');
});
app.get('/cdarcha/auth/google', passport.authenticate('google', { scope: 'profile email' }));
app.get('/cdarcha/auth/google/callback', passport.authenticate('google', { failureRedirect: '/cdarcha/login' }), (req, res) => {
  res.redirect(req.session.returnTo || '/');
});

/**
 * Error Handler.
 */
if (process.env.NODE_ENV === 'development') {
  // only use in development
  app.use(errorHandler());
}

/**
 * Custom
 */
app.moment = moment;

/**
 * Start Express server.
 */
app.listen(app.get('port'), () => {
  console.log('%s App is running at http://localhost:%d in %s mode', chalk.green('✓'), app.get('port'), app.get('env'));
  console.log('  Press CTRL-C to stop\n');
});

module.exports = app;
