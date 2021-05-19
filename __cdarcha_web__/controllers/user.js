const { promisify } = require('util');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const passport = require('passport');
const User = require('../models/User');

const randomBytesAsync = promisify(crypto.randomBytes);

/**
 * GET /login
 * Login page.
 */
exports.getLogin = (req, res) => {
  if (req.user) {
    return res.redirect('/cdarcha/bibliolist');
  }
  res.render('account/login', {
    title: 'Přihlášení'
  });
};

/**
 * POST /login
 * Sign in using email and password.
 */
exports.postLogin = (req, res, next) => {
  req.assert('email', 'Email adresa není platná').isEmail();
  req.assert('password', 'Heslo nesmí být prázdné').notEmpty();
  req.sanitize('email').normalizeEmail({ gmail_remove_dots: false });

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/cdarcha/login');
  }

  passport.authenticate('local', (err, user, info) => {
    if (err) { return next(err); }
    if (!user) {
      req.flash('errors', info);
      return res.redirect('/cdarcha/login');
    }
    req.logIn(user, (err) => {
      if (err) { return next(err); }
      req.flash('success', { msg: 'Úspěšné přihlášení do administračního systému.' });
      res.redirect(req.session.returnTo || '/cdarcha/');
    });
  })(req, res, next);
};

/**
 * GET /logout
 * Log out.
 */
exports.logout = (req, res) => {
  req.logout();
  req.session.destroy((err) => {
    if (err) console.log('Error : Problém se smazáním session.', err);
    req.user = null;
    res.redirect('/cdarcha/');
  });
};

/**
 * GET /signup
 * Signup page.
 */
exports.getSignup = (req, res) => {
  if (!req.user) {
    return res.redirect('/cdarcha/login');
  }
  res.render('account/signup', {
    title: 'Vytvořit účet'
  });
};

/**
 * POST /signup
 * Create a new local account.
 */
exports.postSignup = (req, res, next) => {
  req.assert('email', 'Email není platný').isEmail();
  req.sanitize('email').normalizeEmail({ gmail_remove_dots: false });

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/cdarcha/signup');
  }

  const user = new User({
    email: req.body.email,
    sigla: req.body.sigla,
    roleType: req.body.roleType
  });

  User.findOne({ email: req.body.email }, (err, existingUser) => {
    if (err) { return next(err); }
    if (existingUser) {
      req.flash('errors', { msg: 'Účet s tímto emailem už existuje.' });
      return res.redirect('/cdarcha/signup');
    }
    user.save((err) => {
      if (err) { return next(err); }
      const transporter = nodemailer.createTransport({
        port: '25',
        host: 'mail.mzk.cz'
      });
      const mailOptions = {
        to: user.email,
        from: process.env.FROM_EMAIL,
        subject: 'CDArcha - Zmena hesla',
        text: `Dobrý den,\n\nPro volbu hesla vašeho účtu ${user.email} prosím navštivte.\n\n${process.env.BASE_URL}/forgot`
      };
      return transporter.sendMail(mailOptions)
        .then(() => {
          req.flash('success', { msg: 'Účet byl vytvořen.' });
          res.redirect('/cdarcha/userslist');
      });
    });
  });
};

/**
 * GET /account
 * Profile page.
 */
exports.getAccount = (req, res) => {
  res.render('account/profile', {
    title: 'Váš účet'
  });
};

/**
 * POST /account/profile
 * Update profile information.
 */
exports.postUpdateProfile = (req, res, next) => {
  req.assert('email', 'Prosím zadejte platnou email adresu.').isEmail();
  req.sanitize('email').normalizeEmail({ gmail_remove_dots: false });

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/cdarcha/account');
  }

  User.findById(req.user.id, (err, user) => {
    if (err) { return next(err); }
    user.email = req.body.email || '';
    user.sigla = req.body.sigla || '';
    user.save((err) => {
      if (err) {
        if (err.code === 11000) {
          req.flash('errors', { msg: 'Email adresa je už svázána s jiným účtem.' });
          return res.redirect('/cdarcha/account');
        }
        return next(err);
      }
      req.flash('success', { msg: 'Informace užívatelského účtu byla změněna.' });
      res.redirect('/cdarcha/account');
    });
  });
};

/**
 * POST /account/password
 * Update current password.
 */
