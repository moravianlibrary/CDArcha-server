const { promisify } = require('util');
const Media = require('../models/Media');
const Archive = require('../models/Archive');
const Files = require('../models/Files');
const fs = require('fs');
const path = require('path');
const { exec } = require("child_process");


/**
 * GET /content/media/dataset
 * List of all media for specific archive
 */
exports.redirect = (req, res) => {
  var searchQuery = {
    '_id': req.query.id
  };

  Media.find(searchQuery, (err, media) => {
    if (err) { res.json({ total: 0, rows: []} ); return; }
    if (media.length) {
      var row = media[0];
      searchQuery = {
        '_id': row.archive._id
      }
    }
    Archive.find(searchQuery, (err, archive) => {
      if (err) { res.json({ total: 0, rows: []} ); return; }
      if (archive.length) {
        var row = archive[0];
        console.dir(row.biblio._id);
        return res.redirect('/cdarcha/bibliolist#' + row.biblio._id);
      } else {
        console.log('none');
      }
    });
  });
};

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

  var walk = function(dir, done) {
    var results = [];
    fs.readdir(dir, function(err, list) {
      if (err) return done(err);
      var i = 0;
      (function next() {
        var file = list[i++];
        if (!file) return done(null, results);
        file = path.resolve(dir, file);
        fs.stat(file, function(err, stat) {
          if (stat && stat.isDirectory()) {
            walk(file, function(err, res) {
              results = results.concat(res);
              next();
            });
          } else {
            var fileName = file.substr(50).replace(/\//g, ' / ');
            results.push({'fileName': fileName});
            next();
          }
        });
      })();
    });
  };

  Archive.find({'_id': req.query.search}, (err, archive) => {
    if (err) { res.json({ total: 0, rows: []} ); console.log(err); return; }

    exec('tree --du -h --dirsfirst ' + process.env.STORAGE_DIR + '/' + archive[0].uuid, (error, stdout, stderr) => {
        if (!error && !stderr) {
            var out = {
                tree: stdout
            }
            res.json(out);
        }
    });

  });
};
