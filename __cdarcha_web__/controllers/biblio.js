const { promisify } = require('util');
const Biblio = require('../models/Biblio');

/**
 * GET /bibliolist
 * List of bibliographic records.
 */
exports.getList = (req, res) => {
  if (!req.user) {
    return res.redirect('/cdarcha/login');
  }
  res.render('biblio/list', {
    title: 'Bibliografické záznamy'
  });
};

/**
 * GET /bibliolist/dataset
 * List of all biblio records for bootstrap table
 */
exports.getListDataset = (req, res) => {
  var searchQuery = {};

  // searching for something
  if (req.query.search.length) {
    var searchPhrase = req.query.search || '';
    searchQuery = {
      $or: [
        { 'title': new RegExp(searchPhrase, "i") },
        { 'authors': new RegExp(searchPhrase, "i") },
        { 'ean13': new RegExp(searchPhrase, "i") },
        { 'nbn': new RegExp(searchPhrase, "i") },
        { 'oclc': new RegExp(searchPhrase, "i") }
      ]
    };
  }

  var orderField = req.query.sort || 'title',
      orderDirection = (req.query.order=='desc' ? '-1' : '1'),
      limit = parseInt(req.query.limit) || 10,
      offset = parseInt(req.query.offset) || 0;

  Biblio.find(searchQuery).limit(limit).skip(offset).sort( [[orderField,orderDirection]] ).exec((err, biblio) => {
    if (err) { res.json({ total: 0, rows: [], errmsg: err.errmsg} ); return; }
    Biblio.count(searchQuery).exec((err, count) => {
      if (err) { res.json({ total: 0, rows: [], errmsg: err.errmsg} ); return; }
      var out = {
        total: count,
        rows: biblio
      }
      res.json(out);
    });
  });
};