exports.postUpdatePassword = (req, res, next) => {
  req.assert('password', 'Heslo musí být alespoň 4 znaky dlouhé').len(4);
  req.assert('confirmPassword', 'Hesla se musí zhodovat').equals(req.body.password);

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/cdarcha/account');
  }

  User.findById(req.user.id, (err, user) => {
    if (err) { return next(err); }
    user.password = req.body.password;
    user.save((err) => {
      if (err) { return next(err); }
      req.flash('success', { msg: 'Heslo bylo změněno.' });
      res.redirect('/cdarcha/account');
    });
  });
};

/**
 * POST /account/delete
 * Delete user account.
 */
exports.postDeleteAccount = (req, res, next) => {
  User.remove({ _id: req.user.id }, (err) => {
    if (err) { return next(err); }
    req.logout();
    req.flash('info', { msg: 'Váš účet byl smazán.' });
    res.redirect('/cdarcha/');
  });
};

/**
 * GET /account/unlink/:provider
 * Unlink OAuth provider.
 */
exports.getOauthUnlink = (req, res, next) => {
  const { provider } = req.params;
  User.findById(req.user.id, (err, user) => {
    if (err) { return next(err); }
    user[provider] = undefined;
    user.tokens = user.tokens.filter(token => token.kind !== provider);
    user.save((err) => {
      if (err) { return next(err); }
      req.flash('info', { msg: `${provider} vazba účtu byla zrušena.` });
      res.redirect('/cdarcha/account');
    });
  });
};

/**
 * GET /reset/:token
 * Reset Password page.
 */
exports.getReset = (req, res, next) => {
  if (req.isAuthenticated()) {
    return res.redirect('/cdarcha/');
  }
  User
    .findOne({ passwordResetToken: req.params.token })
    .where('passwordResetExpires').gt(Date.now())
    .exec((err, user) => {
      if (err) { return next(err); }
      if (!user) {
        req.flash('errors', { msg: 'Token pro změnu hesla už není platný (pravděpodobně expiroval).' });
        return res.redirect('/cdarcha/forgot');
      }
      res.render('account/reset', {
        title: 'Změna hesla'
      });
    });
};

/**
 * POST /reset/:token
 * Process the reset password request.
 */
exports.postReset = (req, res, next) => {
  req.assert('password', 'Heslo musí být alespoň 4 znaky dlouhé.').len(4);
  req.assert('confirm', 'Hesla se musí zhodovat.').equals(req.body.password);

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('back');
  }

  const resetPassword = () =>
    User
      .findOne({ passwordResetToken: req.params.token })
      .where('passwordResetExpires').gt(Date.now())
      .then((user) => {
        if (!user) {
          req.flash('errors', { msg: 'Token pro reset hesla je neplatný.' });
          return res.redirect('back');
        }
        user.password = req.body.password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        return user.save().then(() => new Promise((resolve, reject) => {
          req.logIn(user, (err) => {
            if (err) { return reject(err); }
            resolve(user);
          });
        }));
      });

  const sendResetPasswordEmail = (user) => {
    if (!user) { return; }
    const transporter = nodemailer.createTransport({
      port: '25',
      host: 'mail.mzk.cz'
    });
    const mailOptions = {
      to: user.email,
      from: process.env.FROM_EMAIL,
      subject: 'CDArcha - Potvrzeni zmeny hesla',
      text: `Dobrý den,\n\nToto je potvrzení, že heslo vašeho účtu ${user.email} bylo právě změněno.\n`
    };
    return transporter.sendMail(mailOptions)
      .then(() => {
        req.flash('success', { msg: 'Úspěšně změněno.' });
      });
  };

  resetPassword()
    .then(sendResetPasswordEmail)
    .then(() => { if (!res.finished) res.redirect('/cdarcha/'); })
    .catch(err => next(err));
};

/**
 * GET /forgot
 * Forgot Password page.
 */
exports.getForgot = (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/cdarcha/');
  }
  res.render('account/forgot', {
    title: 'Změna hesla'
  });
};

/**
 * POST /forgot
 * Create a random token, then the send user an email with a reset link.
 */
