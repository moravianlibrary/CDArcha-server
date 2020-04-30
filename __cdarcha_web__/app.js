/**
 * Module dependencies.
 */
const express = require('express');
const compression = require('compression');
const session = require('express-session');
const bodyParser = require('body-parser');
const logger = require('morgan');
const chalk = require('chalk');
const errorHandler = require('errorhandler');
const lusca = require('lusca');
const dotenv = require('dotenv');
const MongoStore = require('connect-mongo')(session);
const flash = require('express-flash');
const path = require('path');
const mongoose = require('mongoose');
const passport = require('passport');
const expressValidator = require('express-validator');
const expressStatusMonitor = require('express-status-monitor');
const sass = require('node-sass-middleware');
const multer = require('multer');
const moment = require('moment');

const upload = multer({ dest: path.join(__dirname, 'uploads') });

/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
dotenv.config({ path: '.env' });

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
app.set('host', process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0');
app.set('port', process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(expressStatusMonitor());
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
app.use(expressValidator());
app.use(session({
  resave: true,
  saveUninitialized: true,
  secret: process.env.SESSION_SECRET,
  cookie: { maxAge: 1209600000 }, // two weeks in milliseconds
  store: new MongoStore({
    url: process.env.MONGODB_URI,
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
app.post('/cdarcha/login', userController.postLogin);
app.get('/cdarcha/logout', userController.logout);
app.get('/cdarcha/forgot', userController.getForgot);
app.post('/cdarcha/forgot', userController.postForgot);
app.get('/cdarcha/reset/:token', userController.getReset);
app.post('/cdarcha/reset/:token', userController.postReset);
app.get('/cdarcha/signup', userController.getSignup);
app.post('/cdarcha/signup', userController.postSignup);
app.get('/cdarcha/account', passportConfig.isAuthenticated, userController.getAccount);
app.post('/cdarcha/account/profile', passportConfig.isAuthenticated, userController.postUpdateProfile);
app.post('/cdarcha/account/password', passportConfig.isAuthenticated, userController.postUpdatePassword);
app.post('/cdarcha/account/delete', passportConfig.isAuthenticated, userController.postDeleteAccount);
app.get('/cdarcha/account/unlink/:provider', passportConfig.isAuthenticated, userController.getOauthUnlink);
app.get('/cdarcha/userslist', userController.getUsersList);
app.get('/cdarcha/userslist/dataset', userController.getUsersListDataset);
app.get('/cdarcha/userslist/edit/:id', userController.getEdit);
app.post('/cdarcha/userslist/edit/:id', userController.postEdit);
app.get('/cdarcha/userslist/remove/:id', userController.removeUser);

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
/*
app.get('/cdarcha/api/lastfm', apiController.getLastfm);
app.get('/cdarcha/api/nyt', apiController.getNewYorkTimes);
app.get('/cdarcha/api/aviary', apiController.getAviary);
app.get('/cdarcha/api/steam', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getSteam);
app.get('/cdarcha/api/stripe', apiController.getStripe);
app.post('/cdarcha/api/stripe', apiController.postStripe);
app.get('/cdarcha/api/scraping', apiController.getScraping);
app.get('/cdarcha/api/twilio', apiController.getTwilio);
app.post('/cdarcha/api/twilio', apiController.postTwilio);
app.get('/cdarcha/api/clockwork', apiController.getClockwork);
app.post('/cdarcha/api/clockwork', apiController.postClockwork);
app.get('/cdarcha/api/foursquare', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getFoursquare);
app.get('/cdarcha/api/tumblr', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getTumblr);
app.get('/cdarcha/api/facebook', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getFacebook);
app.get('/cdarcha/api/twitter', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getTwitter);
app.post('/cdarcha/api/twitter', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.postTwitter);
app.get('/cdarcha/api/linkedin', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getLinkedin);
app.get('/cdarcha/api/instagram', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getInstagram);
app.get('/cdarcha/api/paypal', apiController.getPayPal);
app.get('/cdarcha/api/paypal/success', apiController.getPayPalSuccess);
app.get('/cdarcha/api/paypal/cancel', apiController.getPayPalCancel);
app.get('/cdarcha/api/lob', apiController.getLob);
app.get('/cdarcha/api/upload', apiController.getFileUpload);
app.post('/cdarcha/api/upload', upload.single('myFile'), apiController.postFileUpload);
app.get('/cdarcha/api/pinterest', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getPinterest);
app.post('/cdarcha/api/pinterest', passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.postPinterest);
app.get('/cdarcha/api/google-maps', apiController.getGoogleMaps);
*/

/**
 * OAuth authentication routes. (Sign in)
 */
/*
app.get('/cdarcha/auth/instagram', passport.authenticate('instagram'));
app.get('/cdarcha/auth/instagram/callback', passport.authenticate('instagram', { failureRedirect: '/cdarcha/login' }), (req, res) => {
  res.redirect(req.session.returnTo || '/');
});
app.get('/cdarcha/auth/facebook', passport.authenticate('facebook', { scope: ['email', 'public_profile'] }));
app.get('/cdarcha/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/cdarcha/login' }), (req, res) => {
  res.redirect(req.session.returnTo || '/');
});
*/
app.get('/cdarcha/auth/github', passport.authenticate('github'));
app.get('/cdarcha/auth/github/callback', passport.authenticate('github', { failureRedirect: '/cdarcha/login' }), (req, res) => {
  res.redirect(req.session.returnTo || '/');
});
app.get('/cdarcha/auth/google', passport.authenticate('google', { scope: 'profile email' }));
app.get('/cdarcha/auth/google/callback', passport.authenticate('google', { failureRedirect: '/cdarcha/login' }), (req, res) => {
  res.redirect(req.session.returnTo || '/');
});
/*
app.get('/cdarcha/auth/twitter', passport.authenticate('twitter'));
app.get('/cdarcha/auth/twitter/callback', passport.authenticate('twitter', { failureRedirect: '/cdarcha/login' }), (req, res) => {
  res.redirect(req.session.returnTo || '/');
});
app.get('/cdarcha/auth/linkedin', passport.authenticate('linkedin', { state: 'SOME STATE' }));
app.get('/cdarcha/auth/linkedin/callback', passport.authenticate('linkedin', { failureRedirect: '/cdarcha/login' }), (req, res) => {
  res.redirect(req.session.returnTo || '/');
});
*/

/**
 * OAuth authorization routes. (API examples)
 */
/*
app.get('/cdarcha/auth/foursquare', passport.authorize('foursquare'));
app.get('/cdarcha/auth/foursquare/callback', passport.authorize('foursquare', { failureRedirect: '/cdarcha/api' }), (req, res) => {
  res.redirect('/cdarcha/api/foursquare');
});
app.get('/cdarcha/auth/tumblr', passport.authorize('tumblr'));
app.get('/cdarcha/auth/tumblr/callback', passport.authorize('tumblr', { failureRedirect: '/cdarcha/api' }), (req, res) => {
  res.redirect('/cdarcha/api/tumblr');
});
app.get('/cdarcha/auth/steam', passport.authorize('openid', { state: 'SOME STATE' }));
app.get('/cdarcha/auth/steam/callback', passport.authorize('openid', { failureRedirect: '/cdarcha/api' }), (req, res) => {
  res.redirect(req.session.returnTo);
});
app.get('/cdarcha/auth/pinterest', passport.authorize('pinterest', { scope: 'read_public write_public' }));
app.get('/cdarcha/auth/pinterest/callback', passport.authorize('pinterest', { failureRedirect: '/cdarcha/login' }), (req, res) => {
  res.redirect('/cdarcha/api/pinterest');
});
*/

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
