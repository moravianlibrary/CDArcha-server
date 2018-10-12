const { promisify } = require('util');
const Media = require('../models/Media');
const Files = require('../models/Files');

/**
 * GET /content/media/dataset
 * List of all media for specific archive
 */
exports.getMediaDataset = (req, res) => {
  var searchQuery = {};

  // searching for something
  if (req.query.search && req.query.search.length) {
    var searchPhrase = req.query.search;
    searchQuery = {
      'archive': searchPhrase
    };
  }

  Media.find(searchQuery, (err, media) => {
    if (err) { res.json({ total: 0, rows: []} ); return; }
    var out = {
      total: media.length,
      rows: media
    }
    res.json(out);
  });
};

/**
 * GET /content/files/dataset
 * List of all files for specific archive
 */
exports.getFilesDataset = (req, res) => {
  var searchQuery = {};

  // searching for something
  if (req.query.search && req.query.search.length) {
    var searchPhrase = req.query.search;
    searchQuery = {
      'archive': searchPhrase
    };
  }

  Files.find(searchQuery, (err, files) => {
    if (err) { res.json({ total: 0, rows: []} ); return; }
    var out = {
      total: files.length,
      rows: files
    }
    res.json(out);
  });
};