exports.postForgot = (req, res, next) => {
  req.assert('email', 'Prosím zadejte platnou email adresu.').isEmail();
  req.sanitize('email').normalizeEmail({ gmail_remove_dots: false });

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/cdarcha/forgot');
  }

  const createRandomToken = randomBytesAsync(16)
    .then(buf => buf.toString('hex'));

  const setRandomToken = token =>
    User
      .findOne({ email: req.body.email })
      .then((user) => {
        if (!user) {
          req.flash('errors', { msg: 'Účet s tímto emailem neexistuje.' });
        } else {
          user.passwordResetToken = token;
          user.passwordResetExpires = Date.now() + 3600000; // 1 hour
          user = user.save();
        }
        return user;
      });

  const sendForgotPasswordEmail = (user) => {
    if (!user) { return; }
    const token = user.passwordResetToken;
    const transporter = nodemailer.createTransport({
      port: '25',
      host: 'mail.mzk.cz'
    });
    const mailOptions = {
      to: user.email,
      from: process.env.FROM_EMAIL,
      subject: 'CDArcha - Volba hesla',
      text: `Dobrý den.\n\nTento email jsme vám zaslali, protože jste (nebo někdo jiný) požádali o reset hesla CDArcha.\n\n
        Pro dokončení procesu prosím navštivte:\n\n
        ${process.env.BASE_URL}/reset/${token}\n\n
        Pokud jste o změnu hesla nepožádali ignorujte tento email a vaše heslo zůstane beze změny.\n`
    };
    return transporter.sendMail(mailOptions)
      .then(() => {
        req.flash('info', { msg: `Email s instrukcemi byl zaslán na ${user.email}` });
      });
  };

  createRandomToken
    .then(setRandomToken)
    .then(sendForgotPasswordEmail)
    .then(() => res.redirect('/cdarcha/forgot'))
    .catch(next);
};

/**
 * GET /userslist
 * List of all users.
 */
exports.getUsersList = (req, res) => {
  res.render('account/userslist', {
    title: 'Seznam uživatelů'
  });
};

/**
 * GET /userslist/dataset
 * List of all users for table on page /userslist
 */
exports.getUsersListDataset = (req, res) => {
  var searchQuery = {};

  // searching for something
  if (req.query.search.length) {
    var searchPhrase = req.query.search || '';
    searchQuery = {
      $or: [
        { 'email': new RegExp(searchPhrase, "i") },
        { 'sigla': new RegExp(searchPhrase, "i") }
      ]
    };
  }

  var orderField = req.query.sort || 'email',
      orderDirection = (req.query.order=='desc' ? '-1' : '1'),
      limit = parseInt(req.query.limit) || 10,
      offset = parseInt(req.query.offset) || 0;

  User.find(searchQuery).limit(limit).skip(offset).sort( [[orderField,orderDirection]] ).exec((err, users) => {
    if (err) { res.json({ total: 0, rows: [], errmsg: err.errmsg} ); return; }
    User.count(searchQuery).exec((err, count) => {
      if (err) { res.json({ total: 0, rows: [], errmsg: err.errmsg} ); return; }
      var out = {
        total: count,
        rows: users
      }
      res.json(out);
    });
  });
};

/**
 * GET /edit
 * Edit user's profile by admin.
 */
exports.getEdit = (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/cdarcha/login');
  }
  if (req.user.id == req.params.id) {
    return res.redirect('/cdarcha/account');
  }

  User.findById(req.params.id, (err, user) => {
    if (err) { return next(err); }
    res.render('account/edit', {
      data: user,
      title: 'Upravit účet'
    });
  });
};

/**
 * POST /edit
 * Update user's information by admin.
 */
exports.postEdit = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/cdarcha/login');
  }
  if (req.user.id == req.params.id) {
    return res.redirect('/cdarcha/account');
  }

  req.assert('email', 'Vyplňte platnou email adresu.').isEmail();
  req.sanitize('email').normalizeEmail({ gmail_remove_dots: false });

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/cdarcha/userslist');
  }

  User.findById(req.params.id, (err, user) => {
    if (err) { return next(err); }
    user.email = req.body.email || '';
    user.sigla = req.body.sigla || '';
    user.roleType = req.body.roleType || '';
    user.save((err) => {
      if (err) {
        if (err.code === 11000) {
          req.flash('errors', { msg: 'Zadaná email adresa je už přiřazena k existujícímu účtu.' });
          return res.redirect('/cdarcha/userslist');
        }
        return next(err);
      }
      req.flash('success', { msg: 'Informace aktualizovány.' });
      res.redirect('/cdarcha/userslist');
    });
  });
};

exports.removeUser = (req, res, next) => {
  var id = req.params.id;

  if (!req.isAuthenticated()) {
    return res.redirect('/cdarcha/login');
  }
  if (req.user.id == id) {
    return res.redirect('/cdarcha/account');
  }

  if (id=="") {
    req.flash('errors', );
    return res.redirect('/cdarcha/userslist');
  }

  User.remove({ '_id': id }, (err) => {
    if (err) { return next(err); }
    req.flash('success', { msg: 'Uživatel smazán.' });
    res.redirect('/cdarcha/userslist');
  });
};
