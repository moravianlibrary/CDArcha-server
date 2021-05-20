const { promisify } = require('util');
const Cronlog = require('../models/Cronlog');

/**
 * GET /cronlog
 */
exports.getList = (req, res) => {
  if (!req.user) {
    return res.redirect('/cdarcha/login');
  }
  res.render('cronlog/list', {
    title: 'Log'
  });
};

/**
 * GET /bibliolist/dataset
 */
exports.getDataset = (req, res) => {
  var searchQuery = {};

  Cronlog.find(searchQuery).limit(100).sort({ '_id': -1 }).exec((err, log) => {
    if (err) { res.json({ total: 0, rows: [], errmsg: err.errmsg} ); return; }
    Cronlog.count(searchQuery).exec((err, count) => {
      if (err) { res.json({ total: 0, rows: [], errmsg: err.errmsg} ); return; }
      var out = {
        total: count,
        rows: log
      }
      res.json(out);
    });
  });
};
